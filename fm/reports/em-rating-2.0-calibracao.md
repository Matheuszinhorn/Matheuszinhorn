# EM-RATING-2.0 — calibração (2ª rodada)

> EM-RATING-2.0 encontra-se em fase de calibração e ainda não é a força oficial. Nenhum modelo abaixo é definitivo; nada foi aplicado.

Gerado por `scripts/simulate-em-rating-2.ts` (`npm run rating:sim`) a partir de `raw/cbf-2026.raw.json` (coleta 2026-10-02T23:51:37Z, temporada 2026). Nenhum rating de terceiros.

Posição usada só nesta análise: 594 atletas com a posição hoje disponível no universo (Wikipédia, declarada; não oficial) e 303 "sem posição". Posições curadas: 0. Curva de participação: raiz (modelos A/B/C); outras curvas na seção própria.

## Modelos

| Componente | A | B | C |
|---|---:|---:|---:|
| participation | 40% | 25% | 20% |
| experience | 20% | 20% | 15% |
| recency | 10% | 15% | 15% |
| age | 10% | 10% | 10% |
| production | 15% | 25% | 35% |
| context | 5% | 5% | 5% |

## Comparação

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
| Correlação experiência | 0,61 | 0,62 | 0,48 |
| Desvio-padrão | 7,1 | 7,2 | 7,8 |

Só atletas COM posição (análise; n = 592): sem eles, "sem posição" (produção fora da conta) não distorce o topo.

| Métrica (com posição) | A | B | C |
|---|---:|---:|---:|
| Média | 37,9 | 36,1 | 34,2 |
| Mediana | 39 | 36 | 34 |
| P90 | 46 | 45 | 44 |
| P95 | 47 | 47 | 47 |
| % 41–50 | 42,7% | 34,0% | 23,0% |
| % 46–50 | 10,3% | 7,8% | 7,8% |
| % = 50 | 0,2% | 0,2% | 0,2% |
| Correlação participação | 0,82 | 0,65 | 0,56 |
| Correlação produção | 0,56 | 0,72 | 0,85 |
| Força 50 vinda de "sem posição" (todos) | 5 de 6 | 6 de 7 | 6 de 7 |

## Distribuição completa

|  | A | B | C |
|---|---:|---:|---:|
| n | 895 | 895 | 895 |
| mínimo | 14 | 15 | 14 |
| máximo | 50 | 50 | 50 |
| média | 37,4 | 36,5 | 35,5 |
| mediana | 38 | 37 | 37 |
| P10 | 28 | 27 | 25 |
| P25 | 33 | 32 | 30 |
| P50 | 38 | 37 | 37 |
| P75 | 43 | 42 | 41 |
| P90 | 46 | 45 | 45 |
| P95 | 47 | 47 | 48 |
| 1–10 | 0 (0,0%) | 0 (0,0%) | 0 (0,0%) |
| 11–20 | 24 (2,7%) | 27 (3,0%) | 35 (3,9%) |
| 21–30 | 114 (12,7%) | 142 (15,9%) | 201 (22,5%) |
| 31–35 | 177 (19,8%) | 208 (23,2%) | 176 (19,7%) |
| 36–40 | 235 (26,3%) | 211 (23,6%) | 228 (25,5%) |
| 41–45 | 252 (28,2%) | 229 (25,6%) | 175 (19,6%) |
| 46–49 | 87 (9,7%) | 71 (7,9%) | 73 (8,2%) |
| 50 | 6 (0,7%) | 7 (0,8%) | 7 (0,8%) |
| maior concentração em 5 pontos | 28,2% | 25,6% | 25,5% |

## Por posição (análise)

| Posição | A média | A mediana | A teto | B média | B mediana | B teto | C média | C mediana | C teto | n |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GOL | 38,9 | 42 | 46 | 38,1 | 40 | 44 | 36,6 | 39 | 41 | 70 |
| DEF | 38,0 | 39 | 50 | 35,8 | 36 | 50 | 33,6 | 32 | 50 | 192 |
| MEI | 38,0 | 39 | 50 | 36,0 | 37 | 50 | 34,0 | 32 | 50 | 172 |
| ATA | 37,2 | 38 | 50 | 35,5 | 36 | 50 | 34,2 | 35 | 50 | 158 |
| sem posição | 36,5 | 37 | 50 | 37,4 | 38 | 50 | 38,1 | 39 | 50 | 303 |

"teto" = força máxima alcançável com todos os componentes avaliáveis em 1 (goleiro com produção neutra 0,5; "sem posição" com a produção fora da conta).

## Por clube (média)

| Clube | A | B | C | n |
|---|---:|---:|---:|---:|
| athletico-pr | 39,3 | 38,1 | 37,2 | 38 |
| atletico-mg | 36,4 | 35,7 | 35,0 | 43 |
| bahia | 38,9 | 37,8 | 36,8 | 39 |
| botafogo | 34,8 | 34,2 | 33,9 | 52 |
| bragantino | 38,0 | 36,7 | 35,4 | 45 |
| chapecoense | 37,4 | 37,2 | 36,2 | 55 |
| corinthians | 39,0 | 37,6 | 36,4 | 39 |
| coritiba | 35,6 | 34,7 | 33,5 | 46 |
| cruzeiro | 37,8 | 36,9 | 35,9 | 44 |
| flamengo | 38,4 | 37,1 | 36,0 | 38 |
| fluminense | 37,9 | 36,6 | 35,2 | 39 |
| gremio | 34,9 | 33,9 | 32,7 | 47 |
| internacional | 36,6 | 35,8 | 35,2 | 46 |
| mirassol | 41,5 | 40,3 | 38,9 | 40 |
| palmeiras | 38,4 | 37,8 | 37,1 | 44 |
| remo | 37,7 | 37,0 | 36,1 | 49 |
| santos | 38,1 | 37,3 | 36,3 | 48 |
| sao-paulo | 36,3 | 34,9 | 33,5 | 45 |
| vasco | 36,9 | 36,3 | 35,6 | 46 |
| vitoria | 36,6 | 36,0 | 35,2 | 52 |

## Curva da participação

p = partidas ÷ maior número de partidas do clube. raiz: √p · log: ln(1 + 9p)/ln 10 · saturante: (1 − e^(−3p))/(1 − e^(−3)).

| p | raiz | log | saturante |
|---|---:|---:|---:|
| 0,10 | 0,32 | 0,28 | 0,27 |
| 0,25 | 0,50 | 0,51 | 0,56 |
| 0,50 | 0,71 | 0,74 | 0,82 |
| 0,75 | 0,87 | 0,89 | 0,94 |
| 1,00 | 1,00 | 1,00 | 1,00 |

| Modelo/curva | média | mediana | P90 | P95 | % 41–50 | % 46–50 | % = 50 | corr. participação | corr. produção |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A/sqrt | 37,4 | 38 | 46 | 47 | 38,5% | 10,4% | 0,7% | 0,83 | 0,56 |
| A/log | 37,7 | 39 | 46 | 47 | 40,8% | 11,3% | 0,8% | 0,84 | 0,55 |
| A/saturating | 38,5 | 40 | 46 | 48 | 47,8% | 14,6% | 0,9% | 0,84 | 0,54 |
| B/sqrt | 36,5 | 37 | 45 | 47 | 34,3% | 8,7% | 0,8% | 0,64 | 0,72 |
| B/log | 36,7 | 37 | 45 | 48 | 36,6% | 9,4% | 0,8% | 0,65 | 0,72 |
| B/saturating | 37,3 | 38 | 46 | 48 | 39,0% | 10,7% | 1,1% | 0,65 | 0,71 |
| C/sqrt | 35,5 | 37 | 45 | 48 | 28,5% | 8,9% | 0,8% | 0,52 | 0,85 |
| C/log | 35,7 | 37 | 45 | 48 | 29,9% | 9,4% | 0,8% | 0,53 | 0,85 |
| C/saturating | 36,2 | 37 | 46 | 48 | 33,7% | 10,8% | 1,3% | 0,53 | 0,85 |

## Experiência com cobertura histórica limitada

experienceDataLimited = idade ≥ 27 e no máximo 2 temporadas na base da CBF: 60 atletas. Nada é atribuído; testado o peso de experiência e recência ×1 (sem mudança), ×0,5 e ×0 (fora da conta).

| Modelo | fator | média dos limitados | média dos demais | média geral | % 41–50 |
|---|---:|---:|---:|---:|---:|
| A | 1,0 | 30,2 | 37,9 | 37,4 | 38,5% |
| A | 0,5 | 32,2 | 37,9 | 37,6 | 39,3% |
| A | 0,0 | 35,2 | 37,9 | 37,8 | 41,0% |
| B | 1,0 | 28,3 | 37,1 | 36,5 | 34,3% |
| B | 0,5 | 30,2 | 37,1 | 36,7 | 34,5% |
| B | 0,0 | 33,4 | 37,1 | 36,9 | 36,2% |
| C | 1,0 | 27,9 | 36,1 | 35,5 | 28,5% |
| C | 0,5 | 29,4 | 36,1 | 35,6 | 29,1% |
| C | 0,0 | 31,7 | 36,1 | 35,8 | 29,8% |

## Atletas sem partidas em 2026

15 atletas com 0 partidas na temporada. A força deles vem só de experiência, recência, idade, contexto e (com posição) produção 0 ou neutra: a participação vale 0, mas os outros componentes continuam. A base não diz se é recém-chegado, lesionado, reserva ou contratação recente — ver colunas de status e temporadas; nada é afirmado sobre o motivo.

| Jogador | clube | status CBF | idade | temporadas | última temporada registrada | posição (análise) | A | B | C |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lautaro | bahia | ATIVO | 21 | – | – | MEI | null | null | null |
| Fabricio | bragantino | ATIVO | 26 | 8 | 2025 | GOL | 24 | 28 | 28 |
| Gabriel | bragantino | ATIVO | 19 | – | – | MEI | null | null | null |
| Kevyn | bragantino | TRANSFERIDO | 21 | 4 | 2025 | sem posição | 20 | 25 | 26 |
| Lezcano | fluminense | TRANSFERIDO | 22 | 1 | 2025 | sem posição | 14 | 16 | 18 |
| Athos | gremio | ATIVO | 21 | 3 | 2024 | DEF | 14 | 15 | 14 |
| Cuellar | gremio | TRANSFERIDO | 33 | 5 | 2025 | sem posição | 20 | 23 | 24 |
| R. Ely | gremio | TRANSFERIDO | 32 | 3 | 2025 | sem posição | 20 | 24 | 26 |
| Alan Benitez | internacional | TRANSFERIDO | 32 | 1 | 2025 | sem posição | 14 | 17 | 18 |
| Robson | palmeiras | ATIVO | 20 | 2 | 2025 | sem posição | 17 | 21 | 23 |
| Thiago | remo | ATIVO | 42 | 3 | 2017 | sem posição | 14 | 15 | 15 |
| FELIPE | sao-paulo | ATIVO | 20 | 3 | 2025 | sem posição | 18 | 23 | 24 |
| Loide | vasco | ATIVO | 26 | 1 | 2025 | sem posição | 14 | 17 | 19 |
| Mateus Carvalho | vasco | ATIVO | 24 | 5 | 2025 | MEI | 19 | 20 | 19 |
| Nacho Laquintana | vitoria | ATIVO | 27 | 3 | 2025 | ATA | 17 | 19 | 17 |

## Dados insuficientes

| Jogador | clube | motivo | A | B | C |
|---|---:|---:|---:|---:|---:|
| Lautaro | bahia | TEMPORADAS_AUSENTES, DADOS_INSUFICIENTES | null | null | null |
| Gabriel | bragantino | TEMPORADAS_AUSENTES, DADOS_INSUFICIENTES | null | null | null |

## Casos sintéticos (extremos)

| Caso | A | B | C |
|---|---:|---:|---:|
| referência: MEI 26 anos, 5 temporadas, 20/34 jogos, 2 gols | 41 | 42 | 42 |
| 0 partidas | 20 | 23 | 21 |
| muitas partidas (34/34) | 45 | 43 | 42 |
| 0 gols (ATA, 30 jogos) | 39 | 34 | 30 |
| produção excepcional (ATA, 30 jogos, 15 gols) | 46 | 47 | 47 |
| goleiro titular (34/34, 13 temporadas) | 46 | 44 | 41 |
| idade muito baixa (16) | 31 | 30 | 31 |
| idade elevada (40) | 42 | 42 | 42 |
| experiência alta (14 temporadas) | 44 | 44 | 44 |
| experiência baixa (1 temporada, 26 anos) | 33 | 32 | 33 |
| experiência limitada (30 anos, 1 temporada) | 33 | 32 | 33 |
| ausência de posição | 42 | 43 | 43 |
| titular experiente, produção típica (MEI, 34/34, 14 temporadas) | 46 | 43 | 40 |
| titular experiente, produção excepcional (ATA, 34/34, 14 temporadas, 17 gols) | 50 | 50 | 50 |
| titular experiente sem posição (34/34, 14 temporadas) | 50 | 50 | 50 |

## Anomalias detectadas (listadas, não corrigidas)

| Modelo | tipo | qtd. | critério / medida | exemplos |
|---|---:|---:|---:|---:|
| A | topo concentrado | 345 | 38,5% em 41–50 |  |
| A | concentração em 5 pontos | 252 | 28,2% numa faixa de 5 pontos |  |
| A | teto do goleiro abaixo da linha | – | goleiro chega no máximo a 46; jogador de linha a 50 (produção neutra 0,5 vira limite quando o peso da produção cresce) |  |
| A | "sem posição" com força 50 | 5 | produção fora da conta: titular experiente sem posição chega a 50 | Léo (50); Luiz Fernando (50); Raul (50); Pedro (50); Daniel (50) |
| A | experiência limitada | 60 | experienceDataLimited (carreira anterior fora da base) | Aguirre (39); Gaston Benavidez (37); Portilla (30); Angelo Preciado (30); Cassierra (35) |
| A | sem partidas em 2026 | 13 | força vinda só de experiência, idade e contexto | Fabricio (24); Kevyn (20); Lezcano (14); Athos (14); Cuellar (20) |
| A | dados insuficientes | 2 | força null | Lautaro (null); Gabriel (null) |
| B | topo concentrado | 307 | 34,3% em 41–50 |  |
| B | concentração em 5 pontos | 229 | 25,6% numa faixa de 5 pontos |  |
| B | teto do goleiro abaixo da linha | – | goleiro chega no máximo a 44; jogador de linha a 50 (produção neutra 0,5 vira limite quando o peso da produção cresce) |  |
| B | desequilíbrio entre posições | – | diferença de 2,5 pontos entre as médias por posição (GOL 38,1, DEF 35,8, MEI 36,0, ATA 35,5) |  |
| B | "sem posição" acima de "com posição" | 303 | média 37,4 contra 36,1: sem posição, a produção sai da conta e não pesa contra |  |
| B | "sem posição" com força 50 | 6 | produção fora da conta: titular experiente sem posição chega a 50 | Léo (50); Luiz Fernando (50); Raul (50); Pedro (50); Fernando (50) |
| B | experiência limitada | 60 | experienceDataLimited (carreira anterior fora da base) | Aguirre (36); Gaston Benavidez (35); Portilla (24); Angelo Preciado (24); Cassierra (32) |
| B | sem partidas em 2026 | 13 | força vinda só de experiência, idade e contexto | Fabricio (28); Kevyn (25); Lezcano (16); Athos (15); Cuellar (23) |
| B | dados insuficientes | 2 | força null | Lautaro (null); Gabriel (null) |
| C | concentração em 5 pontos | 228 | 25,5% numa faixa de 5 pontos |  |
| C | teto do goleiro abaixo da linha | – | goleiro chega no máximo a 41; jogador de linha a 50 (produção neutra 0,5 vira limite quando o peso da produção cresce) |  |
| C | desequilíbrio entre posições | – | diferença de 3,0 pontos entre as médias por posição (GOL 36,6, DEF 33,6, MEI 34,0, ATA 34,2) |  |
| C | "sem posição" acima de "com posição" | 303 | média 38,1 contra 34,2: sem posição, a produção sai da conta e não pesa contra |  |
| C | "sem posição" com força 50 | 6 | produção fora da conta: titular experiente sem posição chega a 50 | Léo (50); Luiz Fernando (50); Raul (50); Pedro (50); Fernando (50) |
| C | poucos dados e força alta | 3 | ≤ 5 partidas, ≤ 2 temporadas e força ≥ 30 | Chris Ramos (30); Santi Moreno (30); Catarozzi (31) |
| C | muita experiência e força muito baixa | 1 | ≥ 10 temporadas e força ≤ 20 | Rodinei (20) |
| C | experiência limitada | 60 | experienceDataLimited (carreira anterior fora da base) | Aguirre (35); Gaston Benavidez (35); Portilla (21); Angelo Preciado (21); Cassierra (32) |
| C | sem partidas em 2026 | 13 | força vinda só de experiência, idade e contexto | Fabricio (28); Kevyn (26); Lezcano (18); Athos (14); Cuellar (24) |
| C | dados insuficientes | 2 | força null | Lautaro (null); Gabriel (null) |

## Sensibilidade (pesos ×0,5 e ×1,5, um de cada vez; curva raiz)

| Modelo | componente | ×0,5: média | ×0,5: variação absoluta média | ×0,5: mudam ≥ 3 | ×1,5: média | ×1,5: variação absoluta média | ×1,5: mudam ≥ 3 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | participation | 37,4 | 1,4 | 138 | 37,5 | 0,9 | 40 |
| A | experience | 37,6 | 0,8 | 19 | 37,3 | 0,7 | 1 |
| A | recency | 37,1 | 0,5 | 0 | 37,7 | 0,4 | 0 |
| A | age | 37,0 | 0,5 | 0 | 37,8 | 0,4 | 0 |
| A | production | 38,4 | 1,0 | 141 | 36,6 | 0,9 | 83 |
| A | context | 37,1 | 0,4 | 0 | 37,8 | 0,3 | 0 |
| B | participation | 36,4 | 1,1 | 69 | 36,7 | 0,8 | 24 |
| B | experience | 36,7 | 0,9 | 18 | 36,5 | 0,7 | 0 |
| B | recency | 36,0 | 0,8 | 3 | 37,0 | 0,7 | 0 |
| B | age | 36,1 | 0,5 | 0 | 36,9 | 0,5 | 0 |
| B | production | 38,0 | 1,6 | 255 | 35,4 | 1,2 | 196 |
| B | context | 36,2 | 0,3 | 0 | 36,9 | 0,4 | 0 |
| C | participation | 35,4 | 1,1 | 49 | 35,7 | 0,8 | 23 |
| C | experience | 35,6 | 0,8 | 5 | 35,5 | 0,7 | 0 |
| C | recency | 34,9 | 0,9 | 5 | 36,1 | 0,8 | 0 |
| C | age | 35,0 | 0,6 | 1 | 36,0 | 0,5 | 0 |
| C | production | 37,5 | 2,1 | 342 | 34,2 | 1,5 | 239 |
| C | context | 35,1 | 0,4 | 0 | 35,9 | 0,4 | 0 |

### Contribuição média de cada componente (pontos de força)

| Componente | A média | A desvio | B média | B desvio | C média | C desvio |
|---|---:|---:|---:|---:|---:|---:|
| participation | 15,5 | 4,7 | 10,1 | 3,2 | 8,6 | 2,9 |
| experience | 7,4 | 2,3 | 7,7 | 2,5 | 6,1 | 2,1 |
| recency | 4,4 | 1,3 | 7,0 | 2,2 | 7,4 | 2,6 |
| age | 4,6 | 0,6 | 4,8 | 0,8 | 5,1 | 1,1 |
| production | 1,9 | 2,5 | 3,2 | 4,2 | 4,5 | 5,8 |
| context | 2,6 | 0,2 | 2,7 | 0,4 | 2,9 | 0,6 |
