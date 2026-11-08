"""Execução de processos externos com política de segurança, timeout,
cancelamento e registro no command_log."""
from __future__ import annotations

import os
import signal
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from backend.memory.db import Database
from backend.security.policy import SecurityPolicy, redact

TAIL = 4000


class CancelledError(Exception):
    """A execução foi interrompida por pedido do usuário."""


@dataclass
class CommandResult:
    argv: list[str]
    exit_code: int | None
    stdout: str
    stderr: str
    duration_s: float
    timed_out: bool = False
    cancelled: bool = False

    @property
    def ok(self) -> bool:
        return self.exit_code == 0 and not self.timed_out and not self.cancelled


class CommandRunner:
    def __init__(self, db: Database, policy: SecurityPolicy):
        self.db = db
        self.policy = policy

    def run(self, argv: list[str], *, cwd: str | Path, actor: str, run_id: str | None = None,
            timeout_s: int = 300, stdin: str | None = None,
            cancel_check: Callable[[], bool] | None = None,
            extra_env: dict[str, str] | None = None) -> CommandResult:
        self.policy.check_command(argv, cwd)
        start = time.monotonic()
        proc = subprocess.Popen(
            argv, cwd=str(cwd), env=self.policy.child_env(extra_env),
            stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            start_new_session=True,  # grupo próprio → podemos matar a árvore inteira
        )
        timed_out = cancelled = False
        out = err = ""
        first = True
        while True:
            try:
                out, err = proc.communicate(input=stdin if first else None, timeout=1.0)
                break
            except subprocess.TimeoutExpired:
                first = False
                if time.monotonic() - start > timeout_s:
                    timed_out = True
                elif cancel_check and cancel_check():
                    cancelled = True
                else:
                    continue
                self._kill(proc)
                out, err = proc.communicate()
                break
        duration = time.monotonic() - start
        result = CommandResult(argv=argv, exit_code=proc.returncode, stdout=out or "",
                               stderr=err or "", duration_s=duration,
                               timed_out=timed_out, cancelled=cancelled)
        self.db.log_command(
            run_id=run_id, actor=actor, argv=[redact(a)[:500] for a in argv], cwd=str(cwd),
            exit_code=proc.returncode, duration_s=duration, timed_out=timed_out,
            cancelled=cancelled, stdout_tail=redact(result.stdout[-TAIL:]),
            stderr_tail=redact(result.stderr[-TAIL:]))
        if cancelled:
            raise CancelledError(f"comando cancelado: {argv[0]}")
        return result

    @staticmethod
    def _kill(proc: subprocess.Popen) -> None:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
            proc.wait(timeout=5)
        except Exception:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except Exception:
                pass
