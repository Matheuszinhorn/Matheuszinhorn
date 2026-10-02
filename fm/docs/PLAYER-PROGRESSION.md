# Força relativa e evolução dos jogadores

Camada: `game/manager/progression.ts`. Nada aqui altera o Engine 0.2.0: a força (1–50) continua sendo o único atributo
que a partida usa, e o engine já faz o jogador mais forte pesar mais em cada chance. Sem atributos ocultos e sem potencial
escondido.

## Força relativa à divisão

* A divisão **não limita** a força. Um jogador 30 pode estar na 4ª.
* "Força esperada" de uma divisão = **média real** dos elencos dela (`divisionMeans`). No mundo fictício atual
  (seed de exemplo): D1 ≈ 39, D2 ≈ 29, D3 ≈ 22, D4 ≈ 15–17. As referências da especificação (D1 ~44, D2 ~34, D3 ~22,
  D4 ~10) são de balanceamento; regerar o mundo para elas mudaria todos os placares, por isso não foi feito.
* Leitura (`relativeOf`): diferença para a média da divisão do clube.

| Diferença | Leitura |
| --- | --- |
| ≥ +8 | ⭐ Destaque da divisão |
| +3 a +8 | Acima da média |
| −3 a +3 | Na média |
| < −3 | Abaixo da média |

Exemplo: força 30 na 4ª (média ~16) = ⭐; força 30 na 1ª (média ~39) = abaixo da média.

**Destaque no mercado:** preço pedido até +30% e salário pedido até +15% (`starPremium`), além de pesar na renovação
(CONTRACTS.md). Isso não garante compra: a negociação segue a regra fixa (MARKET.md).

## Evolução

Dois **checkpoints** por temporada, cada um com passo **−1, 0 ou +1** (nunca mais que isso):

1. **Meio** — depois da rodada 19 (fim do 1º turno), para todos os clubes.
2. **Fim** — na virada, **antes** do acesso/rebaixamento.

Tendência (`evolutionScore`, valores pequenos):

| Fator | Efeito |
| --- | --- |
| Idade ≤ 21 / 22–24 / 25–29 / 30–32 / ≥ 33 | +0,6 / +0,3 / 0 / −0,3 / −0,6 |
| 6+ abaixo da média da divisão | +0,3 (o nível puxa para cima) |
| 6+ acima da média da divisão | −0,3 (adapta-se para baixo, devagar) |
| Jogou ≥ 50% das rodadas | +0,2 |
| Não jogou nenhuma (23+ anos) | −0,2 |
| Atacante/meia com gols ≥ 0,3 por rodada | +0,2 |
| Centro de treinamento (jovens até 23 do clube do treinador) | +0,3 por nível |

Probabilidade de subir = 12% + 60% × tendência; de cair = 12% − 60% × tendência (cada uma entre 2% e 85%). O sorteio é
um **hash estável** (seed da carreira + temporada + checkpoint + jogador): recarregar não muda nada.

### Acesso e rebaixamento

* Subiu: ninguém ganha força na hora. Ex.: 18 → começa a nova divisão com 18 → 19 no meio → 19/20 no fim...
* Caiu: ninguém perde força na hora. Ex.: 43 → começa com 43 → 42 → 42 → 41...
* Teste: na virada nenhum jogador muda mais de 1 ponto (`manager.test.ts`).

### Notícias

Cada checkpoint gera uma **Análise** para o clube do treinador com quem evoluiu e quem perdeu força (fato aplicado).

## Regressão

Até a rodada 19 a 1ª temporada joga **exatamente** as partidas da versão anterior. A partir da rodada 20 a força de parte
dos jogadores mudou (checkpoint do meio), então os placares das rodadas 20–38 diferem — por causa da evolução, não do
engine. Prova: com a evolução desligada (`FlowOptions.evolution = false`, só nos testes) os 38 × 40 placares são
idênticos aos da carreira sem gestão (`manager.test.ts`).
