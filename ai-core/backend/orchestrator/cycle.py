"""Ciclo automático desenvolvimento → testes → auditoria → correção.

Máquina de estados determinística (no máximo 5 ciclos). LangGraph não foi
adotado nesta versão: o fluxo é linear com um único laço, e um laço explícito
é mais fácil de auditar e testar. A interface `Orchestrator.execute` permite
trocar a implementação por um grafo LangGraph quando houver ramificações reais
(múltiplos auditores, paralelismo, aprovação humana).

Estados de run: pending → running → completed | failed | cancelled | interrupted
Outcomes:       approved | max_cycles_reached | quota_exceeded | agent_error |
                security_violation | auditor_violation | timeout | cancelled | error
"""
from __future__ import annotations

import logging
import threading
import time
import uuid
from pathlib import Path

from backend.agents.base import AgentContext, AgentError, QuotaExceeded
from backend.agents.registry import AgentRegistry
from backend.communication.schemas import (AuditIssue, AuditReport, AuditRequest,
                                           ImplementationRequest, TestResult)
from backend.config import Settings
from backend.execution.git_ops import GitError, GitOps
from backend.execution.runner import CancelledError, CommandRunner
from backend.memory.db import Database, now
from backend.security.policy import SecurityPolicy, SecurityViolation, redact

log = logging.getLogger("aicore.orchestrator")


class TaskTimeout(Exception):
    pass


class Orchestrator:
    def __init__(self, db: Database, settings: Settings, registry: AgentRegistry,
                 policy: SecurityPolicy | None = None):
        self.db = db
        self.settings = settings
        self.registry = registry
        self.policy = policy or SecurityPolicy(settings.workspaces_root, settings.scrubbed_env)
        self.runner = CommandRunner(db, self.policy)
        self._threads: dict[str, threading.Thread] = {}

    # ------------------------------------------------------------ public API
    def create_task(self, *, title: str, objective: str, acceptance_criteria: list[str],
                    workspace: str, test_command: list[str], implementer: str = "claude-code",
                    auditor: str = "codex", max_cycles: int | None = None) -> str:
        ws = self.policy.check_path(workspace)
        self.policy.check_test_command(test_command)
        self.registry.implementer(implementer)
        self.registry.auditor(auditor)
        cycles = min(max_cycles or self.settings.max_audit_cycles, self.settings.max_audit_cycles)
        return self.db.create_task(title=title, objective=objective,
                                   acceptance_criteria=acceptance_criteria, workspace=str(ws),
                                   test_command=test_command, implementer=implementer,
                                   auditor=auditor, max_cycles=cycles)

    def start(self, task_id: str, background: bool = False) -> str:
        if not self.db.get_task(task_id):
            raise KeyError(task_id)
        run_id = self.db.create_run(task_id)
        if background:
            t = threading.Thread(target=self.execute, args=(run_id,), daemon=True,
                                 name=f"run-{run_id}")
            self._threads[run_id] = t
            t.start()
        else:
            self.execute(run_id)
        return run_id

    def probe_agents(self):
        """Verifica instalação e login de todos os agentes (diretório isolado)."""
        probe_dir = self.policy.root / "_probe"
        probe_dir.mkdir(parents=True, exist_ok=True)
        return self.registry.probe_all(self.runner, probe_dir)

    def cancel(self, run_id: str) -> bool:
        return self.db.request_cancel(run_id)

    # ------------------------------------------------------------- execution
    def execute(self, run_id: str) -> dict:
        run = self.db.get_run(run_id)
        task = self.db.get_task(run["task_id"])
        deadline = time.monotonic() + self.settings.task_timeout_s
        self.db.update_run(run_id, status="running")
        cycle = 0
        try:
            ws = self.policy.check_path(task["workspace"])
            implementer = self.registry.implementer(task["implementer"])
            auditor = self.registry.auditor(task["auditor"])
            git = GitOps(self.runner, ws, run_id)
            git.ensure_repo()
            if not git.is_clean():
                raise SecurityViolation("workspace com alterações não commitadas; abortando para não misturar trabalho")
            base = git.head()
            branch = f"aicore/task-{task['id']}-{run_id}"
            git.create_branch(branch)
            self.db.update_run(run_id, branch=branch, base_commit=base)
            self._decide(run_id, 0, "start",
                         f"branch isolada {branch} a partir de {base[:10]}; implementador={implementer.name}; "
                         f"auditor={auditor.name}; máx. ciclos={task['max_cycles']}")
            ctx = AgentContext(runner=self.runner, workspace=ws, run_id=run_id,
                               scratch_dir=self.settings.db_path.parent / "runs" / run_id,
                               timeout_s=self.settings.agent_timeout_s,
                               cancel_check=lambda: self.db.is_cancel_requested(run_id))

            prev_audit: AuditReport | None = None
            prev_tests: TestResult | None = None
            for cycle in range(1, task["max_cycles"] + 1):
                self._guard(run_id, deadline)
                self.db.update_run(run_id, cycle=cycle)

                # 1) Implementação
                req = ImplementationRequest(task_id=task["id"], cycle=cycle, objective=task["objective"],
                                            acceptance_criteria=task["acceptance_criteria"],
                                            previous_audit=prev_audit, previous_tests=prev_tests)
                self.db.add_message(run_id, cycle, "orchestrator", implementer.name,
                                    "implementation_request", req.model_dump())
                self._check_quota(implementer.name)
                impl, usage = self._with_retry(lambda: implementer.implement(req, ctx), run_id, cycle,
                                               implementer.name)
                self._record_usage(run_id, implementer.name, usage)
                self.db.add_message(run_id, cycle, implementer.name, "orchestrator",
                                    "implementation_report", impl.model_dump())

                # 2) Git registra as alterações
                commit = git.commit_all(f"aicore: ciclo {cycle} - {task['title']}"[:120])
                self._decide(run_id, cycle, "commit",
                             f"commit {commit[:10]}" if commit else "implementador não alterou arquivos")

                # 3) Testes executados pelo orquestrador (fonte confiável)
                self._guard(run_id, deadline)
                tests = self._run_tests(task, ws, run_id, ctx)
                self.db.add_message(run_id, cycle, "orchestrator", "orchestrator", "test_result",
                                    tests.model_dump())

                # 4) Auditoria independente (somente leitura)
                self._guard(run_id, deadline)
                audit_req = AuditRequest(task_id=task["id"], cycle=cycle, objective=task["objective"],
                                         acceptance_criteria=task["acceptance_criteria"],
                                         diff=git.diff(base), tests=tests)
                self.db.add_message(run_id, cycle, "orchestrator", auditor.name, "audit_request",
                                    audit_req.model_dump())
                self._check_quota(auditor.name)
                before = git.snapshot()
                try:
                    report, usage = self._with_retry(lambda: auditor.audit(audit_req, ctx), run_id,
                                                     cycle, auditor.name)
                finally:
                    after = git.snapshot()
                    if after != before:
                        git.restore(before[0])
                        self._decide(run_id, cycle, "auditor_violation",
                                     "auditor modificou o workspace; alterações descartadas e auditoria invalidada")
                        raise SecurityViolation("auditor_violation")
                self._record_usage(run_id, auditor.name, usage)
                self.db.add_message(run_id, cycle, auditor.name, "orchestrator", "audit_report",
                                    report.model_dump())

                # 5) Decisão
                if report.verdict == "approved" and tests.passed:
                    self._decide(run_id, cycle, "approved", report.summary[:1000])
                    self._finish(run_id, "completed", "approved", final_commit=git.head())
                    return self.db.get_run(run_id)
                if report.verdict == "approved" and not tests.passed:
                    report = report.model_copy(update={
                        "verdict": "rejected",
                        "issues": report.issues + [AuditIssue(
                            severity="blocker", file="(testes)",
                            description="auditor aprovou, mas os testes do orquestrador falharam",
                            suggested_fix="fazer os testes passarem")]})
                    self._decide(run_id, cycle, "override_rejected",
                                 "política: aprovação exige testes passando")
                else:
                    self._decide(run_id, cycle, "rejected",
                                 f"{report.summary[:500]} | {len(report.issues)} problema(s)")
                prev_audit, prev_tests = report, tests

            self._decide(run_id, cycle, "max_cycles_reached",
                         f"limite de {task['max_cycles']} ciclos atingido sem aprovação")
            self._finish(run_id, "completed", "max_cycles_reached", final_commit=git.head())
        except CancelledError as e:
            self._decide(run_id, cycle, "cancelled", str(e))
            self._finish(run_id, "cancelled", "cancelled")
        except TaskTimeout as e:
            self._decide(run_id, cycle, "timeout", str(e))
            self._finish(run_id, "failed", "timeout", error=str(e))
        except QuotaExceeded as e:
            self._decide(run_id, cycle, "quota_exceeded", str(e))
            self._finish(run_id, "failed", "quota_exceeded", error=str(e))
        except SecurityViolation as e:
            outcome = "auditor_violation" if str(e) == "auditor_violation" else "security_violation"
            self._decide(run_id, cycle, outcome, str(e))
            self._finish(run_id, "failed", outcome, error=str(e))
        except (AgentError, GitError) as e:
            self._decide(run_id, cycle, "agent_error", redact(str(e))[:1000])
            self._finish(run_id, "failed", "agent_error", error=redact(str(e))[:2000])
        except Exception as e:  # noqa: BLE001 — nunca deixar run 'running' para sempre
            log.exception("erro inesperado no run %s", run_id)
            self._decide(run_id, cycle, "error", redact(repr(e))[:1000])
            self._finish(run_id, "failed", "error", error=redact(repr(e))[:2000])
        return self.db.get_run(run_id)

    # --------------------------------------------------------------- helpers
    def _guard(self, run_id: str, deadline: float) -> None:
        if self.db.is_cancel_requested(run_id):
            raise CancelledError("cancelamento solicitado pelo usuário")
        if time.monotonic() > deadline:
            raise TaskTimeout(f"tempo máximo da tarefa ({self.settings.task_timeout_s}s) excedido")

    def _check_quota(self, agent: str) -> None:
        limit = self.settings.daily_calls.get(agent, self.settings.daily_calls.get("default", 40))
        used = self.db.calls_today(agent)
        if used >= limit:
            raise QuotaExceeded(f"limite diário local de {limit} chamadas para {agent} atingido ({used})")

    def _with_retry(self, fn, run_id: str, cycle: int, agent: str, retries: int = 1):
        for attempt in range(retries + 1):
            try:
                return fn()
            except (QuotaExceeded, CancelledError):
                raise
            except AgentError as e:
                if attempt >= retries or self.db.is_cancel_requested(run_id):
                    raise
                self._decide(run_id, cycle, "retry", f"{agent}: {redact(str(e))[:300]}")

    def _run_tests(self, task: dict, ws: Path, run_id: str, ctx: AgentContext) -> TestResult:
        cmd = task["test_command"]
        self.policy.check_test_command(cmd)
        # Cache de bytecode isolado por execução: evita que um .pyc antigo (mesmo
        # tamanho/mtime do arquivo corrigido) faça os testes rodarem código velho.
        pycache = ctx.scratch_dir / f"pycache-{uuid.uuid4().hex[:8]}"
        res = self.runner.run(cmd, cwd=ws, actor="orchestrator:tests", run_id=run_id,
                              timeout_s=self.settings.test_timeout_s, cancel_check=ctx.cancel_check,
                              extra_env={"PYTHONPYCACHEPREFIX": str(pycache),
                                         "PYTHONDONTWRITEBYTECODE": "1"})
        return TestResult(command=cmd, exit_code=res.exit_code, passed=res.ok,
                          timed_out=res.timed_out,
                          output_tail=redact((res.stdout + "\n" + res.stderr)[-6000:]))

    def _record_usage(self, run_id: str, agent: str, usage) -> None:
        self.db.record_usage(run_id=run_id, agent=agent, input_tokens=usage.input_tokens,
                             output_tokens=usage.output_tokens,
                             reported_cost_usd=usage.reported_cost_usd)

    def _decide(self, run_id: str, cycle: int, decision: str, reason: str) -> None:
        log.info("run=%s ciclo=%s decisão=%s %s", run_id, cycle, decision, reason[:200])
        self.db.add_decision(run_id, cycle, decision, reason)

    def _finish(self, run_id: str, status: str, outcome: str, *, final_commit: str | None = None,
                error: str | None = None) -> None:
        fields = dict(status=status, outcome=outcome, finished_at=now())
        if final_commit:
            fields["final_commit"] = final_commit
        if error:
            fields["error"] = error
        self.db.update_run(run_id, **fields)
