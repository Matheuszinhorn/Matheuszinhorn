# Integrações financeiras e matriz de decisão (diretriz do proprietário "DEC-039"), 24/10/2026 15:26 BRT

## Auditoria de integrações (FATO)
| Item | Resultado |
|---|---|
| Conector oficial Binance / Coinbase no catálogo de conectores | **Não existe** (busca no catálogo de conectores) |
| API da Binance (`api.binance.com`), dados e conta | **HTTP 451**: "Service unavailable from a restricted location" (termos de elegibilidade da Binance). A Binance não atende o local de saída deste ambiente. **Não contornado** |
| Dados públicos da Binance (`data-api.binance.vision`, espelho oficial) | Funciona (preço e livro BTC/BRL) |
| Anúncios de campanhas da Binance (API pública do site) | Funciona |
| Coinbase: `api.exchange.coinbase.com` e `api.coinbase.com/v2/prices` | Funcionam (dados públicos) |
| Mercado Bitcoin, API pública | Funciona |
| Acesso autenticado a qualquer conta | **Nenhum.** Nenhuma conta está conectada |
| Agente externo com API oficial | Viável **fora deste ambiente**: a Binance bloqueia a negociação daqui. Exigiria chave só de leitura em variável de ambiente, rodando onde a corretora atende. Sem vantagem de trading demonstrada, não há motivo para construir |

## Testes executados (dados reais, 24/10)
- **Arbitragem BTC/BRL:** Binance (compra 402.409 / venda 402.410) × Mercado Bitcoin (402.579 / 402.580). A maior diferença foi de **0,042%**.
  - Em R$ 50: R$ 0,02 bruto e **−R$ 0,08 a −R$ 0,38** depois das taxas de negociação (cenários de 0,1% + 0,1% e 0,1% + 0,7%; as taxas são HIPÓTESES a conferir), **antes** da taxa de transferência de BTC entre corretoras. **Rejeitada.**
- **Trading à vista:** a simulação e o backtest de 21/10 (DEC-013, `analises/quant/`) não mostraram vantagem depois dos custos. Com R$ 50, até +20% ao ano seriam R$ 10. **Não é motor de receita.** Sem novas operações.
- **Campanhas Binance (anúncios oficiais):**
  - "Word of the Day", até 25/10 23:59 UTC: ≥ 5 acertos para dividir 3.000 USDC, **teto de 5 USDC por pessoa**, custo zero, jogada pelo titular no app.
  - Torneios de trading: exigem ≥ US$ 500 de volume em pares como PEPE/USDC; com R$ 50, isso significa girar o capital ≈ 50 vezes pagando taxa. **Rejeitados.**
  - "Binance Pick": restrito a "jurisdições elegíveis" (o Brasil não foi verificado).

## Matriz (1–5; 5 = melhor; em risco e dependência, 5 = menor)
| Oportunidade | Demanda | Acesso ao comprador | Tempo até a receita | Capital | Margem | Risco | Escala | Dependência | Total |
|---|---|---|---|---|---|---|---|---|---|
| **Piloto B2B: sites no celular (5 → 51 → ≈ 5.010 domínios)** | 4 (57 mil serviços do tipo no Fiverr; dor provada) | 4 (e-mail institucional) | 4 (dias) | 5 (R$ 0) | 5 (≈ 100%) | 5 | 4 | 2 (canal de e-mail) | **33** |
| Serviço no Fiverr | 4 | 3 (busca da plataforma; conta nova) | 3 (semanas) | 5 | 4 (−20% de comissão) | 5 | 4 | 2 (perfil) | 30 |
| Binance "Word of the Day" | 3 | — (não há venda) | 5 (até 25/10) | 5 | 1 (≤ 5 USDC) | 5 | 1 (pontual) | 2 (o titular joga) | 24 |
| Indicação Binance/Coinbase | 2 | 1 (sem audiência) | 2 | 5 | 3 | 4 | 3 | 2 | 22 |
| Trading à vista / arbitragem | 1 (sem vantagem medida) | — | 3 | 2 | 1 (negativa depois das taxas) | 1 | 2 | 2 | 12 |

- **Principal:** piloto B2B. **Alternativa:** Fiverr.
- **Ação opcional e pontual:** o "Word of the Day" (≤ 5 USDC, custo zero) só vale se o proprietário quiser jogar até 25/10. Não entra como receita até ser creditado.
