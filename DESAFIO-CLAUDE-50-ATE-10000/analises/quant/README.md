# Análises quantitativas (ciclo 8)

Reprodução: `python3 sim.py` e `python3 arb.py`, que precisam de `btcbrl_daily.json`. Esse arquivo é gerado pelo download de candles diários BTCBRL de `data-api.binance.vision` (público, sem conta).

- `sim.py`: simulação de Monte Carlo com blocos de 30 dias sorteados do histórico diário BTC/BRL (13/10/2020–22/10/2026, 2.200 dias). Roda com R$ 50, sem alavancagem, com 0,7% de taxa por lado. Tem dois cenários: histórico e sem tendência. Inclui também o backtest do cruzamento de médias 50/200 e a projeção de renda fixa.
- `arb.py`: foto instantânea dos melhores preços de compra e venda em Mercado Bitcoin, Foxbit, BitPreço e Binance, pelas APIs públicas, com o custo de um ciclo de arbitragem de R$ 50.

Limitações: o histórico de 6 anos inclui uma alta forte (2020–21), o que deixa o cenário histórico otimista. As taxas são estimativas de fontes secundárias. A arbitragem é uma foto de um instante, não uma série.
