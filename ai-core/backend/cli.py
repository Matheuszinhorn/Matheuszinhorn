"""CLI do IA CORE.

  python -m backend.cli probe
  python -m backend.cli task create --title T --objective O --criterion C1 --criterion C2 \
        --workspace workspaces/proj [--auditor codex|claude-auditor] [--test "python -m pytest -q"]
  python -m backend.cli run <task_id>          # executa em primeiro plano
  python -m backend.cli show <run_id>          # estado, decisões e mensagens
  python -m backend.cli cancel <run_id>
  python -m backend.cli history                # tarefas e execuções persistidas
"""
from __future__ import annotations

import argparse
import json
import shlex
import sys

from backend.app import build_core


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="aicore")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("probe")
    t = sub.add_parser("task").add_subparsers(dest="tcmd", required=True).add_parser("create")
    t.add_argument("--title", required=True)
    t.add_argument("--objective", required=True)
    t.add_argument("--criterion", action="append", required=True)
    t.add_argument("--workspace", required=True)
    t.add_argument("--test", default="python -m pytest -q")
    t.add_argument("--implementer", default="claude-code")
    t.add_argument("--auditor", default="codex")
    t.add_argument("--max-cycles", type=int, default=5)
    r = sub.add_parser("run"); r.add_argument("task_id")
    s = sub.add_parser("show"); s.add_argument("run_id"); s.add_argument("--messages", action="store_true")
    c = sub.add_parser("cancel"); c.add_argument("run_id")
    sub.add_parser("history")
    a = p.parse_args(argv)

    core = build_core()
    out = lambda o: print(json.dumps(o, ensure_ascii=False, indent=2, default=str))  # noqa: E731

    if a.cmd == "probe":
        out([s.__dict__ for s in core.orchestrator.probe_agents()])
    elif a.cmd == "task":
        tid = core.orchestrator.create_task(
            title=a.title, objective=a.objective, acceptance_criteria=a.criterion,
            workspace=a.workspace, test_command=shlex.split(a.test), implementer=a.implementer,
            auditor=a.auditor, max_cycles=a.max_cycles)
        out(core.db.get_task(tid))
    elif a.cmd == "run":
        run_id = core.orchestrator.start(a.task_id)
        out({**core.db.get_run(run_id), "decisions": core.db.list_decisions(run_id)})
    elif a.cmd == "show":
        data = {**(core.db.get_run(a.run_id) or {}), "decisions": core.db.list_decisions(a.run_id)}
        if a.messages:
            data["messages"] = core.db.list_messages(a.run_id)
        out(data)
    elif a.cmd == "cancel":
        out({"cancel_requested": core.orchestrator.cancel(a.run_id)})
    elif a.cmd == "history":
        out({"tasks": core.db.list_tasks(), "runs": core.db.list_runs(), "usage": core.db.usage_summary()})
    return 0


if __name__ == "__main__":
    sys.exit(main())
