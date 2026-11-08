"""Montagem dos componentes (usado pela API, CLI e scripts)."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from backend.agents.registry import AgentRegistry, default_registry
from backend.config import Settings
from backend.memory.db import Database
from backend.orchestrator.cycle import Orchestrator


@dataclass
class Core:
    settings: Settings
    db: Database
    registry: AgentRegistry
    orchestrator: Orchestrator


def build_core(settings: Settings | None = None, registry: AgentRegistry | None = None) -> Core:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = settings or Settings.from_env()
    db = Database(settings.db_path)
    interrupted = db.mark_interrupted_runs()
    if interrupted:
        logging.getLogger("aicore").warning("%d execução(ões) marcadas como interrompidas", interrupted)
    registry = registry or default_registry(db, settings)
    return Core(settings, db, registry, Orchestrator(db, settings, registry))
