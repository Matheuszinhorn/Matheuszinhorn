import time

from fastapi.testclient import TestClient

from backend.agents.fake import DiffAndTestsAuditor, ScriptedImplementer
from backend.api.main import create_app
from conftest import TEST_CMD, make_core, write_buggy, write_fixed


def test_api_full_flow(settings, workspace):
    core = make_core(settings, ScriptedImplementer([write_buggy, write_fixed]), DiffAndTestsAuditor())
    client = TestClient(create_app(core))
    assert client.get("/health").json() == {"ok": True}
    r = client.post("/tasks", json={
        "title": "soma", "objective": "add", "acceptance_criteria": ["soma"],
        "workspace": str(workspace), "test_command": TEST_CMD,
        "implementer": "fake-implementer", "auditor": "fake-auditor"})
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    run = client.post(f"/tasks/{tid}/runs").json()
    for _ in range(100):
        state = client.get(f"/runs/{run['id']}").json()
        if state["status"] not in ("pending", "running"):
            break
        time.sleep(0.2)
    assert state["outcome"] == "approved"
    assert len(client.get(f"/runs/{run['id']}/messages").json()) >= 8
    assert client.get(f"/runs/{run['id']}/commands").json()
    assert client.post(f"/runs/{run['id']}/cancel").status_code == 409


def test_api_rejects_workspace_outside_root(settings, tmp_path):
    core = make_core(settings, ScriptedImplementer([write_buggy]), DiffAndTestsAuditor())
    client = TestClient(create_app(core))
    r = client.post("/tasks", json={"title": "x", "objective": "x", "acceptance_criteria": ["x"],
                                    "workspace": str(tmp_path), "implementer": "fake-implementer",
                                    "auditor": "fake-auditor"})
    assert r.status_code == 400
