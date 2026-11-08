"""Testes de contrato dos adaptadores reais usando CLIs falsos (`claude` e
`codex`) que registram os argumentos recebidos. Valida a linha de comando
gerada (sandbox somente leitura, sem bypass, schema JSON) e o ciclo completo
pelos adaptadores reais, sem consumir cota das assinaturas."""
import json
import sys
from pathlib import Path

import pytest

from backend.agents.claude_code import ClaudeCodeAuditor, ClaudeCodeImplementer
from backend.agents.codex import CodexAuditor
from backend.communication.schemas import audit_json_schema
from conftest import TEST_CMD, make_core

FAKE_CLAUDE = r'''#!{py}
import json, sys, os, pathlib
log = pathlib.Path(os.environ["FAKE_LOG"])
args = sys.argv[1:]
with log.open("a") as f: f.write(json.dumps(["claude"] + args) + "\n")
if args[:1] == ["--version"]: print("9.9.9 (Claude Code)"); sys.exit(0)
if args[:2] == ["auth", "status"]: print(json.dumps({{"loggedIn": True, "authMethod": "claude.ai"}})); sys.exit(0)
prompt = sys.stdin.read()
if "REPROVOU" in prompt:
    pathlib.Path("calc.py").write_text("def add(a, b):\n    return a + b\n")
else:
    pathlib.Path("calc.py").write_text("def add(a, b):\n    return a - b\n")
print(json.dumps({{"type": "result", "is_error": False, "result": "feito", "session_id": "s1",
                  "total_cost_usd": 0.01, "usage": {{"input_tokens": 10, "output_tokens": 5}}}}))
'''

FAKE_CODEX = r'''#!{py}
import json, sys, os, pathlib
log = pathlib.Path(os.environ["FAKE_LOG"])
args = sys.argv[1:]
with log.open("a") as f: f.write(json.dumps(["codex"] + args) + "\n")
if args[:1] == ["--version"]: print("codex-cli 0.0.0"); sys.exit(0)
if args[:2] == ["login", "status"]: print("Logged in using ChatGPT"); sys.exit(0)
prompt = sys.stdin.read()
out = args[args.index("-o") + 1]
bad = "return a - b" in prompt
report = {{"verdict": "rejected" if bad else "approved", "summary": "sub em vez de soma" if bad else "ok",
          "criteria": [{{"criterion": "soma", "met": not bad, "evidence": "diff"}}],
          "issues": [{{"severity": "blocker", "file": "calc.py", "description": "usa subtração",
                      "suggested_fix": "usar a + b"}}] if bad else []}}
pathlib.Path(out).write_text(json.dumps(report))
print(json.dumps({{"type": "turn.completed", "usage": {{"input_tokens": 100, "output_tokens": 20}}}}))
'''


@pytest.fixture
def fake_bin(tmp_path, monkeypatch):
    b = tmp_path / "bin"
    b.mkdir()
    for name, src in [("claude", FAKE_CLAUDE), ("codex", FAKE_CODEX)]:
        p = b / name
        p.write_text(src.format(py=sys.executable))
        p.chmod(0o755)
    log = tmp_path / "calls.jsonl"
    monkeypatch.setenv("FAKE_LOG", str(log))
    monkeypatch.setenv("PATH", f"{b}:{__import__('os').environ['PATH']}")
    return b, log


def _calls(log: Path):
    return [json.loads(l) for l in log.read_text().splitlines()]


def test_full_cycle_through_real_adapters(settings, workspace, fake_bin):
    b, log = fake_bin
    core = make_core(settings, ClaudeCodeImplementer(binary=str(b / "claude")),
                     CodexAuditor(binary=str(b / "codex")))
    statuses = {s.name: s for s in core.registry.probe_all(core.orchestrator.runner, workspace)}
    assert statuses["claude-code"].authenticated and statuses["codex"].authenticated
    tid = core.orchestrator.create_task(title="soma", objective="add soma", acceptance_criteria=["soma"],
                                        workspace=str(workspace), test_command=TEST_CMD)
    run = core.db.get_run(core.orchestrator.start(tid))
    assert run["outcome"] == "approved" and run["cycle"] == 2

    calls = _calls(log)
    codex_exec = [c for c in calls if c[:2] == ["codex", "exec"]]
    claude_p = [c for c in calls if c[0] == "claude" and "-p" in c]
    assert len(codex_exec) == 2 and len(claude_p) == 2
    for c in codex_exec:
        assert c[c.index("--sandbox") + 1] == "read-only"
        assert 'approval_policy="never"' in c and "--output-schema" in c
        assert not any("danger" in a for a in c)
    for c in claude_p:
        assert c[c.index("--permission-mode") + 1] == "acceptEdits"
        assert "bypassPermissions" not in c
    usage = {u["agent"]: u for u in core.db.usage_summary()}
    assert usage["codex"]["input_tokens"] == 200


def test_claude_auditor_is_read_only(settings, workspace, fake_bin):
    b, log = fake_bin
    aud = ClaudeCodeAuditor(binary=str(b / "claude"))
    # só verificamos a linha de comando gerada
    from backend.agents import claude_code
    assert claude_code.AUDITOR_TOOLS == "Read,Glob,Grep"
    assert "Edit" not in claude_code.AUDITOR_TOOLS and "Bash" not in claude_code.AUDITOR_TOOLS
    assert aud.read_only


def test_codex_not_logged_in(settings, workspace, tmp_path, monkeypatch):
    b = tmp_path / "bin2"
    b.mkdir()
    p = b / "codex"
    p.write_text(f"#!{sys.executable}\nimport sys\nprint('Not logged in')\nsys.exit(1)\n")
    p.chmod(0o755)
    core = make_core(settings, CodexAuditor(binary=str(p)))
    st = core.registry.probe_all(core.orchestrator.runner, workspace)[0]
    assert st.installed and not st.authenticated


def test_audit_schema_is_strict():
    s = audit_json_schema()

    def walk(n):
        if isinstance(n, dict):
            if n.get("type") == "object":
                assert n["additionalProperties"] is False
                assert set(n["required"]) == set(n["properties"])
            assert "$ref" not in n
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)
    walk(s)
    assert s["properties"]["verdict"]["enum"] == ["approved", "rejected"]
