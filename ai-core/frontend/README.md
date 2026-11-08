# Frontend (futuro)

Planejado: Next.js + TypeScript, interface responsiva, deploy na Vercel.

Nesta Missão 001 não há frontend: a prioridade é provar a comunicação real
entre Claude Code e Codex. O frontend consumirá a API já disponível em
`backend/api/main.py`:

| Método | Rota | Uso |
|---|---|---|
| GET  | `/health` | saúde |
| GET  | `/agents` · POST `/agents/probe` | registro e status de login dos agentes |
| POST | `/tasks` · GET `/tasks` | cadastro e listagem de tarefas |
| POST | `/tasks/{id}/runs` | inicia um ciclo em background |
| GET  | `/runs/{id}` | estado + histórico de decisões |
| GET  | `/runs/{id}/messages` | mensagens estruturadas entre agentes |
| GET  | `/runs/{id}/commands` | log de comandos executados |
| POST | `/runs/{id}/cancel` | interrompe uma execução |
| GET  | `/usage` | consumo por agente/dia |

Antes de expor a API fora de `127.0.0.1` será necessário adicionar autenticação.
