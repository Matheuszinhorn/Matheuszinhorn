"""Persistência em SQLite.

Tabelas:
- agents:     registro de agentes (papel, binário, estado de autenticação)
- tasks:      tarefas cadastradas (objetivo, critérios, workspace, comando de teste)
- runs:       execuções de uma tarefa (estado, ciclo atual, branch, motivo de término)
- messages:   mensagens estruturadas trocadas entre orquestrador e agentes
- decisions:  histórico de decisões do orquestrador (aprovar, reprovar, abortar...)
- command_log: todo comando externo executado (sem variáveis de ambiente)
- usage:      consumo por agente e por dia (limites diários)

SQLite em modo WAL; cada operação abre a própria conexão, o que torna o módulo
seguro para uso a partir de threads (API + orquestrador em background).
A camada é pequena e explícita para facilitar a migração futura para PostgreSQL.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS agents (
    name TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    kind TEXT NOT NULL,
    binary TEXT,
    version TEXT,
    authenticated INTEGER NOT NULL DEFAULT 0,
    auth_detail TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    workspace TEXT NOT NULL,
    test_command TEXT NOT NULL,
    implementer TEXT NOT NULL,
    auditor TEXT NOT NULL,
    max_cycles INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    status TEXT NOT NULL,
    cycle INTEGER NOT NULL DEFAULT 0,
    branch TEXT,
    base_commit TEXT,
    final_commit TEXT,
    outcome TEXT,
    error TEXT,
    cancel_requested INTEGER NOT NULL DEFAULT 0,
    owner_pid INTEGER,
    started_at TEXT NOT NULL,
    finished_at TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id),
    cycle INTEGER NOT NULL,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id),
    cycle INTEGER NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS command_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    actor TEXT NOT NULL,
    argv TEXT NOT NULL,
    cwd TEXT NOT NULL,
    exit_code INTEGER,
    duration_s REAL,
    timed_out INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0,
    stdout_tail TEXT,
    stderr_tail TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    agent TEXT NOT NULL,
    day TEXT NOT NULL,
    calls INTEGER NOT NULL DEFAULT 1,
    input_tokens INTEGER,
    output_tokens INTEGER,
    reported_cost_usd REAL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_run ON messages(run_id);
CREATE INDEX IF NOT EXISTS idx_decisions_run ON decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_usage_agent_day ON usage(agent, day);
"""

ACTIVE_STATUSES = ("pending", "running")


def _pid_alive(pid: int | None) -> bool:
    if not pid:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


class Database:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        with self.conn() as c:
            c.executescript(SCHEMA)
            c.execute("PRAGMA journal_mode=WAL")

    @contextmanager
    def conn(self) -> Iterator[sqlite3.Connection]:
        c = sqlite3.connect(self.path, timeout=30)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        try:
            with self._lock:
                yield c
                c.commit()
        finally:
            c.close()

    # ---------------------------------------------------------------- agents
    def upsert_agent(self, name: str, role: str, kind: str, binary: str | None,
                     version: str | None, authenticated: bool, auth_detail: str) -> None:
        with self.conn() as c:
            c.execute(
                """INSERT INTO agents(name, role, kind, binary, version, authenticated, auth_detail, updated_at)
                   VALUES(?,?,?,?,?,?,?,?)
                   ON CONFLICT(name) DO UPDATE SET role=excluded.role, kind=excluded.kind,
                     binary=excluded.binary, version=excluded.version,
                     authenticated=excluded.authenticated, auth_detail=excluded.auth_detail,
                     updated_at=excluded.updated_at""",
                (name, role, kind, binary, version, int(authenticated), auth_detail, now()),
            )

    def list_agents(self) -> list[dict]:
        with self.conn() as c:
            return [dict(r) for r in c.execute("SELECT * FROM agents ORDER BY name")]

    # ----------------------------------------------------------------- tasks
    def create_task(self, *, title: str, objective: str, acceptance_criteria: list[str],
                    workspace: str, test_command: list[str], implementer: str,
                    auditor: str, max_cycles: int) -> str:
        task_id = uuid.uuid4().hex[:12]
        with self.conn() as c:
            c.execute(
                """INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (task_id, title, objective, json.dumps(acceptance_criteria, ensure_ascii=False),
                 workspace, json.dumps(test_command), implementer, auditor, max_cycles, now()),
            )
        return task_id

    def get_task(self, task_id: str) -> dict | None:
        with self.conn() as c:
            row = c.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["acceptance_criteria"] = json.loads(d["acceptance_criteria"])
        d["test_command"] = json.loads(d["test_command"])
        return d

    def list_tasks(self) -> list[dict]:
        with self.conn() as c:
            ids = [r["id"] for r in c.execute("SELECT id FROM tasks ORDER BY created_at DESC")]
        return [self.get_task(i) for i in ids]  # type: ignore[misc]

    # ------------------------------------------------------------------ runs
    def create_run(self, task_id: str) -> str:
        run_id = uuid.uuid4().hex[:12]
        with self.conn() as c:
            c.execute("INSERT INTO runs(id, task_id, status, owner_pid, started_at) VALUES(?,?,?,?,?)",
                      (run_id, task_id, "pending", os.getpid(), now()))
        return run_id

    def update_run(self, run_id: str, **fields: Any) -> None:
        if not fields:
            return
        allowed = {"status", "cycle", "branch", "base_commit", "final_commit", "outcome",
                   "error", "finished_at", "cancel_requested"}
        bad = set(fields) - allowed
        if bad:
            raise ValueError(f"campos inválidos: {bad}")
        cols = ", ".join(f"{k}=?" for k in fields)
        with self.conn() as c:
            c.execute(f"UPDATE runs SET {cols} WHERE id=?", (*fields.values(), run_id))

    def get_run(self, run_id: str) -> dict | None:
        with self.conn() as c:
            row = c.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        return dict(row) if row else None

    def list_runs(self, task_id: str | None = None) -> list[dict]:
        q, args = "SELECT * FROM runs", ()
        if task_id:
            q, args = q + " WHERE task_id=?", (task_id,)
        with self.conn() as c:
            return [dict(r) for r in c.execute(q + " ORDER BY started_at DESC", args)]

    def request_cancel(self, run_id: str) -> bool:
        with self.conn() as c:
            cur = c.execute(
                "UPDATE runs SET cancel_requested=1 WHERE id=? AND status IN ('pending','running')",
                (run_id,))
            return cur.rowcount > 0

    def is_cancel_requested(self, run_id: str) -> bool:
        with self.conn() as c:
            row = c.execute("SELECT cancel_requested FROM runs WHERE id=?", (run_id,)).fetchone()
        return bool(row and row["cancel_requested"])

    def mark_interrupted_runs(self) -> int:
        """Chamado na inicialização: execuções ativas cujo processo dono não
        existe mais ficam marcadas como 'interrupted' (o histórico é mantido)."""
        with self.conn() as c:
            rows = c.execute("SELECT id, owner_pid FROM runs WHERE status IN ('pending','running')").fetchall()
            dead = [r["id"] for r in rows if not _pid_alive(r["owner_pid"])]
            for rid in dead:
                c.execute(
                    "UPDATE runs SET status='interrupted', finished_at=?, "
                    "error=COALESCE(error,'processo do orquestrador encerrado durante a execução') "
                    "WHERE id=?", (now(), rid))
            return len(dead)

    # ------------------------------------------------- messages / decisions
    def add_message(self, run_id: str, cycle: int, sender: str, recipient: str,
                    kind: str, payload: dict) -> int:
        with self.conn() as c:
            cur = c.execute(
                "INSERT INTO messages(run_id, cycle, sender, recipient, kind, payload, created_at) "
                "VALUES(?,?,?,?,?,?,?)",
                (run_id, cycle, sender, recipient, kind,
                 json.dumps(payload, ensure_ascii=False), now()))
            return int(cur.lastrowid)

    def list_messages(self, run_id: str) -> list[dict]:
        with self.conn() as c:
            rows = [dict(r) for r in c.execute(
                "SELECT * FROM messages WHERE run_id=? ORDER BY id", (run_id,))]
        for r in rows:
            r["payload"] = json.loads(r["payload"])
        return rows

    def add_decision(self, run_id: str, cycle: int, decision: str, reason: str) -> None:
        with self.conn() as c:
            c.execute("INSERT INTO decisions(run_id, cycle, decision, reason, created_at) "
                      "VALUES(?,?,?,?,?)", (run_id, cycle, decision, reason, now()))

    def list_decisions(self, run_id: str) -> list[dict]:
        with self.conn() as c:
            return [dict(r) for r in c.execute(
                "SELECT * FROM decisions WHERE run_id=? ORDER BY id", (run_id,))]

    # ------------------------------------------------------- command log
    def log_command(self, *, run_id: str | None, actor: str, argv: list[str], cwd: str,
                    exit_code: int | None, duration_s: float, timed_out: bool,
                    cancelled: bool, stdout_tail: str, stderr_tail: str) -> None:
        with self.conn() as c:
            c.execute(
                "INSERT INTO command_log(run_id, actor, argv, cwd, exit_code, duration_s, timed_out, "
                "cancelled, stdout_tail, stderr_tail, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (run_id, actor, json.dumps(argv, ensure_ascii=False), cwd, exit_code,
                 round(duration_s, 3), int(timed_out), int(cancelled),
                 stdout_tail, stderr_tail, now()))

    def list_commands(self, run_id: str) -> list[dict]:
        with self.conn() as c:
            rows = [dict(r) for r in c.execute(
                "SELECT * FROM command_log WHERE run_id=? ORDER BY id", (run_id,))]
        for r in rows:
            r["argv"] = json.loads(r["argv"])
        return rows

    # -------------------------------------------------------------- usage
    def record_usage(self, *, run_id: str | None, agent: str, input_tokens: int | None,
                     output_tokens: int | None, reported_cost_usd: float | None) -> None:
        with self.conn() as c:
            c.execute(
                "INSERT INTO usage(run_id, agent, day, calls, input_tokens, output_tokens, "
                "reported_cost_usd, created_at) VALUES(?,?,?,?,?,?,?,?)",
                (run_id, agent, today(), 1, input_tokens, output_tokens, reported_cost_usd, now()))

    def calls_today(self, agent: str) -> int:
        with self.conn() as c:
            row = c.execute("SELECT COALESCE(SUM(calls),0) AS n FROM usage WHERE agent=? AND day=?",
                            (agent, today())).fetchone()
        return int(row["n"])

    def usage_summary(self) -> list[dict]:
        with self.conn() as c:
            return [dict(r) for r in c.execute(
                "SELECT agent, day, SUM(calls) AS calls, SUM(input_tokens) AS input_tokens, "
                "SUM(output_tokens) AS output_tokens, SUM(reported_cost_usd) AS reported_cost_usd "
                "FROM usage GROUP BY agent, day ORDER BY day DESC, agent")]
