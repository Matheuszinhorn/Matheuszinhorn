# Contratos

Camada: `game/manager/contracts.ts`. Tela: perfil do jogador (MEU TIME → Elenco e estatísticas → jogador).

* `Player.contract.endSeason` é a última temporada do contrato (dado do mundo, já existente).
* O ELENCO marca **CONTRATO VENCE** quando `endSeason ≤ temporada atual`.
* Na virada da temporada, jogador do treinador com contrato vencido e **sem renovação** sai livre. A CPU renova os
  seus automaticamente (1 a 3 temporadas).

## Renovação (regra fixa, guiada pela personalidade)

`openTalk` define o pedido do jogador:

| Personalidade | Salário pedido | Mínimo aceito | Temporadas |
| --- | --- | --- | --- |
| Leal | +5% | 85% do pedido | 3 |
| Ambicioso | +30% | 92% | 2 |
| Financeiro | +40% | 97% | 2 |
| Competitivo | +15% | 90% | 2 |
| Jovem buscando minutos | +10% | 90% | 3 |
| Veterano buscando estabilidade | igual | 90% | 2 (33+ anos: 1) |

`proposeRenewal(salário, anos)`: prazo diferente do pedido custa 5% por ano de diferença (10% para jovem e veterano).
Salário ≥ pedido → acordo. Entre o mínimo e o pedido → contraproposta (o pedido cai para a média) e, a partir da 2ª
tentativa, acordo. Abaixo do mínimo → recusa. **Três tentativas sem acordo** e a conversa acaba: o jogador sai quando o
contrato terminar. Nenhuma IA participa: o mesmo pedido no mesmo estado dá sempre a mesma resposta.

O contrato renovado vai até `max(fim atual, temporada atual + anos)`.

## Personalidades

`personalityOf(seed, jogador)`: 21 anos ou menos pode ser JOVEM, 32 ou mais pode ser VETERANO; os demais saem de um hash
estável do id (LEAL, AMBICIOSO, FINANCEIRO, COMPETITIVO). Não é atributo esportivo: a força continua sendo a única coisa
que o engine usa.

## Contexto da renovação (etapa Força + Economia)

O pedido parte da personalidade e recebe ajustes fixos, todos vindos do estado real do jogo (`TalkContext`):

| Situação | Ajuste |
| --- | --- |
| Destaque da divisão (força acima da média) | até +15% |
| Titular (jogou ≥ 60% das rodadas) | +5% |
| Insatisfeito (jovem, competitivo ou ambicioso com < 30% de jogos depois de 8 rodadas) | +10% |
| Contrato ainda não vence nesta temporada | −5% (sem pressa) |
| Financeiro, com o clube em situação crítica | +5% |

**Satisfação** (`satisfaction`): mostrada no perfil (🙂/😠). Não é atributo oculto: sai dos jogos da temporada e da
personalidade. A tela negocia salário **por temporada**; o valor é convertido para por rodada (÷ 38) ao enviar.
