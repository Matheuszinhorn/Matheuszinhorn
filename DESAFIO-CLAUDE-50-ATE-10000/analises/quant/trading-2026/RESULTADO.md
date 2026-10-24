# Trading spot na Coinbase: auditoria e primeiro teste (diretriz do proprietário "DEC-045"), 24/10/2026 19:00 BRT

## Capacidade operacional (FATO, via conector Coinbase, somente leitura)
- **Ferramentas:**
  - mercado: products_list/get/ticker/best_bid_ask/book/candles;
  - taxas: fees;
  - preparação: orders_preview;
  - execução: orders_create/edit/cancel, convert_execute;
  - transferência: transfer, x402_pay (não serão usadas).
- **Permissões de escrita:** não testadas (nenhuma ordem enviada).
- **Pares:** BTC-USDC, ETH-USDC e SOL-USDC (e os pares em USD) online.
  - Ordem mínima: **1 USDC** (quote_min_size); incremento de base: 1e-8.
  - Spread em 24/10 ≈ 21:57 UTC: BTC 0,001%, ETH 0,0004%, SOL 0,01%.
- **Taxas da conta (nível Intro):** maker 0,09%, taker 0,10%.
- **Não há par em BRL.** A conta só tem caixa em BRL, que é do proprietário e fica fora do desafio. **Os R$ 50 do desafio não estão na Coinbase.** Para operar, seria preciso depositá-los e convertê-los em USDC/USD no app (custo de conversão não medido; o conector não converte BRL).

## Teste (código `backtest.py`, dados `*.csv` da API pública da Coinbase)
- **Dados:** BTC, ETH e SOL em USD; diário de 25/10/2022 a 24/10/2026 (1.461 barras) e 6 h de 24/10/2024 a 24/10/2026 (2.921 barras).
- **Regras:**
  - só compra (spot), sem alavancagem;
  - sinal no fechamento, execução na abertura seguinte;
  - custo de 0,12% por lado (0,10% de taxa + 0,02% de spread e slippage) e estresse a 0,30%.
- **Seleção** de parâmetros só nos 70% iniciais; avaliação nos 30% finais, fora da amostra.

| Resultado fora da amostra (24 combinações = 3 ativos × 2 tempos gráficos × 4 estratégias) | |
|---|---|
| Retorno líquido > 0 (melhor que ficar parado) | **8 de 24** |
| Melhor que comprar e segurar | 16 de 24, quase todos por **perder menos** num período de queda (comprar e segurar no diário: BTC −32%, ETH −45%, SOL −42%) |
| Estratégia positiva nos 3 ativos e nos 2 tempos gráficos | **nenhuma** |
| Tendência no diário: dentro → fora da amostra | +124% a +731% → **−3% a −24%** (sobreajuste ou mudança de regime) |
| Positivos no diário | RSI(2) em BTC (+3,7%, 6 operações) e ETH (+4,5%, 3 operações): amostra pequena demais para concluir qualquer coisa |
| Positivos em 6 h | BTC e ETH (tendência/momentum) e SOL (rompimento) num período de alta; vários desses parâmetros tinham sido **negativos** dentro da amostra. Não é evidência de vantagem |

Detalhe completo: `resultados.json`. As 267 operações simuladas fora da amostra estão em `operacoes-simuladas-fora-da-amostra.csv`.

## Limitações
- 4 anos de dados diários; poucas operações por combinação; o trecho fora da amostra é um só (sem validação deslizante).
- Slippage modelado de forma simples. Com R$ 50 (≈ US$ 10), o impacto no livro é desprezível, mas o custo de converter BRL→USDC não foi incluído.
- Escolher "o melhor de 24" já é sobreajuste; o número de testes não foi corrigido estatisticamente.

## Decisão
**Não há vantagem demonstrável. Nenhuma ordem real.** Pela regra do proprietário, não serão inventados sinais de compra.

Ganho esperado em escala (ESTIMATIVA): mesmo +10% num ano sobre R$ 50 = **R$ 5**, menos o custo de conversão.
