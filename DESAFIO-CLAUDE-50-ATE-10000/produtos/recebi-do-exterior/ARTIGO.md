# Carnê-Leão de quem recebe em dólar: qual cotação usar muda até R$ 815 por mês na base de cálculo

*Texto educativo para publicação (TabNews como artigo, não como "Pitch"; LinkedIn; blog). Dados da API PTAX do Banco Central, consultada em 23/10/2026 (horário de Brasília).*

Quem recebe do exterior como pessoa física precisa converter cada pagamento para reais e lançar no Carnê-Leão. A dúvida mais comum é **qual cotação usar**, e as fontes não concordam:

- **Regra A (a mais citada):** dólar de **compra** do BC no **último dia útil da 1ª quinzena do mês anterior** ao recebimento. É a que aparecem em InfoMoney, NetCPA e AmdJus.
- **Regra B:** cotação do **dia do recebimento**, citada por outras fontes, como Cidesp, InvestNews e um guia da Contabilidade Zen.

## Quanto isso muda na prática (2026, dados reais)
Simulação: US$ 5.000 recebidos no dia 5 de cada mês. Na Regra B foi usada a última cotação publicada até o dia 5.

| Mês | Regra A (data da cotação → R$) | Regra B (data → R$) | Diferença na base |
|---|---|---|---|
| jan | 15/12/2025 → 26.961,50 | 05/01 → 27.172,50 | −211,00 |
| fev | 15/01 → 26.920,00 | 05/02 → 26.287,00 | +633,00 |
| mar | 13/02 → 26.141,00 | 05/03 → 26.220,50 | −79,50 |
| abr | 13/03 → 26.267,50 | 02/04 → 25.824,50 | +443,00 |
| mai | 15/04 → 24.961,00 | 05/05 → 24.618,00 | +343,00 |
| jun | 15/05 → 25.324,00 | 05/06 → 25.619,00 | −295,00 |
| jul | 15/06 → 25.212,00 | 03/07 → 25.855,50 | −643,50 |
| ago | 15/07 → 25.360,50 | 05/08 → 25.574,00 | −213,50 |
| set | 14/08 → 26.115,00 | 04/09 → 25.623,50 | +491,50 |
| out | 15/09 → 25.742,00 | 05/10 → 24.926,50 | +815,50 |
| **total** | **259.004,50** | **257.721,00** | **+1.283,50** |

Nenhuma das regras é sempre "mais barata": depende do câmbio de cada mês. O ponto é que **dá para errar a base em centenas de reais por mês** sem perceber, e a diferença vira imposto a mais ou a menos.

## Como fazer a conta sem planilha
1. Para cada recebimento, ache o mês anterior e pegue a **última** cotação de compra publicada entre os dias 1 e 15. A série do BC só tem dias úteis, então fim de semana e feriado se resolvem sozinhos: em agosto/2026 o dia 15 caiu num sábado, e a cotação correta é a de 14/08.
2. Multiplique o valor em dólar por essa cotação.
3. Some os recebimentos do mês e lance o total no Carnê-Leão Web. O DARF 0190 vence no último dia útil do mês seguinte.

Para não fazer isso à mão, montei uma página que busca a cotação direto na API do BC, aplica as duas regras lado a lado e soma por mês. Ela **não pede login, não mexe em dinheiro e não envia os seus valores a lugar nenhum**: só as datas vão ao Banco Central. O código é aberto.
→ https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/recebi-do-exterior/index.html?src=artigo

**Limites:** não é aconselhamento fiscal. Não encontrei o texto normativo oficial confirmando a Regra A (o Planalto estava fora do ar quando tentei), por isso a página mostra as duas. Se você conhece a norma exata ou já recebeu orientação do seu contador, comente: é o que mais ajuda quem está com essa dúvida.
