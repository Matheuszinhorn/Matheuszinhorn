# Recebi do Exterior: conversão PTAX para o Carnê-Leão

**Usar agora (grátis, sem cadastro):** https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/recebi-do-exterior/index.html?src=github

É para quem recebe em dólar de uma empresa ou de um cliente no exterior (salário, freelas, "dev na gringa") e precisa lançar o valor em reais no **Carnê-Leão Web** todo mês.

## O que faz
- Busca a **cotação PTAX de compra** no Banco Central para cada recebimento.
- Aplica a regra mais citada para rendimentos do exterior: **último dia útil da 1ª quinzena do mês anterior** ao recebimento, com fins de semana e feriados tratados pela própria série do BC.
- Mostra, para comparar, quanto daria com a cotação do dia do recebimento. As fontes divergem, e a diferença pode passar de R$ 1.000 num trimestre.
- Soma por mês o valor a lançar e informa o vencimento do DARF 0190.
- Exporta CSV e permite imprimir ou salvar em PDF.

## Privacidade
Tudo roda no navegador. Só as datas são enviadas à API pública do Banco Central (olinda.bcb.gov.br). Valores e descrições ficam no aparelho.

## Limites
- Não é aconselhamento fiscal e não calcula o imposto. O Carnê-Leão Web calcula a partir do valor em reais.
- Recebimentos em outras moedas precisam primeiro ser convertidos para dólar pela cotação do país de origem na data do recebimento.

## Verificação
Um exemplo com recebimentos em 05/09, 22/09 e 06/10/2026 foi conferido de forma independente na API do BC:

| Recebimento | Cotação usada | Data da cotação | Valor |
|---|---|---|---|
| US$ 3.200,00 | 5,2230 | 14/08/2026 (15/08 caiu num sábado) | R$ 16.713,60 |
| US$ 1.250,50 | 5,2230 | 14/08/2026 | R$ 6.531,36 |
| US$ 3.200,00 | 5,1484 | 15/09/2026 | R$ 16.474,88 |

## Feedback
Para relatar um erro ou pedir a versão com relatório anual (rendimentos do exterior, ganhos de capital e Lei 14.754/2023), abra uma Issue neste repositório, começando o título com `[Recebi do Exterior]`.
