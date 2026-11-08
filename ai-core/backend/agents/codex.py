"""Adaptador do OpenAI Codex CLI (`codex exec`, modo não interativo).

Autenticação oficial com assinatura ChatGPT: `codex login` (navegador) ou
`codex login --device-auth` (máquinas sem navegador). As credenciais ficam em
~/.codex/auth.json, fora do repositório. O IA CORE apenas consulta
`codex login status`. OPENAI_API_KEY / CODEX_API_KEY são removidas do
ambiente do processo filho para não cair em cobrança por API.

Garantias de auditoria somente leitura:
  1. `--sandbox read-only` (sandbox do próprio Codex);
  2. `approval_policy="never"` (nenhuma escalada de permissão);
  3. o orquestrador compara HEAD + `git status` antes/depois e, se algo mudar,
     descarta as alterações e invalida a auditoria.
A saída final é forçada para JSON via `--output-schema`.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from backend.agents.base import (AgentContext, AgentError, AgentStatus, Auditor,
                                 QuotaExceeded, looks_like_quota_error)
from backend.communication.schemas import (AgentUsage, AuditReport, AuditRequest,
                                           audit_json_schema)
from backend.execution.runner import CommandRunner
from backend.orchestrator.prompts import audit_prompt


class CodexAuditor(Auditor):
    kind = "codex"

    def __init__(self, binary: str = "codex", model: str | None = None, name: str = "codex"):
        self.binary = binary
        self.model = model
        self.name = name

    def probe(self, runner: CommandRunner, cwd: Path) -> AgentStatus:
        if not shutil.which(self.binary):
            return AgentStatus(self.name, self.role, self.kind, False, None, False,
                               "Codex CLI não encontrado. Instale: npm install -g @openai/codex")
        ver = runner.run([self.binary, "--version"], cwd=cwd, actor=f"probe:{self.name}", timeout_s=30)
        st = runner.run([self.binary, "login", "status"], cwd=cwd, actor=f"probe:{self.name}",
                        timeout_s=30)
        text = (st.stdout + st.stderr).strip()
        logged = st.ok and "not logged in" not in text.lower()
        # Só a primeira linha (ex.: "Logged in using ChatGPT"); nunca o token.
        detail = text.splitlines()[0] if (logged and text) else \
            "não autenticado: rode `codex login --device-auth` com sua conta ChatGPT"
        return AgentStatus(self.name, self.role, self.kind, True,
                           ver.stdout.strip() or None, logged, detail)

    def audit(self, req: AuditRequest, ctx: AgentContext):
        ctx.scratch_dir.mkdir(parents=True, exist_ok=True)
        schema_file = ctx.scratch_dir / f"audit_schema_c{req.cycle}.json"
        out_file = ctx.scratch_dir / f"audit_out_c{req.cycle}.json"
        schema_file.write_text(json.dumps(audit_json_schema()), encoding="utf-8")
        out_file.unlink(missing_ok=True)
        argv = [self.binary, "exec",
                "--sandbox", "read-only",
                "-c", 'approval_policy="never"',
                "--skip-git-repo-check", "--ephemeral", "--color", "never", "--json",
                "--output-schema", str(schema_file),
                "-o", str(out_file),
                "-C", str(ctx.workspace)]
        if self.model:
            argv += ["-m", self.model]
        argv.append("-")  # prompt via stdin
        res = ctx.runner.run(argv, cwd=ctx.workspace, actor=f"agent:{self.name}", run_id=ctx.run_id,
                             timeout_s=ctx.timeout_s, stdin=audit_prompt(req),
                             cancel_check=ctx.cancel_check)
        if res.timed_out:
            raise AgentError(f"codex: timeout após {ctx.timeout_s}s")
        if not res.ok or not out_file.exists():
            msg = (res.stderr or res.stdout)[-800:]
            if looks_like_quota_error(msg):
                raise QuotaExceeded(f"codex: limite do plano atingido: {msg[-300:]}")
            raise AgentError(f"codex exec falhou (exit={res.exit_code}): {msg}")
        try:
            report = AuditReport.model_validate_json(out_file.read_text(encoding="utf-8"))
        except Exception as e:
            raise AgentError(f"codex retornou JSON inválido: {e}") from e
        return report, self._usage(res.stdout)

    @staticmethod
    def _usage(jsonl: str) -> AgentUsage:
        inp = out = 0
        found = False
        for line in jsonl.splitlines():
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            u = ev.get("usage") if isinstance(ev, dict) else None
            if isinstance(u, dict):
                found = True
                inp += int(u.get("input_tokens") or 0)
                out += int(u.get("output_tokens") or 0)
        return AgentUsage(input_tokens=inp if found else None, output_tokens=out if found else None)
