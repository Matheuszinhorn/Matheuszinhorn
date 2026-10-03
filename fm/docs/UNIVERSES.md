# Universos de dados (V1.1 + universo real CBF)

Infraestrutura para o ELITE MANAGER jogar com elencos reais sem mudar o engine. Primeiro universo:
**Brasileirão 2026 — Série A**, com a CBF como fonte principal desde 03/10/2026. **Ainda não ligado à carreira**:
o jogo continua usando o universo fictício (padrão), e trocar o padrão exige autorização.

## Conceitos

| Conceito | O que é | Arquivo |
|---|---|---|
| **Universe** | Um mundo de jogo de uma temporada: competições, clubes, jogadores e fontes. | `universe.json` (manifesto) |
| **Competition** | Uma competição do universo (id, nome, temporada, país, divisão, clubes). | `competition.json` |
| **Club** | Clube com id estável entre temporadas (`br-palmeiras`), nome, nome oficial, competição, divisão, cidade, estado, estádio e cores. Identidade no jogo: nome + cor; sem escudo obrigatório. | `clubs.json` |
| **Player** | Jogador com id estável (`p-cbf-<id do atleta na CBF>`), `fullName` (nome civil, referência), `nickname` (apelido da CBF), `displayName` (o nome que o jogo mostra), `clubId`, posição GOL/DEF/MEI/ATA, número, idade, nacionalidade, força 1–50, status e observações. Sem outros atributos. | `players.json` |
| **Source** | De onde veio cada dado (fonte principal ou de conferência). Todo clube e jogador aponta para uma. | `sources.json` |

O **elenco** de um clube não é repetido em `clubs.json`: é o conjunto de jogadores com aquele `clubId`, `status`
ATIVO e posição informada (montado na carga). Jogador TRANSFERIDO (a CBF diz que o clube atual é outro) ou sem
posição em nenhuma fonte fica no arquivo, com o motivo, mas fora do elenco jogável.

Campos acrescentados nesta etapa (todos opcionais; saves e universo fictício não mudam): clube `country`,
`colorsSource`, `externalIds`; jogador `birthDate`, `externalIds`, `fieldSources` (origem de cada campo que não veio
da fonte principal), `strengthMethodVersion`, `strengthNotes` (docs/PLAYER-RATINGS.md). Clubes **não**
têm escudo, logo nem imagem: a identidade é nome, cidade, estado, país, divisão e cores (primária, secundária,
destaque), usadas só como contexto; a marca do jogo continua marinho #071522, lima #B3FA46 e off-white #F2F4ED.

## Onde fica

```
data/
  model.ts                 tipos: Universe, Competition, UniverseClub, UniversePlayer, DataSource
  normalize.ts             normalização (nomes, posições, números, nacionalidade, observações, ids)
  validate.ts              validação com erros claros e sugestões
  import-json.ts           importação JSON (texto → validação → Universe); igual no Node e no navegador
  import/wikipedia-squads.ts  importador do formato bruto "wikipedia-fs-player" (conferência)
  import/cbf-squads.ts     importador do snapshot do site da CBF (fonte principal)
  rating/em-rating-2.ts    metodologia de força EM-RATING-2.0, própria, só fatos da CBF (docs/PLAYER-RATINGS.md)
  rating/em-rating-2-inputs.ts  entradas da 2.0 a partir do snapshot da CBF
  curation.ts              curadoria rastreável (posição), separada do dado factual
  import/matching.ts       ligação entre fontes por nome e data de nascimento
  competition-rules.ts     regras por competição (CompetitionRules): Brasil 2026 e universo fictício
  load-node.ts             leitura do disco (só testes e scripts)
  to-world.ts              Universe → World do engine (com perfil provisório explícito)
  registry.ts              lista de universos e o universo padrão
  universes/brasileirao-2026/
    universe.json  competition.json  clubs.json  players.json  sources.json
    raw/cbf-2026.raw.json            snapshot da CBF (times + páginas de atleta), sem alteração
    raw/wikipedia-en-2026.raw.json   snapshot bruto da conferência, sem alteração
    raw/club-colors.curated.json     cores curadas dos 20 clubes
    curation/positions.csv           curadoria de posição: uma linha por atleta (897 pendentes)
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
  "stadium": { "name": "Nubank Parque", "capacity": 43713 },
  "colors": { "primary": "#006437", "secondary": "#FFFFFF", "accent": "#FFFFFF" },
  "source": { "source": "cbf", "ref": "cbf:time:20002", "confirmedByPrimary": true },
  "country": "Brasil", "colorsSource": "curadoria-elite-manager", "externalIds": { "cbf": "20002" },
  "fieldSources": { "city": "wikipedia-en", "state": "wikipedia-en", "stadium": "wikipedia-en" } }
```

`players.json` (lista)
```json
{ "id": "p-cbf-353568", "fullName": "Rodinei Marcelo de Almeida", "nickname": "Rodinei", "displayName": "Rodinei",
  "clubId": "br-santos", "position": "DEF", "number": 23, "age": 34, "nationality": "Brasil",
  "strength": null, "status": "ATIVO", "notes": null,
  "source": { "source": "cbf", "ref": "cbf:atleta:353568", "confirmedByPrimary": true },
  "birthDate": "1992-01-29", "externalIds": { "cbf": "353568" },
  "fieldSources": { "position": "wikipedia-en", "nationality": "wikipedia-en", "number": "wikipedia-en" },
  "rating": null,
  "strengthMethodVersion": null, "strengthNotes": null }
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
- Brasileirão 2026: a CBF publica "Nome" (civil) e "Apelido". Os 897 atletas têm apelido, então `displayName`
  é o apelido como a CBF o escreve (inclusive caixa alta e sem acento: "ELIASSON", "Gustavo Gomez"). Nada é
  trocado pelo nome civil nem inventado. Antes desta etapa, com a Wikipédia, `fullName` e `nickname` eram `null`.
- **Na interface, o `displayName` aparece inteiro** ("Felipe Anderson", "João Pedro", "G. Martins", "Jefinho"),
  sem segunda abreviação. O mundo gerado por `universeToWorld` leva a marca `nameStyle: 'display'`; a cada
  desenho, `app/src/views/shell.ts` informa o mundo atual a `useNamesOf` e `shortName` (`app/src/format.ts`)
  devolve o nome sem mudança. A marca é um campo extra do objeto (o engine não a lê) e sobrevive às cópias do
  mundo (`{ ...world }`) e ao save em JSON. O mundo fictício da V1 não tem a marca e continua abreviado como
  antes ("Thiago Pacheco Lopes" → "T. Lopes").
- No campo do MEU TIME, a etiqueta do jogador tem largura fixa. Com nomes de universo (classe `names-full` no
  `.shell`), ela quebra em linhas em vez de cortar com "…", e o campo não recorta a etiqueta do goleiro na borda.
  Medição de 01/10/2026 com os 644 nomes da Wikipédia (390 px): 311 cabem em 1 linha, 332 em 2 e 1 em 3. Os
  apelidos da CBF são em geral mais curtos; a medição não foi refeita nesta etapa.

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
elenco sem goleiro (o elenco conta só ATIVOS com posição), data de nascimento fora do formato AAAA-MM-DD.
Avisos (não impedem): número repetido no clube, fonte não cadastrada, posição ausente em todas as fontes
(`POSITION_MISSING`: o jogador fica fora do elenco jogável, nunca recebe posição estimada).

Formato da mensagem:

```
ERROR:
c-a-p6
posição inválida: "VOL"

Sugestão:
MEI
```

## Origem dos dados — Brasileirão 2026

Coleta: **02/10/2026 23:51 a 03/10/2026 00:28 (UTC)**. A 2ª janela terminou em 11/09/2026; a CBF ainda aceita
inscrições depois dela, dentro do regulamento. Por isso o elenco vale para a data da coleta.

| Papel | Fonte | O que dá |
|---|---|---|
| **Principal** | CBF: páginas dos 20 times da Série A 2026 e as 898 páginas de atleta (`raw/cbf-2026.raw.json`) | id do atleta, nome civil, **apelido**, data de nascimento e **clube atual** (`atleta_time_atual`). Todo jogador tem `confirmedByPrimary: true`. |
| **Conferência** | Wikipédia em inglês (snapshot de 01/10/2026) | cidade, estado e estádio do clube; posição, número e nacionalidade do jogador, só quando ele é identificado **mútua e unicamente** no mesmo clube (`fieldSources`). |
| **Curadoria** | ELITE MANAGER | posição OFICIAL de todos os atletas (`curation/positions.csv`, rastreável; a Wikipédia aparece só como referência auxiliar do curador). |
| **Curadoria** | ELITE MANAGER | cores dos clubes (`raw/club-colors.curated.json`). |

Acesso à CBF: o servidor `www.cbf.com.br` envia a cadeia TLS com o intermediário errado. A coleta validou o
certificado com o intermediário correto (Sectigo Public Server Authentication CA OV R36, obtido do endereço AIA e
conferido contra as raízes do sistema), **sem desligar a verificação**. O BID (`bid.cbf.com.br`) não foi acessível.

Regras do importador CBF (`data/import/cbf-squads.ts`):
- **Nome exibido = apelido da CBF**, escrito como a CBF escreve (ex.: "Gustavo Gomez", "ELIASSON"). Não é trocado
  pelo nome civil nem "corrigido". Os 897 têm apelido.
- **Clube atual**: se a CBF diz que o atleta está em outro clube, ele fica `TRANSFERIDO`, com
  `notes: "clube atual na CBF: X"`. Um atleta inscrito por dois clubes da Série A vira um registro só, no clube atual.
- **Idade**: anos completos na data da coleta. Um registro da lista de atletas com 65 anos (Juan Carlos Osorio, Remo,
  provavelmente comissão técnica) ficou fora do universo e aparece no relatório (`foraDoUniverso`).
- **Ligação com a Wikipédia**: primeiro por nome idêntico, depois pelas regras de nome compatível, sempre mútua e
  única. Um jogador da Wikipédia nunca vale para dois atletas: "Gabriel" e "Gabriel Girotto" no mesmo clube
  davam o número e a posição de um ao outro antes dessa regra.

## Números do universo (03/10/2026)

| | |
|---|---|
| Clubes | 20 (cores curadas; sem escudo) |
| Atletas | 897: 768 ATIVOS e 129 TRANSFERIDOS |
| Posição | curadoria (oficial): 0 de 897 preenchidas · Wikipédia (não oficial; ainda usada no elenco jogável do universo) 594 · **nenhuma referência 303** (175 deles ATIVOS) |
| Elenco jogável (ATIVO com posição) | 593 (GOL 70 · DEF 191 · MEI 174 · ATA 158) |
| Sem apelido / sem fonte principal | 0 / 0 |
| Ratings de terceiros | nenhum (EA FC removido do repositório em 03/10/2026) |
| Força aplicada | **0**: todos com `strength: null` (docs/PLAYER-RATINGS.md) |
| Idade | 16 a 46 anos, média 25,8 |
| Atletas da Wikipédia que a CBF não lista no clube | 79 (não entram: a fonte principal manda) |

## Limitações (dados ausentes ou provisórios)

| Dado | Situação |
|---|---|
| Força ELITE MANAGER | **Ausente (`null`) para todos.** A EM-RATING-2.0 (própria, só fatos da CBF) está em calibração (modelos A/B/C), sem aplicar (docs/PLAYER-RATINGS.md, reports/em-rating-2.0-calibracao.md). |
| Posição | A CBF não publica. 291 atletas sem posição em nenhuma fonte (base, reservas, recém-chegados) ficam fora do elenco jogável, nunca estimados. |
| Número e nacionalidade | Só da Wikipédia, quando a ligação é segura. |
| Cores | Curadoria, não dado oficial (`colorsSource: "curadoria-elite-manager"`). |
| Séries B, C e D | Não importadas; regras em `data/competition-rules.ts` marcadas `confirmed: false`. |
| Atualidade | Vale para a data da coleta; inscrições depois da janela mudam elencos. |

O universo ainda não tem força oficial. Por isso converter em `World` só funciona com um `ProvisionalProfile`
passado **explicitamente** (`data/tests/provisional-test-profile.ts`, força 25, só para teste técnico). Sem ele, a
conversão falha e diz o que falta. Esse perfil não é força oficial nem balanceamento e nunca altera `players.json`.

## Regras por competição (`data/competition-rules.ts`)

Cada competição tem as próprias `CompetitionRules`: clubes, formato, acesso, rebaixamento, janelas, inscrição,
`confirmed`, fonte e notas. `LeagueSystem` é a pirâmide de um país ou universo, e `checkLeagueSystem` confere a
coerência (rodadas = 2 × (clubes − 1) em pontos corridos; quem cai de uma divisão = quem sobe da de baixo; o topo não
sobe; a base não cai).

- **Brasil 2026:**
  - Série A: 20 clubes, 38 rodadas, 4 rebaixados, 2ª janela até 11/09/2026. Confirmada; só a data de início da
    janela não foi conferida.
  - Série B: 20 clubes, 4 sobem e 4 caem. `confirmed: false`.
  - Séries C e D: formato com fases. `confirmed: false`; o número de clubes da D é desconhecido (`clubs: 0`).
- **Universo fictício:** 4 divisões × 20 clubes, 38 rodadas, 4 sobem e 4 caem. São as regras que o jogo já usa e que
  não mudam.
- Outra liga traz as próprias regras. Nada é global. Esta camada é dado: o engine não a lê, e a carreira atual não
  muda.

## Seleção de universo (`data/registry.ts`)

`DEFAULT_UNIVERSE_ID = 'ficticio-v1'` (o mundo gerado por seed da V1, idêntico a `generateWorld`). O universo
`brasileirao-2026` está registrado com `careerReady: false`. Trocar o padrão é uma decisão de produto explícita.

**Pendente de decisão antes de ligar à carreira:** a carreira da V1 tem 4 divisões × 20 clubes, acesso e
rebaixamento, e começa na 4ª divisão. O universo real tem hoje só a Série A. Opções: (a) esperar Séries B, C e D;
(b) Série A real + divisões fictícias (atenção: na amostra convertida, a Série A fica no nível da 2ª divisão
fictícia, docs/PLAYER-RATINGS.md); (c) modo de uma divisão (exige mudanças em `game/`). Também é preciso decidir o
caminho da força antes de qualquer partida "de verdade".

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
