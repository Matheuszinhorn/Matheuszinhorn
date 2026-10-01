# ELITE MANAGER — Brand Foundation

Identidade oficial do produto. **A identidade visual faz parte da V1.0** e está aplicada no jogo (Final Design
Sprint, 01/10/2026): splash, tela inicial, navegação, partida, MEU TIME, pop-ups, classificação, resultados e
temporada. A V2 fica reservada para novas funcionalidades e evolução do gameplay.

| | |
|---|---|
| Nome | **ELITE MANAGER** |
| Logo | [`docs/brand/elite-manager-logo-referencia.png`](brand/elite-manager-logo-referencia.png) |
| Cores | `#071522` · `#B3FA46` · `#F2F4ED` |
| Splash | Implementada na V1 |
| Identidade | Aplicada na V1 |

## Nome

**ELITE MANAGER** é o nome oficial do jogo.

"FM Brasileiro" / "Football Manager Brasileiro" foi o nome/codinome usado durante o desenvolvimento. Ele continua
em identificadores técnicos e no histórico (ver [Ocorrências do nome antigo](#ocorrências-do-nome-antigo)).

## Logo

A referência oficial é a logo fornecida pelo proprietário do projeto, guardada sem alteração em
[`docs/brand/elite-manager-logo-referencia.png`](brand/elite-manager-logo-referencia.png) (824 × 754 px, PNG).

- Escudo em contorno verde-lima com o "E" estilizado, seta de progressão e bola; "ELITE" em off-white itálico
  pesado; subtítulo em verde-lima espaçado; fundo azul-marinho.
- O jogo usa **este arquivo, sem alteração**: o build (`scripts/build-app.mjs`) o embute uma única vez no CSS
  (`--brand-logo`), e a splash, a tela inicial e a navegação do computador o exibem sempre na proporção original
  (824 / 754, `background-size: contain`). O fundo da arte é exatamente `#071522`, o mesmo do jogo: não há emenda.
- Favicon e ícone de atalho (`app/assets/favicon-64.png`, `app/assets/apple-touch-icon-180.png`): **recorte técnico**
  do símbolo (escudo, "E", seta e bola) da própria logo, sobre o mesmo marinho; não é um novo logotipo.
- Não gerar nova logo, não substituir, não alterar o conceito. Versão vetorial: fora deste repositório.

A logo apresenta exatamente **ELITE MANAGER**. Uma primeira versão enviada trazia o subtítulo com erro de grafia;
ela foi substituída pela versão atualizada do proprietário, com a escrita correta. A fonte vetorial da logo não está
neste repositório.

## Cores

| Cor | Hex | Papel |
|---|---|---|
| Azul-marinho profundo | `#071522` | Estrutura e fundo |
| Verde-lima / neon | `#B3FA46` | Destaque e ação |
| Off-white | `#F2F4ED` | Texto e leitura |

Contraste (WCAG): off-white sobre marinho **16,6:1**; lima sobre marinho **14,6:1** (marinho sobre lima, também
14,6:1, serve para texto em botão lima). **Off-white sobre lima: 1,1:1 — nunca usar.**

## Princípios

- Azul-marinho como estrutura/fundo.
- Verde-lima como destaque/ação, usado com moderação: não transformar a interface inteira em verde.
- Off-white para leitura.
- Alto contraste.
- Visual esportivo, moderno, forte e simples.
- Sem excesso de efeitos (brilhos, sombras e gradientes só onde ajudam a leitura).

**Não alterar o Engine 0.2.0 por motivos de branding.** Branding é só camada de apresentação (`app/`).

## Ocorrências do nome antigo

Levantamento em todos os arquivos versionados (exceto `node_modules`, `dist` e relatórios de calibração).
Classes: **A** visível ao jogador · **B** documentação do produto · **C** comentário/código · **D** histórico ·
**E** identificador técnico · **F** referência que deve permanecer.

| Onde | Texto | Classe | Ação nesta etapa |
|---|---|---|---|
| `app/index.html` `<title>` | Football Manager Brasileiro | **A** | **Corrigido** na correção de identidade da V1: `ELITE MANAGER` |
| `app/src/views/start.ts` (tela inicial) | selo "FM" + "FOOTBALL MANAGER BRASILEIRO" | **A** | **Corrigido**: o selo "FM" foi removido (sem sigla substituta); a tela mostra a logo oficial e o título "ELITE MANAGER" |
| `README.md` (título, linha Produto) | FM Brasileiro | **B** | Atualizado para ELITE MANAGER, citando o codinome |
| `docs/PRODUCT.md` (título, abertura) | FM Brasileiro | **B** | Atualizado |
| `docs/RELEASE.md`, `docs/HANDOFF-RC.md` (linha Produto) | FM Brasileiro | **B** | Atualizado |
| `docs/RELEASE-AUDIT.md`, `docs/PLAYTEST-13A.md` (título/abertura) | FM Brasileiro | **B** | Atualizado |
| `package.json` `description` | FM Brasileiro — MVP Release Candidate | **B** | **Corrigido**: "ELITE MANAGER — MVP Release Candidate (Engine 0.2.0)"; `name` (`football-manager-engine`) é identificador técnico e foi mantido |
| `app/styles.css` linha 1 | comentário "Football Manager Brasileiro — identidade: azul…" | **C** | Substituído pelo comentário da identidade ELITE MANAGER |
| `app/src/controller.ts`, `scripts/qa-lib.mjs`, `scripts/qa-persist.mjs`, `docs/ARCHITECTURE.md`, `README.md`, `docs/PLAYTEST-13A.md` | `fm-brasileiro:carreira:v1`, `fm-brasileiro:velocidade` | **E** | **Não alterar**: são as chaves do `localStorage`; mudar apagaria na prática os saves existentes (não há migração) |
| `scripts/qa-app.mjs` | chave do save no QA | **E** | Mantido |
| `HANDOFF.md` (raiz de `fm/`) | Football Manager Brasileiro | **D** | Mantido (histórico) |
| `reports/*`, mensagens de commit, `reports/playtest-01.md` | FM Brasileiro | **D** | Mantido (histórico) |
| Pasta `fm/`, branch, nome do repositório | `fm` | **F** | Mantido |

Observação: "Football Manager" é marca de terceiros; com a troca do nome visível, ela não aparece mais na tela.

## Aplicação no jogo (V1)

Toda a identidade está na camada de apresentação (`app/`): **nenhuma mudança em `engine/`, `game/`, regras,
RNG, seeds ou persistência.**

**Tokens** (`app/styles.css`, `:root`): `--brand-navy`, `--brand-lime`, `--brand-offwhite` e `--brand-logo` são a
fonte; os papéis da interface derivam deles: `--bg` (marinho), `--bg2`/`--panel`/`--panel2` (tons do marinho para
camadas), `--text` (off-white), `--muted` (`#97a6b4`, ≥ 5,4:1 em todos os fundos), `--accent` (lima),
`--on-accent` (marinho sobre lima), `--accent-soft`/`--accent-line` (seleção), `--green` = lima (positivo),
`--yellow` (aviso), `--red` (`#ff5a68`, expulsão/derrota). Cores de dados do jogo continuam próprias: setores do
campo (`--sec-gk/def/mid/att`) e gramado (`--pitch`). Os clubes usam as cores de cada clube no escudo.

**Onde o verde-lima aparece** (e só aí): botão principal (JOGAR RODADA, RECEBER PROPOSTAS, CONTINUAR, PRÓXIMA
RODADA, INICIAR TEMPORADA), item ativo da navegação, opção selecionada (velocidade, formação, estilo,
comportamento, divisão, cobrador escolhido), o próprio clube (placar, classificação, quadro da rodada, lista de
clubes), gol nos lances, vitória, zona de acesso, indicador "ao vivo", marcador dos títulos de cartão, foco do teclado.

| Tela | O que mudou |
|---|---|
| Splash | Nova: logo oficial centralizada no marinho, barra de carregamento lima discreta; sai com um esmaecimento de 0,5 s assim que o jogo é desenhado pela primeira vez (sem espera artificial). Não bloqueia toques; com "reduzir movimento" some na hora. |
| Tela inicial | Logo oficial no topo (o título "ELITE MANAGER" continua no `<h1>`, para leitores de tela); botão principal lima. |
| Navegação | Fundo marinho; item ativo em lima (barra + texto); no computador, a logo no topo da coluna. |
| Partida | Cartão do placar em marinho com filete lima no topo; nome do próprio clube em lima; placar off-white; gols destacados em lima nos lances; o quadro "Jogos da rodada" continua gramado. |
| MEU TIME | Campo e cores por setor preservados; jogador selecionado com anel lima; formação/estilo/comportamento selecionados em lima. |
| Pop-ups | Fundo marinho; borda superior por gravidade (vermelho para expulsão/lesão, lima para pênalti/MEU TIME); botão principal lima; escolha marcada em lima. |
| Classificação / resultados / temporada | Própria linha em lima; acesso em lima, rebaixamento em vermelho; vitória V em lima; ação principal lima. |

**Tipografia:** mantida (`system-ui`, sem fonte externa: o jogo continua offline).

**Metadados:** `<title>` e `application-name` = ELITE MANAGER; `theme-color` = `#071522`; favicon e ícone de atalho
embutidos.

**QA da marca:** `scripts/qa-splash.mjs` (6 larguras: splash, proporção e enquadramento da logo, fundo, toques,
reduzir movimento, título, favicon, logo na tela inicial).
