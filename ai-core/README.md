# IA CORE

Plataforma pessoal de orquestração multiagente: **Claude Code** desenvolve,
**OpenAI Codex** audita de forma independente (somente leitura), um
orquestrador **Python** conduz o ciclo e o **Git** registra cada entrega em
branch isolada — sem copiar e colar entre as etapas.

```
tarefa → Claude implementa → commit (branch aicore/…) → testes (orquestrador)
      → Codex audita (objetivo + critérios + diff + testes) → aprovado? fim
      → reprovado: relatório JSON volta ao Claude → … (máx. 5 ciclos)
```

- Usa os logins das assinaturas (Claude Pro / ChatGPT Go) pelos CLIs oficiais; nenhuma API paga, nenhum token no repositório.
- Persistência em SQLite: tarefas, execuções, mensagens, decisões, comandos e consumo.
- Segurança: confinamento de diretório, allowlist de comandos, sem push/deploy, sem modos irrestritos, timeouts, cancelamento.

## Estrutura

```
ai-core/
├── backend/
│   ├── agents/          # contratos + adaptadores claude_code.py, codex.py, fake.py, registry.py
│   ├── orchestrator/    # cycle.py (ciclo de auditoria), prompts.py
│   ├── communication/   # schemas.py (protocolo + JSON Schema estrito)
│   ├── security/        # policy.py
│   ├── execution/       # runner.py (timeout/cancelamento/log), git_ops.py
│   ├── memory/          # db.py (SQLite)
│   ├── api/             # main.py (FastAPI)
│   ├── app.py, cli.py, config.py
├── frontend/            # futuro Next.js (README com o contrato da API)
├── tests/               # 41 testes (pytest)
├── docs/                # ARCHITECTURE, SETUP, SECURITY, MISSION-001-REPORT, evidence/
└── scripts/             # check_env.py, demo_cycle.py
```

## Início rápido

```bash
cd ai-core
pip install -e ".[dev]"
python scripts/check_env.py
claude            # /login  (uma vez)
codex login --device-auth   # (uma vez)
python scripts/demo_cycle.py
python -m pytest -q
```

Detalhes: [docs/SETUP.md](docs/SETUP.md) · Status da missão: [docs/MISSION-001-REPORT.md](docs/MISSION-001-REPORT.md)
