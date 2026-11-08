"""Registro de agentes disponíveis."""
from __future__ import annotations

from pathlib import Path

from backend.agents.base import Agent, AgentStatus, Auditor, Implementer
from backend.agents.claude_code import ClaudeCodeAuditor, ClaudeCodeImplementer
from backend.agents.codex import CodexAuditor
from backend.config import Settings
from backend.execution.runner import CommandRunner
from backend.memory.db import Database


class AgentRegistry:
    def __init__(self, db: Database):
        self.db = db
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        self._agents[agent.name] = agent

    def get(self, name: str) -> Agent:
        if name not in self._agents:
            raise KeyError(f"agente não registrado: {name}")
        return self._agents[name]

    def implementer(self, name: str) -> Implementer:
        a = self.get(name)
        if not isinstance(a, Implementer):
            raise TypeError(f"{name} não é implementador")
        return a

    def auditor(self, name: str) -> Auditor:
        a = self.get(name)
        if not isinstance(a, Auditor):
            raise TypeError(f"{name} não é auditor")
        return a

    def names(self) -> list[str]:
        return sorted(self._agents)

    def probe_all(self, runner: CommandRunner, cwd: Path) -> list[AgentStatus]:
        out = []
        for agent in self._agents.values():
            try:
                st = agent.probe(runner, cwd)
            except Exception as e:  # o probe nunca derruba o sistema
                st = AgentStatus(agent.name, agent.role, agent.kind, False, None, False, f"erro: {e}")
            self.db.upsert_agent(st.name, st.role, st.kind, getattr(agent, "binary", None),
                                 st.version, st.authenticated, st.detail)
            out.append(st)
        return out


def default_registry(db: Database, settings: Settings) -> AgentRegistry:
    reg = AgentRegistry(db)
    reg.register(ClaudeCodeImplementer(binary=settings.claude_bin))
    reg.register(CodexAuditor(binary=settings.codex_bin))
    reg.register(ClaudeCodeAuditor(binary=settings.claude_bin))
    return reg
