"""Prompts enviados aos agentes. Gerados a partir das mensagens estruturadas,
nunca copiados manualmente."""
from __future__ import annotations

import json

from backend.communication.schemas import AuditRequest, ImplementationRequest


def implementation_prompt(req: ImplementationRequest) -> str:
    criteria = "\n".join(f"- {c}" for c in req.acceptance_criteria)
    parts = [
        "Você é o AGENTE DESENVOLVEDOR do IA CORE. Trabalhe SOMENTE no diretório atual.",
        "Regras: não use git (o orquestrador faz os commits), não faça push, não acesse a rede,",
        "não apague arquivos fora do escopo da tarefa, não altere testes de aceitação existentes",
        "para fazê-los passar artificialmente.",
        "",
        f"## Objetivo\n{req.objective}",
        f"## Critérios de aceitação\n{criteria}",
        f"## Ciclo\n{req.cycle}",
    ]
    if req.previous_audit is not None:
        parts += [
            "## A auditoria independente REPROVOU a entrega anterior. Corrija todos os itens:",
            "```json",
            req.previous_audit.model_dump_json(indent=2),
            "```",
        ]
    if req.previous_tests is not None and not req.previous_tests.passed:
        parts += ["## Saída dos testes que falharam", "```", req.previous_tests.output_tail[-3000:], "```"]
    parts += ["", "Ao final, responda com um resumo curto do que foi alterado."]
    return "\n".join(parts)


def audit_prompt(req: AuditRequest) -> str:
    criteria = "\n".join(f"- {c}" for c in req.acceptance_criteria)
    return "\n".join([
        "Você é o AUDITOR INDEPENDENTE do IA CORE. Você NÃO pode modificar nenhum arquivo,",
        "nem executar comandos que alterem o repositório. Apenas leia e avalie.",
        "Avalie se a implementação atende ao objetivo e a TODOS os critérios de aceitação.",
        "Reprove se houver qualquer bug, critério não atendido, teste falhando, ou se os",
        "testes tiverem sido enfraquecidos. Seja objetivo e cite arquivos.",
        "",
        f"## Objetivo\n{req.objective}",
        f"## Critérios de aceitação\n{criteria}",
        f"## Ciclo de auditoria\n{req.cycle}",
        "## Resultado dos testes (executados pelo orquestrador)",
        "```json",
        json.dumps(req.tests.model_dump(), ensure_ascii=False, indent=2),
        "```",
        "## Diff desde a base",
        "```diff",
        req.diff,
        "```",
        "",
        "Responda SOMENTE com JSON no formato do schema: verdict ('approved'|'rejected'),",
        "summary, criteria[{criterion, met, evidence}], issues[{severity, file, description,",
        "suggested_fix}]. Se aprovado, issues deve ser [].",
    ])
