# Força dos jogadores — metodologia EM-RATING

Como o ELITE MANAGER define a **força (1–50)** dos jogadores do universo real.

- **Metodologia vigente:** EM-RATING-2.0 (experimental), em `data/rating/em-rating-2.ts` (fórmula) e
  `data/rating/em-rating-2-inputs.ts` (entradas da CBF).
- **Simulação:** `scripts/simulate-em-rating-2.ts` gera `reports/em-rating-2.0-simulation.json` (`applied: false`) e
  `reports/em-rating-2.0-report.md`.
- **Testes:** `data/tests/em-rating-2.test.ts`.

**Nada foi aplicado.** Todos os jogadores reais continuam com `strength: null`. O jogo continua no universo
fictício.

## Por que abandonamos ratings de terceiros

Decisão do proprietário de 03/10/2026: **a força não depende de ratings de terceiros**. EA SPORTS FC, Flashscore,
Opta, Transfermarkt e SofaScore ficam fora. Os motivos:

- **Propriedade.** Um rating de outra empresa é uma criação dela. Uma força derivada dele e distribuída no jogo
  carrega essa dependência.
- **Cobertura.** O EA FC 26 não tem clubes brasileiros: só 8% dos atletas da Série A tinham Overall, e a amostra era
  enviesada (EM-RATING-1.0, abaixo).
- **Coerência com o jogo.** A força é uma abstração do ELITE MANAGER e precisa ter regras do próprio jogo.

## Princípio

A força **não** é "o quanto alguém considera o jogador bom" e **não** mede talento real. É o quanto o jogador deve
representar na escala simplificada 1–50 do ELITE MANAGER, a partir dos fatos objetivos disponíveis e de regras do
próprio jogo.

## A CBF como fonte factual

Fonte única da fórmula: `data/universes/brasileirao-2026/raw/cbf-2026.raw.json`, coletado em 02–03/10/2026. Nenhuma
coleta nova foi feita nesta etapa. Campos por atleta:

| Fato | Campo bruto | Observação |
|---|---|---|
| Nascimento → idade | `birth` | Idade em anos completos na **data do snapshot** (fixa; nunca a data do relógio). |
| Temporadas com registro | `years` | Anos com registro do atleta no sistema da CBF. **A base começa em 2013** (máximo de 14). Não diz em que competição nem quantos jogos por ano. |
| Partidas e gols | `matches`, `goals` | Estatística da página "Série A 2026" do atleta: **da temporada 2026, não da carreira**. A CBF não documenta o recorte exato de competições (o máximo é 42 partidas). |
| Clube | `current`, inscrição | Clube atual e clube que o inscreveu na Série A 2026. |
| Competição | página | Todos os atletas são da Série A 2026: não há dados das Séries B, C e D. |

**Não existe na base:**
- **Posição** (a CBF não publica).
- **Minutos**, titularidade e assistências.
- **Partidas por temporada anterior.**
- **Carreira fora do Brasil ou antes de 2013.**
- **Cartões:** aparecem na página da CBF, mas não foram guardados no snapshot.

## Fórmula EM-RATING-2.0

Cada componente vale de 0 a 1. O índice é a média ponderada dos componentes **avaliados**:

```
índice = Σ (peso × valor) / Σ (peso)        (componente sem dado sai da conta e é sinalizado)
força  = arredondar(1 + 49 × índice), limitada a 1–50
```

| Componente | Peso | Valor (0–1) | O que representa |
|---|---|---|---|
| **Participação** | 40% | √(partidas na temporada ÷ maior número de partidas do clube) | Participação e recência na temporada atual. A raiz dá retorno decrescente. |
| **Experiência** | 20% | (1 − e^(−temporadas/4)) normalizado para 1 em 14 temporadas | Longevidade com retorno decrescente: 1 temporada vale 0,23, 4 valem 0,65, 8 valem 0,89 e 14 valem 1. Cem jogos nunca viram +100. |
| **Recência** | 10% | Temporadas com registro entre as 3 mais recentes (2024–2026) ÷ 3 | Evita que quem jogou muito há anos fique alto hoje. |
| **Idade** | 10% | Curva moderada: 0,6 até 17 anos → 1 de 24 a 31 → 0,6 aos 40 ou mais | Contexto de desenvolvimento. Do pior ao melhor ponto, move no máximo uns 5 pontos. |
| **Produção** | 15% | Gols ÷ (partidas + 5), comparado às âncoras da posição | Produção ofensiva relativa à posição (abaixo). |
| **Contexto** | 5% | Inscrito numa competição nacional da CBF → 1 | Na 2.0 é **igual para todas as séries**. |

### Produção por posição

O prior de 5 partidas no denominador impede que 1 gol em 1 jogo pareça artilharia. A taxa é comparada às âncoras da
posição por interpolação linear: 0 gols → 0, típico → 0,5, alto → 1.

| Posição | Típico (0,5) | Alto (1,0) |
|---|---|---|
| ATA | 0,075 | 0,26 |
| MEI | 0,03 | 0,12 |
| DEF | 0,025 | 0,09 |
| GOL | neutro fixo 0,5 | neutro fixo 0,5 |

- As âncoras são a **mediana** e o **p90** da posição entre quem tem 10 ou mais partidas, medidas **uma vez** na base
  CBF 2026 e gravadas na versão. Não são recalculadas a cada execução.
- **Goleiro:** os gols não contam nem a favor nem contra.
- **Defensor:** é comparado com defensores, não com atacantes.
- **Sem posição:** a produção não é avaliada (sai da conta) e o jogador fica marcado `POSICAO_AUSENTE` para curadoria.
  Nenhuma posição é deduzida.

Na primeira simulação, a produção funcionava só como bônus por alvo. Atacantes ficavam em média 5,6 pontos abaixo dos
goleiros (35,6 contra 41,2), porque o goleiro saía da conta e o atacante típico era puxado para baixo. Com as âncoras,
as médias por posição ficaram entre 37,2 e 38,9.

### Divisão e contexto

**A divisão não determina a força.** Não existe tabela do tipo "Série A +10, Série D +0". Um jogador forte numa
divisão inferior continua forte: o risco de contratá-lo aparece em salário, preço, negociação, interesse,
personalidade e caixa, nunca numa redução da força. Na 2.0, o contexto é igual em todas as séries. Quando houver dados
de outras divisões, uma versão futura poderá usar um contexto **moderado**, documentado e testado.

### Dados ausentes

Nada é estimado.
- **Sem partidas ou sem temporadas:** força `null`, com `DADOS_INSUFICIENTES` (2 atletas).
- **Sem idade:** o componente sai da conta (`IDADE_AUSENTE`).
- **Sem posição:** a produção sai da conta (`POSICAO_AUSENTE`).

### Determinismo

A fórmula é uma função pura: sem random, sem seed, sem relógio, sem rede, sem IA. A referência de temporada e de idade
é a data do snapshot. Rodar a simulação duas vezes gera arquivos idênticos byte a byte (conferido). O teste proíbe
`Math.random`, `Date.now`, `new Date(` e `fetch(` no código da fórmula.

## Curadoria

Usada só quando o dado factual não cobre uma necessidade. Hoje o único caso é a **posição**. A curadoria fica em
`data/universes/brasileirao-2026/curation/positions.csv`, separada do dado factual: ela nunca reescreve
`players.json`, é aplicada na hora do cálculo e a origem fica gravada (`positionSource: "curadoria"`).

| Coluna | Conteúdo |
|---|---|
| `playerId` | Id estável do jogador (`p-cbf-<id>`). |
| `displayName`, `clubId`, `birthDate` | Só para ajudar quem preenche (ignoradas na leitura). |
| `field` | `position` |
| `oldValue` | Valor atual (vazio = null). Se não bater com o universo, a linha é recusada: a curadoria não sobrescreve em silêncio um dado que mudou. |
| `newValue` | `GOL`, `DEF`, `MEI` ou `ATA`. Vazio = pendente (ignorada). |
| `fieldSource` | `curadoria` |
| `curator`, `date` (AAAA-MM-DD), `reason` | Obrigatórios numa linha preenchida. |

Exemplo:
`p-cbf-750895,Arthur Monteiro,br-athletico-pr,2009-09-10,position,,MEI,curadoria,equipe ELITE MANAGER,2026-10-03,"posição definida para permitir cálculo posicional"`

A planilha modelo tem **303 linhas pendentes**, uma para cada atleta sem posição em nenhuma fonte. Eram 291 antes
desta etapa; os 12 a mais tinham posição vinda do EA FC 26, que foi retirada.

**Decisão pendente.** Os outros 594 atletas têm posição da **Wikipédia** (fonte de conferência do universo), que
**não entra na fórmula oficial**. Para o cálculo posicional valer para todos, há dois caminhos: aceitar a Wikipédia
como fonte declarada da posição, ou curar também esses 594. A simulação mostra os dois cenários.

## Simulação (03/10/2026)

Os números completos estão em `reports/em-rating-2.0-report.md`. Cenários:
- **Oficial:** só CBF e curadoria. Nenhuma posição curada ainda, então a produção não é avaliada para ninguém.
- **Comparação:** CBF mais a posição da Wikipédia, declarada. Serve só para medir as regras por posição.

| | Oficial | Comparação |
|---|---|---|
| Calculados | 895 de 897 | 895 de 897 |
| Mín. / máx. | 14 / 50 | 14 / 50 |
| Média / mediana | 39,5 / 41 | 37,4 / 38 |
| p10 / p25 / p75 / p90 | 29 / 35 / 46 / 48 | 28 / 33 / 43 / 46 |
| 11–15 · 16–20 · 21–25 · 26–30 | 4 · 12 · 30 · 63 | 6 · 18 · 36 · 78 |
| 31–35 · 36–40 · 41–45 · 46–50 | 141 · 183 · 232 · 230 | 177 · 235 · 252 · 93 |
| Por posição (média) | sem posição: 39,5 | GOL 38,9 · DEF 38,0 · MEI 38,0 · ATA 37,2 · sem posição 36,5 |
| Por divisão | só Série A | só Série A |

As faixas 1–5 e 6–10 ficaram vazias nos dois cenários.

Exemplos (cenário de comparação):

| Faixa | Jogador | Posição | Idade | Temporadas | Partidas | Gols | Força |
|---|---|---|---|---|---|---|---|
| Muito baixa | Robson (Palmeiras) | ausente | 20 | 2 | 0 | 0 | 17 |
| Baixa | DARLAN (Vitória) | DEF | 23 | 1 | 28 | 1 | 32 |
| Média | RAMON SOSA (Palmeiras) | ATA | 27 | 2 | 25 | 6 | 38 |
| Alta | Renan Lodi (Atlético-MG) | DEF | 28 | 11 | 31 | 2 | 44 |
| Muito alta | J. Capixaba (Bragantino) | DEF | 29 | 13 | 25 | 3 | 49 |

Renan Lodi mostra a recência em ação: tem 11 temporadas registradas, mas só 1 das 3 mais recentes, porque esteve
fora do Brasil.

### Anomalias (listadas, não corrigidas)

1. **Topo saturado.** No cenário oficial, 52% dos atletas ficam com 41–50 e 12 chegam a 50. No de comparação, 39% e 6.
   Titular regular e experiente chega a 1,0 em quase todos os componentes, e **os dados não distinguem titular de
   destaque**. É o limite principal da base factual.
2. **Experiência subestimada (60 atletas).** Com 27 anos ou mais e no máximo 2 temporadas na base, a carreira anterior
   fica invisível (exterior ou antes de 2013). Exemplos: Aguirre, Portilla, Angelo Preciado, Guido Herrera, Ziyech.
3. **Sem posição.** 897 no cenário oficial e 303 no de comparação: a produção não é avaliada.
4. **Sem partidas em 2026 (15).** A força vem só de experiência e idade (ex.: Lezcano 14, Athos 14–17).
5. **Dados insuficientes (2).** Lautaro (Bahia) e Gabriel (Bragantino) não têm temporadas registradas: força `null`.
6. **Concentração.** 26–28% numa única faixa de 5 pontos.
7. **Divisões.** Diferença entre divisões não avaliável: só há a Série A.

Não apareceram:
- jogador com poucos dados e força 30 ou mais;
- 10 ou mais temporadas com força 20 ou menos;
- atacante com 8 ou mais gols e força abaixo de 30;
- goleiro afetado por gols.

### Sensibilidade

Cada peso multiplicado por 0,5 e por 1,5, um de cada vez, no cenário de comparação:

| Componente | Correlação com a força | Variação absoluta média (×0,5 / ×1,5) | Jogadores que mudam 3+ pontos |
|---|---|---|---|
| Participação | 0,83 | 1,4 / 0,9 | 138 / 40 |
| Produção | 0,56 | 1,0 / 0,9 | 141 / 83 |
| Experiência | 0,61 | 0,8 / 0,7 | 19 / 1 |
| Recência | 0,58 | 0,5 / 0,4 | 0 / 0 |
| Idade | 0,16 | 0,5 / 0,4 | 0 / 0 |
| Contexto | 0,00 (constante) | 0,3 / 0,3 | 0 / 0 |

- **A participação domina:** 15,5 pontos médios de contribuição, com desvio de 4,7.
- **A produção é o segundo fator de diferenciação,** só entre quem tem posição.
- Idade e contexto quase só deslocam a média.

Calibração com o mundo fictício: a média dos ATIVOS é 37,4–39,8, perto da 1ª divisão fictícia (37–38). A distribuição
é mais concentrada no topo.

## Versionamento

- `EM_RATING_2_VERSION = "EM-RATING-2.0"` vai em todo resultado (`methodVersion`).
- A configuração inteira fica congelada (`Object.freeze`) em `EM_RATING_2_0` e é gravada na simulação (`config`):
  pesos, curvas, âncoras, janelas e contexto.
- Mudar qualquer valor = **nova versão** (2.1, 3.0...), com nova simulação e novo relatório. A versão anterior não é
  apagada.
- Ao aplicar (etapa futura, com aprovação), cada jogador recebe `strength`, `strengthMethodVersion` e
  `strengthNotes` (a trilha dos componentes). Carreiras em andamento não mudam.

## Limitações conhecidas

- Partidas e gols medem participação e produção, **não talento**. A força 2.0 não distingue titular comum de
  destaque.
- Sem minutos, uma entrada de 5 minutos conta como partida (se é assim que a CBF conta: não está documentado).
- A experiência só enxerga a CBF a partir de 2013.
- Os gols favorecem quem tem posição registrada, e a posição ainda depende de curadoria.
- Só há a Série A: a calibração entre divisões é impossível com esta base.

## O que não muda

- **Engine 0.2.0:** sem alteração. `git diff` de `engine/` vazio, e o teste compara o sha256 das 22 fontes.
- **Evolução:** a camada existente (PLAYER-PROGRESSION.md) não muda. A força inicial viria da metodologia, e a
  evolução segue as regras do jogo.
- **Padrão do jogo:** o universo fictício continua o padrão, e o universo real continua opcional (`careerReady: false`).
- **Escudos:** continuam fora.

## Pendência jurídica

Uso comercial/distribuição de nomes reais de atletas e marcas de clubes requer avaliação jurídica antes da
distribuição do universo real. Nada neste documento afirma que a CBF autoriza o uso comercial dos dados.

## Histórico: EM-RATING-1.0 (descontinuada)

A 1.0 calculava força = Overall do EA SPORTS FC 26 − 42 (1–50). Ela nunca foi aplicada: a cobertura era de 8% e a
amostra era enviesada (repatriados e estrangeiros). Descontinuada em 03/10/2026, junto com o uso de ratings de
terceiros. O módulo `data/rating/em-rating.ts` ficou como registro histórico; nenhum código de dados, build ou teste o
usa.

O snapshot `raw/ea-fc-26.candidates.raw.json` e a simulação antiga `ratings/EM-RATING-1.0.simulacao.json` continuam
no repositório **sem uso**, aguardando a decisão de remoção. A auditoria está no relatório da etapa.
