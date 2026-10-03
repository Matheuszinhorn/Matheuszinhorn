# DEV-INTEGRATION-0.2 — integração experimental de desenvolvimento por 10 temporadas

> **Simulação/validação EXPERIMENTAL.** Não é integração oficial; nada entra no produto, nos saves, na UI, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado. Nenhum balanceamento foi alterado. A única diferença entre os mundos é `Player.strength` = strengthCurrent no mundo B.

## Configuração

- Candidata: **DEV-PROTO-0.4-BB** (DEV-PROTO-0.4-B): limite conjunto −0,75/temporada sem participação; preservação parcial; divisão como oportunidade (peso 0.5); sem piso de strengthBase; curva de idade inalterada.
- Seed `elite-dev-world-10`, universo fictício, carreira gerenciada sem decisões manuais, 10 temporadas × 38 rodadas, 15200 partidas por mundo.
- Regras do jogo ativas nos dois mundos: calendário, acesso/rebaixamento, transferências e renovações da CPU, base (juniores), aposentadoria aos 37 e de livres 34+, finanças, lesões, suspensões, demissão do treinador.
- **Mundo A — Controle:** força fixa. Os checkpoints antigos de evolução (`progression.ts`, rodada 19 e fim da temporada) ficam desligados (`evolution: false`) nos DOIS mundos; juniores entram com a força gerada e ela não muda.
- **Mundo B — Desenvolvimento:** após cada rodada, `stepDevelopment` observa as partidas e `withDevelopedStrength` devolve o mundo com Player.strength = strengthCurrent (±1 só no fim das janelas: rodadas 5, 10, …, 35, 38).
- Efeitos derivados esperados: escalação da CPU, placares, tabela, acesso/rebaixamento, mercado da CPU (escolhe por força), base (repõe elencos curtos), caixa e calendário das temporadas seguintes podem mudar porque a força mudou.

## Auditoria antes da simulação

- **Temporada começa:** `newManagedCareer` (T1) e `startManagedSeason` (viradas): empréstimos voltam, renovações da CPU, livres 34+ se aposentam, `startNextSeason` (acesso/rebaixamento + calendário novo da mesma seed), `agePlayers` (+1 ano, aposenta aos 37), `cpuTransfers`, `youthIntake`.
- **Rodada avança:** `planManagedRound` (escalações, público, árbitros) → `simulateRound(createRound(...))` (Engine 0.2.0) → `roundResults` → `finishManagedRound` (tabela, lesões/suspensões, finanças, estatísticas).
- **Jogador entra em campo / força consumida:** a escalação automática (`engine/lineup.ts`) ordena por `Player.strength`; o engine lê `MatchPlayer.strength`, copiado de `Player.strength` na montagem da partida. É o único ponto de leitura.
- **Transferência:** `movePlayer` copia o jogador inteiro (`{ ...p, clubId }`) — a força vai junto; salário/contrato mudam por regra do mercado.
- **Promoção/rebaixamento:** `startNextSeason` troca a divisão do CLUBE; a força dos jogadores não é tocada.
- **Desenvolvimento:** só em `game/development/` (development.ts + feedback.ts), chamado apenas por este script; o ambiente é recalculado a cada rodada a partir do clube/divisão atuais.
- **Escritas de força no jogo:** só `progression.ts` (desligado nos dois mundos). `agePlayers`, `cpuRenewals`, `cpuTransfers`, `movePlayer` não alteram a força (conferido em cada virada abaixo).
- **strengthBase não muda:** é fixado no 1º encontro e nunca é reescrito (conferido contra a força do 1º encontro).
- **Transferência mantém strengthCurrent:** conferido em cada virada (força depois = strengthCurrent antes).
- **Nova divisão só muda o ambiente futuro:** nenhuma mudança de força na virada; a 1ª mudança possível é no fim da janela da rodada 5 da temporada seguinte.
- **Engine 0.2.0 inalterado:** nenhum commit em `engine/` desde o snapshot; impressão digital das fontes conferida pelo teste 14 de `data/tests/ratings.test.ts`.

## Divergências

**Obrigatoriamente idênticos (divergência = erro):** universo inicial; id e seed das 380 rodadas; calendário e mandos em toda temporada que começa com as divisões iguais nos dois mundos (mesmos clubes, mesma ordem); mundo inteiro e placares da T1 até a 1ª mudança real de força (rodada 20); identidade dos jogadores; força fixa no Controle em todas as rodadas; nenhuma alteração de força pela lógica do jogo nas viradas; strengthCurrent preservado nas transferências; a composição só altera Player.strength (todas as rodadas).

- Nenhuma divergência além de strengthCurrent. ✔

**Derivadas da força (registradas, esperadas):**

- id e seed das 380 rodadas idênticos. Temporadas que começam com os mesmos clubes em cada divisão: T1, T2, T3; com os mesmos clubes NA MESMA ORDEM (a ordem vem da classificação final, via applyPromotionRelegation, e define o sorteio do calendário): T1 — calendário idêntico nestas. Rodadas com calendário diferente por divisões/ordem diferentes: 342
- primeiro placar diferente: T1 R21
- jogadores que só existem em um mundo (base gerada por necessidade do elenco): 62 só no Controle, 61 só no Desenvolvimento
- transferências entre divisões na intertemporada: Controle 28, Desenvolvimento 25
- juniores gerados com o mesmo id mas outra posição/força (o id é clube-temporada-número; posição vem da necessidade do elenco e força da divisão do clube): 59

| Temporada | placares diferentes | clubes em outra divisão (fim) | clubes com caixa diferente |
|---|---:|---:|---:|
| 1 | 31 / 1520 | 0 | 28 |
| 2 | 263 / 1520 | 0 | 79 |
| 3 | 577 / 1520 | 20 | 80 |
| 4 | 550 / 1520 | 25 | 80 |
| 5 | 538 / 1520 | 34 | 80 |
| 6 | 590 / 1520 | 35 | 80 |
| 7 | 589 / 1520 | 27 | 80 |
| 8 | 562 / 1520 | 34 | 80 |
| 9 | 631 / 1520 | 39 | 80 |
| 10 | 600 / 1520 | 32 | 80 |

## Desenvolvimento — Controle (A) × Desenvolvimento (B), fim de cada temporada

Todos os jogadores com clube no fim da temporada em cada mundo.

| T | média A | média B | mediana A/B | P10 A/B | P90 A/B | 1–10 A/B | 11–20 A/B | 21–30 A/B | 31–40 A/B | 41–50 A/B | =50 A/B | =1 A/B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 25,49 | 25,58 | 26/26 | 12/13 | 38/38 | 117/118 | 490/480 | 674/672 | 545/557 | 94/93 | 2/2 | 1/1 |
| 2 | 25,53 | 25,40 | 26/26 | 12/12 | 38/38 | 115/130 | 486/489 | 674/659 | 545/541 | 94/95 | 2/2 | 1/1 |
| 3 | 25,56 | 25,27 | 26/25 | 12/12 | 38/38 | 112/130 | 455/455 | 634/633 | 516/504 | 91/85 | 2/2 | 1/5 |
| 4 | 25,43 | 25,01 | 26/25 | 12/12 | 37/38 | 110/131 | 435/441 | 612/613 | 481/452 | 84/86 | 2/2 | 1/11 |
| 5 | 25,27 | 24,86 | 25/25 | 12/11 | 37/38 | 109/129 | 416/429 | 580/573 | 448/414 | 78/86 | 2/2 | 1/11 |
| 6 | 25,06 | 24,51 | 25/25 | 12/11 | 37/38 | 108/144 | 415/417 | 549/549 | 424/373 | 73/82 | 2/2 | 0/11 |
| 7 | 24,90 | 24,24 | 25/24 | 12/11 | 37/38 | 104/138 | 414/422 | 535/527 | 398/351 | 67/76 | 2/1 | 0/11 |
| 8 | 24,54 | 23,93 | 24/24 | 12/11 | 37/38 | 106/140 | 425/425 | 520/521 | 373/322 | 61/73 | 2/1 | 0/17 |
| 9 | 24,16 | 23,69 | 24/24 | 12/11 | 37/38 | 109/146 | 431/422 | 525/520 | 344/305 | 56/70 | 1/0 | 0/19 |
| 10 | 23,72 | 23,44 | 23/23 | 11/10 | 36/37 | 113/153 | 449/414 | 513/517 | 327/304 | 51/64 | 1/0 | 0/20 |

Mudança de força no mundo B em cada temporada (jogadores com desenvolvimento e clube no fim):

| T | mudaram | subiram | caíram | magnitude média (quem mudou) | variação média | maior ganho | maior queda |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 350 | 255 | 95 | 1,05 | +0,091 | +2 | -2 |
| 2 | 1105 | 328 | 777 | 1,12 | -0,216 | +2 | -2 |
| 3 | 1000 | 277 | 723 | 1,08 | -0,250 | +2 | -3 |
| 4 | 884 | 237 | 647 | 1,07 | -0,250 | +2 | -2 |
| 5 | 603 | 167 | 436 | 1,09 | -0,185 | +2 | -2 |
| 6 | 773 | 129 | 644 | 1,11 | -0,359 | +3 | -2 |
| 7 | 720 | 108 | 612 | 1,10 | -0,360 | +3 | -2 |
| 8 | 662 | 124 | 538 | 1,16 | -0,296 | +3 | -2 |
| 9 | 619 | 164 | 455 | 1,20 | -0,204 | +3 | -2 |
| 10 | 668 | 179 | 489 | 1,19 | -0,218 | +3 | -3 |

**Acumulado (strengthCurrent − strengthBase, 2261 jogadores que tiveram desenvolvimento):** maior ganho +13, maior queda -10; +5 ou mais: 167; −5 ou mais: 613; +10 ou mais: 2; −10 ou mais: 2; chegaram a 50 alguma vez: 0; chegaram a 1 alguma vez: 31. Mesmo conjunto (1111 jogadores em clube no início da T1 e no fim da T10): variação média -0,91.

Quem chegou a 1: força inicial ≤ 10: 31; 11–15: 0; 16+: 0.

## Engine — Controle (A) × Desenvolvimento (B)

### 10 temporadas

| Métrica | A | B | Δ |
|---|---:|---:|---:|
| partidas | 15200 | 15200 | 0 |
| gols por partida | 2,710 | 2,686 | -0,024 |
| gols por time | 1,355 | 1,343 | -0,012 |
| chances por partida | 7,68 | 7,67 | -0,009 |
| conversão (gols/chances) | 35,3% | 35,0% | -0,3 p.p. |
| vitória mandante | 43,8% | 43,5% | -0,3 p.p. |
| empate | 24,7% | 25,2% | +0,6 p.p. |
| vitória visitante | 31,5% | 31,2% | -0,3 p.p. |
| jogos com favorito | 15114 | 15093 | -21 |
| vitória do favorito | 45,3% | 44,5% | -0,8 p.p. |
| empate (com favorito) | 24,7% | 25,2% | +0,5 p.p. |
| vitória do azarão | 30,0% | 30,3% | +0,3 p.p. |
| diferença média de força (titulares) | 4,46 | 4,36 | -0,097 |
| diferença média de gols | 1,312 | 1,289 | -0,023 |
| 0×0 | 6,9% | 7,0% | +0,0 p.p. |
| 1×0 | 18,2% | 18,8% | +0,6 p.p. |
| 1×1 | 11,6% | 12,0% | +0,4 p.p. |
| 2×1 | 15,9% | 15,9% | 0,0 p.p. |
| 3×1 | 7,9% | 7,5% | -0,4 p.p. |
| 4+ gols | 28,8% | 28,3% | -0,5 p.p. |
| 5+ gols | 13,7% | 13,6% | -0,2 p.p. |
| 7+ gols | 2,4% | 2,3% | -0,1 p.p. |

Favorito = time com maior força média dos titulares do apito inicial (força que o engine recebeu naquela partida).

### Por temporada

| T | gols/partida A | B | conversão A | B | favorito vence A | B | azarão vence A | B | dif. força A | B | 4+ A | B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2,746 | 2,747 | 35,5% | 35,5% | 47,1% | 46,6% | 28,6% | 28,7% | 5,10 | 5,08 | 29,8% | 29,9% |
| 2 | 2,654 | 2,664 | 35,0% | 35,0% | 44,9% | 42,7% | 30,2% | 31,3% | 4,67 | 4,52 | 29,0% | 29,1% |
| 3 | 2,739 | 2,746 | 36,0% | 35,9% | 46,0% | 44,8% | 29,3% | 30,1% | 4,80 | 4,72 | 29,2% | 29,8% |
| 4 | 2,764 | 2,728 | 35,9% | 35,4% | 44,1% | 45,3% | 30,7% | 30,7% | 3,88 | 3,96 | 29,4% | 29,3% |
| 5 | 2,713 | 2,686 | 35,4% | 34,9% | 44,6% | 43,0% | 31,2% | 31,5% | 4,49 | 4,07 | 29,0% | 28,3% |
| 6 | 2,636 | 2,605 | 34,1% | 33,7% | 44,4% | 44,8% | 31,1% | 30,7% | 4,12 | 4,69 | 26,8% | 26,3% |
| 7 | 2,668 | 2,657 | 34,6% | 34,5% | 45,8% | 44,9% | 30,2% | 29,7% | 4,07 | 4,14 | 28,2% | 27,8% |
| 8 | 2,721 | 2,728 | 35,6% | 35,6% | 42,0% | 42,4% | 30,5% | 30,9% | 4,31 | 4,04 | 29,1% | 28,7% |
| 9 | 2,760 | 2,683 | 35,7% | 34,9% | 48,3% | 46,5% | 28,0% | 29,0% | 5,11 | 4,39 | 29,7% | 27,6% |
| 10 | 2,701 | 2,616 | 35,1% | 34,6% | 46,0% | 44,1% | 30,4% | 30,1% | 4,00 | 3,98 | 28,2% | 26,1% |

### Por divisão (10 temporadas)

**D1**

| Métrica | A | B | Δ |
|---|---:|---:|---:|
| partidas | 3800 | 3800 | 0 |
| gols por partida | 2,456 | 2,468 | +0,012 |
| gols por time | 1,228 | 1,234 | +0,006 |
| chances por partida | 7,57 | 7,64 | +0,071 |
| conversão (gols/chances) | 32,4% | 32,3% | -0,1 p.p. |
| vitória mandante | 43,3% | 43,2% | -0,2 p.p. |
| empate | 26,9% | 27,5% | +0,6 p.p. |
| vitória visitante | 29,8% | 29,3% | -0,5 p.p. |
| jogos com favorito | 3782 | 3773 | -9 |
| vitória do favorito | 40,8% | 40,2% | -0,6 p.p. |
| empate (com favorito) | 26,9% | 27,4% | +0,5 p.p. |
| vitória do azarão | 32,3% | 32,4% | +0,1 p.p. |
| diferença média de força (titulares) | 4,52 | 4,02 | -0,499 |
| diferença média de gols | 1,192 | 1,176 | -0,016 |
| 0×0 | 8,8% | 8,6% | -0,2 p.p. |
| 1×0 | 21,3% | 21,3% | 0,0 p.p. |
| 1×1 | 12,9% | 12,8% | -0,1 p.p. |
| 2×1 | 16,1% | 15,9% | -0,2 p.p. |
| 3×1 | 7,7% | 7,2% | -0,4 p.p. |
| 4+ gols | 23,5% | 23,8% | +0,3 p.p. |
| 5+ gols | 9,7% | 9,8% | +0,1 p.p. |
| 7+ gols | 1,4% | 1,4% | 0,0 p.p. |

**D2**

| Métrica | A | B | Δ |
|---|---:|---:|---:|
| partidas | 3800 | 3800 | 0 |
| gols por partida | 2,639 | 2,572 | -0,067 |
| gols por time | 1,319 | 1,286 | -0,033 |
| chances por partida | 7,73 | 7,64 | -0,093 |
| conversão (gols/chances) | 34,1% | 33,7% | -0,5 p.p. |
| vitória mandante | 43,5% | 43,5% | +0,0 p.p. |
| empate | 25,2% | 25,5% | +0,3 p.p. |
| vitória visitante | 31,3% | 30,9% | -0,3 p.p. |
| jogos com favorito | 3781 | 3768 | -13 |
| vitória do favorito | 44,5% | 43,6% | -0,9 p.p. |
| empate (com favorito) | 25,1% | 25,5% | +0,4 p.p. |
| vitória do azarão | 30,4% | 31,0% | +0,6 p.p. |
| diferença média de força (titulares) | 4,66 | 4,84 | +0,185 |
| diferença média de gols | 1,298 | 1,267 | -0,030 |
| 0×0 | 7,6% | 7,6% | 0,0 p.p. |
| 1×0 | 18,6% | 20,1% | +1,5 p.p. |
| 1×1 | 11,8% | 12,1% | +0,3 p.p. |
| 2×1 | 15,8% | 15,6% | -0,2 p.p. |
| 3×1 | 7,4% | 6,7% | -0,7 p.p. |
| 4+ gols | 27,4% | 25,5% | -1,9 p.p. |
| 5+ gols | 12,8% | 12,2% | -0,6 p.p. |
| 7+ gols | 2,1% | 1,9% | -0,2 p.p. |

**D3**

| Métrica | A | B | Δ |
|---|---:|---:|---:|
| partidas | 3800 | 3800 | 0 |
| gols por partida | 2,786 | 2,774 | -0,012 |
| gols por time | 1,393 | 1,387 | -0,006 |
| chances por partida | 7,71 | 7,73 | +0,019 |
| conversão (gols/chances) | 36,2% | 35,9% | -0,3 p.p. |
| vitória mandante | 43,8% | 43,2% | -0,6 p.p. |
| empate | 24,2% | 24,8% | +0,6 p.p. |
| vitória visitante | 31,9% | 32,0% | +0,1 p.p. |
| jogos com favorito | 3771 | 3778 | +7 |
| vitória do favorito | 45,0% | 43,9% | -1,1 p.p. |
| empate (com favorito) | 24,2% | 24,8% | +0,6 p.p. |
| vitória do azarão | 30,8% | 31,3% | +0,5 p.p. |
| diferença média de força (titulares) | 4,02 | 4,23 | +0,211 |
| diferença média de gols | 1,340 | 1,327 | -0,013 |
| 0×0 | 6,3% | 6,5% | +0,2 p.p. |
| 1×0 | 17,5% | 17,9% | +0,4 p.p. |
| 1×1 | 11,6% | 11,9% | +0,4 p.p. |
| 2×1 | 15,6% | 15,6% | +0,1 p.p. |
| 3×1 | 8,1% | 7,6% | -0,5 p.p. |
| 4+ gols | 30,3% | 30,1% | -0,2 p.p. |
| 5+ gols | 15,0% | 15,1% | +0,1 p.p. |
| 7+ gols | 2,8% | 2,7% | -0,1 p.p. |

**D4**

| Métrica | A | B | Δ |
|---|---:|---:|---:|
| partidas | 3800 | 3800 | 0 |
| gols por partida | 2,960 | 2,930 | -0,030 |
| gols por time | 1,480 | 1,465 | -0,015 |
| chances por partida | 7,72 | 7,69 | -0,032 |
| conversão (gols/chances) | 38,3% | 38,1% | -0,2 p.p. |
| vitória mandante | 44,7% | 44,2% | -0,5 p.p. |
| empate | 22,4% | 23,2% | +0,7 p.p. |
| vitória visitante | 32,9% | 32,6% | -0,2 p.p. |
| jogos com favorito | 3780 | 3774 | -6 |
| vitória do favorito | 50,9% | 50,4% | -0,5 p.p. |
| empate (com favorito) | 22,5% | 23,2% | +0,6 p.p. |
| vitória do azarão | 26,6% | 26,4% | -0,1 p.p. |
| diferença média de força (titulares) | 4,62 | 4,33 | -0,285 |
| diferença média de gols | 1,419 | 1,385 | -0,034 |
| 0×0 | 5,0% | 5,2% | +0,2 p.p. |
| 1×0 | 15,6% | 16,1% | +0,6 p.p. |
| 1×1 | 10,3% | 11,1% | +0,9 p.p. |
| 2×1 | 16,1% | 16,3% | +0,2 p.p. |
| 3×1 | 8,3% | 8,3% | +0,1 p.p. |
| 4+ gols | 34,2% | 33,8% | -0,4 p.p. |
| 5+ gols | 17,4% | 17,2% | -0,2 p.p. |
| 7+ gols | 3,3% | 3,2% | -0,1 p.p. |

## Divisões

Força média de todos os jogadores dos elencos no fim de cada temporada (início: A = B).

| T | D1 A/B | D2 A/B | D3 A/B | D4 A/B | D1−D2 A/B | D2−D3 A/B | D3−D4 A/B | D1−D4 A/B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 33,89 | 31,47 | 21,95 | 14,63 | 2,42 | 9,52 | 7,33 | 19,26 |
| 1 | 33,89/34,00 | 31,47/31,55 | 21,95/22,03 | 14,63/14,72 | 2,42/2,45 | 9,52/9,52 | 7,33/7,32 | 19,26/19,29 |
| 2 | 35,12/34,99 | 29,86/29,72 | 22,67/22,55 | 14,17/14,07 | 5,27/5,27 | 7,18/7,18 | 8,50/8,48 | 20,95/20,93 |
| 3 | 35,50/35,16 | 29,79/28,99 | 21,36/21,97 | 15,13/14,51 | 5,71/6,17 | 8,43/7,02 | 6,23/7,46 | 20,37/20,64 |
| 4 | 35,74/34,84 | 29,27/29,30 | 22,55/21,50 | 13,81/13,95 | 6,47/5,54 | 6,73/7,80 | 8,74/7,55 | 21,93/20,89 |
| 5 | 35,39/34,32 | 29,25/29,55 | 21,73/21,60 | 14,46/13,65 | 6,14/4,77 | 7,51/7,96 | 7,28/7,94 | 20,93/20,67 |
| 6 | 35,07/34,08 | 28,95/28,35 | 22,37/21,86 | 13,82/13,72 | 6,12/5,73 | 6,59/6,49 | 8,54/8,14 | 21,25/20,36 |
| 7 | 35,29/33,77 | 28,12/28,09 | 21,70/21,01 | 14,29/13,76 | 7,17/5,68 | 6,42/7,07 | 7,41/7,25 | 21,00/20,00 |
| 8 | 34,48/33,27 | 27,62/27,78 | 21,79/21,06 | 14,01/13,45 | 6,86/5,49 | 5,83/6,71 | 7,78/7,61 | 20,47/19,82 |
| 9 | 33,40/32,55 | 26,92/27,80 | 21,56/20,62 | 14,53/13,72 | 6,48/4,75 | 5,36/7,18 | 7,03/6,90 | 18,88/18,83 |
| 10 | 33,46/32,62 | 26,70/27,04 | 20,96/20,73 | 13,59/13,27 | 6,76/5,58 | 5,74/6,30 | 7,37/7,46 | 19,87/19,35 |

Oscilação natural no Controle (força fixa; só acesso/rebaixamento, mercado, base e aposentadoria): D1−D2 2,42 a 7,17; D2−D3 5,36 a 9,52; D3−D4 6,23 a 8,74; D1−D4 18,88 a 21,93. Como os dois mundos sobem e rebaixam clubes diferentes a partir da T3, a comparação B × A temporada a temporada mistura o efeito do desenvolvimento com essa oscilação.

Após 10 temporadas (B comparado com A): D1−D2 convergiu; D2−D3 divergiu; D3−D4 estável; D1−D4 convergiu (tolerância ±0,25).

## Feedback

| Pergunta | Resposta |
|---|---:|
| 1. quantos mudaram strengthCurrent (acumulado) | 2026 de 2261 |
| 2. magnitude média da mudança (acumulada, quem mudou) | 3,94 |
| 3. mais fortes (acumulado) | 672 |
| 4. mais fracos (acumulado) | 1354 |
| 5. chegaram a 50 | 0 |
| 6. chegaram a 1 | 31 |
| 7. médias por divisão | D1−D2 6,76 (A) × 5,58 (B); D2−D3 5,74 (A) × 6,30 (B); D3−D4 7,37 (A) × 7,46 (B) |

Retroalimentação pela tabela (mundo B): variação média na temporada dos jogadores dos 4 primeiros − 4 últimos de cada divisão.

| T | D1 | D2 | D3 | D4 |
|---|---:|---:|---:|---:|
| 1 | -0,09 | +0,07 | +0,03 | +0,06 |
| 2 | 0,00 | +0,14 | +0,06 | -0,13 |
| 3 | +0,11 | -0,12 | +0,12 | +0,04 |
| 4 | +0,31 | -0,11 | +0,01 | +0,04 |
| 5 | +0,10 | +0,04 | +0,10 | +0,04 |
| 6 | +0,18 | +0,03 | +0,02 | +0,20 |
| 7 | +0,19 | +0,18 | -0,12 | +0,31 |
| 8 | -0,01 | -0,09 | +0,10 | +0,34 |
| 9 | -0,04 | +0,07 | -0,24 | +0,47 |
| 10 | +0,21 | +0,17 | +0,24 | +0,13 |

## Casos acompanhados (10 temporadas)

Escolhidos na T1 (ou na 1ª transferência), no mundo B. "A" = força no Controle (fixa), "B" = strengthCurrent no fim da temporada. Linhas param na aposentadoria.

### jovem fraco titular na D1 — Leandro Macedo (DEF, força inicial 28)

Critério: até 21 anos, D1, ≥ 60% dos minutos na T1, força abaixo da média da D1; o mais fraco.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 20 | D1 | 2672 | -0,07 | 28 | 29 | +1 |
| 2 | 21 | D2 | 2910 | -0,07 | 28 | 30 | +1 |
| 3 | 22 | D3 | 2586 | 0,03 | 28 | 31 | +1 |
| 4 | 23 | D2 (transferido da D3) | 1201 | 0,05 | 28 | 31 | 0 |
| 5 | 24 | D1 | 2526 | 0,10 | 28 | 32 | +1 |
| 6 | 25 | D1 | 3002 | 0,06 | 28 | 33 | +1 |
| 7 | 26 | D1 | 3110 | 0,04 | 28 | 34 | +1 |
| 8 | 27 | D2 | 3150 | 0,09 | 28 | 34 | 0 |
| 9 | 28 | D2 | 2824 | 0,08 | 28 | 34 | 0 |
| 10 | 29 | D2 | 3127 | 0,16 | 28 | 34 | 0 |

### jovem fraco reserva na D1 — Elias Jardim (MEI, força inicial 22)

Critério: até 21 anos, D1, < 25% dos minutos na T1, força abaixo da média da D1; o mais fraco.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 19 | D1 | 0 | – | 22 | 22 | 0 |
| 2 | 20 | D2 | 0 | – | 22 | 22 | 0 |
| 3 | 21 | D3 | 0 | – | 22 | 22 | 0 |
| 4 | 22 | D3 | 90 | -0,20 | 22 | 22 | 0 |
| 5 | 23 | D3 | 90 | 0,20 | 22 | 22 | 0 |
| 6 | 24 | D3 | 450 | 0,18 | 22 | 21 | -1 |
| 7 | 25 | D3 | 375 | 0,48 | 22 | 21 | 0 |
| 8 | 26 | D2 | 1215 | 0,00 | 22 | 21 | 0 |
| 9 | 27 | D3 | 1560 | 0,05 | 22 | 21 | 0 |
| 10 | 28 | D3 | 97 | 0,35 | 22 | 21 | 0 |

### jovem forte titular na D4 — Paulo Almeida Ientes (DEF, força inicial 28)

Critério: até 21 anos, D4, ≥ 60% dos minutos na T1; o mais forte.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 17 | D4 | 3190 | 0,16 | 28 | 28 | 0 |
| 2 | 18 | D3 | 3240 | -0,01 | 28 | 28 | 0 |
| 3 | 19 | D3 | 3139 | 0,05 | 28 | 29 | +1 |
| 4 | 20 | D3 | 3129 | 0,06 | 28 | 29 | 0 |
| 5 | 21 | D3 | 3141 | 0,03 | 28 | 29 | 0 |
| 6 | 22 | D3 | 3240 | 0,09 | 28 | 29 | 0 |
| 7 | 23 | D3 | 3127 | 0,07 | 28 | 29 | 0 |
| 8 | 24 | D3 | 3240 | 0,00 | 28 | 29 | 0 |
| 9 | 25 | D3 | 3330 | -0,10 | 28 | 29 | 0 |
| 10 | 26 | D4 | 3298 | 0,14 | 28 | 29 | 0 |

### veterano bom titular — Paulo Zanetti (GOL, força inicial 42)

Critério: 31+, ≥ 70% dos minutos na T1; maior rendimento médio.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 34 | D1 | 3296 | 0,34 | 42 | 42 | 0 |
| 2 | 35 | D1 | 3420 | 0,25 | 42 | 42 | 0 |
| 3 | 36 | D1 | 3420 | 0,26 | 42 | 42 | 0 |
| 4 | — fora de clube ou aposentado | | | | | | |

### veterano ruim titular — Wallace Barbosa Macedo (ATA, força inicial 22)

Critério: 31+, ≥ 70% dos minutos na T1; menor rendimento médio.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 31 | D3 | 3097 | -0,13 | 22 | 22 | 0 |
| 2 | 32 | D4 | 1260 | 0,10 | 22 | 21 | -1 |
| 3 | 33 | D3 | 1479 | 0,02 | 22 | 20 | -1 |
| 4 | 34 | D4 | 1440 | 0,01 | 22 | 18 | -2 |
| 5 | 35 | D4 | 930 | -0,01 | 22 | 17 | -1 |
| 6 | 36 | D3 | 450 | 0,12 | 22 | 16 | -1 |
| 7 | — fora de clube ou aposentado | | | | | | |

### veterano sem minutos — Renan Oliveira (GOL, força inicial 45)

Critério: 31+, zero minutos na T1; o mais forte.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 31 | D1 | 0 | – | 45 | 45 | 0 |
| 2 | 32 | D1 | 0 | – | 45 | 44 | -1 |
| 3 | 33 | D1 | 209 | -0,07 | 45 | 43 | -1 |
| 4 | 34 | D2 | 0 | – | 45 | 42 | -1 |
| 5 | 35 | D1 | 0 | – | 45 | 42 | 0 |
| 6 | 36 | D1 | 0 | – | 45 | 41 | -1 |
| 7 | — fora de clube ou aposentado | | | | | | |

### estrela 46+ — Fábio Siqueira Rezende (DEF, força inicial 50)

Critério: força inicial ≥ 46; a mais forte.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 29 | D1 | 2868 | 0,13 | 50 | 50 | 0 |
| 2 | 30 | D1 | 2963 | 0,16 | 50 | 50 | 0 |
| 3 | 31 | D1 | 2902 | 0,14 | 50 | 50 | 0 |
| 4 | 32 | D1 | 3124 | 0,17 | 50 | 50 | 0 |
| 5 | 33 | D1 | 3013 | 0,09 | 50 | 50 | 0 |
| 6 | 34 | D1 | 3150 | 0,10 | 50 | 50 | 0 |
| 7 | 35 | D1 | 3240 | 0,11 | 50 | 49 | -1 |
| 8 | 36 | D1 | 3000 | 0,14 | 50 | 48 | -1 |
| 9 | — fora de clube ou aposentado | | | | | | |

### transferido entre divisões — André Oliveira (ATA, força inicial 43)

Critério: primeira transferência da CPU para uma divisão de cima (mundo B); a mais forte da temporada.

| T | idade | divisão | minutos | rendimento médio | A | B | Δ temporada |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 34 | D2 | 3273 | 0,13 | 43 | 43 | 0 |
| 2 | 35 | D1 (transferido da D2) | 3330 | 0,09 | 43 | 42 | -1 |
| 3 | 36 | D1 | 3095 | 0,11 | 43 | 41 | -1 |
| 4 | — fora de clube ou aposentado | | | | | | |

## Critérios de segurança

| Critério | medida | temporadas em que disparou |
|---|---:|---:|
| inflação/deflação forte | média do mundo B − média do mundo A, em módulo, > 2,0 | nenhuma |
| concentração em 50 | jogadores com exatamente 50: B − A > 5 | nenhuma |
| concentração em 1 | jogadores com exatamente 1: B − A > 10 | **T6, T7, T8, T9, T10** |
| mudança extrema de gols | gols por partida B/A − 1, em módulo, > 5% | nenhuma |
| mudança extrema de conversão | conversão B/A − 1, em módulo, > 5% | nenhuma |
| favorito dominante demais | vitória do favorito B − A > +5 p.p. | nenhuma |
| divisão inferior forte demais | distância entre divisões vizinhas em B < 75% da de A, ou invertida | **T9** |
| retroalimentação positiva explosiva | topo 4 − fundo 4 > +1,0 numa divisão, ou variação média da temporada > +0,5 e crescendo 3 temporadas seguidas | nenhuma |

**Disparou:** concentração em 1 (a partir da T6); divisão inferior forte demais (a partir da T9). Registrado; nenhum balanceamento foi alterado.

## Limitações

- Uma seed; carreira sem decisões manuais (o clube do treinador escala o melhor time disponível).
- Favorito medido pela força média dos titulares; não considera tática nem mando.
- Os critérios de segurança são limiares de alerta deste relatório, não regras do jogo.
- Juniores gerados pela base nascem com a força da geração; no mundo B, essa é a strengthBase deles.

## Determinismo

O experimento inteiro (A + B, 10 temporadas cada) rodou duas vezes no mesmo processo.

| Hash | execução 1 | execução 2 | igual? |
|---|---:|---:|---:|
| placares Controle | `45a09aa4a9e7ea6a…` | `45a09aa4a9e7ea6a…` | ✔ |
| placares Desenvolvimento | `e856ed3d501d8fe5…` | `e856ed3d501d8fe5…` | ✔ |
| evolução (strengthCurrent + progresso por rodada) | `34b13ae63516fc30…` | `34b13ae63516fc30…` | ✔ |
| relatório (sem esta seção) | `f413403331a6c73a…` | `f413403331a6c73a…` | ✔ |

Hashes completos no JSON. Resultado: **determinístico**.
