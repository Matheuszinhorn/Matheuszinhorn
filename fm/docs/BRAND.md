# ELITE MANAGER — Brand Foundation

Registro da identidade oficial do produto (01/10/2026). Este documento **só registra**: nenhuma alteração visual foi
feita na interface. A aplicação da marca fica para a etapa final de branding/polimento.

## Nome

**ELITE MANAGER** é o nome oficial do jogo.

"FM Brasileiro" / "Football Manager Brasileiro" foi o nome/codinome usado durante o desenvolvimento. Ele continua
em identificadores técnicos e no histórico (ver [Ocorrências do nome antigo](#ocorrências-do-nome-antigo)).

## Logo

A referência oficial é a logo fornecida pelo proprietário do projeto, guardada sem alteração em
[`docs/brand/elite-manager-logo-referencia.png`](brand/elite-manager-logo-referencia.png) (824 × 754 px, PNG).

- Escudo em contorno verde-lima com o "E" estilizado, seta de progressão e bola; "ELITE" em off-white itálico
  pesado; subtítulo em verde-lima espaçado; fundo azul-marinho.
- É uma **referência**, não um asset de produção: versões vetoriais, ícone pequeno (favicon/app) e variações
  ficam para a etapa de branding.
- Não gerar nova logo, não substituir, não alterar o conceito.

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
| `app/index.html` `<title>` | Football Manager Brasileiro | **A** | Não alterado (mudança visível fica para a etapa de branding; o build auditado é o do playtest) |
| `app/src/views/start.ts` (tela inicial) | marca "FM" + "FOOTBALL MANAGER BRASILEIRO" | **A** | Não alterado (idem) |
| `README.md` (título, linha Produto) | FM Brasileiro | **B** | Atualizado para ELITE MANAGER, citando o codinome |
| `docs/PRODUCT.md` (título, abertura) | FM Brasileiro | **B** | Atualizado |
| `docs/RELEASE.md`, `docs/HANDOFF-RC.md` (linha Produto) | FM Brasileiro | **B** | Atualizado |
| `docs/RELEASE-AUDIT.md`, `docs/PLAYTEST-13A.md` (título/abertura) | FM Brasileiro | **B** | Atualizado |
| `package.json` `description` | FM Brasileiro — MVP Release Candidate | **E** | Mantido (metadado do pacote; `name` também é técnico) |
| `app/styles.css` linha 1 | comentário "Football Manager Brasileiro — identidade: azul…" | **C** | Mantido (descreve a identidade atual da UI, ainda vigente) |
| `app/src/controller.ts`, `scripts/qa-lib.mjs`, `scripts/qa-persist.mjs`, `docs/ARCHITECTURE.md`, `README.md`, `docs/PLAYTEST-13A.md` | `fm-brasileiro:carreira:v1`, `fm-brasileiro:velocidade` | **E** | **Não alterar**: são as chaves do `localStorage`; mudar apagaria na prática os saves existentes (não há migração) |
| `scripts/qa-app.mjs` | chave do save no QA | **E** | Mantido |
| `HANDOFF.md` (raiz de `fm/`) | Football Manager Brasileiro | **D** | Mantido (histórico) |
| `reports/*`, mensagens de commit, `reports/playtest-01.md` | FM Brasileiro | **D** | Mantido (histórico) |
| Pasta `fm/`, branch, nome do repositório | `fm` | **F** | Mantido |

Observação: "Football Manager" é marca de terceiros. Trocar o nome visível (classe A) por ELITE MANAGER na etapa de
branding também remove essa referência da tela; vale priorizar essa troca antes de qualquer release público.

## Inspeção da interface atual (sem alterações)

Base: capturas do `qa-visual` (6 larguras) e `app/styles.css`.

**Onde aparece o nome antigo**
- Aba do navegador (`<title>`).
- Tela inicial: selo "FM" em quadrado azul e título "FOOTBALL MANAGER / BRASILEIRO".
- Nenhum outro lugar da interface mostra o nome (topo, menu e pop-ups mostram clube, divisão e rodada).

**Onde a identidade atual não combina com ELITE MANAGER**
- Selo "FM" com gradiente azul e brilho na tela inicial: deveria dar lugar à logo oficial.
- Fundo atual `--bg #050b1a` com gradiente radial azul `#12306b`: mais azul-royal/preto que o marinho `#071522`.
- Ações principais em azul (`--blue #2d7dff`, botão primário em gradiente azul com sombra azul); na marca, ação é
  verde-lima.
- Títulos de cartão e valores em ciano (`--cyan #4cc9ff`): não fazem parte da paleta oficial.
- Texto `--text #f4f7ff` (branco azulado) em vez do off-white `#F2F4ED`.

**O que futuramente migra para a nova identidade**
- Tokens `--bg`, `--bg2`, `--panel`, `--panel2` → família do marinho `#071522`.
- `--text` → `#F2F4ED`.
- `--blue`, `--blue-d`, `--blue-on`, `.btn-primary`, aba ativa do menu, velocidade selecionada, formação
  selecionada → verde-lima `#B3FA46` com texto marinho.
- `--cyan` (títulos de cartão, caixa no topo) → lima ou off-white, a decidir na etapa de branding.

**Onde o verde-lima pode entrar como destaque**
- Botão primário (JOGAR RODADA, RECEBER PROPOSTAS, CONTINUAR, PRÓXIMA RODADA).
- Item ativo do menu e opções selecionadas (velocidade, formação, estilo, comportamento).
- Indicador de "ao vivo" e destaque do jogo do próprio clube.
- Acesso no fim de temporada.

**Onde não alterar nada ainda (ou com cuidado)**
- Gramado (`--pitch`, `--pitch2`) e as cores dos setores no campo: o meio-campo usa verde escuro; com lima na
  interface, rever o contraste entre meio-campo e destaque, sem trocar a lógica de cores por setor.
- Cores de estado: `--green` (vitória/bom), `--yellow` (aviso/amarelo), `--red` (expulsão/derrota). O verde de
  estado `#2bd67b` é próximo do lima; decidir na etapa de branding se vira lima ou continua distinto.
- Pop-ups de decisão e cores por gravidade (vermelho para expulsão, etc.).
- Layout, tipografia (`system-ui`), espaçamentos e responsividade: validados com 0 problemas nas 6 larguras.
- Engine e regras: nunca por motivo de branding.

## Não fazer agora

Redesign completo, nova logo, animações, splash screen, tela de abertura, nova tipografia, site de marketing, loja,
mercado, transferências, multiplayer, elenco real, API, backend, analytics, novas regras.
