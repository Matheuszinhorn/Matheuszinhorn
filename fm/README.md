# FM Brasileiro — MVP Release Candidate

Jogo de gerenciamento de futebol no navegador, inspirado na simplicidade dos clássicos (sem copiar nenhum deles):
4 divisões × 20 clubes fictícios, temporadas de 38 rodadas, partidas simuladas minuto a minuto com decisões ao vivo
(pênalti, lesão, expulsão, goleiro), MEU TIME, finanças, acesso/rebaixamento e carreira salva no navegador.

| | |
|---|---|
| Produto | **FM Brasileiro — MVP Release Candidate** (`package.json` → `1.0.0-rc.1`) |
| Engine | **0.2.0** (`engine/config.ts` → `engineVersion`), fechado: não recalibrar |
| Artefato | `dist/app/index.html` — um único HTML estático, autocontido |

## Requisitos

- Node.js 22 (o código TypeScript roda direto no Node, com remoção de tipos nativa; sem bundler externo).
- npm.
- Só para os scripts de QA no navegador: Playwright + Chromium (ver [QA](#qa)). O jogo em si não precisa deles.

## Instalar, verificar, testar, gerar

```bash
npm install          # instala só typescript e @types/node (devDependencies)
npm run typecheck    # tsc nos dois projetos: engine/game/scripts e app
npm test             # suíte completa: engine + game + app (node --test)
npm run build        # gera dist/app/index.html
```

Desenvolvimento: edite `engine/`, `game/` ou `app/`, rode `npm test` e `npm run build`, e abra o HTML gerado.
Não há servidor de desenvolvimento nem recarga automática.

## Abrir o jogo

```bash
cd dist/app
python3 -m http.server 8080      # qualquer servidor de arquivos estáticos serve
# abrir http://localhost:8080/index.html
```

Também funciona abrindo o arquivo direto no navegador (`file://`).

## Publicar

`dist/app/index.html` é estático: sem backend, banco, API externa ou Node em runtime. Para publicar, hospede esse
único arquivo em qualquer serviço de arquivos estáticos (GitHub Pages, Netlify, Vercel, S3/CloudFront, nginx…).
O repositório não tem deploy automático nem credenciais de publicação.

## Organização

```
engine/   Engine 0.2.0 (contrato): partida, decisões, CPU, rodada, temporada, finanças, mundo, escalação. Não conhece UI.
game/     Camada de jogo: carreira (career.ts), sessão e velocidades (session.ts), consultas (queries*.ts),
          edição de escalação (lineup-edit.ts), sugestão = política da CPU (assist.ts), decisões de goleiro (goalkeeper.ts).
app/      Interface em TypeScript puro + DOM (sem framework): controller.ts (estado/ações), views/*, styles.css, index.html.
scripts/  build-app.mjs (bundler próprio, sem dependências) e scripts de QA (qa-*.mjs).
reports/  Relatórios históricos de calibração do engine.
```

Arquitetura: `app → game → engine`. Regras de futebol ficam no engine; a UI só coleta escolhas e mostra estado.
Determinismo: mesma seed + mesmos dados + mesmas decisões = mesmo resultado (a velocidade nunca muda o jogo).

## Persistência

- `localStorage['fm-brasileiro:carreira:v1']`: a carreira inteira em JSON (`serializeCareer`), gravada ao criar a carreira,
  ao fim de cada rodada, na virada de temporada e a cada edição do MEU TIME. Restaurada por `deserializeCareer`
  (botão CONTINUAR CARREIRA).
- `localStorage['fm-brasileiro:velocidade']`: a velocidade escolhida.
- Save corrompido ou de versão incompatível: a tela inicial avisa e permite começar outra carreira.

## QA

Os scripts `scripts/qa-*.mjs` dirigem o jogo no Chromium só pela interface. São ferramentas de desenvolvimento:
o Playwright **não** é dependência do projeto. Para usá-los:

```bash
npm install -D playwright && npx playwright install chromium   # ou: NODE_PATH=<pasta com playwright instalado>
npm run build
node scripts/qa-app.mjs --season          # smoke: carreira, MEU TIME, rodadas, recarregar, temporada inteira, virada
node scripts/qa-visual.mjs                # 6 larguras × telas principais e pop-ups
node scripts/qa-season.mjs --w=390 --h=844 --mobile
node scripts/qa-persist.mjs --w=1280 --h=800
node scripts/qa-scenarios.mjs && node scripts/qa-goalkeeper.mjs
node scripts/qa-myteam.mjs
node scripts/qa-speeds.mjs
```

`APP_URL=http://localhost:8080/index.html` testa o build servido por HTTP em vez do arquivo local.
Capturas e relatórios vão para `dist/qa/` (fora do Git).

## Limitações conhecidas do MVP

- A partida em andamento não é salva: recarregar no meio volta ao início da mesma rodada (nada é aplicado em dobro).
- Mudanças táticas feitas durante a partida valem só para aquele jogo; a escalação salva é a do MEU TIME antes da rodada.
- O batedor padrão é definido antes da rodada; no pênalti o usuário pode escolher outro cobrador.
- Durante a partida, a aba MEU TIME é consulta; os ajustes são feitos pelo botão MEU TIME da tela PARTIDA.
- O save é local ao navegador/dispositivo; não há migração de saves entre versões.
- Sem premiação de fim de temporada nas finanças; sem mercado, multiplayer, seleção nacional ou narração.
- Celular: as 5 velocidades ocupam duas linhas; nomes no quadro da rodada usam reticências; o aviso temporário cobre
  a parte de baixo da tela por ~4 s.
