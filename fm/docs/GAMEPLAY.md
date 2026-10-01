# Gameplay

Como o jogo funciona hoje, do início da carreira à temporada seguinte. Os números vêm do Engine 0.2.0
([ENGINE.md](ENGINE.md)) e da camada de carreira (`game/career.ts`).

## Início de carreira

1. Na tela inicial, o jogador digita o nome do treinador e toca em **RECEBER PROPOSTAS DE CLUBE**.
2. Aparecem **3 propostas de clubes diferentes, todos da 4ª divisão**, com estádio, caixa e força.
   **SORTEAR OUTRAS PROPOSTAS** gera outro trio (outro mundo).
3. Ao aceitar um clube, a carreira começa na temporada 2026, rodada 1, e é salva.

Se já existe uma carreira salva, a tela inicial oferece **CONTINUAR CARREIRA**. Um save corrompido ou de outra
versão não é oferecido: a tela avisa e permite começar outra carreira.

## Elenco e jogadores

Cada clube tem 24 jogadores: 3 goleiros, 8 defensores, 8 meias e 5 atacantes. Cada jogador tem força (1 a 50),
posição natural, temperamento (Calmo, Normal ou Explosivo), idade, salário e valor.

## MEU TIME (antes da rodada)

- **Campo:** 11 titulares desenhados com o gol embaixo e o ataque em cima. Tocar em um jogador e depois em outro
  (no campo ou na lista do elenco) troca os dois: dois titulares trocam de posição; um jogador de fora assume a
  posição do titular, que vai para o banco. Jogador fora da sua posição natural aparece com borda tracejada e
  rende menos.
- **Formação:** 4-4-2, 4-3-3, 3-5-2, 5-3-2, 4-5-1, 3-4-3, 5-4-1 ou 4-2-4.
- **Estilo:** Defensivo, Equilibrado ou Ofensivo.
- **Comportamento:** Normal, Agressivo ou Reativo.
- **Batedor de pênalti:** um jogador de linha, ou "Automático" (o mais forte em campo).
- **MELHOR TIME:** monta a melhor escalação disponível.
- Toda escalação é validada pelo engine antes de valer (exatamente um goleiro, sem repetidos).
- Se um titular escolhido estiver lesionado ou suspenso na rodada, a escalação é refeita automaticamente com a
  mesma formação, estilo e comportamento, e a tela avisa.

## Posições

O desempenho depende do setor em que o jogador atua: na posição natural, 100%; em setor vizinho
(defesa↔meio, meio↔ataque), 80%; em setor distante (defesa↔ataque), 60%; jogador de linha no gol (ou goleiro na
linha), 30%.

## A rodada

1. Na tela PARTIDA, antes da rodada: confronto, força dos dois times, velocidade e os jogos da rodada.
2. **JOGAR RODADA** inicia as 40 partidas ao mesmo tempo, minuto a minuto.
3. A tela mostra o placar e o relógio do jogo do clube, os **LANCES** (gols, cartões, expulsões, lesões, pênaltis,
   substituições, defesas, bolas na trave) e o quadro **JOGOS DA RODADA** com todos os placares ao vivo.
4. **PAUSAR / CONTINUAR** param e retomam a rodada. Consultar **CLUBES** durante a rodada também pausa; sair retoma.
5. Ao fim das 40 partidas, a rodada é aplicada uma única vez: resultados, classificação, finanças, lesões e
   suspensões.
6. A tela de resultado mostra o placar final, os gols, as finanças da rodada e a posição na tabela.
   **PRÓXIMA RODADA** volta para "antes da rodada".

Antes de cada jogo, a CPU escolhe o estilo de cada clube que controla: Ofensivo se for ao menos 10% mais forte,
Defensivo se for ao menos 10% mais fraco, senão Equilibrado.

## Velocidades

| Velocidade | Ritmo |
|---|---|
| LENTA | 1 minuto de jogo por segundo |
| NORMAL | 1 minuto a cada 0,5 s |
| RÁPIDA | 1 minuto a cada 0,25 s |
| MUITO RÁPIDA | 1 minuto a cada 0,1 s |
| INSTANTÂNEA | sem espera: corre até a próxima decisão ou o fim |

A velocidade muda só o ritmo da tela, nunca o resultado. Em todas, inclusive na instantânea, uma decisão
obrigatória **para a rodada inteira** até ser resolvida. A escolha fica salva no navegador.

## Decisões durante a partida

Só no jogo do clube do jogador. Aparece **um pop-up por vez**, a rodada fica parada, e tocar fora do pop-up ou
apertar ESC não o fecha. Se duas coisas acontecem no mesmo minuto, as decisões entram em fila e aparecem uma
depois da outra. Cada pop-up oferece a escolha do jogador e **ACEITAR SUGESTÃO** (a mesma política da CPU).

| Decisão | Quando | O que o jogador escolhe |
|---|---|---|
| **Pênalti para o seu time** | Pênalti marcado a favor | O cobrador, entre os que estão em campo, com a chance estimada de conversão de cada um. O batedor do MEU TIME vem como SUGERIDO. |
| **Lesão** | Um jogador se lesiona | O reserva que entra no lugar dele. Sem troca possível, o time segue com um a menos. |
| **Expulsão** | Um jogador de linha é expulso | Estilo, comportamento e substituições para jogar com um a menos. |
| **Goleiro lesionado** | O goleiro se lesiona | Com goleiro reserva: quem entra. Sem goleiro reserva: o reserva que entra e quem vai para o gol. Sem trocas: o jogador de linha que vai para o gol. |
| **Goleiro expulso** | O goleiro é expulso | Com goleiro reserva: o goleiro que entra e o jogador de linha que sai. Sem goleiro reserva ou sem trocas: o jogador de linha que vai para o gol. Também estilo e comportamento. |
| **MEU TIME** | Botão MEU TIME na tela PARTIDA | Estilo, comportamento, substituições, formação e troca de posições. CANCELAR volta sem mudar nada. |

- Com uma decisão obrigatória aberta, o MEU TIME não abre: a decisão tem prioridade.
- Mudanças feitas durante a partida valem só para aquele jogo; a escalação salva é a do MEU TIME antes da rodada.
- Durante a rodada, a aba MEU TIME mostra o campo real do jogo apenas para consulta.

## Pênaltis

A cobrança acontece no minuto seguinte ao da marcação. A chance de gol depende da força do cobrador e do goleiro
(entre 55% e 92%); um pênalti perdido é defendido em 60% dos casos, senão vai para fora. Marcado no último minuto,
o jogo ganha um minuto extra só para a cobrança.

## Lesões

O jogador lesionado sai na hora. A lesão dura 1 rodada (60% dos casos), 2 a 3 rodadas (30%) ou 4 a 8 rodadas (10%).
O goleiro se lesiona com menos frequência que os jogadores de linha. Lesionado não pode ser escalado até se
recuperar.

## Cartões e expulsões

- Defensores recebem mais cartões que meias, e meias mais que atacantes; o goleiro raramente. Temperamento
  Explosivo aumenta a chance, Calmo diminui. Comportamento Agressivo aumenta os cartões do próprio time;
  Reativo diminui.
- Segundo amarelo na mesma partida = expulsão. Também há vermelho direto.
- Expulso sai na hora e não volta; o time joga com um a menos.
- **Suspensão:** vermelho = 1 rodada de suspensão. 3 amarelos acumulados = 1 rodada. O acumulado de amarelos
  zera na virada da temporada.

## Goleiro

Em campo há sempre exatamente um goleiro. Se o goleiro sai (lesão ou expulsão), um goleiro reserva entra quando
possível; senão, um jogador de linha vai para o gol e rende só 30%.

## Substituições

Até **5 substituições** por partida, com até 7 reservas no banco. Quem sai não volta. A troca é feita nos pop-ups
de lesão, de expulsão e de MEU TIME.

## Fim de partida

A partida tem 90 minutos mais acréscimos (0 a 3 no 1º tempo, 2 a 6 no 2º, aumentando com gols, lesões,
substituições e expulsões, até 8). Ela só termina depois que todas as decisões dos acréscimos foram resolvidas.

## Fim de temporada

Depois da rodada 38, a tela mostra **FIM DE TEMPORADA**: a posição final do clube, se subiu, caiu ou ficou, o
saldo financeiro da temporada e os campeões das quatro divisões. A carreira fica salva nesse ponto.

## Classificação, acesso e rebaixamento

- Vitória 3 pontos, empate 1, derrota 0.
- Desempate: pontos → vitórias → saldo de gols → gols pró → confronto direto → sorteio com a seed.
- Entre cada par de divisões vizinhas, os 4 primeiros sobem e os 4 últimos descem; a 1ª divisão não sobe e a 4ª não
  cai.

## Nova temporada

**INICIAR TEMPORADA** aplica acesso e rebaixamento, gera o calendário novo da temporada, zera resultados, extrato e
amarelos acumulados, mantém o histórico das temporadas anteriores e volta para a rodada 1.

## Finanças

| Divisão | Ingresso | Cota de TV por rodada |
|---|---|---|
| 1ª | R$ 40 | R$ 350.000 |
| 2ª | R$ 25 | R$ 160.000 |
| 3ª | R$ 15 | R$ 50.000 |
| 4ª | R$ 8 | R$ 18.000 |

- Público = capacidade do estádio × (30% + 0,5% × reputação), até 100%. Bilheteria só para o mandante.
- Toda rodada: salários do elenco inteiro e manutenção de R$ 1 por lugar do estádio.
- O caixa pode ficar negativo. Não há premiação de fim de temporada.
