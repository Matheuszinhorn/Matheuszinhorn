# DEV-PROTO-0.3 — validação no mundo real (10 temporadas)

> **DEV-PROTO-0.3 continua NÃO integrada ao jogo.** Simulação apenas: Engine 0.2.0, saves, gameplay, calendário e universo fictício intocados; nenhuma força aplicada.

## 1. Metodologia

- Universo fictício, seed `elite-dev-world-10`, carreira gerenciada sem decisões manuais, 10 temporadas × 38 rodadas × 40 partidas = 15200 partidas reais do Engine 0.2.0, com a gestão da CPU, envelhecimento, aposentadoria aos 37, acesso/rebaixamento, transferências da CPU e lesões do jogo.
- **Controle** (nenhuma camada observando) × **observadores** 0.2, A, B e C sobre as mesmas partidas: hash dos placares **idêntico** (`af11672f38c73766…`). A força dos observadores não volta ao engine.
- **Limitação registrada:** sem efeito de volta (strengthCurrent → engine → novo rendimento → novo desenvolvimento). As variantes são comparadas com os MESMOS resultados de partida.
- Contexto 0.3 = 50% ambiente do elenco (média dos 16 mais fortes) + 50% nível da divisão (média dos ambientes dos clubes da divisão), recalculado a cada rodada; usado só na oportunidade e no limite do ganho.

## 2. Variantes

| Variante | inatividade | idade sem jogar | divisão no contexto |
|---|---:|---:|---:|
| 0.2 | −0,04/rodada após 6 sem jogar, sem limite | sim | não |
| 0.3-A | idem, no máximo −1 por temporada | sim | 50% |
| 0.3-B | idem, no máximo −0,5 por temporada | sim | 50% |
| 0.3-C | nenhuma perda direta | não (idade só pesa quando joga) | 50% |

## 3–5. Resultados, comparação com a 0.2 e distribuição

| Métrica (10 temporadas) | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| variação média, mesmo conjunto (início e fim) | -2,3 | -1,8 | -0,8 | 1,4 |
| maior ganho | +11 | +11 | +11 | +11 |
| maior queda | -22 | -17 | -12 | -8 |
| +5 ou mais | 165 | 167 | 185 | 259 |
| −5 ou mais | 962 | 935 | 819 | 104 |
| +10 ou mais | 1 | 2 | 2 | 2 |
| −10 ou mais | 436 | 338 | 157 | 0 |
| chegaram a 50 (sem começar em 50) | 2 | 0 | 0 | 0 |
| chegaram a 1 (sem começar em 1) | 146 | 110 | 57 | 2 |

Mesmo conjunto = os 1111 jogadores em clube no início e ao fim das 10 temporadas.

### Distribuição inicial

| Variante | n | média | mediana | P10 | P25 | P75 | P90 | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | =50 | =1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| todas | 1920 | 25,5 | 26 | 12 | 18 | 33 | 38 | 117 | 490 | 674 | 545 | 94 | 2 | 1 |

### Após 1 temporada

| Variante | n | média | mediana | P10 | P25 | P75 | P90 | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | =50 | =1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.2 | 1920 | 25,3 | 25 | 12 | 18 | 33 | 38 | 132 | 490 | 668 | 535 | 95 | 2 | 2 |
| A | 1920 | 25,3 | 25 | 12 | 18 | 33 | 38 | 134 | 488 | 670 | 538 | 90 | 2 | 2 |
| B | 1920 | 25,4 | 26 | 12 | 18 | 33 | 38 | 130 | 483 | 667 | 549 | 91 | 2 | 2 |
| C | 1920 | 25,6 | 26 | 13 | 19 | 33 | 38 | 118 | 477 | 673 | 558 | 94 | 2 | 1 |

### Após 3 temporadas

| Variante | n | média | mediana | P10 | P25 | P75 | P90 | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | =50 | =1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.2 | 1809 | 24,4 | 25 | 11 | 17 | 32 | 38 | 171 | 471 | 624 | 449 | 94 | 2 | 20 |
| A | 1809 | 24,7 | 25 | 11 | 18 | 32 | 38 | 163 | 458 | 633 | 471 | 84 | 2 | 19 |
| B | 1809 | 25,1 | 25 | 12 | 18 | 33 | 38 | 141 | 454 | 635 | 493 | 86 | 2 | 8 |
| C | 1809 | 26,0 | 26 | 13 | 19 | 33 | 38 | 108 | 429 | 637 | 536 | 99 | 2 | 1 |

### Após 5 temporadas

| Variante | n | média | mediana | P10 | P25 | P75 | P90 | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | =50 | =1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.2 | 1633 | 23,6 | 24 | 9 | 16 | 31 | 38 | 197 | 438 | 547 | 356 | 95 | 2 | 44 |
| A | 1633 | 24,0 | 24 | 10 | 17 | 32 | 38 | 170 | 441 | 560 | 380 | 82 | 1 | 32 |
| B | 1633 | 24,7 | 25 | 11 | 18 | 32 | 38 | 144 | 426 | 574 | 405 | 84 | 1 | 19 |
| C | 1633 | 26,0 | 26 | 13 | 19 | 33 | 39 | 99 | 388 | 587 | 458 | 101 | 1 | 1 |

### Após 10 temporadas

| Variante | n | média | mediana | P10 | P25 | P75 | P90 | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | =50 | =1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.2 | 1452 | 22,2 | 22 | 7 | 14 | 30 | 37 | 228 | 403 | 477 | 270 | 74 | 2 | 67 |
| A | 1452 | 22,6 | 22 | 9 | 15 | 30 | 37 | 195 | 416 | 494 | 288 | 59 | 0 | 49 |
| B | 1452 | 23,4 | 23 | 10 | 16 | 31 | 37 | 150 | 424 | 511 | 306 | 61 | 0 | 22 |
| C | 1452 | 25,1 | 25 | 13 | 18 | 32 | 38 | 96 | 388 | 522 | 367 | 79 | 0 | 2 |

## 6. Por idade (idade na temporada; variação média por temporada · % subiu / % caiu)

| Idade | linhas | 0.2 | A | B | C |
|---|---:|---:|---:|---:|---:|
| 18–20 | 1737 | 0,6 · 44,3% / 0,0% | 0,6 · 44,5% / 0,0% | 0,6 · 44,9% / 0,0% | 0,6 · 45,9% / 0,0% |
| 21–23 | 1972 | 0,4 · 38,7% / 5,8% | 0,4 · 37,5% / 4,1% | 0,5 · 39,0% / 0,0% | 0,5 · 42,7% / 0,0% |
| 24–27 | 3735 | -0,2 · 13,1% / 23,7% | -0,1 · 12,5% / 22,0% | 0,0 · 13,4% / 10,0% | 0,2 · 18,5% / 0,1% |
| 28–30 | 3046 | -0,4 · 0,6% / 30,5% | -0,3 · 0,8% / 29,8% | -0,2 · 0,7% / 17,4% | 0,0 · 1,0% / 0,3% |
| 31–33 | 3051 | -1,0 · 0,0% / 64,3% | -0,9 · 0,0% / 65,7% | -0,8 · 0,0% / 66,5% | -0,2 · 0,0% / 18,3% |
| 34–36 | 2942 | -1,8 · 0,0% / 90,7% | -1,7 · 0,0% / 92,0% | -1,6 · 0,0% / 93,5% | -0,5 · 0,0% / 38,9% |

## 7. Por utilização (minutos na temporada: titular frequente ≥ 70%, parcial 40–70%, reserva > 0 e < 40%)

| Uso | linhas | 0.2: média | A: média | B: média | C: média | 0.2: +1/−1 | A: +1/−1 | B: +1/−1 | C: +1/−1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| titular frequente | 8552 | 0,0 | 0,0 | 0,0 | 0,1 | 1725/1608 | 1706/1599 | 1765/1602 | 1984/1447 |
| titular parcial | 806 | -0,2 | -0,2 | -0,2 | 0,1 | 185/278 | 182/284 | 188/284 | 208/129 |
| reserva | 3765 | -0,8 | -0,8 | -0,6 | 0,0 | 131/1976 | 116/1936 | 118/1726 | 170/137 |
| zero minutos | 3360 | -1,6 | -1,3 | -0,9 | 0,0 | 0/2695 | 0/2701 | 0/2071 | 0/0 |

Uso × idade (variação média por temporada):

| Uso · variante | 18–20 | 21–23 | 24–27 | 28–30 | 31–33 | 34–36 |
|---|---:|---:|---:|---:|---:|---:|
| titular frequente · 0.2 | 1,1 | 0,7 | 0,2 | 0,0 | -0,4 | -1,1 |
| titular frequente · A | 1,1 | 0,6 | 0,2 | 0,0 | -0,4 | -1,2 |
| titular frequente · B | 1,1 | 0,7 | 0,2 | 0,0 | -0,4 | -1,2 |
| titular frequente · C | 1,2 | 0,7 | 0,3 | 0,0 | -0,4 | -1,0 |
| titular parcial · 0.2 | 0,9 | 0,7 | 0,2 | -0,1 | -0,5 | -1,4 |
| titular parcial · A | 0,9 | 0,6 | 0,1 | 0,0 | -0,6 | -1,4 |
| titular parcial · B | 0,9 | 0,7 | 0,2 | -0,1 | -0,6 | -1,4 |
| titular parcial · C | 0,9 | 0,7 | 0,3 | 0,0 | -0,1 | -0,6 |
| reserva · 0.2 | 0,1 | 0,1 | -0,4 | -0,6 | -1,3 | -1,9 |
| reserva · A | 0,1 | 0,1 | -0,4 | -0,6 | -1,2 | -2,0 |
| reserva · B | 0,1 | 0,1 | -0,2 | -0,3 | -1,0 | -1,8 |
| reserva · C | 0,1 | 0,2 | 0,1 | 0,0 | 0,0 | -0,1 |
| zero minutos · 0.2 | 0,0 | -0,3 | -1,3 | -1,5 | -2,0 | -2,6 |
| zero minutos · A | 0,0 | -0,2 | -1,0 | -1,0 | -1,6 | -2,3 |
| zero minutos · B | 0,0 | 0,0 | -0,4 | -0,5 | -1,2 | -1,9 |
| zero minutos · C | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |

Jogadores com 3+ temporadas sem nenhum minuto: 527.

| Temporadas sem jogar | jogadores | 0.2: variação total média (pior) | A: variação total média (pior) | B: variação total média (pior) | C: variação total média (pior) |
|---|---:|---:|---:|---:|---:|
| 3–4 | 233 | -8,3 (-19) | -7,1 (-16) | -5,2 (-12) | 0,3 (-5) |
| 5–7 | 182 | -12,3 (-21) | -10,3 (-17) | -7,3 (-12) | 0,1 (-2) |
| 8–10 | 112 | -14,4 (-22) | -11,3 (-17) | -7,5 (-12) | 0,0 (0) |

**Um jogador que não joga perde força, mas essa perda destrói a carreira?** Ver "zero minutos" acima e os alertas.

## 8–9. Divisões e transferências

Cada célula: força média antes → logo depois (1ª rodada) · evolução média após 1, 3 e 5 temporadas.

| Movimento | n | 0.2 | A | B | C |
|---|---:|---:|---:|---:|---:|
| transferência D4 → D3 | 6 | 24,0 → 24,0 · 1T 0,5 · 3T 2,0 · 5T 2,5 | 23,8 → 23,8 · 1T 0,3 · 3T 1,2 · 5T 1,8 | 24,0 → 24,0 · 1T 0,3 · 3T 1,2 · 5T 2,3 | 24,2 → 24,2 · 1T 0,2 · 3T 1,6 · 5T 2,0 |
| transferência D3 → D2 | 15 | 33,1 → 33,1 · 1T -0,1 · 3T -0,8 · 5T -2,1 | 33,0 → 33,0 · 1T -0,1 · 3T -0,6 · 5T -1,7 | 33,0 → 33,0 · 1T 0,0 · 3T -0,2 · 5T -0,8 | 33,2 → 33,2 · 1T 0,0 · 3T 0,1 · 5T 0,0 |
| transferência D2 → D1 | 16 | 40,8 → 40,8 · 1T 0,0 · 3T -0,6 · 5T -1,1 | 40,5 → 40,5 · 1T -0,1 · 3T -0,6 · 5T -1,2 | 40,5 → 40,5 · 1T 0,0 · 3T -0,4 · 5T -1,0 | 40,7 → 40,7 · 1T 0,0 · 3T 0,1 · 5T -0,3 |
| transferência D1 → D2 | 0 | nenhum caso no mundo | nenhum caso no mundo | nenhum caso no mundo | nenhum caso no mundo |
| transferência D1 → D4 | 0 | nenhum caso no mundo | nenhum caso no mundo | nenhum caso no mundo | nenhum caso no mundo |
| transferência na mesma divisão | 48 | 33,2 → 33,2 · 1T 0,0 · 3T -0,3 · 5T 0,0 | 33,2 → 33,2 · 1T -0,1 · 3T -0,4 · 5T -0,2 | 33,2 → 33,2 · 1T 0,0 · 3T -0,3 · 5T 0,0 | 33,4 → 33,4 · 1T 0,1 · 3T 0,2 · 5T 0,4 |
| promoção do clube D4 → D3 | 710 | 17,6 → 17,6 · 1T -0,6 · 3T -1,6 · 5T -2,3 | 17,9 → 17,9 · 1T -0,5 · 3T -1,4 · 5T -1,8 | 18,5 → 18,5 · 1T -0,4 · 3T -1,0 · 5T -1,3 | 19,4 → 19,4 · 1T 0,0 · 3T 0,2 · 5T 0,4 |
| promoção do clube D3 → D2 | 714 | 22,8 → 22,8 · 1T -0,7 · 3T -1,7 · 5T -2,5 | 23,1 → 23,1 · 1T -0,5 · 3T -1,3 · 5T -1,9 | 23,7 → 23,7 · 1T -0,4 · 3T -0,9 · 5T -1,3 | 24,7 → 24,7 · 1T 0,0 · 3T 0,2 · 5T 0,5 |
| promoção do clube D2 → D1 | 699 | 31,5 → 31,5 · 1T -0,6 · 3T -1,5 · 5T -2,2 | 31,8 → 31,8 · 1T -0,5 · 3T -1,2 · 5T -1,7 | 32,4 → 32,4 · 1T -0,4 · 3T -0,8 · 5T -1,1 | 33,5 → 33,5 · 1T 0,0 · 3T 0,2 · 5T 0,5 |
| rebaixamento do clube D1 → D2 | 707 | 30,7 → 30,7 · 1T -0,6 · 3T -1,5 · 5T -2,1 | 31,2 → 31,2 · 1T -0,5 · 3T -1,3 · 5T -1,7 | 31,8 → 31,8 · 1T -0,4 · 3T -0,9 · 5T -1,1 | 32,8 → 32,8 · 1T 0,0 · 3T 0,1 · 5T 0,2 |
| rebaixamento do clube D2 → D3 | 693 | 23,5 → 23,5 · 1T -0,6 · 3T -1,7 · 5T -2,4 | 24,0 → 24,0 · 1T -0,5 · 3T -1,5 · 5T -2,1 | 24,5 → 24,5 · 1T -0,4 · 3T -1,1 · 5T -1,5 | 25,5 → 25,5 · 1T 0,0 · 3T 0,0 · 5T 0,3 |
| rebaixamento do clube D3 → D4 | 693 | 17,5 → 17,5 · 1T -0,5 · 3T -1,5 · 5T -2,2 | 17,9 → 17,9 · 1T -0,5 · 3T -1,3 · 5T -2,0 | 18,4 → 18,4 · 1T -0,4 · 3T -1,0 · 5T -1,5 | 19,5 → 19,5 · 1T 0,0 · 3T 0,1 · 5T 0,2 |
| sem transferência nem mudança de divisão (por temporada) | 3682 | -0,6 | -0,5 | -0,4 | 0,0 |

Mudança de força na 1ª rodada após o movimento (fim de janela coincidente, nunca o movimento em si): 0.2 0/4311 · A 0/4311 · B 0/4311 · C 0/4311.

Efeito isolado da divisão — titulares frequentes na 1ª temporada após o clube mudar de divisão (variação média; entre parênteses, % que subiu):

| Grupo | linhas | 0.2 | A | B | C |
|---|---:|---:|---:|---:|---:|
| titulares após promoção | 1133 | -0,1 (17,0%) | 0,0 (22,0%) | 0,0 (23,5%) | 0,1 (25,4%) |
| titulares após rebaixamento | 1134 | 0,0 (18,3%) | -0,1 (12,4%) | -0,1 (13,0%) | 0,0 (16,0%) |
| titulares até 27 anos na D1 (todas as temporadas) | 1071 | 0,5 (37,7%) | 0,5 (39,7%) | 0,5 (41,0%) | 0,6 (45,1%) |
| titulares até 27 anos na D2 (todas as temporadas) | 1009 | 0,5 (40,1%) | 0,5 (38,3%) | 0,5 (40,2%) | 0,6 (44,6%) |
| titulares até 27 anos na D3 (todas as temporadas) | 1023 | 0,5 (42,5%) | 0,5 (40,6%) | 0,5 (41,6%) | 0,6 (48,0%) |
| titulares até 27 anos na D4 (todas as temporadas) | 1140 | 0,5 (40,5%) | 0,5 (39,8%) | 0,5 (41,4%) | 0,6 (46,9%) |
Na 1ª divisão sem nenhum minuto: 853 linhas; subidas: 0.2 0 · A 0 · B 0 · C 0 (divisão superior não dá força a quem não joga).

## 10. Lesões (por temporada)

| Situação | linhas | 0.2 | A | B | C |
|---|---:|---:|---:|---:|---:|
| sem lesão | 13301 | -0,6 | -0,5 | -0,4 | 0,0 |
| lesão curta | 3109 | 0,0 | 0,0 | 0,0 | 0,1 |
| lesão longa (8+ rodadas) | 73 | -0,1 | -0,2 | -0,1 | 0,0 |

## 11. Casos individuais (reais)

Força ao fim de cada temporada (antes do 1º valor: força inicial). Uso e divisão por temporada.

### 1. jovem fraco que vira titular em clube forte (D1)

Heitor Xavier — MEI, 18 anos na T1, força inicial 30.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | reserva | reserva | titular | titular | titular | titular | titular | titular | titular | titular |
| divisão · idade | D1 · 18 | D1 · 19 | D1 · 20 | D1 · 21 | D1 · 22 | D1 · 23 | D1 · 24 | D1 · 25 | D2 · 26 | D1 · 27 |
| lesão (rodadas) |  | 2 |  | 1 |  |  | 1 | 1 | 4 | 1 |
| 0.2 | 30 | 30 | 32 | 34 | 34 | 34 | 34 | 34 | 34 | 34 |
| A | 30 | 31 | 33 | 34 | 36 | 36 | 37 | 37 | 37 | 37 |
| B | 30 | 31 | 33 | 34 | 36 | 37 | 37 | 37 | 37 | 37 |
| C | 30 | 31 | 33 | 35 | 36 | 37 | 38 | 38 | 38 | 38 |

### 2. jovem fraco que permanece reserva

Everton Siqueira — MEI, 17 anos na T1, força inicial 23.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min | reserva | reserva | 0 min | 0 min |
| divisão · idade | D1 · 17 | D2 · 18 | D1 · 19 | D2 · 20 | D2 · 21 | D2 · 22 | D2 · 23 | D2 · 24 | D2 · 25 | D2 · 26 |
| lesão (rodadas) |  |  |  |  |  |  |  |  |  |  |
| 0.2 | 23 | 23 | 23 | 23 | 23 | 23 | 22 | 21 | 20 | 18 |
| A | 23 | 23 | 23 | 23 | 23 | 23 | 22 | 22 | 21 | 20 |
| B | 23 | 23 | 23 | 23 | 23 | 23 | 23 | 23 | 22 | 22 |
| C | 23 | 23 | 23 | 23 | 23 | 23 | 23 | 23 | 23 | 23 |

### 3. jogador forte em clube fraco (maior força inicial entre quem começa na D3/D4)

Mateus Uchoa Teixeira — GOL, 18 anos na T1, força inicial 37.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | titular | titular | titular | titular | titular | titular | titular | titular | titular | titular |
| divisão · idade | D3 · 18 | D2 · 19 | D2 · 20 | D2 · 21 | D2 · 22 | D2 · 23 | D2 · 24 | D1 · 25 | D1 · 26 | D2 · 27 |
| lesão (rodadas) | 1 | 7 |  |  |  |  |  |  |  |  |
| 0.2 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 |
| A | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 |
| B | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 |
| C | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 | 37 |

### 4. jogador forte que vai para clube forte (chega à D1 com 38+, até 30 anos)

Marcos Freitas Farias — GOL, 18 anos na T1, força inicial 44.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | titular | titular | titular | titular | titular | titular | titular | titular | titular | titular |
| divisão · idade | D1 · 18 | D1 · 19 | D1 · 20 | D1 · 21 | D2 · 22 | D2 · 23 | D1 · 24 | D1 · 25 | D1 · 26 | D1 · 27 |
| lesão (rodadas) |  |  |  | 1 |  |  | 1 |  |  | 1 |
| 0.2 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 |
| A | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 |
| B | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 |
| C | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 | 44 |

### 5. veterano titular

Everton Valadares — GOL, 32 anos na T1, força inicial 32; aposentou após a T5.

|  | T1 | T2 | T3 | T4 | T5 |
|---|---:|---:|---:|---:|---:|
| uso | titular | titular | titular | titular | titular |
| divisão · idade | D1 · 32 | D1 · 33 | D1 · 34 | D1 · 35 | D1 · 36 |
| lesão (rodadas) | 1 |  |  |  |  |
| 0.2 | 32 | 32 | 31 | 31 | 30 |
| A | 32 | 32 | 31 | 31 | 30 |
| B | 32 | 32 | 31 | 31 | 30 |
| C | 32 | 32 | 31 | 31 | 30 |

### 6. veterano reserva

Henrique Jardim — MEI, 32 anos na T1, força inicial 26; aposentou após a T5.

|  | T1 | T2 | T3 | T4 | T5 |
|---|---:|---:|---:|---:|---:|
| uso | 0 min | 0 min | 0 min | 0 min | 0 min |
| divisão · idade | D1 · 32 | D2 · 33 | D3 · 34 | D3 · 35 | D2 · 36 |
| lesão (rodadas) |  |  |  |  |  |
| 0.2 | 24 | 22 | 19 | 16 | 13 |
| A | 25 | 23 | 20 | 18 | 15 |
| B | 25 | 24 | 22 | 20 | 18 |
| C | 26 | 26 | 26 | 26 | 26 |

### 7. transferido de divisão inferior para superior

Paulo Valadares — MEI, 18 anos na T1, força inicial 42.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | titular | reserva | reserva | reserva | reserva | reserva | reserva | parcial | reserva | reserva |
| divisão · idade | D2 · 18 | D1 · 19 | D1 · 20 | D1 · 21 | D1 · 22 | D1 · 23 | D1 · 24 | D1 · 25 | D1 · 26 | D1 · 27 |
| lesão (rodadas) |  | 1 |  |  |  |  |  |  |  |  |
| 0.2 | 42 | 43 | 43 | 43 | 44 | 44 | 44 | 44 | 44 | 44 |
| A | 42 | 42 | 42 | 43 | 43 | 43 | 43 | 43 | 43 | 43 |
| B | 42 | 42 | 42 | 43 | 43 | 43 | 43 | 43 | 43 | 43 |
| C | 42 | 42 | 42 | 43 | 43 | 43 | 43 | 43 | 43 | 43 |

### 8. transferido de divisão superior para inferior

Davi Gomes Nogueira — DEF, 23 anos na T1, força inicial 38.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | titular | titular | titular | parcial | titular | titular | titular | parcial | titular | titular |
| divisão · idade | D1 · 23 | D2 · 24 | D2 · 25 | D2 · 26 | D2 · 27 | D2 · 28 | D2 · 29 | D2 · 30 | D2 · 31 | D2 · 32 |
| lesão (rodadas) |  |  |  | 10 |  |  | 1 | 2 |  |  |
| 0.2 | 38 | 38 | 38 | 38 | 38 | 38 | 37 | 37 | 37 | 36 |
| A | 38 | 38 | 38 | 38 | 38 | 38 | 37 | 37 | 37 | 36 |
| B | 38 | 38 | 38 | 38 | 38 | 38 | 37 | 37 | 37 | 36 |
| C | 38 | 38 | 38 | 38 | 38 | 38 | 37 | 37 | 37 | 37 |

### 9. várias temporadas sem jogar

Breno Bragança Almeida — GOL, 23 anos na T1, força inicial 35.

|  | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| uso | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min | 0 min |
| divisão · idade | D1 · 23 | D1 · 24 | D1 · 25 | D1 · 26 | D2 · 27 | D2 · 28 | D1 · 29 | D1 · 30 | D1 · 31 | D1 · 32 |
| lesão (rodadas) |  |  |  |  |  |  |  |  |  |  |
| 0.2 | 34 | 33 | 31 | 30 | 28 | 27 | 25 | 23 | 21 | 19 |
| A | 34 | 33 | 32 | 31 | 30 | 29 | 28 | 27 | 26 | 24 |
| B | 35 | 34 | 34 | 33 | 33 | 32 | 32 | 31 | 30 | 29 |
| C | 35 | 35 | 35 | 35 | 35 | 35 | 35 | 35 | 35 | 35 |

### 10. retorna após lesão longa

Davi Duarte — DEF, 18 anos na T7, força inicial 26.

|  | T7 | T8 | T9 | T10 |
|---|---:|---:|---:|---:|
| uso | reserva | reserva | titular | titular |
| divisão · idade | D1 · 18 | D1 · 19 | D2 · 20 | D2 · 21 |
| lesão (rodadas) |  |  |  | 8 |
| 0.2 | 26 | 26 | 28 | 30 |
| A | 26 | 26 | 28 | 29 |
| B | 26 | 26 | 28 | 29 |
| C | 26 | 26 | 28 | 30 |

## 12. Alertas (sinalizados, não corrigidos)

- **0.2** — muitos jogadores chegando a 1: 146.
- **0.2** — deflação generalizada: -2,3 no mesmo conjunto.
- **0.2** — veteranos (34+) caindo rápido: -1,8 por temporada.
- **0.2** — reserva sem minutos perdendo força rápido: -1,6 por temporada.
- **A** — muitos jogadores chegando a 1: 110.
- **A** — deflação generalizada: -1,8 no mesmo conjunto.
- **A** — veteranos (34+) caindo rápido: -1,7 por temporada.
- **A** — reserva sem minutos perdendo força rápido: -1,3 por temporada.
- **B** — muitos jogadores chegando a 1: 57.
- **B** — veteranos (34+) caindo rápido: -1,6 por temporada.
- **C** — inatividade sem nenhuma consequência: 3360 temporadas sem minutos e nenhuma queda (o "deve perder força" não é atendido).

Critérios: inatividade sem nenhuma queda em todas as temporadas sem minutos; chegar a 1 > 20 jogadores; chegar a 50 > 5; mesmo conjunto < −1,5 (deflação) ou > +2 (inflação); jovens ≤ 20 com média > +2 por temporada ou alguma temporada ≥ +5; 34+ com média < −1,5; zero minutos com média < −1; qualquer subida sem minutos; qualquer subida sem minutos na D1; forte (40+) titular na D3/D4 por 3+ temporadas caindo 5 ou mais.

## 13. Limitações

- Sem efeito de volta da força nas partidas (todos os mundos usam os mesmos placares).
- Transferências entre clubes são raras no mundo fictício (CPU); a mudança de divisão vem quase toda de acesso/rebaixamento.
- Uma seed só; aposentadoria aos 37 (do jogo) limita a análise de veteranos.
