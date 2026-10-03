# PlayerDevelopment — simulação do protótipo

> Protótipo de evolução contextual (game/development/development.ts, versão DEV-PROTO-0.1). Não integrado ao jogo; nada aplicado. Partidas sintéticas com padrões fixos (sem RNG). Metodologia: docs/PLAYER-DEVELOPMENT.md.

Força ao fim de cada janela de 5 rodadas (rodadas 5, 10, 15, 20, 25, 30, 35 e 38).

## Casos pedidos e perfis

### CASO A — força 23, destaque na Série D, contratado por clube da Série A (ambiente 40)

Esperado: 23 na chegada; evolução gradual (nunca 23 → 40).

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular, bom rendimento (ambiente 16, teto 21, 22 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 44, 23 anos) | 23 → 23 → 24 → 24 → 25 → 25 → 25 → 26 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 44, 24 anos) | 26 → 26 → 27 → 27 → 28 → 28 → 28 → 29 |
| 4 | Série A, titular, bom rendimento (ambiente 40, teto 43, 25 anos) | 29 → 29 → 30 → 30 → 30 → 31 → 31 → 31 |

Resultado: 23 → 31 (base 23); 8 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R15: 23 → 24 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R25: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R38: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T3 R15: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R25: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R38: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T4 R15: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 25 anos)
- T4 R30: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 25 anos)

</details>

### CASO A (variante) — mesmo jogador, mas vira reserva na Série A

Esperado: cresce bem menos: o ambiente só ajuda quem joga.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 16, teto 21, 22 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 2 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 44, 23 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 3 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 44, 24 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |
| 4 | Série A, reserva (25 min a cada 3 rodadas) (ambiente 40, teto 43, 25 anos) | 23 → 23 → 23 → 23 → 23 → 23 → 23 → 23 |

Resultado: 23 → 23 (base 23); 0 mudança(s); maior salto 0.

### CASO B — força 34, Série D, contratado pela Série A (ambiente 40)

Esperado: chega mais rápido ao nível competitivo, ainda no máximo +1 por janela.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 17, teto 21, 24 anos) | 34 → 34 → 34 → 34 → 34 → 34 → 34 → 34 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 43, 25 anos) | 34 → 34 → 34 → 34 → 35 → 35 → 35 → 35 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 43, 26 anos) | 35 → 36 → 36 → 36 → 36 → 36 → 37 → 37 |

Resultado: 34 → 37 (base 34); 3 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R25: 34 → 35 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 25 anos)
- T3 R10: 35 → 36 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 26 anos)
- T3 R35: 36 → 37 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 26 anos)

</details>

### CASO C — força 45, continua na Série D

Esperado: não cai por estar na Série D; não cresce acima do ambiente; idade decide a partir dos 31.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série D, titular (ambiente 16, teto 18, 27 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |
| 2 | Série D, titular (ambiente 16, teto 17, 28 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |
| 3 | Série D, titular (ambiente 16, teto 17, 29 anos) | 45 → 45 → 45 → 45 → 45 → 45 → 45 → 45 |

Resultado: 45 → 45 (base 45); 0 mudança(s); maior salto 0.

### CASO D — força 20, Série A, fica no banco

Esperado: não evolui por pertencer a clube forte; parado, perde ritmo devagar.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, sem jogar (ambiente 40, teto 43, 25 anos) | 20 → 20 → 20 → 20 → 20 → 20 → 19 → 19 |
| 2 | Série A, sem jogar (ambiente 40, teto 43, 26 anos) | 19 → 19 → 19 → 18 → 18 → 18 → 18 → 18 |

Resultado: 20 → 18 (base 20); 2 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R35: 20 → 19 — queda: muito tempo sem jogar (ambiente 40, teto 43, 25 anos)
- T2 R20: 19 → 18 — queda: muito tempo sem jogar (ambiente 40, teto 43, 26 anos)

</details>

### CASO E — força 25, Série A, vira titular com bom rendimento

Esperado: evolução gradual e perceptível ao longo das temporadas.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, titular, bom rendimento (ambiente 40, teto 44, 23 anos) | 25 → 25 → 26 → 26 → 26 → 27 → 27 → 27 |
| 2 | Série A, titular, bom rendimento (ambiente 40, teto 44, 24 anos) | 28 → 28 → 28 → 29 → 29 → 29 → 30 → 30 |
| 3 | Série A, titular, bom rendimento (ambiente 40, teto 43, 25 anos) | 30 → 31 → 31 → 31 → 31 → 32 → 32 → 32 |

Resultado: 25 → 32 (base 25); 7 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R15: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T1 R30: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 23 anos)
- T2 R5: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R20: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T2 R35: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 44, 24 anos)
- T3 R10: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 25 anos)
- T3 R30: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 40, teto 43, 25 anos)

</details>

### PERFIL — estrela pronta (46, 27 anos, Série A ambiente 42)

Esperado: permanece forte.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série A, titular (ambiente 42, teto 44, 27 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |
| 2 | Série A, titular (ambiente 42, teto 43, 28 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |
| 3 | Série A, titular (ambiente 42, teto 43, 29 anos) | 46 → 46 → 46 → 46 → 46 → 46 → 46 → 46 |

Resultado: 46 → 46 (base 46); 0 mudança(s); maior salto 0.

### PERFIL — jovem promessa (22, 18 anos, ambiente 30)

Esperado: cresce.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, rendimento médio (ambiente 30, teto 35, 18 anos) | 22 → 22 → 23 → 23 → 23 → 24 → 24 → 24 |
| 2 | titular, rendimento médio (ambiente 30, teto 35, 19 anos) | 25 → 25 → 25 → 26 → 26 → 26 → 27 → 27 |
| 3 | titular, rendimento médio (ambiente 30, teto 35, 20 anos) | 27 → 27 → 28 → 28 → 28 → 29 → 29 → 29 |

Resultado: 22 → 29 (base 22); 7 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R15: 22 → 23 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 18 anos)
- T1 R30: 23 → 24 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 18 anos)
- T2 R5: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 19 anos)
- T2 R20: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 19 anos)
- T2 R35: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 19 anos)
- T3 R15: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 20 anos)
- T3 R30: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 30, teto 35, 20 anos)

</details>

### PERFIL — jogador mediano (30, 27 anos, ambiente 31)

Esperado: estável, no máximo +1.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, rendimento médio (ambiente 31, teto 33, 27 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | titular, rendimento médio (ambiente 31, teto 32, 28 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 3 | titular, rendimento médio (ambiente 31, teto 32, 29 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |

Resultado: 30 → 30 (base 30); 0 mudança(s); maior salto 0.

### PERFIL — veterano (40, 33 anos, ambiente 38)

Esperado: estabiliza ou começa a cair devagar.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular (ambiente 38, teto 36, 33 anos) | 40 → 40 → 40 → 40 → 40 → 40 → 40 → 40 |
| 2 | titular (ambiente 38, teto 36, 34 anos) | 40 → 40 → 39 → 39 → 39 → 39 → 39 → 39 |
| 3 | titular (ambiente 38, teto 36, 35 anos) | 39 → 39 → 38 → 38 → 38 → 38 → 38 → 38 |

Resultado: 40 → 38 (base 40); 2 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T2 R15: 40 → 39 — queda: rendimento (ambiente 38, teto 36, 34 anos)
- T3 R15: 39 → 38 — queda: rendimento (ambiente 38, teto 36, 35 anos)

</details>

### PERFIL — subindo de divisão com o clube (24, 23 anos; ambiente sobe 22 → 28 → 34)

Esperado: adaptação: ambiente maior abre espaço, mas o ganho depende de jogar e render.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | Série C (ambiente 22, teto 26, 23 anos) | 24 → 24 → 24 → 24 → 24 → 24 → 25 → 25 |
| 2 | Série B (clube subiu) (ambiente 28, teto 32, 24 anos) | 25 → 25 → 25 → 25 → 26 → 26 → 26 → 26 |
| 3 | Série A (clube subiu de novo) (ambiente 34, teto 37, 25 anos) | 26 → 27 → 27 → 27 → 27 → 27 → 27 → 28 |

Resultado: 24 → 28 (base 24); 4 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R35: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 22, teto 26, 23 anos)
- T2 R25: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 28, teto 32, 24 anos)
- T3 R10: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 34, teto 37, 25 anos)
- T3 R38: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 34, teto 37, 25 anos)

</details>

### PERFIL — goleiro jovem titular (24, 21 anos, ambiente 36)

Esperado: cresce mais devagar que o jogador de linha equivalente.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular (ambiente 36, teto 41, 21 anos) | 24 → 24 → 25 → 25 → 26 → 26 → 27 → 27 |
| 2 | titular (ambiente 36, teto 41, 22 anos) | 27 → 28 → 28 → 28 → 29 → 29 → 29 → 30 |
| 3 | titular (ambiente 36, teto 40, 23 anos) | 30 → 30 → 30 → 31 → 31 → 31 → 32 → 32 |

Resultado: 24 → 32 (base 24); 8 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R15: 24 → 25 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 21 anos)
- T1 R25: 25 → 26 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 21 anos)
- T1 R35: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 21 anos)
- T2 R10: 27 → 28 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 22 anos)
- T2 R25: 28 → 29 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 22 anos)
- T2 R38: 29 → 30 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 41, 22 anos)
- T3 R20: 30 → 31 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 23 anos)
- T3 R35: 31 → 32 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 36, teto 40, 23 anos)

</details>

### PERFIL — titular com rendimento ruim (30, 26 anos, ambiente 32)

Esperado: não cresce; pode cair.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | titular, time perde, sem gols (ambiente 32, teto 35, 26 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | titular, time perde, sem gols (ambiente 32, teto 34, 27 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |

Resultado: 30 → 30 (base 30); 0 mudança(s); maior salto 0.

### PERFIL — lesionado na metade da temporada (26, 22 anos, ambiente 35)

Esperado: lesão pausa a evolução, não pune.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | joga o 1º turno, lesionado no 2º (ambiente 35, teto 40, 22 anos) | 26 → 26 → 27 → 27 → 27 → 27 → 27 → 27 |

Resultado: 26 → 27 (base 26); 1 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R15: 26 → 27 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 35, teto 40, 22 anos)

</details>

## Tentativas de exploit

### EXPLOIT — "minutos de lixo": entra aos 85' toda rodada num time forte

Esperado: quase nada: o ganho é proporcional aos minutos.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | 5 minutos por jogo (ambiente 40, teto 45, 20 anos) | 22 → 22 → 22 → 22 → 22 → 22 → 22 → 22 |
| 2 | 5 minutos por jogo (ambiente 40, teto 45, 21 anos) | 22 → 22 → 22 → 22 → 22 → 22 → 22 → 22 |

Resultado: 22 → 22 (base 22); 0 mudança(s); maior salto 0.

### EXPLOIT — goleador acima do ambiente (30 num ambiente 18)

Esperado: não passa do teto do ambiente.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | artilheiro de time fraco (ambiente 18, teto 23, 22 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |
| 2 | artilheiro de time fraco (ambiente 18, teto 22, 23 anos) | 30 → 30 → 30 → 30 → 30 → 30 → 30 → 30 |

Resultado: 30 → 30 (base 30); 0 mudança(s); maior salto 0.

### EXPLOIT — guardar evolução: jovem titular brilhante (15, 18 anos, ambiente 45)

Esperado: no máximo +1 por janela (8 por temporada); acúmulo limitado.

| Temporada | Contexto | Força por janela |
|---|---|---|
| 1 | máximo de ganho possível (ambiente 45, teto 50, 18 anos) | 15 → 16 → 16 → 17 → 17 → 18 → 19 → 19 |
| 2 | máximo de ganho possível (ambiente 45, teto 50, 19 anos) | 19 → 20 → 21 → 21 → 22 → 22 → 23 → 23 |

Resultado: 15 → 23 (base 15); 8 mudança(s); maior salto 1.

<details><summary>Histórico</summary>

- T1 R10: 15 → 16 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R20: 16 → 17 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R30: 17 → 18 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T1 R35: 18 → 19 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 18 anos)
- T2 R10: 19 → 20 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R15: 20 → 21 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R25: 21 → 22 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)
- T2 R35: 22 → 23 — evolução: jogou, rendeu e havia espaço no ambiente (ambiente 45, teto 50, 19 anos)

</details>

## Resumo

| Caso | início | fim | temporadas | subidas | quedas | maior salto |
|---|---:|---:|---:|---:|---:|---:|
| A | 23 | 31 | 4 | 8 | 0 | 1 |
| A2 | 23 | 23 | 4 | 0 | 0 | 0 |
| B | 34 | 37 | 3 | 3 | 0 | 1 |
| C | 45 | 45 | 3 | 0 | 0 | 0 |
| D | 20 | 18 | 2 | 0 | 2 | 1 |
| E | 25 | 32 | 3 | 7 | 0 | 1 |
| P1 | 46 | 46 | 3 | 0 | 0 | 0 |
| P2 | 22 | 29 | 3 | 7 | 0 | 1 |
| P3 | 30 | 30 | 3 | 0 | 0 | 0 |
| P4 | 40 | 38 | 3 | 0 | 2 | 1 |
| P5 | 24 | 28 | 3 | 4 | 0 | 1 |
| P6 | 24 | 32 | 3 | 8 | 0 | 1 |
| P7 | 30 | 30 | 2 | 0 | 0 | 0 |
| P8 | 26 | 27 | 1 | 1 | 0 | 1 |
| X1 | 22 | 22 | 2 | 0 | 0 | 0 |
| X2 | 30 | 30 | 2 | 0 | 0 | 0 |
| X3 | 15 | 23 | 2 | 8 | 0 | 1 |

## Comparação com a evolução em uso (2 checkpoints/temporada, sorteio estável)

Passo esperado por temporada no sistema atual (média sobre o sorteio, mesmos fatores) × resultado do protótipo na 1ª temporada no novo ambiente.

| Caso | sistema atual: passo esperado/temporada | protótipo: 1ª temporada no ambiente |
|---|---:|---:|
| A (23 na Série A, 22 anos, titular) | +1,40 | +3 |
| B (34 na Série A, 24 anos, titular) | +0,80 | +1 |
| C (45 na Série D, 27 anos, titular) | +0,24 | +0 |
| D (20 na Série A, 25 anos, banco) | +0,24 | -1 |
| E (25 na Série A, 23 anos, titular) | +1,16 | +2 |

O sistema atual usa a média da DIVISÃO como referência e não olha minutos nem rendimento por partida; o protótipo usa o CLUBE como ambiente, exige minutos e só cresce abaixo do teto.
