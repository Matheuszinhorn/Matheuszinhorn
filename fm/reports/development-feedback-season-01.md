# DEV-INTEGRATION-0.1 — teste de feedback, temporada 1

> **Teste de integração EXPERIMENTAL.** Não é integração oficial; nada entra no produto, nos saves, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado. A única diferença entre os mundos é `Player.strength` = strengthCurrent no mundo de Desenvolvimento.

## Configuração

- Candidata: **DEV-PROTO-0.4-BB** — limite conjunto −0,75/temporada sem participação; preservação parcial; divisão como oportunidade (peso 0.5); sem piso de strengthBase; curva de idade inalterada.
- Seed `elite-dev-world-10`, universo fictício, carreira gerenciada sem decisões manuais, 38 rodadas, 1520 partidas por mundo.
- **Controle:** strengthBase → Engine 0.2.0 (`finishManagedRound(..., { evolution: false })`: força fixa a temporada toda).
- **Desenvolvimento:** mesma coisa + `game/development/feedback.ts` depois de cada rodada: `stepDevelopment` observa as partidas e `withDevelopedStrength` devolve o mundo com Player.strength = strengthCurrent. A força só muda no fim das janelas (rodadas 5, 10, …, 35, 38), então vale a partir da rodada seguinte.
- Efeitos esperados da força (não são divergências independentes): a escalação automática ordena por força, então titulares/reservas, placares, lesões, cartões, tabela, caixa e mercado podem mudar depois da 1ª janela.

## Divergências

**Obrigatoriamente idênticos (divergência = erro):** universo inicial; calendário, seeds e mandos de todas as rodadas; mundo inteiro e placares até a rodada da 1ª mudança real de força (rodada 20; nenhum ±1 antes dela); identidade/idade/posição/temperamento dos jogadores; composição das divisões; força fixa no Controle; a composição só altera Player.strength (conferido em todas as rodadas).

- Nenhuma divergência além de strengthCurrent. ✔

**Derivadas da força (registradas, esperadas):**

- placares diferentes em 31 de 1520 partidas (primeira na rodada 21)
- jogadores com clube diferente no fim: 0; condição (lesão/suspensão/amarelos) diferente: 257; valor de mercado diferente: 0; salário diferente: 0; contrato diferente: 0
- clubes com caixa diferente no fim: 28 de 80

## Desenvolvimento — Controle (base) × Experimental (atual)

| Métrica | Controle (strengthBase) | Experimental (strengthCurrent) | Δ |
|---|---:|---:|---:|
| média | 25,49 | 25,58 | +0,09 |
| mediana | 26 | 26 | 0 |
| P10 | 12 | 13 | +1 |
| P90 | 38 | 38 | 0 |
| 1–10 | 117 | 118 | +1 |
| 11–20 | 490 | 480 | -10 |
| 21–30 | 674 | 672 | -2 |
| 31–40 | 545 | 557 | +12 |
| 41–50 | 94 | 93 | -1 |
| exatamente 50 | 2 | 2 | 0 |
| exatamente 1 | 1 | 1 | 0 |
| maior ganho | – | +2 | |
| maior queda | – | -2 | |

Mesmo conjunto: 1920 jogadores com clube no fim do mundo experimental (base = força no início, igual à do Controle). Conferência: a distribuição de força do mundo Controle no fim (todos com clube, n=1920) tem média 25,49, mediana 26, P10 12, P90 38.

## Engine — Controle × Experimental

| Métrica | Controle | Experimental | Δ |
|---|---:|---:|---:|
| partidas | 1520 | 1520 | 0 |
| gols por partida | 2,746 | 2,747 | +0,001 |
| gols por time | 1,373 | 1,373 | +0,000 |
| chances por partida | 7,74 | 7,75 | +0,011 |
| conversão (gols/chances) | 35,5% | 35,5% | 0,0 p.p. |
| vitória mandante | 41,4% | 41,3% | -0,1 p.p. |
| empate | 24,3% | 24,7% | +0,3 p.p. |
| vitória visitante | 34,3% | 34,0% | -0,3 p.p. |
| jogos com favorito | 1511 | 1512 | +1 |
| vitória do favorito | 47,1% | 46,6% | -0,4 p.p. |
| empate (com favorito) | 24,4% | 24,7% | +0,3 p.p. |
| vitória do azarão | 28,6% | 28,7% | +0,1 p.p. |
| diferença média de força (titulares) | 5,10 | 5,08 | -0,019 |
| diferença média de gols | 1,301 | 1,297 | -0,005 |
| 0×0 | 7,4% | 7,4% | 0,0 p.p. |
| 1×0 | 17,8% | 17,7% | -0,1 p.p. |
| 1×1 | 10,5% | 10,7% | +0,2 p.p. |
| 2×1 | 16,7% | 16,5% | -0,2 p.p. |
| 3×1 | 8,2% | 8,4% | +0,1 p.p. |
| 4+ gols | 29,8% | 29,9% | +0,1 p.p. |
| 5+ gols | 14,8% | 14,7% | -0,1 p.p. |
| 7+ gols | 2,2% | 2,2% | 0,0 p.p. |

Favorito = time com maior força média dos titulares em campo no apito inicial (força que o engine recebeu naquela partida); "diferença média de força" usa a mesma medida.

### Por divisão

**D1**

| Métrica | Controle | Experimental |
|---|---:|---:|
| partidas | 380 | 380 |
| gols por partida | 2,626 | 2,624 |
| gols por time | 1,313 | 1,312 |
| chances por partida | 7,67 | 7,66 |
| conversão (gols/chances) | 34,3% | 34,2% |
| vitória mandante | 42,6% | 42,6% |
| empate | 24,5% | 25,0% |
| vitória visitante | 32,9% | 32,4% |
| jogos com favorito | 378 | 380 |
| vitória do favorito | 44,2% | 43,4% |
| empate (com favorito) | 24,6% | 25,0% |
| vitória do azarão | 31,2% | 31,6% |
| diferença média de força (titulares) | 5,06 | 5,04 |
| diferença média de gols | 1,253 | 1,239 |
| 0×0 | 9,2% | 9,5% |
| 1×0 | 17,4% | 17,4% |
| 1×1 | 9,7% | 9,7% |
| 2×1 | 16,8% | 17,1% |
| 3×1 | 8,9% | 8,9% |
| 4+ gols | 27,9% | 27,9% |
| 5+ gols | 12,6% | 12,6% |
| 7+ gols | 2,1% | 2,1% |

**D2**

| Métrica | Controle | Experimental |
|---|---:|---:|
| partidas | 380 | 380 |
| gols por partida | 2,539 | 2,539 |
| gols por time | 1,270 | 1,270 |
| chances por partida | 7,56 | 7,58 |
| conversão (gols/chances) | 33,6% | 33,5% |
| vitória mandante | 42,1% | 42,1% |
| empate | 24,5% | 24,7% |
| vitória visitante | 33,4% | 33,2% |
| jogos com favorito | 377 | 375 |
| vitória do favorito | 46,2% | 46,4% |
| empate (com favorito) | 24,4% | 24,5% |
| vitória do azarão | 29,4% | 29,1% |
| diferença média de força (titulares) | 5,53 | 5,51 |
| diferença média de gols | 1,239 | 1,245 |
| 0×0 | 7,1% | 7,1% |
| 1×0 | 21,3% | 21,3% |
| 1×1 | 11,8% | 12,1% |
| 2×1 | 15,3% | 14,7% |
| 3×1 | 7,9% | 7,9% |
| 4+ gols | 24,7% | 24,7% |
| 5+ gols | 11,6% | 11,6% |
| 7+ gols | 1,1% | 1,1% |

**D3**

| Métrica | Controle | Experimental |
|---|---:|---:|
| partidas | 380 | 380 |
| gols por partida | 2,911 | 2,911 |
| gols por time | 1,455 | 1,455 |
| chances por partida | 7,87 | 7,88 |
| conversão (gols/chances) | 37,0% | 37,0% |
| vitória mandante | 40,5% | 40,0% |
| empate | 26,6% | 27,1% |
| vitória visitante | 32,9% | 32,9% |
| jogos com favorito | 378 | 379 |
| vitória do favorito | 43,4% | 42,0% |
| empate (com favorito) | 26,5% | 27,2% |
| vitória do azarão | 30,2% | 30,9% |
| diferença média de força (titulares) | 4,78 | 4,76 |
| diferença média de gols | 1,284 | 1,279 |
| 0×0 | 7,6% | 7,6% |
| 1×0 | 16,6% | 16,3% |
| 1×1 | 10,8% | 11,3% |
| 2×1 | 16,3% | 15,8% |
| 3×1 | 6,8% | 7,1% |
| 4+ gols | 32,6% | 32,9% |
| 5+ gols | 19,5% | 18,9% |
| 7+ gols | 3,2% | 3,4% |

**D4**

| Métrica | Controle | Experimental |
|---|---:|---:|
| partidas | 380 | 380 |
| gols por partida | 2,908 | 2,913 |
| gols por time | 1,454 | 1,457 |
| chances por partida | 7,84 | 7,87 |
| conversão (gols/chances) | 37,1% | 37,0% |
| vitória mandante | 40,3% | 40,5% |
| empate | 21,8% | 21,8% |
| vitória visitante | 37,9% | 37,6% |
| jogos com favorito | 378 | 378 |
| vitória do favorito | 54,5% | 54,8% |
| empate (com favorito) | 22,0% | 22,0% |
| vitória do azarão | 23,5% | 23,3% |
| diferença média de força (titulares) | 5,03 | 5,01 |
| diferença média de gols | 1,429 | 1,424 |
| 0×0 | 5,5% | 5,3% |
| 1×0 | 15,8% | 15,8% |
| 1×1 | 9,7% | 9,7% |
| 2×1 | 18,4% | 18,4% |
| 3×1 | 9,2% | 9,5% |
| 4+ gols | 33,9% | 34,2% |
| 5+ gols | 15,5% | 15,5% |
| 7+ gols | 2,6% | 2,4% |

## Feedback

| Pergunta | Resposta |
|---|---:|
| 1. quantos mudaram strengthCurrent | 350 de 1920 (18,2%) |
| 2. magnitude média da mudança | 1,05 entre os que mudaram · 0,19 sobre todos |
| 3. ficaram mais fortes | 255 |
| 4. ficaram mais fracos | 95 |
| 5. chegaram a 50 | 0 |
| 6. chegaram a 1 | 0 |
| 7. médias por divisão divergiram ou convergiram? | D1−D2 2,42 → 2,45 (estável); D2−D3 9,52 → 9,52 (estável); D3−D4 7,33 → 7,32 (estável); D1−D4 19,26 → 19,29 |

| Divisão | início | fim Controle | fim Experimental | Δ Experimental |
|---|---:|---:|---:|---:|
| D1 | 33,89 | 33,89 | 34,00 | +0,11 |
| D2 | 31,47 | 31,47 | 31,55 | +0,08 |
| D3 | 21,95 | 21,95 | 22,03 | +0,08 |
| D4 | 14,63 | 14,63 | 14,72 | +0,09 |

Força média de todos os jogadores do elenco (com transferências e elencos do fim de cada mundo).

Por janela (mundo experimental; jogadores presentes em todas as janelas):

| Janela (fim na rodada) | variação média | subiram | caíram |
|---|---:|---:|---:|
| 5 | 0,000 | 0 | 0 |
| 10 | 0,000 | 0 | 0 |
| 15 | 0,000 | 0 | 0 |
| 20 | 0,020 | 41 | 3 |
| 25 | 0,030 | 71 | 14 |
| 30 | 0,026 | 73 | 23 |
| 35 | 0,014 | 55 | 29 |
| 38 | 0,002 | 30 | 27 |

Retroalimentação pela tabela (variação média dos jogadores dos 4 primeiros × 4 últimos de cada divisão, mundo experimental):

| Divisão | topo 4 | fundo 4 | topo − fundo |
|---|---:|---:|---:|
| D1 | 0,13 | 0,06 | +0,06 |
| D2 | 0,06 | 0,11 | -0,05 |
| D3 | 0,02 | 0,05 | -0,03 |
| D4 | 0,10 | 0,14 | -0,03 |

## Casos acompanhados

| Caso | Jogador | pos. | idade | divisão | minutos (exp.) | rendimento médio | Controle | janelas (5,10,…,38) | Experimental | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| jovem fraco titular na D1 | Leandro Macedo | DEF | 20 | D1 | 2672 (78,1%) | -0,07 | 28 | 28 · 28 · 28 · 28 · 28 · 29 · 29 · 29 | 29 | +1 |
| jovem fraco reserva na D1 | Elias Jardim | MEI | 19 | D1 | 0 (0,0%) | – | 22 | 22 · 22 · 22 · 22 · 22 · 22 · 22 · 22 | 22 | 0 |
| jovem forte titular na D4 | Paulo Almeida Ientes | DEF | 17 | D4 | 3190 (93,3%) | 0,16 | 28 | 28 · 28 · 28 · 28 · 28 · 28 · 28 · 28 | 28 | 0 |
| veterano bom titular | Paulo Zanetti | GOL | 34 | D1 | 3296 (96,4%) | 0,34 | 42 | 42 · 42 · 42 · 42 · 42 · 42 · 42 · 42 | 42 | 0 |
| veterano ruim titular | Wallace Barbosa Macedo | ATA | 31 | D3 | 3097 (90,6%) | -0,13 | 22 | 22 · 22 · 22 · 22 · 22 · 22 · 22 · 22 | 22 | 0 |
| veterano sem minutos | Renan Oliveira | GOL | 31 | D1 | 0 (0,0%) | – | 45 | 45 · 45 · 45 · 45 · 45 · 45 · 45 · 45 | 45 | 0 |
| estrela 46+ | Fábio Siqueira Rezende | DEF | 29 | D1 | 2868 (83,9%) | 0,13 | 50 | 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 | 50 | 0 |
| transferido entre divisões | — nenhum jogador com o perfil (clube de outra divisão durante a temporada (mundo experimental). A CPU deste fluxo não transfere no meio da temporada (clube diferente no fim entre os mundos: 0), e acesso/rebaixamento só acontece na virada) | | | | | | | | | |

Critérios de escolha: jovem fraco titular na D1 — até 21 anos, D1, ≥ 60% dos minutos, força abaixo da média da D1; o mais fraco; jovem fraco reserva na D1 — até 21 anos, D1, < 25% dos minutos, força abaixo da média da D1; o mais fraco; jovem forte titular na D4 — até 21 anos, D4, ≥ 60% dos minutos; o mais forte; veterano bom titular — 31+, ≥ 70% dos minutos; maior rendimento médio; veterano ruim titular — 31+, ≥ 70% dos minutos; menor rendimento médio; veterano sem minutos — 31+, zero minutos; o mais forte; estrela 46+ — força inicial ≥ 46; a mais forte; transferido entre divisões — clube de outra divisão durante a temporada (mundo experimental). A CPU deste fluxo não transfere no meio da temporada (clube diferente no fim entre os mundos: 0), e acesso/rebaixamento só acontece na virada.

## Critérios de segurança

| Critério | medida | disparou? |
|---|---:|---:|
| inflação/deflação forte | variação média 0,09 (alerta se o módulo passar de 1,0 em uma temporada) | não |
| concentração em 50 | chegaram a 50: 0 (limite 5) | não |
| concentração em 1 | chegaram a 1: 0 (limite 10) | não |
| mudança extrema de gols | gols/partida 2,746 → 2,747 (+0,0%; limite ±5%) | não |
| mudança extrema de conversão | conversão 35,5% → 35,5% (-0,1%; limite ±5%) | não |
| favorito dominante demais | vitória do favorito 47,1% → 46,6% (limite +5 p.p.) | não |
| divisão inferior forte demais | D1−D2: 2,42 → 2,45; D2−D3: 9,52 → 9,52; D3−D4: 7,33 → 7,32 (alerta se alguma distância cair mais de 25% ou inverter) | não |
| retroalimentação positiva explosiva | variação por janela 0,00 · 0,00 · 0,00 · 0,02 · 0,03 · 0,03 · 0,01 · 0,00; topo 4 − fundo 4 da tabela: D1 +0,06 · D2 -0,05 · D3 -0,03 · D4 -0,03 (alerta se a última janela > 2× a primeira e positiva, ou topo − fundo > +1,0) | não |

Nenhum critério de parada disparou. **Mesmo assim, não avançar para 10 temporadas automaticamente** — a decisão é do responsável.

## Limitações

- Uma temporada e uma seed: efeitos de feedback são pequenos por construção (a força só muda a partir da rodada 6 e ±1 por janela).
- Sem envelhecimento/aposentadoria/acesso nesta temporada (só acontecem na virada).
- Favorito medido pela força média dos titulares; não considera tática nem mando.

## Determinismo

O experimento inteiro (Controle + Experimental) rodou duas vezes no mesmo processo.

| Hash | execução 1 | execução 2 | igual? |
|---|---:|---:|---:|
| placares Controle | `c03c031e5987d9ca…` | `c03c031e5987d9ca…` | ✔ |
| placares Experimental | `e732cf76dafd2900…` | `e732cf76dafd2900…` | ✔ |
| evolução (strengthCurrent + progresso por rodada) | `9df3b060824307b4…` | `9df3b060824307b4…` | ✔ |
| relatório (sem esta seção) | `b48bc3de96d43ace…` | `b48bc3de96d43ace…` | ✔ |

Hashes completos no JSON. Resultado: **determinístico**.
