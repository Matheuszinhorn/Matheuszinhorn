"""Adaptador do Claude Code CLI (modo headless `claude -p`).

Autenticação: login OAuth da assinatura Claude Pro feito pelo proprietário com
`claude` → /login (ou `claude auth login`). O IA CORE não lê nem copia o token;
apenas consulta `claude auth status`. ANTHROPIC_API_KEY é removida do ambiente
do processo filho para garantir que o uso seja da assinatura e não da API paga.

Permissões: nunca usa bypassPermissions. O desenvolvedor roda com
`--permission-mode acceptEdits` e ferramentas restritas (leitura/edição de
arquivos + pytest). O auditor fallback roda apenas com Read/Glob/Grep.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from backend.agents.base import (AgentContext, AgentError, AgentStatus, Auditor, Implementer,
                                 QuotaExceeded, looks_like_quota_error)
from backend.communication.schemas import (AgentUsage, AuditReport, AuditRequest,
                                           ImplementationReport, ImplementationRequest,
                                           audit_json_schema)
from backend.execution.runner import CommandRunner
from backend.orchestrator.prompts import audit_prompt, implementation_prompt

IMPLEMENTER_TOOLS = "Read,Edit,Write,Glob,Grep,Bash"
IMPLEMENTER_ALLOWED = [
    "Read", "Edit", "Write", "Glob", "Grep",
    "Bash(python -m pytest:*)", "Bash(python3 -m pytest:*)", "Bash(pytest:*)",
]
AUDITOR_TOOLS = "Read,Glob,Grep"


def _probe_claude(binary: str, runner: CommandRunner, cwd: Path, name: str, role: str) -> AgentStatus:
    if not shutil.which(binary):
        return AgentStatus(name, role, "claude-code", False, None, False,
                           "Claude Code CLI não encontrado no PATH")
    ver = runner.run([binary, "--version"], cwd=cwd, actor=f"probe:{name}", timeout_s=30)
    auth = runner.run([binary, "auth", "status"], cwd=cwd, actor=f"probe:{name}", timeout_s=30)
    logged, method = False, "desconhecido"
    try:
        data = json.loads(auth.stdout)
        logged = bool(data.get("loggedIn"))
        method = str(data.get("authMethod", "desconhecido"))
    except json.JSONDecodeError:
        logged = auth.ok and "logged in" in auth.stdout.lower()
    detail = f"loggedIn={logged}; método={method}" if logged else "não autenticado: rode `claude` e faça /login"
    return AgentStatus(name, role, "claude-code", True, ver.stdout.strip() or None, logged, detail)


def _usage(data: dict) -> AgentUsage:
    u = data.get("usage") or {}
    inp = sum(int(u.get(k) or 0) for k in
              ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    return AgentUsage(input_tokens=inp if u else None, output_tokens=u.get("output_tokens"),
                      reported_cost_usd=data.get("total_cost_usd"))


def _run_claude(binary: str, args: list[str], prompt: str, ctx: AgentContext, actor: str) -> dict:
    argv = [binary, "-p", "--output-format", "json", "--strict-mcp-config",
            "--no-session-persistence", *args]
    res = ctx.runner.run(argv, cwd=ctx.workspace, actor=actor, run_id=ctx.run_id,
                         timeout_s=ctx.timeout_s, stdin=prompt, cancel_check=ctx.cancel_check)
    if res.timed_out:
        raise AgentError(f"{actor}: timeout após {ctx.timeout_s}s")
    try:
        data = json.loads(res.stdout.strip().splitlines()[-1]) if res.stdout.strip() else {}
    except (json.JSONDecodeError, IndexError):
        data = {}
    if not data or data.get("is_error") or not res.ok:
        msg = (data.get("result") if data else None) or res.stderr or res.stdout
        if looks_like_quota_error(str(msg)):
            raise QuotaExceeded(f"{actor}: limite do plano atingido: {str(msg)[:300]}")
        raise AgentError(f"{actor}: falhou (exit={res.exit_code}): {str(msg)[:500]}")
    return data


class ClaudeCodeImplementer(Implementer):
    kind = "claude-code"

    def __init__(self, binary: str = "claude", max_turns: int = 40, name: str = "claude-code"):
        self.binary = binary
        self.max_turns = max_turns
        self.name = name

    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus:
        return _probe_claude(self.binary, runner, cwd, self.name, self.role)

    def implement(self, req: ImplementationRequest, ctx: AgentContext):
        args = ["--permission-mode", "acceptEdits", "--max-turns", str(self.max_turns),
                "--tools", IMPLEMENTER_TOOLS, "--allowedTools", *IMPLEMENTER_ALLOWED]
        data = _run_claude(self.binary, args, implementation_prompt(req), ctx, f"agent:{self.name}")
        return (ImplementationReport(agent=self.name, success=True,
                                     summary=str(data.get("result", ""))[:4000],
                                     session_id=data.get("session_id")),
                _usage(data))


class ClaudeCodeAuditor(Auditor):
    """Auditor FALLBACK usando Claude em modo somente leitura. Não é um auditor
    de fornecedor independente; existe para quando o Codex não estiver
    autenticado ou estiver sem cota."""
    kind = "claude-code"

    def __init__(self, binary: str = "claude", max_turns: int = 20, name: str = "claude-auditor"):
        self.binary = binary
        self.max_turns = max_turns
        self.name = name

    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus:
        return _probe_claude(self.binary, runner, cwd, self.name, self.role)

    def audit(self, req: AuditRequest, ctx: AgentContext):
        args = ["--permission-mode", "default", "--max-turns", str(self.max_turns),
                "--tools", AUDITOR_TOOLS, "--allowedTools", "Read", "Glob", "Grep",
                "--json-schema", json.dumps(audit_json_schema())]
        data = _run_claude(self.binary, args, audit_prompt(req), ctx, f"agent:{self.name}")
        payload = data.get("structured_output")
        if payload is None:
            try:
                payload = json.loads(data.get("result", ""))
            except json.JSONDecodeError as e:
                raise AgentError(f"auditor retornou saída não estruturada: {e}") from e
        return AuditReport.model_validate(payload), _usage(data)
