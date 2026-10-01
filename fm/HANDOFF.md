> **Documento histórico** (passagem de sessão de 30/09/2026). O estado atual, os comandos e as limitações estão em [README.md](README.md).

# HANDOFF — Football Manager Brasileiro (para continuar no Claude Code)

Leia este arquivo inteiro antes de qualquer ação. Responda em português.

## 1. O que é
Jogo de gerenciamento de futebol (inspirado no Elifoot 98), clubes e jogadores fictícios, 4 divisões × 20 clubes, 38 rodadas.
TypeScript, Node 22 (type stripping nativo), TS 6.0.3 com `erasableSyntaxOnly` e `verbatimModuleSyntax` (sem enum/namespace/parameter properties; use `import type`).
Documento técnico (Claude Doc do usuário): https://claude.ai/code/artifact/6fbac096-f80d-44f6-a131-5179dbd24a28 (revisão 76 após a Parte 1; ainda NÃO descreve camada de carreira/app).

## 2. Regras que valem sempre (decisões do usuário)
- **ENGINE 0.2.0 = CONTRATO.** Não alterar `engine/` (única mudança já feita: `export { cpuCommandFor }` em `engine/index.ts`, sem efeito em comportamento).
- Não reabrir/calibrar: chancesBase 4,75, sat2, camada de qualidade C (h=1,0), homeAdvantage 1,25, conversão, RNG, matchMinutes 97.
- Não trocar de framework, não instalar dependências, não refatorar sem necessidade, não fazer ciclos de micro-aprovação.
- Arquitetura: UI → GAME → ENGINE. O engine não conhece UI. Nenhuma regra de futebol em componentes visuais.
- Honestidade: só declarar "PRONTO PARA TESTE EXTERNO" se TODOS os itens do critério final (seção 6) forem verdadeiros. Rodar comandos longos em FOREGROUND e ler a saída antes de concluir; informar números reais.
- Não implementar: multiplayer, pagamentos, jogadores/clubes reais, IA narrativa, negociação, imprensa, seleção, editor, mercado.

## 3. Mapa do repositório
- `engine/` (contrato, não mexer): partida, rodada, season (calendário, classificação, promoção), finance, world, lineup.
- `game/`: `session.ts` (5 velocidades, pausa USER/CLUBES, decisões, scheduler injetável), `queries.ts` (consultas somente leitura), **novos**: `career.ts` (carreira: rodadas, lesões/suspensões, finanças 1×/rodada, virada de temporada, serialização), `assist.ts` (sugestão automática = política da CPU), `lineup-edit.ts` (troca/formação/tática/batedor), `queries-lite.ts` (força do clube).
- `app/`: web app em **TypeScript puro + DOM** (sem framework; Next.js foi inviável no ambiente sem rede — desvio a documentar). `app/src/controller.ts` (estado/ações, sem DOM), `app/src/views/*` (start, shell, match, decision, team, league, clubs, careerview, common), `app/styles.css`, `app/index.html`, `app/tests/controller.test.ts`.
- `scripts/`: `build-app.mjs` (bundler próprio sem dependências → `dist/app/index.html` único), `qa-app.mjs` (QA em Chromium via Playwright), `qa-scenarios.mjs` (acha saves determinísticos de goleiro lesionado/expulso → `dist/qa/scenarios/*.json`), `qa-goalkeeper.mjs` (QA de UI desses 3 cenários — **ainda NÃO executado**).
- Persistência: `localStorage` chave `fm-brasileiro:carreira:v1` (carreira inteira em JSON, salva ao fim de cada rodada, ao editar o time e na virada) e `fm-brasileiro:velocidade`. Rodada em andamento NÃO é persistida (ao recarregar volta ao início da rodada). Sem localStorage → memória.

## 4. Comandos
```
npm run typecheck      # tsc -p tsconfig.json && tsc -p app/tsconfig.json
npm test               # engine + game + app  (esperado: 148 testes)
npm run build          # node scripts/build-app.mjs → dist/app/index.html
node scripts/qa-app.mjs --season --only=desktop     # QA de temporada completa (~1 min)
node scripts/qa-scenarios.mjs && node scripts/qa-goalkeeper.mjs
```
Os scripts de QA usam Playwright. No ambiente original ele era global (`NODE_PATH=/home/claude/.npm-global/lib/node_modules`, Chromium em `/opt/pw-browsers`). Na máquina do usuário será preciso ter o Playwright disponível (isso é instalação de ferramenta de QA, não dependência do jogo: pedir autorização ao usuário antes) e ajustar `NODE_PATH`.

## 5. Estado verificado (30/09/2026)
- Typecheck engine e game/app: OK (exit 0). Suíte completa: **148/148**, 0 falhas.
- QA em navegador, DESKTOP 1280×800, temporada completa pela UI: **36/36 checks, APROVADO** — 38 rodadas, virada pelo botão "INICIAR TEMPORADA 2027", 24 movimentos (12 acessos/12 rebaixamentos), 4×20 clubes, nenhum pop-up/decisão pendente, 0 erros de console, 0 overflow, rodada 1 de 2027 jogada. ~0,9 s por rodada instantânea.
- Correções feitas no caminho: grid estourando largura no celular (minmax(0,1fr)), forças decimais arredondadas, `confirm()` trocado por confirmação em 2 toques (iframe isolado bloqueia confirm), botão "próxima rodada" movido para baixo do placar, redesenho coalescido por `queueMicrotask` em `main.ts` (INSTANT rodava 97 renders/rodada).
- Observação (NÃO é bug confirmado): expulsões do usuário — 13 em 38 jogos numa execução, 8 em outra. Etapa 8 pede só análise factual (não alterar o engine).

## 6. O que falta (ordem obrigatória do usuário; etapas 1 e 2 estão APROVADAS)
3. **Temporada completa MOBILE** em 360, 390 e 412 px: navegação, PARTIDA, MEU TIME, CAMPEONATO, CLUBES, CARREIRA, rodada, virada, pop-ups, botões, tabelas, sem overflow. (`qa-app.mjs` hoje só tem viewports 1280 e 390; parametrizar.)
4. **Goleiro na UI**, 3 cenários determinísticos: (A) lesionado + reserva, (B) lesionado sem reserva (jogador de linha vai ao gol, fator 0,30), (C) expulso. Em todos: partida pausa, decisão obrigatória, exatamente 1 goleiro em campo, partida continua. Mais ao menos 1 caso CPU-controlled com a mesma máquina de estados. Rodar `qa-scenarios.mjs` + `qa-goalkeeper.mjs`.
5. **MEU TIME durante a partida**: abrir, pausar, trocar posição, formação, estilo, comportamento, batedor, voltar a PARTIDA, continuar; estado do match não pode quebrar (hoje o pop-up in-match cobre estilo/comportamento/substituições; confirmar o que existe e o que falta).
6. **Velocidades** (lenta, normal, rápida, muito rápida, instantânea): engine idêntico, decisão sempre pausa, não ignorável, retoma ao resolver, nenhuma velocidade ultrapassa decisão pendente.
7. **Persistência**: iniciar, avançar rodadas, recarregar, verificar clube/rodada/escalação/finanças; fechar e reabrir o navegador (contexto persistente); documentar exatamente o que é salvo.
8. **Expulsões**: análise factual (usuário × CPU, tipo, 2º amarelo × vermelho direto, minutos, taxa/partida) comparada só com a taxa do próprio Engine 0.2.0. Sem ajuste.
9. **QA visual** screenshots: desktop 1280/1440/1920 e mobile 360/390/412 em PARTIDA, MEU TIME, CAMPEONATO, CLUBES, CARREIRA (sem overflow, sem corte, sem sobreposição, pop-up centralizado, campo utilizável). PARTIDA não vira dashboard de cards.
10. **Build FINAL** e smoke test abrindo o `dist/app/index.html` final no Chromium (garantir que o build não está defasado em relação ao código).
11. **Checklist permanente de QA** (arquivo): TypeScript, suíte completa, Engine regression, carreira, temporada completa, promoção/rebaixamento, persistência, PARTIDA, MEU TIME, CAMPEONATO, CLUBES, CARREIRA, pênalti, lesão, lesão de goleiro, expulsão, expulsão de goleiro, CPU decision, velocidades, mobile 360/390/412, desktop 1280/1440/1920, console, overflow, build final — separado em "obrigatório antes de teste externo" e "recomendado antes de produção".
12. **Documentação**: atualizar o Claude Doc (camada game/carreira, persistência, edição de escalação, controlador, telas, fluxo de decisões, velocidades, QA, limitações, build/publicação) sem alterar o histórico do Engine 0.2.0. Limitações a registrar: sem Next.js; rodada em andamento não persistida; sem premiação de fim de temporada no finance; meta de "zebra" a redefinir; sem lint configurado.
13. **Publicação**: verificar se há mecanismo/credencial de deploy; se não, informar onde está o build final e o comando para o usuário publicar. Não inventar.
14. **Critério final** — só declarar "PRONTO PARA TESTE EXTERNO" se: typecheck OK; suíte completa OK; build final atualizado; temporada completa UI OK desktop e mobile; persistência OK; goleiro lesionado/sem reserva/expulso OK; CPU decision OK; todas as velocidades OK; MEU TIME durante partida OK; sem erros de console; sem overflow; checklist criado; documentação atualizada; build final testado. Relatório final no formato: STATUS / TESTES / QA UI / GOLEIRO / PERSISTÊNCIA / EXPULSÕES / VISUAL / BUILD / DOCUMENTAÇÃO / BUGS P0-P3 / PENDÊNCIAS / PRÓXIMA AÇÃO EXATA.

## 7. Primeira ação sugerida
Rodar `npm run typecheck && npm test` (confirmar 148/148) e seguir para a etapa 3, uma etapa por vez, informando o resultado de cada uma no formato pedido pelo usuário.
