"""Protocolo estruturado entre orquestrador e agentes.

Fluxo de mensagens de um ciclo:
  orchestrator → implementer : ImplementationRequest
  implementer  → orchestrator: ImplementationReport
  orchestrator → auditor     : AuditRequest (objetivo, critérios, diff, testes)
  auditor      → orchestrator: AuditReport  (JSON validado por schema)
  orchestrator → implementer : ImplementationRequest com o AuditReport anterior
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TestResult(BaseModel):
    command: list[str]
    exit_code: int | None
    passed: bool
    timed_out: bool = False
    output_tail: str = ""


class AuditIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")
    severity: Literal["blocker", "major", "minor"]
    file: str
    description: str
    suggested_fix: str


class CriterionCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    criterion: str
    met: bool
    evidence: str


class AuditReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verdict: Literal["approved", "rejected"]
    summary: str
    criteria: list[CriterionCheck]
    issues: list[AuditIssue]


class ImplementationRequest(BaseModel):
    task_id: str
    cycle: int
    objective: str
    acceptance_criteria: list[str]
    previous_audit: AuditReport | None = None
    previous_tests: TestResult | None = None


class ImplementationReport(BaseModel):
    agent: str
    success: bool
    summary: str
    session_id: str | None = None
    raw_error: str | None = None


class AuditRequest(BaseModel):
    task_id: str
    cycle: int
    objective: str
    acceptance_criteria: list[str]
    diff: str
    tests: TestResult


class AgentUsage(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    reported_cost_usd: float | None = None


def audit_json_schema() -> dict:
    """JSON Schema estrito (additionalProperties=false, todos required) aceito
    por `codex exec --output-schema` e `claude -p --json-schema`."""
    def strict(schema: dict) -> dict:
        if schema.get("type") == "object":
            schema["additionalProperties"] = False
            schema["required"] = list(schema.get("properties", {}).keys())
            for v in schema.get("properties", {}).values():
                strict(v)
        if schema.get("type") == "array" and "items" in schema:
            strict(schema["items"])
        for v in schema.get("$defs", {}).values():
            strict(v)
        schema.pop("title", None)
        return schema

    s = AuditReport.model_json_schema()
    # Inline $defs para compatibilidade máxima.
    defs = s.pop("$defs", {})

    def inline(node):
        if isinstance(node, dict):
            if "$ref" in node:
                name = node["$ref"].split("/")[-1]
                return inline(dict(defs[name]))
            return {k: inline(v) for k, v in node.items()}
        if isinstance(node, list):
            return [inline(x) for x in node]
        return node

    return strict(inline(s))
