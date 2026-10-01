# FM Brasileiro — o produto

FM Brasileiro é um jogo de gerenciamento de futebol para navegador: o jogador assume um clube fictício da
4ª divisão e tenta subi-lo até a elite, uma rodada por vez. A filosofia é **simplicidade + velocidade + decisões**:
poucas regras, partidas rápidas e escolhas que pesam no resultado.

Versão atual: **MVP Release Candidate 1.0.0-rc.1**, com o Engine **0.2.0**.

## Proposta

- Inspirado na simplicidade e no ritmo dos clássicos do gênero (a sensação de "só mais uma rodada"), com
  identidade própria: não copia código, textos, imagens ou identidade visual de nenhum jogo.
- Leitura rápida: uma tela de partida que mostra a rodada inteira ao vivo, sem excesso de painéis.
- Nada de dezenas de atributos escondidos: cada jogador tem força (1 a 50), posição e temperamento.
- Mundo fictício: clubes, jogadores e estádios inventados, gerados a partir de uma seed.

## Conceito do gameplay

O jogador é o treinador. Antes da rodada, monta o time (formação, titulares, estilo, comportamento, batedor de
pênalti). Durante a rodada, acompanha todas as partidas ao mesmo tempo e responde às decisões que surgem no jogo
do seu clube (pênalti, lesão, expulsão, goleiro). Depois, vê o resultado, as finanças e a tabela, e segue para a
próxima rodada. Ao fim de 38 rodadas, a temporada fecha com acesso e rebaixamento.

## Fluxo principal

```
INÍCIO → nome do treinador → 3 propostas de clubes da 4ª divisão → escolhe o clube
  → antes da rodada (MEU TIME, velocidade) → JOGAR RODADA → rodada ao vivo (decisões)
  → resultado (finanças, classificação) → PRÓXIMA RODADA … → rodada 38
  → FIM DE TEMPORADA (campeões, acesso/rebaixamento) → INICIAR TEMPORADA seguinte
```

A navegação tem cinco áreas: **PARTIDA**, **MEU TIME**, **CAMPEONATO**, **CLUBES** e **CARREIRA**.

## Carreira, divisões e temporadas

- **Carreira:** um treinador, um clube, temporadas a partir de 2026. Toda carreira nova começa na 4ª divisão.
- **Divisões:** 4 divisões de 20 clubes (80 clubes no total), cada uma com seu campeonato.
- **Temporada:** pontos corridos, ida e volta, 38 rodadas. Todas as 40 partidas de cada rodada são jogadas ao
  mesmo tempo.
- **Acesso e rebaixamento:** entre cada par de divisões vizinhas, 4 sobem e 4 descem (12 acessos e
  12 rebaixamentos por temporada).

## Partidas e decisões

As partidas são simuladas minuto a minuto pelo engine, com gols, defesas, bolas na trave, cartões, expulsões,
lesões, pênaltis, substituições e acréscimos. Quando acontece algo no jogo do clube do jogador que exige uma
escolha, a rodada **para** e um único pop-up mostra a decisão. Os demais clubes são controlados pela CPU, que
decide na hora pelas mesmas regras.

## Clubes, formação, estilo e comportamento

- **Clubes:** a área CLUBES é só consulta: força, reputação, estádio, finanças e time de qualquer clube.
  O MVP não tem mercado de transferências.
- **Formação:** oito opções (4-4-2, 4-3-3, 3-5-2, 5-3-2, 4-5-1, 3-4-3, 5-4-1, 4-2-4), ajustável no campo.
- **Estilo:** Defensivo, Equilibrado ou Ofensivo.
- **Comportamento:** Normal, Agressivo ou Reativo.
- As consequências de cada escolha são definidas pelo engine ([ENGINE.md](ENGINE.md)).

## Finanças

Cada clube tem caixa. A cada rodada entram bilheteria (só para o mandante) e cota de TV, e saem salários e
manutenção do estádio. O caixa pode ficar negativo. O extrato do clube do jogador aparece em CARREIRA.

## Persistência

A carreira é salva automaticamente no navegador (ao criar a carreira, ao fim de cada rodada, na virada de
temporada e a cada mudança no MEU TIME). Ao reabrir o jogo, CONTINUAR CARREIRA retoma do ponto salvo.

## Evolução do mundo

O mundo segue sem o jogador: todos os clubes jogam todas as rodadas, acumulam pontos, ganham e perdem dinheiro,
têm lesões e suspensões, e sobem ou descem de divisão. No MVP os jogadores não envelhecem, não evoluem e não
mudam de clube, e não há demissão de técnicos (ver [BACKLOG.md](BACKLOG.md)).

## Documentos relacionados

[GAMEPLAY.md](GAMEPLAY.md) · [ENGINE.md](ENGINE.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[DESIGN-DECISIONS.md](DESIGN-DECISIONS.md) · [RELEASE.md](RELEASE.md) · [QA.md](QA.md) · [BACKLOG.md](BACKLOG.md)
