# Notícias

Camada: `game/manager/news.ts` (+ geradores em `flow.ts` e `actions.ts`). Tela: **NOTÍCIAS** (Jornal do Dia + arquivo)
e o cartão "Jornal do Dia" no resultado da rodada.

**Regra:** toda notícia nasce de um fato que aconteceu no jogo. Nada é inventado, sorteado ou gerado por IA.

| Categoria | Origem (fato real) |
| --- | --- |
| Notícia | resultado do clube (placar, autores dos gols, público), goleada (4+) na 1ª divisão, transferência, empréstimo, renovação, obra iniciada/concluída, patrocínio, campeão, empréstimo quitado, janela fechada |
| Urgente | expulsão no clube, lesão de 3+ rodadas, demissão de técnico (CPU ou do treinador), proposta de trabalho, acesso, rebaixamento, convite da seleção |
| Rumor | proposta feita pelo treinador, jogador posto em leilão, renovação fracassada |
| Opinião | pressão da diretoria depois de três derrotas que levam a moral para baixo de 35 |
| Análise | 3+ gols do mesmo jogador num jogo; líder da 1ª e da 2ª divisão a cada 5 rodadas; empréstimo bancário tomado |

* Ids sequenciais (`n1`, `n2`...): mesma seed + mesmas decisões = mesmas notícias.
* Ficam as 300 mais recentes no save.
* **Jornal do Dia** = as notícias da rodada mais recente, as do clube do treinador primeiro.

## Página da notícia (etapa Força + Economia)

Tocar numa notícia (lista, Jornal do Dia ou resultado da rodada) abre a **página completa**: categoria, manchete, data
(dia da rodada), hora (estável por notícia), corpo, fonte (veículo fictício por categoria), tags, entidades relacionadas
(clube e jogador, que abrem as próprias telas; os dados delas são marcados como "hoje") e **VOLTAR PARA NOTÍCIAS**.

Novos fatos que viram notícia: avaliação de evolução do clube (meio e fim da temporada), clube da CPU que fecha a
temporada no vermelho, clube rebaixado que demite o técnico.
