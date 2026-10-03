# PlayerDevelopment — calibração em 10 temporadas

> Protótipo DEV-PROTO-0.2 (game/development/development.ts). **Só simulação**: nada integrado ao jogo, nenhuma força aplicada, engine inalterado. Partidas sintéticas com padrões fixos (sem RNG). Metodologia: docs/PLAYER-DEVELOPMENT.md.

## Verificações

| Objetivo | ok | medida |
|---|---|---|
| nenhum jovem chega a 50 | sim | maior força final entre promessas: 34 |
| caso excepcional ≤ 6 por temporada | sim | maior ganho numa temporada (todos os casos): +3 |
| nenhuma queda > 3 numa temporada | sim | maior queda numa temporada: -3 |
| reservas não evoluem mais que titulares | sim | C2 22 × C1 34; C9 20 → 19 |
| titulares com bom rendimento evoluem | sim | C1 22 → 34; C10 20 → 31 |
| bom > médio > ruim (mesmo jogador) | sim | C3 32 · C4 30 · C5 24 |
| veterano não desaparece rápido | sim | C6 após 3 temporadas 40; C7 37 |
| veterano titular bom cai menos que reserva | sim | C6 32 × C7 22 |
| ambiente não cria força: 43 em ambiente 40 não sobe para "acompanhar" | sim | E43: 43 → 43 |
| espaço: 23 > 35 > 43 em ambiente 40 | sim | ganhos: +8 · +5 · +0 |
| transferência mantém a força na chegada | sim | T41 20→20, T32 25→25, T21 32→32, T12 37→37, T14 36→36, S46 46→46 |
| estrela não cai por ir para clube fraco (igual ao controle no clube forte) | sim | S46 (ambiente 30): 46 → 46; controle (ambiente 42): 46 → 46 |
| jogador forte em ambiente fraco não cai pelo ambiente (caso 8 não cai mais que o controle; só não cresce) | sim | C8 (ambiente 25): 45 → 45; controle (ambiente 45): 45 → 46 |
| lesão não provoca queda grande | sim | C11 T2: 31 → 32 |
| sem inflação geral | sim | variação média dos 11 casos de 10 temporadas: 0,1 |

## Resumo

| Caso | força inicial | força final | maior ganho/temporada | maior queda/temporada | tempo para o 1º +1 (rodadas) |
|---|---:|---:|---:|---:|---:|
| C1 — promessa 21 anos, força 22, titular, bom rendimento | 22 | 34 | +3 | 0 | 15 |
| C2 — promessa 21 anos, força 22, reserva | 22 | 22 | 0 | 0 | nunca |
| C3 — 25 anos, força 28, titular, bom rendimento | 28 | 32 | +2 | 0 | 25 |
| C4 — 25 anos, força 28, titular, rendimento médio | 28 | 30 | +1 | -1 | 30 |
| C5 — 25 anos, força 28, titular, rendimento ruim | 28 | 24 | +1 | -2 | 48 |
| C6 — veterano 33 anos, força 40, titular, bom rendimento | 40 | 32 | 0 | -2 | nunca |
| C7 — veterano 33 anos, força 40, reserva | 40 | 22 | 0 | -3 | nunca |
| C8 — jogador forte 45 (27 anos) em ambiente 25, titular | 45 | 45 | 0 | 0 | nunca |
| C9 — jogador fraco 20 (24 anos) em ambiente 40, reserva | 20 | 19 | 0 | -1 | nunca |
| C10 — jogador fraco 20 (24 anos) em ambiente 40, titular, bom rendimento | 20 | 31 | +3 | 0 | 15 |
| C11 — lesão de 10 rodadas na 2ª temporada (26 anos, força 30, ambiente 34) | 30 | 33 | +1 | 0 | 25 |
| E23 — Força 23 em ambiente 40 (24 anos, titular médio) | 23 | 31 | +2 | 0 | 20 |
| E35 — Força 35 em ambiente 40 (24 anos, titular médio) | 35 | 40 | +2 | 0 | 25 |
| E43 — Força 43 em ambiente 40 (24 anos, titular médio) | 43 | 43 | 0 | 0 | nunca |
| T41 — D4 → D1: força 20, 22 anos (ambiente 16 → 39) | 20 | 28 | +3 | 0 | 48 |
| T32 — D3 → D2: força 24, 23 anos (ambiente 22 → 30) | 24 | 29 | +2 | 0 | 38 |
| T21 — D2 → D1: força 31, 24 anos (ambiente 30 → 39) | 31 | 35 | +1 | 0 | 30 |
| T12 — D1 → D2: força 37, 27 anos (ambiente 39 → 30) | 37 | 37 | 0 | 0 | nunca |
| T14 — D1 → D4: força 36, 29 anos (ambiente 39 → 16) | 36 | 36 | 0 | 0 | nunca |
| S46c — Controle: a mesma estrela 46 fica no clube forte (ambiente 42) | 46 | 46 | 0 | 0 | nunca |
| C8c — Controle do caso 8: o mesmo 45 em ambiente 45 | 45 | 46 | +1 | 0 | 73 |
| S46 — Estrela 46 (27 anos) vai para clube de ambiente 30 | 46 | 46 | 0 | 0 | nunca |

Efeito médio por temporada (pontos de desenvolvimento somados; 1 ponto ≈ 1 de força):

| Caso | idade (desenvolvimento) | rendimento | envelhecimento | parado | total | oportunidade média do ambiente |
|---|---:|---:|---:|---:|---:|---:|
| C1 | 0,8 | 1,0 | 0,0 | 0,0 | 1,8 | 0,4 |
| C2 | 0,1 | 0,0 | 0,0 | 0,0 | 0,1 | 0,9 |
| C3 | 0,2 | 0,8 | -0,3 | 0,0 | 0,7 | 0,2 |
| C4 | 0,2 | 0,3 | -0,3 | 0,0 | 0,2 | 0,3 |
| C5 | 0,2 | -0,3 | -0,4 | 0,0 | -0,4 | 0,7 |
| C6 | 0,0 | 0,7 | -1,6 | 0,0 | -0,8 | 0,1 |
| C7 | 0,0 | 0,0 | -1,9 | 0,0 | -1,9 | 0,5 |
| C8 | 0,0 | 1,4 | -0,5 | 0,0 | 0,9 | 0,0 |
| C9 | 0,0 | 0,0 | -0,3 | 0,0 | -0,2 | 1,0 |
| C10 | 0,5 | 0,8 | -0,2 | 0,0 | 1,2 | 1,0 |
| C11 | 0,1 | 0,8 | -0,4 | 0,0 | 0,5 | 0,3 |
| E23 | 0,5 | 0,4 | -0,2 | 0,0 | 0,7 | 0,9 |
| E35 | 0,4 | 0,3 | -0,2 | 0,0 | 0,4 | 0,3 |
| E43 | 0,0 | 0,4 | -0,2 | 0,0 | 0,2 | 0,0 |
| T41 | 1,4 | 0,4 | 0,0 | 0,0 | 1,8 | 0,8 |
| T32 | 0,9 | 0,3 | 0,0 | 0,0 | 1,2 | 0,6 |
| T21 | 0,7 | 0,3 | 0,0 | 0,0 | 1,0 | 0,7 |
| T12 | 0,1 | 1,2 | -0,1 | 0,0 | 1,1 | 0,1 |
| T14 | 0,0 | 0,9 | -0,4 | 0,0 | 0,5 | 0,1 |
| S46c | 0,0 | 1,4 | -0,2 | 0,0 | 1,2 | 0,0 |
| C8c | 0,0 | 1,2 | -0,5 | 0,0 | 0,7 | 0,1 |
| S46 | 0,0 | 1,4 | -0,2 | 0,0 | 1,2 | 0,0 |

## 10 temporadas

### C1 — Caso 1 — promessa 21 anos, força 22, titular, bom rendimento

Esperado: cresce de forma perceptível, sem chegar a 50; estabiliza no limite do ambiente; idade cobra no fim.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 21 | 32 | 37 | titular, bom | 22 → 25 | +3 | 3 | 0 | 2,4 | 1,2 | 0,0 | 0,0 | `█████████████` 25 |
| 2 | 22 | 32 | 37 | titular, bom | 25 → 28 | +3 | 3 | 0 | 1,9 | 1,1 | 0,0 | 0,0 | `██████████████` 28 |
| 3 | 23 | 32 | 36 | titular, bom | 28 → 31 | +3 | 3 | 0 | 1,5 | 1,0 | 0,0 | 0,0 | `████████████████` 31 |
| 4 | 24 | 32 | 36 | titular, bom | 31 → 33 | +2 | 2 | 0 | 1,2 | 0,9 | 0,0 | 0,0 | `█████████████████` 33 |
| 5 | 25 | 32 | 35 | titular, bom | 33 → 34 | +1 | 1 | 0 | 0,5 | 0,5 | 0,0 | 0,0 | `█████████████████` 34 |
| 6 | 26 | 32 | 35 | titular, bom | 34 → 34 | 0 | 0 | 0 | 0,2 | 0,3 | 0,0 | 0,0 | `█████████████████` 34 |
| 7 | 27 | 32 | 34 | titular, bom | 34 → 34 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `█████████████████` 34 |
| 8 | 28 | 32 | 33 | titular, bom | 34 → 34 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `█████████████████` 34 |
| 9 | 29 | 32 | 33 | titular, bom | 34 → 34 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `█████████████████` 34 |
| 10 | 30 | 32 | 32 | titular, bom | 34 → 34 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `█████████████████` 34 |

Resultado: 22 → 34; maior ganho +3, maior queda 0 por temporada; 1º +1 na rodada 15.

### C2 — Caso 2 — promessa 21 anos, força 22, reserva

Esperado: cresce pouco: sem minutos não há desenvolvimento.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 21 | 32 | 37 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,2 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 2 | 22 | 32 | 37 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,2 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 3 | 23 | 32 | 36 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,2 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 4 | 24 | 32 | 36 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,2 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 5 | 25 | 32 | 35 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,1 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 6 | 26 | 32 | 35 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,1 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 7 | 27 | 32 | 34 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 8 | 28 | 32 | 33 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 9 | 29 | 32 | 33 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `███████████` 22 |
| 10 | 30 | 32 | 32 | reserva (25 min a cada 3 rodadas) | 22 → 22 | 0 | 0 | 0 | 0,0 | 0,0 | -0,2 | 0,0 | `███████████` 22 |

Resultado: 22 → 22; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca).

### C3 — Caso 3 — 25 anos, força 28, titular, bom rendimento

Esperado: sobe um pouco até o limite do ambiente e se mantém.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 25 | 32 | 35 | titular, bom | 28 → 29 | +1 | 1 | 0 | 1,1 | 0,8 | 0,0 | 0,0 | `███████████████` 29 |
| 2 | 26 | 32 | 35 | titular, bom | 29 → 31 | +2 | 2 | 0 | 0,8 | 0,7 | 0,0 | 0,0 | `████████████████` 31 |
| 3 | 27 | 32 | 34 | titular, bom | 31 → 32 | +1 | 1 | 0 | 0,3 | 0,7 | 0,0 | 0,0 | `████████████████` 32 |
| 4 | 28 | 32 | 33 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,1 | 0,2 | 0,0 | 0,0 | `████████████████` 32 |
| 5 | 29 | 32 | 33 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 0,1 | 0,0 | 0,0 | `████████████████` 32 |
| 6 | 30 | 32 | 32 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 1,1 | -0,2 | 0,0 | `████████████████` 32 |
| 7 | 31 | 32 | 31 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 1,1 | -0,4 | 0,0 | `████████████████` 32 |
| 8 | 32 | 32 | 31 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 1,1 | -0,6 | 0,0 | `████████████████` 32 |
| 9 | 33 | 32 | 30 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 1,1 | -0,8 | 0,0 | `████████████████` 32 |
| 10 | 34 | 32 | 30 | titular, bom | 32 → 32 | 0 | 0 | 0 | 0,0 | 1,1 | -1,0 | 0,0 | `████████████████` 32 |

Resultado: 28 → 32; maior ganho +2, maior queda 0 por temporada; 1º +1 na rodada 25.

### C4 — Caso 4 — 25 anos, força 28, titular, rendimento médio

Esperado: estável ou pouco acima.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 25 | 32 | 35 | titular, médio | 28 → 29 | +1 | 1 | 0 | 1,1 | 0,3 | 0,0 | 0,0 | `███████████████` 29 |
| 2 | 26 | 32 | 35 | titular, médio | 29 → 30 | +1 | 1 | 0 | 0,8 | 0,3 | 0,0 | 0,0 | `███████████████` 30 |
| 3 | 27 | 32 | 34 | titular, médio | 30 → 31 | +1 | 1 | 0 | 0,4 | 0,4 | 0,0 | 0,0 | `████████████████` 31 |
| 4 | 28 | 32 | 33 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,1 | 0,2 | 0,0 | 0,0 | `████████████████` 31 |
| 5 | 29 | 32 | 33 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,1 | 0,0 | 0,0 | `████████████████` 31 |
| 6 | 30 | 32 | 32 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,0 | -0,2 | 0,0 | `████████████████` 31 |
| 7 | 31 | 32 | 31 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,5 | 0,0 | `████████████████` 31 |
| 8 | 32 | 32 | 31 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,7 | 0,0 | `████████████████` 31 |
| 9 | 33 | 32 | 30 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,9 | 0,0 | `████████████████` 31 |
| 10 | 34 | 32 | 30 | titular, médio | 31 → 30 | -1 | 0 | 1 | 0,0 | 0,4 | -1,1 | 0,0 | `███████████████` 30 |

Resultado: 28 → 30; maior ganho +1, maior queda -1 por temporada; 1º +1 na rodada 30.

### C5 — Caso 5 — 25 anos, força 28, titular, rendimento ruim

Esperado: não cresce; cai devagar.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 25 | 32 | 35 | titular, ruim | 28 → 28 | 0 | 0 | 0 | 1,1 | -0,2 | 0,0 | 0,0 | `██████████████` 28 |
| 2 | 26 | 32 | 35 | titular, ruim | 28 → 29 | +1 | 1 | 0 | 0,8 | -0,2 | 0,0 | 0,0 | `███████████████` 29 |
| 3 | 27 | 32 | 34 | titular, ruim | 29 → 29 | 0 | 0 | 0 | 0,2 | 0,1 | 0,0 | 0,0 | `███████████████` 29 |
| 4 | 28 | 32 | 33 | titular, ruim | 29 → 29 | 0 | 0 | 0 | 0,1 | -0,1 | 0,0 | 0,0 | `███████████████` 29 |
| 5 | 29 | 32 | 33 | titular, ruim | 29 → 29 | 0 | 0 | 0 | 0,0 | -0,4 | 0,0 | 0,0 | `███████████████` 29 |
| 6 | 30 | 32 | 32 | titular, ruim | 29 → 29 | 0 | 0 | 0 | 0,0 | -0,4 | -0,2 | 0,0 | `███████████████` 29 |
| 7 | 31 | 32 | 31 | titular, ruim | 29 → 28 | -1 | 0 | 1 | 0,0 | -0,4 | -0,5 | 0,0 | `██████████████` 28 |
| 8 | 32 | 32 | 31 | titular, ruim | 28 → 27 | -1 | 0 | 1 | 0,0 | -0,4 | -0,7 | 0,0 | `██████████████` 27 |
| 9 | 33 | 32 | 30 | titular, ruim | 27 → 26 | -1 | 0 | 1 | 0,0 | -0,3 | -1,0 | 0,0 | `█████████████` 26 |
| 10 | 34 | 32 | 30 | titular, ruim | 26 → 24 | -2 | 0 | 2 | 0,0 | -0,3 | -1,2 | 0,0 | `████████████` 24 |

Resultado: 28 → 24; maior ganho +1, maior queda -2 por temporada; 1º +1 na rodada 48.

### C6 — Caso 6 — veterano 33 anos, força 40, titular, bom rendimento

Esperado: cai devagar; o rendimento compensa parte da idade.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 33 | 38 | 36 | titular, bom | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,8 | -0,8 | 0,0 | `████████████████████` 40 |
| 2 | 34 | 38 | 36 | titular, bom | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,8 | -1,0 | 0,0 | `████████████████████` 40 |
| 3 | 35 | 38 | 36 | titular, bom | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,8 | -1,2 | 0,0 | `████████████████████` 40 |
| 4 | 36 | 38 | 36 | titular, bom | 40 → 39 | -1 | 0 | 1 | 0,0 | 0,8 | -1,4 | 0,0 | `████████████████████` 39 |
| 5 | 37 | 38 | 36 | titular, bom | 39 → 38 | -1 | 0 | 1 | 0,0 | 0,8 | -1,7 | 0,0 | `███████████████████` 38 |
| 6 | 38 | 38 | 36 | titular, bom | 38 → 37 | -1 | 0 | 1 | 0,0 | 0,8 | -1,9 | 0,0 | `███████████████████` 37 |
| 7 | 39 | 38 | 36 | titular, bom | 37 → 36 | -1 | 0 | 1 | 0,0 | 0,8 | -1,9 | 0,0 | `██████████████████` 36 |
| 8 | 40 | 38 | 36 | titular, bom | 36 → 35 | -1 | 0 | 1 | 0,0 | 0,8 | -1,9 | 0,0 | `██████████████████` 35 |
| 9 | 41 | 38 | 36 | titular, bom | 35 → 34 | -1 | 0 | 1 | 0,0 | 0,2 | -1,9 | 0,0 | `█████████████████` 34 |
| 10 | 42 | 38 | 36 | titular, bom | 34 → 32 | -2 | 0 | 2 | 0,0 | 0,6 | -1,9 | 0,0 | `████████████████` 32 |

Resultado: 40 → 32; maior ganho 0, maior queda -2 por temporada; 1º +1 na rodada — (nunca).

### C7 — Caso 7 — veterano 33 anos, força 40, reserva

Esperado: cai mais rápido que o titular, sem desaparecer de uma vez.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 33 | 38 | 36 | reserva | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,0 | -1,0 | 0,0 | `████████████████████` 40 |
| 2 | 34 | 38 | 36 | reserva | 40 → 38 | -2 | 0 | 2 | 0,0 | 0,0 | -1,3 | 0,0 | `███████████████████` 38 |
| 3 | 35 | 38 | 36 | reserva | 38 → 37 | -1 | 0 | 1 | 0,0 | 0,0 | -1,5 | 0,0 | `███████████████████` 37 |
| 4 | 36 | 38 | 36 | reserva | 37 → 35 | -2 | 0 | 2 | 0,0 | 0,0 | -1,8 | 0,0 | `██████████████████` 35 |
| 5 | 37 | 38 | 36 | reserva | 35 → 33 | -2 | 0 | 2 | 0,0 | 0,0 | -2,0 | 0,0 | `█████████████████` 33 |
| 6 | 38 | 38 | 36 | reserva | 33 → 31 | -2 | 0 | 2 | 0,0 | 0,0 | -2,3 | 0,0 | `████████████████` 31 |
| 7 | 39 | 38 | 36 | reserva | 31 → 28 | -3 | 0 | 3 | 0,0 | 0,0 | -2,3 | 0,0 | `██████████████` 28 |
| 8 | 40 | 38 | 36 | reserva | 28 → 26 | -2 | 0 | 2 | 0,0 | 0,0 | -2,3 | 0,0 | `█████████████` 26 |
| 9 | 41 | 38 | 36 | reserva | 26 → 24 | -2 | 0 | 2 | 0,0 | 0,0 | -2,3 | 0,0 | `████████████` 24 |
| 10 | 42 | 38 | 36 | reserva | 24 → 22 | -2 | 0 | 2 | 0,0 | 0,0 | -2,3 | 0,0 | `███████████` 22 |

Resultado: 40 → 22; maior ganho 0, maior queda -3 por temporada; 1º +1 na rodada — (nunca).

### C8 — Caso 8 — jogador forte 45 (27 anos) em ambiente 25, titular

Esperado: não cai pelo ambiente; só a idade, devagar.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 27 | 25 | 27 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 45 |
| 2 | 28 | 25 | 26 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 45 |
| 3 | 29 | 25 | 26 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 45 |
| 4 | 30 | 25 | 25 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `███████████████████████` 45 |
| 5 | 31 | 25 | 24 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -0,3 | 0,0 | `███████████████████████` 45 |
| 6 | 32 | 25 | 24 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -0,5 | 0,0 | `███████████████████████` 45 |
| 7 | 33 | 25 | 23 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -0,7 | 0,0 | `███████████████████████` 45 |
| 8 | 34 | 25 | 23 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -0,9 | 0,0 | `███████████████████████` 45 |
| 9 | 35 | 25 | 23 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -1,1 | 0,0 | `███████████████████████` 45 |
| 10 | 36 | 25 | 23 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,0 | 1,4 | -1,2 | 0,0 | `███████████████████████` 45 |

Resultado: 45 → 45; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca).

### C9 — Caso 9 — jogador fraco 20 (24 anos) em ambiente 40, reserva

Esperado: não cresce por estar num clube forte.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 40 | 44 | reserva | 20 → 20 | 0 | 0 | 0 | 0,2 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 2 | 25 | 40 | 43 | reserva | 20 → 20 | 0 | 0 | 0 | 0,1 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 3 | 26 | 40 | 43 | reserva | 20 → 20 | 0 | 0 | 0 | 0,1 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 4 | 27 | 40 | 42 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 5 | 28 | 40 | 41 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 6 | 29 | 40 | 41 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `██████████` 20 |
| 7 | 30 | 40 | 40 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | -0,2 | 0,0 | `██████████` 20 |
| 8 | 31 | 40 | 39 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | -0,5 | 0,0 | `██████████` 20 |
| 9 | 32 | 40 | 39 | reserva | 20 → 20 | 0 | 0 | 0 | 0,0 | 0,0 | -0,7 | 0,0 | `██████████` 20 |
| 10 | 33 | 40 | 38 | reserva | 20 → 19 | -1 | 0 | 1 | 0,0 | 0,0 | -1,0 | 0,0 | `██████████` 19 |

Resultado: 20 → 19; maior ganho 0, maior queda -1 por temporada; 1º +1 na rodada — (nunca).

### C10 — Caso 10 — jogador fraco 20 (24 anos) em ambiente 40, titular, bom rendimento

Esperado: cresce gradualmente; não vira 40 de uma vez.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 40 | 44 | titular, bom | 20 → 22 | +2 | 2 | 0 | 1,9 | 0,8 | 0,0 | 0,0 | `███████████` 22 |
| 2 | 25 | 40 | 43 | titular, bom | 22 → 25 | +3 | 3 | 0 | 1,5 | 0,8 | 0,0 | 0,0 | `█████████████` 25 |
| 3 | 26 | 40 | 43 | titular, bom | 25 → 27 | +2 | 2 | 0 | 1,1 | 0,8 | 0,0 | 0,0 | `██████████████` 27 |
| 4 | 27 | 40 | 42 | titular, bom | 27 → 28 | +1 | 1 | 0 | 0,6 | 1,0 | 0,0 | 0,0 | `██████████████` 28 |
| 5 | 28 | 40 | 41 | titular, bom | 28 → 29 | +1 | 1 | 0 | 0,3 | 0,9 | 0,0 | 0,0 | `███████████████` 29 |
| 6 | 29 | 40 | 41 | titular, bom | 29 → 30 | +1 | 1 | 0 | 0,0 | 0,8 | 0,0 | 0,0 | `███████████████` 30 |
| 7 | 30 | 40 | 40 | titular, bom | 30 → 31 | +1 | 1 | 0 | 0,0 | 0,8 | -0,2 | 0,0 | `████████████████` 31 |
| 8 | 31 | 40 | 39 | titular, bom | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,7 | -0,4 | 0,0 | `████████████████` 31 |
| 9 | 32 | 40 | 39 | titular, bom | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,7 | -0,6 | 0,0 | `████████████████` 31 |
| 10 | 33 | 40 | 38 | titular, bom | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,7 | -0,8 | 0,0 | `████████████████` 31 |

Resultado: 20 → 31; maior ganho +3, maior queda 0 por temporada; 1º +1 na rodada 15.

### C11 — Caso 11 — lesão de 10 rodadas na 2ª temporada (26 anos, força 30, ambiente 34)

Esperado: a lesão só interrompe o desenvolvimento; sem queda grande.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 26 | 34 | 37 | titular, bom (lesão na T2) | 30 → 31 | +1 | 1 | 0 | 0,8 | 0,8 | 0,0 | 0,0 | `████████████████` 31 |
| 2 | 27 | 34 | 36 | titular, bom (lesão na T2) | 31 → 32 | +1 | 1 | 0 | 0,3 | 0,6 | 0,0 | 0,0 | `████████████████` 32 |
| 3 | 28 | 34 | 35 | titular, bom (lesão na T2) | 32 → 33 | +1 | 1 | 0 | 0,2 | 0,6 | 0,0 | 0,0 | `█████████████████` 33 |
| 4 | 29 | 34 | 35 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `█████████████████` 33 |
| 5 | 30 | 34 | 34 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 0,1 | -0,2 | 0,0 | `█████████████████` 33 |
| 6 | 31 | 34 | 33 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 1,1 | -0,4 | 0,0 | `█████████████████` 33 |
| 7 | 32 | 34 | 33 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 1,1 | -0,6 | 0,0 | `█████████████████` 33 |
| 8 | 33 | 34 | 32 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 1,1 | -0,8 | 0,0 | `█████████████████` 33 |
| 9 | 34 | 34 | 32 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 1,1 | -1,0 | 0,0 | `█████████████████` 33 |
| 10 | 35 | 34 | 32 | titular, bom (lesão na T2) | 33 → 33 | 0 | 0 | 0 | 0,0 | 1,1 | -1,2 | 0,0 | `█████████████████` 33 |

Resultado: 30 → 33; maior ganho +1, maior queda 0 por temporada; 1º +1 na rodada 25.

## Força × ambiente (40)

### E23 — Força 23 em ambiente 40 (24 anos, titular médio)

Esperado: maior espaço potencial.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 40 | 44 | titular, médio | 23 → 25 | +2 | 2 | 0 | 1,9 | 0,4 | 0,0 | 0,0 | `█████████████` 25 |
| 2 | 25 | 40 | 43 | titular, médio | 25 → 27 | +2 | 2 | 0 | 1,5 | 0,4 | 0,0 | 0,0 | `██████████████` 27 |
| 3 | 26 | 40 | 43 | titular, médio | 27 → 28 | +1 | 1 | 0 | 1,1 | 0,4 | 0,0 | 0,0 | `██████████████` 28 |
| 4 | 27 | 40 | 42 | titular, médio | 28 → 29 | +1 | 1 | 0 | 0,6 | 0,5 | 0,0 | 0,0 | `███████████████` 29 |
| 5 | 28 | 40 | 41 | titular, médio | 29 → 30 | +1 | 1 | 0 | 0,3 | 0,4 | 0,0 | 0,0 | `███████████████` 30 |
| 6 | 29 | 40 | 41 | titular, médio | 30 → 30 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `███████████████` 30 |
| 7 | 30 | 40 | 40 | titular, médio | 30 → 31 | +1 | 1 | 0 | 0,0 | 0,4 | -0,2 | 0,0 | `████████████████` 31 |
| 8 | 31 | 40 | 39 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,5 | 0,0 | `████████████████` 31 |
| 9 | 32 | 40 | 39 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,7 | 0,0 | `████████████████` 31 |
| 10 | 33 | 40 | 38 | titular, médio | 31 → 31 | 0 | 0 | 0 | 0,0 | 0,4 | -0,9 | 0,0 | `████████████████` 31 |

Resultado: 23 → 31; maior ganho +2, maior queda 0 por temporada; 1º +1 na rodada 20.

### E35 — Força 35 em ambiente 40 (24 anos, titular médio)

Esperado: espaço moderado.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 40 | 44 | titular, médio | 35 → 36 | +1 | 1 | 0 | 1,4 | 0,3 | 0,0 | 0,0 | `██████████████████` 36 |
| 2 | 25 | 40 | 43 | titular, médio | 36 → 38 | +2 | 2 | 0 | 1,1 | 0,3 | 0,0 | 0,0 | `███████████████████` 38 |
| 3 | 26 | 40 | 43 | titular, médio | 38 → 39 | +1 | 1 | 0 | 0,8 | 0,3 | 0,0 | 0,0 | `████████████████████` 39 |
| 4 | 27 | 40 | 42 | titular, médio | 39 → 39 | 0 | 0 | 0 | 0,4 | 0,3 | 0,0 | 0,0 | `████████████████████` 39 |
| 5 | 28 | 40 | 41 | titular, médio | 39 → 40 | +1 | 1 | 0 | 0,1 | 0,1 | 0,0 | 0,0 | `████████████████████` 40 |
| 6 | 29 | 40 | 41 | titular, médio | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,0 | 0,0 | 0,0 | `████████████████████` 40 |
| 7 | 30 | 40 | 40 | titular, médio | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,4 | -0,2 | 0,0 | `████████████████████` 40 |
| 8 | 31 | 40 | 39 | titular, médio | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,4 | -0,5 | 0,0 | `████████████████████` 40 |
| 9 | 32 | 40 | 39 | titular, médio | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,4 | -0,7 | 0,0 | `████████████████████` 40 |
| 10 | 33 | 40 | 38 | titular, médio | 40 → 40 | 0 | 0 | 0 | 0,0 | 0,4 | -0,9 | 0,0 | `████████████████████` 40 |

Resultado: 35 → 40; maior ganho +2, maior queda 0 por temporada; 1º +1 na rodada 25.

### E43 — Força 43 em ambiente 40 (24 anos, titular médio)

Esperado: não precisa "acompanhar" o ambiente.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 40 | 44 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,3 | 0,1 | 0,0 | 0,0 | `██████████████████████` 43 |
| 2 | 25 | 40 | 43 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `██████████████████████` 43 |
| 3 | 26 | 40 | 43 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `██████████████████████` 43 |
| 4 | 27 | 40 | 42 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `██████████████████████` 43 |
| 5 | 28 | 40 | 41 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `██████████████████████` 43 |
| 6 | 29 | 40 | 41 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | 0,0 | 0,0 | `██████████████████████` 43 |
| 7 | 30 | 40 | 40 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | -0,2 | 0,0 | `██████████████████████` 43 |
| 8 | 31 | 40 | 39 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | -0,5 | 0,0 | `██████████████████████` 43 |
| 9 | 32 | 40 | 39 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | -0,7 | 0,0 | `██████████████████████` 43 |
| 10 | 33 | 40 | 38 | titular, médio | 43 → 43 | 0 | 0 | 0 | 0,0 | 0,4 | -0,9 | 0,0 | `██████████████████████` 43 |

Resultado: 43 → 43; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca).

## Transferências

### T41 — D4 → D1: força 20, 22 anos (ambiente 16 → 39)

Esperado: mantém 20 na chegada; depois evolui.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 22 | 16 | 21 | D4, titular | 20 → 20 | 0 | 0 | 0 | 0,4 | 0,2 | 0,0 | 0,0 | `██████████` 20 |
| 2 | 23 | 39 | 43 | D1, titular médio | 20 → 23 | +3 | 3 | 0 | 2,2 | 0,4 | 0,0 | 0,0 | `████████████` 23 |
| 3 | 24 | 39 | 43 | D1, titular médio | 23 → 25 | +2 | 2 | 0 | 1,9 | 0,4 | 0,0 | 0,0 | `█████████████` 25 |
| 4 | 25 | 39 | 42 | D1, titular médio | 25 → 27 | +2 | 2 | 0 | 1,5 | 0,4 | 0,0 | 0,0 | `██████████████` 27 |
| 5 | 26 | 39 | 42 | D1, titular médio | 27 → 28 | +1 | 1 | 0 | 0,9 | 0,6 | 0,0 | 0,0 | `██████████████` 28 |

Resultado: 20 → 28; maior ganho +3, maior queda 0 por temporada; 1º +1 na rodada 48. Transferência: força 20 antes e 20 depois da 1ª rodada no novo clube.

### T32 — D3 → D2: força 24, 23 anos (ambiente 22 → 30)

Esperado: mantém 24 na chegada.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 23 | 22 | 26 | D3, titular | 24 → 25 | +1 | 1 | 0 | 0,7 | 0,4 | 0,0 | 0,0 | `█████████████` 25 |
| 2 | 24 | 30 | 34 | D2, titular médio | 25 → 26 | +1 | 1 | 0 | 1,4 | 0,3 | 0,0 | 0,0 | `█████████████` 26 |
| 3 | 25 | 30 | 33 | D2, titular médio | 26 → 28 | +2 | 2 | 0 | 1,1 | 0,3 | 0,0 | 0,0 | `██████████████` 28 |
| 4 | 26 | 30 | 33 | D2, titular médio | 28 → 29 | +1 | 1 | 0 | 0,8 | 0,3 | 0,0 | 0,0 | `███████████████` 29 |
| 5 | 27 | 30 | 32 | D2, titular médio | 29 → 29 | 0 | 0 | 0 | 0,4 | 0,3 | 0,0 | 0,0 | `███████████████` 29 |

Resultado: 24 → 29; maior ganho +2, maior queda 0 por temporada; 1º +1 na rodada 38. Transferência: força 25 antes e 25 depois da 1ª rodada no novo clube.

### T21 — D2 → D1: força 31, 24 anos (ambiente 30 → 39)

Esperado: mantém 31 na chegada.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 24 | 30 | 34 | D2, titular | 31 → 32 | +1 | 1 | 0 | 0,9 | 0,4 | 0,0 | 0,0 | `████████████████` 32 |
| 2 | 25 | 39 | 42 | D1, titular médio | 32 → 33 | +1 | 1 | 0 | 1,2 | 0,2 | 0,0 | 0,0 | `█████████████████` 33 |
| 3 | 26 | 39 | 42 | D1, titular médio | 33 → 34 | +1 | 1 | 0 | 0,9 | 0,2 | 0,0 | 0,0 | `█████████████████` 34 |
| 4 | 27 | 39 | 41 | D1, titular médio | 34 → 35 | +1 | 1 | 0 | 0,3 | 0,4 | 0,0 | 0,0 | `██████████████████` 35 |
| 5 | 28 | 39 | 40 | D1, titular médio | 35 → 35 | 0 | 0 | 0 | 0,2 | 0,2 | 0,0 | 0,0 | `██████████████████` 35 |

Resultado: 31 → 35; maior ganho +1, maior queda 0 por temporada; 1º +1 na rodada 30. Transferência: força 32 antes e 32 depois da 1ª rodada no novo clube.

### T12 — D1 → D2: força 37, 27 anos (ambiente 39 → 30)

Esperado: não cai pela divisão.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 27 | 39 | 41 | D1, titular médio | 37 → 37 | 0 | 0 | 0 | 0,4 | 0,3 | 0,0 | 0,0 | `███████████████████` 37 |
| 2 | 28 | 30 | 31 | D2, titular | 37 → 37 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████` 37 |
| 3 | 29 | 30 | 31 | D2, titular | 37 → 37 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████` 37 |
| 4 | 30 | 30 | 30 | D2, titular | 37 → 37 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `███████████████████` 37 |
| 5 | 31 | 30 | 29 | D2, titular | 37 → 37 | 0 | 0 | 0 | 0,0 | 1,4 | -0,3 | 0,0 | `███████████████████` 37 |

Resultado: 37 → 37; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca). Transferência: força 37 antes e 37 depois da 1ª rodada no novo clube.

### T14 — D1 → D4: força 36, 29 anos (ambiente 39 → 16)

Esperado: não cai pela divisão; só a idade.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 29 | 39 | 40 | D1, titular médio | 36 → 36 | 0 | 0 | 0 | 0,0 | 0,2 | 0,0 | 0,0 | `██████████████████` 36 |
| 2 | 30 | 16 | 16 | D4, titular | 36 → 36 | 0 | 0 | 0 | 0,0 | 1,1 | -0,2 | 0,0 | `██████████████████` 36 |
| 3 | 31 | 16 | 15 | D4, titular | 36 → 36 | 0 | 0 | 0 | 0,0 | 1,1 | -0,4 | 0,0 | `██████████████████` 36 |
| 4 | 32 | 16 | 15 | D4, titular | 36 → 36 | 0 | 0 | 0 | 0,0 | 1,1 | -0,6 | 0,0 | `██████████████████` 36 |
| 5 | 33 | 16 | 14 | D4, titular | 36 → 36 | 0 | 0 | 0 | 0,0 | 1,1 | -0,8 | 0,0 | `██████████████████` 36 |

Resultado: 36 → 36; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca). Transferência: força 36 antes e 36 depois da 1ª rodada no novo clube.

## Estrela pronta

### S46c — Controle: a mesma estrela 46 fica no clube forte (ambiente 42)

Esperado: referência: só a idade age.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 27 | 42 | 44 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 2 | 28 | 42 | 43 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 3 | 29 | 42 | 43 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 4 | 30 | 42 | 42 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `███████████████████████` 46 |
| 5 | 31 | 42 | 41 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,3 | 0,0 | `███████████████████████` 46 |
| 6 | 32 | 42 | 41 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,5 | 0,0 | `███████████████████████` 46 |

Resultado: 46 → 46; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca).

## 10 temporadas

### C8c — Controle do caso 8: o mesmo 45 em ambiente 45

Esperado: referência: só a idade age.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 27 | 45 | 47 | titular, bom | 45 → 45 | 0 | 0 | 0 | 0,3 | 0,6 | 0,0 | 0,0 | `███████████████████████` 45 |
| 2 | 28 | 45 | 46 | titular, bom | 45 → 46 | +1 | 1 | 0 | 0,0 | 0,3 | 0,0 | 0,0 | `███████████████████████` 46 |
| 3 | 29 | 45 | 46 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 4 | 30 | 45 | 45 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `███████████████████████` 46 |
| 5 | 31 | 45 | 44 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,3 | 0,0 | `███████████████████████` 46 |
| 6 | 32 | 45 | 44 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,5 | 0,0 | `███████████████████████` 46 |
| 7 | 33 | 45 | 43 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,7 | 0,0 | `███████████████████████` 46 |
| 8 | 34 | 45 | 43 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,9 | 0,0 | `███████████████████████` 46 |
| 9 | 35 | 45 | 43 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -1,1 | 0,0 | `███████████████████████` 46 |
| 10 | 36 | 45 | 43 | titular, bom | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -1,2 | 0,0 | `███████████████████████` 46 |

Resultado: 45 → 46; maior ganho +1, maior queda 0 por temporada; 1º +1 na rodada 73.

## Estrela pronta

### S46 — Estrela 46 (27 anos) vai para clube de ambiente 30

Esperado: não reduz porque o clube é mais fraco.

| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 27 | 42 | 44 | clube forte | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 2 | 28 | 30 | 31 | clube de ambiente 30 | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 3 | 29 | 30 | 31 | clube de ambiente 30 | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | 0,0 | 0,0 | `███████████████████████` 46 |
| 4 | 30 | 30 | 30 | clube de ambiente 30 | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,2 | 0,0 | `███████████████████████` 46 |
| 5 | 31 | 30 | 29 | clube de ambiente 30 | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,3 | 0,0 | `███████████████████████` 46 |
| 6 | 32 | 30 | 29 | clube de ambiente 30 | 46 → 46 | 0 | 0 | 0 | 0,0 | 1,4 | -0,5 | 0,0 | `███████████████████████` 46 |

Resultado: 46 → 46; maior ganho 0, maior queda 0 por temporada; 1º +1 na rodada — (nunca). Transferência: força 46 antes e 46 depois da 1ª rodada no novo clube.

## Variante: teto de 4 subidas por temporada (só comparação)

| Caso | sem teto: final (maior ganho) | com teto 4: final (maior ganho) |
|---|---:|---:|
| C1 | 34 (+3) | 34 (+3) |
| C10 | 31 (+3) | 31 (+3) |
| E23 | 31 (+2) | 31 (+2) |
| T41 | 28 (+3) | 28 (+3) |
