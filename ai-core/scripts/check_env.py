#!/usr/bin/env python3
"""Inspeciona o ambiente sem imprimir credenciais.

Verifica Python, Node, Git, Docker, Claude Code e Codex (instalação e login),
e se há API keys no ambiente que poderiam gerar cobrança por API.
Uso: python scripts/check_env.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def run(argv: list[str]) -> tuple[int | None, str]:
    if not shutil.which(argv[0]):
        return None, "não encontrado"
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=30)
        return p.returncode, (p.stdout or p.stderr).strip().splitlines()[0] if (p.stdout or p.stderr).strip() else ""
    except Exception as e:  # noqa: BLE001
        return None, f"erro: {e}"


def main() -> int:
    from backend.config import Settings
    s = Settings.from_env()
    report: dict = {"python": sys.version.split()[0]}
    for name, argv in {"node": ["node", "--version"], "git": ["git", "--version"],
                       "docker": ["docker", "--version"], "docker_daemon": ["docker", "info", "--format", "{{.ServerVersion}}"],
                       "claude_version": [s.claude_bin, "--version"], "codex_version": [s.codex_bin, "--version"]}.items():
        code, out = run(argv)
        report[name] = out if code == 0 else f"indisponível ({out})"

    # Claude: `claude auth status` devolve JSON; só extraímos campos não sensíveis.
    if shutil.which(s.claude_bin):
        p = subprocess.run([s.claude_bin, "auth", "status"], capture_output=True, text=True, timeout=30)
        try:
            d = json.loads(p.stdout)
            report["claude_auth"] = {"loggedIn": d.get("loggedIn"), "authMethod": d.get("authMethod"),
                                     "subscriptionType": d.get("subscriptionType")}
        except json.JSONDecodeError:
            report["claude_auth"] = "não foi possível ler o status"
    if shutil.which(s.codex_bin):
        code, out = run([s.codex_bin, "login", "status"])
        report["codex_auth"] = out
    report["api_keys_no_ambiente"] = {k: bool(os.environ.get(k)) for k in
                                      ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "CODEX_API_KEY")}
    report["nota"] = ("API keys, se presentes, são REMOVIDAS do ambiente dos agentes para "
                      "forçar o uso das assinaturas.")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
