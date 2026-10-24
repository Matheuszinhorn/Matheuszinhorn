# Paper trading pré-registrado: 8 semanas (25/10 a 20/12/2026)

Aprovado pelo proprietário (opção A). **Nenhuma ordem real** durante o teste. Regras e critérios fixados em 24/10/2026, **antes** de qualquer dado do período, e **não serão alterados**.

## Regras
| ID | Ativo | Tempo gráfico | Entrada | Saída |
|---|---|---|---|---|
| R1 | BTC-USD, ETH-USD | 6 h | fechamento > fechamento de 120 barras atrás (30 dias) | fechamento ≤ fechamento de 120 barras atrás |
| R2 | BTC-USD, ETH-USD | 1 d | RSI(2) < 10 **e** fechamento > média de 200 dias | fechamento > média de 5 dias |

- **Execução virtual:** sinal no fechamento da barra; preço = abertura da barra seguinte (candles públicos da Coinbase).
- **Carteiras virtuais:** 4 de R$ 12,50 (total R$ 50). Sem reinvestimento entre carteiras.
- **Custo:** 0,12% por lado (taxa de 0,10% da conta + 0,02%). Estresse: 0,30%.
- **Por que estas regras:** foram as menos inconsistentes do backtest de 24/10 fora da amostra (R1: BTC +16%, ETH +29% em 6 h; R2: BTC +3,7%, ETH +4,5% no diário). SOL ficou de fora (negativo fora da amostra em R1 e R2). **Isso não é evidência de vantagem**; é justamente o que o teste vai verificar.

## Critérios para propor uma operação real (todos ao mesmo tempo, em 20/12)
1. Retorno total das 4 carteiras > 0 **com custo de 0,30%**.
2. Retorno total > comprar e segurar BTC/ETH no mesmo período, **ou** queda máxima menor que a metade da de comprar e segurar.
3. ≥ 8 operações fechadas no total.
4. Queda máxima de cada carteira ≤ 15%.

**Se qualquer critério falhar,** o trading é encerrado como fonte de receita.

Se todos passarem, a proposta real terá: até R$ 10 por operação, perda acumulada máxima de R$ 15, prévia obrigatória (`orders_preview`) antes de cada ordem, e nunca transferência ou saque. A proposta é **apresentada para aprovação antes**.

## Acompanhamento
`python3 analises/quant/trading-2026/paper/paper.py`, uma vez por dia (agendado). O script recalcula tudo do zero de forma determinística: um dia sem execução não muda o resultado. Saídas: `estado.json` e `operacoes-paper.csv`.

---
## Alteração de prazo (diretriz do proprietário "DEC-046", 24/10/2026 19:34 BRT)
- **Novo prazo:** o ciclo de validação passa a ser de **72 h** (até 27/10/2026 ≈ 19:30 BRT). Regras R1/R2 e custos não mudam; o texto original acima fica preservado.
- **Decisão ao fim das 72 h:** A (evidência insuficiente, com pergunta específica), B (sem vantagem: rejeitar ou reformular) ou C (proposta de 1ª ordem pequena **para aprovação explícita**).
- **Limitação conhecida já no início:** 72 h geram ≈ 12 barras de 6 h e 3 barras diárias. O paper trading desse período **não tem poder estatístico**; a decisão se apoia sobretudo no walk-forward histórico.
