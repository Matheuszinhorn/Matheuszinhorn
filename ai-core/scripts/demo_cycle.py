#!/usr/bin/env python3
"""Demonstração ponta a ponta com agentes REAIS.

1. Cria (ou recria) o projeto de teste workspaces/demo-leap.
2. Ciclo 1: injeta uma implementação PROPOSITALMENTE INCORRETA (passa nos
   testes existentes, mas viola um critério de aceitação) — simula uma entrega
   defeituosa para provar que o auditor reprova.
3. Ciclos seguintes: Claude Code real corrige com base no relatório.
4. Auditor real (Codex por padrão; `--auditor claude-auditor` como fallback).

Uso:
  python scripts/demo_cycle.py                       # Claude + Codex
  python scripts/demo_cycle.py --auditor claude-auditor
  python scripts/demo_cycle.py --no-seed-bug          # Claude implementa desde o ciclo 1
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.agents.base import Implementer  # noqa: E402
from backend.app import build_core  # noqa: E402

TESTS = '''from leap import is_leap_year


def test_basic_leap():
    assert is_leap_year(2024) is True


def test_basic_common():
    assert is_leap_year(2023) is False
'''

WRONG = '''def is_leap_year(year: int) -> bool:
    """Implementação incompleta: ignora a regra dos séculos."""
    return year % 4 == 0
'''

CRITERIA = [
    "is_leap_year(year) retorna True para anos divisíveis por 4, exceto séculos",
    "Séculos só são bissextos se divisíveis por 400: 1900 e 2100 -> False; 2000 e 2400 -> True",
    "Entradas não inteiras (ex.: '2024', 2024.0, True) levantam TypeError",
    "Existem testes automatizados cobrindo os casos de século e de TypeError, e todos passam",
]


class SeededFaultImplementer(Implementer):
    """Ciclo 1 = entrega defeituosa conhecida; depois delega ao agente real."""

    def __init__(self, real: Implementer):
        self.real = real
        self.name = real.name
        self.kind = real.kind

    def probe(self, runner, cwd):
        return self.real.probe(runner, cwd)

    def implement(self, req, ctx):
        if req.cycle == 1:
            from backend.communication.schemas import AgentUsage, ImplementationReport
            (ctx.workspace / "leap.py").write_text(WRONG, encoding="utf-8")
            return ImplementationReport(agent=self.name, success=True,
                                        summary="[DEMO] implementação propositalmente incorreta injetada"), AgentUsage()
        return self.real.implement(req, ctx)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--auditor", default="codex")
    ap.add_argument("--no-seed-bug", action="store_true")
    ap.add_argument("--max-cycles", type=int, default=5)
    a = ap.parse_args()

    core = build_core()
    statuses = {s.name: s for s in core.orchestrator.probe_agents()}
    for s in statuses.values():
        print(f"[probe] {s.name:15} role={s.role:11} instalado={s.installed} autenticado={s.authenticated} {s.detail}")
    for needed in ("claude-code", a.auditor):
        if not statuses[needed].authenticated:
            print(f"\n[ERRO] agente '{needed}' não está pronto: {statuses[needed].detail}")
            return 2

    if not a.no_seed_bug:
        core.registry.register(SeededFaultImplementer(core.registry.implementer("claude-code")))

    ws = core.settings.workspaces_root / "demo-leap"
    if ws.exists():
        shutil.rmtree(ws)
    ws.mkdir(parents=True)
    (ws / "test_leap.py").write_text(TESTS, encoding="utf-8")
    (ws / "leap.py").write_text("def is_leap_year(year):\n    raise NotImplementedError\n", encoding="utf-8")

    tid = core.orchestrator.create_task(
        title="is_leap_year", objective="Implementar leap.is_leap_year(year) segundo o calendário gregoriano.",
        acceptance_criteria=CRITERIA, workspace=str(ws),
        test_command=[sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider"],
        implementer="claude-code", auditor=a.auditor, max_cycles=a.max_cycles)
    print(f"\n[task] {tid} workspace={ws}")
    run_id = core.orchestrator.start(tid)
    run = core.db.get_run(run_id)
    print(f"\n[run] {run_id} status={run['status']} outcome={run['outcome']} ciclos={run['cycle']} branch={run['branch']}")
    for d in core.db.list_decisions(run_id):
        print(f"  ciclo {d['cycle']}: {d['decision']:18} {d['reason'][:160]}")
    for m in core.db.list_messages(run_id):
        if m["kind"] == "audit_report":
            p = m["payload"]
            print(f"\n[auditoria ciclo {m['cycle']}] verdict={p['verdict']}: {p['summary'][:300]}")
            for i in p["issues"]:
                print(f"   - [{i['severity']}] {i['file']}: {i['description'][:200]}")
    print("\n[uso]", json.dumps(core.db.usage_summary(), ensure_ascii=False))
    return 0 if run["outcome"] == "approved" else 1


if __name__ == "__main__":
    sys.exit(main())
