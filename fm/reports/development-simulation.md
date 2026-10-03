# PlayerDevelopment — simulação do protótipo

> Protótipo de evolução contextual (game/development/development.ts, versão DEV-PROTO-0.1). Não integrado ao jogo; nada aplicado. Partidas sintéticas com padrões fixos (sem RNG). Metodologia: docs/PLAYER-DEVELOPMENT.md.

Força ao fim de cada janela de 5 rodadas (rodadas 5, 10, 15, 20, 25, 30, 35 e 38).

## Casos pedidos e perfis

### CASO A — força 23, destaque na Série D, contratado por clube da Série A (ambiente 40)

Esperado: 23 na chegada; evolução gradual (nunca 23 → 40).

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular, bom rendimento (ambiente 16, teto 20, 22 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 44, 23 anos) | 23 → 24 → 24 → 25 → 26 → 26 → 27 → 27 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 44, 24 anos) | 28 → 29 → 29 → 30 → 31 → 31 → 32 → 32 |
| 4 | Série A, titular, bom rendimento (ambiente 40, teto 42, 25 anos) | 33 → 33 → 34 → 34 → 34 → 35 → 35 → 35 |

Resultado: 23 → 35 (base 23); 12 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R10: 23 → 24 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R20: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R25: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R35: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T3 R5: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R10: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R20: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R25: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R35: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T4 R5: 32 → 33 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)
- T4 R15: 33 → 34 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)
- T4 R30: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)

</details>

### CASO A (variante) — mesmo jogador, mas vira reserva na Série A

Esperado: cresce bem menos: o ambiente só ajuda quem joga.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 16, teto 20, 22 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 2 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 44, 23 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 3 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 44, 24 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 4 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 42, 25 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |

Resultado: 23 → 23 (base 23); 0 mudança(s); maior salto 0.

### CASO B — força 34, Série D, contratado pela Série A (ambiente 40)

Esperado: chega mais rápido ao nível competitivo, ainda no máximo +1 por janela.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 17, teto 21, 24 anos) | 34 → 34 → 34 → 34 → 34 → 34 → 34 → 34 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 42, 25 anos) | 34 → 34 → 35 → 35 → 35 → 36 → 36 → 36 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 42, 26 anos) | 36 → 37 → 37 → 37 → 38 → 38 → 38 → 38 |

Resultado: 34 → 38 (base 34); 4 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R15: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)
- T2 R30: 35 → 36 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)
- T3 R10: 36 → 37 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 26 anos)
- T3 R25: 37 → 38 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 26 anos)

</details>

### CASO C — força 45, continua na Série D

Esperado: não cai por estar na Série D; não cresce acima do ambiente; idade decide a partir dos 31.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 16, teto 18, 27 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |
| 2 | Série D, titular (ambiente 16, teto 18, 28 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |
| 3 | Série D, titular (ambiente 16, teto 16, 29 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |

Resultado: 45 → 45 (base 45); 0 mudança(s); maior salto 0.

### CASO D — força 20, Série A, fica no banco

Esperado: não evolui por pertencer a clube forte; parado, perde ritmo devagar.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, sem jogar (ambiente 40, teto 42, 25 anos) | 20 → 20 → 20 → 20 → 20 → 19 → 19 → 19 |
| 2 | Série A, sem jogar (ambiente 40, teto 42, 26 anos) | 19 → 18 → 18 → 18 → 18 → 17 → 17 → 17 |

Resultado: 20 → 17 (base 20); 3 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R30: 20 → 19 — queda: muito tempo sem jogar (ambiente 40, teto 42, 25 anos)
- T2 R10: 19 → 18 — queda: muito tempo sem jogar (ambiente 40, teto 42, 26 anos)
- T2 R30: 18 → 17 — queda: muito tempo sem jogar (ambiente 40, teto 42, 26 anos)

</details>

### CASO E — força 25, Série A, vira titular com bom rendimento

Esperado: evolução gradual e perceptível ao longo das temporadas.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, titular, bom rendimento (ambiente 40, teto 44, 23 anos) | 25 → 26 → 26 → 27 → 28 → 28 → 29 → 29 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 44, 24 anos) | 30 → 30 → 31 → 31 → 32 → 33 → 33 → 34 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 42, 25 anos) | 34 → 34 → 35 → 35 → 35 → 36 → 36 → 36 |

Resultado: 25 → 36 (base 25); 11 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T1 R20: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T1 R25: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T1 R35: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R5: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R15: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R25: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R30: 32 → 33 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R38: 33 → 34 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R15: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)
- T3 R30: 35 → 36 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 42, 25 anos)

</details>

### PERFIL — estrela pronta (46, 27 anos, Série A ambiente 42)

Esperado: permanece forte.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, titular (ambiente 42, teto 44, 27 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |
| 2 | Série A, titular (ambiente 42, teto 44, 28 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |
| 3 | Série A, titular (ambiente 42, teto 42, 29 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |

Resultado: 46 → 46 (base 46); 0 mudança(s); maior salto 0.

### PERFIL — jovem promessa (22, 18 anos, ambiente 30)

Esperado: cresce.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, rendimento médio (ambiente 30, teto 36, 18 anos) | 22 → 23 → 24 → 25 → 25 → 26 → 27 → 27 |
| 2 | titular, rendimento médio (ambiente 30, teto 36, 19 anos) | 28 → 29 → 30 → 30 → 31 → 32 → 32 → 32 |
| 3 | titular, rendimento médio (ambiente 30, teto 36, 20 anos) | 33 → 33 → 34 → 34 → 34 → 35 → 35 → 35 |

Resultado: 22 → 35 (base 22); 13 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 22 → 23 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 18 anos)
- T1 R15: 23 → 24 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 18 anos)
- T1 R20: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 18 anos)
- T1 R30: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 18 anos)
- T1 R35: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 18 anos)
- T2 R5: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 19 anos)
- T2 R10: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 19 anos)
- T2 R15: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 19 anos)
- T2 R25: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 19 anos)
- T2 R30: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 19 anos)
- T3 R5: 32 → 33 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 20 anos)
- T3 R15: 33 → 34 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 20 anos)
- T3 R30: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 36, 20 anos)

</details>

### PERFIL — jogador mediano (30, 27 anos, ambiente 31)

Esperado: estável, no máximo +1.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, rendimento médio (ambiente 31, teto 33, 27 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | titular, rendimento médio (ambiente 31, teto 33, 28 anos) | 31 → 31 → 31 → 31 → 31 → 31 → 31 → 31 |
| 3 | titular, rendimento médio (ambiente 31, teto 31, 29 anos) | 31 → 31 → 31 → 31 → 31 → 31 → 31 → 31 |

Resultado: 30 → 31 (base 30); 1 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R5: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 31, teto 33, 28 anos)

</details>

### PERFIL — veterano (40, 33 anos, ambiente 38)

Esperado: estabiliza ou começa a cair devagar.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular (ambiente 38, teto 36, 33 anos) | 40 → 40 → 39 → 39 → 39 → 38 → 38 → 38 |
| 2 | titular (ambiente 38, teto 36, 34 anos) | 37 → 37 → 37 → 36 → 36 → 36 → 35 → 35 |
| 3 | titular (ambiente 38, teto 36, 35 anos) | 35 → 34 → 34 → 34 → 33 → 33 → 33 → 33 |

Resultado: 40 → 33 (base 40); 7 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R15: 40 → 39 — queda: idade (ambiente 38, teto 36, 33 anos)
- T1 R30: 39 → 38 — queda: idade (ambiente 38, teto 36, 33 anos)
- T2 R5: 38 → 37 — queda: idade (ambiente 38, teto 36, 34 anos)
- T2 R20: 37 → 36 — queda: idade (ambiente 38, teto 36, 34 anos)
- T2 R35: 36 → 35 — queda: idade (ambiente 38, teto 36, 34 anos)
- T3 R10: 35 → 34 — queda: idade (ambiente 38, teto 36, 35 anos)
- T3 R25: 34 → 33 — queda: idade (ambiente 38, teto 36, 35 anos)

</details>

### PERFIL — subindo de divisão com o clube (24, 23 anos; ambiente sobe 22 → 28 → 34)

Esperado: adaptação: ambiente maior abre espaço, mas o ganho depende de jogar e render.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série C (ambiente 22, teto 26, 23 anos) | 24 → 24 → 24 → 24 → 25 → 25 → 25 → 25 |
| 2 | Série B (clube subiu) (ambiente 28, teto 32, 24 anos) | 26 → 26 → 27 → 27 → 27 → 28 → 28 → 28 |
| 3 | Série A (clube subiu de novo) (ambiente 34, teto 36, 25 anos) | 29 → 29 → 29 → 29 → 30 → 30 → 30 → 30 |

Resultado: 24 → 30 (base 24); 6 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R25: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 22, teto 26, 23 anos)
- T2 R5: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 28, teto 32, 24 anos)
- T2 R15: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 28, teto 32, 24 anos)
- T2 R30: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 28, teto 32, 24 anos)
- T3 R5: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 34, teto 36, 25 anos)
- T3 R25: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 34, teto 36, 25 anos)

</details>

### PERFIL — goleiro jovem titular (24, 21 anos, ambiente 36)

Esperado: cresce mais devagar que o jogador de linha equivalente.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular (ambiente 36, teto 42, 21 anos) | 24 → 25 → 26 → 27 → 27 → 28 → 29 → 29 |
| 2 | titular (ambiente 36, teto 40, 22 anos) | 30 → 31 → 31 → 32 → 32 → 33 → 34 → 34 |
| 3 | titular (ambiente 36, teto 40, 23 anos) | 35 → 35 → 36 → 36 → 36 → 37 → 37 → 37 |

Resultado: 24 → 37 (base 24); 13 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 42, 21 anos)
- T1 R15: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 42, 21 anos)
- T1 R20: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 42, 21 anos)
- T1 R30: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 42, 21 anos)
- T1 R35: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 42, 21 anos)
- T2 R5: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 22 anos)
- T2 R10: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 22 anos)
- T2 R20: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 22 anos)
- T2 R30: 32 → 33 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 22 anos)
- T2 R35: 33 → 34 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 22 anos)
- T3 R5: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 23 anos)
- T3 R15: 35 → 36 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 23 anos)
- T3 R30: 36 → 37 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 23 anos)

</details>

### PERFIL — titular com rendimento ruim (30, 26 anos, ambiente 32)

Esperado: não cresce; pode cair.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, time perde, sem gols (ambiente 32, teto 34, 26 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | titular, time perde, sem gols (ambiente 32, teto 34, 27 anos) | 30 → 30 → 30 → 30 → 31 → 31 → 31 → 31 |

Resultado: 30 → 31 (base 30); 1 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R25: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 32, teto 34, 27 anos)

</details>

### PERFIL — lesionado na metade da temporada (26, 22 anos, ambiente 35)

Esperado: lesão pausa a evolução, não pune.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | joga o 1º turno, lesionado no 2º (ambiente 35, teto 39, 22 anos) | 26 → 27 → 27 → 28 → 28 → 28 → 28 → 28 |

Resultado: 26 → 28 (base 26); 2 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 35, teto 39, 22 anos)
- T1 R20: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 35, teto 39, 22 anos)

</details>

## Tentativas de exploit

### EXPLOIT — "minutos de lixo": entra aos 85' toda rodada num time forte

Esperado: quase nada: o ganho é proporcional aos minutos.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | 5 minutos por jogo (ambiente 40, teto 46, 20 anos) | 22 → 22 → 22 → 22 → 22 → 22 → 22 → 22 |
| 2 | 5 minutos por jogo (ambiente 40, teto 46, 21 anos) | 22 → 22 → 22 → 22 → 22 → 22 → 22 → 22 |

Resultado: 22 → 22 (base 22); 0 mudança(s); maior salto 0.

### EXPLOIT — goleador acima do ambiente (30 num ambiente 18)

Esperado: não passa do teto do ambiente.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | artilheiro de time fraco (ambiente 18, teto 22, 22 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | artilheiro de time fraco (ambiente 18, teto 22, 23 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |

Resultado: 30 → 30 (base 30); 0 mudança(s); maior salto 0.

### EXPLOIT — guardar evolução: jovem titular brilhante (15, 18 anos, ambiente 45)

Esperado: no máximo +1 por janela (8 por temporada); acúmulo limitado.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | máximo de ganho possível (ambiente 45, teto 50, 18 anos) | 15 → 16 → 17 → 18 → 19 → 20 → 21 → 21 |
| 2 | máximo de ganho possível (ambiente 45, teto 50, 19 anos) | 22 → 23 → 24 → 25 → 26 → 27 → 28 → 28 |

Resultado: 15 → 28 (base 15); 13 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 15 → 16 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R15: 16 → 17 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R20: 17 → 18 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R25: 18 → 19 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R30: 19 → 20 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R35: 20 → 21 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T2 R5: 21 → 22 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R10: 22 → 23 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R15: 23 → 24 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R20: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R25: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R30: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R35: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)

</details>

## Resumo

| Caso | início | fim | temporadas | subidas | quedas | maior salto |
|---|---:|---:|---:|---:|---:|---:|
| A | 23 | 35 | 4 | 12 | 0 | 1 |
| A2 | 23 | 23 | 4 | 0 | 0 | 0 |
| B | 34 | 38 | 3 | 4 | 0 | 1 |
| C | 45 | 45 | 3 | 0 | 0 | 0 |
| D | 20 | 17 | 2 | 0 | 3 | 1 |
| E | 25 | 36 | 3 | 11 | 0 | 1 |
| P1 | 46 | 46 | 3 | 0 | 0 | 0 |
| P2 | 22 | 35 | 3 | 13 | 0 | 1 |
| P3 | 30 | 31 | 3 | 1 | 0 | 1 |
| P4 | 40 | 33 | 3 | 0 | 7 | 1 |
| P5 | 24 | 30 | 3 | 6 | 0 | 1 |
| P6 | 24 | 37 | 3 | 13 | 0 | 1 |
| P7 | 30 | 31 | 2 | 1 | 0 | 1 |
| P8 | 26 | 28 | 1 | 2 | 0 | 1 |
| X1 | 22 | 22 | 2 | 0 | 0 | 0 |
| X2 | 30 | 30 | 2 | 0 | 0 | 0 |
| X3 | 15 | 28 | 2 | 13 | 0 | 1 |

## Comparação com a evolução em uso (2 checkpoints/temporada, sorteio estável)

Passo esperado por temporada no sistema atual (média sobre o sorteio, mesmos fatores) × resultado do protótipo na 1ª temporada no novo ambiente.

| Caso | sistema atual: passo esperado/temporada | protótipo: 1ª temporada no ambiente |
|---|---:|---:|
| A (23 na Série A, 22 anos, titular) | +1,40 | +4 |
| B (34 na Série A, 24 anos, titular) | +0,80 | +2 |
| C (45 na Série D, 27 anos, titular) | +0,24 | +0 |
| D (20 na Série A, 25 anos, banco) | +0,24 | -1 |
| E (25 na Série A, 23 anos, titular) | +1,16 | +4 |

O sistema atual usa a média da DIVISÃO como referência e não olha minutos nem rendimento por partida; o protótipo usa o CLUBE como ambiente, exige minutos e só cresce abaixo do teto.
