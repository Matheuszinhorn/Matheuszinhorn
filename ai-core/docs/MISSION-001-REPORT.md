# Missão 001 — Relatório de entrega

Data: 2026-11-08 · Branch: `claude/ia-core-multiagent-foundation-170a67`

## 1. Inspeção do ambiente (sessão de desenvolvimento em nuvem)

| Item | Resultado |
|---|---|
| Python | 3.13.18 |
| Node.js / npm | v22.23.4 / 10.9.9 |
| Git | 2.43.0 |
| Docker | CLI 29.9.2 instalado; **daemon indisponível** (não usado nesta versão) |
| Claude Code | 2.1.319, **autenticado** (`loggedIn=true`, OAuth). `claude -p` headless funciona, com saída JSON e `--json-schema` |
| Codex CLI | não vinha instalado; `@openai/codex@0.167.0` instalado via npm; **não autenticado** (`Not logged in`) |
| API keys no ambiente | nenhuma (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY` ausentes) |

Observação: este ambiente é um contêiner de nuvem do Claude Code, não a máquina
do proprietário. O login do Claude aqui é o da própria sessão. Nenhuma
credencial foi solicitada, lida ou impressa.

## 2. Autenticação oficial e limites dos planos

**Claude Pro → Claude Code**: oficialmente suportado. Login com `/login`
(conta claude.ai). O uso de Claude Code entra no mesmo limite do Claude web/desktop:
janela de sessão de 5 horas + limite semanal. Se `ANTHROPIC_API_KEY` estiver
definida, o Claude Code passa a cobrar pela API — por isso o IA CORE remove a
variável. Ao atingir o limite: esperar o reset ou habilitar créditos extras
(cobrados no preço da API).

**ChatGPT Go → Codex CLI**: a central de ajuda da OpenAI informa que o Codex
está incluso nos planos ChatGPT, inclusive Free e Go, via "Sign in with
ChatGPT" (`codex login` / `codex login --device-auth`). **Codex Cloud
(tarefas na nuvem) NÃO está incluso no Free/Go** — por isso o IA CORE usa o
CLI local (`codex exec`). Os limites do Go não são publicados em números
fixos; dependem do modelo, contexto e complexidade, e são compartilhados com
outros recursos. Use `/status` no Codex para ver o saldo.

**Automação**: nenhum dos dois planos garante uso ilimitado. O IA CORE
assume isso: limite diário de chamadas por agente (padrão 40), máximo de 5
ciclos por tarefa, timeouts, e erros de "usage/rate limit" viram
`quota_exceeded` (a tarefa para, não fica em loop). Não foi encontrada
documentação oficial específica sobre limites diferentes para `claude -p` ou
`codex exec` — confirme nos termos atuais antes de rodar automações longas sem
supervisão.

Fontes:
- [Use Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-max-plan)
- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Codex usage limits](https://help.openai.com/en/articles/11369540-codex-usage-limits)

## 3. Arquitetura implementada

Ver `docs/ARCHITECTURE.md`. Resumo: orquestrador Python determinístico
(sem LangGraph nesta versão — justificativa no documento), protocolo
Pydantic com JSON Schema estrito, adaptadores para `claude -p` e
`codex exec`, persistência SQLite, API FastAPI, CLI.

## 4. Critérios de aceitação — status com evidência

| # | Critério | Status | Evidência |
|---|---|---|---|
| 1 | Claude autenticado | ✅ | probe: `loggedIn=True; método=oauth_token` |
| 2 | Codex autenticado | ❌ **pendente do proprietário** | `codex login status` → `Not logged in`. O login exige navegador/conta do proprietário |
| 3 | Orquestrador inicia ambos | ⚠️ parcial | Claude: iniciado de verdade (2 chamadas reais). Codex: o adaptador gera o comando e foi validado com CLI falso; não houve chamada real |
| 4 | Claude modifica projeto de teste | ✅ | `docs/evidence/demo-run-001.txt`: ciclo 2 reescreveu `leap.py` e ampliou `test_leap.py` (22 testes) |
| 5 | Codex inspeciona alterações | ⚠️ não verificado com Codex real | Validado com auditor fallback real (Claude somente leitura) e com contrato do Codex (`test_full_cycle_through_real_adapters`) |
| 6 | Auditor reprova implementação incorreta | ✅ (fallback) | ciclo 1: implementação com bug proposital que **passa nos testes existentes** foi reprovada com 3 blockers |
| 7 | Claude corrige | ✅ | ciclo 2: correção baseada no `AuditReport` estruturado |
| 8 | Auditor aprova a correção | ✅ (fallback) | ciclo 2: `approved`, testes passando |
| 9 | Sem copiar e colar | ✅ | 10 mensagens estruturadas trocadas automaticamente (tabela `messages`) |
| 10 | Histórico persiste após reiniciar | ✅ | `python -m backend.cli history` em processo novo lê o run `adf2ba7f7cf9`; `test_history_persists_after_restart` |

**Conclusão honesta**: o pipeline completo funciona com agentes reais, mas a
prova com o **Codex real** como auditor independente ainda não foi feita. Para
fechá-la, o proprietário precisa rodar `codex login --device-auth` e depois
`python scripts/demo_cycle.py` (auditor padrão = codex). O auditor usado na
demonstração foi o Claude em modo somente leitura, que **não** é um auditor de
fornecedor independente.

## 5. Testes realizados

- `python -m pytest -q` → **41 testes passando** (ciclo, limites, persistência,
  falhas, segurança, API, contratos dos adaptadores com CLIs falsos).
- Demonstração real: `scripts/demo_cycle.py --auditor claude-auditor` →
  `approved` em 2 ciclos (`docs/evidence/demo-run-001.txt`).
- Demonstração com Codex: interrompida corretamente no probe
  (`agente 'codex' não está pronto`).

Bug real encontrado e corrigido durante os testes: quando a correção tem o
mesmo tamanho do arquivo original e é gravada no mesmo segundo, o Python
reutilizava o `.pyc` antigo e os testes rodavam código velho. Correção: o
orquestrador roda os testes com `PYTHONPYCACHEPREFIX` isolado por execução.

## 6. Integrações efetivamente funcionando

| Integração | Estado |
|---|---|
| Claude Code CLI (desenvolvedor) | ✅ real |
| Claude Code CLI (auditor fallback somente leitura) | ✅ real |
| Codex CLI (auditor) | ⚠️ implementado, testado por contrato; aguardando login |
| Git (branch isolada, commits por ciclo, diff) | ✅ real |
| SQLite | ✅ real |
| FastAPI | ✅ testada (TestClient) |
| Docker / Next.js / Vercel / Neon | ⏭️ fora do escopo desta missão |

## 7. Limitações encontradas

1. Codex sem login neste ambiente (exige ação do proprietário).
2. O sandbox `read-only` do Codex depende de recursos do kernel; dentro de contêineres sem suporte pode falhar. A verificação HEAD/status do orquestrador continua protegendo.
3. Docker daemon indisponível neste ambiente → testes não rodam isolados em contêiner.
4. O desenvolvedor pode editar os testes; a defesa hoje é o auditor (ver `SECURITY.md`).
5. `total_cost_usd` do Claude é uma **estimativa equivalente à API**; em assinatura não é cobrado, mas indica o peso relativo no limite do plano.
6. O ciclo 1 da demonstração (bug injetado) é contado como chamada do `claude-code` no limite diário local, embora não chame o CLI.
7. Somente comandos de teste Python nesta versão.

## 8. Custos potenciais

| Item | Custo |
|---|---|
| Claude Pro / ChatGPT Go | assinaturas já existentes; o uso consome os limites do plano |
| APIs pagas | **nenhuma** — keys removidas do ambiente dos agentes |
| Créditos extras Claude / créditos Codex | só se o proprietário habilitar ao atingir o limite (preço de API) |
| Demonstração executada | 3 chamadas reais ao Claude (1 de desenvolvimento + 2 de auditoria); estimativa equivalente à API ≈ US$ 0,22 (não cobrado na assinatura) |
| Infra futura | Vercel e Neon têm planos gratuitos para começar |

Ordem de grandeza por tarefa: 1 chamada de dev + 1 de auditoria por ciclo, até 5 ciclos → no máximo 10 chamadas.

## 9. Segurança

Ver `docs/SECURITY.md` (requisitos × implementação × teste, riscos residuais).

## 10. Próximas cinco tarefas recomendadas

1. **Fechar a prova com o Codex real**: o proprietário roda `codex login --device-auth` na própria máquina; executar `scripts/demo_cycle.py` e anexar a evidência. Ajustar o adaptador se o formato do `--json` mudar.
2. **Proteger arquivos de teste**: lista de caminhos protegidos por tarefa; reprovar automaticamente o ciclo se o diff tocar neles sem autorização.
3. **Rodar os testes em Docker sem rede** (`--network none`, só o workspace montado) para isolar o código gerado.
4. **Retomada de execuções interrompidas** (`resume`) a partir do último commit/ciclo salvo, e fila de tarefas com 1 execução por vez por agente, respeitando as janelas de 5 h.
5. **Frontend Next.js mínimo** (lista de tarefas, linha do tempo de mensagens/decisões, botão de cancelar), com autenticação na API antes de qualquer deploy na Vercel; depois migrar a persistência para Postgres/Neon.
