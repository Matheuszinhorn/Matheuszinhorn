# Engine 0.2.0

O engine é a camada que simula partidas e temporadas. É determinístico, não conhece interface e está **fechado**:
nenhum valor abaixo deve ser recalibrado sem uma nova versão (`engineVersion`). Os valores vêm de
`engine/config.ts` (`DEFAULT_CONFIG`). A especificação completa, com a derivação de cada fórmula e o histórico da
calibração (validação em 40.000 partidas), está no documento técnico "Football Manager — Especificação do Motor"
(revisão 76). Em caso de dúvida, vale o código.

## Versão e histórico curto

| Versão | O que mudou |
|---|---|
| 0.1.1 | Fim de partida: decisão em 90+ não é mais descartada; nunca termina sem goleiro. Nenhuma constante mudou. |
| 0.2.0 | Calibração de gols: curva sat c = 2, `chancesBase` 4,75, camada de qualidade (h = 1,0), mando 1,25. Partidas do 0.1.x não se reproduzem mais. |

## Valores oficiais

| Parâmetro | Valor |
|---|---|
| `engineVersion` | 0.2.0 |
| `chancesBase` | 4,75 chances por time por partida (base) |
| `chanceCurveC` | 2 → f(r) = 3r ÷ (r + 2) |
| `quality.enabled` | sim |
| `quality.conversions` (baixa, média, alta) | 0,20 / 0,32 / 0,50 |
| `quality.baseShares` | 35% / 35% / 30% |
| `quality.degradedShares` | 50% / 50% / 0% |
| `quality.h` | 1,0 |
| `midfieldShare` | 0,5 |
| `conversionBase` | 0,33 |
| `gkFactorBase` / `gkFactorSlope` | 1,2 / 0,4 |
| `minExpectedGoals` / `maxExpectedGoals` | 0,15 / 6,0 por time por partida |
| Resultado de chance sem gol | 55% defesa, 10% trave, resto para fora |
| `scorerWeights` | ATA 3,0 · MEI 1,5 · DEF 0,5 · GOL 0 |
| `homeAdvantage` | 1,25 |
| `positionFactor` | mesma 1,00 · vizinha 0,80 · distante 0,60 · gol↔linha 0,30 |
| Estilo (próprias / do rival) | Defensivo 0,85 / 0,80 · Equilibrado 1,00 / 1,00 · Ofensivo 1,15 / 1,15 |
| Agressivo | chances do rival × 0,92 · cartões × 1,6 · pênaltis cometidos × 1,3 · lesões causadas × 1,3 |
| Reativo | chances × 1,15 contra ofensivo, × 0,90 contra defensivo · cartões × 0,8 |
| Pênaltis | 0,14 por time por partida; conversão 0,76 + 0,15 × (batedor − goleiro) ÷ 50, entre 0,55 e 0,92; erro: 60% defendido |
| Lesões | 0,12 por time por partida; peso do goleiro 0,3 |
| Cartões | amarelo 2,2 e vermelho direto 0,05 por time por partida |
| Peso de cartão por setor | DEF 1,5 · MEI 1,2 · ATA 0,8 · GOL 0,2 |
| Peso de cartão por temperamento | Calmo 0,6 · Normal 1,0 · Explosivo 1,8 |
| Acréscimos | 1º tempo 0–3, 2º tempo 2–6, + 0,5 por evento de parada, máximo 8 |
| `matchMinutes` | 97 (probabilidade por minuto = taxa por partida ÷ 97) |
| `maxSubs` / `maxBench` | 5 / 7 |

## Força

- Cada jogador tem força de 1 a 50 e uma posição natural (GOL, DEF, MEI, ATA).
- **Força efetiva** = força × fator de posição do setor em que joga (tabela acima).
- **Totais por setor** = soma (não média) das forças efetivas em campo.
- **Ataque** = ATA + 0,5 × MEI. **Defesa** = DEF + 0,5 × MEI.
- **Força geral** = média da força efetiva em campo. Usada pela tela, pela CPU e pela camada de qualidade.

## Chances e gols

Por time e por partida (recalculado a cada minuto com o estado do início do minuto):

```
chances = 4,75 × f(ataque ÷ defesa do rival) × mando (1,25 só para o mandante)
          × estilo próprio × fator do estilo do rival × comportamento
conversão = 0,33 × (1,2 − 0,4 × goleiro do rival ÷ 50)     → 0,33 com goleiro 25
```

- Gols esperados (chances × conversão) ficam entre 0,15 e 6,0; o ajuste mexe nas chances, não na conversão.
- Em cada minuto, a chance existe com probabilidade chances ÷ 97.
- **Qualidade (0.2.0).** X = max(0, força geral ÷ força geral do rival − 1). A parcela de chances que existiria com
  força igual mantém a distribuição 35/35/30; das chances adicionais do favorito, a fração X ÷ (X + 1,0) é degradada
  (50/50/0). A conversão da chance é a da sua categoria (0,20 / 0,32 / 0,50) × o fator do goleiro.
- Autor do gol: sorteado entre quem está em campo, peso = força efetiva × peso do setor.

## Cartões, expulsões, lesões e pênaltis

- **Cartões.** Amarelo com probabilidade 2,2 × fator de comportamento ÷ 97 por minuto; quem recebe é sorteado pelo
  peso setor × temperamento. Segundo amarelo do mesmo jogador = expulsão (`second_yellow`). Vermelho direto:
  0,05 × fator ÷ 97 por minuto (`direct`).
- **Lesões.** 0,12 por partida (× 1,3 se o rival é agressivo); o goleiro tem peso 0,3. Duração: 1 rodada (60%),
  2–3 (30%), 4–8 (10%).
- **Pênaltis.** 0,14 por partida (× 1,3 se o rival é agressivo); um pendente por vez. A cobrança acontece no início do
  minuto seguinte ao da marcação; marcado no último minuto, o jogo ganha um minuto extra só para a cobrança.
- Expulso ou lesionado sai de campo na hora; a vaga que deixou fica registrada para o substituto.

## Tempo e acréscimos

- Relógio: 1'…45', 45+1'…45+n', 46'…90', 90+1'…90+n'. Cada `step` joga exatamente 1 minuto.
- Acréscimo definido aos 45' e aos 90' (canal `STOPPAGE`): base sorteada + 0,5 por gol, gol de pênalti, lesão,
  substituição ou expulsão do tempo, no máximo 8. Depois de definido, não muda.
- A partida só termina (`FINISHED`) quando o relógio passou do último minuto **e** não há decisão pendente.

## Ordem de um minuto

1. Cobrança de pênalti pendente.
2. Cartões (mandante, visitante), lesões, pênalti marcado, chances (mandante, visitante). Todas as taxas usam o
   estado do início do minuto; mudanças valem a partir do minuto seguinte.
3. Posse, acréscimo (aos 45'/90'), avanço do relógio.
4. Decisões geradas no minuto, na ordem dos eventos; a que restaura o goleiro do time passa à frente das outras do
   mesmo time (assim nunca se valida um time sem goleiro).
5. Verificação de fim de partida.

## Máquina de estados

| Estado | Significado |
|---|---|
| `RUNNING` | O relógio pode avançar. |
| `AWAITING_DECISION` | Há uma decisão aberta do clube controlado: o relógio não avança até um comando válido. |
| `FINISHED` | Fim de jogo. |

- **Decisões:** `PENALTY_TAKER`, `INJURY_SUBSTITUTION`, `RED_CARD_ADJUSTMENT`, `TEAM_ADJUSTMENT` (MEU TIME).
  Cada uma tem `id` = partida + relógio + tipo + sequência, `clubId`, `playerId` quando aplicável, `eligible` e
  `suggested`. Uma por vez; as demais esperam em `decisionQueue`.
- **Comandos:** `CHOOSE_PENALTY_TAKER`, `ADJUST_TEAM` (trocas, posições, estilo, comportamento) e
  `OPEN_TEAM_ADJUSTMENT`. Todo comando tem `commandId`: repetido não é aplicado de novo; inválido devolve o estado
  original e o erro. Todo comando aceito fica registrado (`commands`) com relógio e origem (`PLAYER` ou `CPU`).
- **CPU:** usa o mesmo caminho (decisão → comando → validação), na hora, sem pausar. Política fixa e sem sorteio:
  batedor = o da escalação se em campo, senão o mais forte entre atacantes e meias; lesão = reserva da mesma posição
  mais forte; goleiro fora = goleiro reserva no lugar do jogador de linha mais fraco, ou, sem reserva, o jogador de
  linha mais fraco vai ao gol; expulsão de jogador de linha = não mexe.

## Goleiro

- Em todo estado válido há **exatamente um** jogador no setor GOL.
- Expulsão do goleiro com goleiro reserva e troca disponível: o goleiro reserva tem de entrar.
- Sem goleiro reserva (ou sem trocas): um jogador de linha vai ao gol, com fator 0,30.
- Lesão do goleiro com troca disponível: o substituto é obrigatório; o lesionado sai.

## Determinismo

**Mesma seed + mesmos dados + mesmas decisões do jogador = mesmo resultado.**

- **RNG.** Sem `Math.random()`. Hash `cyrb128` da chave → gerador `sfc32` (4 números descartados), só com operações
  inteiras de 32 bits: o mesmo resultado em qualquer motor JavaScript.
- **Seeds em árvore.** Carreira → mundo (`generateWorld(seed)`), calendário (`S<temporada>:<divisão>`), ofertas
  iniciais (`ofertas`); rodada = `deriveSeed(seedDaCarreira, "T2026-R01")`; partida = `deriveSeed(seedDaRodada, matchId)`.
  Cada partida é independente das outras da rodada.
- **Canais por minuto.** Cada sorteio é `sorteio(seedDaPartida, relógio, canal, ocorrência)`: cada canal de cada
  minuto tem seu próprio gerador, e a ocorrência n é o n-ésimo número dele. Canais: `CARD:<lado>`,
  `INJURY:<lado>`, `PENALTY:<lado>`, `PENALTY_KICK:<lado>`, `CHANCE:HOME`, `CHANCE:AWAY`, `STOPPAGE`.
- **Por que separados.** Um canal novo, ou um evento a mais em um canal, nunca desloca os números dos outros.
  No canal `CHANCE`, a ocorrência 3 (categoria de qualidade) foi acrescentada no fim, sem mudar as ocorrências
  0 (houve chance), 1 (resultado) e 2 (autor).
- **Decisões.** Uma decisão do jogador muda o estado (quem está em campo, tática); dali em diante as taxas mudam,
  mas os sorteios de cada minuto continuam os mesmos. Por isso decisões iguais reproduzem o jogo inteiro.
- **Velocidade não é do engine.** A velocidade só muda o intervalo real entre minutos na sessão (`game/session.ts`).
  O engine joga sempre 1 minuto por `step`, e o resultado é idêntico em qualquer velocidade.
- **Reprodução técnica.** `reproduceMatch(input, commands)` reaplica, na mesma seed e nos mesmos dados, os comandos
  gravados no minuto em que foram dados. Serve a testes, depuração e balanceamento; não é recurso do jogador
  (não existe replay no jogo).

## Onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| `engine/config.ts` | Todos os números de balanceamento e `perMinute`. |
| `engine/rng.ts` | `cyrb128`, `sfc32`, `deriveSeed`, `channel`, `pickWeighted`. |
| `engine/strength.ts` | Fator de posição, força efetiva, totais por setor, ataque/defesa, força geral. |
| `engine/match/chances.ts` | Taxas por minuto, curva, qualidade, resolução de chance. |
| `engine/match/incidents.ts` | Cartões, lesões, pênaltis, prioridade das decisões do minuto. |
| `engine/match/step.ts` | O minuto, acréscimos, relógio. |
| `engine/match/state.ts` | `MatchState`, fim de partida. |
| `engine/match/decisions.ts`, `commands.ts`, `substitutions.ts`, `cpu.ts` | Decisões, comandos, validação de time, política da CPU. |
| `engine/match/simulate.ts` | Simulação completa, resumo, reprodução técnica. |
| `engine/round.ts` | Rodada simultânea (todas as partidas avançam juntas). |
| `engine/season/*` | Calendário, classificação, promoção/rebaixamento. |
| `engine/finance.ts` | Público, receitas e despesas por rodada. |
| `engine/world/generate.ts` | Mundo fictício a partir da seed. |
| `engine/sim/balance.ts` | Script de balanceamento (`npm run balance`); fora do build. |

## Dependências pedidas pela camada de gestão (NÃO implementadas: o Engine 0.2.0 está fechado)

A evolução "ELITE MANAGER" (gestão, mercado, notícias, árbitros) foi feita **sem mudar o engine**. Três pedidos da
especificação dependem dele e ficam documentados aqui, para uma futura versão do engine com recalibração e testes de
equivalência próprios:

| Pedido | Por que depende do engine | Como está hoje |
| --- | --- | --- |
| Assistências | O evento `GOAL` não registra quem deu o passe (`relatedPlayerId` é null em gols). | O ELENCO mostra jogos, gols, amarelos, vermelhos e lesões, todos lidos dos eventos reais; assistências não aparecem. |
| Árbitro influenciar cartões/pênaltis | As taxas são globais (`yellowRatePerTeam` 2,2; `directRedRatePerTeam` 0,05). Mudar por árbitro mexe no modelo de incidentes e na calibração. | Cada partida tem um árbitro (escolhido pelo id da partida); o perfil dele (cartões e pênaltis por jogo) é ESTATÍSTICA dos jogos que apitou. Não muda nenhum resultado. |
| Faltas por partida | O engine não gera evento de falta. | Não exibido. |

Outras decisões que **não** dependem do engine e foram verificadas:

* **Público**: o engine só guarda `attendance` e a bilheteria o usa; nenhuma chance depende dele. A camada de jogo calcula o
  público (`game/manager/stadium.ts`) e o passa no `Fixture`. Teste: placares idênticos com e sem o público dinâmico.
* **Intervalo e lances importantes** param a rodada na SESSÃO (`stopOnEvents`), entre duas chamadas de `stepRound`.
  Pausas não mudam o jogo (testes de sessão e QA de velocidades: mesmo resultado nas 5 velocidades, com e sem paradas).
* **Velocidade INSTANTÂNEA** saiu da interface; continua na sessão para testes e QA.
