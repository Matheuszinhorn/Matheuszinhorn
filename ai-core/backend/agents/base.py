"""Contratos dos agentes."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from backend.communication.schemas import (AgentUsage, AuditReport, AuditRequest,
                                           ImplementationReport, ImplementationRequest)
from backend.execution.runner import CommandRunner


class AgentError(Exception):
    """Falha do agente (CLI ausente, sem login, saída inválida, timeout...)."""


class QuotaExceeded(AgentError):
    """Limite de consumo local atingido ou limite do plano reportado pelo CLI."""


@dataclass
class AgentStatus:
    name: str
    role: str
    kind: str
    installed: bool
    version: str | None
    authenticated: bool
    detail: str


@dataclass
class AgentContext:
    runner: CommandRunner
    workspace: Path
    run_id: str
    scratch_dir: Path            # fora do workspace: schema/saídas temporárias
    timeout_s: int
    cancel_check: Callable[[], bool]


class Agent(ABC):
    name: str = "agent"
    role: str = "unknown"
    kind: str = "unknown"

    @abstractmethod
    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus: ...


class Implementer(Agent):
    role = "implementer"

    @abstractmethod
    def implement(self, req: ImplementationRequest, ctx: AgentContext
                  ) -> tuple[ImplementationReport, AgentUsage]: ...


class Auditor(Agent):
    role = "auditor"
    #: auditores nunca podem modificar o workspace; o orquestrador verifica.
    read_only: bool = True

    @abstractmethod
    def audit(self, req: AuditRequest, ctx: AgentContext) -> tuple[AuditReport, AgentUsage]: ...


QUOTA_HINTS = ("usage limit", "rate limit", "rate_limit", "quota", "limit reached",
               "too many requests", "429")


def looks_like_quota_error(text: str) -> bool:
    t = (text or "").lower()
    return any(h in t for h in QUOTA_HINTS)
