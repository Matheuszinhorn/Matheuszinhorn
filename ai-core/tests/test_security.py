import os
import sys
import threading
import time

import pytest

from backend.execution.runner import CancelledError, CommandRunner
from backend.memory.db import Database
from backend.security.policy import SecurityPolicy, SecurityViolation, redact


@pytest.fixture
def policy(settings):
    return SecurityPolicy(settings.workspaces_root, settings.scrubbed_env)


@pytest.fixture
def runner(settings, policy):
    return CommandRunner(Database(settings.db_path), policy)


def test_paths_outside_root_rejected(policy, workspace, tmp_path):
    policy.check_path(workspace)
    for bad in [tmp_path, workspace / ".." / "..", "/etc", policy.root]:
        with pytest.raises(SecurityViolation):
            policy.check_path(bad)


def test_symlink_escape_rejected(policy, workspace, tmp_path):
    link = workspace / "escape"
    link.symlink_to(tmp_path)
    with pytest.raises(SecurityViolation):
        policy.check_path(link)


@pytest.mark.parametrize("argv", [
    ["git", "push", "origin", "main"],
    ["git", "remote", "add", "x", "y"],
    ["git", "config", "user.email", "x"],
    ["git", "branch", "-D", "aicore/x"],
    ["git", "clean", "-fdx"],
    ["git", "commit", "main"],
    ["bash", "-c", "rm -rf /"],
    ["rm", "-rf", "."],
    ["curl", "https://example.com"],
    ["claude", "-p", "--dangerously-skip-permissions"],
    ["claude", "-p", "--permission-mode", "bypassPermissions"],
    ["codex", "exec", "--sandbox", "danger-full-access"],
    ["codex", "exec", "--dangerously-bypass-approvals-and-sandbox"],
])
def test_forbidden_commands(policy, workspace, argv):
    with pytest.raises(SecurityViolation):
        policy.check_command(argv, workspace)


@pytest.mark.parametrize("cmd", [
    ["python", "deploy.py"], ["python", "-c", "import os; os.system('vercel --prod')"],
    ["bash", "test.sh"], ["python", "-m", "twine", "upload"],
])
def test_forbidden_test_commands(policy, cmd):
    with pytest.raises(SecurityViolation):
        policy.check_test_command(cmd)


def test_protected_branch_names(policy):
    for b in ["main", "master", "feature/x", "production"]:
        with pytest.raises(SecurityViolation):
            policy.check_branch_name(b)
    policy.check_branch_name("aicore/task-1-abc")


def test_api_keys_removed_from_child_env(runner, workspace, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-should-not-leak-000000000000000000")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-should-not-leak-0000000000")
    res = runner.run([sys.executable, "-c",
                      "import os;print(os.environ.get('OPENAI_API_KEY'), os.environ.get('ANTHROPIC_API_KEY'))"],
                     cwd=workspace, actor="test")
    assert res.stdout.strip() == "None None"


def test_redaction():
    s = redact("token=abcdefghijklmnop sk-ant-api03-AAAAAAAAAAAAAAAA ghp_" + "a" * 30)
    assert "abcdefghijklmnop" not in s and "AAAAAAAA" not in s and "aaaaaaaaaa" not in s


def test_timeout_kills_process(runner, workspace):
    t0 = time.monotonic()
    res = runner.run([sys.executable, "-c", "import time; time.sleep(30)"], cwd=workspace,
                     actor="test", timeout_s=2)
    assert res.timed_out and time.monotonic() - t0 < 10


def test_cancel_kills_running_process(runner, workspace):
    flag = threading.Event()
    threading.Timer(1.5, flag.set).start()
    t0 = time.monotonic()
    with pytest.raises(CancelledError):
        runner.run([sys.executable, "-c", "import time; time.sleep(30)"], cwd=workspace,
                   actor="test", timeout_s=60, cancel_check=flag.is_set)
    assert time.monotonic() - t0 < 10


def test_commands_are_logged_without_env(runner, workspace, settings):
    runner.run([sys.executable, "-c", "print('ola')"], cwd=workspace, actor="test", run_id="r1")
    rows = Database(settings.db_path).list_commands("r1")
    assert rows and rows[0]["stdout_tail"].strip() == "ola"
    assert "env" not in rows[0]
