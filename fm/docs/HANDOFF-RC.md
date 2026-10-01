# Handoff — Release Candidate 1.0.0-rc.1

Estado do projeto para quem continuar o trabalho. O `HANDOFF.md` da raiz de `fm/` é o histórico da passagem
anterior (30/09/2026) e não descreve mais o estado atual.

## Estado

| | |
|---|---|
| Produto | FM Brasileiro — MVP Release Candidate 1.0.0-rc.1 |
| Engine | 0.2.0, fechado (não recalibrar) |
| Commit do RC | `2c07826` (branch `ccr-9941e34c-pdjxb3` do repositório `Matheuszinhorn/Matheuszinhorn`, pasta `fm/`) |
| Testes | `npm test` 158/158; `npm run typecheck` OK |
| Build | `dist/app/index.html`, sha256 `2c09004217685fdb414a5f1c58cf4c095d055a20288de9cafbe9a063ffd73de2`, reproduzível em clone limpo |
| QA de interface | Temporada, goleiro, velocidades e decisões, MEU TIME, persistência e visual, em celular e desktop ([QA.md](QA.md)) |
| Publicação | Não publicado; pronto para teste externo |

## Estrutura

```
fm/
  engine/        Engine 0.2.0 (contrato)            → docs/ENGINE.md
  game/          carreira, sessão, consultas, edição → docs/ARCHITECTURE.md
  app/           interface (TypeScript + DOM)
  scripts/       build-app.mjs e qa-*.mjs
  dist/app/      index.html do build (versionado)
  reports/       relatórios históricos de calibração
  docs/          esta documentação
```

## Como rodar

```bash
cd fm
npm ci && npm run typecheck && npm test && npm run build
cd dist/app && python3 -m http.server 8080      # http://localhost:8080/index.html
```

QA de interface: [RELEASE.md](RELEASE.md#qa) e [QA.md](QA.md).

## Regras de trabalho em vigor

- Engine 0.2.0 é contrato: só muda com bug estrutural comprovado, e então com nova `engineVersion`.
- Arquitetura app → game → engine; nenhuma regra de futebol na interface.
- Identidade visual azul, preto e branco ([DESIGN-DECISIONS.md](DESIGN-DECISIONS.md)).
- Depois de qualquer mudança: typecheck, suíte completa, build e os QAs afetados.

## Limitações

Ver [RELEASE.md](RELEASE.md#limitações-conhecidas) e [BACKLOG.md](BACKLOG.md).

## Próximos passos

1. Etapa 13: teste externo (playtest) com o build do RC.
2. Priorizar o [BACKLOG.md](BACKLOG.md) com o retorno do teste.
3. Decidir onde publicar o HTML estático.

## Arquivos importantes

| Arquivo | Por quê |
|---|---|
| `engine/config.ts` | Todos os números do engine. |
| `engine/rng.ts` | RNG e canais (determinismo). |
| `engine/match/step.ts` | Ordem de um minuto de jogo. |
| `game/career.ts` | Carreira, rodadas, virada, persistência. |
| `game/session.ts` | Velocidades, pausas, decisões. |
| `app/src/controller.ts` | Estado da interface, save e load. |
| `scripts/build-app.mjs` | Build do HTML único. |
| `scripts/qa-lib.mjs` | Base dos scripts de QA. |
