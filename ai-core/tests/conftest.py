from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.agents.registry import AgentRegistry  # noqa: E402
from backend.app import build_core  # noqa: E402
from backend.config import Settings  # noqa: E402
from backend.memory.db import Database  # noqa: E402

CALC_TEST = '''from calc import add

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
'''

BUGGY = "def add(a, b):\n    return a - b  # BUG proposital\n"
FIXED = "def add(a, b):\n    return a + b\n"


def write_buggy(ws: Path, req) -> str:
    (ws / "calc.py").write_text(BUGGY)
    return "implementado (com bug proposital)"


def write_fixed(ws: Path, req) -> str:
    assert req.previous_audit is not None, "a correção deve receber o relatório do auditor"
    (ws / "calc.py").write_text(FIXED)
    return "corrigido"


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(workspaces_root=tmp_path / "workspaces", db_path=tmp_path / "data" / "aicore.db",
                    max_audit_cycles=5, agent_timeout_s=60, test_timeout_s=60, task_timeout_s=600,
                    daily_calls={"default": 100})


@pytest.fixture
def workspace(settings) -> Path:
    ws = settings.workspaces_root / "calc-project"
    ws.mkdir(parents=True)
    (ws / "test_calc.py").write_text(CALC_TEST)
    (ws / "calc.py").write_text("def add(a, b):\n    raise NotImplementedError\n")
    return ws


def make_core(settings, *agents):
    db = Database(settings.db_path)
    reg = AgentRegistry(db)
    for a in agents:
        reg.register(a)
    return build_core(settings, reg)


TEST_CMD = [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider"]
