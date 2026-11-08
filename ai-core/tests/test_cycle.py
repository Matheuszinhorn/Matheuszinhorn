import subprocess

from backend.agents.fake import DiffAndTestsAuditor, ScriptedImplementer
from backend.app import build_core
from backend.memory.db import Database
from conftest import TEST_CMD, make_core, write_buggy, write_fixed


def _task(core, ws, **kw):
    return core.orchestrator.create_task(
        title="soma", objective="Implementar add(a, b) que retorna a soma",
        acceptance_criteria=["add(2,3)==5", "testes passam"], workspace=str(ws),
        test_command=TEST_CMD, implementer=kw.pop("implementer", "fake-implementer"),
        auditor=kw.pop("auditor", "fake-auditor"), **kw)


def test_reject_then_fix_then_approve(settings, workspace):
    impl = ScriptedImplementer([write_buggy, write_fixed])
    aud = DiffAndTestsAuditor()
    core = make_core(settings, impl, aud)
    run_id = core.orchestrator.start(_task(core, workspace))
    run = core.db.get_run(run_id)
    assert run["status"] == "completed" and run["outcome"] == "approved"
    assert run["cycle"] == 2
    decisions = [d["decision"] for d in core.db.list_decisions(run_id)]
    assert decisions == ["start", "commit", "rejected", "commit", "approved"]
    # O auditor recebeu objetivo, critérios, diff e resultado de testes
    first = aud.requests[0]
    assert "a - b" in first.diff and first.tests.passed is False
    assert aud.requests[1].tests.passed is True
    # O implementador recebeu o relatório estruturado da reprovação
    assert impl.requests[1].previous_audit.verdict == "rejected"
    # Git: branch isolada, base intocada
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=workspace,
                            capture_output=True, text=True).stdout.strip()
    assert branch == run["branch"] and branch.startswith("aicore/")
    base_calc = subprocess.run(["git", "show", f"{run['base_commit']}:calc.py"], cwd=workspace,
                               capture_output=True, text=True).stdout
    assert "NotImplementedError" in base_calc
    kinds = [m["kind"] for m in core.db.list_messages(run_id)]
    assert kinds.count("audit_report") == 2 and kinds.count("implementation_request") == 2


def test_max_five_cycles(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    tid = _task(core, workspace, max_cycles=50)
    assert core.db.get_task(tid)["max_cycles"] == 5
    run = core.db.get_run(core.orchestrator.start(tid))
    assert run["outcome"] == "max_cycles_reached" and run["cycle"] == 5


def test_history_persists_after_restart(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy, write_fixed]), DiffAndTestsAuditor())
    run_id = core.orchestrator.start(_task(core, workspace))
    del core
    db2 = Database(settings.db_path)  # "reinício": nova conexão, novo objeto
    assert db2.get_run(run_id)["outcome"] == "approved"
    assert len(db2.list_messages(run_id)) >= 8
    assert any(d["decision"] == "approved" for d in db2.list_decisions(run_id))
    assert len(db2.list_commands(run_id)) > 0


def test_interrupted_run_is_marked_on_startup(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    tid = _task(core, workspace)
    rid = core.db.create_run(tid)
    core.db.update_run(rid, status="running")
    with core.db.conn() as c:
        c.execute("UPDATE runs SET owner_pid=999999999 WHERE id=?", (rid,))
    core2 = build_core(settings, core.registry)
    assert core2.db.get_run(rid)["status"] == "interrupted"


def test_auditor_cannot_modify_code(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor(tamper=True))
    run = core.db.get_run(core.orchestrator.start(_task(core, workspace)))
    assert run["outcome"] == "auditor_violation"
    assert not (workspace / "tampered_by_auditor.txt").exists()


def test_approval_requires_passing_tests(settings, workspace):
    class YesMan(DiffAndTestsAuditor):
        def audit(self, req, ctx):
            r, u = super().audit(req, ctx)
            return r.model_copy(update={"verdict": "approved", "issues": []}), u

    core = make_core(settings, ScriptedImplementer([write_buggy, write_fixed]), YesMan(name="yes"))
    run_id = core.orchestrator.start(_task(core, workspace, auditor="yes"))
    decisions = [d["decision"] for d in core.db.list_decisions(run_id)]
    assert "override_rejected" in decisions
    assert core.db.get_run(run_id)["outcome"] == "approved"


def test_agent_failure_is_retried_then_recorded(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy], fail_on={1}), DiffAndTestsAuditor())
    run_id = core.orchestrator.start(_task(core, workspace))
    run = core.db.get_run(run_id)
    assert run["status"] == "failed" and run["outcome"] == "agent_error"
    assert [d["decision"] for d in core.db.list_decisions(run_id)].count("retry") == 1


def test_daily_quota(settings, workspace):
    settings.daily_calls = {"fake-implementer": 0, "default": 100}
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    run = core.db.get_run(core.orchestrator.start(_task(core, workspace)))
    assert run["outcome"] == "quota_exceeded"


def test_cancel_before_start(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    tid = _task(core, workspace)
    rid = core.db.create_run(tid)
    assert core.orchestrator.cancel(rid)
    core.orchestrator.execute(rid)
    assert core.db.get_run(rid)["status"] == "cancelled"


def test_dirty_workspace_is_refused(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    tid = _task(core, workspace)
    core.orchestrator.start(tid)  # cria repositório
    (workspace / "extra.txt").write_text("sujo")
    run = core.db.get_run(core.orchestrator.start(tid))
    assert run["outcome"] == "security_violation"
