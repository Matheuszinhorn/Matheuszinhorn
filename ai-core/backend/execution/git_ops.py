"""Operações Git usadas pelo orquestrador. Nunca faz push."""
from __future__ import annotations

from pathlib import Path

from backend.execution.runner import CommandRunner

GIT_IDENTITY = {
    "GIT_AUTHOR_NAME": "IA CORE Orchestrator",
    "GIT_AUTHOR_EMAIL": "aicore@localhost",
    "GIT_COMMITTER_NAME": "IA CORE Orchestrator",
    "GIT_COMMITTER_EMAIL": "aicore@localhost",
}


class GitError(Exception):
    pass


class GitOps:
    def __init__(self, runner: CommandRunner, workspace: Path, run_id: str | None = None):
        self.runner = runner
        self.ws = workspace
        self.run_id = run_id

    def _git(self, *args: str, check: bool = True) -> str:
        res = self.runner.run(["git", *args], cwd=self.ws, actor="orchestrator:git",
                              run_id=self.run_id, timeout_s=60, extra_env=GIT_IDENTITY)
        if check and not res.ok:
            raise GitError(f"git {' '.join(args)} falhou: {res.stderr.strip()[:500]}")
        return res.stdout

    def ensure_repo(self) -> None:
        if not (self.ws / ".git").exists():
            self._git("init", "-q", "-b", "trunk")
            gi = self.ws / ".gitignore"
            if not gi.exists():
                gi.write_text("__pycache__/\n*.pyc\n.pytest_cache/\n", encoding="utf-8")
        if not self._git("rev-parse", "--verify", "HEAD", check=False).strip():
            self._git("add", "-A")
            self._git("commit", "-q", "--allow-empty", "-m", "aicore: baseline")

    def head(self) -> str:
        return self._git("rev-parse", "HEAD").strip()

    def current_branch(self) -> str:
        return self._git("rev-parse", "--abbrev-ref", "HEAD").strip()

    def is_clean(self) -> bool:
        return self._git("status", "--porcelain").strip() == ""

    def create_branch(self, branch: str) -> None:
        self.runner.policy.check_branch_name(branch)
        self._git("checkout", "-q", "-b", branch)

    def commit_all(self, message: str) -> str | None:
        self._git("add", "-A")
        if self._git("diff", "--cached", "--name-only").strip() == "":
            return None
        self._git("commit", "-q", "-m", message)
        return self.head()

    def diff(self, base: str, max_chars: int = 60000) -> str:
        d = self._git("diff", base, "HEAD", "--stat", "--patch", "--no-color")
        if len(d) > max_chars:
            d = d[:max_chars] + f"\n... [diff truncado em {max_chars} caracteres]"
        return d

    def snapshot(self) -> tuple[str, str]:
        """HEAD + status: usado para provar que o auditor não alterou nada."""
        return self.head(), self._git("status", "--porcelain")

    def restore(self, commit: str) -> None:
        """Descarta alterações não commitadas feitas indevidamente (ex.: pelo auditor)."""
        self._git("reset", "-q", "--hard", commit)
        # remove arquivos não rastreados criados indevidamente, sem usar 'git clean'
        untracked = self._git("ls-files", "--others", "--exclude-standard").splitlines()
        for rel in untracked:
            p = (self.ws / rel).resolve()
            if self.ws.resolve() in p.parents and p.is_file():
                p.unlink()
