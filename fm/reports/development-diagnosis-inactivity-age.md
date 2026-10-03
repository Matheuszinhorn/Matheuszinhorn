# Diagnóstico DEV-PROTO-0.3 — inatividade × idade

> **Este diagnóstico não altera a fórmula e não representa uma decisão de calibração.**
> DEV-PROTO-0.3 continua NÃO integrada e isolada. Nenhuma variante nova foi criada.

## Método

- Mesmo mundo das validações anteriores: seed `elite-dev-world-10`, 10 temporadas, 15200 partidas reais do Engine 0.2.0. Variantes analisadas: 0.3-A, 0.3-B, 0.3-C (sem nenhuma mudança).
- Controle sem observador × observado: hash dos placares **idêntico** (`af11672f38c73766…`).
- Decomposição exata por rodada: idade (desenvolvimento + envelhecimento) + rendimento + inatividade + ambiente = pontos da fórmula. Maior diferença encontrada entre a soma e roundPoints(): 1.0e-4.
- Unidade: pontos de desenvolvimento por temporada (1 ponto ≈ 1 de força). A variação real de strengthCurrent é inteira e acontece em janelas; a diferença para a soma dos pontos fica no "resíduo" (acúmulo entre temporadas, passos inteiros, limites 1–50).
- "Ambiente" = efeito do contexto (elenco + divisão) e do limite contextual sobre o ganho: quanto do desenvolvimento e do rendimento brutos o jogador NÃO recebeu (≤ 0). Ele nunca soma força sozinho.
- Contrafactuais "só idade" / "só inatividade": mesma mecânica de janela aplicada só ao componente, sobre os pontos medidos na trajetória real (aproximação: na trajetória real, a força e portanto a oportunidade seriam outras).

## Variante 0.3-A

### Componentes por faixa de idade e utilização (pontos por temporada; entre parênteses: variação real média de strengthCurrent)

| Uso · idade | linhas | desenv. (idade) | envelhec. (idade) | idade total | inatividade | rendimento | ambiente | total | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| titular frequente · 18–20 | 742 | 2,6 | 0,0 | 2,6 | 0,0 | 0,2 | -1,5 | 1,3 | 1,1 |
| titular frequente · 21–23 | 1173 | 2,2 | 0,0 | 2,2 | 0,0 | 0,2 | -1,6 | 0,8 | 0,6 |
| titular frequente · 24–27 | 2328 | 1,2 | 0,0 | 1,2 | 0,0 | 0,2 | -1,0 | 0,4 | 0,2 |
| titular frequente · 28–30 | 1736 | 0,1 | -0,1 | 0,0 | 0,0 | 0,2 | -0,2 | 0,1 | 0,0 |
| titular frequente · 31–33 | 1474 | 0,0 | -0,7 | -0,7 | 0,0 | 0,2 | 0,0 | -0,5 | -0,4 |
| titular frequente · 34–36 | 1099 | 0,0 | -1,3 | -1,3 | 0,0 | 0,2 | -0,1 | -1,2 | -1,2 |
| titular parcial · 18–20 | 116 | 1,6 | 0,0 | 1,6 | 0,0 | 0,1 | -0,5 | 1,1 | 0,9 |
| titular parcial · 21–23 | 95 | 1,3 | 0,0 | 1,3 | 0,0 | 0,1 | -0,6 | 0,8 | 0,6 |
| titular parcial · 24–27 | 149 | 0,7 | 0,0 | 0,7 | -0,1 | 0,1 | -0,4 | 0,3 | 0,1 |
| titular parcial · 28–30 | 107 | 0,1 | -0,1 | 0,0 | -0,1 | 0,1 | -0,1 | -0,1 | 0,0 |
| titular parcial · 31–33 | 150 | 0,0 | -0,7 | -0,7 | -0,1 | 0,1 | -0,1 | -0,7 | -0,6 |
| titular parcial · 34–36 | 189 | 0,0 | -1,4 | -1,4 | -0,1 | 0,1 | -0,1 | -1,5 | -1,4 |
| reserva · 18–20 | 554 | 0,4 | 0,0 | 0,4 | 0,0 | 0,0 | -0,1 | 0,3 | 0,1 |
| reserva · 21–23 | 421 | 0,4 | 0,0 | 0,4 | -0,2 | 0,0 | -0,1 | 0,1 | 0,1 |
| reserva · 24–27 | 667 | 0,2 | 0,0 | 0,2 | -0,6 | 0,0 | -0,1 | -0,5 | -0,4 |
| reserva · 28–30 | 631 | 0,0 | -0,1 | -0,1 | -0,6 | 0,0 | 0,0 | -0,7 | -0,6 |
| reserva · 31–33 | 718 | 0,0 | -0,8 | -0,8 | -0,6 | 0,0 | 0,0 | -1,3 | -1,2 |
| reserva · 34–36 | 774 | 0,0 | -1,5 | -1,5 | -0,6 | 0,0 | 0,0 | -2,1 | -2,0 |
| zero minutos · 18–20 | 325 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 21–23 | 283 | 0,0 | 0,0 | 0,0 | -0,3 | 0,0 | 0,0 | -0,3 | -0,2 |
| zero minutos · 24–27 | 591 | 0,0 | 0,0 | 0,0 | -1,0 | 0,0 | 0,0 | -1,0 | -1,0 |
| zero minutos · 28–30 | 572 | 0,0 | -0,1 | -0,1 | -1,0 | 0,0 | 0,0 | -1,1 | -1,0 |
| zero minutos · 31–33 | 709 | 0,0 | -0,8 | -0,8 | -1,0 | 0,0 | 0,0 | -1,8 | -1,6 |
| zero minutos · 34–36 | 880 | 0,0 | -1,5 | -1,5 | -1,0 | 0,0 | 0,0 | -2,5 | -2,3 |

### Por idade (todas as utilizações)

| Idade | linhas | idade total | envelhec. | inatividade | rendimento | ambiente | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|
| 17 | 217 | 1,2 | 0,0 | 0,0 | 0,1 | -0,5 | 0,5 |
| 18 | 409 | 1,3 | 0,0 | 0,0 | 0,1 | -0,7 | 0,5 |
| 19 | 537 | 1,3 | 0,0 | 0,0 | 0,1 | -0,7 | 0,6 |
| 20 | 574 | 1,5 | 0,0 | 0,0 | 0,1 | -0,8 | 0,7 |
| 21 | 598 | 1,5 | 0,0 | 0,0 | 0,1 | -1,0 | 0,6 |
| 22 | 659 | 1,4 | 0,0 | 0,0 | 0,2 | -1,0 | 0,4 |
| 23 | 715 | 1,3 | 0,0 | -0,3 | 0,2 | -1,0 | 0,2 |
| 24 | 816 | 1,2 | 0,0 | -0,3 | 0,2 | -0,9 | 0,1 |
| 25 | 903 | 1,0 | 0,0 | -0,3 | 0,2 | -0,8 | -0,1 |
| 26 | 1004 | 0,7 | 0,0 | -0,3 | 0,2 | -0,6 | -0,1 |
| 27 | 1012 | 0,4 | 0,0 | -0,3 | 0,2 | -0,4 | -0,2 |
| 28 | 1014 | 0,2 | 0,0 | -0,3 | 0,1 | -0,2 | -0,3 |
| 29 | 1015 | 0,0 | 0,0 | -0,3 | 0,1 | -0,1 | -0,3 |
| 30 | 1017 | -0,2 | -0,2 | -0,3 | 0,1 | 0,0 | -0,4 |
| 31 | 1021 | -0,5 | -0,5 | -0,3 | 0,1 | 0,0 | -0,5 |
| 32 | 1007 | -0,7 | -0,7 | -0,4 | 0,1 | 0,0 | -1,0 |
| 33 | 1023 | -1,0 | -1,0 | -0,4 | 0,1 | 0,0 | -1,2 |
| 34 | 1009 | -1,2 | -1,2 | -0,4 | 0,1 | 0,0 | -1,4 |
| 35 | 1020 | -1,5 | -1,5 | -0,5 | 0,1 | 0,0 | -1,7 |
| 36 | 913 | -1,7 | -1,7 | -0,5 | 0,1 | 0,0 | -2,0 |

## Variante 0.3-B

### Componentes por faixa de idade e utilização (pontos por temporada; entre parênteses: variação real média de strengthCurrent)

| Uso · idade | linhas | desenv. (idade) | envelhec. (idade) | idade total | inatividade | rendimento | ambiente | total | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| titular frequente · 18–20 | 742 | 2,6 | 0,0 | 2,6 | 0,0 | 0,2 | -1,5 | 1,4 | 1,1 |
| titular frequente · 21–23 | 1173 | 2,2 | 0,0 | 2,2 | 0,0 | 0,2 | -1,6 | 0,8 | 0,7 |
| titular frequente · 24–27 | 2328 | 1,2 | 0,0 | 1,2 | 0,0 | 0,2 | -1,0 | 0,4 | 0,2 |
| titular frequente · 28–30 | 1736 | 0,1 | -0,1 | 0,0 | 0,0 | 0,2 | -0,2 | 0,1 | 0,0 |
| titular frequente · 31–33 | 1474 | 0,0 | -0,7 | -0,7 | 0,0 | 0,2 | 0,0 | -0,5 | -0,4 |
| titular frequente · 34–36 | 1099 | 0,0 | -1,3 | -1,3 | 0,0 | 0,2 | -0,1 | -1,2 | -1,2 |
| titular parcial · 18–20 | 116 | 1,6 | 0,0 | 1,6 | 0,0 | 0,1 | -0,5 | 1,1 | 0,9 |
| titular parcial · 21–23 | 95 | 1,3 | 0,0 | 1,3 | 0,0 | 0,1 | -0,6 | 0,8 | 0,7 |
| titular parcial · 24–27 | 149 | 0,7 | 0,0 | 0,7 | -0,1 | 0,1 | -0,4 | 0,3 | 0,2 |
| titular parcial · 28–30 | 107 | 0,1 | -0,1 | 0,0 | -0,1 | 0,1 | -0,1 | -0,1 | -0,1 |
| titular parcial · 31–33 | 150 | 0,0 | -0,7 | -0,7 | -0,1 | 0,1 | -0,1 | -0,7 | -0,6 |
| titular parcial · 34–36 | 189 | 0,0 | -1,4 | -1,4 | -0,1 | 0,1 | -0,1 | -1,5 | -1,4 |
| reserva · 18–20 | 554 | 0,4 | 0,0 | 0,4 | 0,0 | 0,0 | -0,1 | 0,3 | 0,1 |
| reserva · 21–23 | 421 | 0,4 | 0,0 | 0,4 | -0,1 | 0,0 | -0,1 | 0,1 | 0,1 |
| reserva · 24–27 | 667 | 0,2 | 0,0 | 0,2 | -0,4 | 0,0 | -0,1 | -0,3 | -0,2 |
| reserva · 28–30 | 631 | 0,0 | -0,1 | -0,1 | -0,4 | 0,0 | 0,0 | -0,4 | -0,3 |
| reserva · 31–33 | 718 | 0,0 | -0,8 | -0,8 | -0,4 | 0,0 | 0,0 | -1,1 | -1,0 |
| reserva · 34–36 | 774 | 0,0 | -1,5 | -1,5 | -0,4 | 0,0 | 0,0 | -1,9 | -1,8 |
| zero minutos · 18–20 | 325 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 21–23 | 283 | 0,0 | 0,0 | 0,0 | -0,2 | 0,0 | 0,0 | -0,2 | 0,0 |
| zero minutos · 24–27 | 591 | 0,0 | 0,0 | 0,0 | -0,5 | 0,0 | 0,0 | -0,5 | -0,4 |
| zero minutos · 28–30 | 572 | 0,0 | -0,1 | -0,1 | -0,5 | 0,0 | 0,0 | -0,6 | -0,5 |
| zero minutos · 31–33 | 709 | 0,0 | -0,8 | -0,8 | -0,5 | 0,0 | 0,0 | -1,3 | -1,2 |
| zero minutos · 34–36 | 880 | 0,0 | -1,5 | -1,5 | -0,5 | 0,0 | 0,0 | -2,0 | -1,9 |

### Por idade (todas as utilizações)

| Idade | linhas | idade total | envelhec. | inatividade | rendimento | ambiente | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|
| 17 | 217 | 1,2 | 0,0 | 0,0 | 0,1 | -0,5 | 0,5 |
| 18 | 409 | 1,3 | 0,0 | 0,0 | 0,1 | -0,6 | 0,5 |
| 19 | 537 | 1,3 | 0,0 | 0,0 | 0,1 | -0,7 | 0,6 |
| 20 | 574 | 1,5 | 0,0 | 0,0 | 0,1 | -0,8 | 0,7 |
| 21 | 598 | 1,5 | 0,0 | 0,0 | 0,1 | -1,0 | 0,6 |
| 22 | 659 | 1,4 | 0,0 | 0,0 | 0,2 | -1,0 | 0,5 |
| 23 | 715 | 1,3 | 0,0 | -0,1 | 0,2 | -1,0 | 0,4 |
| 24 | 816 | 1,2 | 0,0 | -0,1 | 0,2 | -0,9 | 0,2 |
| 25 | 903 | 1,0 | 0,0 | -0,1 | 0,2 | -0,8 | 0,1 |
| 26 | 1004 | 0,7 | 0,0 | -0,1 | 0,2 | -0,6 | 0,0 |
| 27 | 1012 | 0,4 | 0,0 | -0,2 | 0,2 | -0,4 | -0,1 |
| 28 | 1014 | 0,2 | 0,0 | -0,2 | 0,1 | -0,2 | -0,1 |
| 29 | 1015 | 0,0 | 0,0 | -0,2 | 0,1 | -0,1 | -0,2 |
| 30 | 1017 | -0,2 | -0,2 | -0,2 | 0,1 | 0,0 | -0,2 |
| 31 | 1021 | -0,5 | -0,5 | -0,2 | 0,1 | 0,0 | -0,5 |
| 32 | 1007 | -0,7 | -0,7 | -0,2 | 0,1 | 0,0 | -0,8 |
| 33 | 1023 | -1,0 | -1,0 | -0,2 | 0,1 | 0,0 | -1,0 |
| 34 | 1009 | -1,2 | -1,2 | -0,2 | 0,1 | 0,0 | -1,3 |
| 35 | 1020 | -1,5 | -1,5 | -0,3 | 0,1 | 0,0 | -1,6 |
| 36 | 913 | -1,7 | -1,7 | -0,3 | 0,1 | 0,0 | -1,9 |

## Variante 0.3-C

### Componentes por faixa de idade e utilização (pontos por temporada; entre parênteses: variação real média de strengthCurrent)

| Uso · idade | linhas | desenv. (idade) | envelhec. (idade) | idade total | inatividade | rendimento | ambiente | total | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| titular frequente · 18–20 | 742 | 2,6 | 0,0 | 2,6 | 0,0 | 0,2 | -1,4 | 1,4 | 1,2 |
| titular frequente · 21–23 | 1173 | 2,2 | 0,0 | 2,2 | 0,0 | 0,2 | -1,5 | 0,9 | 0,7 |
| titular frequente · 24–27 | 2328 | 1,2 | 0,0 | 1,2 | 0,0 | 0,2 | -1,0 | 0,5 | 0,3 |
| titular frequente · 28–30 | 1736 | 0,1 | -0,1 | 0,1 | 0,0 | 0,2 | -0,2 | 0,1 | 0,0 |
| titular frequente · 31–33 | 1474 | 0,0 | -0,6 | -0,6 | 0,0 | 0,2 | -0,1 | -0,5 | -0,4 |
| titular frequente · 34–36 | 1099 | 0,0 | -1,2 | -1,2 | 0,0 | 0,2 | -0,1 | -1,1 | -1,0 |
| titular parcial · 18–20 | 116 | 1,6 | 0,0 | 1,6 | 0,0 | 0,1 | -0,5 | 1,2 | 0,9 |
| titular parcial · 21–23 | 95 | 1,3 | 0,0 | 1,3 | 0,0 | 0,1 | -0,5 | 0,8 | 0,7 |
| titular parcial · 24–27 | 149 | 0,7 | 0,0 | 0,7 | 0,0 | 0,1 | -0,4 | 0,4 | 0,3 |
| titular parcial · 28–30 | 107 | 0,1 | -0,1 | 0,0 | 0,0 | 0,1 | -0,1 | 0,0 | 0,0 |
| titular parcial · 31–33 | 150 | 0,0 | -0,4 | -0,4 | 0,0 | 0,1 | -0,1 | -0,3 | -0,1 |
| titular parcial · 34–36 | 189 | 0,0 | -0,7 | -0,7 | 0,0 | 0,1 | -0,1 | -0,7 | -0,6 |
| reserva · 18–20 | 554 | 0,4 | 0,0 | 0,4 | 0,0 | 0,0 | -0,1 | 0,3 | 0,1 |
| reserva · 21–23 | 421 | 0,4 | 0,0 | 0,4 | 0,0 | 0,0 | -0,1 | 0,3 | 0,2 |
| reserva · 24–27 | 667 | 0,2 | 0,0 | 0,2 | 0,0 | 0,0 | -0,1 | 0,1 | 0,1 |
| reserva · 28–30 | 631 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| reserva · 31–33 | 718 | 0,0 | -0,1 | -0,1 | 0,0 | 0,0 | 0,0 | -0,1 | 0,0 |
| reserva · 34–36 | 774 | 0,0 | -0,2 | -0,2 | 0,0 | 0,0 | 0,0 | -0,2 | -0,1 |
| zero minutos · 18–20 | 325 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 21–23 | 283 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 24–27 | 591 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 28–30 | 572 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 31–33 | 709 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| zero minutos · 34–36 | 880 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |

### Por idade (todas as utilizações)

| Idade | linhas | idade total | envelhec. | inatividade | rendimento | ambiente | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|
| 17 | 217 | 1,2 | 0,0 | 0,0 | 0,1 | -0,5 | 0,5 |
| 18 | 409 | 1,3 | 0,0 | 0,0 | 0,1 | -0,6 | 0,6 |
| 19 | 537 | 1,3 | 0,0 | 0,0 | 0,1 | -0,6 | 0,6 |
| 20 | 574 | 1,5 | 0,0 | 0,0 | 0,1 | -0,8 | 0,7 |
| 21 | 598 | 1,5 | 0,0 | 0,0 | 0,1 | -0,9 | 0,6 |
| 22 | 659 | 1,4 | 0,0 | 0,0 | 0,2 | -0,9 | 0,5 |
| 23 | 715 | 1,3 | 0,0 | 0,0 | 0,2 | -0,9 | 0,4 |
| 24 | 816 | 1,2 | 0,0 | 0,0 | 0,2 | -0,9 | 0,4 |
| 25 | 903 | 1,0 | 0,0 | 0,0 | 0,2 | -0,7 | 0,2 |
| 26 | 1004 | 0,7 | 0,0 | 0,0 | 0,2 | -0,6 | 0,1 |
| 27 | 1012 | 0,4 | 0,0 | 0,0 | 0,2 | -0,4 | 0,1 |
| 28 | 1014 | 0,2 | 0,0 | 0,0 | 0,1 | -0,2 | 0,0 |
| 29 | 1015 | 0,0 | 0,0 | 0,0 | 0,1 | -0,1 | 0,0 |
| 30 | 1017 | -0,1 | -0,1 | 0,0 | 0,1 | -0,1 | 0,0 |
| 31 | 1021 | -0,2 | -0,2 | 0,0 | 0,1 | 0,0 | -0,1 |
| 32 | 1007 | -0,3 | -0,3 | 0,0 | 0,1 | 0,0 | -0,2 |
| 33 | 1023 | -0,4 | -0,4 | 0,0 | 0,1 | 0,0 | -0,3 |
| 34 | 1009 | -0,5 | -0,5 | 0,0 | 0,1 | 0,0 | -0,4 |
| 35 | 1020 | -0,6 | -0,6 | 0,0 | 0,1 | 0,0 | -0,5 |
| 36 | 913 | -0,6 | -0,6 | 0,0 | 0,1 | 0,0 | -0,5 |

## Respostas (com evidência)

### 1. Quanto a idade sozinha reduz por temporada?

Envelhecimento (parte negativa da idade), média por temporada, por faixa e por uso (titular frequente / zero minutos):

| Idade | A titular | A 0 min | B titular | B 0 min | C titular | C 0 min |
|---|---:|---:|---:|---:|---:|---:|
| 18–20 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| 21–23 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| 24–27 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| 28–30 | -0,1 | -0,1 | -0,1 | -0,1 | -0,1 | 0,0 |
| 31–33 | -0,7 | -0,8 | -0,7 | -0,8 | -0,6 | 0,0 |
| 34–36 | -1,3 | -1,5 | -1,3 | -1,5 | -1,2 | 0,0 |

O envelhecimento começa aos 29 anos (tendência < 0) e cresce com a idade: o máximo teórico sem compensação é a curva × 38 rodadas (−0,8 aos 32; −1,5 aos 35; −2,3 aos 38).

### 2. Quanto a inatividade sozinha reduz por temporada?

- **A:** zero minutos: média -0,85 por temporada (mín. -1,00); reserva: -0,47.
- **B:** zero minutos: média -0,42 por temporada (mín. -0,50); reserva: -0,29.
- **C:** zero minutos: média 0,00 por temporada (mín. 0,00); reserva: 0,00.

### 3. Existe interação entre idade e ausência de minutos?

Envelhecimento médio de quem tem zero minutos menos o de titular frequente na mesma faixa (negativo = quem não joga envelhece mais):

| Idade | A | B | C |
|---|---:|---:|---:|
| 28–30 | -0,02 | -0,02 | 0,07 |
| 31–33 | -0,10 | -0,10 | 0,61 |
| 34–36 | -0,18 | -0,18 | 1,21 |

A interação vem da regra: quem joga bem compensa até 70% do envelhecimento da rodada; quem não joga recebe o envelhecimento inteiro (A, B) ou nenhum (C). Nas variantes A e B, a idade e a inatividade se SOMAM para quem não joga.

### 4. O componente de idade é diferente para titular e reserva?

| Idade | A titular | A titular parc. | A reserva | A zero | B titular | B titular parc. | B reserva | B zero | C titular | C titular parc. | C reserva | C zero |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 18–20 | 2,6 | 1,6 | 0,4 | 0,0 | 2,6 | 1,6 | 0,4 | 0,0 | 2,6 | 1,6 | 0,4 | 0,0 |
| 21–23 | 2,2 | 1,3 | 0,4 | 0,0 | 2,2 | 1,3 | 0,4 | 0,0 | 2,2 | 1,3 | 0,4 | 0,0 |
| 24–27 | 1,2 | 0,7 | 0,2 | 0,0 | 1,2 | 0,7 | 0,2 | 0,0 | 1,2 | 0,7 | 0,2 | 0,0 |
| 28–30 | 0,0 | 0,0 | -0,1 | -0,1 | 0,0 | 0,0 | -0,1 | -0,1 | 0,1 | 0,0 | 0,0 | 0,0 |
| 31–33 | -0,7 | -0,7 | -0,8 | -0,8 | -0,7 | -0,7 | -0,8 | -0,8 | -0,6 | -0,4 | -0,1 | 0,0 |
| 34–36 | -1,3 | -1,4 | -1,5 | -1,5 | -1,3 | -1,4 | -1,5 | -1,5 | -1,2 | -0,7 | -0,2 | 0,0 |

"Idade" = desenvolvimento pela idade (só com minutos) + envelhecimento. Até 28 anos, a diferença é o desenvolvimento, que só existe com minutos; depois dos 29, é o envelhecimento compensado pelo rendimento.

### 5. O rendimento consegue compensar a idade?

- **A:** titulares frequentes 31–36: envelhecimento potencial -1,07 → aplicado -0,96 (compensação 10,5%); rendimento 0,21; ambiente -0,05; variação real -0,73. Compensação parcial, nunca total.
- **B:** titulares frequentes 31–36: envelhecimento potencial -1,07 → aplicado -0,96 (compensação 10,5%); rendimento 0,21; ambiente -0,05; variação real -0,74. Compensação parcial, nunca total.
- **C:** titulares frequentes 31–36: envelhecimento potencial -1,07 → aplicado -0,87 (compensação 18,7%); rendimento 0,21; ambiente -0,06; variação real -0,65. Compensação parcial, nunca total.

### 6. A partir de qual idade a queda passa a dominar?

- **A:** todos: 25 anos; titular frequente: 30; reserva: 24; zero minutos: 23 (1ª idade com variação real média negativa, mínimo de 20 linhas).
- **B:** todos: 27 anos; titular frequente: 29; reserva: 24; zero minutos: 24 (1ª idade com variação real média negativa, mínimo de 20 linhas).
- **C:** todos: 30 anos; titular frequente: 30; reserva: 32; zero minutos: nunca (1ª idade com variação real média negativa, mínimo de 20 linhas).

### 7. Maior queda anual atribuível à idade

- **A:** -1,77 pontos de envelhecimento numa temporada (Ulisses Farias, 36 anos, zero minutos, 28 → 25).
- **B:** -1,77 pontos de envelhecimento numa temporada (Ulisses Farias, 36 anos, zero minutos, 28 → 26).
- **C:** -1,66 pontos de envelhecimento numa temporada (Caio Xavier, 36 anos, titular frequente, 41 → 39).

### 8. Maior queda anual atribuível à inatividade

- **A:** -1,00 pontos de inatividade numa temporada (Ulisses Farias, 35 anos, 30 → 28).
- **B:** -0,50 pontos de inatividade numa temporada (Ulisses Farias, 35 anos, 30 → 28).
- **C:** 0,00 pontos de inatividade numa temporada (Renan Lopes, 22 anos, 30 → 31).

### 9. Quantos chegam a 1 por causa da idade?

- **A:** 110 chegaram a 1; em 33 o envelhecimento acumulado até chegar a 1 foi a maior perda.
- **B:** 57 chegaram a 1; em 40 o envelhecimento acumulado até chegar a 1 foi a maior perda.
- **C:** 2 chegaram a 1; em 2 o envelhecimento acumulado até chegar a 1 foi a maior perda.

### 10. Quantos chegam a 1 por causa da inatividade?

- **A:** 77 de 110 (a inatividade acumulada foi a maior perda até chegar a 1). Envelhecimento médio acumulado -3,3, inatividade -5,2.
- **B:** 17 de 57 (a inatividade acumulada foi a maior perda até chegar a 1). Envelhecimento médio acumulado -3,4, inatividade -2,6.
- **C:** 0 de 2 (a inatividade acumulada foi a maior perda até chegar a 1). Envelhecimento médio acumulado -2,1, inatividade 0,0.

Perfil de quem chega a 1 (força inicial, idade ao chegar a 1, temporadas sem minutos até então):

| Variante | chegaram a 1 | força inicial média | força inicial ≤ 10 | força inicial 11–15 | força inicial 16+ | idade média ao chegar | chegaram com < 29 anos | temporadas sem minutos (média) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 110 | 9,4 | 68 | 34 | 8 | 33,7 | 5 | 4,1 |
| B | 57 | 7,0 | 52 | 5 | 0 | 34,0 | 2 | 3,6 |
| C | 2 | 4,0 | 2 | 0 | 0 | 34,0 | 0 | 0,5 |

Jogadores com força inicial ≤ 10 no mundo (todos os registrados): 160.

### 11. Quantos chegariam a 1 se apenas o componente de idade fosse aplicado?

- **A:** idade total (desenvolvimento + envelhecimento): 28; só envelhecimento: 28.
- **B:** idade total (desenvolvimento + envelhecimento): 28; só envelhecimento: 28.
- **C:** idade total (desenvolvimento + envelhecimento): 2; só envelhecimento: 2.

### 12. Quantos chegariam a 1 se apenas o componente de inatividade fosse aplicado?

- **A:** 41.
- **B:** 11.
- **C:** 0.

## Jogadores acompanhados

Por temporada: idade, minutos, força inicial e final, e pontos de cada componente (Δ ≈ força). O resíduo (acúmulo/passos inteiros) é a diferença entre a variação real e a soma.

### Breno Bragança Almeida (GOL, 23 anos no início, força inicial 35)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 23 | 0 | 35 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 34 |
| 2 | 24 | 0 | 34 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 33 |
| 3 | 25 | 0 | 33 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 32 |
| 4 | 26 | 0 | 32 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 31 |
| 5 | 27 | 0 | 31 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 30 |
| 6 | 28 | 0 | 30 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 29 |
| 7 | 29 | 0 | 29 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 28 |
| 8 | 30 | 0 | 28 | -0,25 (0,00 -0,25) | -1,00 | 0,00 | 0,00 | 0,25 | 27 |
| 9 | 31 | 0 | 27 | -0,51 (0,00 -0,51) | -1,00 | 0,00 | 0,00 | 0,51 | 26 |
| 10 | 32 | 0 | 26 | -0,76 (0,00 -0,76) | -1,00 | 0,00 | 0,00 | -0,24 | 24 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 23 | 0 | 35 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 35 |
| 2 | 24 | 0 | 35 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | -0,50 | 34 |
| 3 | 25 | 0 | 34 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 34 |
| 4 | 26 | 0 | 34 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | -0,50 | 33 |
| 5 | 27 | 0 | 33 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 33 |
| 6 | 28 | 0 | 33 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | -0,50 | 32 |
| 7 | 29 | 0 | 32 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 32 |
| 8 | 30 | 0 | 32 | -0,25 (0,00 -0,25) | -0,50 | 0,00 | 0,00 | -0,25 | 31 |
| 9 | 31 | 0 | 31 | -0,51 (0,00 -0,51) | -0,50 | 0,00 | 0,00 | 0,01 | 30 |
| 10 | 32 | 0 | 30 | -0,76 (0,00 -0,76) | -0,50 | 0,00 | 0,00 | 0,26 | 29 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 23 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 2 | 24 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 3 | 25 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 4 | 26 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 5 | 27 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 6 | 28 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 7 | 29 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 8 | 30 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 9 | 31 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |
| 10 | 32 | 0 | 35 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 35 |

### Henrique Jardim (MEI, 32 anos no início, força inicial 26)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 32 | 0 | 26 | -0,76 (0,00 -0,76) | -1,00 | 0,00 | 0,00 | 0,76 | 25 |
| 2 | 33 | 0 | 25 | -1,01 (0,00 -1,01) | -1,00 | 0,00 | 0,00 | 0,01 | 23 |
| 3 | 34 | 0 | 23 | -1,27 (0,00 -1,27) | -1,00 | 0,00 | 0,00 | -0,73 | 20 |
| 4 | 35 | 0 | 20 | -1,52 (0,00 -1,52) | -1,00 | 0,00 | 0,00 | 0,52 | 18 |
| 5 | 36 | 0 | 18 | -1,77 (0,00 -1,77) | -1,00 | 0,00 | 0,00 | -0,23 | 15 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 32 | 0 | 26 | -0,76 (0,00 -0,76) | -0,50 | 0,00 | 0,00 | 0,26 | 25 |
| 2 | 33 | 0 | 25 | -1,01 (0,00 -1,01) | -0,50 | 0,00 | 0,00 | 0,51 | 24 |
| 3 | 34 | 0 | 24 | -1,27 (0,00 -1,27) | -0,50 | 0,00 | 0,00 | -0,23 | 22 |
| 4 | 35 | 0 | 22 | -1,52 (0,00 -1,52) | -0,50 | 0,00 | 0,00 | 0,02 | 20 |
| 5 | 36 | 0 | 20 | -1,77 (0,00 -1,77) | -0,50 | 0,00 | 0,00 | 0,27 | 18 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 32 | 0 | 26 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 26 |
| 2 | 33 | 0 | 26 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 26 |
| 3 | 34 | 0 | 26 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 26 |
| 4 | 35 | 0 | 26 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 26 |
| 5 | 36 | 0 | 26 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 26 |

### Luan Gomes (DEF, 27 anos no início, força inicial 32)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 0 | 32 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 31 |
| 2 | 28 | 0 | 31 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 30 |
| 3 | 29 | 0 | 30 | 0,00 (0,00 0,00) | -1,00 | 0,00 | 0,00 | 0,00 | 29 |
| 4 | 30 | 0 | 29 | -0,25 (0,00 -0,25) | -1,00 | 0,00 | 0,00 | 0,25 | 28 |
| 5 | 31 | 0 | 28 | -0,51 (0,00 -0,51) | -1,00 | 0,00 | 0,00 | 0,51 | 27 |
| 6 | 32 | 0 | 27 | -0,76 (0,00 -0,76) | -1,00 | 0,00 | 0,00 | -0,24 | 25 |
| 7 | 33 | 0 | 25 | -1,01 (0,00 -1,01) | -1,00 | 0,00 | 0,00 | 0,01 | 23 |
| 8 | 34 | 0 | 23 | -1,27 (0,00 -1,27) | -1,00 | 0,00 | 0,00 | 0,27 | 21 |
| 9 | 35 | 0 | 21 | -1,52 (0,00 -1,52) | -1,00 | 0,00 | 0,00 | -0,48 | 18 |
| 10 | 36 | 0 | 18 | -1,77 (0,00 -1,77) | -1,00 | 0,00 | 0,00 | -0,23 | 15 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 0 | 32 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 32 |
| 2 | 28 | 0 | 32 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | -0,50 | 31 |
| 3 | 29 | 0 | 31 | 0,00 (0,00 0,00) | -0,50 | 0,00 | 0,00 | 0,50 | 31 |
| 4 | 30 | 0 | 31 | -0,25 (0,00 -0,25) | -0,50 | 0,00 | 0,00 | -0,25 | 30 |
| 5 | 31 | 0 | 30 | -0,51 (0,00 -0,51) | -0,50 | 0,00 | 0,00 | 0,01 | 29 |
| 6 | 32 | 0 | 29 | -0,76 (0,00 -0,76) | -0,50 | 0,00 | 0,00 | 0,26 | 28 |
| 7 | 33 | 0 | 28 | -1,01 (0,00 -1,01) | -0,50 | 0,00 | 0,00 | -0,49 | 26 |
| 8 | 34 | 0 | 26 | -1,27 (0,00 -1,27) | -0,50 | 0,00 | 0,00 | 0,77 | 25 |
| 9 | 35 | 0 | 25 | -1,52 (0,00 -1,52) | -0,50 | 0,00 | 0,00 | 0,02 | 23 |
| 10 | 36 | 0 | 23 | -1,77 (0,00 -1,77) | -0,50 | 0,00 | 0,00 | -0,73 | 20 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 2 | 28 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 3 | 29 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 4 | 30 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 5 | 31 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 6 | 32 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 7 | 33 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 8 | 34 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 9 | 35 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |
| 10 | 36 | 0 | 32 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 32 |

### Gabriel Macedo (GOL, 27 anos no início, força inicial 25; 2 homônimos, mostrado ply-1033)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 3420 | 25 | 0,76 (0,76 0,00) | 0,00 | 0,05 | -0,76 | -0,05 | 25 |
| 2 | 28 | 3420 | 25 | 0,38 (0,38 0,00) | 0,00 | 1,69 | -0,38 | -1,69 | 25 |
| 3 | 29 | 3420 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,81 | 0,00 | -0,81 | 25 |
| 4 | 30 | 1710 | 25 | -0,23 (0,00 -0,23) | -0,52 | 0,29 | 0,00 | 0,46 | 25 |
| 5 | 31 | 0 | 25 | -0,51 (0,00 -0,51) | -1,00 | 0,00 | 0,00 | -0,49 | 23 |
| 6 | 32 | 0 | 23 | -0,76 (0,00 -0,76) | -1,00 | 0,00 | 0,00 | 0,76 | 22 |
| 7 | 33 | 0 | 22 | -1,01 (0,00 -1,01) | -1,00 | 0,00 | 0,00 | 0,01 | 20 |
| 8 | 34 | 0 | 20 | -1,27 (0,00 -1,27) | -1,00 | 0,00 | 0,00 | -0,73 | 17 |
| 9 | 35 | 0 | 17 | -1,52 (0,00 -1,52) | -1,00 | 0,00 | 0,00 | 0,52 | 15 |
| 10 | 36 | 0 | 15 | -1,77 (0,00 -1,77) | -1,00 | 0,00 | 0,00 | -0,23 | 12 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 3420 | 25 | 0,76 (0,76 0,00) | 0,00 | 0,05 | -0,76 | -0,05 | 25 |
| 2 | 28 | 3420 | 25 | 0,38 (0,38 0,00) | 0,00 | 1,69 | -0,38 | -1,69 | 25 |
| 3 | 29 | 3420 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,81 | 0,00 | -0,81 | 25 |
| 4 | 30 | 1710 | 25 | -0,23 (0,00 -0,23) | -0,50 | 0,29 | 0,00 | 0,44 | 25 |
| 5 | 31 | 0 | 25 | -0,51 (0,00 -0,51) | -0,50 | 0,00 | 0,00 | 0,01 | 24 |
| 6 | 32 | 0 | 24 | -0,76 (0,00 -0,76) | -0,50 | 0,00 | 0,00 | 0,26 | 23 |
| 7 | 33 | 0 | 23 | -1,01 (0,00 -1,01) | -0,50 | 0,00 | 0,00 | -0,49 | 21 |
| 8 | 34 | 0 | 21 | -1,27 (0,00 -1,27) | -0,50 | 0,00 | 0,00 | -0,23 | 19 |
| 9 | 35 | 0 | 19 | -1,52 (0,00 -1,52) | -0,50 | 0,00 | 0,00 | 0,02 | 17 |
| 10 | 36 | 0 | 17 | -1,77 (0,00 -1,77) | -0,50 | 0,00 | 0,00 | 0,27 | 15 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 3420 | 25 | 0,76 (0,76 0,00) | 0,00 | 0,05 | -0,76 | -0,05 | 25 |
| 2 | 28 | 3420 | 25 | 0,38 (0,38 0,00) | 0,00 | 1,69 | -0,38 | -1,69 | 25 |
| 3 | 29 | 3420 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,81 | 0,00 | -0,81 | 25 |
| 4 | 30 | 1710 | 25 | -0,10 (0,00 -0,10) | 0,00 | 0,29 | 0,00 | -0,19 | 25 |
| 5 | 31 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |
| 6 | 32 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |
| 7 | 33 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |
| 8 | 34 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |
| 9 | 35 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |
| 10 | 36 | 0 | 25 | 0,00 (0,00 0,00) | 0,00 | 0,00 | 0,00 | 0,00 | 25 |

### Igor Duarte (MEI, 19 anos no início, força inicial 13; 6 homônimos, mostrado clb-008-b2030-1)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 19 | 3240 | 13 | 2,76 (2,76 0,00) | 0,00 | 0,17 | -0,05 | -0,88 | 15 |
| 6 | 20 | 2823 | 15 | 2,30 (2,30 0,00) | 0,00 | -0,08 | -0,25 | 0,03 | 17 |
| 7 | 21 | 3060 | 17 | 2,38 (2,38 0,00) | 0,00 | 0,34 | -0,49 | 0,77 | 20 |
| 8 | 22 | 2985 | 20 | 2,10 (2,10 0,00) | 0,00 | 0,18 | -0,63 | -0,66 | 21 |
| 9 | 23 | 2903 | 21 | 1,83 (1,83 0,00) | 0,00 | 0,34 | -0,77 | 0,60 | 23 |
| 10 | 24 | 2847 | 23 | 1,58 (1,58 0,00) | 0,00 | 0,21 | -0,85 | 0,06 | 24 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 19 | 3240 | 13 | 2,76 (2,76 0,00) | 0,00 | 0,17 | -0,02 | -0,91 | 15 |
| 6 | 20 | 2823 | 15 | 2,30 (2,30 0,00) | 0,00 | -0,08 | -0,21 | -0,01 | 17 |
| 7 | 21 | 3060 | 17 | 2,38 (2,38 0,00) | 0,00 | 0,34 | -0,45 | 0,73 | 20 |
| 8 | 22 | 2985 | 20 | 2,10 (2,10 0,00) | 0,00 | 0,18 | -0,58 | -0,70 | 21 |
| 9 | 23 | 2903 | 21 | 1,83 (1,83 0,00) | 0,00 | 0,34 | -0,72 | 0,56 | 23 |
| 10 | 24 | 2847 | 23 | 1,58 (1,58 0,00) | 0,00 | 0,21 | -0,76 | -0,03 | 24 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 19 | 3240 | 13 | 2,76 (2,76 0,00) | 0,00 | 0,17 | 0,00 | -0,93 | 15 |
| 6 | 20 | 2823 | 15 | 2,30 (2,30 0,00) | 0,00 | -0,08 | -0,13 | 0,91 | 18 |
| 7 | 21 | 3060 | 18 | 2,38 (2,38 0,00) | 0,00 | 0,34 | -0,33 | -0,39 | 20 |
| 8 | 22 | 2985 | 20 | 2,10 (2,10 0,00) | 0,00 | 0,18 | -0,48 | 0,20 | 22 |
| 9 | 23 | 2903 | 22 | 1,83 (1,83 0,00) | 0,00 | 0,34 | -0,62 | -0,54 | 23 |
| 10 | 24 | 2847 | 23 | 1,58 (1,58 0,00) | 0,00 | 0,21 | -0,63 | -0,15 | 24 |

### Caio Toledo Freitas (ATA, 21 anos no início, força inicial 48)

**0.3-A**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 3203 | 48 | 2,49 (2,49 0,00) | 0,00 | 0,41 | -2,49 | -0,41 | 48 |
| 2 | 22 | 3330 | 48 | 2,34 (2,34 0,00) | 0,00 | 0,60 | -2,34 | -0,60 | 48 |
| 3 | 23 | 3420 | 48 | 2,15 (2,15 0,00) | 0,00 | 0,29 | -2,15 | -0,29 | 48 |
| 4 | 24 | 3306 | 48 | 1,84 (1,84 0,00) | 0,00 | 0,40 | -1,84 | -0,40 | 48 |
| 5 | 25 | 3319 | 48 | 1,48 (1,48 0,00) | 0,00 | 0,36 | -1,48 | -0,36 | 48 |
| 6 | 26 | 3330 | 48 | 1,11 (1,11 0,00) | 0,00 | 0,53 | -1,11 | -0,53 | 48 |
| 7 | 27 | 3049 | 48 | 0,68 (0,68 0,00) | 0,00 | 0,16 | -0,68 | -0,16 | 48 |
| 8 | 28 | 3330 | 48 | 0,37 (0,37 0,00) | 0,00 | 0,11 | -0,37 | -0,11 | 48 |
| 9 | 29 | 3326 | 48 | 0,00 (0,00 0,00) | 0,00 | 0,53 | 0,00 | -0,53 | 48 |
| 10 | 30 | 3330 | 48 | -0,20 (0,00 -0,20) | 0,00 | 0,82 | 0,00 | -0,62 | 48 |

**0.3-B**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 3203 | 48 | 2,49 (2,49 0,00) | 0,00 | 0,41 | -2,49 | -0,41 | 48 |
| 2 | 22 | 3330 | 48 | 2,34 (2,34 0,00) | 0,00 | 0,60 | -2,34 | -0,60 | 48 |
| 3 | 23 | 3420 | 48 | 2,15 (2,15 0,00) | 0,00 | 0,29 | -2,15 | -0,29 | 48 |
| 4 | 24 | 3306 | 48 | 1,84 (1,84 0,00) | 0,00 | 0,40 | -1,84 | -0,40 | 48 |
| 5 | 25 | 3319 | 48 | 1,48 (1,48 0,00) | 0,00 | 0,36 | -1,48 | -0,36 | 48 |
| 6 | 26 | 3330 | 48 | 1,11 (1,11 0,00) | 0,00 | 0,53 | -1,11 | -0,53 | 48 |
| 7 | 27 | 3049 | 48 | 0,68 (0,68 0,00) | 0,00 | 0,16 | -0,68 | -0,16 | 48 |
| 8 | 28 | 3330 | 48 | 0,37 (0,37 0,00) | 0,00 | 0,11 | -0,37 | -0,11 | 48 |
| 9 | 29 | 3326 | 48 | 0,00 (0,00 0,00) | 0,00 | 0,53 | 0,00 | -0,53 | 48 |
| 10 | 30 | 3330 | 48 | -0,20 (0,00 -0,20) | 0,00 | 0,82 | 0,00 | -0,62 | 48 |

**0.3-C**

| T | idade | minutos | força inicial | Δ idade (des. + envelh.) | Δ inatividade | Δ rendimento | Δ ambiente | resíduo | força final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 3203 | 48 | 2,49 (2,49 0,00) | 0,00 | 0,41 | -2,49 | -0,41 | 48 |
| 2 | 22 | 3330 | 48 | 2,34 (2,34 0,00) | 0,00 | 0,60 | -2,34 | -0,60 | 48 |
| 3 | 23 | 3420 | 48 | 2,15 (2,15 0,00) | 0,00 | 0,29 | -2,15 | -0,29 | 48 |
| 4 | 24 | 3306 | 48 | 1,84 (1,84 0,00) | 0,00 | 0,40 | -1,84 | -0,40 | 48 |
| 5 | 25 | 3319 | 48 | 1,48 (1,48 0,00) | 0,00 | 0,36 | -1,48 | -0,36 | 48 |
| 6 | 26 | 3330 | 48 | 1,11 (1,11 0,00) | 0,00 | 0,53 | -1,11 | -0,53 | 48 |
| 7 | 27 | 3049 | 48 | 0,68 (0,68 0,00) | 0,00 | 0,16 | -0,68 | -0,16 | 48 |
| 8 | 28 | 3330 | 48 | 0,37 (0,37 0,00) | 0,00 | 0,11 | -0,37 | -0,11 | 48 |
| 9 | 29 | 3326 | 48 | 0,00 (0,00 0,00) | 0,00 | 0,53 | 0,00 | -0,53 | 48 |
| 10 | 30 | 3330 | 48 | -0,20 (0,00 -0,20) | 0,00 | 0,82 | 0,00 | -0,62 | 48 |

## Grupos específicos (média por temporada)

| Grupo | variante | linhas | desenv. | envelhec. | inatividade | rendimento | ambiente | variação real |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| jovem (≤ 23) sem minutos | A | 608 | 0,0 | 0,0 | -0,2 | 0,0 | 0,0 | -0,1 |
| jovem (≤ 23) sem minutos | B | 608 | 0,0 | 0,0 | -0,1 | 0,0 | 0,0 | 0,0 |
| jovem (≤ 23) sem minutos | C | 608 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| jovem (≤ 23) titular frequente | A | 1915 | 2,3 | 0,0 | 0,0 | 0,2 | -1,6 | 0,8 |
| jovem (≤ 23) titular frequente | B | 1915 | 2,3 | 0,0 | 0,0 | 0,2 | -1,5 | 0,9 |
| jovem (≤ 23) titular frequente | C | 1915 | 2,3 | 0,0 | 0,0 | 0,2 | -1,5 | 0,9 |
| veterano (≥ 31) sem minutos | A | 1589 | 0,0 | -1,2 | -1,0 | 0,0 | 0,0 | -2,0 |
| veterano (≥ 31) sem minutos | B | 1589 | 0,0 | -1,2 | -0,5 | 0,0 | 0,0 | -1,6 |
| veterano (≥ 31) sem minutos | C | 1589 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| veterano (≥ 31) titular frequente | A | 2573 | 0,0 | -1,0 | 0,0 | 0,2 | 0,0 | -0,7 |
| veterano (≥ 31) titular frequente | B | 2573 | 0,0 | -1,0 | 0,0 | 0,2 | -0,1 | -0,7 |
| veterano (≥ 31) titular frequente | C | 2573 | 0,0 | -0,9 | 0,0 | 0,2 | -0,1 | -0,6 |
