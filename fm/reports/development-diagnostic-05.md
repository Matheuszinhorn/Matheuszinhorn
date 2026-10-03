# DEV-DIAGNOSTIC-0.5 — diagnóstico de desenvolvimento, elite, seleção e limites de força

> **Diagnóstico apenas.** DEV-PROTO-0.4-B NÃO foi alterada, nada foi calibrado, nada integrado, Engine 0.2.0 intocado, sem deploy. A Seleção NÃO existe no jogo nem na fórmula; onde aparece "SONDA", é uma simulação hipotética para medir um efeito, não uma proposta.

## 1. Auditoria

**Onde a força pode mudar (todas as escritas de `strength`/`strengthCurrent` no código):**

- `engine/world/generate.ts` — geração do mundo fictício: `clampStrength` (1–50, inteiro).
- `game/manager/world.ts` `youthPlayer` — juniores: faixa por divisão (dentro de 1–50).
- `game/manager/progression.ts` `evolveWorld` — evolução ANTIGA do jogo (±1, `Math.max(1, Math.min(50, …))`); desligada nos experimentos.
- `data/validate.ts` / `data/to-world.ts` — importação do universo real: força fora de 1–50 é rejeitada na validação.
- `game/development/development.ts` `developRound` — desenvolvimento experimental: `clamp(strengthCurrent + step, 1, 50)`, ±1 por janela.
- `game/development/feedback.ts` `withDevelopedStrength` — só copia strengthCurrent para Player.strength.
- Transferência (`movePlayer`), envelhecimento (`agePlayers`), renovações, acesso/rebaixamento (`startNextSeason`) e persistência (`serializeCareer`/`deserializeCareer`) **não escrevem** força.
- Nenhum caminho produz força fora de 1–50 (testes de invariante novos em `game/tests/strength-invariants.test.ts`). Observação: `deserializeCareer` não valida faixas de um save adulterado — ele não PRODUZ valor inválido, só não rejeita; registrado, não alterado.

**O que a fórmula DEV-PROTO-0.4-B lê:** idade, posição, minutos, gols, defesas, placar do time, cartão vermelho, lesão, ambiente do elenco (16 melhores) e nível da divisão. **Não lê títulos, tabela, prêmios nem seleção.** Títulos só entram de forma indireta (time que vence muito dá +0,2 de rendimento por vitória).

**Limite contextual do GANHO** (`developmentCeiling`): `round(contexto + margem(idade))`, com contexto = 0,5 × ambiente do clube + 0,5 × nível da divisão e margem 5 (≤ 20 anos), 4 (24), 2 (27), 0 (30), −2 (33+). No limite, o +1 é proibido; acima dele só se mantém com rendimento bom.

**Ambientes medidos no mundo fictício (início):**

| Divisão | nível (média dos ambientes) | melhor clube | contexto do melhor clube | limite aos 21 | 24 | 27 | 30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| D1 | 35,64 | 45,69 | 40,66 | 45 | 45 | 43 | 41 |
| D2 | 33,25 | 39,25 | 36,25 | 41 | 40 | 38 | 36 |
| D3 | 23,65 | 31,13 | 27,39 | 32 | 31 | 29 | 27 |
| D4 | 16,40 | 23,94 | 20,17 | 25 | 24 | 22 | 20 |

Seleção (só para a sonda): média dos 16 melhores brasileiros = 46,63.

**Contexto necessário para o limite chegar a 50:** 20 anos ≥ 44,50 · 21 anos ≥ 44,75 · 24 anos ≥ 45,50 · 27 anos ≥ 47,50 · 30 anos ≥ 49,50. Com o peso 0,5 da divisão e a D1 em 35,64, o clube precisaria de ambiente ≥ 53,86 aos 21 — acima de 50, impossível. Mesmo um elenco inteiro de força 50 dá contexto 42,82 e limite 48 aos 20 anos.

**Bloqueio estrutural identificado:** no mundo fictício, com a DEV-PROTO-0.4-B, o maior limite de ganho possível é 46 (melhor clube da D1, 20 anos) e 45 dos 21 aos 24 anos. Ninguém GANHA força acima disso. Os jogadores que já nascem 46–50 só se mantêm (rendimento bom compensa a idade) ou caem.

## 2. Caminho até 50

### Parte 1 — matriz de cenários (ATA, 24 anos, 10 temporadas ou até a aposentadoria; ambientes medidos)

Célula: pico · final (temporada em que chegou a 50, se chegou). Cenários: **A** D1 + titular + excepcional + sem títulos; **B** D1 + titular + excepcional + 1 título (T1); **C** D1 + titular + excepcional + títulos recorrentes; **D** C + destaque individual; **E** D + seleção excelente — fórmula atual (não há canal para a seleção); **E*** D + seleção excelente — SONDA: 8 jogos/ano como evidência extra, ambiente da seleção; **F** D1 + titular + desempenho médio; **G** D1 + reserva + poucos minutos; **H** D2 (melhor clube) + titular + excepcional (campeão); **I** D4 (melhor clube) + titular + excepcional (campeão).

| Cenário | início 40 | início 43 | início 45 | início 47 | início 48 | início 49 |
|---|---:|---:|---:|---:|---:|---:|
| A | 43 · 43 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| B | 43 · 43 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| C | 43 · 43 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| D | 43 · 43 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| E | 43 · 43 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| E* | 44 · 44 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| F | 42 · 42 | 44 · 44 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| G | 40 · 39 | 43 · 41 | 45 · 43 | 47 · 45 | 48 · 46 | 49 · 47 |
| H | 40 · 40 | 43 · 43 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |
| I | 40 · 40 | 43 · 43 | 45 · 45 | 47 · 47 | 48 · 48 | 49 · 49 |

Limite de ganho por idade nos cenários D1 (melhor clube): 24→45 · 25→44 · 26→43 · 27→43 · 28→42 · 29→41 · 30→41 · 31→40 · 32→39 · 33→39.

Detalhe do início 40 (onde há espaço para crescer):

| Cenário | caminho | maior ganho anual | janelas no limite | rendimento descartado no limite (pts) |
|---|---:|---:|---:|---:|
| A | 40→41→42→43→43→43→43→43→43→43→43 | +1 | 62 / 80 | 8,2 |
| B | 40→42→43→43→43→43→43→43→43→43→43 | +2 | 64 / 80 | 8,9 |
| C | 40→42→43→43→43→43→43→43→43→43→43 | +2 | 64 / 80 | 14,8 |
| D | 40→42→43→43→43→43→43→43→43→43→43 | +2 | 64 / 80 | 20,7 |
| E | 40→42→43→43→43→43→43→43→43→43→43 | +2 | 64 / 80 | 20,7 |
| E* | 40→43→44→44→44→44→44→44→44→44→44 | +3 | 67 / 80 | 22,2 |
| F | 40→41→42→42→42→42→42→42→42→42→42 | +1 | 48 / 80 | 1,0 |
| G | 40→40→40→40→40→40→40→40→40→39→39 | 0 | 24 / 80 | 0,0 |
| H | 40→40→40→40→40→40→40→40→40→40→40 | 0 | 80 / 80 | 18,7 |
| I | 40→40→40→40→40→40→40→40→40→40→40 | 0 | 80 / 80 | 18,7 |

### Parte 2 — 45/47/48/49 → 50

Melhor cenário de clube (**D**: D1, melhor clube, titular, destaque, campeão todo ano) e **E*** (D + sonda da seleção). Até 15 temporadas ou aposentadoria.

| Início | idade | cenário | chegou a 50? | caminho | maior ganho anual | limite de ganho (1ª temp.) | minutos/ano | jogos/ano (+ seleção) | rendimento médio | títulos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 45 | 21 | D | não | 45→45→45→45→45→45→45→45→45→45→45→45→45→45→45→45 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 15 |
| 45 | 21 | E* | não | 45→45→45→45→45→45→45→45→45→45→45→45→45→45→45→45 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 15 |
| 45 | 24 | D | não | 45→45→45→45→45→45→45→45→45→45→45→45→45→45 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 13 |
| 45 | 24 | E* | não | 45→45→45→45→45→45→45→45→45→45→45→45→45→45 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 13 |
| 45 | 27 | D | não | 45→45→45→45→45→45→45→45→45→45→45 | 0 | 43 (contexto 40,66) | 3420 | 38 | 0,72 | 10 |
| 45 | 27 | E* | não | 45→45→45→45→45→45→45→45→45→45→45 | 0 | 43 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 10 |
| 47 | 21 | D | não | 47→47→47→47→47→47→47→47→47→47→47→47→47→47→47→47 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 15 |
| 47 | 21 | E* | não | 47→47→47→47→47→47→47→47→47→47→47→47→47→47→47→47 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 15 |
| 47 | 24 | D | não | 47→47→47→47→47→47→47→47→47→47→47→47→47→47 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 13 |
| 47 | 24 | E* | não | 47→47→47→47→47→47→47→47→47→47→47→47→47→47 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 13 |
| 47 | 27 | D | não | 47→47→47→47→47→47→47→47→47→47→47 | 0 | 43 (contexto 40,66) | 3420 | 38 | 0,72 | 10 |
| 47 | 27 | E* | não | 47→47→47→47→47→47→47→47→47→47→47 | 0 | 43 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 10 |
| 48 | 21 | D | não | 48→48→48→48→48→48→48→48→48→48→48→48→48→48→48→48 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 15 |
| 48 | 21 | E* | não | 48→48→48→48→48→48→48→48→48→48→48→48→48→48→48→48 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 15 |
| 48 | 24 | D | não | 48→48→48→48→48→48→48→48→48→48→48→48→48→48 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 13 |
| 48 | 24 | E* | não | 48→48→48→48→48→48→48→48→48→48→48→48→48→48 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 13 |
| 48 | 27 | D | não | 48→48→48→48→48→48→48→48→48→48→48 | 0 | 43 (contexto 40,66) | 3420 | 38 | 0,72 | 10 |
| 48 | 27 | E* | não | 48→48→48→48→48→48→48→48→48→48→48 | 0 | 43 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 10 |
| 49 | 21 | D | não | 49→49→49→49→49→49→49→49→49→49→49→49→49→49→49→49 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 15 |
| 49 | 21 | E* | não | 49→49→49→49→49→49→49→49→49→49→49→49→49→49→49→49 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 15 |
| 49 | 24 | D | não | 49→49→49→49→49→49→49→49→49→49→49→49→49→49 | 0 | 45 (contexto 40,66) | 3420 | 38 | 0,72 | 13 |
| 49 | 24 | E* | não | 49→49→49→49→49→49→49→49→49→49→49→49→49→49 | 0 | 45 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 13 |
| 49 | 27 | D | não | 49→49→49→49→49→49→49→49→49→49→49 | 0 | 43 (contexto 40,66) | 3420 | 38 | 0,72 | 10 |
| 49 | 27 | E* | não | 49→49→49→49→49→49→49→49→49→49→49 | 0 | 43 (contexto 40,66) | 3420 | 38 + 8 | 0,72 | 10 |

## 3. Caminho até 1

### Parte 4 — MEI em clube médio da D4 (contexto 16,40), até a aposentadoria

Célula: temporada em que chegou a 1 (idade) ou força final; entre parênteses a maior queda anual.

**Começando com 19 anos**

| strengthBase | A zero minutos | B poucos minutos (2×20 min a cada 5 rodadas) | C titular + desempenho ruim | D titular + desempenho médio | E titular + desempenho bom |
|---|---:|---:|---:|---:|---:|
| 5 | **1 na T10 (28 anos)** (-1) | **1 na T18 (36 anos)** (-2) | fim 3 (36 anos) (-3) | fim 18 (36 anos) (-1) | fim 19 (36 anos) (0) |
| 8 | **1 na T14 (32 anos)** (-1) | fim 4 (36 anos) (-2) | fim 5 (36 anos) (-3) | fim 19 (36 anos) (-1) | fim 20 (36 anos) (0) |
| 10 | **1 na T16 (34 anos)** (-1) | fim 6 (36 anos) (-2) | fim 5 (36 anos) (-3) | fim 19 (36 anos) (-1) | fim 20 (36 anos) (0) |
| 12 | fim 2 (36 anos) (-1) | fim 8 (36 anos) (-2) | fim 6 (36 anos) (-2) | fim 19 (36 anos) (-1) | fim 20 (36 anos) (0) |
| 15 | fim 5 (36 anos) (-1) | fim 10 (36 anos) (-2) | fim 6 (36 anos) (-2) | fim 20 (36 anos) (-1) | fim 21 (36 anos) (0) |
| 20 | fim 10 (36 anos) (-1) | fim 15 (36 anos) (-2) | fim 6 (36 anos) (-2) | fim 20 (36 anos) (-1) | fim 21 (36 anos) (0) |

**Começando com 25 anos**

| strengthBase | A zero minutos | B poucos minutos (2×20 min a cada 5 rodadas) | C titular + desempenho ruim | D titular + desempenho médio | E titular + desempenho bom |
|---|---:|---:|---:|---:|---:|
| 5 | **1 na T6 (30 anos)** (-1) | **1 na T11 (35 anos)** (-2) | **1 na T9 (33 anos)** (-2) | fim 10 (36 anos) (-1) | fim 11 (36 anos) (-1) |
| 8 | **1 na T10 (34 anos)** (-1) | fim 3 (36 anos) (-2) | **1 na T11 (35 anos)** (-2) | fim 11 (36 anos) (-1) | fim 15 (36 anos) (0) |
| 10 | **1 na T12 (36 anos)** (-1) | fim 5 (36 anos) (-2) | **1 na T12 (36 anos)** (-2) | fim 14 (36 anos) (-1) | fim 16 (36 anos) (0) |
| 12 | fim 3 (36 anos) (-1) | fim 7 (36 anos) (-1) | **1 na T12 (36 anos)** (-3) | fim 15 (36 anos) (-1) | fim 17 (36 anos) (0) |
| 15 | fim 6 (36 anos) (-1) | fim 9 (36 anos) (-2) | fim 4 (36 anos) (-3) | fim 16 (36 anos) (-1) | fim 18 (36 anos) (0) |
| 20 | fim 11 (36 anos) (-1) | fim 14 (36 anos) (-2) | fim 6 (36 anos) (-2) | fim 19 (36 anos) (-1) | fim 20 (36 anos) (0) |

**Começando com 31 anos**

| strengthBase | A zero minutos | B poucos minutos (2×20 min a cada 5 rodadas) | C titular + desempenho ruim | D titular + desempenho médio | E titular + desempenho bom |
|---|---:|---:|---:|---:|---:|
| 5 | **1 na T6 (36 anos)** (-1) | **1 na T5 (35 anos)** (-1) | **1 na T3 (33 anos)** (-2) | fim 4 (36 anos) (-1) | fim 6 (36 anos) (0) |
| 8 | fim 4 (36 anos) (-1) | fim 2 (36 anos) (-2) | **1 na T5 (35 anos)** (-2) | fim 7 (36 anos) (-1) | fim 9 (36 anos) (0) |
| 10 | fim 6 (36 anos) (-1) | fim 4 (36 anos) (-2) | **1 na T6 (36 anos)** (-2) | fim 8 (36 anos) (-1) | fim 10 (36 anos) (0) |
| 12 | fim 8 (36 anos) (-1) | fim 6 (36 anos) (-2) | fim 2 (36 anos) (-2) | fim 10 (36 anos) (-1) | fim 11 (36 anos) (-1) |
| 15 | fim 11 (36 anos) (-1) | fim 9 (36 anos) (-2) | fim 5 (36 anos) (-2) | fim 14 (36 anos) (-1) | fim 15 (36 anos) (0) |
| 20 | fim 16 (36 anos) (-1) | fim 14 (36 anos) (-2) | fim 10 (36 anos) (-2) | fim 19 (36 anos) (-1) | fim 20 (36 anos) (0) |

ATA titular ruim (o atacante sem gol perde −0,1 extra por jogo de 60+ min), início 10: 19 anos → 1 na T18 (maior queda -3) · 25 anos → 1 na T10 (maior queda -2) · 31 anos → 1 na T5 (maior queda -2).

Decomposição de uma temporada sem minutos: 19 anos: envelhecimento 0,00, inatividade 0,00, limite devolve 0,00 · 25 anos: envelhecimento 0,00, inatividade -1,28, limite devolve 0,53 · 31 anos: envelhecimento -0,51, inatividade -1,28, limite devolve 1,04 · 35 anos: envelhecimento -1,52, inatividade -1,28, limite devolve 2,05.

## 4. Impacto da seleção

**Na fórmula atual a seleção não tem efeito nenhum** (E = D em todas as células): não há entrada para ela. A SONDA abaixo alimenta 8 jogos internacionais excelentes por ano como evidência extra, com o ambiente da seleção — sem convocação gerar força direta.

### Parte 3 — A (D1 + titular + excelente + títulos) × B (A + seleção excelente, sonda)

| Início | idade | A: caminho | B: caminho | B − A no fim | B − A no pico |
|---|---:|---:|---:|---:|---:|
| 40 | 21 | 40→42→44→44→45→45→45→45→45→45→45 | 40→43→44→45→45→45→45→45→45→45→45 | 0 | 0 |
| 40 | 24 | 40→42→43→43→43→43→43→43→43→43→43 | 40→42→43→43→43→43→43→43→43→43→43 | 0 | 0 |
| 40 | 27 | 40→41→41→41→41→41→41→41→41→41→41 | 40→41→42→42→42→42→42→42→42→42→42 | +1 | +1 |
| 43 | 21 | 43→44→45→45→45→45→45→45→45→45→45 | 43→44→45→45→45→45→45→45→45→45→45 | 0 | 0 |
| 43 | 24 | 43→44→44→44→44→44→44→44→44→44→44 | 43→44→44→44→44→44→44→44→44→44→44 | 0 | 0 |
| 43 | 27 | 43→43→43→43→43→43→43→43→43→43→43 | 43→43→43→43→43→43→43→43→43→43→43 | 0 | 0 |
| 45 | 21 | 45→45→45→45→45→45→45→45→45→45→45 | 45→45→45→45→45→45→45→45→45→45→45 | 0 | 0 |
| 45 | 24 | 45→45→45→45→45→45→45→45→45→45→45 | 45→45→45→45→45→45→45→45→45→45→45 | 0 | 0 |
| 45 | 27 | 45→45→45→45→45→45→45→45→45→45→45 | 45→45→45→45→45→45→45→45→45→45→45 | 0 | 0 |
| 47 | 21 | 47→47→47→47→47→47→47→47→47→47→47 | 47→47→47→47→47→47→47→47→47→47→47 | 0 | 0 |
| 47 | 24 | 47→47→47→47→47→47→47→47→47→47→47 | 47→47→47→47→47→47→47→47→47→47→47 | 0 | 0 |
| 47 | 27 | 47→47→47→47→47→47→47→47→47→47→47 | 47→47→47→47→47→47→47→47→47→47→47 | 0 | 0 |

## Parte 9 — caso especial: 21 anos, 45, D1, melhor clube, titular, destaque, títulos, seleção excelente (sonda)

| T | idade | início | fim | limite de ganho | janelas no limite | rendimento descartado no limite | envelhecimento |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 45 | 45 | 45 | 8/8 | 2,82 | 0,00 |
| 2 | 22 | 45 | 45 | 45 | 8/8 | 3,29 | 0,00 |
| 3 | 23 | 45 | 45 | 45 | 8/8 | 3,25 | 0,00 |
| 4 | 24 | 45 | 45 | 45 | 8/8 | 3,22 | 0,00 |
| 5 | 25 | 45 | 45 | 44 | 8/8 | 3,17 | 0,00 |
| 6 | 26 | 45 | 45 | 43 | 8/8 | 3,11 | 0,00 |
| 7 | 27 | 45 | 45 | 43 | 8/8 | 3,06 | 0,00 |
| 8 | 28 | 45 | 45 | 42 | 8/8 | 3,01 | 0,00 |
| 9 | 29 | 45 | 45 | 41 | 8/8 | 2,87 | 0,00 |
| 10 | 30 | 45 | 45 | 41 | 8/8 | 2,71 | -0,16 |
| 11 | 31 | 45 | 45 | 40 | 8/8 | 2,47 | -0,32 |
| 12 | 32 | 45 | 45 | 39 | 8/8 | 2,58 | -0,49 |
| 13 | 33 | 45 | 45 | 39 | 8/8 | 2,42 | -0,65 |
| 14 | 34 | 45 | 45 | 39 | 8/8 | 2,26 | -0,81 |
| 15 | 35 | 45 | 45 | 39 | 8/8 | 2,10 | -0,97 |

Resultado: 45→45→45→45→45→45→45→45→45→45→45→45→45→45→45→45 — NÃO chega a 50; pico 45.

**Por quê:** o limite de ganho é 45 aos 21 (contexto 40,66 = 0,5 × 45,69 do clube + 0,5 × 35,64 da D1, + margem 4,75) e cai com a idade (45, 45, 45, 45, 44, 43, 43, 42, 41, 41, 40, 39, 39, 39, 39). Começando em 45, o jogador já está NO limite: todo rendimento acima da reserva parcial (0,5) é descartado (2,82 pontos por temporada). A seleção, na sonda, entra com o ambiente 46,63 — limite 50 aos 21 —, mas só nos jogos dela; nos 38 jogos do clube o limite volta a 45, e o +1 é decidido no fim da janela com o limite do jogo que fecha a janela (do clube).

Sondas de bloqueio (não são propostas): sem o peso da divisão (contexto = só o clube): 45→48→49→50→50→50→50→50→50→50→50→50→50→50→50→50 — chega a 50 na T3. Clube com elenco inteiro de força 50 (contexto 42,82): 45→47→47→47→47→47→47→47→47→47→47→47→47→47→47→47.

## Parte 10 — caso contrário: 21 anos, 45, D4, titular, desempenho bom

Melhor clube da D4 (contexto 20,17): 45→45→45→45→45→45→45→45→45→45→45→45→45→45→45→45. Clube médio da D4: 45→45→45→45→45→45→45→45→45→45→45→45→45→45→45→45. Muito acima do limite (25): não ganha nada; mantém a força enquanto joga bem (o rendimento com sinal compensa a idade) e cai devagar com a idade a partir dos ~30 anos. **O clube não dá força de presente** — nem para cima (D1) nem para baixo (D4).

## 5. Casos reais (mundo B da DEV-INTEGRATION-0.2)

Mundo B refeito com a mesma seed e a mesma composição. Hash de evolução **idêntico** ao do relatório da 0.2 (`34b13ae63516fc30…`). Seleção: não existe no jogo (coluna omitida). Títulos = campeão da própria divisão.

**Perfil de quem chegou a 1:** strengthBase 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9; idade ao chegar a 1: média 32,2 (mín. 25, máx. 36); divisões: D3, D4; minutos por temporada: média 429,5, temporadas com 0 minutos 146 de 278. Motivos das quedas (todas as quedas desses jogadores): queda: muito tempo sem jogar 102; queda: idade 29; queda: rendimento 18.

### Todos que chegaram a 1 (31)

| Nome | pos. | idade ini→fim | base | atual ini→fim | clubes | jogos | minutos | títulos | transf. | rodadas lesionado | evolução (temporada: divisão, minutos, força no fim; 🏆 campeão da divisão) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Samuel Almeida Freitas | GOL | 31→36 | 3 | 3→1 (pico 3) | 1 | 1 | 90 | 0 | 0 | 0 | T1 D4 0′ 3 · T2 D4 0′ 2 · T3 D4 0′ 1 · T4 D4 0′ 1 · T5 D4 90′ 1 · T6 D4 0′ 1 |
| João Rezende Valadares | DEF | 26→35 | 6 | 6→1 (pico 6) | 1 | 16 | 1310 | 0 | 0 | 0 | T1 D4 0′ 6 · T2 D4 0′ 5 · T3 D4 0′ 4 · T4 D4 0′ 3 · T5 D4 0′ 3 · T6 D4 0′ 2 · T7 D4 0′ 1 · T8 D4 360′ 1 · T9 D4 450′ 1 · T10 D4 500′ 1 |
| Adriano Nogueira Nogueira | MEI | 30→36 | 3 | 3→1 (pico 3) | 1 | 5 | 450 | 0 | 0 | 0 | T1 D4 0′ 3 · T2 D4 0′ 2 · T3 D4 0′ 1 · T4 D4 0′ 1 · T5 D4 0′ 1 · T6 D4 360′ 1 · T7 D4 90′ 1 |
| Igor Teixeira Bragança | MEI | 27→36 | 5 | 5→1 (pico 5) | 1 | 111 | 9177 | 0 | 0 | 0 | T1 D4 833′ 5 · T2 D4 1096′ 5 · T3 D4 361′ 5 · T4 D4 1012′ 4 · T5 D4 1362′ 4 · T6 D4 1036′ 3 · T7 D4 810′ 2 · T8 D4 776′ 1 · T9 D4 991′ 1 · T10 D4 900′ 1 |
| Fábio Rezende | MEI | 28→36 | 5 | 5→1 (pico 5) | 1 | 15 | 1182 | 0 | 0 | 0 | T1 D4 90′ 5 · T2 D4 180′ 4 · T3 D4 238′ 3 · T4 D4 158′ 2 · T5 D4 251′ 2 · T6 D4 90′ 1 · T7 D4 0′ 1 · T8 D4 175′ 1 · T9 D4 0′ 1 |
| Caio Farias Almeida | ATA | 25→34 | 4 | 4→1 (pico 4) | 1 | 5 | 323 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 0′ 3 · T3 D4 0′ 2 · T4 D4 232′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 · T7 D4 0′ 1 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 91′ 1 |
| Renan Almeida Zanetti | ATA | 21→30 | 4 | 4→1 (pico 4) | 1 | 6 | 462 | 0 | 0 | 1 | T1 D4 0′ 4 · T2 D4 90′ 4 · T3 D4 0′ 4 · T4 D4 282′ 3 · T5 D4 90′ 2 · T6 D4 0′ 2 · T7 D4 0′ 1 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |
| Fábio Honório | GOL | 24→33 | 8 | 8→1 (pico 8) | 1 | 2 | 121 | 0 | 0 | 0 | T1 D4 0′ 8 · T2 D4 0′ 7 · T3 D4 0′ 6 · T4 D4 0′ 5 · T5 D4 121′ 5 · T6 D4 0′ 4 · T7 D4 0′ 3 · T8 D4 0′ 3 · T9 D4 0′ 2 · T10 D4 0′ 1 |
| Samuel Macedo Pacheco | DEF | 27→36 | 5 | 5→1 (pico 5) | 1 | 254 | 22206 | 0 | 0 | 4 | T1 D4 672′ 5 · T2 D4 90′ 4 · T3 D4 1882′ 4 · T4 D4 1402′ 3 · T5 D4 2493′ 3 · T6 D4 3192′ 2 · T7 D4 3040′ 1 · T8 D4 3227′ 1 · T9 D4 2968′ 1 · T10 D4 3240′ 1 |
| Wesley Gomes Teixeira | DEF | 27→36 | 3 | 3→1 (pico 3) | 1 | 85 | 7098 | 0 | 0 | 3 | T1 D4 0′ 3 · T2 D4 90′ 2 · T3 D4 450′ 2 · T4 D4 514′ 1 · T5 D4 257′ 1 · T6 D4 990′ 1 · T7 D4 1493′ 1 · T8 D4 1385′ 1 · T9 D4 990′ 1 · T10 D4 929′ 1 |
| Felipe Honório Zanetti | DEF | 31→36 | 9 | 9→1 (pico 9) | 1 | 145 | 12563 | 0 | 0 | 7 | T1 D4 1775′ 9 · T2 D4 1642′ 7 · T3 D4 2810′ 6 · T4 D4 3420′ 4 · T5 D4 2340′ 3 · T6 D4 576′ 1 |
| Leandro Toledo | DEF | 30→36 | 8 | 8→1 (pico 8) | 1 | 70 | 6068 | 0 | 0 | 0 | T1 D4 360′ 8 · T2 D4 540′ 7 · T3 D4 1710′ 6 · T4 D4 1398′ 5 · T5 D4 1051′ 4 · T6 D4 448′ 3 · T7 D4 561′ 1 |
| João Teixeira Esteves | DEF | 25→34 | 7 | 7→1 (pico 7) | 1 | 92 | 8139 | 0 | 0 | 4 | T1 D4 0′ 7 · T2 D4 180′ 6 · T3 D4 517′ 6 · T4 D4 450′ 5 · T5 D4 450′ 4 · T6 D4 1440′ 4 · T7 D4 1521′ 3 · T8 D4 1382′ 2 · T9 D4 1260′ 1 · T10 D4 939′ 1 |
| Cauã Nogueira Zanetti | MEI | 27→36 | 9 | 9→1 (pico 9) | 1 | 21 | 1702 | 0 | 0 | 0 | T1 D4 90′ 9 · T2 D4 0′ 8 · T3 D4 0′ 7 · T4 D4 0′ 7 · T5 D4 0′ 6 · T6 D4 0′ 5 · T7 D4 9′ 4 · T8 D4 433′ 3 · T9 D4 180′ 2 · T10 D4 990′ 1 |
| João Lacerda Oliveira | MEI | 23→32 | 7 | 7→1 (pico 7) | 1 | 1 | 1 | 0 | 0 | 0 | T1 D4 0′ 7 · T2 D4 0′ 6 · T3 D4 0′ 5 · T4 D4 0′ 4 · T5 D4 0′ 4 · T6 D4 0′ 3 · T7 D4 1′ 2 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |
| Igor Toledo Freitas | MEI | 26→35 | 7 | 7→1 (pico 7) | 1 | 0 | 0 | 0 | 0 | 0 | T1 D4 0′ 7 · T2 D4 0′ 6 · T3 D4 0′ 5 · T4 D4 0′ 4 · T5 D4 0′ 4 · T6 D4 0′ 3 · T7 D4 0′ 2 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |
| Gabriel Almeida Rocha | DEF | 32→36 | 4 | 4→1 (pico 4) | 1 | 0 | 0 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 0′ 3 · T3 D4 0′ 2 · T4 D4 0′ 1 · T5 D4 0′ 1 |
| Davi Lacerda Queiroz | MEI | 31→36 | 4 | 4→1 (pico 4) | 1 | 0 | 0 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 0′ 3 · T3 D4 0′ 2 · T4 D4 0′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 |
| Thiago Guedes Farias | MEI | 28→36 | 7 | 7→1 (pico 7) | 1 | 140 | 12109 | 0 | 0 | 1 | T1 D4 764′ 7 · T2 D4 1247′ 7 · T3 D4 1403′ 7 · T4 D4 1678′ 6 · T5 D4 990′ 6 · T6 D4 1856′ 4 · T7 D4 1054′ 3 · T8 D4 1947′ 1 · T9 D4 1170′ 1 |
| Rafael Bragança Bragança | MEI | 29→36 | 7 | 7→1 (pico 7) | 1 | 25 | 1836 | 0 | 0 | 0 | T1 D4 81′ 7 · T2 D4 0′ 6 · T3 D4 180′ 5 · T4 D4 98′ 4 · T5 D4 90′ 4 · T6 D4 417′ 3 · T7 D4 675′ 2 · T8 D4 295′ 1 |
| Henrique Toledo | MEI | 28→36 | 8 | 8→1 (pico 8) | 1 | 284 | 25002 | 0 | 0 | 5 | T1 D4 2945′ 8 · T2 D4 3065′ 8 · T3 D4 2938′ 8 · T4 D4 2889′ 7 · T5 D4 3233′ 7 · T6 D4 2867′ 5 · T7 D4 3105′ 4 · T8 D4 2970′ 2 · T9 D4 990′ 1 |
| Samuel Guedes Duarte | ATA | 31→36 | 4 | 4→1 (pico 4) | 1 | 1 | 90 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 0′ 3 · T3 D4 0′ 2 · T4 D4 90′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 |
| João Nogueira Farias | GOL | 25→34 | 3 | 3→1 (pico 3) | 1 | 2 | 91 | 0 | 0 | 0 | T1 D4 0′ 3 · T2 D4 0′ 2 · T3 D4 0′ 1 · T4 D4 0′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 · T7 D4 0′ 1 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 91′ 1 |
| Adriano Uchoa Teixeira | MEI | 20→29 | 4 | 4→1 (pico 4) | 1 | 5 | 407 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 55′ 4 · T3 D4 0′ 4 · T4 D4 0′ 4 · T5 D4 0′ 3 · T6 D4 0′ 2 · T7 D4 90′ 2 · T8 D4 0′ 1 · T9 D4 180′ 1 · T10 D4 82′ 1 |
| Everton Rocha Xavier | MEI | 26→35 | 8 | 8→1 (pico 8) | 1 | 46 | 3971 | 0 | 0 | 0 | T1 D4 0′ 8 · T2 D4 90′ 7 · T3 D4 0′ 6 · T4 D4 720′ 6 · T5 D4 540′ 5 · T6 D4 379′ 4 · T7 D4 807′ 3 · T8 D4 851′ 2 · T9 D4 584′ 1 · T10 D4 0′ 1 |
| Kaio Barbosa Nogueira | ATA | 23→32 | 3 | 3→1 (pico 3) | 1 | 1 | 90 | 0 | 0 | 0 | T1 D4 0′ 3 · T2 D4 0′ 2 · T3 D4 0′ 1 · T4 D4 0′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 · T7 D4 0′ 1 · T8 D4 90′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |
| Heitor Guedes Duarte | ATA | 27→36 | 4 | 4→1 (pico 4) | 1 | 0 | 0 | 0 | 0 | 0 | T1 D4 0′ 4 · T2 D4 0′ 3 · T3 D4 0′ 2 · T4 D4 0′ 1 · T5 D4 0′ 1 · T6 D4 0′ 1 · T7 D4 0′ 1 · T8 D4 0′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |
| Wallace Rezende Farias | MEI | 23→32 | 8 | 8→1 (pico 8) | 1 | 0 | 0 | 1 | 0 | 0 | T1 D4 0′ 8 · T2 D4 0′ 7 · T3 D4 0′ 6 · T4 D4 0′ 5🏆 · T5 D3 0′ 5 · T6 D3 0′ 4 · T7 D4 0′ 3 · T8 D4 0′ 2 · T9 D4 0′ 2 · T10 D4 0′ 1 |
| Felipe Valadares Bragança | DEF | 23→32 | 7 | 7→1 (pico 7) | 1 | 22 | 1634 | 0 | 0 | 5 | T1 D4 0′ 7 · T2 D4 0′ 6 · T3 D4 0′ 5 · T4 D4 0′ 4 · T5 D4 231′ 4 · T6 D4 93′ 3 · T7 D4 50′ 2 · T8 D4 317′ 1 · T9 D4 360′ 1 · T10 D4 583′ 1 |
| Gustavo Farias Almeida | MEI | 25→34 | 9 | 9→1 (pico 9) | 1 | 39 | 3186 | 0 | 0 | 0 | T1 D4 90′ 9 · T2 D4 180′ 8 · T3 D4 90′ 7 · T4 D4 384′ 7 · T5 D4 99′ 6 · T6 D4 169′ 5 · T7 D4 271′ 4 · T8 D4 450′ 4 · T9 D4 540′ 3 · T10 D4 913′ 1 |
| André Almeida Nogueira | MEI | 23→32 | 7 | 7→1 (pico 7) | 1 | 1 | 84 | 0 | 0 | 0 | T1 D4 0′ 7 · T2 D4 0′ 6 · T3 D4 0′ 5 · T4 D4 0′ 4 · T5 D4 0′ 4 · T6 D4 0′ 3 · T7 D4 0′ 2 · T8 D4 84′ 1 · T9 D4 0′ 1 · T10 D4 0′ 1 |

### Top 20 maiores quedas (atual − base) (20)

| Nome | pos. | idade ini→fim | base | atual ini→fim | clubes | jogos | minutos | títulos | transf. | rodadas lesionado | evolução (temporada: divisão, minutos, força no fim; 🏆 campeão da divisão) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| André Prates | ATA | 27→36 | 27 | 27→17 (pico 27) | 1 | 124 | 11098 | 0 | 0 | 2 | T1 D1 0′ 27 · T2 D1 180′ 26 · T3 D1 0′ 25 · T4 D1 90′ 25 · T5 D1 90′ 24 · T6 D1 360′ 23 · T7 D1 538′ 22 · T8 D1 3202′ 21 · T9 D2 3308′ 19 · T10 D1 3330′ 17 |
| Henrique Macedo Honório | ATA | 27→36 | 17 | 17→7 (pico 17) | 1 | 190 | 16954 | 0 | 0 | 5 | T1 D3 90′ 17 · T2 D3 0′ 16 · T3 D3 90′ 15 · T4 D3 360′ 15 · T5 D3 810′ 14 · T6 D4 3105′ 13 · T7 D4 3240′ 12 · T8 D4 2993′ 11 · T9 D3 3131′ 9 · T10 D3 3135′ 7 |
| Samuel Esteves | ATA | 27→36 | 29 | 29→20 (pico 29) | 1 | 206 | 18000 | 0 | 0 | 1 | T1 D1 0′ 29 · T2 D1 0′ 28 · T3 D2 636′ 27 · T4 D2 733′ 27 · T5 D2 3302′ 26 · T6 D2 3240′ 25 · T7 D2 2922′ 24 · T8 D2 2920′ 23 · T9 D2 3330′ 22 · T10 D2 917′ 20 |
| Marcos Lacerda Jardim | ATA | 27→36 | 34 | 34→25 (pico 34) | 1 | 147 | 13133 | 0 | 0 | 7 | T1 D1 0′ 34 · T2 D1 90′ 33 · T3 D1 0′ 32 · T4 D2 180′ 32 · T5 D2 360′ 31 · T6 D2 343′ 30 · T7 D2 3134′ 29 · T8 D1 3210′ 28 · T9 D2 2670′ 26 · T10 D2 3146′ 25 |
| Caio Lacerda | DEF | 26→35 | 36 | 36→27 (pico 36) | 1 | 100 | 8767 | 1 | 0 | 0 | T1 D2 0′ 36 · T2 D2 0′ 35🏆 · T3 D1 0′ 34 · T4 D1 0′ 33 · T5 D1 55′ 33 · T6 D1 0′ 32 · T7 D1 836′ 31 · T8 D1 1567′ 30 · T9 D1 3134′ 29 · T10 D2 3175′ 27 |
| Davi Moraes | DEF | 27→36 | 37 | 37→28 (pico 37) | 1 | 160 | 14119 | 1 | 0 | 1 | T1 D2 416′ 37 · T2 D2 0′ 36🏆 · T3 D1 270′ 36 · T4 D1 810′ 35 · T5 D1 1121′ 34 · T6 D1 931′ 33 · T7 D1 3330′ 32 · T8 D1 3150′ 30 · T9 D1 1151′ 29 · T10 D2 2940′ 28 |
| Elias Valadares | MEI | 27→36 | 26 | 26→17 (pico 26) | 1 | 121 | 10242 | 0 | 0 | 0 | T1 D2 90′ 26 · T2 D2 180′ 25 · T3 D2 90′ 24 · T4 D3 720′ 24 · T5 D3 1288′ 23 · T6 D3 1078′ 22 · T7 D2 2165′ 21 · T8 D2 1000′ 20 · T9 D1 3214′ 18 · T10 D2 417′ 17 |
| Davi Nogueira | DEF | 28→36 | 26 | 26→17 (pico 26) | 1 | 86 | 7003 | 1 | 0 | 2 | T1 D2 90′ 26 · T2 D2 106′ 25 · T3 D3 436′ 24🏆 · T4 D2 249′ 23 · T5 D3 1229′ 23 · T6 D3 1245′ 22 · T7 D2 1456′ 20 · T8 D3 1406′ 19 · T9 D3 786′ 17 |
| Yuri Siqueira | DEF | 29→36 | 11 | 11→2 (pico 11) | 1 | 273 | 24112 | 0 | 0 | 13 | T1 D4 2676′ 11 · T2 D4 3330′ 11 · T3 D4 3150′ 10 · T4 D4 2909′ 9 · T5 D4 3208′ 7 · T6 D4 2810′ 6 · T7 D4 2982′ 4 · T8 D4 3047′ 2 |
| Fábio Esteves Zanetti | ATA | 28→36 | 13 | 13→4 (pico 13) | 1 | 270 | 23885 | 0 | 0 | 6 | T1 D4 3096′ 13 · T2 D4 2631′ 13 · T3 D4 3150′ 12 · T4 D4 2935′ 11 · T5 D4 3067′ 10 · T6 D4 3330′ 9 · T7 D4 3330′ 7 · T8 D4 1577′ 6 · T9 D4 769′ 4 |
| Felipe Uchoa | DEF | 29→36 | 13 | 13→4 (pico 13) | 1 | 247 | 21933 | 0 | 0 | 13 | T1 D4 3150′ 13 · T2 D4 2798′ 12 · T3 D4 3052′ 12 · T4 D4 3210′ 11 · T5 D4 3035′ 9 · T6 D4 2520′ 8 · T7 D4 3150′ 6 · T8 D4 1018′ 4 |
| Caio Honório | GOL | 27→36 | 12 | 12→3 (pico 12) | 1 | 260 | 23297 | 0 | 0 | 1 | T1 D4 0′ 12 · T2 D4 0′ 11 · T3 D4 0′ 10 · T4 D4 3240′ 10 · T5 D4 3152′ 10 · T6 D4 3325′ 9 · T7 D4 3420′ 8 · T8 D4 3420′ 7 · T9 D4 3420′ 5 · T10 D4 3320′ 3 |
| Henrique Coutinho Duarte | DEF | 28→36 | 16 | 16→7 (pico 16) | 1 | 170 | 14710 | 1 | 0 | 9 | T1 D4 180′ 16🏆 · T2 D3 90′ 15 · T3 D3 420′ 14 · T4 D4 879′ 13 · T5 D4 1066′ 12 · T6 D4 3240′ 12 · T7 D3 3057′ 10 · T8 D3 3420′ 9 · T9 D4 2358′ 7 |
| Adriano Gomes | DEF | 28→36 | 24 | 24→16 (pico 24) | 1 | 131 | 10936 | 1 | 0 | 3 | T1 D1 0′ 24 · T2 D2 0′ 23 · T3 D3 584′ 22 · T4 D3 1274′ 22 · T5 D3 1987′ 21 · T6 D3 1607′ 20 · T7 D3 1279′ 19🏆 · T8 D2 2043′ 17 · T9 D3 2162′ 16 |
| Davi Siqueira | MEI | 24→33 | 27 | 27→19 (pico 27) | 1 | 30 | 2700 | 2 | 0 | 0 | T1 D1 180′ 27 · T2 D2 90′ 26 · T3 D2 0′ 25 · T4 D2 0′ 25🏆 · T5 D1 0′ 24 · T6 D1 90′ 23 · T7 D1 0′ 22 · T8 D2 0′ 22 · T9 D2 1440′ 20 · T10 D2 900′ 19🏆 |
| Samuel Lacerda | DEF | 28→36 | 25 | 25→17 (pico 25) | 1 | 42 | 3661 | 0 | 0 | 0 | T1 D1 0′ 25 · T2 D1 0′ 24 · T3 D1 0′ 23 · T4 D2 90′ 23 · T5 D2 360′ 22 · T6 D3 289′ 21 · T7 D3 1405′ 20 · T8 D2 437′ 19 · T9 D2 1080′ 17 |
| Thiago Oliveira | MEI | 25→34 | 29 | 29→21 (pico 29) | 1 | 60 | 5189 | 0 | 0 | 1 | T1 D1 90′ 29 · T2 D1 0′ 28 · T3 D1 253′ 27 · T4 D2 0′ 27 · T5 D2 0′ 26 · T6 D3 0′ 25 · T7 D3 195′ 24 · T8 D2 173′ 24 · T9 D2 3128′ 23 · T10 D2 1350′ 21 |
| Ulisses Jardim | DEF | 26→35 | 28 | 28→20 (pico 28) | 1 | 72 | 6055 | 0 | 0 | 1 | T1 D1 0′ 28 · T2 D2 0′ 27 · T3 D2 0′ 26 · T4 D2 0′ 25 · T5 D2 180′ 25 · T6 D2 90′ 24 · T7 D2 1549′ 23 · T8 D2 1670′ 23 · T9 D2 1522′ 22 · T10 D1 1044′ 20 |
| Diego Xavier Freitas | ATA | 28→36 | 32 | 32→24 (pico 32) | 1 | 79 | 7036 | 0 | 0 | 3 | T1 D1 0′ 32 · T2 D1 0′ 31 · T3 D1 0′ 30 · T4 D2 0′ 29 · T5 D2 0′ 29 · T6 D2 0′ 28 · T7 D2 630′ 27 · T8 D1 3203′ 25 · T9 D2 3203′ 24 |
| Everton Teixeira Toledo | DEF | 26→35 | 37 | 37→29 (pico 37) | 1 | 52 | 4376 | 2 | 0 | 0 | T1 D1 0′ 37🏆 · T2 D1 90′ 36 · T3 D1 0′ 35 · T4 D2 398′ 35 · T5 D1 631′ 34 · T6 D1 211′ 33 · T7 D1 289′ 33🏆 · T8 D1 270′ 32 · T9 D1 1677′ 30 · T10 D1 810′ 29 |

### Top 20 maiores ganhos (atual − base) (20)

| Nome | pos. | idade ini→fim | base | atual ini→fim | clubes | jogos | minutos | títulos | transf. | rodadas lesionado | evolução (temporada: divisão, minutos, força no fim; 🏆 campeão da divisão) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Heitor Lopes | DEF | 17→21 | 14 | 14→27 (pico 27) | 1 | 174 | 15508 | 1 | 0 | 1 | T6 D3 3240′ 17🏆 · T7 D2 3237′ 20 · T8 D2 2886′ 23 · T9 D2 2995′ 25 · T10 D2 3150′ 27 |
| Thiago Nogueira | ATA | 17→24 | 8 | 8→19 (pico 19) | 1 | 270 | 23935 | 0 | 0 | 6 | T3 D4 3083′ 9 · T4 D4 2008′ 11 · T5 D4 3181′ 13 · T6 D4 3153′ 15 · T7 D4 2835′ 16 · T8 D4 3330′ 17 · T9 D3 3105′ 18 · T10 D4 3240′ 19 |
| Heitor Duarte Gomes | MEI | 18→27 | 21 | 21→30 (pico 30) | 1 | 324 | 28312 | 0 | 0 | 2 | T1 D3 1081′ 21 · T2 D3 2816′ 23 · T3 D2 3133′ 25 · T4 D2 3240′ 27 · T5 D2 3003′ 28 · T6 D2 2822′ 29 · T7 D2 3033′ 30 · T8 D2 2951′ 30 · T9 D3 3330′ 30 · T10 D3 2903′ 30 |
| Wesley Jardim Oliveira | DEF | 19→28 | 18 | 18→27 (pico 27) | 1 | 275 | 24182 | 0 | 0 | 15 | T1 D3 1220′ 18 · T2 D3 1849′ 20 · T3 D2 1080′ 21 · T4 D2 2178′ 22 · T5 D2 3330′ 24 · T6 D2 3330′ 25 · T7 D2 2862′ 26 · T8 D2 2366′ 27 · T9 D3 2727′ 27 · T10 D3 3240′ 27 |
| Pedro Oliveira | DEF | 17→22 | 7 | 7→16 (pico 16) | 1 | 158 | 13610 | 0 | 0 | 7 | T5 D4 1676′ 8 · T6 D3 1737′ 10 · T7 D3 1532′ 11 · T8 D4 2879′ 13 · T9 D4 2972′ 15 · T10 D3 2814′ 16 |
| Igor Santana | DEF | 17→22 | 12 | 12→21 (pico 21) | 1 | 206 | 18239 | 0 | 0 | 0 | T5 D4 3063′ 14 · T6 D3 3053′ 16 · T7 D3 2989′ 18 · T8 D4 3026′ 20 · T9 D4 3240′ 20 · T10 D3 2868′ 21 |
| Felipe Nogueira Esteves | DEF | 17→26 | 10 | 10→18 (pico 18) | 1 | 317 | 27826 | 0 | 0 | 9 | T1 D4 1934′ 11 · T2 D4 3031′ 13 · T3 D4 2967′ 14 · T4 D4 2778′ 15 · T5 D4 2889′ 17 · T6 D4 3002′ 17 · T7 D4 3090′ 18 · T8 D4 2879′ 18 · T9 D4 2997′ 18 · T10 D4 2259′ 18 |
| Kaio Zanetti Siqueira | DEF | 21→30 | 20 | 20→28 (pico 28) | 1 | 332 | 29206 | 0 | 0 | 12 | T1 D3 3232′ 21 · T2 D3 3027′ 23 · T3 D2 3150′ 25 · T4 D2 2945′ 26 · T5 D2 2900′ 27 · T6 D2 2648′ 28 · T7 D2 3235′ 28 · T8 D2 2924′ 28 · T9 D3 2359′ 28 · T10 D3 2786′ 28 |
| Adriano Jardim | ATA | 17→26 | 16 | 16→24 (pico 24) | 1 | 344 | 30472 | 0 | 0 | 19 | T1 D3 2847′ 17 · T2 D3 2781′ 19 · T3 D3 2721′ 20 · T4 D4 3240′ 21 · T5 D3 2532′ 22 · T6 D4 3240′ 22 · T7 D4 3240′ 22 · T8 D3 3330′ 23 · T9 D2 3330′ 24 · T10 D3 3211′ 24 |
| Adriano Rezende | MEI | 19→28 | 28 | 28→36 (pico 36) | 1 | 359 | 32220 | 0 | 0 | 5 | T1 D2 3240′ 29 · T2 D3 3240′ 31 · T3 D2 3240′ 32 · T4 D2 3240′ 34 · T5 D1 3330′ 35 · T6 D1 2906′ 36 · T7 D1 3304′ 36 · T8 D2 3060′ 36 · T9 D2 3330′ 36 · T10 D2 3330′ 36 |
| Gustavo Zanetti Macedo | GOL | 17→26 | 31 | 31→39 (pico 39) | 1 | 300 | 26993 | 1 | 0 | 4 | T1 D2 0′ 31 · T2 D2 0′ 31🏆 · T3 D1 3420′ 33 · T4 D1 3420′ 35 · T5 D1 3420′ 36 · T6 D1 3420′ 38 · T7 D1 3240′ 38 · T8 D1 3420′ 39 · T9 D1 3420′ 39 · T10 D2 3233′ 39 |
| Diego Gomes | DEF | 18→27 | 30 | 30→38 (pico 38) | 1 | 358 | 32034 | 0 | 0 | 8 | T1 D1 3127′ 32 · T2 D1 3330′ 33 · T3 D1 3195′ 35 · T4 D1 3240′ 37 · T5 D1 3330′ 38 · T6 D1 3278′ 38 · T7 D1 2700′ 38 · T8 D1 3174′ 38 · T9 D2 3420′ 38 · T10 D1 3240′ 38 |
| Lucas Macedo | ATA | 18→22 | 14 | 14→22 (pico 22) | 1 | 186 | 16736 | 1 | 0 | 1 | T6 D3 3326′ 16 · T7 D4 3330′ 18 · T8 D3 3330′ 19 · T9 D4 3330′ 21🏆 · T10 D3 3420′ 22 |
| Adriano Pereira | DEF | 18→21 | 21 | 21→29 (pico 29) | 1 | 140 | 12518 | 0 | 0 | 1 | T7 D2 3240′ 23 · T8 D2 3150′ 26 · T9 D2 3150′ 28 · T10 D2 2978′ 29 |
| Cauã Cardoso Pacheco | MEI | 18→27 | 16 | 16→23 (pico 23) | 1 | 361 | 32378 | 1 | 0 | 6 | T1 D4 3420′ 18 · T2 D4 3330′ 20 · T3 D3 3420′ 21 · T4 D3 3042′ 23 · T5 D4 3330′ 23 · T6 D4 2947′ 23 · T7 D4 3240′ 23 · T8 D4 3238′ 23🏆 · T9 D3 3193′ 23 · T10 D4 3218′ 23 |
| Igor Queiroz Esteves | MEI | 17→26 | 11 | 11→18 (pico 18) | 1 | 367 | 32831 | 0 | 0 | 6 | T1 D4 3196′ 12 · T2 D4 3195′ 14 · T3 D4 3420′ 16 · T4 D4 3330′ 17 · T5 D4 3420′ 18 · T6 D4 3198′ 18 · T7 D4 3082′ 18 · T8 D4 3240′ 18 · T9 D4 3420′ 18 · T10 D4 3330′ 18 |
| Luan Jardim | GOL | 17→26 | 10 | 10→17 (pico 17) | 1 | 377 | 33876 | 0 | 0 | 1 | T1 D4 3420′ 11 · T2 D4 3420′ 13 · T3 D4 3420′ 14 · T4 D4 3420′ 15 · T5 D4 3420′ 16 · T6 D4 3276′ 17 · T7 D4 3330′ 17 · T8 D4 3420′ 17 · T9 D4 3420′ 17 · T10 D4 3330′ 17 |
| Fábio Esteves | MEI | 20→29 | 8 | 8→15 (pico 15) | 1 | 344 | 30505 | 0 | 0 | 6 | T1 D4 3195′ 9 · T2 D4 3104′ 11 · T3 D4 3330′ 13 · T4 D4 3082′ 14 · T5 D4 2885′ 14 · T6 D4 2751′ 15 · T7 D4 2876′ 15 · T8 D4 2931′ 15 · T9 D4 3129′ 15 · T10 D4 3222′ 15 |
| João Xavier Macedo | MEI | 19→28 | 12 | 12→19 (pico 19) | 1 | 340 | 30460 | 0 | 0 | 6 | T1 D3 1800′ 13 · T2 D4 3240′ 15 · T3 D4 3007′ 16 · T4 D4 3240′ 18 · T5 D4 2956′ 18 · T6 D4 3240′ 19 · T7 D4 3330′ 19 · T8 D4 3114′ 19 · T9 D4 3203′ 19 · T10 D4 3330′ 19 |
| Paulo Honório | MEI | 18→27 | 18 | 18→25 (pico 25) | 1 | 292 | 26080 | 0 | 0 | 3 | T1 D3 848′ 18 · T2 D3 980′ 19 · T3 D3 1980′ 20 · T4 D3 3047′ 22 · T5 D3 3240′ 23 · T6 D3 3240′ 24 · T7 D3 2979′ 25 · T8 D3 3420′ 25 · T9 D3 3240′ 25 · T10 D3 3106′ 25 |

### Todos que chegaram a 46+ (base ou desenvolvimento) (14)

| Nome | pos. | idade ini→fim | base | atual ini→fim | clubes | jogos | minutos | títulos | transf. | rodadas lesionado | evolução (temporada: divisão, minutos, força no fim; 🏆 campeão da divisão) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| André Pacheco Gomes | GOL | 28→36 | 46 | 46→46 (pico 46) | 1 | 339 | 30490 | 2 | 0 | 3 | T1 D1 3420′ 46 · T2 D1 3420′ 46🏆 · T3 D1 3130′ 46 · T4 D1 3420′ 46🏆 · T5 D1 3420′ 46 · T6 D1 3420′ 46 · T7 D1 3420′ 46 · T8 D1 3420′ 46 · T9 D1 3420′ 46 |
| Ulisses Rocha | DEF | 19→28 | 45 | 45→46 (pico 46) | 1 | 343 | 30505 | 2 | 0 | 3 | T1 D1 3330′ 45 · T2 D1 2624′ 45🏆 · T3 D1 3240′ 46 · T4 D1 2781′ 46🏆 · T5 D1 3032′ 46 · T6 D1 3150′ 46 · T7 D1 3330′ 46 · T8 D1 2966′ 46 · T9 D1 2812′ 46 · T10 D1 3240′ 46 |
| Fábio Siqueira Rezende | DEF | 29→36 | 50 | 50→48 (pico 50) | 1 | 273 | 24260 | 2 | 0 | 14 | T1 D1 2868′ 50 · T2 D1 2963′ 50🏆 · T3 D1 2902′ 50 · T4 D1 3124′ 50🏆 · T5 D1 3013′ 50 · T6 D1 3150′ 50 · T7 D1 3240′ 49 · T8 D1 3000′ 48 |
| Breno Gomes | DEF | 26→35 | 50 | 50→49 (pico 50) | 1 | 347 | 30819 | 2 | 0 | 5 | T1 D1 3129′ 50 · T2 D1 3330′ 50🏆 · T3 D1 3150′ 50 · T4 D1 2956′ 50🏆 · T5 D1 3240′ 50 · T6 D1 3077′ 50 · T7 D1 3150′ 50 · T8 D1 2444′ 50 · T9 D1 3240′ 49 · T10 D1 3103′ 49 |
| Elias Nogueira | DEF | 28→36 | 46 | 46→43 (pico 46) | 1 | 312 | 27796 | 2 | 0 | 1 | T1 D1 2994′ 46 · T2 D1 3240′ 46🏆 · T3 D1 3013′ 46 · T4 D1 3071′ 46🏆 · T5 D1 3060′ 46 · T6 D1 3017′ 46 · T7 D1 3011′ 45 · T8 D1 3240′ 45 · T9 D1 3150′ 43 |
| Kaio Esteves Rocha | MEI | 22→31 | 47 | 47→47 (pico 47) | 1 | 349 | 31040 | 2 | 0 | 3 | T1 D1 2812′ 47 · T2 D1 3137′ 47🏆 · T3 D1 3150′ 47 · T4 D1 3177′ 47🏆 · T5 D1 3240′ 47 · T6 D1 2956′ 47 · T7 D1 3038′ 47 · T8 D1 3240′ 47 · T9 D1 3050′ 47 · T10 D1 3240′ 47 |
| Nícolas Uchoa | MEI | 18→27 | 44 | 44→46 (pico 46) | 1 | 343 | 30415 | 2 | 0 | 14 | T1 D1 3240′ 45 · T2 D1 3006′ 45🏆 · T3 D1 3043′ 46 · T4 D1 3017′ 46🏆 · T5 D1 3150′ 46 · T6 D1 3058′ 46 · T7 D1 3026′ 46 · T8 D1 3019′ 46 · T9 D1 2659′ 46 · T10 D1 3197′ 46 |
| Elias Gomes | MEI | 22→31 | 47 | 47→47 (pico 47) | 1 | 319 | 27949 | 2 | 0 | 12 | T1 D1 2388′ 47 · T2 D1 2815′ 47🏆 · T3 D1 3033′ 47 · T4 D1 2987′ 47🏆 · T5 D1 2408′ 47 · T6 D1 3150′ 47 · T7 D1 2921′ 47 · T8 D1 2863′ 47 · T9 D1 2835′ 47 · T10 D1 2549′ 47 |
| Renan Queiroz | ATA | 24→33 | 47 | 47→46 (pico 47) | 1 | 358 | 31877 | 2 | 0 | 2 | T1 D1 3031′ 47 · T2 D1 3330′ 47🏆 · T3 D1 3172′ 47 · T4 D1 3041′ 47🏆 · T5 D1 3330′ 47 · T6 D1 3211′ 47 · T7 D1 3006′ 47 · T8 D1 3240′ 47 · T9 D1 3186′ 47 · T10 D1 3330′ 46 |
| Luan Farias | ATA | 22→31 | 46 | 46→46 (pico 46) | 1 | 361 | 32263 | 2 | 0 | 10 | T1 D1 3305′ 46 · T2 D1 3420′ 46🏆 · T3 D1 3032′ 46 · T4 D1 2957′ 46🏆 · T5 D1 3330′ 46 · T6 D1 2811′ 46 · T7 D1 3420′ 46 · T8 D1 3330′ 46 · T9 D1 3420′ 46 · T10 D1 3238′ 46 |
| Ulisses Siqueira Queiroz | ATA | 32→36 | 47 | 47→43 (pico 47) | 1 | 173 | 15336 | 2 | 0 | 5 | T1 D1 3116′ 47 · T2 D1 2967′ 47🏆 · T3 D1 3020′ 46 · T4 D1 3240′ 45🏆 · T5 D1 2993′ 43 |
| Wallace Queiroz | GOL | 25→34 | 48 | 48→48 (pico 48) | 1 | 377 | 33866 | 2 | 0 | 2 | T1 D1 3420′ 48🏆 · T2 D1 3420′ 48 · T3 D1 3211′ 48 · T4 D2 3420′ 48 · T5 D1 3295′ 48 · T6 D1 3420′ 48 · T7 D1 3420′ 48🏆 · T8 D1 3420′ 48 · T9 D1 3420′ 48 · T10 D1 3420′ 48 |
| Caio Toledo Freitas | ATA | 21→30 | 48 | 48→48 (pico 48) | 2 | 361 | 32394 | 1 | 1 | 8 | T1 D1 3203′ 48🏆 · T2 D1 3330′ 48 · T3 D1 3135′ 48 · T4 D1 2746′ 48 · T5 D2 3330′ 48 · T6 D1 3330′ 48 · T7 D1 3330′ 48 · T8 D1 3330′ 48 · T9 D1 3330′ 48 · T10 D1 3330′ 48 |
| Heitor Nogueira | ATA | 31→36 | 46 | 46→43 (pico 46) | 2 | 220 | 19767 | 1 | 1 | 2 | T1 D1 3240′ 46🏆 · T2 D1 3420′ 46 · T3 D1 3240′ 45 · T4 D1 3230′ 45 · T5 D1 3217′ 44 · T6 D1 3420′ 43 |

### Quem chegou a 49 por ganho (48 → 49) (0)

Jogadores que estiveram em 49 ou 50 em algum momento (inclui quem já nasceu assim): 2.

— nenhum.

### Jogadores que começaram com 40+ (119)

Resumo: final médio 40,39 (base média 42,29); subiram 18, iguais 28, caíram 73; pico acima da base em algum momento: 18; maior pico ganho +2. Lista completa no JSON; tabela:

| Nome | pos. | idade ini→fim | base | atual ini→fim | clubes | jogos | minutos | títulos | transf. | rodadas lesionado | evolução |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Felipe Valadares | GOL | 32→36 | 41 | 41→39 (pico 41) | 1 | 77 | 6873 | 0 | 0 | 0 | T1 D1 123′ 41 · T2 D1 0′ 40 · T3 D1 0′ 39 · T4 D1 3420′ 39 · T5 D1 3330′ 39 |
| Paulo Zanetti | GOL | 34→36 | 42 | 42→42 (pico 42) | 1 | 113 | 10136 | 0 | 0 | 0 | T1 D1 3296′ 42 · T2 D1 3420′ 42 · T3 D1 3420′ 42 |
| Kaio Macedo | DEF | 33→36 | 42 | 42→39 (pico 42) | 1 | 139 | 12260 | 0 | 0 | 8 | T1 D1 2615′ 42 · T2 D1 3306′ 41 · T3 D1 3330′ 40 · T4 D1 3009′ 39 |
| Kaio Guedes | DEF | 30→36 | 42 | 42→38 (pico 42) | 1 | 226 | 19680 | 1 | 0 | 1 | T1 D1 2913′ 42 · T2 D1 2970′ 42 · T3 D1 2601′ 42 · T4 D1 2621′ 41 · T5 D1 2877′ 40 · T6 D1 2814′ 39🏆 · T7 D1 2884′ 38 |
| João Honório | DEF | 27→36 | 40 | 40→36 (pico 40) | 1 | 346 | 30742 | 1 | 0 | 2 | T1 D1 3020′ 40 · T2 D1 3240′ 40 · T3 D1 3117′ 40 · T4 D1 3008′ 40 · T5 D1 3098′ 40 · T6 D1 3145′ 40🏆 · T7 D1 3240′ 40 · T8 D1 2783′ 39 · T9 D1 3094′ 38 · T10 D1 2997′ 36 |
| Renan Cardoso Esteves | DEF | 20→29 | 42 | 42→43 (pico 43) | 1 | 333 | 29188 | 1 | 0 | 19 | T1 D1 3240′ 42 · T2 D1 2872′ 42 · T3 D1 2698′ 43 · T4 D1 3240′ 43 · T5 D1 3149′ 43 · T6 D1 2684′ 43🏆 · T7 D1 2658′ 43 · T8 D1 2878′ 43 · T9 D1 2735′ 43 · T10 D1 3034′ 43 |
| Gustavo Rezende | MEI | 23→32 | 41 | 41→42 (pico 42) | 1 | 364 | 32509 | 1 | 0 | 1 | T1 D1 3240′ 41 · T2 D1 3420′ 42 · T3 D1 3194′ 42 · T4 D1 3178′ 42 · T5 D1 3240′ 42 · T6 D1 3240′ 42🏆 · T7 D1 3007′ 42 · T8 D1 3420′ 42 · T9 D1 3330′ 42 · T10 D1 3240′ 42 |
| Everton Oliveira | MEI | 26→35 | 41 | 41→37 (pico 41) | 1 | 163 | 13915 | 1 | 0 | 5 | T1 D1 3089′ 41 · T2 D1 3048′ 41 · T3 D1 952′ 41 · T4 D1 451′ 41 · T5 D1 450′ 41 · T6 D1 1302′ 41🏆 · T7 D1 1315′ 40 · T8 D1 1256′ 39 · T9 D1 1376′ 38 · T10 D1 676′ 37 |
| Felipe Esteves | ATA | 34→36 | 41 | 41→38 (pico 41) | 1 | 105 | 9357 | 0 | 0 | 4 | T1 D1 3240′ 41 · T2 D1 3032′ 39 · T3 D1 3085′ 38 |
| Davi Queiroz | ATA | 27→36 | 40 | 40→35 (pico 40) | 1 | 352 | 31261 | 1 | 0 | 10 | T1 D1 2595′ 40 · T2 D1 3420′ 40 · T3 D1 3186′ 40 · T4 D1 3240′ 40 · T5 D1 3184′ 40 · T6 D1 3240′ 40🏆 · T7 D1 3029′ 39 · T8 D1 3218′ 38 · T9 D1 3150′ 37 · T10 D1 2999′ 35 |
| Adriano Prates | GOL | 19→28 | 43 | 43→43 (pico 43) | 1 | 375 | 33630 | 0 | 0 | 4 | T1 D1 3420′ 43 · T2 D1 3420′ 43 · T3 D1 3420′ 43 · T4 D1 3262′ 43 · T5 D1 3420′ 43 · T6 D2 3327′ 43 · T7 D1 3191′ 43 · T8 D2 3330′ 43 · T9 D1 3420′ 43 · T10 D1 3420′ 43 |
| Felipe Nogueira | DEF | 31→36 | 42 | 42→39 (pico 42) | 1 | 208 | 18522 | 0 | 0 | 3 | T1 D1 3016′ 42 · T2 D1 2926′ 42 · T3 D1 3240′ 42 · T4 D1 3150′ 41 · T5 D1 2860′ 40 · T6 D2 3330′ 39 |
| Mateus Siqueira | MEI | 19→28 | 43 | 43→43 (pico 43) | 2 | 341 | 30246 | 0 | 1 | 15 | T1 D1 2887′ 43 · T2 D1 3016′ 43 · T3 D1 3240′ 43 · T4 D1 3104′ 43 · T5 D1 2759′ 43 · T6 D2 3018′ 43 · T7 D1 2925′ 43 · T8 D1 3220′ 43 · T9 D2 3132′ 43 · T10 D2 2945′ 43 |
| Paulo Farias | MEI | 25→34 | 44 | 44→44 (pico 44) | 1 | 362 | 32312 | 0 | 0 | 8 | T1 D1 3239′ 44 · T2 D1 3240′ 44 · T3 D1 3093′ 44 · T4 D1 2974′ 44 · T5 D1 3185′ 44 · T6 D2 3176′ 44 · T7 D1 3420′ 44 · T8 D2 3330′ 44 · T9 D1 3325′ 44 · T10 D1 3330′ 44 |
| Wesley Pacheco | ATA | 25→34 | 42 | 42→40 (pico 42) | 1 | 357 | 31948 | 0 | 0 | 10 | T1 D1 3420′ 42 · T2 D1 3229′ 42 · T3 D1 3330′ 42 · T4 D1 3330′ 42 · T5 D1 3042′ 42 · T6 D2 3132′ 42 · T7 D1 3330′ 42 · T8 D2 3148′ 42 · T9 D1 3109′ 41 · T10 D1 2878′ 40 |
| Davi Esteves | ATA | 31→36 | 40 | 40→35 (pico 40) | 1 | 169 | 15013 | 0 | 0 | 1 | T1 D1 3330′ 40 · T2 D1 3009′ 40 · T3 D1 3330′ 39 · T4 D1 1530′ 38 · T5 D1 484′ 37 · T6 D2 3330′ 35 |
| João Freitas Gomes | DEF | 33→36 | 42 | 42→39 (pico 42) | 1 | 145 | 12991 | 0 | 0 | 2 | T1 D1 3330′ 42 · T2 D1 3330′ 41 · T3 D1 3227′ 40 · T4 D2 3104′ 39 |
| Igor Uchoa | DEF | 30→36 | 41 | 41→36 (pico 41) | 1 | 224 | 19366 | 0 | 0 | 6 | T1 D1 2910′ 41 · T2 D1 2518′ 41 · T3 D1 2913′ 41 · T4 D2 2753′ 40 · T5 D2 2770′ 39 · T6 D2 2775′ 37 · T7 D2 2727′ 36 |
| Leandro Queiroz | MEI | 22→31 | 43 | 43→43 (pico 43) | 2 | 352 | 31208 | 0 | 1 | 5 | T1 D1 3029′ 43 · T2 D1 3201′ 43 · T3 D1 3240′ 43 · T4 D2 3098′ 43 · T5 D1 3127′ 43 · T6 D1 3240′ 43 · T7 D1 2641′ 43 · T8 D1 3162′ 43 · T9 D2 3230′ 43 · T10 D1 3240′ 43 |
| André Cardoso Zanetti | MEI | 28→36 | 41 | 41→37 (pico 41) | 1 | 314 | 27927 | 0 | 0 | 5 | T1 D1 3147′ 41 · T2 D1 2892′ 41 · T3 D1 3215′ 41 · T4 D2 3150′ 41 · T5 D2 3195′ 41 · T6 D2 2959′ 40 · T7 D2 3203′ 40 · T8 D1 2836′ 38 · T9 D2 3330′ 37 |
| Cauã Ientes | MEI | 26→35 | 40 | 40→38 (pico 40) | 1 | 349 | 30920 | 0 | 0 | 4 | T1 D1 3330′ 40 · T2 D1 2913′ 40 · T3 D1 2994′ 40 · T4 D2 3219′ 40 · T5 D2 3132′ 40 · T6 D2 3195′ 40 · T7 D2 3330′ 40 · T8 D1 2487′ 39 · T9 D2 3240′ 39 · T10 D2 3080′ 38 |
| Ulisses Cardoso Esteves | ATA | 22→31 | 43 | 43→43 (pico 43) | 2 | 350 | 31132 | 0 | 1 | 16 | T1 D1 3090′ 43 · T2 D1 2455′ 43 · T3 D1 3240′ 43 · T4 D2 3330′ 43 · T5 D2 3240′ 43 · T6 D2 3167′ 43 · T7 D1 2974′ 43 · T8 D2 3330′ 43 · T9 D1 2976′ 43 · T10 D1 3330′ 43 |
| Caio Xavier | ATA | 29→36 | 44 | 44→39 (pico 44) | 2 | 274 | 24167 | 1 | 1 | 15 | T1 D1 3095′ 44 · T2 D1 2882′ 44 · T3 D1 3148′ 44 · T4 D1 3098′ 44 · T5 D1 3207′ 43 · T6 D1 2495′ 42 · T7 D2 3024′ 40🏆 · T8 D1 3218′ 39 |
| André Pacheco Gomes | GOL | 28→36 | 46 | 46→46 (pico 46) | 1 | 339 | 30490 | 2 | 0 | 3 | T1 D1 3420′ 46 · T2 D1 3420′ 46🏆 · T3 D1 3130′ 46 · T4 D1 3420′ 46🏆 · T5 D1 3420′ 46 · T6 D1 3420′ 46 · T7 D1 3420′ 46 · T8 D1 3420′ 46 · T9 D1 3420′ 46 |
| Gustavo Toledo | GOL | 34→36 | 44 | 44→42 (pico 44) | 1 | 4 | 290 | 1 | 0 | 0 | T1 D1 0′ 44 · T2 D1 0′ 43🏆 · T3 D1 290′ 42 |
| Igor Valadares | GOL | 18→27 | 40 | 40→37 (pico 40) | 1 | 38 | 3420 | 2 | 0 | 0 | T1 D1 0′ 40 · T2 D1 0′ 40🏆 · T3 D1 0′ 40 · T4 D1 0′ 40🏆 · T5 D1 0′ 40 · T6 D1 0′ 40 · T7 D1 0′ 39 · T8 D1 0′ 38 · T9 D1 0′ 37 · T10 D1 3420′ 37 |
| Ulisses Rocha | DEF | 19→28 | 45 | 45→46 (pico 46) | 1 | 343 | 30505 | 2 | 0 | 3 | T1 D1 3330′ 45 · T2 D1 2624′ 45🏆 · T3 D1 3240′ 46 · T4 D1 2781′ 46🏆 · T5 D1 3032′ 46 · T6 D1 3150′ 46 · T7 D1 3330′ 46 · T8 D1 2966′ 46 · T9 D1 2812′ 46 · T10 D1 3240′ 46 |
| Fábio Siqueira Rezende | DEF | 29→36 | 50 | 50→48 (pico 50) | 1 | 273 | 24260 | 2 | 0 | 14 | T1 D1 2868′ 50 · T2 D1 2963′ 50🏆 · T3 D1 2902′ 50 · T4 D1 3124′ 50🏆 · T5 D1 3013′ 50 · T6 D1 3150′ 50 · T7 D1 3240′ 49 · T8 D1 3000′ 48 |
| Breno Gomes | DEF | 26→35 | 50 | 50→49 (pico 50) | 1 | 347 | 30819 | 2 | 0 | 5 | T1 D1 3129′ 50 · T2 D1 3330′ 50🏆 · T3 D1 3150′ 50 · T4 D1 2956′ 50🏆 · T5 D1 3240′ 50 · T6 D1 3077′ 50 · T7 D1 3150′ 50 · T8 D1 2444′ 50 · T9 D1 3240′ 49 · T10 D1 3103′ 49 |
| Breno Zanetti | DEF | 26→35 | 43 | 43→40 (pico 43) | 1 | 175 | 14966 | 2 | 0 | 7 | T1 D1 1080′ 43 · T2 D1 1158′ 43🏆 · T3 D1 1081′ 43 · T4 D1 853′ 43🏆 · T5 D1 1124′ 43 · T6 D1 1193′ 43 · T7 D1 810′ 43 · T8 D1 1401′ 42 · T9 D1 3330′ 41 · T10 D1 2936′ 40 |
| Fábio Rocha | DEF | 21→30 | 43 | 43→39 (pico 43) | 1 | 66 | 5522 | 2 | 0 | 0 | T1 D1 184′ 43 · T2 D1 227′ 43🏆 · T3 D1 248′ 43 · T4 D1 433′ 42🏆 · T5 D1 169′ 42 · T6 D1 0′ 41 · T7 D1 90′ 40 · T8 D1 360′ 39 · T9 D1 950′ 39 · T10 D1 2861′ 39 |
| Luan Cardoso Honório | DEF | 31→36 | 42 | 42→38 (pico 42) | 1 | 0 | 0 | 2 | 0 | 0 | T1 D1 0′ 42 · T2 D1 0′ 41🏆 · T3 D1 0′ 40 · T4 D1 0′ 39🏆 · T5 D1 0′ 39 · T6 D1 0′ 38 |
| Wesley Ientes | DEF | 22→31 | 43 | 43→37 (pico 43) | 1 | 15 | 1286 | 2 | 0 | 0 | T1 D1 0′ 43 · T2 D1 0′ 43🏆 · T3 D1 0′ 42 · T4 D1 180′ 41🏆 · T5 D1 0′ 41 · T6 D1 0′ 40 · T7 D1 0′ 39 · T8 D1 90′ 38 · T9 D1 0′ 38 · T10 D1 1016′ 37 |
| Elias Nogueira | DEF | 28→36 | 46 | 46→43 (pico 46) | 1 | 312 | 27796 | 2 | 0 | 1 | T1 D1 2994′ 46 · T2 D1 3240′ 46🏆 · T3 D1 3013′ 46 · T4 D1 3071′ 46🏆 · T5 D1 3060′ 46 · T6 D1 3017′ 46 · T7 D1 3011′ 45 · T8 D1 3240′ 45 · T9 D1 3150′ 43 |
| Kaio Esteves Rocha | MEI | 22→31 | 47 | 47→47 (pico 47) | 1 | 349 | 31040 | 2 | 0 | 3 | T1 D1 2812′ 47 · T2 D1 3137′ 47🏆 · T3 D1 3150′ 47 · T4 D1 3177′ 47🏆 · T5 D1 3240′ 47 · T6 D1 2956′ 47 · T7 D1 3038′ 47 · T8 D1 3240′ 47 · T9 D1 3050′ 47 · T10 D1 3240′ 47 |
| Everton Toledo Oliveira | MEI | 28→36 | 41 | 41→35 (pico 41) | 1 | 5 | 299 | 2 | 0 | 0 | T1 D1 271′ 41 · T2 D1 0′ 40🏆 · T3 D1 28′ 39 · T4 D1 0′ 39🏆 · T5 D1 0′ 38 · T6 D1 0′ 37 · T7 D1 0′ 36 · T8 D1 0′ 36 · T9 D1 0′ 35 |
| Nícolas Uchoa | MEI | 18→27 | 44 | 44→46 (pico 46) | 1 | 343 | 30415 | 2 | 0 | 14 | T1 D1 3240′ 45 · T2 D1 3006′ 45🏆 · T3 D1 3043′ 46 · T4 D1 3017′ 46🏆 · T5 D1 3150′ 46 · T6 D1 3058′ 46 · T7 D1 3026′ 46 · T8 D1 3019′ 46 · T9 D1 2659′ 46 · T10 D1 3197′ 46 |
| Henrique Freitas Lacerda | MEI | 31→36 | 43 | 43→39 (pico 43) | 1 | 59 | 4678 | 2 | 0 | 0 | T1 D1 1422′ 43 · T2 D1 1214′ 43🏆 · T3 D1 750′ 42 · T4 D1 834′ 41🏆 · T5 D1 450′ 40 · T6 D1 8′ 39 |
| Elias Gomes | MEI | 22→31 | 47 | 47→47 (pico 47) | 1 | 319 | 27949 | 2 | 0 | 12 | T1 D1 2388′ 47 · T2 D1 2815′ 47🏆 · T3 D1 3033′ 47 · T4 D1 2987′ 47🏆 · T5 D1 2408′ 47 · T6 D1 3150′ 47 · T7 D1 2921′ 47 · T8 D1 2863′ 47 · T9 D1 2835′ 47 · T10 D1 2549′ 47 |
| Leandro Valadares | MEI | 17→26 | 41 | 41→42 (pico 42) | 1 | 78 | 6619 | 2 | 0 | 0 | T1 D1 0′ 41 · T2 D1 0′ 41🏆 · T3 D1 180′ 41 · T4 D1 90′ 41🏆 · T5 D1 978′ 41 · T6 D1 961′ 41 · T7 D1 1105′ 42 · T8 D1 984′ 42 · T9 D1 1347′ 42 · T10 D1 974′ 42 |
| Leandro Nogueira | MEI | 23→32 | 41 | 41→34 (pico 41) | 1 | 0 | 0 | 2 | 0 | 0 | T1 D1 0′ 41 · T2 D1 0′ 40🏆 · T3 D1 0′ 39 · T4 D1 0′ 38🏆 · T5 D1 0′ 38 · T6 D1 0′ 37 · T7 D1 0′ 36 · T8 D1 0′ 35 · T9 D1 0′ 35 · T10 D1 0′ 34 |
| Paulo Jardim | ATA | 24→33 | 40 | 40→38 (pico 40) | 1 | 219 | 19647 | 2 | 0 | 2 | T1 D1 630′ 40 · T2 D1 540′ 40🏆 · T3 D1 810′ 40 · T4 D1 900′ 40🏆 · T5 D1 436′ 40 · T6 D1 3330′ 39 · T7 D1 3330′ 39 · T8 D1 3197′ 39 · T9 D1 3330′ 38 · T10 D1 3144′ 38 |
| Renan Queiroz | ATA | 24→33 | 47 | 47→46 (pico 47) | 1 | 358 | 31877 | 2 | 0 | 2 | T1 D1 3031′ 47 · T2 D1 3330′ 47🏆 · T3 D1 3172′ 47 · T4 D1 3041′ 47🏆 · T5 D1 3330′ 47 · T6 D1 3211′ 47 · T7 D1 3006′ 47 · T8 D1 3240′ 47 · T9 D1 3186′ 47 · T10 D1 3330′ 46 |
| Luan Farias | ATA | 22→31 | 46 | 46→46 (pico 46) | 1 | 361 | 32263 | 2 | 0 | 10 | T1 D1 3305′ 46 · T2 D1 3420′ 46🏆 · T3 D1 3032′ 46 · T4 D1 2957′ 46🏆 · T5 D1 3330′ 46 · T6 D1 2811′ 46 · T7 D1 3420′ 46 · T8 D1 3330′ 46 · T9 D1 3420′ 46 · T10 D1 3238′ 46 |
| Ulisses Siqueira Queiroz | ATA | 32→36 | 47 | 47→43 (pico 47) | 1 | 173 | 15336 | 2 | 0 | 5 | T1 D1 3116′ 47 · T2 D1 2967′ 47🏆 · T3 D1 3020′ 46 · T4 D1 3240′ 45🏆 · T5 D1 2993′ 43 |
| Diego Teixeira | DEF | 23→32 | 40 | 40→40 (pico 40) | 1 | 351 | 31096 | 0 | 0 | 10 | T1 D1 2794′ 40 · T2 D1 2896′ 40 · T3 D1 3240′ 40 · T4 D1 2964′ 40 · T5 D2 3420′ 40 · T6 D1 3188′ 40 · T7 D1 3330′ 40 · T8 D1 3240′ 40 · T9 D1 2909′ 40 · T10 D1 3115′ 40 |
| Fábio Coutinho Zanetti | ATA | 33→36 | 40 | 40→37 (pico 40) | 1 | 7 | 457 | 0 | 0 | 0 | T1 D1 180′ 40 · T2 D1 180′ 39 · T3 D1 97′ 38 · T4 D1 0′ 37 |
| Mateus Guedes | ATA | 31→36 | 41 | 41→38 (pico 41) | 1 | 129 | 11227 | 0 | 0 | 0 | T1 D1 3240′ 41 · T2 D1 3240′ 41 · T3 D1 3420′ 40 · T4 D1 721′ 39 · T5 D2 281′ 38 · T6 D1 325′ 38 |
| Yuri Toledo | GOL | 21→30 | 41 | 41→42 (pico 42) | 1 | 371 | 33222 | 0 | 0 | 8 | T1 D1 3085′ 41 · T2 D1 3213′ 41 · T3 D1 3190′ 42 · T4 D1 3330′ 42 · T5 D1 3420′ 42 · T6 D1 3420′ 42 · T7 D1 3420′ 42 · T8 D1 3420′ 42 · T9 D1 3420′ 42 · T10 D1 3304′ 42 |
| Caio Bragança | DEF | 34→36 | 43 | 43→40 (pico 43) | 1 | 98 | 8537 | 0 | 0 | 4 | T1 D1 2816′ 43 · T2 D1 2638′ 42 · T3 D1 3083′ 40 |
| Cauã Rezende | DEF | 30→36 | 42 | 42→38 (pico 42) | 1 | 243 | 21385 | 0 | 0 | 9 | T1 D1 3330′ 42 · T2 D1 3063′ 42 · T3 D1 3065′ 42 · T4 D1 2968′ 41 · T5 D1 3049′ 40 · T6 D1 3330′ 39 · T7 D1 2580′ 38 |
| Luan Siqueira | MEI | 34→36 | 43 | 43→41 (pico 43) | 1 | 108 | 9593 | 0 | 0 | 0 | T1 D1 3080′ 43 · T2 D1 3183′ 42 · T3 D1 3330′ 41 |
| Wallace Queiroz | GOL | 25→34 | 48 | 48→48 (pico 48) | 1 | 377 | 33866 | 2 | 0 | 2 | T1 D1 3420′ 48🏆 · T2 D1 3420′ 48 · T3 D1 3211′ 48 · T4 D2 3420′ 48 · T5 D1 3295′ 48 · T6 D1 3420′ 48 · T7 D1 3420′ 48🏆 · T8 D1 3420′ 48 · T9 D1 3420′ 48 · T10 D1 3420′ 48 |
| Renan Oliveira | GOL | 31→36 | 45 | 45→41 (pico 45) | 1 | 3 | 209 | 1 | 0 | 0 | T1 D1 0′ 45🏆 · T2 D1 0′ 44 · T3 D1 209′ 43 · T4 D2 0′ 42 · T5 D1 0′ 42 · T6 D1 0′ 41 |
| Bruno Jardim | DEF | 22→31 | 40 | 40→40 (pico 40) | 1 | 262 | 22988 | 2 | 0 | 8 | T1 D1 270′ 40🏆 · T2 D1 1482′ 40 · T3 D1 181′ 40 · T4 D2 3036′ 40 · T5 D1 3088′ 40 · T6 D1 3148′ 40 · T7 D1 3240′ 40🏆 · T8 D1 2957′ 40 · T9 D1 2479′ 40 · T10 D1 3107′ 40 |
| Caio Toledo | DEF | 20→29 | 42 | 42→44 (pico 44) | 2 | 345 | 30530 | 1 | 1 | 0 | T1 D1 3022′ 43🏆 · T2 D1 3197′ 44 · T3 D1 2928′ 44 · T4 D1 3128′ 44 · T5 D1 3103′ 44 · T6 D1 3150′ 44 · T7 D1 3087′ 44 · T8 D1 2864′ 44 · T9 D1 2930′ 44 · T10 D1 3121′ 44 |
| Caio Siqueira | DEF | 26→35 | 44 | 44→41 (pico 44) | 3 | 340 | 30207 | 1 | 2 | 9 | T1 D1 2871′ 44🏆 · T2 D1 2601′ 44 · T3 D1 3206′ 44 · T4 D1 3143′ 44 · T5 D1 3222′ 44 · T6 D1 3012′ 44 · T7 D1 2921′ 44 · T8 D1 3150′ 44 · T9 D1 2841′ 42 · T10 D1 3240′ 41 |
| Ulisses Almeida | DEF | 29→36 | 44 | 44→40 (pico 44) | 1 | 252 | 21965 | 2 | 0 | 6 | T1 D1 2649′ 44🏆 · T2 D1 2483′ 44 · T3 D1 2866′ 44 · T4 D2 3062′ 44 · T5 D1 2630′ 43 · T6 D1 2868′ 43 · T7 D1 2849′ 42🏆 · T8 D1 2558′ 40 |
| Diego Almeida | DEF | 35→36 | 41 | 41→39 (pico 41) | 1 | 26 | 2145 | 1 | 0 | 0 | T1 D1 1434′ 40🏆 · T2 D1 711′ 39 |
| Diego Honório | DEF | 21→30 | 44 | 44→45 (pico 45) | 1 | 341 | 30259 | 2 | 0 | 8 | T1 D1 3240′ 44🏆 · T2 D1 2924′ 44 · T3 D1 2910′ 45 · T4 D2 3240′ 45 · T5 D1 2557′ 45 · T6 D1 3150′ 45 · T7 D1 3041′ 45🏆 · T8 D1 3150′ 45 · T9 D1 3033′ 45 · T10 D1 3014′ 45 |
| Elias Macedo | MEI | 18→27 | 43 | 43→45 (pico 45) | 3 | 361 | 32081 | 2 | 2 | 4 | T1 D1 3330′ 44🏆 · T2 D1 3420′ 44 · T3 D1 3420′ 45 · T4 D1 3240′ 45 · T5 D1 3029′ 45 · T6 D1 3224′ 45 · T7 D2 3034′ 45🏆 · T8 D1 3065′ 45 · T9 D1 3330′ 45 · T10 D1 2989′ 45 |
| Bruno Almeida | MEI | 34→36 | 41 | 41→39 (pico 41) | 1 | 2 | 142 | 1 | 0 | 0 | T1 D1 0′ 41🏆 · T2 D1 0′ 40 · T3 D1 142′ 39 |
| Gabriel Prates | MEI | 21→30 | 40 | 40→40 (pico 40) | 1 | 241 | 21172 | 2 | 0 | 2 | T1 D1 0′ 40🏆 · T2 D1 0′ 40 · T3 D1 450′ 40 · T4 D2 3135′ 40 · T5 D1 2925′ 40 · T6 D1 2692′ 40 · T7 D1 2752′ 40🏆 · T8 D1 3240′ 40 · T9 D1 3178′ 40 · T10 D1 2800′ 40 |
| Heitor Toledo | MEI | 35→36 | 40 | 40→39 (pico 40) | 1 | 0 | 0 | 1 | 0 | 0 | T1 D1 0′ 40🏆 · T2 D1 0′ 39 |
| Yuri Freitas Lacerda | MEI | 32→36 | 42 | 42→38 (pico 42) | 1 | 174 | 15450 | 1 | 0 | 4 | T1 D1 3330′ 42🏆 · T2 D1 2975′ 42 · T3 D1 3150′ 40 · T4 D2 3086′ 40 · T5 D1 2909′ 38 |
| Caio Ientes | MEI | 24→33 | 42 | 42→42 (pico 42) | 1 | 298 | 26577 | 2 | 0 | 3 | T1 D1 270′ 42🏆 · T2 D1 1201′ 42 · T3 D1 3098′ 42 · T4 D2 3330′ 42 · T5 D1 3136′ 42 · T6 D1 3150′ 42 · T7 D1 3097′ 42🏆 · T8 D1 3051′ 42 · T9 D1 3004′ 42 · T10 D1 3240′ 42 |
| Gustavo Queiroz | MEI | 35→36 | 44 | 44→42 (pico 44) | 1 | 68 | 5914 | 1 | 0 | 2 | T1 D1 3330′ 44🏆 · T2 D1 2584′ 42 |
| Adriano Oliveira | ATA | 25→34 | 42 | 42→38 (pico 42) | 1 | 269 | 23729 | 2 | 0 | 6 | T1 D1 360′ 42🏆 · T2 D1 631′ 41 · T3 D1 783′ 41 · T4 D2 3040′ 41 · T5 D1 3032′ 41 · T6 D1 3121′ 41 · T7 D1 3150′ 41🏆 · T8 D1 3178′ 40 · T9 D1 3236′ 39 · T10 D1 3198′ 38 |
| Caio Toledo Freitas | ATA | 21→30 | 48 | 48→48 (pico 48) | 2 | 361 | 32394 | 1 | 1 | 8 | T1 D1 3203′ 48🏆 · T2 D1 3330′ 48 · T3 D1 3135′ 48 · T4 D1 2746′ 48 · T5 D2 3330′ 48 · T6 D1 3330′ 48 · T7 D1 3330′ 48 · T8 D1 3330′ 48 · T9 D1 3330′ 48 · T10 D1 3330′ 48 |
| Heitor Nogueira | ATA | 31→36 | 46 | 46→43 (pico 46) | 2 | 220 | 19767 | 1 | 1 | 2 | T1 D1 3240′ 46🏆 · T2 D1 3420′ 46 · T3 D1 3240′ 45 · T4 D1 3230′ 45 · T5 D1 3217′ 44 · T6 D1 3420′ 43 |
| Otávio Gomes | ATA | 30→36 | 42 | 42→36 (pico 42) | 1 | 144 | 12762 | 2 | 0 | 2 | T1 D1 0′ 42🏆 · T2 D1 0′ 41 · T3 D1 90′ 40 · T4 D2 3330′ 40 · T5 D1 3076′ 39 · T6 D1 3219′ 37 · T7 D1 3047′ 36🏆 |
| João Macedo | ATA | 29→36 | 44 | 44→41 (pico 44) | 1 | 282 | 25266 | 2 | 0 | 13 | T1 D1 3420′ 44🏆 · T2 D1 2880′ 44 · T3 D1 3012′ 44 · T4 D2 2924′ 44 · T5 D1 3240′ 44 · T6 D1 3220′ 43 · T7 D1 3240′ 42🏆 · T8 D1 3330′ 41 |
| Samuel Ientes | GOL | 18→27 | 42 | 42→39 (pico 42) | 2 | 8 | 544 | 0 | 1 | 0 | T1 D1 0′ 42 · T2 D1 0′ 42 · T3 D1 0′ 42 · T4 D1 132′ 42 · T5 D2 0′ 42 · T6 D2 93′ 42 · T7 D1 229′ 41 · T8 D2 90′ 40 · T9 D1 0′ 40 · T10 D1 0′ 39 |
| Marcos Freitas Farias | GOL | 18→27 | 44 | 44→44 (pico 44) | 1 | 377 | 33815 | 1 | 0 | 2 | T1 D1 3420′ 44 · T2 D1 3420′ 44 · T3 D1 3420′ 44 · T4 D1 3288′ 44 · T5 D2 3420′ 44 · T6 D3 3330′ 44🏆 · T7 D2 3257′ 44 · T8 D2 3420′ 44 · T9 D2 3420′ 44 · T10 D2 3420′ 44 |
| Otávio Queiroz Lopes | DEF | 22→31 | 40 | 40→42 (pico 42) | 3 | 333 | 29510 | 0 | 2 | 3 | T1 D1 2964′ 40 · T2 D1 3117′ 41 · T3 D1 2910′ 42 · T4 D1 2701′ 42 · T5 D2 3060′ 42 · T6 D2 2818′ 42 · T7 D1 2912′ 42 · T8 D2 2973′ 42 · T9 D1 3039′ 42 · T10 D1 3016′ 42 |
| Leandro Pacheco | DEF | 18→27 | 41 | 41→43 (pico 43) | 3 | 363 | 32404 | 0 | 2 | 7 | T1 D1 3214′ 41 · T2 D1 3094′ 42 · T3 D1 3330′ 43 · T4 D1 3420′ 43 · T5 D1 3420′ 43 · T6 D1 3330′ 43 · T7 D1 3330′ 43 · T8 D1 3316′ 43 · T9 D1 2755′ 43 · T10 D1 3195′ 43 |
| Wesley Nogueira Lopes | ATA | 28→36 | 41 | 41→35 (pico 41) | 1 | 260 | 23183 | 1 | 0 | 7 | T1 D1 3330′ 41 · T2 D1 143′ 41 · T3 D1 325′ 40 · T4 D1 3420′ 40 · T5 D2 3176′ 39 · T6 D3 3330′ 39🏆 · T7 D2 3330′ 38 · T8 D2 3330′ 37 · T9 D2 2799′ 35 |
| André Uchoa | DEF | 25→34 | 40 | 40→40 (pico 40) | 1 | 348 | 30966 | 3 | 0 | 2 | T1 D1 3018′ 40 · T2 D1 3021′ 40 · T3 D1 3137′ 40 · T4 D1 3222′ 40 · T5 D2 3112′ 40🏆 · T6 D1 2879′ 40 · T7 D1 3132′ 40 · T8 D1 3134′ 40🏆 · T9 D1 3330′ 40🏆 · T10 D1 2981′ 40 |
| Cauã Guedes | DEF | 29→36 | 41 | 41→38 (pico 41) | 1 | 274 | 24305 | 2 | 0 | 4 | T1 D1 2967′ 41 · T2 D1 3185′ 41 · T3 D1 3097′ 41 · T4 D1 3000′ 41 · T5 D2 2779′ 41🏆 · T6 D1 3150′ 40 · T7 D1 3040′ 39 · T8 D1 3087′ 38🏆 |
| Rafael Pacheco | DEF | 24→33 | 40 | 40→40 (pico 40) | 1 | 348 | 30948 | 3 | 0 | 3 | T1 D1 3105′ 40 · T2 D1 3092′ 40 · T3 D1 3124′ 40 · T4 D1 2928′ 40 · T5 D2 3240′ 40🏆 · T6 D1 3240′ 40 · T7 D1 3102′ 40 · T8 D1 3041′ 40🏆 · T9 D1 3043′ 40🏆 · T10 D1 3033′ 40 |
| Renan Gomes | MEI | 28→36 | 40 | 40→36 (pico 40) | 1 | 265 | 23401 | 3 | 0 | 7 | T1 D1 3036′ 40 · T2 D1 3240′ 40 · T3 D1 3109′ 40 · T4 D1 3098′ 40 · T5 D2 3015′ 40🏆 · T6 D1 2705′ 39 · T7 D1 3112′ 39 · T8 D1 1096′ 37🏆 · T9 D1 990′ 36🏆 |
| Marcos Bragança | MEI | 27→36 | 41 | 41→39 (pico 41) | 1 | 361 | 32445 | 3 | 0 | 8 | T1 D1 2784′ 41 · T2 D1 3319′ 41 · T3 D1 3330′ 41 · T4 D1 3420′ 41 · T5 D2 3330′ 41🏆 · T6 D1 3330′ 41 · T7 D1 3032′ 41 · T8 D1 3240′ 41🏆 · T9 D1 3330′ 40🏆 · T10 D1 3330′ 39 |
| Fábio Gomes | ATA | 33→36 | 42 | 42→38 (pico 42) | 1 | 129 | 11276 | 0 | 0 | 16 | T1 D1 3214′ 42 · T2 D1 3240′ 41 · T3 D1 2149′ 40 · T4 D1 2673′ 38 |
| Leandro Esteves Ientes | GOL | 27→36 | 41 | 41→41 (pico 41) | 2 | 378 | 34011 | 1 | 1 | 0 | T1 D2 3420′ 41🏆 · T2 D1 3321′ 41 · T3 D1 3420′ 41 · T4 D1 3420′ 41 · T5 D1 3420′ 41 · T6 D1 3420′ 41 · T7 D1 3420′ 41 · T8 D1 3420′ 41 · T9 D1 3330′ 41 · T10 D1 3420′ 41 |
| Wesley Guedes | DEF | 18→27 | 41 | 41→42 (pico 42) | 2 | 334 | 29230 | 1 | 1 | 6 | T1 D2 2995′ 41🏆 · T2 D1 2803′ 42 · T3 D2 2901′ 42 · T4 D2 2784′ 42 · T5 D2 3144′ 42 · T6 D2 3240′ 42 · T7 D2 2688′ 42 · T8 D2 3130′ 42 · T9 D2 2981′ 42 · T10 D2 2564′ 42 |
| Mateus Cardoso | DEF | 27→36 | 43 | 43→40 (pico 43) | 2 | 321 | 28314 | 2 | 1 | 8 | T1 D2 2801′ 43🏆 · T2 D1 2854′ 43 · T3 D1 1350′ 43 · T4 D2 2939′ 43 · T5 D1 3240′ 43 · T6 D1 3108′ 43 · T7 D1 3150′ 43🏆 · T8 D1 2752′ 42 · T9 D1 2942′ 41 · T10 D1 3178′ 40 |
| Ulisses Xavier | DEF | 23→32 | 44 | 44→44 (pico 44) | 3 | 357 | 31785 | 1 | 2 | 1 | T1 D2 3237′ 44🏆 · T2 D1 3330′ 44 · T3 D1 3200′ 44 · T4 D2 3105′ 44 · T5 D1 3240′ 44 · T6 D1 3330′ 44 · T7 D1 2997′ 44 · T8 D1 3240′ 44 · T9 D1 2866′ 44 · T10 D2 3240′ 44 |
| Henrique Nogueira Prates | MEI | 20→29 | 40 | 40→41 (pico 41) | 1 | 351 | 31380 | 1 | 0 | 3 | T1 D2 3330′ 40🏆 · T2 D1 3240′ 41 · T3 D2 3330′ 41 · T4 D2 3240′ 41 · T5 D2 2800′ 41 · T6 D2 3049′ 41 · T7 D2 3187′ 41 · T8 D3 2911′ 41 · T9 D2 3150′ 41 · T10 D3 3143′ 41 |
| Yuri Duarte Farias | MEI | 24→33 | 41 | 41→41 (pico 41) | 1 | 350 | 31293 | 1 | 0 | 19 | T1 D2 3137′ 41🏆 · T2 D1 3420′ 41 · T3 D2 2890′ 41 · T4 D2 3420′ 41 · T5 D2 3240′ 41 · T6 D2 3144′ 41 · T7 D2 3240′ 41 · T8 D3 3129′ 41 · T9 D2 2343′ 41 · T10 D3 3330′ 41 |
| João Freitas | GOL | 22→31 | 44 | 44→40 (pico 44) | 2 | 153 | 13487 | 2 | 1 | 2 | T1 D2 3420′ 44 · T2 D2 3420′ 44 · T3 D2 3271′ 44🏆 · T4 D1 3246′ 44 · T5 D1 125′ 44 · T6 D1 0′ 43 · T7 D1 0′ 43🏆 · T8 D1 0′ 42 · T9 D1 0′ 41 · T10 D1 5′ 40 |
| Adriano Jardim Lopes | DEF | 18→27 | 40 | 40→41 (pico 41) | 1 | 342 | 30279 | 1 | 0 | 8 | T1 D2 3208′ 40 · T2 D2 2929′ 40 · T3 D2 3240′ 40🏆 · T4 D1 3240′ 41 · T5 D2 3240′ 41 · T6 D1 2961′ 41 · T7 D2 2489′ 41 · T8 D1 3124′ 41 · T9 D1 3105′ 41 · T10 D1 2743′ 41 |
| Davi Uchoa Moraes | MEI | 33→36 | 41 | 41→37 (pico 41) | 2 | 138 | 12346 | 0 | 1 | 8 | T1 D2 2781′ 41 · T2 D1 3330′ 40 · T3 D1 3240′ 38 · T4 D2 2995′ 37 |
| Felipe Zanetti | ATA | 20→29 | 41 | 41→41 (pico 41) | 1 | 316 | 28184 | 1 | 0 | 11 | T1 D2 90′ 41 · T2 D2 3179′ 41 · T3 D2 3055′ 41🏆 · T4 D1 2934′ 41 · T5 D2 3302′ 41 · T6 D1 2970′ 41 · T7 D2 2930′ 41 · T8 D1 3217′ 41 · T9 D1 3177′ 41 · T10 D1 3330′ 41 |
| Elias Honório | ATA | 22→31 | 41 | 41→37 (pico 41) | 1 | 57 | 4476 | 1 | 0 | 3 | T1 D2 0′ 41 · T2 D2 276′ 41 · T3 D2 579′ 41🏆 · T4 D1 486′ 40 · T5 D2 208′ 40 · T6 D1 847′ 39 · T7 D2 540′ 39 · T8 D1 195′ 38 · T9 D1 544′ 38 · T10 D1 801′ 37 |
| Adriano Teixeira | ATA | 33→36 | 42 | 42→39 (pico 42) | 1 | 38 | 3391 | 1 | 0 | 0 | T1 D2 3330′ 41 · T2 D2 61′ 41 · T3 D2 0′ 40🏆 · T4 D1 0′ 39 |
| Henrique Farias | MEI | 30→36 | 43 | 43→39 (pico 43) | 1 | 256 | 22821 | 0 | 0 | 3 | T1 D2 3330′ 43 · T2 D1 3202′ 43 · T3 D1 3330′ 43 · T4 D1 3077′ 42 · T5 D1 3275′ 42 · T6 D1 3330′ 41 · T7 D1 3277′ 39 |
| Renan Valadares Xavier | MEI | 20→29 | 40 | 40→42 (pico 42) | 1 | 335 | 29563 | 0 | 0 | 3 | T1 D2 2632′ 40 · T2 D1 3150′ 41 · T3 D1 2934′ 42 · T4 D1 3060′ 42 · T5 D1 2814′ 42 · T6 D1 2939′ 42 · T7 D1 3105′ 42 · T8 D1 2662′ 42 · T9 D1 3145′ 42 · T10 D1 3122′ 42 |
| Bruno Zanetti | MEI | 32→36 | 40 | 40→35 (pico 40) | 1 | 171 | 15050 | 0 | 0 | 8 | T1 D2 3114′ 40 · T2 D1 2626′ 39 · T3 D1 2973′ 38 · T4 D1 3007′ 37 · T5 D1 3330′ 35 |
| Henrique Zanetti | MEI | 32→36 | 43 | 43→39 (pico 43) | 1 | 177 | 15898 | 0 | 0 | 7 | T1 D2 3420′ 43 · T2 D1 2772′ 42 · T3 D1 3330′ 42 · T4 D1 3330′ 40 · T5 D1 3046′ 39 |
| Luan Zanetti Toledo | ATA | 26→35 | 44 | 44→42 (pico 44) | 1 | 347 | 30779 | 0 | 0 | 6 | T1 D2 2993′ 44 · T2 D1 2974′ 44 · T3 D1 2826′ 44 · T4 D1 3123′ 44 · T5 D1 3060′ 44 · T6 D1 3150′ 44 · T7 D1 2920′ 44 · T8 D1 3330′ 44 · T9 D1 3073′ 43 · T10 D1 3330′ 42 |
| Otávio Lopes | DEF | 30→36 | 40 | 40→35 (pico 40) | 1 | 224 | 19508 | 0 | 0 | 4 | T1 D2 2774′ 40 · T2 D2 2460′ 40 · T3 D1 2629′ 40 · T4 D1 2929′ 39 · T5 D1 3014′ 38 · T6 D2 2723′ 37 · T7 D1 2979′ 35 |
| Bruno Gomes | DEF | 34→36 | 40 | 40→37 (pico 40) | 1 | 102 | 8916 | 0 | 0 | 1 | T1 D2 2873′ 40 · T2 D2 2993′ 39 · T3 D1 3050′ 37 |
| Breno Nogueira | DEF | 31→36 | 40 | 40→37 (pico 40) | 1 | 212 | 18824 | 1 | 0 | 4 | T1 D2 2919′ 40 · T2 D2 3240′ 40🏆 · T3 D1 3240′ 40 · T4 D1 3139′ 39 · T5 D1 3071′ 38 · T6 D1 3215′ 37 |
| Everton Barbosa | DEF | 21→30 | 40 | 40→41 (pico 41) | 1 | 346 | 30676 | 1 | 0 | 10 | T1 D2 2538′ 40 · T2 D2 3420′ 40🏆 · T3 D1 3150′ 41 · T4 D1 3150′ 41 · T5 D1 3150′ 41 · T6 D1 3119′ 41 · T7 D1 2896′ 41 · T8 D1 2689′ 41 · T9 D1 3234′ 41 · T10 D2 3330′ 41 |
| Fábio Duarte | DEF | 20→29 | 41 | 41→42 (pico 42) | 2 | 336 | 29540 | 1 | 1 | 2 | T1 D2 2828′ 41 · T2 D2 2840′ 41🏆 · T3 D1 3150′ 41 · T4 D1 3118′ 42 · T5 D1 2935′ 42 · T6 D1 3005′ 42 · T7 D1 2848′ 42 · T8 D1 2759′ 42 · T9 D1 2947′ 42 · T10 D1 3110′ 42 |
| Marcos Duarte | MEI | 33→36 | 41 | 41→38 (pico 41) | 1 | 136 | 12028 | 1 | 0 | 3 | T1 D2 2801′ 41 · T2 D2 2747′ 41🏆 · T3 D1 3240′ 40 · T4 D1 3240′ 38 |
| Adriano Xavier | ATA | 35→36 | 42 | 42→41 (pico 42) | 1 | 72 | 6446 | 1 | 0 | 3 | T1 D2 3116′ 41 · T2 D2 3330′ 41🏆 |
| André Oliveira | ATA | 34→36 | 43 | 43→41 (pico 43) | 2 | 109 | 9698 | 0 | 1 | 3 | T1 D2 3273′ 43 · T2 D1 3330′ 42 · T3 D1 3095′ 41 |
| Davi Nogueira Rezende | ATA | 19→28 | 41 | 41→41 (pico 41) | 1 | 340 | 30521 | 2 | 0 | 0 | T1 D2 270′ 41 · T2 D2 3330′ 41 · T3 D2 3420′ 41 · T4 D1 3420′ 41 · T5 D1 3420′ 41🏆 · T6 D1 3330′ 41 · T7 D1 3420′ 41 · T8 D1 3330′ 41 · T9 D1 3292′ 41 · T10 D1 3289′ 41🏆 |
| Kaio Guedes Prates | ATA | 18→27 | 42 | 42→42 (pico 42) | 2 | 356 | 31635 | 1 | 1 | 5 | T1 D2 3236′ 42 · T2 D1 3330′ 42 · T3 D1 3143′ 42🏆 · T4 D1 3204′ 42 · T5 D1 3079′ 42 · T6 D1 2962′ 42 · T7 D1 3173′ 42 · T8 D1 3198′ 42 · T9 D2 3183′ 42 · T10 D1 3127′ 42 |
| Gabriel Barbosa | DEF | 30→36 | 42 | 42→38 (pico 42) | 2 | 238 | 20984 | 0 | 1 | 6 | T1 D2 2732′ 42 · T2 D2 3240′ 42 · T3 D1 2949′ 42 · T4 D2 3150′ 41 · T5 D2 3330′ 40 · T6 D2 2942′ 39 · T7 D2 2641′ 38 |
| Bruno Valadares | DEF | 27→36 | 41 | 41→37 (pico 41) | 1 | 340 | 30086 | 1 | 0 | 14 | T1 D2 2730′ 41 · T2 D2 3330′ 41 · T3 D2 2862′ 41 · T4 D2 3150′ 41 · T5 D1 2907′ 41 · T6 D1 2890′ 41 · T7 D1 2929′ 40 · T8 D1 2834′ 39 · T9 D2 3124′ 39🏆 · T10 D1 3330′ 37 |
| Paulo Valadares | MEI | 18→27 | 42 | 42→43 (pico 43) | 2 | 354 | 31527 | 1 | 1 | 11 | T1 D2 3223′ 42 · T2 D2 2954′ 42 · T3 D1 2828′ 43 · T4 D1 3420′ 43 · T5 D1 3240′ 43 · T6 D1 3161′ 43🏆 · T7 D1 3131′ 43 · T8 D1 3330′ 43 · T9 D1 2910′ 43 · T10 D1 3330′ 43 |
| Wallace Freitas | ATA | 18→27 | 41 | 41→41 (pico 41) | 1 | 348 | 30843 | 1 | 0 | 5 | T1 D2 2943′ 41 · T2 D2 3240′ 41 · T3 D2 3140′ 41 · T4 D2 3116′ 41 · T5 D1 3240′ 41 · T6 D1 2899′ 41 · T7 D1 3150′ 41 · T8 D1 2968′ 41 · T9 D2 2997′ 41🏆 · T10 D1 3150′ 41 |
| Henrique Lopes | DEF | 21→30 | 42 | 42→42 (pico 42) | 1 | 304 | 26342 | 0 | 0 | 10 | T1 D2 2370′ 42 · T2 D1 2822′ 42 · T3 D1 2173′ 42 · T4 D1 2629′ 42 · T5 D1 2483′ 42 · T6 D1 2871′ 42 · T7 D2 2608′ 42 · T8 D2 2934′ 42 · T9 D2 2626′ 42 · T10 D2 2826′ 42 |
| Renan Barbosa Honório | MEI | 32→36 | 42 | 42→38 (pico 42) | 1 | 172 | 15221 | 0 | 0 | 1 | T1 D2 3199′ 42 · T2 D1 3133′ 42 · T3 D1 2923′ 41 · T4 D1 3150′ 40 · T5 D1 2816′ 38 |
| Leandro Coutinho Esteves | MEI | 19→28 | 43 | 43→43 (pico 43) | 2 | 317 | 27503 | 2 | 1 | 5 | T1 D2 2612′ 43 · T2 D1 2648′ 43 · T3 D1 2710′ 43 · T4 D1 2626′ 43 · T5 D1 2734′ 43 · T6 D1 2744′ 43 · T7 D2 2663′ 43 · T8 D1 3028′ 43🏆 · T9 D1 3169′ 43🏆 · T10 D1 2569′ 43 |
| Caio Queiroz Honório | DEF | 29→36 | 40 | 40→36 (pico 40) | 1 | 279 | 24879 | 0 | 0 | 0 | T1 D2 3147′ 40 · T2 D1 3013′ 40 · T3 D1 3330′ 40 · T4 D1 3240′ 40 · T5 D1 3150′ 40 · T6 D1 2871′ 39 · T7 D1 3029′ 37 · T8 D1 3099′ 36 |
| Davi Queiroz Honório | MEI | 34→36 | 40 | 40→38 (pico 40) | 1 | 108 | 9637 | 0 | 0 | 1 | T1 D2 3240′ 40 · T2 D1 3188′ 39 · T3 D1 3209′ 38 |

## 6. Diagnóstico final (Parte 11)

| # | Pergunta | Resposta | Evidência |
|---|---:|---:|---:|
| 1 | Existe caminho legítimo até 50? | **NÃO** | nenhum cenário sintético chega a 50; no mundo real ninguém passou de 46 por ganho (0 chegaram a 49 por ganho) |
| 2 | 50 está excessivamente fácil? | **NÃO** | é inalcançável por desenvolvimento |
| 3 | 50 está excessivamente difícil? | **SIM** | limite de ganho máximo 46 (20 anos) / 45 (21–24) no melhor clube da D1 |
| 4 | Existe bloqueio estrutural? | **SIM** | limite = contexto + margem, contexto = 50% clube + 50% divisão (D1 35,64 puxa para baixo); elenco inteiro de 50 dá limite 48 |
| 5 | A Seleção pode ser acelerador de elite sem quebrar o sistema? | **SIM** | a sonda dá no máximo +1 em 10 anos (sem explosão); para acelerar de fato precisa de uma entrada de contexto de elite — nada no engine |
| 6 | Força 1 aparece em excesso? | **NÃO** | cauda de jogadores com base 3–9 (nenhum com base ≥ 10), 25–36 anos, D3/D4; ver concentração registrada na 0.2 |
| 7 | Principal causa da força 1 | **INTERAÇÃO** | base ≤ 9 + inatividade (maior parte das quedas) + idade |
| 8 | Precisamos de piso? | **NÃO** | o mínimo absoluto 1 já é invariante; ninguém com base razoável chega a 1 |
| 9 | Precisamos alterar idade? | **NÃO** | veterano excelente se mantém até ~35; ruim cai ~1/ano |
| 10 | Precisamos alterar inatividade? | **NÃO** | limite conjunto −0,75/temporada; jovem ≤ 22 sem minutos não perde |
| 11 | Precisamos alterar performance? | **NÃO** | o rendimento existe e é descartado NO LIMITE; o problema é o limite |
| 12 | A arquitetura suporta Seleção sem modificar o Engine 0.2.0? | **SIM** | o engine joga qualquer Fixture; Seleção = camadas novas de jogo (docs/NATIONAL-TEAM.md) |

## 7. Problemas

- **50 inalcançável por desenvolvimento** (bloqueio do limite contextual com 50% da divisão).
- **Sem o bloqueio, 50 fica fácil demais** (sonda: 45 → 50 em 3 temporadas): só remover o peso da divisão não serve.
- **Títulos e seleção não têm canal** na fórmula; títulos só pesam via vitórias (+0,2 por jogo).
- **Rendimento de elite descartado** no limite (~3 pontos por temporada para o melhor perfil).
- **Cauda da força 1** em jogadores de base 3–9 sem minutos por anos (registrada, não corrigida).
- `deserializeCareer` não valida faixas de um save adulterado (não produz valor inválido; registrado).

## 8. Recomendações e decisão sugerida para DEV-PROTO-0.5

1. **Faixa de elite (46–50) separada do limite contextual atual:** acima de 45, o ganho exige excelência sustentada POR TEMPORADA (titular ≥ 70% dos minutos, rendimento alto) e é no máximo +1 por temporada; o peso da divisão continua valendo abaixo dela.
2. **Aceleradores de elite** (títulos, destaque individual, Seleção): reduzem quantas temporadas excelentes são necessárias, nunca dão força direta; a Seleção entra como evidência de partida com contexto de elite.
3. **Metas a medir** antes de aceitar: 45 → 50 em 4–6 temporadas excepcionais com títulos e Seleção; mais lento sem Seleção; nunca para médio, reserva ou D2–D4; ≤ 5 jogadores em 50 por década no mundo.
4. **Não mexer** em idade, inatividade, rendimento, piso ou strengthBase; reavaliar a cauda da força 1 depois.
5. Nada disso implementado nesta etapa.
