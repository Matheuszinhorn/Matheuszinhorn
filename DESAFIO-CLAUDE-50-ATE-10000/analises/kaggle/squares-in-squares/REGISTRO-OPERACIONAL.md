# Squares in Squares — Registro operacional

Memória técnica completa, incluindo resultados negativos. O código fica fora do repositório público (regra da Kaggle).

## ATV-161 — Operação Desbloqueio da Coluna Direita (03/11/2026)
Recursos: 4 núcleos; 6 lotes de cerca de 10 min (cerca de 4 h-núcleo).
Alvo: 910 quadrados em L = 30,66092 (o público de 910 é 30,69096).

### Diagnóstico do patamar de 0,0038 (ATV-158)
- A coluna da parede direita tem **31 quadrados axiais de parede a parede** num lado de 30,66. Faltam exatamente 0,339 de comprimento.
- A penalidade quadrática (soma de penetração²) favorece **espalhar** o defeito pela cadeia: 31 contatos de 0,011 custam 0,0037; o mesmo défice num único contato custaria 0,116. O otimizador é atraído para essa armadilha.

### Dados do líder por n (ds/lostdecimal27 targets.csv)
| n | público (nosso) | líder |
|---|---|---|
| 906 | 30,59138 | 30,59138 (**empate**) |
| 907 | 30,61837 | 30,60235 |
| 908 | 30,63853 | 30,60589 |
| 909 | 30,65685 | 30,63425 |
| 910 | 30,69122 | 30,64688 |
| 911 | 30,70711 | 30,66092 |
| 912 | 30,70711 | 30,68750 |

- A solução de 906 (empatada) usa **três blocos curtos inclinados a cerca de 41°** em degraus.
- As públicas de 909 a 912 usam **uma faixa longa a 45°**: são famílias diferentes.
- Hipótese: o líder estende a família do 906.

### Experimentos (todos com avaliação global e validação oficial só para maxv < 1e-6)
| exp | configuração | resultado (sobreposição máx. final) | veredito |
|---|---|---|---|
| A-expulsão | tira 1 quadrado da cadeia, reinsere no melhor buraco + janelas | 0,0119 → 0,0117 (186 tentativas, 1 aceita) | falhou: o quadrado volta para a cadeia |
| A-segmentos | segmentos de 3/5/10/15: translação, articulação, compactação + janela na ponta | 0,0119 → 0,0117 (545 tentativas, 34 aceitas) | falhou: a cadeia continua com 31 |
| C-ambiente | movimentos rígidos da faixa / coluna / zona de contato + relaxação global | 0,0119 → 0,0124 (686 tentativas, 2 aceitas) | falhou |
| B-QIPE semeado (909+1, 910 reescalado) | recombinação + interferência, sem tunelamento | energia L2 3,7e-3 → **1,3e-3**, maxv 0,0023 | abaixo do patamar, mas sem solução válida; diversidade colapsou de 0,11 para 0,001 |
| D (906+1 → 907) | QIPE e janela, L = 30,6184 / 30,6100 / 30,6030 | maxv 0,013 / 0,014 / 0,014; janela 0,020 | falhou: mesma armadilha (31 na coluna), mesmo com +0,027 de folga |
| E (inserção na ponta dos blocos inclinados) | 907 em 3 lados; 908 em 30,62 | maxv 0,014–0,020 | falhou: a cadeia de 31 se forma de novo |
| F (métrica L1 nas decisões) | 910 (com e sem tunelamento), 907 com inserção dirigida | L1 0,378 → 0,339; maxv 0,021 | o défice da coluna (0,339 = 31 − 30,66) não sai |
| G (congelar cadeias completas + expulsar excedente) | 910 (2 sementes), 907 (2 lados) | 910: congelou 899–906 de 910 quadrados (fileiras + colunas cobrem todos) → maxv 0,08–0,58; 907: detector não disparou → 0,024 | erro de desenho |

- Nenhuma configuração válida.
- Nenhuma submissão.

### Conclusões
1. Inserir um quadrado e otimizar localmente (com qualquer combinação de operadores, métricas e população) não converte a estrutura: o defeito termina numa cadeia de parede a parede.
2. A diferença para o líder não é "otimizar melhor" a mesma geometria. É **outra geometria**: a família de blocos curtos a cerca de 41° do 906.
3. Próximo passo: **modelo construtivo dos blocos do 906.** Medir a geometria exata dos 3 blocos (ângulo, dimensões, degraus da grade). Parametrizar quantos quadrados cada bloco absorve. Construir 907–911 diretamente, sem inserção, usando a busca só como polimento final.

### Reprodução
- Scripts (scratchpad privado): `sa/engine.py`, `sa/search.py`, `sa/window.py`, `sa/bench.py`, `sa/gadget.py`, `sa/exp161.py`.
- Exemplo: `METRIC=l1 GADGET=1 python3 exp161.py --mode B --n 907 --base 906 --alt 0 --L 30.6184 --budget 600 --out x161/teste`.
