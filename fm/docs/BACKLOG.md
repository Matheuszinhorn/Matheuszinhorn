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

## Depois do ELITE MANAGER

* Engine (precisa de versão nova com recalibração): assistências, influência do árbitro, faltas (ENGINE.md).
* Modo online, contas reais, rankings Top Brasil/Global, Hall da Fama (ONLINE-ROADMAP.md, SECURITY-ONLINE.md).
* Seleção com jogos e Copa (hoje: convite honorário na carreira).
* Universo de dados real dentro do jogo (a camada `data/` existe; o app continua no universo fictício).
* Propostas de compra da CPU pelos jogadores do treinador (hoje a venda é por leilão).

## Depois da etapa Força + Economia

* Empréstimos entre clubes da CPU; patrocínio da CPU; problemas financeiros da CPU com efeito (hoje só notícia).
* Jogos da seleção, datas FIFA e Copa (a cada 4 temporadas) — roadmap.
* Força dos jogadores do universo real: EM-RATING-1.0 (EA FC) descontinuada; EM-RATING-2.0 (própria, CBF) simulada e não aplicada. PLAYER-RATINGS.md.
* Corpo das notícias mais longo, com contexto gravado no momento do fato.

## Depois da etapa Universo real + EM-RATING

* 291 atletas da CBF sem posição em fonte nenhuma (167 ATIVOS): precisam de uma fonte de posição (o BID não foi acessível).
* Séries B, C e D: importar elencos e confirmar regras na CBF (`confirmed: false` em `data/competition-rules.ts`).
* Data de início da 2ª janela de 2026 a conferir na CBF.
* Ligação do universo real à carreira (UNIVERSES.md: opções a, b, c) e medição do efeito "Overall − 42" nas razões do modelo de chance, antes de qualquer partida real.
* Refazer a medição de quebra de nomes no campo do MEU TIME com os apelidos da CBF.

## Depois da etapa EM-RATING-2.0 (simulação)

* **Uso comercial/distribuição de nomes reais de atletas e marcas de clubes requer avaliação jurídica antes da distribuição do universo real.**
* Curadoria das posições de todos os 897 atletas (`data/universes/brasileirao-2026/curation/positions.csv`; 303 sem nenhuma referência primeiro). Depois dela, retirar a posição da Wikipédia de `players.json` (hoje sustenta o elenco jogável do universo).
* Topo saturado na 2.0 (titular experiente ≈ 50): decidir se o teto factual fica abaixo de 50 ou se surge outro fato que diferencie destaque de titular.
* Experiência subestimada de estrangeiros e repatriados (só a CBF desde 2013 é vista).

## Depois da calibração EM-RATING-2.0 (2ª rodada)

* Escolha do modelo (A, B, C ou outro) pelo proprietário; relatório em `reports/em-rating-2.0-calibracao.md`.
* Regra do goleiro quando a produção pesa mais (o neutro fixo 0,5 limita o teto do goleiro: 46/44/41 em A/B/C).
* Fator da experiência limitada (×1, ×0,5 ou ×0) para os 60 atletas com carreira anterior fora da base.
* Repetir a calibração depois da curadoria das posições (hoje "sem posição" produz quase todos os 50).

## Evolução contextual (PlayerDevelopment) — projeto

* Protótipo DEV-PROTO-0.2 calibrado em 10 temporadas (docs/PLAYER-DEVELOPMENT.md, `npm run development:sim10`); não integrado.
* Antes de implementar: calibrar com partidas reais do engine (rendimento do goleiro, queda do veterano, tendência
  de idade com rendimento ruim) e registrar minutos, titularidade e defesas na camada de gestão.
* Integração: substituir os checkpoints de `progression.ts`, migração compatível de save (`strengthBase =
  strengthCurrent = strength`), engine inalterado.
* Validação no mundo real (docs/PLAYER-DEVELOPMENT.md, `npm run development:world`): recalibrar antes de integrar —
  perda por inatividade sem limite (146 jogadores chegam a 1; deflação −2,3) e ambiente que não muda com acesso ou
  rebaixamento (é o próprio elenco). Medir também o efeito de volta da força nas partidas (só com aprovação).
* DEV-PROTO-0.3 (não integrada): divisão como contexto de oportunidade aprovada nos testes; inatividade ainda sem
  solução — A/B deixam o envelhecimento sem minutos sem limite, C zera a consequência. Próximo teste: limitar a perda
  total sem participação (inatividade + idade sem jogar) por temporada. Relatório: reports/development-world-10-seasons-v03.md.
