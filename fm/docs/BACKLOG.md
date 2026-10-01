# Backlog

Itens já identificados durante o projeto. Estar aqui **não** é compromisso de desenvolvimento: é o registro para
priorizar depois do teste externo.

## P3 e limitações aceitas no MVP

| Item | Situação atual |
|---|---|
| Velocidades no celular | As 5 opções ocupam duas linhas. |
| Aviso temporário (toast) | Cobre a parte de baixo da tela por cerca de 4 s; tocar nele fecha. |
| Quadro da rodada no celular | Nomes de clubes cortados com reticências por falta de espaço. |
| Batedor padrão durante a partida | Não pode ser trocado no meio do jogo (o engine 0.2.0 não tem comando para isso). No pênalti o jogador escolhe qualquer cobrador. |
| MEU TIME durante a partida | A aba é só consulta e não pausa; os ajustes são feitos pelo botão MEU TIME da tela PARTIDA, que pausa. |
| Persistência durante a partida | A rodada em andamento não é salva; recarregar volta ao início da mesma rodada. |
| Escopo das alterações táticas | Mudanças feitas durante a partida valem só para aquele jogo. |
| Save local | Fica no navegador e no dispositivo (`localStorage`); não acompanha o jogador entre aparelhos. |
| Migração de saves | Não existe: um save de outra versão é recusado com aviso. |
| "Jogando agora" depois da rodada | No detalhe de um clube em CLUBES, depois que a rodada terminou e antes de PRÓXIMA RODADA, o texto diz "Jogando agora" com o placar final (`game/queries.ts` `liveMatchOf` não filtra partida encerrada; `app/src/views/clubs.ts`). Auditoria de release: bug de texto, não impede jogar. |
| Campo com 5 defensores no celular | Nomes podem se sobrepor em 390 px com 5-3-2/5-4-1 (playtest simulado). O QA visual não mede sobreposição entre jogadores do campo. |
| Nomes curtos repetidos | 30% dos clubes (481 de 1.600 em 20 mundos) têm pelo menos dois jogadores com o mesmo nome curto ("R. Uchoa"). Nomes completos não se repetem. |
| Pop-ups de decisão | Sem placar e minuto; ACEITAR SUGESTÃO não diz o que faz na expulsão; goleiro improvisado sem o valor no gol. |
| Pênalti | Chances dos cobradores próximas; o SUGERIDO (batedor do MEU TIME) nem sempre é o de maior %. |
| MEU TIME com pausa do jogador | Se o jogador pausou antes de abrir MEU TIME, CONTINUAR no pop-up mantém a pausa; é preciso tocar CONTINUAR de novo. |
| Clareza de força e finanças (P2 do playtest simulado) | A força exibida não reflete formação/setores; o caixa só cai e o jogador não tem alavanca. Aguardam o playtest humano. |
| Outros P3 de UX do playtest simulado | Troca por toque não anunciada; abreviações no topo; jogo do próprio clube no fim do quadro; colunas escondidas na classificação no celular; CLUBES abre na 1ª divisão; "Escalação ajustada" sem detalhe; acesso pouco destacado no fim de temporada ([reports/playtest-01.md](../reports/playtest-01.md)). |

## Futuras funcionalidades (previstas na visão do produto, fora do MVP)

- Mercado: transferências, ofertas, negociações, contratos.
- Evolução de jogadores (idade, melhora e queda) e surgimento de jovens.
- Mundo mais vivo: demissão de técnicos, dificuldades financeiras com consequências, rivalidades, notícias.
- Premiação de fim de temporada nas finanças; preço de ingresso ajustável; fator de momento no público.
- Seleção nacional: só após grande desempenho e na 1ª divisão, podendo acumular clube e seleção.
- Áudio original (torcida, estádio).
- Imprensa e narrativa.
- Editor e customização; licenciamento de clubes e jogadores reais.
- Multiplayer.

## Ideias de produto

- IA como camada futura (personalidades, imprensa, entrevistas, negociações, assistente técnico), sem entrar no
  engine de partida, que deve continuar determinístico.
- Estádios: ampliação de capacidade (o mundo já registra uma capacidade máxima por estádio).
