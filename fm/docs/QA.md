# QA e testes

Registro das validações executadas no MVP 1.0.0-rc.1 (Engine 0.2.0). Tudo abaixo foi rodado de fato; os números são
os da execução. Datas: 01/10/2026, salvo indicação. Os scripts de interface estão em `scripts/qa-*.mjs` e precisam
de Playwright + Chromium (ver [RELEASE.md](RELEASE.md#qa)).

## Testes automatizados

`npm test` (Node `--test`): **158/158**.

| Conjunto | Arquivo(s) | Cobre |
|---|---|---|
| Engine | `engine/tests/*.test.ts` | Partida, chances e calibração, decisões, prioridade de eventos no mesmo minuto, fim de partida, rodada, finanças, promoção. |
| Game | `game/tests/*.test.ts` | Carreira (ofertas na D4, rodadas, lesões/suspensões, finanças uma vez por rodada, virada, persistência), sessão (velocidades, pausas, decisões, determinismo entre velocidades), consultas, edição de escalação, decisões de goleiro. |
| App | `app/tests/controller.test.ts` | Controlador sem tela: carreira, rodada, velocidades, CLUBES, MEU TIME, recarregar no fim da temporada, estados de save na tela inicial. |

`npm run typecheck` (TypeScript 6.0.3, `strict`): OK.

## Testes de interface (Chromium headless, só pela tela)

| Área | Script | Larguras | Resultado |
|---|---|---|---|
| Temporada completa | `qa-season.mjs` | 360, 390, 412, 1280, 1440, 1920 | 12/12 em cada: 38 rodadas, 1.520 partidas com 1 goleiro de cada lado, fim de temporada, 24 movimentos (12 acessos, 12 rebaixamentos), 2027 jogável. |
| Smoke com temporada | `qa-app.mjs --season` | 1280, 390 | 36/36 em cada: início, propostas, MEU TIME, rodada, pausa, CLUBES, decisões, resultado, recarregar e continuar, 39 rodadas, virada. |
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

## Análises

- **Expulsões** (Etapa 8, `qa-season` em 1280): 16 do usuário e 881 da CPU em 1.520 partidas; 147 vermelhos
  diretos e 750 segundos amarelos. Taxas por jogo-time: usuário 0,421; CPU 0,293; total 0,295. Mesmo clube só no
  engine (4.000 partidas): 0,275. Mesma temporada com o clube sob a CPU: as mesmas 16 expulsões. Sem duplicação
  em eventos, decisões, comandos, LANCES, resultados ou suspensões. Conclusão: consistente com o engine.

## Testes de release

| Verificação | Resultado |
|---|---|
| Build oficial | `dist/app/index.html`, 277.683 bytes (71 KB gzip), sha256 `2c09004217685fdb414a5f1c58cf4c095d055a20288de9cafbe9a063ffd73de2`, 41 módulos. |
| Autocontido | Sem `src`/`href` externos, sem chamadas de rede, sem Node ou Playwright em runtime. |
| Servido por HTTP | Mesmo hash servido; smoke, temporada nas 6 larguras, visual, persistência, goleiro e MEU TIME OK. |
| Clone limpo | Sem `node_modules` e sem `dist`: `npm ci` → `npm run typecheck` OK → `npm test` 158/158 → `npm run build` com o **mesmo sha256**. |
| Segurança | 121 arquivos versionados auditados: nenhum segredo, credencial ou `.env`. |

## Determinismo

- Mesma seed + mesmos dados + mesmas decisões = mesmo resultado: coberto na suíte (partida, rodada, sessão em
  velocidades diferentes) e na interface (`qa-speeds`: 7 casos × 5 velocidades; `qa-myteam`: mesmo roteiro 2×;
  `qa-persist`: mesmo save jogado em outro navegador; `qa-season`: 1.520 placares idênticos nas 6 larguras).
