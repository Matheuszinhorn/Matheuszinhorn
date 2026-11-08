# Instalação e execução

## Pré-requisitos

| Ferramenta | Versão testada | Observação |
|---|---|---|
| Python | 3.13 (mínimo 3.11) | |
| Node.js | 22.x | necessário para os CLIs |
| Git | 2.43 | |
| Claude Code CLI | 2.1.x | `npm install -g @anthropic-ai/claude-code` (ou instalador oficial) |
| Codex CLI | 0.167.0 | `npm install -g @openai/codex` |
| Docker | opcional | não é usado nesta versão |

## 1. Instalar o IA CORE

```bash
cd ai-core
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env        # ajuste limites se quiser; NÃO coloque credenciais aqui
```

## 2. Autenticar os agentes (feito pelo proprietário, uma vez)

As credenciais ficam nos diretórios dos próprios CLIs (`~/.claude`, `~/.codex`),
fora do repositório. O IA CORE nunca lê nem copia tokens.

**Claude Code (Claude Pro):**
```bash
claude            # dentro do CLI: /login  → escolha "Claude account with subscription"
claude auth status
```
Não defina `ANTHROPIC_API_KEY`: se existir, o Claude Code passa a cobrar pela API.
(O IA CORE remove essa variável do ambiente dos agentes de qualquer forma.)

**Codex (ChatGPT Go):**
```bash
codex login                 # abre o navegador → "Sign in with ChatGPT"
# ou, em máquina sem navegador / remota:
codex login --device-auth
codex login status          # deve mostrar "Logged in using ChatGPT"
```
Não use `codex login --with-api-key` se a intenção é usar a assinatura.

## 3. Verificar o ambiente

```bash
python scripts/check_env.py      # versões + status de login (sem imprimir segredos)
python -m backend.cli probe      # registra os agentes no banco
```

## 4. Executar

**Demonstração ponta a ponta (critérios de aceitação 1–10):**
```bash
python scripts/demo_cycle.py                         # Claude (dev) + Codex (auditor)
python scripts/demo_cycle.py --auditor claude-auditor  # fallback se o Codex estiver indisponível
```
O ciclo 1 injeta uma implementação propositalmente incorreta (passa nos testes
existentes mas viola critérios); o auditor deve reprovar; o Claude corrige; o
auditor aprova.

**Tarefa própria via CLI:**
```bash
mkdir -p workspaces/meu-projeto   # todo projeto precisa estar em workspaces/
python -m backend.cli task create --title "..." --objective "..." \
    --criterion "critério 1" --criterion "critério 2" \
    --workspace workspaces/meu-projeto --test "python -m pytest -q"
python -m backend.cli run <task_id>
python -m backend.cli show <run_id> --messages
python -m backend.cli cancel <run_id>      # de outro terminal
python -m backend.cli history
```

**API:**
```bash
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
# docs interativas: http://127.0.0.1:8000/docs
```

## 5. Testes

```bash
python -m pytest -q
```
Os testes usam agentes simulados e CLIs falsos — não consomem cota das assinaturas.
