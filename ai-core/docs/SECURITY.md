# Relatório de segurança — v0.1

| Requisito | Implementação | Evidência (teste) |
|---|---|---|
| Não executar fora do diretório autorizado | `SecurityPolicy.check_path` resolve symlinks e exige que o `cwd` esteja dentro de `AICORE_WORKSPACES_ROOT` (a raiz em si é recusada) | `test_paths_outside_root_rejected`, `test_symlink_escape_rejected`, `test_api_rejects_workspace_outside_root` |
| Isolamento por projeto | Cada tarefa aponta para um subdiretório próprio com repositório Git próprio; trabalho sempre em branch `aicore/task-<id>-<run>`; workspace sujo é recusado | `test_reject_then_fix_then_approve`, `test_dirty_workspace_is_refused` |
| Não excluir dados de produção / não publicar | Allowlist de executáveis (`git`, `claude`, `codex`, `python`, `pytest`); `git push/remote/config/clean/branch -D/...` bloqueados; comandos de teste com `deploy`, `vercel`, `prod`, `publish`, `rm -rf`... bloqueados; o sistema nunca faz push nem merge | `test_forbidden_commands`, `test_forbidden_test_commands`, `test_protected_branch_names` |
| Sem permissões irrestritas | Flags `--dangerously-*`, `bypassPermissions`, `danger-full-access` rejeitadas pela política. Claude dev: `acceptEdits` + ferramentas `Read,Edit,Write,Glob,Grep,Bash` com Bash limitado a `pytest`. Codex: `--sandbox read-only`, `approval_policy="never"` | `test_forbidden_commands`, `test_full_cycle_through_real_adapters` |
| Auditor não modifica código | Sandbox somente leitura + verificação de HEAD/`git status` antes e depois; alteração ⇒ `git reset` ao commit anterior, remoção de arquivos novos, run `auditor_violation` | `test_auditor_cannot_modify_code` |
| Não expor credenciais | Nenhum token é lido/armazenado; `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CODEX_API_KEY`, `GITHUB_TOKEN`... removidas do ambiente dos filhos; logs passam por `redact()`; `.env`, `data/`, `workspaces/` no `.gitignore`; ambiente nunca é logado | `test_api_keys_removed_from_child_env`, `test_redaction`, `test_commands_are_logged_without_env` |
| Registrar comandos | Tabela `command_log` (argv redigido, cwd, exit code, duração, timeout, cancelamento, últimos 4 KB de stdout/stderr) | `test_commands_are_logged_without_env` |
| Limites de tempo e consumo | Timeout por comando, por chamada de agente e por tarefa; máx. 5 ciclos (limite rígido); limite diário de chamadas por agente (persistido); erros de cota do plano viram `quota_exceeded` | `test_timeout_kills_process`, `test_max_five_cycles`, `test_daily_quota` |
| Interromper qualquer execução | `POST /runs/{id}/cancel` ou `aicore cancel`; o runner verifica a cada 1 s e mata o grupo de processos inteiro (SIGTERM → SIGKILL) | `test_cancel_kills_running_process`, `test_cancel_before_start` |

## Riscos residuais

1. **Claude com `Write`/`Edit` pode alterar qualquer arquivo dentro do workspace**, inclusive os testes. Mitigação parcial: o auditor recebe o diff completo e é instruído a reprovar testes enfraquecidos. Evolução: marcar arquivos de teste como protegidos e reprovar automaticamente se o diff tocá-los.
2. **O próprio comando de teste executa código escrito pelo agente** (com os privilégios do usuário). Mitigação: allowlist + timeout. Evolução: rodar testes dentro de um contêiner Docker sem rede.
3. **Sandbox do Codex depende do SO** (Landlock/seccomp no Linux, Seatbelt no macOS). Em contêineres sem suporte o Codex pode recusar a execução; a verificação de HEAD/status continua valendo.
4. **API sem autenticação**: aceitável apenas em `127.0.0.1`.
5. **Prompt injection via repositório**: um arquivo malicioso no workspace pode tentar instruir os agentes. As permissões restritas limitam o dano (sem rede no Claude dev, sem push, Codex só leitura).
