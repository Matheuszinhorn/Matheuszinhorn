# Auditoria de release — ELITE MANAGER 1.0.0-rc.1

ELITE MANAGER é o nome oficial (codinome de desenvolvimento: FM Brasileiro). Identidade em [BRAND.md](BRAND.md).

Operação Finalização, 01/10/2026. Base: commit `b9fbe1b` (branch `ccr-9941e34c-pdjxb3`), Engine 0.2.0.
Todos os números abaixo vêm de execuções feitas nesta auditoria, no build final dela. Tudo foi consolidado
num único commit ("fix: finalize release audit and new career regression").

## Estado atual

| | |
|---|---|
| Versão | 1.0.0-rc.1 (`package.json`), Engine 0.2.0 (`engine/config.ts`) |
| Build | `dist/app/index.html`, 278.340 bytes (71.256 gzip), sha256 `089164b09de8ffd31fc4e65e0d6e21e1695df6c0ed434475957c2651ae97fbe6` |
| Testes | `npm test` **159/159**; `npm run typecheck` OK; `npm ci` 0 vulnerabilidades |
| QA de interface | Toda a bateria verde no build final (ver [QA](#qa)) |
| Playtest humano | **PENDENTE** |
| Classificação | **B — PRONTO PARA PLAYTEST HUMANO** |

## Matriz de finalização

Categorias: **A** bloqueador · **B** bug funcional · **C** UX/UI importante · **D** polimento · **E** funcionalidade
futura · **F** ideia/backlog.

| # | Problema | Evidência | Arquivo | Impacto | Classe | Ação |
|---|---|---|---|---|---|---|
| 1 | NOVA CARREIRA na mesma página: a 1ª rodada da carreira nova ficava presa em "Preparando a rodada…" | Reproduzido no controlador real (fase LIVE, sessão descartada por `dispose()` continuava em uso); teste novo falha sem a correção (11/12) | `app/src/controller.ts` | Impedia jogar a carreira nova sem recarregar | **A** | **Corrigido** nesta etapa; teste de regressão + checagem no `qa-app` |
| 2 | Playtest humano não realizado | Nenhuma sessão registrada; só o playtest simulado (`reports/playtest-01.md`), exploratório | `docs/PLAYTEST-13A.md` | Sem evidência de compreensão, motivação e retenção reais | **A** para release público / interno | Executar o protocolo 13A (≥ 5 pessoas) |
| 3 | "Jogando agora" no detalhe de clube depois do fim da rodada | `liveMatchOf` devolve a partida em memória mesmo `FINISHED`; `clubs.ts:17` escreve "Jogando agora" | `game/queries.ts:245`, `app/src/views/clubs.ts:17` | Texto enganoso entre o fim da rodada e PRÓXIMA RODADA; não afeta o jogo | **B** (menor) | Não corrigido (não impede jogar); BACKLOG, corrigir na etapa de UX |
| 4 | Força exibida não explica resultados | Playtest simulado (P2): força não reflete formação/setores | `app/src/views/*`, `game/queries.ts` | Resultados podem parecer aleatórios | **C** | Validar no playtest humano antes de mexer |
| 5 | Finanças sem alavanca para o jogador | Playtest simulado (P2). Dúvida: na temporada do `qa-season` o clube do usuário (13º na D4) fechou com **+R$ 166.440**, então "o caixa só cai" não é geral | `engine/` (finanças, fechado), `app/` | Percepção de progressão | **C** / **E** | Documentar; validar no playtest; alavancas = funcionalidade futura |
| 6 | Nomes sobrepostos no campo com 5 defensores em 390 px | Captura do playtest simulado; `qa-visual` não mede sobreposição entre jogadores | `app/src/views/team.ts`, `app/styles.css` | Leitura do campo no celular | **C** | BACKLOG |
| 7 | Nomes curtos repetidos no elenco | 481 de 1.600 clubes (30%) em 20 mundos; 0 nomes completos repetidos | `engine/` (mundo, fechado) | Confusão ao escalar | **C** | BACKLOG (desambiguar na UI, sem mexer no engine) |
| 8 | Pop-ups sem placar/minuto; ACEITAR SUGESTÃO sem explicar na expulsão; goleiro improvisado sem valor no gol | Playtest simulado P3 10, 11, 15 | `app/src/views/decision.ts` | Clareza das decisões | **C** | BACKLOG |
| 9 | CONTINUAR do MEU TIME mantém a pausa feita antes pelo jogador | `decision.ts:235` diz "O jogo continua no CONTINUAR"; pausa USER é preservada | `app/src/views/decision.ts` | Um toque a mais | **D** | BACKLOG |
| 10 | Pênalti: SUGERIDO nem sempre é o de maior % | Playtest simulado P3 12; comportamento aceito na Etapa 6 | `app/src/views/decision.ts` | Percepção | **D** | Manter (decisão da Etapa 6) |
| 11 | Abreviações no topo, jogo do clube no fim do quadro, colunas escondidas no celular, CLUBES abre na D1, "Escalação ajustada" sem detalhe, acesso pouco destacado, toast de ~4 s | Playtest simulado P3 | `app/src/views/*` | Polimento | **D** | BACKLOG |
| 12 | `HANDOFF.md` da raiz cita caminho do ambiente antigo (`/home/claude/...`) | `git grep` | `HANDOFF.md` | Nenhum (documento histórico, sem segredo) | **D** | Manter (marcado como histórico em HANDOFF-RC) |
| 13 | Partida em andamento não é salva; save só local; sem migração | Limitações aceitas (Etapa 7) | `app/src/controller.ts` | Recarregar volta ao início da rodada | **E** | Manter; sem migração/cloud save agora |
| 14 | Mercado, evolução de jogadores, premiação, seleção, áudio, imprensa, multiplayer | Visão do produto | — | — | **E** | BACKLOG |
| 15 | IA como camada futura, ampliação de estádio | — | — | — | **F** | BACKLOG |

## Bloqueadores

- **Técnicos: nenhum aberto.** O único bloqueador técnico encontrado (item 1, P1) foi corrigido e coberto por teste.
- **Para release (interno ou público): o playtest humano** (item 2). Sem ele não há evidência de que pessoas reais
  entendem e querem continuar jogando.

## Bugs confirmados

| Bug | Estado |
|---|---|
| P1 — NOVA CARREIRA na mesma página trava a 1ª rodada | **Corrigido**. Causa: `abandonCareer()` chamava `session.dispose()` e seguia usando a sessão descartada. Correção: criar uma sessão nova (`newSession`) ao abandonar. |
| "Jogando agora" após o fim da rodada | Confirmado no código; **não corrigido** (texto, não impede jogar). |

Nenhum comportamento do engine foi encontrado incorreto.

## UX importante

Itens 4–8 da matriz. Os dois de maior peso (força × resultado, finanças) dependem do playtest humano para saber se
são problema real; mexer antes seria inventar requisito.

## Polimento

Itens 9–12 da matriz e os P3 restantes do playtest simulado, todos no [BACKLOG](BACKLOG.md).

## Funcionalidades futuras

Itens 13–15 da matriz; lista completa no [BACKLOG](BACKLOG.md). Nada foi iniciado (sem mercado, transferências,
backend, login, API, analytics, multiplayer).

## Playtest humano

**PENDENTE.** O protocolo está pronto em [PLAYTEST-13A.md](PLAYTEST-13A.md) (5 participantes, 4 perfis, celular e
desktop, tarefas A–L, ficha de registro, critérios para a Etapa 14) e já aponta para o build desta auditoria. O
playtest simulado (`reports/playtest-01.md`) é **apenas exploratório**: gerou hipóteses (1 P1, 2 P2, 17 P3), não
evidência de comportamento humano.

## Gameplay

Temporada completa pela interface (`qa-season`, seed fixa), números reais:

| Medida | Valor |
|---|---|
| Rodadas / partidas | 38 / 1.520, nenhuma travada, 1 goleiro de cada lado em todas |
| Amarelos / expulsões | 6.872 / 897 (16 do usuário) |
| Lesões | 356 (11 eventos de goleiro da CPU tratados) |
| Decisões do usuário | 16 expulsões, 5 lesões, 5 pênaltis |
| Fim de temporada | Clube do usuário 13º na D4, saldo da temporada +R$ 166.440; 24 movimentos (12 acessos, 12 rebaixamentos); campeões nas 4 divisões |
| Temporada 2027 | Disponível pela interface, rodada 1, resultados e extrato zerados |
| Tempo | 38 a 42 s por temporada inteira na velocidade instantânea |

- Rebaixamento pela interface (save preparado: clube 20º da D3 antes da rodada 38), em 390 e 1280: "REBAIXAMENTO.
  Você cai para a 4ª Divisão"; depois de recarregar, INICIAR TEMPORADA 2027 leva à D4 e a rodada 1 é jogada; 0 erros.
- Conteúdo (20 mundos): 0 nomes de clube repetidos, 0 nomes completos repetidos no elenco, 0 nomes vazios. Força
  média dos elencos: D1 37,4 (29–46,6), D2 30,1, D3 22,5, D4 16,2 (6,3–25,7) — hierarquia coerente.
- Início de carreira sempre na D4 (corrigido na Etapa 2, coberto por teste).

## Engine

Engine 0.2.0 **sem nenhuma alteração** (`engine/` intacto desde a importação). Nada recalibrado: probabilidades,
mando, modelo de chances, RNG e seeds iguais. Determinismo confirmado de novo: os 1.520 placares são idênticos nas 6
larguras, e `qa-speeds` dá o mesmo resultado nas 5 velocidades.

## Persistência

`qa-persist` 36/36 em 1280 e 390: salvar, recarregar, fechar e reabrir o navegador, continuar, lesões e suspensões,
entre temporadas, refresh no meio da partida (volta ao início da rodada, nada aplicado em dobro), 4 saves inválidos
sem quebrar. Save no fim da temporada: ~835 KB em `localStorage` (estável entre temporadas: os resultados zeram na
virada). NOVA CARREIRA apaga o save e a nova carreira é salva e jogável (item 1).

## Responsividade

`qa-visual`: 25 telas por largura em 360, 390, 412, 1280, 1440 e 1920 — **0 problemas**, 0 erros de console.
`qa-season` 12/12 nas mesmas 6 larguras. Pendente conhecido: sobreposição no campo com 5 defensores em 390 px
(item 6), que o QA visual não mede.

## Performance

| Medida | Valor |
|---|---|
| Artefato | 278 KB (71 KB gzip), 1 arquivo, 41 módulos |
| Temporada inteira (instantânea) | 38–42 s no Chromium headless (~1 s por rodada de 40 partidas, incluindo a interface) |
| Save | ~835 KB no fim da temporada (limite típico do `localStorage`: 5 MB) |

## Segurança

- `npm ci`: 0 vulnerabilidades; só 2 devDependencies (typescript, @types/node). Nenhuma dependência nova.
- Busca por segredos (`api key`, `secret`, `password`, `token`) nos arquivos versionados: nada.
- Artefato autocontido: sem recursos externos, sem chamadas de rede, sem analytics, sem backend.
- O único dado gravado é o save e a velocidade no `localStorage` do próprio navegador.
- `globalThis.__fm` (gancho de inspeção dos scripts de QA) expõe o controlador no console; não é segredo nem
  permite nada além do que a tela permite num jogo local. Mantido.

## Documentação

Atualizada para ficar coerente com este build: README (índice), QA (159 testes, `qa-app` 37/37, auditoria),
RELEASE (hash novo, status), HANDOFF-RC (testes, hash, status), PLAYTEST-13A (P1 corrigido), BACKLOG (itens da
auditoria). GAMEPLAY, ENGINE, ARCHITECTURE, PRODUCT e DESIGN-DECISIONS conferidos: sem mudança de regra, nada a alterar.

**Identidade:** o nome oficial passou a ser ELITE MANAGER. A documentação do produto foi atualizada; a tela ainda
mostra o codinome (troca prevista na etapa de branding, [BRAND.md](BRAND.md)).

## Build

`npm ci` → `npm run typecheck` OK → `npm test` 159/159 → `npm run build` ("build ok: 41 módulos"). Hash novo
`089164b0…` (antes `2c090042…`, Etapa 11): a mudança de hash vem só da correção do P1 em `app/src/controller.ts`.
O build é reproduzível: numa cópia limpa do estado final (sem `node_modules` e sem `dist`), `npm ci` → typecheck OK →
159/159 → build com o **mesmo sha256** `089164b0…`; nessa cópia passaram também `qa-app --season` 37/37 ×2,
`qa-season` 12/12 (390 e 1280), `qa-persist` 36/36 ×2, `qa-scenarios` 4/4, `qa-goalkeeper` A–E, `qa-myteam` 51/51 ×2,
`qa-speeds` 54/54 ×2 e o rebaixamento pela interface (390 e 1280).

## QA

Executado no build final desta auditoria:

| Script | Larguras | Resultado |
|---|---|---|
| `npm test` | — | 159/159 |
| `qa-app --season` | 1280, 390 | 37/37 cada (inclui NOVA CARREIRA na mesma página) |
| `qa-season` | 360, 390, 412, 1280, 1440, 1920 | 12/12 cada; placares idênticos |
| `qa-persist` | 1280, 390 | 36/36 cada |
| `qa-scenarios` + `qa-goalkeeper` | 390 | 4/4 cenários; A–E OK |
| `qa-myteam` | 1280, 390 | 51/51 cada |
| `qa-speeds` | 1280, 390 | 54/54 cada |
| `qa-visual` | 6 larguras | 0 problemas, 0 erros de console |
| Rebaixamento pela UI | 390, 1280 | OK |

## Mudanças realizadas nesta etapa

| Arquivo | Mudança |
|---|---|
| `app/src/controller.ts` | Correção do P1: `newSession()`; `abandonCareer()` descarta a sessão antiga e cria outra |
| `app/tests/controller.test.ts` | Teste de regressão: NOVA CARREIRA após uma rodada e no meio de uma rodada |
| `scripts/qa-app.mjs` | Checagem nova: NOVA CARREIRA na mesma página joga a rodada 1 |
| `dist/app/index.html` | Rebuild (hash novo) |
| `docs/RELEASE-AUDIT.md` | Este documento (novo) |
| `docs/BRAND.md`, `docs/brand/elite-manager-logo-referencia.png` | Identidade oficial ELITE MANAGER: nome, logo de referência, paleta `#071522` / `#B3FA46` / `#F2F4ED`, princípios, ocorrências do nome antigo e inspeção da UI. Nenhuma mudança visual. |
| `docs/QA.md`, `RELEASE.md`, `HANDOFF-RC.md`, `PLAYTEST-13A.md`, `BACKLOG.md`, `README.md` | Coerência com o build e a auditoria |

`engine/` e `game/`: sem alteração. Também ficam no working tree, sem commit, os arquivos das Etapas 13 e 13A:
`reports/playtest-01.md` e `docs/PLAYTEST-13A.md`.

## Pendências reais

1. **Playtest humano** (protocolo 13A) — bloqueia release interno e público.
2. "Jogando agora" depois da rodada (bug de texto menor).
3. Itens C da matriz, a priorizar com os dados do playtest.

## Recomendação de próximo passo

1. Rodar o playtest humano do [PLAYTEST-13A.md](PLAYTEST-13A.md) com este build (`089164b0…`).
2. Com os registros em mãos, abrir a Etapa 14 só com itens confirmados (bugs e UX), começando por força × resultado,
   finanças e o texto "Jogando agora".

**Classificação final: B — PRONTO PARA PLAYTEST HUMANO.** Não há bloqueador técnico aberto e toda a bateria
automatizada está verde, mas nenhuma pessoa real jogou o build; por isso não é C (release interno) nem D (release
público).
