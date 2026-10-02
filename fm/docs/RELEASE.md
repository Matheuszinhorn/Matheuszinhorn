# Release 1.0.0-rc.1

| | |
|---|---|
| Produto | ELITE MANAGER — MVP Release Candidate (codinome FM Brasileiro) |
| Versão | 1.0.0-rc.1 (`package.json`) |
| Engine | 0.2.0 (`engine/config.ts`) |
| Commit auditado (RC) | `2c07826` |
| Artefato | `dist/app/index.html` — 350.165 bytes, sha256 `1c9be0d33ecf06721035f52d2e8eb8e8c2e7dbded43b11ffbb57206a2b20a553` (identidade ELITE MANAGER, splash, infraestrutura de universos e displayName) |
| Status | Publicado para playtest (Artifact claude.ai); universo padrão: fictício ([RELEASE-AUDIT.md](RELEASE-AUDIT.md), [UNIVERSES.md](UNIVERSES.md)) |

## Requisitos

- Node.js 22 e npm.
- Para os testes de interface (opcional): Playwright e Chromium.

## Instalar e testar

```bash
npm ci               # ou npm install; instala typescript 6.0.3 e @types/node (package-lock.json)
npm run typecheck
npm test             # esperado: 212/212
```

## Gerar o build

```bash
npm run build        # → dist/app/index.html
sha256sum dist/app/index.html
```

O build é reproduzível: no mesmo commit e com Node 22, gera o mesmo hash.

## Executar localmente

```bash
cd dist/app
python3 -m http.server 8080
# abrir http://localhost:8080/index.html
```

Abrir o arquivo direto no navegador também funciona.

## Hospedar e publicar

O jogo é **um arquivo HTML estático**: sem backend, banco, API externa, Node em runtime ou credenciais. Para
publicar, copie `dist/app/index.html` para qualquer hospedagem de arquivos estáticos (GitHub Pages, Netlify,
Vercel, S3/CloudFront, nginx). O repositório não tem deploy automático; a publicação é uma decisão manual.

Cada endereço publicado tem seus próprios saves: a carreira fica no `localStorage` do navegador, por domínio.

## QA

```bash
npm install -D playwright && npx playwright install chromium   # ou NODE_PATH apontando para uma instalação existente
npm run build
node scripts/qa-app.mjs --season
node scripts/qa-visual.mjs
```

Os demais scripts e o que cada um cobre estão em [QA.md](QA.md). `APP_URL=http://localhost:8080/index.html`
faz os scripts testarem o build servido.

## Limitações conhecidas

- A partida em andamento não é salva; recarregar volta ao início da mesma rodada, sem nada aplicado em dobro.
- Mudanças táticas durante a partida valem só para aquele jogo.
- Durante a partida, a aba MEU TIME é só consulta (ajustes pelo botão MEU TIME da tela PARTIDA).
- Save local ao navegador/dispositivo (mesma chave e versão de antes; save antigo recebe a camada de gestão com os
  valores padrão ao ser carregado).
- Perfil local (só um nome), sem servidor: ENTRAR/CRIAR CONTA não autenticam ninguém; Google e o modo online estão
  em desenvolvimento ([SECURITY-ONLINE.md](SECURITY-ONLINE.md), [ONLINE-ROADMAP.md](ONLINE-ROADMAP.md)).
- Dependências do engine não implementadas (Engine 0.2.0 fechado): assistências, influência do árbitro, faltas
  ([ENGINE.md](ENGINE.md)).
- Seleção: convite honorário; jogos da seleção e Copa no roadmap.
- No celular, o quadro da rodada mostra a cidade do clube no lugar do nome completo.

Lista completa e itens futuros: [BACKLOG.md](BACKLOG.md).
