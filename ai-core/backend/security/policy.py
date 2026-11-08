"""Política de segurança aplicada a TODO comando que o orquestrador executa.

Regras:
1. Confinamento: o diretório de trabalho precisa estar dentro de
   AICORE_WORKSPACES_ROOT (após resolver symlinks). Cada projeto é isolado no
   seu próprio subdiretório.
2. Allowlist de executáveis: só git, claude, codex e o interpretador Python.
3. Git restrito: subcomandos que publicam ou destroem histórico remoto
   (push, remote, filter-branch...) são bloqueados; nenhuma operação em
   main/master; nenhum push é feito pelo sistema.
4. Sem permissões irrestritas: flags como --dangerously-skip-permissions,
   bypassPermissions, danger-full-access são rejeitadas.
5. Sem palavras de deploy/produção nos comandos de teste.
6. Ambiente higienizado: API keys e tokens são removidos antes de iniciar
   qualquer processo filho; logs passam por redação de segredos.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


class SecurityViolation(Exception):
    """Comando ou caminho recusado pela política."""


ALLOWED_EXECUTABLES = {"git", "claude", "codex", "python", "python3", "pytest"}

FORBIDDEN_GIT_SUBCOMMANDS = {
    "push", "remote", "filter-branch", "filter-repo", "gc", "prune",
    "send-email", "request-pull", "submodule", "config", "update-ref",
}

FORBIDDEN_FLAGS = {
    "--dangerously-skip-permissions",
    "--dangerously-bypass-approvals-and-sandbox",
    "--dangerously-bypass-hook-trust",
    "bypassPermissions",
    "danger-full-access",
    "--allow-dangerously-skip-permissions",
}

PROTECTED_BRANCHES = {"main", "master", "production", "prod", "release"}

# Palavras que indicam deploy / produção / destruição em comandos de teste.
FORBIDDEN_TEST_TOKENS = re.compile(
    r"\b(deploy|publish|vercel|kubectl|terraform|helm|twine|npm\s+publish|"
    r"rm\s+-rf|drop\s+database|prod(uction)?)\b",
    re.IGNORECASE,
)

SECRET_PATTERNS = [
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{10,}"),
    re.compile(r"sk-[A-Za-z0-9_\-]{20,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._\-]{16,}"),
    re.compile(r"(?i)((?:api[_-]?key|token|secret|password)\s*[=:]\s*)\S{8,}"),
]

SECRET_ENV_HINT = re.compile(r"(?i)(API_KEY|SECRET|PASSWORD|_TOKEN$|^TOKEN$)")


def redact(text: str) -> str:
    if not text:
        return text
    for pat in SECRET_PATTERNS:
        text = pat.sub(lambda m: (m.group(1) if m.groups() else "") + "[REDACTED]", text)
    return text


class SecurityPolicy:
    def __init__(self, workspaces_root: Path, scrubbed_env: tuple[str, ...] = ()):
        self.root = Path(workspaces_root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.scrubbed_env = set(scrubbed_env)

    # ------------------------------------------------------------ paths
    def check_path(self, path: str | Path) -> Path:
        p = Path(path).resolve()
        if p == self.root or self.root not in p.parents:
            raise SecurityViolation(
                f"caminho fora do diretório autorizado: {p} (raiz permitida: {self.root})")
        return p

    # ---------------------------------------------------------- commands
    def check_command(self, argv: list[str], cwd: str | Path) -> None:
        if not argv:
            raise SecurityViolation("comando vazio")
        self.check_path(cwd)
        exe = Path(argv[0]).name
        if argv[0] == sys.executable:
            exe = "python"
        if exe not in ALLOWED_EXECUTABLES and not exe.startswith("python3"):
            raise SecurityViolation(f"executável não permitido: {exe}")
        for arg in argv:
            for flag in FORBIDDEN_FLAGS:
                if flag in arg:
                    raise SecurityViolation(f"flag proibida: {flag}")
        if exe == "git":
            self._check_git(argv[1:])

    def _check_git(self, args: list[str]) -> None:
        sub = next((a for a in args if not a.startswith("-")), None)
        if sub is None:
            raise SecurityViolation("subcomando git ausente")
        if sub in FORBIDDEN_GIT_SUBCOMMANDS:
            raise SecurityViolation(f"git {sub} não é permitido")
        rest = args[args.index(sub) + 1:]
        if sub in {"checkout", "switch", "branch", "commit", "reset", "merge", "rebase"}:
            for a in rest:
                if a in PROTECTED_BRANCHES and sub not in {"checkout", "switch"}:
                    raise SecurityViolation(f"operação em branch protegida: {a}")
        if sub == "branch" and any(a in {"-D", "-d", "--delete", "-f", "--force"} for a in rest):
            raise SecurityViolation("exclusão/força de branch não permitida")
        if sub == "clean":
            raise SecurityViolation("git clean não é permitido")

    def check_test_command(self, argv: list[str]) -> None:
        if not argv:
            raise SecurityViolation("comando de teste vazio")
        joined = " ".join(argv)
        if FORBIDDEN_TEST_TOKENS.search(joined):
            raise SecurityViolation(f"comando de teste contém termo proibido: {joined}")
        exe = Path(argv[0]).name
        if exe not in {"python", "python3", "pytest"} and not exe.startswith("python3"):
            raise SecurityViolation("comando de teste deve usar python/pytest nesta versão")

    def check_branch_name(self, branch: str) -> None:
        if branch in PROTECTED_BRANCHES or not re.fullmatch(r"aicore/[A-Za-z0-9._\-/]+", branch):
            raise SecurityViolation(f"branch inválida para trabalho de agente: {branch}")

    # --------------------------------------------------------- environment
    def child_env(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        env = {k: v for k, v in os.environ.items() if k not in self.scrubbed_env}
        if extra:
            env.update(extra)
        # Git nunca deve pedir credenciais interativamente.
        env["GIT_TERMINAL_PROMPT"] = "0"
        return env
