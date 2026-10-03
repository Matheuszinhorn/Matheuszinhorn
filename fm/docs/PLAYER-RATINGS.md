# Força dos jogadores — metodologia EM-RATING

Como o ELITE MANAGER define a **força (1–50)** de um jogador real. Código: `data/rating/em-rating.ts`.
Testes: `data/tests/ratings.test.ts`. Esta etapa **não aplicou** a força a ninguém: todos os jogadores do universo
real continuam com `strength: null`. A conversão só foi **simulada**
(`data/universes/brasileirao-2026/ratings/EM-RATING-1.0.simulacao.json`, `applied: false`). O motivo está em
[Situação atual](#situação-atual-não-aplicar).

## Princípios

- **A força é do ELITE MANAGER.** Uma referência externa só calibra. O jogo nunca mostra nem usa o número da fonte.
- **Regra fixa, sem IA nem sorteio.** A mesma entrada com a mesma versão dá a mesma força, e a trilha do cálculo
  (base e ajustes) fica gravada junto.
- **Versionada.** Cada força aplicada guarda a versão do método (`strengthMethodVersion`) e a referência usada
  (`rating`: fonte, edição, id na fonte, Overall, data da coleta, regra de ligação). Uma nova edição (FC 27, FC 28)
  ou uma nova versão do método recalcula tudo sem perder o histórico.
- **Nada estimado.** Jogador sem referência fica **sem força** (`null`). A força não é deduzida da divisão, do
  salário, da idade nem do clube.
- **O engine não muda.** Ele continua lendo só `strength` (1–50). Esta camada é dado e não conhece o motor.

## Por que o EA SPORTS FC 26

É a única base pública e ampla com a mesma régua para milhares de jogadores: 17.873 na API pública de ratings da EA,
coletada em 02/10/2026. O **Overall** já é calculado por posição (o de goleiro sai dos atributos de goleiro) e é
conhecido do público, o que torna a calibração fácil de conferir.

**Edição:** a API (`drop-api.ea.com/rating/ea-sports-fc`) serve a base do FC 26. Os valores do topo coincidem com os
de lançamento do FC 26. O prefixo "FC25" nas imagens é legado da CDN. Lote registrado como
`FC26-api-2026-10-02` (`ratingSourceVersion`).

### Limitações da referência

| Limitação | Consequência |
|---|---|
| **Não há clubes brasileiros** no FC 26 (sem licença do Brasileirão). | Só tem Overall quem jogava, na base de 2025/26, numa liga licenciada: europeias, MLS, Argentina, Uruguai, Colômbia, Ásia... |
| A base é de uma data fixa (lançamento + atualizações). | Jogadores que mudaram de nível desde então ficam desatualizados. |
| O Overall é de um videogame, com critérios próprios. | Serve de calibração, não de verdade. Por isso a força tem escala e nome próprios. |
| A ligação CBF × EA exige nome e data de nascimento. | Ver [Ligação](#ligação-entre-a-cbf-e-a-referência). |

## Conversão EM-RATING-1.0

**Força = Overall − 42, limitada a 1–50.** Ponto de partida: a tabela por faixas proposta pelo proprietário. Escrita
como uma linha, ela fica igual faixa a faixa:

| Overall EA FC 26 | Força ELITE MANAGER |
|---|---|
| 90+ | 48–50 (92 ou mais satura em 50) |
| 86–89 | 44–47 |
| 82–85 | 40–43 |
| 78–81 | 36–39 |
| 74–77 | 32–35 |
| 70–73 | 28–31 |
| 66–69 | 24–27 |
| 62–65 | 20–23 |
| 58–61 | 16–19 |
| 54–57 | 12–15 |
| 50–53 | 8–11 |
| abaixo de 50 | 1–7 (43 ou menos vira 1) |

O teste 7–8 confere cada Overall de 1 a 99 contra as faixas.

### Análise da tabela

- **Linear, 1 ponto por 1 ponto.** Não comprime o topo nem estica a base, e é a regra mais simples de auditar.
- **O deslocamento amplia as razões.** O modelo de chance do engine compara as forças por **razão** (ataque/defesa,
  própria/rival). Subtrair 42 aumenta a diferença relativa: Overall 80 contra 70 é uma razão de 1,14; como força,
  38 contra 28, a razão vira 1,36. Isso deixa as partidas entre níveis diferentes mais desiguais do que o Overall
  sugere. É uma consequência a medir no balanceamento antes de ligar o universo à carreira, não um defeito a
  esconder.
- **Calibração contra o mundo fictício.** A 1ª divisão fictícia tem média 37–38 (24 a 50), a 2ª 30, a 3ª 22 e a 4ª
  16–17 (seeds de conferência). Na amostra real convertida, a média é 29,8 (20 a 38). Comparada à força fictícia, a
  Série A ficaria no nível de uma 2ª divisão. Isso pesa se o universo real for misturado com divisões fictícias
  (opção (b) em UNIVERSES.md).
- **O limite de 50 só é atingido acima de 91.** No FC 26 isso é um punhado de jogadores no mundo. Nenhum está no
  Brasileirão.

### Posição

A versão 1.0 **não ajusta por posição**: o Overall da fonte já é por posição. Os passos de ajuste (`steps`) são
gravados mesmo vazios, para que uma versão futura acrescente uma regra sem esconder nada. A posição do ELITE MANAGER
(GOL/DEF/MEI/ATA) vem da fonte de conferência. Sem ela, vem da posição curta do EA (GK→GOL; CB/LB/RB/LWB/RWB→DEF;
CDM/CM/CAM/LM/RM→MEI; LW/RW/ST/CF→ATA), com a origem gravada em `fieldSources.position`.

### Extremos

- Overall fora de 1–99 ou não inteiro: **erro**, nunca "corrigido".
- 92+ → 50; 43 ou menos → 1. O teste 6 cobre todo Overall possível.

### Jogadores sem referência

Ficam com `strength: null`, `rating: null` e `strengthMethodVersion: null`, e não aparecem na simulação. Não recebem
média do clube, da divisão nem da posição: **não existe força inventada**.

## Divisões

**A divisão não reduz a força.** Um jogador forte numa divisão menor continua forte (teste 16). O que segura a ida dele
para um clube pequeno é **econômico**: salário, caixa e personalidade nas regras do mercado. Não existe barreira
"divisão X não contrata jogador Y" (teste 17). Também não há um piso ou teto de força por divisão.

## Evolução

A camada de evolução existente (docs/PLAYER-PROGRESSION.md: checkpoints na rodada 19 e na virada, ±1) **não muda**.
A força inicial vem da metodologia. Depois disso, quem a move é a evolução do jogo, não uma nova leitura da fonte no
meio da carreira. Recalibrar (FC 27) vale para **novos** universos e temporadas, nunca para uma carreira em andamento.

## O que não muda no Engine

Nada. O engine 0.2.0 recebe `Player.strength` (1–50) como sempre. O teste 14 grava a impressão digital (sha256) das
22 fontes do engine (`da6749ed…5b35a`): qualquer mudança nelas quebra o teste. RNG, seed, modelo de chance, mando,
conversão, minutos e decisões continuam os mesmos.

## Ligação entre a CBF e a referência

A ligação é determinística e conservadora (`linkByBirthAndName`, `namesCompatible`). Ela exige:

1. **Mesma data de nascimento** (CBF DD/MM/AAAA, EA M/D/AAAA, ambas convertidas para ISO).
2. **Nome compatível** entre o apelido ou nome civil da CBF e o nome comum ou nome completo do EA. Vale uma destas
   regras:
   - igual, sem acento e sem caixa;
   - uma palavra de 4 letras ou mais contida no outro nome;
   - nome de 2 ou mais palavras contido na mesma ordem no outro ("Ignacio Sosa" em "Ignacio Sosa Ospital");
   - mesmo último sobrenome e mesma inicial.
3. **Um único candidato.** Com dois ou mais, fica "ambíguo" e sem ligação.

Na auditoria, a regra "sobrenome do EA sozinho" foi **removida**. Ela gerava ligações falsas: Kaiki Bruno da Silva
com Tomás Silva (Platense) e Gabriel Baralhas dos Santos com Thomas Santos (IFK Göteborg). Cada ligação gravada
mostra a regra usada (`matchedBy`).

## Situação atual (não aplicar)

Lote: CBF coletada em 02–03/10/2026, com 897 atletas (768 no clube e 129 transferidos segundo o clube atual da CBF),
mais o EA FC 26 de 02/10/2026.

| Medida | Valor |
|---|---|
| Atletas com Overall ligado | **72 de 897 (8%)**; 68 dos 768 no clube |
| Ligação por nascimento + nome | 72; "nascimento sem nome compatível": 681; "não encontrado": 188 |
| Força proposta (72) | média 29,8 · mediana 30 · mín. 20 · máx. 38 |
| Histograma | 20–24: 9 · 25–29: 24 · 30–34: 31 · 35–39: 8 |
| Por posição | GOL 31,2 (5) · DEF 30,4 (23) · MEI 29,9 (20) · ATA 28,7 (24) |
| Cobertura por clube | de 1 (Palmeiras, Bragantino) a 7 (Atlético-MG, Vasco) jogadores por elenco |
| Topo | Fred 80→38 · Lucas Paquetá 80→38 · Rodinei 79→37 · Renan Lodi 78→36 · Jhon Arias 78→36 |
| Base | Matheus Nascimento 63→21 · Franco Rossi 62→20 · Leo Perez 62→20 |

**Anomalias graves (critério do proprietário: "não aplique automaticamente se a distribuição apresentar anomalias
graves"):**

1. **Cobertura de 8%.** 825 atletas ficariam sem força, e nenhum clube teria nem metade de um time titular avaliado.
2. **Amostra enviesada.** Só tem Overall quem estava fora do Brasil ou numa liga sul-americana licenciada na base
   do FC 26: repatriados e estrangeiros. Quem joga no Brasil há anos, entre eles os destaques de cada elenco, fica
   sem referência. Aplicar a força assim faria "desconhecidos mais fortes que estrelas sem justificativa", situação
   que o critério de qualidade proíbe.
3. **Nível comparado ao fictício.** Com média 29,8, a Série A ficaria no nível da 2ª divisão fictícia. Isso só pode
   ser decidido junto com a forma de ligar o universo à carreira.

Por isso a **Fase 8 (aplicação) não foi executada**. Caminhos para o proprietário decidir:

- **(a) Esperar uma referência que cubra o Brasileirão**: uma edição com licença ou outra base pública de mesma
  régua. É a mesma metodologia, com outro `ratingSource`.
- **(b) EM-RATING-1.1 com uma segunda referência pública** para quem não tem Overall do EA. Precisa definir antes a
  fonte, a régua e a conversão entre réguas, e documentar e testar como a 1.0.
- **(c) Força por curadoria humana documentada** (lista revisável, com autor e data). Não é "IA decidiu": é uma
  fonte própria, `ratingSource: 'curadoria'`.
- **(d) Aplicar só aos 72**, com o restante `null`. **Não recomendado**: o universo não é jogável assim, e o viés do
  item 2 continua.

Qualquer caminho fica em `null` até a aprovação.

## Recalibração (FC 27, FC 28, nova versão do método)

1. Salvar o novo lote em `raw/` com `sourceVersion` próprio (ex.: `FC27-api-AAAA-MM-DD`), sem apagar o anterior.
2. Novo `RatingSource` (`'EA_FC_27'`) e, se a régua mudar, nova `EM_RATING_VERSION` (ex.: `EM-RATING-2.0`) com a
   nova tabela documentada aqui.
3. `npm run universe -- <universo>` regrava a simulação `ratings/<versão>.simulacao.json`.
4. Repetir o relatório desta página (cobertura, distribuição, anomalias) antes de aplicar.
5. Aplicar grava `strength`, `strengthMethodVersion` e `strengthNotes`. Carreiras em andamento não mudam.

## Campos

| Campo (jogador) | Significado |
|---|---|
| `rating` | Referência externa ligada (`source`, `sourceVersion`, `sourcePlayerId`, `overall`, `sourcePosition`, `retrievedAt`, `matchedBy`) ou `null`. |
| `strength` | Força 1–50 aplicada, ou `null`. Hoje é `null` em todos os jogadores reais. |
| `strengthMethodVersion` | Versão do método que gerou `strength` (ex.: `EM-RATING-1.0`). É obrigatória quando há força e referência (o validador cobra). |
| `strengthNotes` | Trilha do cálculo ("Overall 83 → base 41 (Overall − 42); sem ajustes"). |
| `externalIds` | `{ cbf, eaFc }`: ids nas fontes. |
| `fieldSources` | Origem de cada campo que não veio da fonte principal (`position`, `number`, `nationality`). |
