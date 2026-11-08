# Arquitetura — IA CORE v0.1

## Visão geral

```
                ┌──────────────────────────────┐
  CLI / API ──▶ │  Orchestrator (Python)        │ ── SQLite (tarefas, runs, mensagens,
  (FastAPI)     │  backend/orchestrator/cycle.py│     decisões, comandos, consumo)
                └──────┬───────────────┬────────┘
                       │               │
         ImplementationRequest    AuditRequest (objetivo, critérios, diff, testes)
                       │               │
                       ▼               ▼
            ┌────────────────┐   ┌──────────────────────────┐
            │ Claude Code CLI │   │ Codex CLI (`codex exec`)  │
            │ `claude -p`     │   │ --sandbox read-only       │
            │ acceptEdits     │   │ --output-schema (JSON)    │
            └───────┬────────┘   └────────────┬─────────────┘
                    │ edita arquivos          │ só lê
                    ▼                         ▼
             workspace isolado (repositório Git próprio, branch aicore/task-…)
```

Toda chamada externa passa por `CommandRunner` → `SecurityPolicy`
(confinamento de diretório, allowlist, ambiente sem API keys, timeout,
cancelamento, log).

## Módulos

| Diretório | Responsabilidade |
|---|---|
| `backend/agents/` | Contratos (`Implementer`, `Auditor`), adaptadores `claude_code.py` e `codex.py`, agentes simulados (`fake.py`), registro (`registry.py`) |
| `backend/orchestrator/` | Ciclo automático (`cycle.py`) e geração de prompts (`prompts.py`) |
| `backend/communication/` | Protocolo Pydantic: `ImplementationRequest/Report`, `AuditRequest/Report`, `TestResult`, JSON Schema estrito |
| `backend/security/` | Política de segurança e redação de segredos |
| `backend/execution/` | Execução de processos (timeout, cancelamento, log) e operações Git |
| `backend/memory/` | Persistência SQLite |
| `backend/api/` | API FastAPI |
| `backend/cli.py` | CLI |

## Ciclo

1. Orquestrador recebe a tarefa (objetivo, critérios, workspace, comando de testes).
2. Verifica workspace limpo, cria branch `aicore/task-<id>-<run>`.
3. Para cada ciclo (máx. 5):
   1. envia `ImplementationRequest` ao Claude (com o `AuditReport` anterior, se houver);
   2. faz commit das alterações na branch isolada;
   3. **o próprio orquestrador** executa os testes (fonte confiável, não o agente);
   4. envia `AuditRequest` (objetivo, critérios, diff desde a base, testes) ao Codex;
   5. compara HEAD + `git status` antes/depois da auditoria — se o auditor alterou algo, descarta e encerra com `auditor_violation`;
   6. aprovação exige **veredito `approved` E testes passando**; caso contrário, o relatório volta ao Claude.
4. Registra a conclusão (`approved`, `max_cycles_reached`, ou falha tipada).

## Por que não LangGraph (ainda)

O fluxo atual é um único laço determinístico. Um laço explícito tem menos
dependências e é mais fácil de testar/auditar. LangGraph passa a se justificar
com: auditores múltiplos em paralelo, aprovação humana com pausa/retomada
(checkpointing), ou roteamento condicional entre vários agentes. A interface
`Orchestrator.execute(run_id)` foi mantida isolada para essa troca.

## Persistência

SQLite em WAL (`data/aicore.db`). Tabelas: `agents`, `tasks`, `runs`,
`messages`, `decisions`, `command_log`, `usage`. Na inicialização, execuções
ativas cujo processo dono morreu ficam `interrupted`. SQL simples e portável
para facilitar a migração para PostgreSQL/Neon.
