# Mercado

Camada: `game/manager/market.ts` (regras) e `game/manager/actions.ts` (ações do treinador). Tela: **MERCADO** e o perfil do
jogador. Nada aqui muda o Engine 0.2.0: o mercado só troca jogadores de clube **fora da rodada**.

## Janela de transferências

| Período | Situação |
| --- | --- |
| Rodadas 1–6 (a próxima a jogar) | aberta |
| Rodadas 19–24 | aberta |
| Intertemporada (depois da 38ª, antes de INICIAR TEMPORADA) | aberta |
| Demais rodadas | fechada (indicador vermelho; negociações em aberto caem quando ela fecha) |

Jogador **livre** (sem clube) pode ser contratado com a janela fechada. Durante a rodada nenhuma ação de mercado é aceita.

## Busca

Filtros: nome ou clube, posição, divisão (ou "sem clube"), idade máxima, preço máximo, lista de desejos. Ordem: força,
depois preço. Na primeira visita a busca começa na divisão do clube do treinador.

## Preço pedido (regra fixa)

`preço = valor de mercado × fator`, arredondado a R$ 5 mil (mínimo R$ 5 mil):

| Fator | Quando |
| --- | --- |
| 1,35 / 1,10 / 0,90 | o jogador está entre os 11 / 12–16 / demais mais fortes do clube dono |
| × 1,15 | personalidade LEAL |
| × 0,95 | AMBICIOSO e o comprador está numa divisão acima |
| × 0,85 | clube dono com caixa negativo |

## Proposta e contraproposta (determinístico, sem IA)

`evaluateOffer(pedido, oferta, tentativas)`:

1. oferta ≥ pedido → **aceita** (transferência imediata);
2. oferta ≥ 75% do pedido → **contraproposta** = 2/3 do caminho entre a oferta e o pedido (R$ 5 mil);
3. abaixo → **recusa** ("muito abaixo" se < 50%);
4. na 3ª tentativa sem acordo o clube **encerra** a negociação.

Antes da conversa com o clube, o **jogador** decide se aceita o destino (`playerAccepts`): AMBICIOSO não desce de divisão,
COMPETITIVO não vai para clube com reputação 15+ abaixo, LEAL não cai duas divisões. Também valem: elenco do comprador
até 32, elenco do vendedor com pelo menos 16 e 2 goleiros, caixa suficiente.

Na compra o jogador chega com o salário que pede (`salaryDemand`: LEAL/JOVEM +5%, COMPETITIVO +15%, AMBICIOSO +20%,
FINANCEIRO +30%, VETERANO igual) e contrato de 1–3 temporadas conforme a personalidade e a idade.

## Empréstimo

* **Pedir emprestado**: o clube dono só libera quem está fora dos seus 16 mais fortes e se ficar com 18+. Taxa de 10%
  do valor; o treinador paga o salário até o fim da temporada (ou da seguinte, se pedido na intertemporada).
* **Emprestar**: um jogador do elenco vai para o clube da mesma divisão (ou da de baixo) com o elenco mais curto, que
  paga o salário; volta na virada da temporada.

## Venda por leilão

O treinador põe um jogador em leilão com lance mínimo ≥ 50% do valor. O leilão fecha depois da próxima rodada (ou na
virada, se aberto na intertemporada). Dão lance os clubes com caixa (40% do caixa ≥ lance mínimo), elenco < 32 e para
quem o jogador seria titular; cada um com um teto (`min(40% do caixa, 1,6 × valor)`) e uma decisão vinda da seed do
leilão. Vence o maior lance; sem lances, o jogador fica.

## Lista de desejos

Marcação livre (★) em qualquer jogador de outro clube ou livre. Não gera proposta automática.

## Mundo vivo

Na virada da temporada a CPU contrata: os 8 mais fortes de cada divisão de baixo têm 50% de chance de subir para um clube
da divisão de cima que pague 3× a taxa; clubes de elenco curto contratam livres; a base repõe quem ficar com menos de 18.
