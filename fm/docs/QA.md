# QA e testes

Registro das validações executadas no MVP 1.0.0-rc.1 (Engine 0.2.0). Tudo abaixo foi rodado de fato; os números são
os da execução. Datas: 01/10/2026, salvo indicação. Os scripts de interface estão em `scripts/qa-*.mjs` e precisam
de Playwright + Chromium (ver [RELEASE.md](RELEASE.md#qa)).

## Testes automatizados

`npm test` (Node `--test`): **275/275** (DEV-PROTO-0.4, 03/10/2026: +4 em `game/tests/development.test.ts`: campos inertes na 0.2/0.3, limite conjunto da perda sem participação, quem joga mantém o envelhecimento normal, preservação sem +1 no limite). Antes **271/271** (DEV-PROTO-0.3, 03/10/2026: +3 em `game/tests/development.test.ts`: campos da 0.3 inertes na 0.2, limite de inatividade por variante, divisão só como oportunidade; validação no mundo real em `npm run development:world03`). Antes **268/268** (validação PlayerDevelopment no mundo real, 03/10/2026: +1 em `game/tests/development.test.ts`: evidência lida de uma rodada real do engine, só leitura; a simulação de 10 temporadas em si é `npm run development:world`, ~3 min por mundo, fora da suíte). Antes **267/267** (calibração PlayerDevelopment DEV-PROTO-0.2, 03/10/2026: +5 em `game/tests/development.test.ts`: ritmo de 10 temporadas, ambiente como oportunidade, sem deriva acima do limite, idade com compensação pelo rendimento, teto sazonal opcional). Antes **262/262** (projeto PlayerDevelopment, 03/10/2026: +10 em `game/tests/development.test.ts`: ±1 por janela, contratação não muda a força, teto do ambiente, banco e minutos de lixo, titular evolui, goleiro, lesão × tempo parado, determinismo, ambiente do clube e protótipo isolado). Antes **252/252** (calibração EM-RATING-2.0, 03/10/2026: +4 em `data/tests/em-rating-2.test.ts`: modelos A/B/C, curvas de participação, experiência limitada e extremos em todas as variantes; testes ajustados à remoção do EA e à planilha com uma linha por atleta). Antes **248/248** (etapa EM-RATING-2.0, +13 em `data/tests/em-rating-2.test.ts`: determinismo, 1–50, sem posição, sem gols, goleiro, atacante, jovem/veterano, partidas, produção, dados ausentes, curadoria, versionamento e simulação sem terceiros; testes da 1.0 trocados pelos da 2.0). Antes **235/235** (etapa Universo real + EM-RATING, +18 em `data/tests/ratings.test.ts` com os 20 testes pedidos, incluindo a impressão digital do engine; testes do universo atualizados para os dados da CBF). Antes **217/217** (etapa Força + Economia; antes 213/213 (ELITE MANAGER: 190 anteriores + 16 da camada de gestão em `game/tests/manager.test.ts` + 3 de paradas obrigatórias em `game/tests/session.test.ts` + 4 do controlador: entrada/perfil local, propostas e sem clube, gestão bloqueada durante a rodada, velocidade INSTANTÂNEA antiga).

| Conjunto | Arquivo(s) | Cobre |
|---|---|---|
| Engine | `engine/tests/*.test.ts` | Partida, chances e calibração, decisões, prioridade de eventos no mesmo minuto, fim de partida, rodada, finanças, promoção. |
| Game | `game/tests/*.test.ts` | Carreira (ofertas na D4, rodadas, lesões/suspensões, finanças uma vez por rodada, virada, persistência), sessão (velocidades, pausas, decisões, determinismo entre velocidades), consultas, edição de escalação, decisões de goleiro. |
| Data (V1.1) | `data/tests/*.test.ts` | Universo Brasileirão 2026 (CBF): carga, 20 clubes, 897 atletas (601 no elenco jogável), ids `p-cbf-<id>`, posições, força, vínculos, conversão para o engine, partida, temporada de 380 jogos, determinismo; validador (posição "VOL" com sugestão, força fora de 1–50, duplicidades, clube/competição inexistente, número, idade, elenco mínimo, goleiro, JSON inválido) e normalização; regra do nome exibido (apelido → `displayName`, `fullName` só como referência, nunca no World nem na partida). O universo padrão continua idêntico a `generateWorld`. |
| Ratings e regras (etapa Universo real) | `data/tests/ratings.test.ts` | Os 20 testes pedidos: displayName, apelido priorizado, sem apelido usa o nome disponível, sem escudo, cores válidas, força 1–50, determinismo, mesma entrada = mesma força, rastreabilidade da referência, jogadores sem referência identificados, dado incompleto não inventado, universo fictício intacto, universo real separado, impressão digital do Engine 0.2.0, save antigo, força alta em divisão inferior, sem barreira de contratação por divisão, regras por competição (Brasil × fictício); mais a ligação CBF × EA (datas, nomes, ambiguidade). |
| App | `app/tests/controller.test.ts` | Controlador sem tela: carreira, rodada, velocidades, CLUBES, MEU TIME, recarregar no fim da temporada, estados de save na tela inicial, NOVA CARREIRA na mesma página (regressão do P1 da auditoria). |

`npm run typecheck` (TypeScript 6.0.3, `strict`): OK.

## Testes de interface (Chromium headless, só pela tela)

| Área | Script | Larguras | Resultado |
|---|---|---|---|
| Temporada completa | `qa-season.mjs` | 360, 390, 412, 1280, 1440, 1920 | 12/12 em cada: 38 rodadas, 1.520 partidas com 1 goleiro de cada lado, fim de temporada, 24 movimentos (12 acessos, 12 rebaixamentos), 2027 jogável. |
| Smoke com temporada | `qa-app.mjs --season` | 1280, 390 | 37/37 em cada: início, propostas, MEU TIME, rodada, pausa, CLUBES, decisões, resultado, recarregar e continuar, NOVA CARREIRA na mesma página jogando a rodada 1, 39 rodadas, virada. |
| Goleiro | `qa-scenarios.mjs` + `qa-goalkeeper.mjs` | 360, 390, 1280 | A lesionado + reserva, B lesionado sem reserva, C expulso + reserva, D expulso sem reserva, E CPU: OK. Escolhas diferentes da sugestão respeitadas; 1 goleiro sempre. |
| Velocidades e decisões | `qa-speeds.mjs` | 1280, 390 | 54/54 em cada: 6 cenários (pênalti, lesão, expulsão, GK lesionado, GK expulso, fila de 2 decisões) × 5 velocidades; pausa, pop-up único, ESC/clique fora não ignoram, retomada, fim; resultado idêntico nas 5 velocidades. |
| MEU TIME na partida | `qa-myteam.mjs` | 360, 390, 1280 | 51/51 em cada: abrir/pausar, formação ×2, posições, estilo ×3, comportamento ×3, 5 substituições + limite, batedor, decisão pendente (A–F), determinismo do roteiro. |
| Persistência | `qa-persist.mjs` | 1280, 390 | 36/36 em cada: salvar, recarregar, fechar/reabrir o navegador, continuar, lesões e suspensões, entre temporadas, refresh no meio da partida, saves inválidos. |
| Visual/UX | `qa-visual.mjs` | 360, 390, 412, 1280, 1440, 1920 | 25 telas por largura, 0 problemas: sem overflow, corte, sobreposição, palavra partida, aba cortada, conteúdo vazando; pop-up centralizado; 0 erros de console. |

## Testes de regressão

- Depois de cada correção (D4, goleiros, recarregar no fim da temporada, revisão visual): typecheck, suíte completa,
  build e os QAs de interface afetados, todos verdes.
- `engine/` sem nenhuma alteração desde a importação do projeto. `game/` mudou só na correção da divisão inicial
  (D4) e nas decisões de goleiro (Etapa 4); desde então, sem alteração.

- **Auditoria de release (01/10/2026):** correção do P1 (NOVA CARREIRA na mesma página) em `app/src/controller.ts`,
  com teste novo em `app/tests/controller.test.ts` (falha sem a correção) e checagem nova em `qa-app.mjs`. Depois
  dela: `npm ci` (0 vulnerabilidades), typecheck OK, 159/159, build, `qa-app --season` 37/37 ×2, `qa-season` 12/12 nas
  6 larguras (placares idênticos), `qa-persist` 36/36 ×2, `qa-scenarios` 4/4, `qa-goalkeeper` A–E OK,
  `qa-myteam` 51/51 ×2, `qa-speeds` 54/54 ×2, `qa-visual` 0 problemas nas 6 larguras. Rebaixamento pela interface
  (save preparado no 20º lugar da D3 antes da rodada 38) em 390 e 1280: aviso de rebaixamento, 2027 na D4 jogável.
  Detalhes em [RELEASE-AUDIT.md](RELEASE-AUDIT.md).

- **Final Design Sprint (identidade ELITE MANAGER, 01/10/2026):** só camada de apresentação (`app/styles.css`,
  `app/index.html`, `app/src/main.ts`, `views/start.ts`, `views/shell.ts`, `scripts/build-app.mjs`, `app/assets/`).
  Typecheck OK, 159/159, `qa-splash` 13/13 nas 6 larguras (novo), `qa-visual` 0 problemas nas 6 larguras,
  `qa-season` 12/12 nas 6 larguras com **os mesmos 1.520 placares do build anterior** (6/6 larguras idênticas),
  `qa-app --season` 37/37 ×2, `qa-persist` 36/36 ×2, `qa-scenarios` 4/4, `qa-goalkeeper` A–E, `qa-myteam` 51/51 ×2,
  `qa-speeds` 54/54 ×2, rebaixamento pela interface OK (390 e 1280). `engine/`, `game/` e `controller.ts` sem alteração.

- **ELITE MANAGER — gestão (02/10/2026, build final sha256 `af5d2c04…`):** `engine/` sem nenhuma alteração.
  Typecheck OK, **213/213**. Interface: `qa-splash` 17/17 nas 6 larguras (splash ~8 s, toque pula, 2ª abertura e
  "reduzir movimento" sem espera); `qa-scenarios` 4/4; `qa-goalkeeper` A–E em 360, 390 e 1280; `qa-speeds` 54/54 em 1280
  e 390 (paradas obrigatórias não mudam o resultado nas 5 velocidades); `qa-myteam` 51/51 em 360, 390 e 1280;
  `qa-persist` 36/36 em 1280 e 390; `qa-live` 7/7; `qa-app --season` **59/59** em desktop e celular (entrada, Google sem
  falso login, perfil local, 3 propostas sem sorteio, pop-up e análise da proposta, 10 telas, intervalo, decisões,
  temporada e virada); `qa-season` 12/12 nas 6 larguras com **os mesmos 1.520 placares, 897 vermelhos, 6.872 amarelos e
  356 lesões da V1.1** (6/6 larguras idênticas à linha de base; só o saldo financeiro muda: público dinâmico);
  `qa-visual` **0 problemas** nas 6 larguras, 42–43 telas por largura (entrada, modos, proposta, análise, sem clube,
  mercado, perfil do jogador, elenco, notícias, calendário, estádio, finanças, MAIS, intervalo, detalhe do jogo).
  Durante a bateria, `qa-myteam` em 360/390 falhou por causa do ROTEIRO (clicava em CLUBES, que no celular fica no MAIS);
  roteiro corrigido e reexecutado: 51/51. `qa-live` esperava a decisão do cenário aos 36', constante já desatualizada na
  linha de base (os cenários de `597abb3` também dão 62'); o roteiro agora lê o minuto do cenário.

- **Etapa Força + Economia (02/10/2026, build `b545f8c5…`):** `engine/` sem alteração. Typecheck OK, **217/217**
  (novos: propostas persistentes ao reabrir, força relativa/⭐, evolução ±1 com 1ª metade idêntica, virada sem salto de
  força; regressão com evolução desligada = 1.520 placares idênticos). Interface: `qa-splash` 17/17 ×6; `qa-scenarios`
  4/4; `qa-goalkeeper` A–E em 360/390/1280; `qa-speeds` 54/54 em 1280 e 390; `qa-myteam` 51/51 em 360/390/1280;
  `qa-persist` 36/36 ×2; `qa-live` 7/7; `qa-app --season` **61/61** ×2 (novos: anti-reroll recarregando a página com as
  propostas e uma recusa; página completa da notícia); `qa-season` 12/12 nas 6 larguras; `qa-visual` 0 problemas ×6.
  **Regressão contra a V3:** rodadas 1–19 idênticas nas 6 larguras; a partir da rodada 20 (checkpoint de evolução do meio)
  16 das 19 rodadas mudam — efeito esperado da evolução de força, não do engine; as 6 larguras continuam idênticas entre si
  (907 vermelhos, 6.871 amarelos, 356 lesões na temporada).

## Análises

- **Expulsões** (Etapa 8, `qa-season` em 1280): 16 do usuário e 881 da CPU em 1.520 partidas; 147 vermelhos
  diretos e 750 segundos amarelos. Taxas por jogo-time: usuário 0,421; CPU 0,293; total 0,295. Mesmo clube só no
  engine (4.000 partidas): 0,275. Mesma temporada com o clube sob a CPU: as mesmas 16 expulsões. Sem duplicação
  em eventos, decisões, comandos, LANCES, resultados ou suspensões. Conclusão: consistente com o engine.

## Testes de release

| Verificação | Resultado |
|---|---|
| Build oficial | `dist/app/index.html`, 278.340 bytes (71 KB gzip), sha256 `089164b09de8ffd31fc4e65e0d6e21e1695df6c0ed434475957c2651ae97fbe6`, 41 módulos (build da auditoria de release, com a correção do P1). |
| Autocontido | Sem `src`/`href` externos, sem chamadas de rede, sem Node ou Playwright em runtime. |
| Servido por HTTP | Mesmo hash servido; smoke, temporada nas 6 larguras, visual, persistência, goleiro e MEU TIME OK. |
| Clone limpo | Sem `node_modules` e sem `dist`: `npm ci` → `npm run typecheck` OK → `npm test` 158/158 → `npm run build` com o **mesmo sha256** (Etapa 11, build anterior `2c090042…`). |
| Segurança | 121 arquivos versionados auditados: nenhum segredo, credencial ou `.env`. |

## Determinismo

- Mesma seed + mesmos dados + mesmas decisões = mesmo resultado: coberto na suíte (partida, rodada, sessão em
  velocidades diferentes) e na interface (`qa-speeds`: 7 casos × 5 velocidades; `qa-myteam`: mesmo roteiro 2×;
  `qa-persist`: mesmo save jogado em outro navegador; `qa-season`: 1.520 placares idênticos nas 6 larguras).

## Auditoria anti-reroll (03/10/2026)

Busca de fontes não determinísticas em `game/` e `app/src`. Toda decisão de jogo usa RNG com seed (`game/career.ts`,
`game/manager/{people,world,finance,market,flow}.ts`). Fora disso:

| Item | Situação |
|---|---|
| Seed da carreira (`app/src/controller.ts` `randomSeed`) | Única fonte aleatória real: sorteada uma vez por NOVA CARREIRA e gravada no save. |
| Propostas iniciais | Persistidas em `elite-manager:propostas-iniciais` (`OFFERS_KEY`): recarregar a página mostra as mesmas. Recusar todas leva a AGUARDAR PROPOSTAS; novas propostas só por eventos do mundo. |
| Mercado, patrocínio, empréstimos, leilões, eventos, notícias, ofertas, geração de jogadores | Funções da seed + estado + decisões: repetir a ação dá a mesma resposta; não existe "sortear de novo". |
| `app/src/audio.ts` `Math.random` | Só o timbre do ruído sintetizado; não toca no jogo. |
