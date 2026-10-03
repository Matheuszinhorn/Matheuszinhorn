# Força dos jogadores — metodologia EM-RATING

> **EM-RATING-2.0 encontra-se em fase de calibração e ainda não é a força oficial.**
> Nenhum modelo (A, B ou C) é definitivo. Nada foi aplicado: todos os jogadores reais continuam com `strength: null`,
> e o jogo continua no universo fictício.

Arquivos:
- **Fórmula e variantes de calibração:** `data/rating/em-rating-2.ts`.
- **Entradas a partir da CBF:** `data/rating/em-rating-2-inputs.ts`.
- **Curadoria:** `data/curation.ts` e `data/universes/brasileirao-2026/curation/positions.csv`.
- **Calibração:** `scripts/simulate-em-rating-2.ts` (`npm run rating:sim`). Gera `reports/em-rating-2.0-calibracao.md`
  (relatório completo) e `reports/em-rating-2.0-calibracao.json` (força de cada atleta em cada variante).
- **Testes:** `data/tests/em-rating-2.test.ts`.

## Princípio

A força **não** é "o quanto alguém considera o jogador bom" e **não** mede talento real. É o quanto o jogador deve
representar na escala simplificada 1–50 do ELITE MANAGER, a partir dos fatos objetivos disponíveis e de regras do
próprio jogo.

Faixas de referência de design (não são cotas):

| 1–10 | 11–20 | 21–30 | 31–35 | 36–40 | 41–45 | 46–49 | 50 |
|---|---|---|---|---|---|---|---|
| muito baixa | baixa | média | boa | forte | muito forte | excepcional | elite absoluta, extremamente raro |

## Fontes

| Uso | Fonte | Situação |
|---|---|---|
| **Fórmula** | Dados factuais da CBF já coletados (`raw/cbf-2026.raw.json`, 02–03/10/2026) | Única fonte factual. Nenhuma coleta nova. |
| **Fórmula** | Curadoria própria do ELITE MANAGER (`fieldSource: "curadoria"`) | Só para campos que a CBF não fornece; hoje, a posição. |
| Auxílio ao curador | Wikipédia | Aparece só na coluna `referenciaAuxiliar` da planilha. **Nunca** é fonte oficial e nunca entra no cálculo oficial. |
| Fora | EA SPORTS FC, Flashscore, Opta, Transfermarkt, SofaScore | Não usados. |

### Por que abandonamos ratings de terceiros

- Um rating de outra empresa é uma criação dela.
- O EA FC 26 cobria só 8% da Série A, com viés (EM-RATING-1.0, abaixo).
- A força precisa ser uma regra do próprio jogo.

### Dados da CBF e limitações

| Fato | Observação |
|---|---|
| Idade | Do nascimento, na **data do snapshot** (fixa; nunca a data do relógio). |
| Temporadas com registro | A base começa em **2013** (máximo de 14). Não diz competição nem jogos por ano. Carreira no exterior ou antes de 2013 é invisível. |
| Partidas e gols | **Da temporada 2026**, na página "Série A 2026" do atleta. O recorte exato de competições não é documentado (máximo de 42). Sem minutos nem titularidade. |
| Clube e competição | Todos são da Série A 2026: não há dados das Séries B, C e D. |
| Posição | **Não existe na CBF.** Vem da curadoria. |

## Fórmula EM-RATING-2.0

```
índice = Σ (peso × valor) / Σ (peso)     (só componentes avaliados; cada valor em 0–1)
força  = arredondar(1 + 49 × índice), limitada a 1–50   (sem teto artificial: 50 continua possível)
```

| Componente | Valor (0–1) |
|---|---|
| **Participação** | Curva de p = partidas ÷ maior número de partidas do clube. Em teste: raiz √p, log ln(1 + 9p)/ln 10, saturante (1 − e^(−3p))/(1 − e^(−3)). |
| **Experiência** | (1 − e^(−temporadas/4)), normalizado para 1 em 14 temporadas. |
| **Recência** | Temporadas registradas entre as 3 mais recentes ÷ 3. |
| **Idade** | 0,6 até 17 anos → 1 de 24 a 31 → 0,6 aos 40 ou mais. |
| **Produção** | Gols ÷ (partidas + 5), comparado às âncoras da posição: 0 → 0, mediana → 0,5, p90 → 1 (ATA 0,075/0,26; MEI 0,03/0,12; DEF 0,025/0,09). **Goleiro: neutro fixo 0,5.** Sem posição: fora da conta, sinalizado `POSICAO_AUSENTE`. |
| **Contexto** | Inscrito numa competição nacional da CBF → 1. Igual para todas as séries: a divisão não determina a força. |

- **Experiência limitada.** `experienceDataLimited = true` quando o atleta tem 27 anos ou mais e no máximo 2
  temporadas na base. Nada é atribuído. Em calibração: os pesos de experiência e recência multiplicados por 1 (sem
  mudança), 0,5 ou 0 (fora da conta).
- **Dados insuficientes.** Sem partidas ou sem temporadas, a força é `null` (`DADOS_INSUFICIENTES`). São 2 atletas,
  Lautaro (Bahia) e Gabriel (Bragantino), `null` em todas as variantes.
- **Determinismo.** Função pura, sem random, seed, relógio, rede ou IA. A mesma entrada com a mesma variante dá a mesma
  força. O relatório regenerado é idêntico byte a byte.

### Modelos em calibração (hipóteses, sem ranking)

| Componente | A (1ª simulação) | B | C |
|---|---|---|---|
| Participação | 40% | 25% | 20% |
| Experiência | 20% | 20% | 15% |
| Recência | 10% | 15% | 15% |
| Idade | 10% | 10% | 10% |
| Produção | 15% | 25% | 35% |
| Contexto | 5% | 5% | 5% |

## Resultado da calibração (03/10/2026, curva raiz, experiência ×1)

A posição usada **só nesta análise** é a disponível hoje no universo (Wikipédia, declarada) para 594 atletas. Os
outros 303 ficam "sem posição". Nenhuma posição foi curada ainda.

| Métrica | A | B | C |
|---|---:|---:|---:|
| Média | 37,4 | 36,5 | 35,5 |
| Mediana | 38 | 37 | 37 |
| P90 | 46 | 45 | 45 |
| P95 | 47 | 47 | 48 |
| % 41–50 | 38,5% | 34,3% | 28,5% |
| % 46–50 | 10,4% | 8,7% | 8,9% |
| % = 50 | 0,7% | 0,8% | 0,8% |
| Correlação participação | 0,83 | 0,64 | 0,52 |
| Correlação produção | 0,56 | 0,72 | 0,85 |

Só com posição (592 atletas): % 41–50 fica em 42,7% (A), 34,0% (B) e 23,0% (C); % = 50 em 0,2% nos três. As
distribuições completas, por posição, por clube, por curva, os extremos e a sensibilidade estão no relatório.

### Achados objetivos

**Concentração e diferenciação**
- Todos os modelos concentram a maior faixa de 5 pontos em 25–28% dos atletas: A em 41–45; B em 41–45 e 36–40 (quase
  empate); C em 36–40.
- Nenhum atleta fica abaixo de 14. As faixas 1–10 ficam vazias, porque experiência, idade e contexto mantêm um piso.
- O desvio-padrão é 7,1 (A), 7,2 (B) e 7,8 (C).

**Força 50**
- Quase só sai de "sem posição": 5 de 6 (A), 6 de 7 (B) e 6 de 7 (C).
- Sem posição, a produção sai da conta e não pesa contra, então um titular experiente sem posição chega a 1,0 em tudo.
- Com a curadoria completa, esse efeito some. O topo hoje é inflado pela falta de posição, não pela fórmula com posição.

**Posições**
- **Teto do goleiro:** o neutro fixo de 0,5 vira limite quando a produção pesa mais. O goleiro chega no máximo a 46
  (A), 44 (B) e 41 (C); o jogador de linha chega a 50.
- **Médias por posição:** o goleiro tem a maior média (38,9 / 38,1 / 36,6). A produção mediana dos jogadores de linha
  de todo o elenco, reservas incluídos, fica abaixo de 0,5: as âncoras foram medidas entre quem tem 10+ partidas.
  - Diferença entre posições: 1,7 ponto em A, 2,5 em B, 3,0 em C.
  - Em C, a mediana de DEF e MEI é 32, contra 39 do goleiro.

**Participação e produção**
- Baixar o peso da participação reduz a correlação dela com a força (0,83 → 0,64 → 0,52), e a produção passa a
  dominar (0,56 → 0,72 → 0,85).
- Na sensibilidade, em C a produção é o componente mais instável: ×0,5 muda 342 atletas em 3 pontos ou mais.

**Curvas de participação**
- Retorno decrescente **mais forte aumenta a saturação**: os titulares chegam a 1 mais cedo.
- No modelo A, % 41–50 vai de 38,5% (raiz) a 40,8% (log) e 47,8% (saturante). A correlação da participação quase não
  muda (0,83–0,84).
- Para reduzir a dependência da participação, a curva sozinha não basta. O efeito vem do peso.

**Experiência limitada (60 atletas)**
- Média dos limitados contra a dos demais: 30,2 × 37,9 (A); 28,3 × 37,1 (B); 27,9 × 36,1 (C).
- Com o peso ×0, a distância cai para 35,2 × 37,9 (A), 33,4 × 37,1 (B) e 31,7 × 36,1 (C), sem atribuir experiência a
  ninguém.

**Sem partidas em 2026**
- 15 atletas: 13 calculados e 2 `null`. Força de 14 a 28: a participação vale 0 e os outros componentes continuam.
- Entre eles há ATIVOS e TRANSFERIDOS e últimas temporadas de 2017 a 2025. A base não permite dizer se o motivo é
  chegada recente, lesão, reserva ou outro.

**Média por clube**
- A participação é relativa ao clube, então a média por clube não reflete o nível do clube.
- O Mirassol tem a maior média (41,5 em A), e Grêmio e Botafogo, as menores. Isso decorre de elencos mais ou menos
  rotativos, não de qualidade.

**Casos sintéticos.** A fórmula se comporta como esperado em todos os modelos e curvas:
- 0 partidas < muitas;
- 0 gols < produção excepcional;
- experiência baixa < alta;
- a idade move poucos pontos;
- os gols do goleiro não contam;
- 50 só no extremo de todos os componentes.

### Descrição de cada modelo (sem ranking)

- **A:**
  - Concentra no topo (38,5% em 41–50; 42,7% entre os com posição).
  - A participação explica a maior parte da força (correlação 0,83), e titular regular vira 41–46 quase sempre.
  - A produção diferencia pouco (contribuição média 1,9 ponto).
  - Penaliza menos o goleiro (teto 46).
  - Entre os modelos, é o que menos afasta os atletas de experiência limitada dos demais (30,2 × 37,9).
- **B:**
  - Fica entre A e C em quase tudo: 34,3% em 41–50; correlações de 0,64 (participação) e 0,72 (produção).
  - O teto do goleiro cai para 44, e "sem posição" passa a ter média acima de "com posição" (37,4 × 36,1).
  - Os atletas com poucos dados não ganham força alta.
- **C:**
  - Menor concentração no topo (28,5%; 23,0% com posição) e maior desvio.
  - A produção domina (0,85), com três efeitos colaterais:
    - teto do goleiro em 41;
    - desequilíbrio de 3 pontos entre posições (DEF e MEI abaixo);
    - "sem posição" bem acima de "com posição" (38,1 × 34,2).
  - Aparecem anomalias que A e B não têm: 3 atletas com 5 partidas ou menos e força 30 ou mais, e um veterano com 11
    temporadas e força 20 (Rodinei, 2 de 35 partidas na temporada).
  - Na sensibilidade, é o modelo mais sensível ao peso da produção.

Pontos comuns aos três, que dependem de decisões fora dos pesos:
- a curadoria das posições, que hoje distorce o topo;
- o tratamento do goleiro quando a produção pesa mais (neutro fixo × outra regra);
- o fator da experiência limitada.

## Curadoria

`curation/positions.csv` tem **uma linha por atleta (897)**, porque a posição oficial é sempre de curadoria. As
colunas são `playerId`, `displayName`, `clubId`, `birthDate`, `referenciaAuxiliar`, `field`, `oldValue`, `newValue`,
`fieldSource`, `curator`, `date` e `reason`.

- **Primeiro bloco: 303 atletas sem nenhuma referência** (os 291 de antes mais os 12 que tinham posição do EA).
- **Depois, 594 com `referenciaAuxiliar`**, a posição da Wikipédia marcada "(wikipedia-en, auxiliar)", só para
  ajudar o curador.
- `oldValue` é o valor atual no universo, conferido na leitura: a curadoria não sobrescreve em silêncio um dado que
  mudou.
- Uma linha preenchida exige `newValue` (GOL/DEF/MEI/ATA), `fieldSource: curadoria`, curador, data e motivo. Linha
  vazia fica pendente.
- O script de calibração **nunca reescreve uma linha já preenchida**.
- A curadoria é aplicada só no cálculo, nunca sobre `players.json` nem sobre os dados da CBF.

Exemplo:
`p-cbf-750895,Arthur Monteiro,br-athletico-pr,2009-09-10,,position,,MEI,curadoria,equipe ELITE MANAGER,2026-10-03,"posição definida para permitir cálculo posicional"`

**Pendente de decisão.** O universo (`players.json`) ainda guarda a posição da Wikipédia em 594 atletas, com
`fieldSources.position: "wikipedia-en"`. É dela que sai o elenco jogável usado nos testes de conversão para o engine.
A fórmula oficial não a usa. Retirá-la de `players.json` antes da curadoria deixaria todos os clubes sem elenco
jogável: o universo deixaria de carregar (mínimo de 11 com goleiro) e os testes de conversão para o engine parariam.
Por isso a retirada não foi feita nesta etapa.

## Versionamento

- `EM_RATING_2_VERSION = "EM-RATING-2.0"` vai em todo resultado, junto com a `variant` (ex.: `B/sqrt`,
  `C/log/exp×0.5`).
- Cada variante é uma configuração congelada e gravada inteira na calibração: pesos, curva, âncoras, curva de idade,
  experiência limitada e contexto.
- A escolha do proprietário vira a configuração oficial, com nova simulação e relatório antes de aplicar. Mudar
  qualquer valor depois = nova versão.
- Ao aplicar (etapa futura, com aprovação): `strength`, `strengthMethodVersion` e `strengthNotes` por jogador.
  Carreiras em andamento não mudam.

## O que não muda

- **Engine 0.2.0:** sem alteração (o teste compara o sha256 das 22 fontes).
- **Também sem alteração:** evolução (PLAYER-PROGRESSION.md), gameplay e saves.
- **Universo padrão:** o fictício continua o padrão; o real continua opcional.
- **Escudos:** continuam fora.

## Pendência jurídica

Uso comercial/distribuição de nomes reais de atletas e marcas de clubes requer avaliação jurídica antes da
distribuição do universo real. Nada aqui afirma que a CBF autoriza o uso comercial dos dados.

## Histórico: EM-RATING-1.0 (abandonada)

A 1.0 calculava força = Overall do EA SPORTS FC 26 − 42 (1–50). Nunca foi aplicada: cobertura de 8% e amostra
enviesada (repatriados e estrangeiros). Abandonada em 03/10/2026 com a decisão de não usar ratings de terceiros.

Em 03/10/2026 também foram removidos, depois de auditados como isolados:
- o snapshot do EA (`raw/ea-fc-26.candidates.raw.json`);
- a simulação 1.0 (`ratings/EM-RATING-1.0.simulacao.json`);
- o módulo `data/rating/em-rating.ts`;
- o campo `rating` / `PlayerRatingRef` dos jogadores;
- a fonte `EA_FC_26` de `sources.json`.

O histórico continua no git.
