# Playtest 01

> **Playtest simulado.** Não houve pessoa externa. As três sessões foram jogadas por um agente de IA (Claude) no build
> real, só pela tela, decidindo cada passo pelo que aparecia em capturas. O agente conhece o projeto por dentro, então o
> Perfil A (jogador novo) é uma aproximação. Vontade de continuar, motivação e sensação de progressão são impressões
> humanas: aqui só há evidências observáveis na tela, e o que não dá para medir está marcado como **não mensurável**.
> Este relatório não substitui um teste com jogadores reais.

## Ambiente

| | |
|---|---|
| Versão | 1.0.0-rc.1 (Engine 0.2.0) |
| Commit | `b9fbe1b` |
| Build | `dist/app/index.html`, servido por `python3 -m http.server 8080` |
| Navegador | Chromium 141 (headless), controlado por Playwright via CDP, mesma página do começo ao fim |
| Resolução | Sessão 1: 390×844 (celular). Sessões 2 e 3: 1280×800 (desktop) |
| Dispositivo | Emulado (sem toque físico) |
| Data | 01/10/2026 |

## Perfil

- **Sessão 1 — Novo** (Perfil A): sem ler documentação; ações escolhidas pelo que a tela sugere.
- **Sessões 2 e 3 — Manager** (Perfil B): procura informação, mexe na escalação, quer progredir.

## Sessão

| Sessão | Foco | Duração (relógio) | Progresso |
|---|---|---|---|
| 1 | Jogador novo, celular | 10 min (17:43–17:53) | Carreira nova, rodadas 1–6 da temporada 2026, 4 pontos (V, D, E, D, D, D), 10º lugar. Velocidades NORMAL e RÁPIDA. |
| 2 | Carreira, desktop | 4 min (17:53–17:57) | Carreira nova pela tela; 38 rodadas em INSTANTÂNEA (rodadas repetitivas com política fixa de decisão: pênalti = maior chance, lesão = substituto sugerido, demais = sugestão); 4º lugar, **acesso** na última rodada; temporada 2027 iniciada. |
| 3 | Partida, desktop | 2 min (17:57–17:59) | Rodada 1 de 2027 em LENTA → MUITO RÁPIDA; cenário de goleiro lesionado sem reserva (save auxiliar de QA, fora do produto). |

Tempo total de relógio: **16 minutos**, abaixo dos 30 min pedidos para a primeira sessão. As rodadas repetitivas da sessão 2
foram automatizadas; os pontos de verificação (rodadas 1, 10, 19, 20, 38 e a virada) foram olhados em tela.

## Observações

- Tela inicial: o primeiro passo é óbvio (nome + RECEBER PROPOSTAS). "Clubes, jogadores e competições fictícios" aparece logo.
- Propostas: "Toda carreira começa nas divisões de baixo" explica a 4ª divisão.
- Antes da rodada: JOGAR RODADA é a ação evidente; "adversário com força 23 · sua força 26" dá contexto.
- Partida ao vivo (NORMAL, celular): placar, minuto, lances com o mais recente no topo e o próprio clube em ciano; dá para ler cada lance.
- Resultado: VITÓRIA/EMPATE/DERROTA, gols com minuto e PRÓXIMA RODADA são claros.
- Pausa: "17' · PAUSADO", indicador amarelo e botão CONTINUAR são claros.
- Suspensão: "Sua escalação foi ajustada… Indisponíveis: C. Macedo (suspenso 1)" aparece antes da rodada seguinte.
- CARREIRA: o extrato por rodada com a coluna Mando (Casa/Fora) explica o que o resultado não explica (sem bilheteria fora de casa).
- NOVA CARREIRA pede confirmação ("SIM, APAGAR E RECOMEÇAR").
- Classificação: abre na divisão do clube, com a linha destacada e faixa verde na zona de acesso.
- Fim de temporada: "Você terminou em 4º… ACESSO! Você sobe para a 3ª Divisão", saldo da temporada e campeões.
- Virada: aviso "Temporada 2027 começou."; a 3ª divisão aparece no topo; primeiro adversário com força igual à do time.
- Fila de decisões (sessão 2, R27, 90'): expulsão e pênalti no mesmo minuto apareceram um de cada vez.

## Pontos de fricção

- Depois de **NOVA CARREIRA** na mesma página, a primeira rodada da carreira nova fica presa em "Preparando a rodada…" (ver Bugs reais).
- "Força do elenco 23/25/26" nas propostas não tem escala nem referência da divisão.
- A força exibida (média dos titulares) não muda com a formação (24 em 5-3-2 e em 4-3-3), mas o resultado depende das somas por setor e da formação. Perder em casa por 1×2 para um time de força 12, sendo força 26 (2 chances contra 3), passa a impressão de resultado aleatório.
- O caixa só cai na 4ª divisão (sessão 1: −R$ 44 mil em 3 rodadas; sessão 2: R$ 547 mil → R$ 252 mil na temporada) e o jogador não tem nenhuma ação sobre isso.
- No resultado de jogo fora de casa, "PÚBLICO 0 · BILHETERIA R$ 0" contradiz o "Público: 2.190" mostrado durante a partida.
- No MEU TIME (celular, 5 defensores), os nomes do campo se sobrepõem ("R. Duart A. Teixei.. K. Jardim C. Duart L. Gomes").
- Dois jogadores aparecem como "R. Uchoa" (goleiro e meia), no campo e na lista de batedores.
- Nada indica que o campo aceita toque para trocar; a instrução só aparece depois do primeiro toque.
- Topo: "4ª Divisão · sem jogos · T2026 · R1/38" usa abreviações sem explicação; "sem jogos" ocupa o lugar da posição.
- JOGOS DA RODADA começa pela 1ª divisão; o jogo do próprio clube fica no fim da lista.
- Classificação no celular: GP/GC/SG escondidos e a coluna D cortada, com rolagem lateral sem indicação; a legenda ACESSO só no fim da tabela.
- CLUBES abre na 1ª divisão, não na divisão do jogador.
- No detalhe de um clube, com a rodada já encerrada, aparece "Jogando agora: 90+3' · 2 × 3".
- Com a partida pausada pelo jogador, CONTINUAR no pop-up MEU TIME mantém a pausa, embora o pop-up diga "O jogo continua no CONTINUAR".
- "Sua escalação foi ajustada" não diz o que mudou.
- O aviso de boas-vindas cobre o goleiro no campo do MEU TIME por cerca de 4 s (P3 já conhecido).

## Dúvidas

Dúvidas que a tela provoca e não responde no lugar onde surgem:

- "Força 26 é boa para a 4ª divisão?"
- "Por que perdi dinheiro se ganhei o jogo?" (respondida só em CARREIRA, pela coluna Mando)
- "Por que perdi para um time de força 12?"
- "Qual R. Uchoa é qual?"
- "Dá para trocar jogadores tocando no campo?"
- "O que acontece se eu ACEITAR SUGESTÃO nesta expulsão?"
- "O que a escalação ajustada mudou?"
- "Como reforço o time para a 3ª divisão?" (sem resposta: não há mercado)
- "Quem está no gol agora?" (depois do goleiro improvisado)

## Decisões compreendidas

- Pênalti: "Escolha o cobrador. A partida está parada." + chance de cada um. O resultado aparece nos lances ("GOL de pênalti! R. Duarte").
- Expulsão: o texto explica a situação e oferece estilo, comportamento e substituições.
- Goleiro lesionado sem reserva: explica as duas escolhas (reserva que entra, quem vai para o gol) e a perda de 70%.
- Lesão (sessão 2): substituto sugerido aceito sem dúvida.
- MEU TIME durante a partida: pausa, estilo/formação/trocas; a mudança aparece no placar (estilo · comportamento).

## Decisões não compreendidas

- Pênalti: chances quase iguais (79%–81%) fazem a escolha parecer sem peso; o SUGERIDO (80%) não é o de maior chance (81%); o goleiro aparece como cobrador possível.
- Expulsão de jogador de linha: ACEITAR SUGESTÃO não diz que a sugestão é "não mudar nada".
- Goleiro sem reserva: a sugestão põe o atacante reserva mais forte no gol (a regra escolhe o mais forte, já que todos rendem 30%), o que parece um desperdício; a lista "Vai para o gol" não mostra quanto cada um renderia no gol.
- Os pop-ups não mostram placar nem minuto no momento da decisão.

## Funcionalidades encontradas

PARTIDA (velocidades, pausa, MEU TIME no jogo, lances, jogos da rodada), MEU TIME (formação, estilo, comportamento, batedor, troca por toque depois de descoberta), CAMPEONATO (pelo botão VER CLASSIFICAÇÃO), CLUBES (lista e detalhe), CARREIRA (extrato, salvamento automático, nova carreira).

## Funcionalidades não encontradas

- Troca por toque no campo: só descoberta tocando por curiosidade.
- Colunas GP/GC/SG da classificação no celular (atrás de rolagem lateral sem indicação).
- MELHOR TIME: visto, não usado pelo Perfil A (o rótulo não diz o que monta).
- Esperadas e inexistentes: mercado/reforços, ação sobre finanças, objetivo da divisão, informação do jogador além da força, explicação do que decide uma partida.

## Ritmo

Observações:
- NORMAL (celular): dá para ler cada lance; uma partida leva cerca de 50 s.
- LENTA: em 10 s o jogo foi a 11' com 2 lances; muito tempo de placar parado.
- RÁPIDA: a rodada passou enquanto se lia outra tela; o resultado é o foco.
- MUITO RÁPIDA: cerca de 40 minutos em poucos segundos; os lances passam rápido demais para ler um a um; placar e quadro da rodada acompanháveis.
- INSTANTÂNEA: 38 rodadas em poucos minutos; o jogo só para nas decisões, que continuam aparecendo uma a uma.
- Trocar a velocidade no meio do jogo funciona na hora.

## Progressão

Observações:
- Perfil B: a tabela deu tensão visível — 4º na rodada 10, 7º na rodada 30, três derrotas seguidas (R31–R33) e cinco vitórias (R34–R38) até o 4º lugar e o acesso.
- O acesso é comunicado com clareza, mas tem menos destaque que o resultado do último jogo (vem depois do placar e do botão; no celular, abaixo da dobra).
- Na 3ª divisão o elenco é o mesmo, sem evolução e sem reforços, e o caixa segue caindo: o clube sobe, o time não.
- Se isso cria ou tira motivação para continuar: **não mensurável** sem jogador real.

## Vontade de continuar

Observações (só evidência de tela; a vontade em si não é mensurável aqui):
- Ao fim de cada rodada o próximo passo é um único botão grande (PRÓXIMA RODADA / INICIAR TEMPORADA).
- Momentos de decisão com consequência visível: o pênalti convertido; expulsões nas duas derrotas da sequência R11–R19 do Perfil B.
- A briga pelo acesso na reta final (Perfil B) é o trecho com mais em jogo visível na tela.
- Nenhuma sessão "parou naturalmente": as paradas foram decididas pelo roteiro do teste.
- Perguntas sobre a próxima temporada surgiram no Perfil B ("como reforço o time?").
- Nenhum perfil buscou começar outra carreira por conta própria (a sessão 2 recomeçou por roteiro).

## Problemas

**P0:** nenhum.

**P1:**
1. NOVA CARREIRA sem recarregar a página deixa a primeira rodada presa em "Preparando a rodada…" (bug).

**P2:**
1. A força exibida não reflete formação nem setores, e nada explica o que decide a partida: os resultados parecem aleatórios (UX / clareza).
2. O caixa só cai e não há ação do jogador sobre as finanças (funcionalidade ausente / balanceamento percebido).

**P3:**
1. "Jogando agora" no detalhe de clube depois do fim da rodada (bug de texto).
2. Nomes sobrepostos no campo com 5 defensores, no celular (bug visual).
3. "PÚBLICO 0 / BILHETERIA R$ 0" no resultado fora de casa sem explicação (UX).
4. Nomes curtos repetidos ("R. Uchoa" × 2) (UX).
5. Troca por toque no campo não anunciada (usabilidade).
6. Abreviações no topo (T2026, R1/38, "sem jogos") (UX).
7. Jogo do próprio clube no fim de JOGOS DA RODADA (UX).
8. Classificação no celular com colunas escondidas e legenda só no fim (UX).
9. CLUBES abre na 1ª divisão (UX).
10. Pop-ups de decisão sem placar e minuto (UX).
11. ACEITAR SUGESTÃO sem dizer o que faz na expulsão de jogador de linha (UX).
12. Pênalti: chances quase iguais, SUGERIDO não é o maior, goleiro na lista (UX / balanceamento percebido).
13. CONTINUAR no pop-up MEU TIME mantém a pausa do jogador, contra o texto do pop-up (usabilidade).
14. "Escalação ajustada" sem detalhar o que mudou (UX).
15. Goleiro improvisado: lances não dizem quem foi ao gol; lista sem o valor no gol; sugestão contraintuitiva (UX).
16. Acesso menos destacado que o resultado do último jogo no fim de temporada (UX).
17. Aviso temporário cobre parte da tela por ~4 s (já conhecido).

## Bugs reais

1. **P1 — rodada presa depois de NOVA CARREIRA.**
   Reprodução (tela): jogar uma rodada → CARREIRA → NOVA CARREIRA → SIM, APAGAR E RECOMEÇAR → escolher clube → JOGAR
   RODADA → a tela fica em "Preparando a rodada…" para sempre, sem botões. Reproduzido também em Node com o controlador
   real (fase fica LIVE; a sessão mantém o estado anterior).
   Causa: `abandonCareer()` em `app/src/controller.ts` chama `session.dispose()` (`game/session.ts`: `disposed = true`,
   ouvintes removidos) e o controlador continua usando a sessão descartada.
   Impacto: a carreira nova não joga até recarregar. Contorno: recarregar a página e CONTINUAR CARREIRA (a carreira nova
   foi salva e volta na rodada 1, com a escalação).
   Não pego pelos QAs: eles começam cada carreira numa página nova.
2. **P3 — "Jogando agora" depois do fim da rodada.** `liveMatchOf` (`game/queries.ts`) devolve a partida enquanto a rodada
   estiver em memória, inclusive encerrada; `app/src/views/clubs.ts` escreve "Jogando agora".
3. **P3 — nomes sobrepostos no campo** com 5 defensores em 390 px. O QA visual não verifica sobreposição entre os jogadores do campo.

Nenhum comportamento do engine foi apontado como incorreto. Perder para times mais fracos e as expulsões frequentes
(Perfil A: 2 em 6 jogos; Perfil B: 7 em 38) são **percepções** registradas; a Etapa 8 já mostrou que as expulsões são
consistentes com o engine.

## Melhorias

Sugestões que nascem das observações (não são compromisso; decidir depois da análise):
- Corrigir o P1 (recriar a sessão ao recomeçar a carreira) com teste de regressão.
- Explicar a força: escala (1–50), referência da divisão, ataque/defesa por formação.
- Explicar finanças no resultado (jogo fora de casa não tem bilheteria) e dar ao jogador alguma alavanca financeira.
- Mostrar placar e minuto nos pop-ups; dizer o que ACEITAR SUGESTÃO faz; mostrar o valor no gol na escolha do goleiro improvisado.
- Anunciar a troca por toque; desambiguar nomes curtos repetidos; destacar o jogo do próprio clube no quadro da rodada.
- Dar mais destaque ao acesso/rebaixamento no fim de temporada.
- Mercado/reforços como próxima funcionalidade de maior impacto percebido (já no BACKLOG).

Elencos reais: nenhuma expectativa de jogadores, clubes, escudos ou competições reais apareceu nas sessões. Como as
sessões foram simuladas, isso **não é evidência** de que jogadores reais não sentiriam falta.

## Conclusão

O fluxo principal funciona de ponta a ponta nos dois perfis, inclusive acesso e virada de temporada, e as decisões
pausam e se explicam. O playtest simulado achou **1 bug P1** (rodada presa depois de NOVA CARREIRA na mesma página),
2 problemas P2 de compreensão (força × resultado; finanças sem ação) e 17 P3. Nenhuma alteração foi feita.
Recomendação: antes de decidir a Etapa 14, repetir este roteiro com pelo menos uma pessoa real de cada perfil, para
medir o que esta simulação não mede (motivação, "só mais uma rodada", expectativa de elencos reais).
