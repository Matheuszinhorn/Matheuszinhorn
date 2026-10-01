# Universos de dados (V1.1)

Infraestrutura para o ELITE MANAGER jogar com elencos reais sem mudar o engine. Primeiro universo:
**Brasileirão 2026 — Série A**. Branch `feature/real-rosters-2026`; **ainda não ligado à carreira**: o jogo da V1
continua usando o universo fictício.

## Conceitos

| Conceito | O que é | Arquivo |
|---|---|---|
| **Universe** | Um mundo de jogo de uma temporada: competições, clubes, jogadores e fontes. | `universe.json` (manifesto) |
| **Competition** | Uma competição do universo (id, nome, temporada, país, divisão, clubes). | `competition.json` |
| **Club** | Clube com id estável entre temporadas (`br-palmeiras`), nome, nome oficial, competição, divisão, cidade, estado, estádio e cores. Identidade no jogo: nome + cor; sem escudo obrigatório. | `clubs.json` |
| **Player** | Jogador com id estável (`p-<hash>`), `fullName` (referência), `nickname` (apelido da fonte), `displayName` (o nome que o jogo mostra), `clubId`, posição GOL/DEF/MEI/ATA, número, idade, nacionalidade, força 1–50, status e observações. Sem outros atributos. | `players.json` |
| **Source** | De onde veio cada dado (fonte principal ou de conferência). Todo clube e jogador aponta para uma. | `sources.json` |

O **elenco** de um clube não é repetido em `clubs.json`: é o conjunto de jogadores com aquele `clubId` (montado
na carga).

## Onde fica

```
data/
  model.ts                 tipos: Universe, Competition, UniverseClub, UniversePlayer, DataSource
  normalize.ts             normalização (nomes, posições, números, nacionalidade, observações, ids)
  validate.ts              validação com erros claros e sugestões
  import-json.ts           importação JSON (texto → validação → Universe); igual no Node e no navegador
  import/wikipedia-squads.ts  importador do formato bruto "wikipedia-fs-player"
  load-node.ts             leitura do disco (só testes e scripts)
  to-world.ts              Universe → World do engine (com perfil provisório explícito)
  registry.ts              lista de universos e o universo padrão
  universes/brasileirao-2026/
    universe.json  competition.json  clubs.json  players.json  sources.json
    raw/wikipedia-en-2026.raw.json   snapshot bruto da fonte, sem alteração
  tests/                   testes da camada (npm test)
scripts/build-universe.ts  RAW → normalize → validate → competition/clubs/players.json (npm run universe)
```

Fluxo: **fonte externa → raw → normalizer → validator → Universe → World (game model) → engine**. O engine não
conhece esta camada, não acessa a internet e não sabe se o jogador é real ou fictício: recebe `Club`/`Player`
válidos, como os do mundo fictício. Nada aqui roda no jogo publicado (o build não importa `data/`).

## Formato dos arquivos

`universe.json`
```json
{ "id": "brasileirao-2026", "name": "Brasileirão 2026", "season": 2026, "country": "Brasil",
  "competitions": ["brasileirao-a-2026"], "competitionFiles": ["competition.json"],
  "defaultCompetitionId": "brasileirao-a-2026", "primarySource": "cbf", "dataStatus": "texto livre" }
```

`competition.json`
```json
{ "id": "brasileirao-a-2026", "universeId": "brasileirao-2026", "name": "Campeonato Brasileiro Série A",
  "season": 2026, "country": "Brasil", "division": 1, "clubs": ["br-athletico-pr", "..."] }
```

`clubs.json` (lista)
```json
{ "id": "br-palmeiras", "name": "Palmeiras", "fullName": "Sociedade Esportiva Palmeiras",
  "competitionId": "brasileirao-a-2026", "division": 1, "city": "São Paulo", "state": "São Paulo",
  "stadium": { "name": "Nubank Parque", "capacity": 43713 }, "colors": null,
  "source": { "source": "wikipedia-en", "ref": "enwiki:SE Palmeiras", "confirmedByPrimary": false } }
```

`players.json` (lista)
```json
{ "id": "p-7888c289", "fullName": null, "nickname": null, "displayName": "Alexander Barboza",
  "clubId": "br-palmeiras", "position": "DEF", "number": 2,
  "age": null, "nationality": "Argentina", "strength": null, "status": "ATIVO", "notes": null,
  "source": { "source": "wikipedia-en", "ref": "enwiki:Alexander Barboza", "confirmedByPrimary": false } }
```

`null` sempre significa **ausente na fonte**, nunca "zero" ou "padrão".

## Nome do jogador: regra oficial

O jogo exibe **somente `displayName`**, calculado por `resolveDisplayName`:

- se a fonte tem o campo **Apelido** e ele não está vazio → `displayName = apelido`;
- senão → `displayName` = nome disponível (nome completo ou o nome que a fonte mostra).

| Nome (fonte) | Apelido (fonte) | `fullName` | `displayName` |
|---|---|---|---|
| Gustavo Martins de Souza Santos | G. Martins | Gustavo Martins de Souza Santos | **G. Martins** |
| Jeferson Forneck | Jefinho | Jeferson Forneck | **Jefinho** |
| Carlos Eduardo Lima | (vazio) | Carlos Eduardo Lima | **Carlos Eduardo Lima** |

- `fullName` é só referência: fica no universo e **não** vai para o `World` (o adaptador grava `displayName` em
  `Player.name`). Como o engine e todas as telas leem `Player.name` (escalação, MEU TIME, partida, gols, cartões,
  lesões, substituições), o nome completo não aparece no jogo. Qualquer narrativa futura deve partir do mesmo campo.
- O validador recusa (`DISPLAY_NAME_MISMATCH`) um `displayName` diferente do apelido quando o apelido existe.
- Brasileirão 2026: a Wikipédia não tem campo "Apelido" nem nome civil no elenco; mostra o nome esportivo.
  Por isso, nos 644 jogadores, `fullName` e `nickname` são `null` e `displayName` é o nome da fonte. Quando a
  fonte primária (CBF/BID, que tem "Nome" e "Apelido") for importada, os dois campos passam a ser preenchidos.
- **Na interface, o `displayName` aparece inteiro** ("Felipe Anderson", "João Pedro", "G. Martins", "Jefinho"),
  sem segunda abreviação. O mundo gerado por `universeToWorld` leva a marca `nameStyle: 'display'`; a cada
  desenho, `app/src/views/shell.ts` informa o mundo atual a `useNamesOf` e `shortName` (`app/src/format.ts`)
  devolve o nome sem mudança. A marca é um campo extra do objeto (o engine não a lê) e sobrevive às cópias do
  mundo (`{ ...world }`) e ao save em JSON. O mundo fictício da V1 não tem a marca e continua abreviado como
  antes ("Thiago Pacheco Lopes" → "T. Lopes").
- No campo do MEU TIME, a etiqueta do jogador tem largura fixa. Com nomes de universo (classe `names-full` no
  `.shell`), ela quebra em linhas em vez de cortar com "…", e o campo não recorta a etiqueta do goleiro na borda.
  Medido nos 644 nomes reais (390 px): 311 cabem em 1 linha, 332 em 2 e 1 em 3 ("Gabriel Knesowitsch").

## Normalização (`data/normalize.ts`)

- **Nomes:** remove marcação de wiki (`[[alvo|texto]]` → texto), espaços duplicados e não separáveis; Unicode NFC.
  Acentos são mantidos.
- **Posições:** aceita os códigos do jogo (GOL, DEF, MEI, ATA) e o vocabulário fixo da fonte (GK, DF, MF, FW).
  Qualquer outro código (VOL, ZAG, LAT, PE...) **não** é convertido: passa ao validador, que aponta o erro e sugere.
- **Número e idade:** vazio → `null`; inteiro em texto → número; o resto passa ao validador.
- **Nacionalidade:** códigos FIFA e nomes em inglês → nome em português (ex.: `URU` → Uruguai).
- **Observações:** "captain" → capitão, "on loan from X" → emprestado por X, ordinais (2º vice-capitão).
- **Ids:** clube = `br-<slug>` (estável entre temporadas). Jogador = `p-` + hash do identificador do jogador na
  fonte (ex.: `enwiki:Alexander Barboza`); o nome nunca é a chave. Sem identificador na fonte, o hash usa
  clube + nome e o registro fica com `source.ref = null` (7 casos hoje, listados abaixo).

## Validação (`data/validate.ts`)

Erros (impedem montar o universo): arquivo inválido, campo obrigatório ausente, competição inexistente ou
repetida, clube inexistente, `clubId` duplicado, clube fora da competição, jogador sem `clubId`, `playerId`
duplicado, jogador duplicado (mesmo nome no clube ou mesmo jogador da fonte em dois registros), posição inválida,
força fora de 1–50, número fora de 1–99, idade fora de 14–50, status inválido, elenco com menos de 11 jogadores,
elenco sem goleiro. Avisos (não impedem): número repetido no clube, fonte não cadastrada.

Formato da mensagem:

```
ERROR:
c-a-p6
posição inválida: "VOL"

Sugestão:
MEI
```

## Origem dos dados — Brasileirão 2026

| Papel | Fonte | Situação |
|---|---|---|
| **Principal** | CBF (tabelas da Série A 2026 e BID) | **Não consultada.** `www.cbf.com.br` e `bid.cbf.com.br` falharam na conexão a partir do ambiente de desenvolvimento (01/10/2026). Nenhum registro tem `confirmedByPrimary = true`. |
| **Conferência** | Wikipédia em inglês: artigo "2026 Campeonato Brasileiro Série A" (clubes, cidade, estado, estádio, capacidade) e os 20 artigos de clube (elenco principal) | Snapshot de 01/10/2026 em `raw/wikipedia-en-2026.raw.json`, com URL e revisão de cada artigo. Lista dos 20 clubes conferida também em busca na web (Flashscore). |

Elenco = primeira seção do artigo do clube com `{{Fs player}}` ("First-team squad", "Current squad"...). Ficam de
fora base, reservas e jogadores emprestados **a outros** clubes. Jogadores emprestados **ao** clube entram, com a
observação "emprestado por X".

## Limitações (dados ausentes ou provisórios)

| Dado | Situação |
|---|---|
| Confirmação pela CBF | Pendente para os 20 clubes e 644 jogadores. |
| Força ELITE MANAGER | **Ausente (`null`) para todos.** Não há metodologia definida; nada foi copiado de outro jogo ou site. |
| Idade | Ausente para todos (a fonte de elenco não informa). |
| Cores dos clubes | Ausentes: o campo de uniforme da fonte é só a cor de base sob o desenho da camisa (ex.: o Athletico aparece "branco"); usá-lo seria inventar. |
| Número da camisa | Ausente para 3: Patrick (Red Bull Bragantino), João Lucas (Remo), Ignacio Laquintana (Vitória). |
| Identificador na fonte | Ausente para 7 (id por clube + nome): Alejandro Ararat e Benassi (Coritiba), Athos (Grêmio), João Pedro e Felipe Preis (São Paulo), Pablo e Walace Falcão (Vasco da Gama). |
| Atualidade | Elencos mudam durante a temporada (janelas, empréstimos): o snapshot vale para 01/10/2026. |

**Força: continua `null` nos 644 jogadores** até a metodologia oficial do ELITE MANAGER. Não existe perfil
provisório no código de produção. O engine exige campos que a fonte não tem, então converter o universo em
`World` só funciona com um `ProvisionalProfile` passado **explicitamente**; sem ele, a conversão falha dizendo o
que falta. O único perfil existente é **de teste técnico** (`data/tests/provisional-test-profile.ts`: força 25,
idade 25, temperamento Normal, salário R$ 10.000/rodada, caixa R$ 10 milhões, reputação 50, cores
marinho/off-white, 4-4-2). Ele só preenche o `World` daquela conversão, nunca altera `players.json`, e serve
apenas para provar que o engine aceita os dados: **não é força oficial nem balanceamento**.

## Seleção de universo (`data/registry.ts`)

`DEFAULT_UNIVERSE_ID = 'ficticio-v1'` (o mundo gerado por seed da V1, idêntico a `generateWorld`). O universo
`brasileirao-2026` está registrado com `careerReady: false`. Trocar o padrão é uma decisão de produto explícita.

**Pendente de decisão antes de ligar à carreira:** a carreira da V1 tem 4 divisões × 20 clubes, acesso e
rebaixamento, e começa na 4ª divisão. O universo real tem hoje só a Série A. Opções: (a) esperar Séries B, C e D;
(b) Série A real + divisões fictícias; (c) modo de uma divisão (exige mudanças em `game/`). Também é preciso
decidir a força (metodologia) antes de qualquer partida "de verdade".

## Como adicionar uma nova temporada

1. Criar `data/universes/<universo>-<ano>/` (ex.: `brasileirao-2027`) com `universe.json` e `sources.json`.
2. Salvar o snapshot bruto em `raw/`, sem alterar o conteúdo da fonte, com URL e data/revisão.
3. Registrar a receita em `scripts/build-universe.ts` (arquivo bruto + competição) e rodar
   `npm run universe -- <universo>-<ano>`: ele normaliza, grava `competition.json`, `clubs.json`, `players.json`
   e valida (sai com erro se houver ERROR).
4. Os ids de clube não mudam entre temporadas (`br-palmeiras`); os de jogador também não, enquanto a fonte mantiver o mesmo identificador.
5. Adicionar o universo a `UNIVERSES` em `data/registry.ts` e testes em `data/tests/`.

## Como adicionar uma nova competição

- **Mesmo universo** (ex.: Série B 2026): novo arquivo de competição (ex.: `competition-serie-b.json`), listado em
  `competitions` e `competitionFiles` do `universe.json`; clubes com `competitionId` e `division` dessa
  competição; jogadores normalmente. O adaptador `universeToWorld` converte uma competição por vez (uma divisão);
  juntar várias divisões num só `World` é o passo seguinte, quando houver mais de uma.
- **Outro país** (Argentina, Inglaterra...): novo universo; o prefixo do id de clube vem do país
  (`clubIdFor(country, slug)`).
- **Outro formato de fonte** (CSV, XLSX, outro site): novo importador em `data/import/` que produza os mesmos
  registros (`UniverseClub`, `UniversePlayer`). Normalização e validação são as mesmas.
- **Universo personalizado** (ex.: "Meu Universo" importado de planilha): mesmo caminho — importar, validar, jogar.
  Não implementado nesta etapa; a arquitetura já separa importação, validação e conversão.
