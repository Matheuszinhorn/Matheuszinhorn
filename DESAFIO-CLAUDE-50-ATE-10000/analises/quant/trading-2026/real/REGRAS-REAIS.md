# Regras de operação real (DEC-048, 26/10/2026 00:55 BRT)

**Origem:** autorização permanente do proprietário, dada em 26/10/2026. Texto: "você tem liberdade, aprovação de operar a qualquer momento com intuito de usando valores disponíveis a qualquer momento. Sempre com intuito do lucro."

## Limites que continuam valendo (DEC-039 e DEC-046)
- Só mercado à vista (spot). Nada de futuros, margem, alavancagem ou empréstimos.
- Nenhuma transferência, saque ou conversão para fora da Coinbase.
- Só o saldo do bônus (FIN-002). Os R$ 50 do desafio estão fora da Coinbase e não entram sem novo depósito do proprietário.
- **Nunca o capital inteiro numa operação.**

## Regras operacionais (fixadas antes da 2ª operação)
1. **Sinal:** só entra operação gerada por regra testada fora da amostra.
   - Hoje vale apenas a R2: RSI(2) diário < 10 com fechamento acima da SMA(200); saída quando o fechamento passa da SMA(5).
   - Notícia ou impulso (eleição, por exemplo) não gera ordem.
2. **Tamanho:** no máximo 1 posição aberta, de até ≈ 60% do saldo.
   - O mínimo da Coinbase é de 1 USDC por ordem, inclusive para vender.
   - Por isso, cada compra deixa margem para vender mesmo com queda de até ≈ 20%.
3. **Ativos:** só BTC-USDC e ETH-USDC.
4. **Execução:** antes de cada ordem, uma prévia (taxa e escorregamento). Se a taxa passar de 0,6% ou o escorregamento de 0,5%, a ordem é cancelada.
5. **Proteção do saldo:** se o valor total (USDC + posição) cair abaixo de 1,60 USDC (≈ −22% sobre 2,051824), zerar a posição, parar e avisar o proprietário.
6. **Registro:** toda ordem vai para o `operacoes-reais.csv`, o CONTROLE-FINANCEIRO (FIN-xxx) e o DIARIO, e o proprietário é avisado.
7. **Revisão:** a decisão das 72 h (27/10) e a de 20/12 podem suspender a R2 se os resultados reais e simulados contradisserem o backtest.

## Expectativa honesta
- No backtest, a R2 deu +9,5% no BTC e +21,5% no ETH fora da amostra, com amostra pequena (13 e 8 operações).
- A classificação preliminar continua B: ainda não há vantagem estatisticamente demonstrada.
- Lucro não é garantido.
