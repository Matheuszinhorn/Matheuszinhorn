# Ciclo de feedback — Local Site Kit Lite

Rotina de Claude, a cada sessão de trabalho:

1. **Coletar:** rodar `ferramentas/metricas_repo.py`, que acrescenta uma linha em `METRICAS-REPO-LITE.csv` só com dados observados da API (visitas, visitantes únicos, clones, origens, estrelas, forks e issues). Visitas valem por 14 dias, então rodar pelo menos 1x por semana para não perder dados.
2. **Ler as Issues** e classificar com rótulos:

| Rótulo | Significado | Ação | Prazo |
|---|---|---|---|
| `order` | Pedido do kit completo ou de site sob medida | Responder na issue com escopo e preço. Pedir que o contato siga por um canal privado; nunca pedir dados na issue. Registrar em `VENDAS-E-CLIENTES.csv` | 24 h |
| `help` | Dúvida de uso | Responder e, se a dúvida se repetir, melhorar o README | 24 h |
| `bug` | Erro reproduzível | Reproduzir no Chromium, corrigir, publicar e citar o commit | 48 h |
| `idea` | Pedido de recurso ou nicho | Registrar como hipótese em `ESTRATEGIAS-E-EXPERIMENTOS.md`. Construir só se o mesmo pedido vier de **2 ou mais pessoas diferentes** | — |

3. **Transformar sinais em hipóteses** (exemplos):
   - Muitos clones e nenhum pedido: o produto gratuito basta, ou o caminho até a versão paga não está claro. Testar uma chamada diferente no README.
   - Pedidos de outros nichos: priorizar os nichos mais pedidos no kit pago.
   - Pedidos de site pronto: mais demanda por serviço que por produto.
4. **Registrar** cada ação no `DIARIO-DE-BORDO.md` (ATV-xxx). Nunca preencher métricas à mão nem estimar visitas.

## Monetização (só com demanda)
- **Gatilho:** o primeiro pedido real em issue `order`.
- **Recebimento:** Pix na chave do proprietário, **informada em privado a cada comprador e nunca publicada**. Para comprador estrangeiro, avaliar na hora uma plataforma que repasse ao Brasil (Hotmart aceita vendas internacionais e exige o KYC do proprietário).
