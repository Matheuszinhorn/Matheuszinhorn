# Estádio

Camada: `game/manager/stadium.ts`. Tela: **ESTÁDIO**. Obras têm custo (pago na hora), prazo (rodadas) e benefício.
No máximo 2 obras ao mesmo tempo. Nenhuma obra afeta o resultado das partidas.

| Obra | Níveis | Custo/nível | Prazo | Benefício por nível |
| --- | --- | --- | --- | --- |
| Arquibancadas | 5 | R$ 450 mil | 6 | +1.500 lugares (mais manutenção: R$ 1/lugar/rodada) |
| Gramado | 3 | R$ 120 mil | 3 | +2 pontos de ocupação |
| Iluminação | 2 | R$ 150 mil | 3 | +2 pontos de ocupação |
| Segurança | 3 | R$ 100 mil | 2 | +2 pontos de ocupação |
| Acessos | 2 | R$ 180 mil | 4 | +3 pontos de ocupação |
| Conforto | 2 | R$ 200 mil | 4 | +3 pontos de ocupação |
| Estacionamento | 2 | R$ 120 mil | 3 | +R$ 0,80 por torcedor em casa |
| Alimentação | 3 | R$ 90 mil | 2 | +R$ 1,50 por torcedor em casa |
| Loja do clube | 3 | R$ 110 mil | 3 | +R$ 1,20 por torcedor em casa |
| Área VIP | 2 | R$ 250 mil | 5 | +R$ 4.000 por jogo em casa |
| Centro de treinamento | 2 | R$ 400 mil | 8 | jogadores de até 23 anos evoluem +1 na virada |

* Mais lugares não garantem mais público: a ocupação depende do time, do adversário e das obras de conforto.
* A obra fica pronta quando a rodada `início + prazo` é aplicada; aí a capacidade (arquibancada) ou o nível muda.
* Ao trocar de clube, as obras pertencem ao clube antigo.
