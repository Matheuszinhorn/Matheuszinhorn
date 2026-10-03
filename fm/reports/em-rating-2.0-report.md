# EM-RATING-2.0 — simulação (não aplicada)

Gerado por `scripts/simulate-em-rating-2.ts` a partir de `raw/cbf-2026.raw.json` (coleta 2026-10-02T23:51:37Z). Nenhum rating de terceiros. Metodologia: docs/PLAYER-RATINGS.md.

## Cobertura

| Campo | preenchidos | ausentes | cobertura |
|---|---|---|---|
| jogadores totais | 897 |  |  |
| idade (nascimento CBF) | 897 | 0 | 100,0% |
| partidas 2026 (CBF) | 897 | 0 | 100,0% |
| gols 2026 (CBF) | 897 | 0 | 100,0% |
| temporadas com registro (CBF) | 895 | 2 | 99,8% |
| clube (CBF) | 897 | 0 | 100,0% |
| posição — CBF | 0 | 897 | 0,0% |
| posição — curadoria | 0 | 897 | 0,0% |
| posição — Wikipédia (conferência, fora da fórmula oficial) | 594 | 303 | 66,2% |
| dados CBF completos (idade, partidas, gols, temporadas) | 895 | 2 | 99,8% |

## Cenário oficial: CBF + curadoria

### Distribuição geral

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| todos | 895 | 14 | 50 | 39,5 | 41 | 7,4 | 29 | 35 | 46 | 48 |
| ATIVOS | 766 | 14 | 50 | 39,8 | 41 | 7,3 | 29 | 35 | 46 | 48 |

| 1–5 | 6–10 | 11–15 | 16–20 | 21–25 | 26–30 | 31–35 | 36–40 | 41–45 | 46–50 |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 12 | 30 | 63 | 141 | 183 | 232 | 230 |

### Por posição

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| GOL | 0 | – | – | – | – | – | – | – | – | – |
| DEF | 0 | – | – | – | – | – | – | – | – | – |
| MEI | 0 | – | – | – | – | – | – | – | – | – |
| ATA | 0 | – | – | – | – | – | – | – | – | – |
| sem posição | 895 | 14 | 50 | 39,5 | 41 | 7,4 | 29 | 35 | 46 | 48 |

### Por divisão

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| Série A | 895 | 14 | 50 | 39,5 | 41 | 7,4 | 29 | 35 | 46 | 48 |
| Série B | 0 | – | – | – | – | – | – | – | – | – |
| Série C | 0 | – | – | – | – | – | – | – | – | – |
| Série D | 0 | – | – | – | – | – | – | – | – | – |

Séries B, C e D: sem dados na base (só a Série A foi coletada).

### Exemplos

| categoria | jogador | clube | posição | idade | temporadas | partidas | gols | componentes usados | força |
|---|---|---|---|---|---|---|---|---|---|
| muito baixa (p1) | Ziyech | botafogo | ausente | 33 | 1 | 1 | 0 | participation 18,3%; experience 22,8%; recency 33,3%; age 91,1%; context 100,0% | 18 |
| muito baixa (p1) | Alejandro Ararat | coritiba | ausente | 20 | 1 | 2 | 0 | participation 26,3%; experience 22,8%; recency 33,3%; age 77,1%; context 100,0% | 19 |
| baixa (p20) | Alan | vasco | ausente | 24 | 1 | 23 | 2 | participation 83,5%; experience 22,8%; recency 33,3%; age 100,0%; context 100,0% | 33 |
| baixa (p20) | Nardoni | gremio | ausente | 24 | 1 | 22 | 1 | participation 81,6%; experience 22,8%; recency 33,3%; age 100,0%; context 100,0% | 33 |
| média (p50) | Guilherme Estrella | vasco | ausente | 21 | 5 | 21 | 0 | participation 79,8%; experience 73,6%; recency 100,0%; age 82,9%; context 100,0% | 41 |
| média (p50) | Victor Gabriel | internacional | ausente | 22 | 7 | 18 | 0 | participation 72,8%; experience 85,2%; recency 100,0%; age 88,6%; context 100,0% | 41 |
| alta (p80) | Soteldo | fluminense | ausente | 29 | 7 | 25 | 0 | participation 88,4%; experience 85,2%; recency 100,0%; age 100,0%; context 100,0% | 46 |
| alta (p80) | Gilberto | athletico-pr | ausente | 21 | 6 | 29 | 0 | participation 95,2%; experience 80,1%; recency 100,0%; age 82,9%; context 100,0% | 46 |
| muito alta (p99) | Cleiton | bragantino | ausente | 29 | 13 | 29 | 0 | participation 100,0%; experience 99,1%; recency 100,0%; age 100,0%; context 100,0% | 50 |
| muito alta (p99) | Matheuzinho | vitoria | ausente | 28 | 13 | 42 | 4 | participation 100,0%; experience 99,1%; recency 100,0%; age 100,0%; context 100,0% | 50 |

### Anomalias (listadas, não corrigidas)

| tipo | quantidade | critério | exemplos |
|---|---|---|---|
| experiência provavelmente subestimada | 60 | 27+ anos e ≤ 2 temporadas na base CBF: carreira anterior fora da base (exterior ou antes de 2013) não é vista | Aguirre (athletico-pr, 41); Gaston Benavidez (athletico-pr, 39); Portilla (athletico-pr, 35); Angelo Preciado (atletico-mg, 35); Cassierra (atletico-mg, 36); Guido Herrera (bahia, 27) |
| dados insuficientes (força não calculada) | 2 | sem temporadas com registro na CBF | Lautaro (bahia, null); Gabriel (bragantino, null) |
| jogador sem posição (produção não avaliada) | 897 | precisa de curadoria para o cálculo posicional | Aguirre (athletico-pr, 41); Arthur Dias (athletico-pr, 44); Arthur Monteiro (athletico-pr, 35); Arthur Sehn (athletico-pr, 33); Bruninho (athletico-pr, 36); Chiqueti (athletico-pr, 41) |
| sem partidas na temporada | 15 | participação 0: força puxada por experiência e idade | Lautaro (bahia, null); Fabricio (bragantino, 24); Gabriel (bragantino, null); Kevyn (bragantino, 20); Lezcano (fluminense, 14); Athos (gremio, 17) |
| distribuição concentrada | – | 26% numa única faixa de 5 pontos |  |
| topo saturado | – | 52% com força 41–50 e 12 com 50: titular regular e experiente chega a 1,0 em quase todos os componentes; os dados não distinguem titular de destaque |  |
| diferença entre divisões | – | não avaliável: a base tem só a Série A (oficial) |  |

## Cenário comparacao: CBF + posição da Wikipédia (declarada; só comparação)

### Distribuição geral

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| todos | 895 | 14 | 50 | 37,4 | 38 | 7,1 | 28 | 33 | 43 | 46 |
| ATIVOS | 766 | 14 | 50 | 37,4 | 39 | 7,0 | 28 | 33 | 43 | 45 |

| 1–5 | 6–10 | 11–15 | 16–20 | 21–25 | 26–30 | 31–35 | 36–40 | 41–45 | 46–50 |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 6 | 18 | 36 | 78 | 177 | 235 | 252 | 93 |

### Por posição

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| GOL | 70 | 24 | 46 | 38,9 | 42 | 6,1 | 31 | 33 | 44 | 45 |
| DEF | 192 | 14 | 49 | 38,0 | 39 | 6,8 | 28 | 35 | 43 | 46 |
| MEI | 172 | 16 | 49 | 38,0 | 39 | 6,8 | 30 | 34 | 43 | 45 |
| ATA | 158 | 15 | 50 | 37,2 | 38 | 7,6 | 26 | 33 | 43 | 46 |
| sem posição | 303 | 14 | 50 | 36,5 | 37 | 7,3 | 27 | 32 | 42 | 46 |

### Por divisão

|  | n | mín. | máx. | média | mediana | desvio | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|---|---|---|---|
| Série A | 895 | 14 | 50 | 37,4 | 38 | 7,1 | 28 | 33 | 43 | 46 |
| Série B | 0 | – | – | – | – | – | – | – | – | – |
| Série C | 0 | – | – | – | – | – | – | – | – | – |
| Série D | 0 | – | – | – | – | – | – | – | – | – |

Séries B, C e D: sem dados na base (só a Série A foi coletada).

### Exemplos

| categoria | jogador | clube | posição | idade | temporadas | partidas | gols | componentes usados | força |
|---|---|---|---|---|---|---|---|---|---|
| muito baixa (p1) | Robson | palmeiras | ausente | 20 | 2 | 0 | 0 | participation 0,0%; experience 40,6%; recency 66,7%; age 77,1%; context 100,0% | 17 |
| muito baixa (p1) | Nacho Laquintana | vitoria | ATA | 27 | 3 | 0 | 0 | participation 0,0%; experience 54,4%; recency 66,7%; age 100,0%; production 0,0%; context 100,0% | 17 |
| baixa (p20) | DARLAN | vitoria | DEF | 23 | 1 | 28 | 1 | participation 81,6%; experience 22,8%; recency 33,3%; age 94,3%; production 54,1%; context 100,0% | 32 |
| baixa (p20) | Kaio | atletico-mg | ausente | 18 | 3 | 10 | 0 | participation 55,0%; experience 54,4%; recency 100,0%; age 65,7%; context 100,0% | 32 |
| média (p50) | RAMON SOSA | palmeiras | ATA | 27 | 2 | 25 | 6 | participation 84,5%; experience 40,6%; recency 66,7%; age 100,0%; production 83,8%; context 100,0% | 38 |
| média (p50) | Carrascal | flamengo | ausente | 28 | 2 | 24 | 5 | participation 88,0%; experience 40,6%; recency 66,7%; age 100,0%; context 100,0% | 38 |
| alta (p80) | João Paulo | chapecoense | DEF | 29 | 8 | 21 | 3 | participation 74,3%; experience 89,2%; recency 100,0%; age 100,0%; production 100,0%; context 100,0% | 44 |
| alta (p80) | Renan Lodi | atletico-mg | DEF | 28 | 11 | 31 | 2 | participation 96,9%; experience 96,5%; recency 33,3%; age 100,0%; production 73,5%; context 100,0% | 44 |
| muito alta (p99) | J. Capixaba | bragantino | DEF | 29 | 13 | 25 | 3 | participation 92,8%; experience 99,1%; recency 100,0%; age 100,0%; production 100,0%; context 100,0% | 49 |
| muito alta (p99) | Erick | vitoria | ATA | 28 | 12 | 42 | 11 | participation 100,0%; experience 98,0%; recency 100,0%; age 100,0%; production 93,0%; context 100,0% | 49 |

### Anomalias (listadas, não corrigidas)

| tipo | quantidade | critério | exemplos |
|---|---|---|---|
| experiência provavelmente subestimada | 60 | 27+ anos e ≤ 2 temporadas na base CBF: carreira anterior fora da base (exterior ou antes de 2013) não é vista | Aguirre (athletico-pr, 39); Gaston Benavidez (athletico-pr, 37); Portilla (athletico-pr, 30); Angelo Preciado (atletico-mg, 30); Cassierra (atletico-mg, 35); Guido Herrera (bahia, 27) |
| dados insuficientes (força não calculada) | 2 | sem temporadas com registro na CBF | Lautaro (bahia, null); Gabriel (bragantino, null) |
| jogador sem posição (produção não avaliada) | 303 | precisa de curadoria para o cálculo posicional | Arthur Monteiro (athletico-pr, 35); Arthur Sehn (athletico-pr, 33); Bruninho (athletico-pr, 36); claudio (athletico-pr, 34); Gilberto (athletico-pr, 46); Gilberto (athletico-pr, 46) |
| sem partidas na temporada | 15 | participação 0: força puxada por experiência e idade | Lautaro (bahia, null); Fabricio (bragantino, 24); Gabriel (bragantino, null); Kevyn (bragantino, 20); Lezcano (fluminense, 14); Athos (gremio, 14) |
| distribuição concentrada | – | 28% numa única faixa de 5 pontos |  |
| topo saturado | – | 39% com força 41–50 e 6 com 50: titular regular e experiente chega a 1,0 em quase todos os componentes; os dados não distinguem titular de destaque |  |
| diferença entre divisões | – | não avaliável: a base tem só a Série A (comparacao) |  |

## Sensibilidade (cenário de comparação)

Cada peso multiplicado por 0,5 e por 1,5, um de cada vez (os demais fixos; o índice renormaliza pelos pesos).

| componente | fator | média | desvio | variação absoluta média | mudam ≥ 3 pontos |
|---|---|---|---|---|---|
| participation | 0,5 | 37,4 | 6,7 | 1,4 | 138 |
| participation | 1,5 | 37,5 | 7,6 | 0,9 | 40 |
| experience | 0,5 | 37,6 | 7,2 | 0,8 | 19 |
| experience | 1,5 | 37,3 | 7,2 | 0,7 | 1 |
| recency | 0,5 | 37,1 | 7,1 | 0,5 | 0 |
| recency | 1,5 | 37,7 | 7,1 | 0,4 | 0 |
| age | 0,5 | 37,0 | 7,5 | 0,5 | 0 |
| age | 1,5 | 37,8 | 6,8 | 0,4 | 0 |
| production | 0,5 | 38,4 | 7,1 | 1,0 | 141 |
| production | 1,5 | 36,6 | 7,2 | 0,9 | 83 |
| context | 0,5 | 37,1 | 7,3 | 0,4 | 0 |
| context | 1,5 | 37,8 | 6,9 | 0,3 | 0 |

### Quem domina a fórmula

| componente | peso | contribuição média (pontos) | desvio da contribuição | correlação com a força | avaliados |
|---|---|---|---|---|---|
| participation | 40,0% | 15,5 | 4,7 | 0,83 | 895 |
| experience | 20,0% | 7,4 | 2,3 | 0,61 | 895 |
| recency | 10,0% | 4,4 | 1,3 | 0,58 | 895 |
| age | 10,0% | 4,6 | 0,6 | 0,16 | 895 |
| production | 15,0% | 1,9 | 2,5 | 0,56 | 592 |
| context | 5,0% | 2,6 | 0,2 | 0,00 | 895 |
