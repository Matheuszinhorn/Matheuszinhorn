"""Agentes determinísticos para testes automatizados e modo offline.

Não substituem os agentes reais na validação da missão; servem para provar a
lógica do orquestrador (ciclos, limites, persistência, falhas) sem consumir a
cota das assinaturas.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from backend.agents.base import AgentContext, AgentError, AgentStatus, Auditor, Implementer
from backend.communication.schemas import (AgentUsage, AuditIssue, AuditReport, AuditRequest,
                                           CriterionCheck, ImplementationReport,
                                           ImplementationRequest)
from backend.execution.runner import CommandRunner

EditFn = Callable[[Path, ImplementationRequest], str]


class ScriptedImplementer(Implementer):
    """Aplica, a cada ciclo, a próxima função de edição da lista."""
    kind = "fake"

    def __init__(self, edits: list[EditFn], name: str = "fake-implementer", fail_on: set[int] = frozenset()):
        self.edits = edits
        self.name = name
        self.fail_on = set(fail_on)
        self.requests: list[ImplementationRequest] = []

    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus:
        return AgentStatus(self.name, self.role, self.kind, True, "test", True, "fake")

    def implement(self, req: ImplementationRequest, ctx: AgentContext):
        self.requests.append(req)
        if req.cycle in self.fail_on:
            raise AgentError("falha simulada do implementador")
        fn = self.edits[min(req.cycle, len(self.edits)) - 1]
        summary = fn(ctx.workspace, req)
        return ImplementationReport(agent=self.name, success=True, summary=summary), AgentUsage()


class DiffAndTestsAuditor(Auditor):
    """Aprova somente se os testes passaram e nenhum marcador proibido
    aparece no diff. Opcionalmente tenta (indevidamente) modificar arquivos,
    para validar a proteção do orquestrador."""
    kind = "fake"

    def __init__(self, name: str = "fake-auditor", forbidden_markers: tuple[str, ...] = ("BUG",),
                 tamper: bool = False):
        self.name = name
        self.forbidden = forbidden_markers
        self.tamper = tamper
        self.requests: list[AuditRequest] = []

    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus:
        return AgentStatus(self.name, self.role, self.kind, True, "test", True, "fake")

    def audit(self, req: AuditRequest, ctx: AgentContext):
        self.requests.append(req)
        if self.tamper:
            (ctx.workspace / "tampered_by_auditor.txt").write_text("x")
        added = [l for l in req.diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
        markers = [m for m in self.forbidden if any(m in l for l in added)]
        ok = req.tests.passed and not markers
        criteria = [CriterionCheck(criterion=c, met=ok, evidence="testes + diff") for c in req.acceptance_criteria]
        issues = [] if ok else [AuditIssue(
            severity="blocker", file="*",
            description=("testes falharam" if not req.tests.passed else f"marcadores: {markers}"),
            suggested_fix="corrigir a implementação para atender aos critérios")]
        return AuditReport(verdict="approved" if ok else "rejected",
                           summary="ok" if ok else "reprovado", criteria=criteria,
                           issues=issues), AgentUsage()
