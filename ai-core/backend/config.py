"""Configuração central do IA CORE.

Todos os valores vêm de variáveis de ambiente (ou de um arquivo .env não
versionado). Nenhuma credencial é lida ou armazenada aqui: Claude Code e Codex
mantêm suas próprias sessões OAuth em ~/.claude e ~/.codex.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """Carrega KEY=VALUE de um .env simples sem sobrescrever o ambiente."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _path(name: str, default: str) -> Path:
    raw = os.environ.get(name, default)
    p = Path(raw)
    if not p.is_absolute():
        p = PROJECT_ROOT / p
    return p.resolve()


@dataclass
class Settings:
    workspaces_root: Path
    db_path: Path
    max_audit_cycles: int = 5
    agent_timeout_s: int = 900
    test_timeout_s: int = 300
    task_timeout_s: int = 5400
    daily_calls: dict[str, int] = field(default_factory=dict)
    claude_bin: str = "claude"
    codex_bin: str = "codex"
    # Variáveis removidas do ambiente dos agentes. Remover as API keys garante
    # que os CLIs usem o login da assinatura (Claude Pro / ChatGPT) e não
    # cobrança por API sem o proprietário perceber.
    scrubbed_env: tuple[str, ...] = (
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "CODEX_API_KEY",
        "AWS_SECRET_ACCESS_KEY",
        "GITHUB_TOKEN",
        "GH_TOKEN",
    )

    @classmethod
    def from_env(cls) -> "Settings":
        _load_dotenv(PROJECT_ROOT / ".env")
        max_cycles = _int("AICORE_MAX_AUDIT_CYCLES", 5)
        return cls(
            workspaces_root=_path("AICORE_WORKSPACES_ROOT", "./workspaces"),
            db_path=_path("AICORE_DB_PATH", "./data/aicore.db"),
            # Limite rígido: nunca mais que 5 ciclos nesta versão.
            max_audit_cycles=max(1, min(max_cycles, 5)),
            agent_timeout_s=_int("AICORE_AGENT_TIMEOUT_S", 900),
            test_timeout_s=_int("AICORE_TEST_TIMEOUT_S", 300),
            task_timeout_s=_int("AICORE_TASK_TIMEOUT_S", 5400),
            daily_calls={
                "claude-code": _int("AICORE_DAILY_CALLS_CLAUDE", 40),
                "codex": _int("AICORE_DAILY_CALLS_CODEX", 40),
            },
            claude_bin=os.environ.get("AICORE_CLAUDE_BIN", "claude"),
            codex_bin=os.environ.get("AICORE_CODEX_BIN", "codex"),
        )
