"""API HTTP (FastAPI) do IA CORE.

Executar: uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
Escuta só em localhost por padrão: não há autenticação nesta versão.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from backend.app import Core, build_core
from backend.security.policy import SecurityViolation


class TaskIn(BaseModel):
    title: str
    objective: str
    acceptance_criteria: list[str] = Field(min_length=1)
    workspace: str
    test_command: list[str] = ["python", "-m", "pytest", "-q"]
    implementer: str = "claude-code"
    auditor: str = "codex"
    max_cycles: int = Field(default=5, ge=1, le=5)


def create_app(core: Core | None = None) -> FastAPI:
    core = core or build_core()
    app = FastAPI(title="IA CORE", version="0.1.0")
    app.state.core = core

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/agents")
    def agents():
        return core.db.list_agents()

    @app.post("/agents/probe")
    def probe_agents():
        sts = core.orchestrator.probe_agents()
        return [s.__dict__ for s in sts]

    @app.post("/tasks", status_code=201)
    def create_task(body: TaskIn):
        try:
            tid = core.orchestrator.create_task(**body.model_dump())
        except (SecurityViolation, KeyError, TypeError) as e:
            raise HTTPException(400, str(e))
        return core.db.get_task(tid)

    @app.get("/tasks")
    def list_tasks():
        return core.db.list_tasks()

    @app.post("/tasks/{task_id}/runs", status_code=202)
    def start_run(task_id: str):
        try:
            run_id = core.orchestrator.start(task_id, background=True)
        except KeyError:
            raise HTTPException(404, "tarefa não encontrada")
        return core.db.get_run(run_id)

    @app.get("/runs")
    def list_runs(task_id: str | None = None):
        return core.db.list_runs(task_id)

    @app.get("/runs/{run_id}")
    def get_run(run_id: str):
        run = core.db.get_run(run_id)
        if not run:
            raise HTTPException(404, "execução não encontrada")
        return {**run, "decisions": core.db.list_decisions(run_id)}

    @app.get("/runs/{run_id}/messages")
    def messages(run_id: str):
        return core.db.list_messages(run_id)

    @app.get("/runs/{run_id}/commands")
    def commands(run_id: str):
        return core.db.list_commands(run_id)

    @app.post("/runs/{run_id}/cancel")
    def cancel(run_id: str):
        if not core.orchestrator.cancel(run_id):
            raise HTTPException(409, "execução não está ativa")
        return {"cancel_requested": True}

    @app.get("/usage")
    def usage():
        return core.db.usage_summary()

    return app


def __getattr__(name: str):  # app criado sob demanda (uvicorn backend.api.main:app)
    if name == "app":
        global app
        app = create_app()
        return app
    raise AttributeError(name)
