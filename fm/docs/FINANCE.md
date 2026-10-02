# Finanças

Duas camadas:

1. **Engine (sem mudança)** — `engine/finance.ts`: bilheteria (público × ingresso da divisão), cota de TV, salários e
   manutenção por lugar, fechados UMA vez por rodada em `settleRound`.
2. **Gestão** — `game/manager/finance.ts` e `flow.ts`: patrocínio, empréstimos bancários, premiação, receitas extras do
   estádio, transferências e obras. Cada lançamento vira uma linha do extrato extra (`ExtraLine`) e muda `Club.money`.

## Público (dinâmico)

`attendanceFor` (camada de jogo): ocupação base pela divisão e reputação, ajustada pela forma (últimos 5 jogos), posição
na tabela, peso do adversário, rivalidade (mesma cidade) e melhorias do estádio; limitada à capacidade. O valor
substitui `fixture.attendance` **antes** de criar a rodada. O engine só guarda o público e a bilheteria o usa: nenhuma
chance de gol depende dele (verificado no código e por teste: placares idênticos com e sem o público dinâmico).

## Situação

| Ícone | Situação | Regra |
| --- | --- | --- |
| 🟢 | Saudável | caixa ≥ 8 folhas e dívida ≤ caixa |
| 🟡 | Atenção | caixa < 8 folhas ou dívida > caixa |
| 🟠 | Alerta | caixa < 3 folhas ou dívida > 2× caixa |
| 🔴 | Crítico | caixa negativo |

## Empréstimo bancário

* Limite: `R$ 250 mil × escala da divisão (D4 1, D3 2, D2 5, D1 12) × (0,6 + reputação/100) − dívida`; caixa negativo = 0.
* Prazos de 10, 19 ou 38 rodadas; juros totais de 6%, 10% ou 16%, +3 pontos em Atenção e +7 em Alerta. Crítico: negado.
* Parcela por rodada, descontada no fechamento da rodada; QUITAR paga o restante de uma vez.
* **Dinheiro do jogo apenas.** Empréstimo, patrocínio ou caixa nunca podem ser comprados com dinheiro real ou moeda
  premium (ver MONETIZATION.md).

## Patrocínio

Três propostas por temporada (`sponsorOffers`): uma **segura** (sem meta), uma com meta de posição (top 8; top 10 na 1ª
divisão) e bônus de 50% da base, e uma **arriscada** (acesso; top 4 na 1ª) com bônus de 120%. Valor pago em 38 parcelas
(a última fecha o arredondamento). O bônus entra no fim da temporada se a meta for cumprida.

## Premiação

Fim da temporada, para todos os clubes: o campeão leva o valor cheio da divisão (D1 R$ 5 mi, D2 R$ 1,5 mi, D3 R$ 500 mil,
D4 R$ 150 mil); o 20º leva 5% dele, linear entre os dois.
