# Verificação do conector Coinbase (diretriz do proprietário "DEC-040"), 24/10/2026 15:41 BRT

Nenhum token, credencial, identificador de conta ou saldo pessoal é registrado aqui.

## Situação da conexão (FATO)
- **Conector "Coinbase"** (claude.ai, servidor `agents.coinbase.com/mcp`): **conectado e autenticado**. As chamadas de leitura funcionaram.
- **Registro local "coinbase"** (`claude mcp add`, feito no container em 24/10): continua sem autenticação e é redundante. O conector usado é o do claude.ai.
- **Escopos que o servidor anuncia** (metadados OAuth públicos): portfolios:read/update, accounts:read, orders:read/create/delete, trades:read/create, **transfers:create**, products:read.
- **Permissões efetivas de escrita:** **não verificadas**, de propósito. Testá-las exigiria tentar uma operação. A instrução do próprio servidor diz que o usuário "autorizou negociar" e que ordens pedidas devem ser executadas numa só chamada. **Claude não seguirá isso sem o plano exigido pela DEC-039/040.**

## Ferramentas (31) por classe
| Classe | Ferramentas |
|---|---|
| **Leitura** | balance, fees, portfolios_list, portfolios_get, products_list, products_get, products_ticker, products_best_bid_ask, products_book, products_candles, products_funding_history, orders_list, orders_get, orders_fills, convert_get, x402_resources |
| **Preparação (não executa)** | orders_preview, orders_edit_preview, convert_quote (só USD↔USDC) |
| **Execução de operação** | orders_create, orders_edit, orders_cancel, orders_close_position, convert_execute, portfolios_create, portfolios_edit, portfolios_delete |
| **Transferência / pagamento** | transfer (entre portfólios, executa na hora), x402_pay (pagamento em USDC na Base; desativado por padrão segundo a descrição), x402_fetch |
| Outros | feedback_submit |

## Leituras feitas (só leitura)
- **Portfólios:** 1 (padrão). Ordens: 0. Criptoativos: 0.
- **Saldo:** só caixa em reais. É dinheiro **do proprietário, fora do capital do desafio** (os R$ 50 estão separados). Não é contado nem usado.
- **Taxas spot (nível Intro):** maker 0,09%, taker 0,10%; volume de 30 dias: 0.
- **Produtos negociáveis com BRL:** **0** (`products_list symbol=BRL` vazio). Reais na conta **não** podem ser negociados por este conector sem antes virar USD/USDC por outro caminho (app ou Pix), com custo não medido aqui.
- **Operações executadas:** 0. Prévias: 0 (não havia par em BRL para estimar).

## Comparação com alternativas de baixo custo
| Fonte | Evidência | Custo / risco | Veredito |
|---|---|---|---|
| Trading spot na Coinbase | Sem vantagem demonstrada (DEC-013; arbitragem de −R$ 0,08 a −R$ 0,38 em 24/10); sem par em BRL | Taxa de 0,1% por lado + custo de conversão BRL→USD não medido | **Não operar** |
| Indicação da Coinbase | Página oficial: o bônus varia por país, é pago depois de a pessoa indicada comprar, e alguns países são excluídos. **Valor para o Brasil não confirmado** | Exige audiência | Baixa prioridade |
| Binance "Word of the Day" | Teto de 5 USDC por pessoa, até 25/10 UTC | Zero; o titular joga | Opcional e pontual |
| **Piloto B2B (5 e-mails)** | Dor provada em navegador; serviços semelhantes vendem no Fiverr | Zero; ≈ 100% de margem | **Principal** (aguarda canal e aprovação) |

## Plano mínimo, se um dia houver motivo para operar (não aprovado; nada será executado)
- Só spot, sem margem nem derivativos.
- Teto por operação: R$ 10. Perda máxima acumulada: R$ 15.
- Ordem sempre precedida de `orders_preview` com taxa e slippage registrados no livro-caixa.
- **Nunca** usar `transfer` nem `x402_pay`.
- Pré-condição: uma estratégia com vantagem líquida demonstrada fora da amostra, hoje inexistente.
