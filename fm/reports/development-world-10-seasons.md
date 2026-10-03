# PlayerDevelopment no mundo real do engine — 10 temporadas

> DEV-PROTO-0.2 em modo observador sobre o universo fictício (seed `elite-dev-world-10`, carreira gerenciada sem decisões manuais). Engine 0.2.0 inalterado; nada integrado; nenhuma força aplicada ao jogo.

## Determinismo e isolamento

- Mundo A sem observador × com observador: hash dos 15200 placares **idêntico** (`af11672f38c73766…`).
- O observador só lê o `MatchState` produzido pelo engine e o estado da carreira; não escreve em nenhum deles. O mundo B nunca devolve força ao engine.
- **Limitação:** como o B é observador, o efeito de volta (jogador que evolui → joga melhor → rende mais) não é medido aqui. Ele exige integrar a força do B nas partidas, o que muda os resultados (etapa futura, com aprovação).

## 1–5. Distribuição (jogadores com clube)

| | n | média | mediana | P10 | P25 | P50 | P75 | P90 | P95 | =1 | =50 | 46–50 | 41–45 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Início — força base | 1920 | 25,5 | 26 | 12 | 18 | 26 | 33 | 38 | 40 | 1 | 2 | 12 | 82 |
| Início — força atual B | 1920 | 25,5 | 26 | 12 | 18 | 26 | 33 | 38 | 40 | 1 | 2 | 12 | 82 |
| Início — mundo A (evolução em uso) | 1920 | 25,5 | 26 | 12 | 18 | 26 | 33 | 38 | 40 | 1 | 2 | 12 | 82 |
| Após 1 temporada — força base | 1920 | 25,5 | 26 | 12 | 18 | 26 | 33 | 38 | 40 | 1 | 2 | 12 | 82 |
| Após 1 temporada — força atual B | 1920 | 25,3 | 25 | 12 | 18 | 25 | 33 | 38 | 40 | 2 | 2 | 14 | 81 |
| Após 1 temporada — mundo A (evolução em uso) | 1920 | 25,5 | 26 | 13 | 19 | 26 | 33 | 38 | 41 | 1 | 2 | 13 | 83 |
| Após 3 — força base | 1809 | 25,6 | 26 | 12 | 19 | 26 | 33 | 38 | 41 | 1 | 2 | 12 | 79 |
| Após 3 — força atual B | 1809 | 24,4 | 25 | 11 | 17 | 25 | 32 | 38 | 41 | 20 | 2 | 16 | 78 |
| Após 3 — mundo A (evolução em uso) | 1809 | 25,8 | 26 | 12 | 19 | 26 | 33 | 38 | 41 | 4 | 4 | 19 | 72 |
| Após 5 — força base | 1633 | 25,3 | 25 | 12 | 18 | 25 | 32 | 37 | 40 | 1 | 2 | 12 | 66 |
| Após 5 — força atual B | 1633 | 23,6 | 24 | 9 | 16 | 24 | 31 | 38 | 41 | 44 | 2 | 15 | 80 |
| Após 5 — mundo A (evolução em uso) | 1633 | 25,8 | 26 | 13 | 19 | 26 | 33 | 38 | 41 | 4 | 1 | 16 | 82 |
| Após 10 — força base | 1452 | 23,6 | 23 | 11 | 16 | 23 | 31 | 36 | 39 | 0 | 1 | 7 | 44 |
| Após 10 — força atual B | 1452 | 22,2 | 22 | 7 | 14 | 22 | 30 | 37 | 41 | 67 | 2 | 12 | 62 |
| Após 10 — mundo A (evolução em uso) | 1452 | 25,5 | 25 | 13 | 19 | 25 | 32 | 38 | 41 | 2 | 2 | 16 | 86 |

"Força base" = strengthBase de quem está em clube naquele momento (inclui a base que entrou depois e exclui aposentados). Por isso a comparação justa de inflação é feita no mesmo conjunto de jogadores (seção 6).

## 6. Inflação / deflação

- Mesmo conjunto (jogadores em clube no início e após 10 temporadas, n = 1111): variação média B -2,3 (mediana 0); mundo A 1,6 (mediana +2).
- Média do mundo inteiro (quem está em clube): início 25,5 → 10 temporadas: B 22,2, A 25,5.
- Trajetória da média: início 25,5 | 1: B 25,3 · A 25,5 | 3: B 24,4 · A 25,8 | 5: B 23,6 · A 25,8 | 10: B 22,2 · A 25,5.

## 7. Distribuição por idade (idade no início do registro)

| Faixa | n | força inicial | força atual | variação média | variação mediana | +5 ou mais | +10 ou mais |
|---|---:|---:|---:|---:|---:|---:|---:|
| até 20 | 741 | 22,1 | 24,1 | 2,0 | +2 | 158 | 1 |
| 21–23 | 290 | 25,8 | 24,2 | -1,6 | +1 | 7 | 0 |
| 24–27 | 421 | 24,8 | 17,4 | -7,4 | -6 | 0 | 0 |
| 28–30 | 308 | 26,2 | 16,3 | -9,9 | -9 | 0 | 0 |
| 31–33 | 294 | 26,0 | 17,9 | -8,1 | -8 | 0 | 0 |
| 34–36 | 207 | 25,6 | 20,9 | -4,6 | -5 | 0 | 0 |
| 37+ | 0 | – | – | – | NaN | 0 | 0 |

Por temporada e idade naquela temporada (cada linha = jogador × temporada):

| Idade na temporada | linhas | variação média | % com +1 ou mais | % com −1 ou menos |
|---|---:|---:|---:|---:|
| até 20 | 1737 | 0,6 | 44,3% | 0,0% |
| 21–23 | 1972 | 0,4 | 38,7% | 5,8% |
| 24–27 | 3735 | -0,2 | 13,1% | 23,7% |
| 28–30 | 3046 | -0,4 | 0,6% | 30,5% |
| 31–33 | 3051 | -1,0 | 0,0% | 64,3% |
| 34–36 | 2942 | -1,8 | 0,0% | 90,7% |
| 37+ | 0 | – | –% | –% |

## 8. Jovens (≤ 20 anos no início do registro)

- 741 jovens. Variação média 2,0, mediana +2; maior evolução +11; +5 ou mais: 158; +10 ou mais: 1.
- Jovens com 38+ partidas completas somadas: 494, variação média 3,4. Jovens com menos de 5 partidas completas: 102, variação média -1,1 → **jovem ≠ evolução automática**: 0 deles subiram.

## 9–10. Titulares × reservas (por temporada)

Classificação por minutos na temporada: titular ≥ 55% dos minutos possíveis; reserva 15–55%; poucos minutos < 15%; sem minutos = 0.

| Uso | linhas | variação média | quedas médias (quem caiu) | linhas com +1 ou mais | linhas com −1 ou menos | % que subiu | % que caiu |
|---|---:|---:|---:|---:|---:|---:|---:|
| titular | 8875 | 0,0 | -1,2 | 1812 | 1699 | 20,4% | 19,1% |
| reserva | 1994 | -0,4 | -1,4 | 223 | 752 | 11,2% | 37,7% |
| poucos minutos | 2254 | -1,0 | -1,7 | 6 | 1411 | 0,3% | 62,6% |
| sem minutos | 3360 | -1,6 | -2,0 | 0 | 2695 | 0,0% | 80,2% |

Uso × idade (variação média por temporada; entre parênteses, linhas):

| Uso | até 20 | 21–23 | 24–27 | 28–30 | 31–33 | 34–36 |
|---|---:|---:|---:|---:|---:|---:|
| titular | 1,1 (786) | 0,7 (1216) | 0,2 (2400) | 0,0 (1780) | -0,4 (1538) | -1,1 (1155) |
| reserva | 0,4 (294) | 0,4 (241) | 0,0 (351) | -0,1 (307) | -0,8 (379) | -1,5 (422) |
| poucos minutos | 0,0 (332) | -0,1 (232) | -0,7 (393) | -0,9 (387) | -1,5 (425) | -2,2 (485) |
| sem minutos | 0,0 (325) | -0,3 (283) | -1,3 (591) | -1,5 (572) | -2,0 (709) | -2,6 (880) |

De onde vem a variação (pontos de desenvolvimento por componente, média por linha de temporada; 1 ponto ≈ 1 de força):

| Uso | desenvolvimento (idade) | rendimento | envelhecimento | parado | total |
|---|---:|---:|---:|---:|---:|
| titular | 0,2 | 0,2 | -0,3 | 0,0 | 0,1 |
| reserva | 0,2 | 0,0 | -0,5 | -0,1 | -0,4 |
| poucos minutos | 0,0 | 0,0 | -0,5 | -0,7 | -1,2 |
| sem minutos | 0,0 | 0,0 | -0,6 | -1,3 | -1,8 |
| todos | 0,2 | 0,1 | -0,4 | -0,4 | -0,5 |

Sem minutos e com subida na temporada: **0** (esperado 0).
Sem minutos, com menos de 31 anos: 1771 linhas, variação média -1,0 (perda de ritmo, não punição).

## 11–13. Transferências, promoções e rebaixamentos

| Grupo | n | força na chegada | ambiente antes → depois | evolução após 1 temporada | após 3 temporadas | força igual na chegada (±1 da 1ª rodada) |
|---|---:|---:|---|---:|---:|---:|
| D4 → D3 | 6 | 24,0 | 19,2 → 24,6 | 0,5 (n=6) | 2,0 (n=5) | 6/6 |
| D3 → D2 | 15 | 33,1 | 27,5 → 30,1 | -0,1 (n=15) | -0,8 (n=12) | 15/15 |
| D2 → D1 | 16 | 40,8 | 35,6 → 36,3 | 0,0 (n=16) | -0,6 (n=14) | 16/16 |
| D4 → D2 | 1 | 21,0 | 16,5 → 35,6 | 0,0 (n=1) | -1,0 (n=1) | 1/1 |
| mesma divisão | 48 | 33,2 | 28,7 → 29,9 | 0,0 (n=48) | -0,3 (n=39) | 48/48 |
| promoção do clube D4 → D3 | 710 | 17,6 | 19,5 → 19,5 | -0,6 (n=710) | -1,6 (n=493) | 710/710 |
| promoção do clube D3 → D2 | 714 | 22,8 | 24,9 → 24,9 | -0,7 (n=714) | -1,7 (n=502) | 714/714 |
| promoção do clube D2 → D1 | 699 | 31,5 | 33,7 → 33,6 | -0,6 (n=699) | -1,5 (n=489) | 699/699 |
| rebaixamento do clube D1 → D2 | 707 | 30,7 | 33,2 → 32,7 | -0,6 (n=707) | -1,5 (n=501) | 707/707 |
| rebaixamento do clube D2 → D3 | 693 | 23,5 | 25,7 → 25,3 | -0,6 (n=693) | -1,7 (n=495) | 693/693 |
| rebaixamento do clube D3 → D4 | 693 | 17,5 | 19,6 → 19,1 | -0,5 (n=693) | -1,5 (n=486) | 693/693 |

Só titulares na temporada seguinte à mudança: promoção -0,1 após 1 temporada (n=1172); rebaixamento 0,0 (n=1182).

Força na transferência: o registro grava a força do B no momento da mudança; a 1ª rodada no clube novo é a 1ª janela parcial, então pode haver ±1 que já estava acumulado. Mudanças de exatamente 0 na chegada: 4311/4311. Nenhuma mudança vem da transferência em si (o ambiente só entra nos pontos das rodadas seguintes).

## 14–15. Maiores ganhos e maiores quedas (do registro inicial ao final)

### 20 maiores ganhos

| Jogador | pos. | idade inicial | temporadas | base → atual | Δ | minutos totais | mundo A |
|---|---|---:|---:|---|---:|---:|---:|
| Igor Duarte | MEI | 19 | 6 | 13 → 24 | +11 | 17858 | 18 |
| Thiago Nogueira | ATA | 17 | 8 | 8 → 17 | +9 | 25603 | 19 |
| Yuri Alves | DEF | 18 | 5 | 25 → 33 | +8 | 14987 | 31 |
| Felipe Almeida Ientes | GOL | 17 | 10 | 24 → 32 | +8 | 20224 | 35 |
| Luan Valadares Ientes | MEI | 18 | 10 | 35 → 43 | +8 | 32152 | 41 |
| João Farias Jardim | ATA | 17 | 10 | 22 → 30 | +8 | 24661 | 30 |
| Otávio Farias | ATA | 19 | 3 | 19 → 26 | +7 | 9803 | 23 |
| Lucas Viana | GOL | 17 | 4 | 23 → 30 | +7 | 13590 | 30 |
| Otávio Nogueira | MEI | 19 | 4 | 21 → 28 | +7 | 12129 | 27 |
| Yuri Santana | MEI | 18 | 4 | 20 → 27 | +7 | 12060 | 26 |
| Kauã Gomes | ATA | 18 | 4 | 16 → 23 | +7 | 11891 | 22 |
| Pedro Oliveira | DEF | 17 | 6 | 11 → 18 | +7 | 12283 | 16 |
| Vinícius Barbosa | DEF | 17 | 8 | 8 → 15 | +7 | 16863 | 16 |
| Diego Farias | DEF | 17 | 10 | 32 → 39 | +7 | 31124 | 41 |
| Mateus Gomes | MEI | 17 | 10 | 27 → 34 | +7 | 20763 | 37 |
| Nícolas Coutinho | DEF | 17 | 10 | 36 → 43 | +7 | 31394 | 44 |
| Cauã Rocha | MEI | 18 | 10 | 31 → 38 | +7 | 24692 | 37 |
| Gustavo Zanetti Macedo | GOL | 17 | 10 | 31 → 38 | +7 | 27023 | 35 |
| Adriano Rezende | MEI | 19 | 10 | 28 → 35 | +7 | 31874 | 34 |
| Yuri Siqueira Prates | ATA | 17 | 10 | 8 → 15 | +7 | 18610 | 15 |

### 20 maiores quedas

| Jogador | pos. | idade inicial | temporadas | base → atual | Δ | minutos totais | mundo A |
|---|---|---:|---:|---|---:|---:|---:|
| Luan Gomes | DEF | 27 | 10 | 32 → 10 | -22 | 0 | 20 |
| Wallace Rezende Pacheco | ATA | 27 | 10 | 32 → 10 | -22 | 0 | 20 |
| Kaio Macedo Xavier | GOL | 27 | 10 | 25 → 3 | -22 | 0 | 22 |
| Wallace Valadares Moraes | GOL | 27 | 10 | 24 → 3 | -21 | 318 | 15 |
| Marcos Bragança Uchoa | ATA | 27 | 10 | 24 → 3 | -21 | 205 | 20 |
| Bruno Oliveira Lopes | ATA | 27 | 10 | 29 → 8 | -21 | 514 | 22 |
| Everton Guedes Jardim | ATA | 27 | 10 | 31 → 10 | -21 | 621 | 24 |
| Felipe Duarte | GOL | 27 | 10 | 31 → 10 | -21 | 270 | 20 |
| André Gomes | DEF | 27 | 10 | 26 → 5 | -21 | 153 | 23 |
| Wallace Barbosa | GOL | 27 | 10 | 21 → 1 | -20 | 0 | 14 |
| Paulo Teixeira Coutinho | ATA | 26 | 10 | 30 → 10 | -20 | 0 | 21 |
| Marcos Oliveira Prates | MEI | 26 | 10 | 23 → 3 | -20 | 0 | 21 |
| Gustavo Farias Farias | ATA | 28 | 9 | 28 → 8 | -20 | 0 | 18 |
| Renan Xavier Bragança | MEI | 28 | 9 | 25 → 5 | -20 | 0 | 22 |
| Rafael Lopes | MEI | 27 | 10 | 35 → 15 | -20 | 624 | 28 |
| Everton Toledo Oliveira | MEI | 28 | 9 | 41 → 21 | -20 | 271 | 34 |
| Yuri Ientes Xavier | MEI | 28 | 9 | 36 → 16 | -20 | 39 | 30 |
| Igor Rezende | MEI | 28 | 9 | 36 → 16 | -20 | 0 | 29 |
| Luan Freitas | ATA | 28 | 9 | 25 → 5 | -20 | 0 | 21 |
| João Oliveira Rezende | GOL | 28 | 9 | 20 → 1 | -19 | 0 | 14 |

### Extremos

- Chegaram a 50 (sem começar em 50): **2** — Ulisses Rocha (45 → 50, 19 anos); Nícolas Uchoa (44 → 50, 18 anos). Começaram em 50: 2.
- Chegaram a 1 (sem começar em 1): **146** — Ulisses Ientes Valadares (11 → 1); Marcos Duarte Rocha (11 → 1); Leandro Gomes Valadares (11 → 1); Elias Uchoa (8 → 1); Luan Xavier Nogueira (10 → 1); Paulo Xavier (12 → 1); Igor Pacheco (14 → 1); Mateus Teixeira Cardoso (20 → 1); Bruno Uchoa Uchoa (14 → 1); Samuel Almeida Teixeira (14 → 1).
- Passaram de +10: 1; de +15: 0; perderam mais de 10: 374.
- Maior ganho: +11 (Igor Duarte); maior queda: -22 (Luan Gomes).
- Maior variação numa única temporada: +3 / -4.

## 16. Veteranos

Aposentadoria do jogo atual: aos 37 anos (game/manager/world.ts `agePlayers`), e livres com 34+ na virada. O protótipo não muda isso.

| Idade na temporada | linhas | força média no início | variação média | minutos médios | % titular | % caiu |
|---|---:|---:|---:|---:|---:|---:|
| 35+ | 1933 | 20,5 | -1,9 | 1332,2 | 37,4% | 92,2% |
| 38+ | 0 | – | – | – | –% | –% |
| 40+ | 0 | – | – | – | –% | –% |

Começaram com 33+: 307; variação média até se aposentarem -5,6; maior queda -11; aposentados no período: 307.
O caso sintético "40 → 22 em 10 temporadas" (veterano reserva até 42 anos) **não pode ocorrer** no mundo real atual: a aposentadoria aos 37 interrompe a carreira antes. No mundo real, o maior declínio de veterano está na linha acima.

## 17. Estrelas (força atual ≥ 45 em algum momento)

- 19 jogadores chegaram a 45+ (14 já começaram assim; 5 subiram até 45+).

| Jogador | pos. | idade inicial | base → pico | temporadas até 45 | minutos/temporada | ambiente médio |
|---|---|---:|---|---:|---:|---:|
| Fábio Rocha | DEF | 21 | 43 → 45 | 5 | 1340,2 | 45,2 |
| Nícolas Uchoa | MEI | 18 | 44 → 50 | 1 | 3004,4 | 45,2 |
| Caio Toledo | DEF | 20 | 42 → 47 | 2 | 2973,7 | 42,6 |
| Diego Honório | DEF | 21 | 44 → 47 | 1 | 2970,8 | 42,6 |
| Elias Macedo | MEI | 18 | 43 → 48 | 2 | 3201,9 | 42,6 |
- Chegaram a 50: 2.

## 18. Reservas e minutos

- Linhas de temporada sem minutos: 3360; com subida: 0.
- Penalidade no banco: queda média das linhas "sem minutos" -1,6 por temporada; "poucos minutos" -1,0.

## 19. Lesões longas (8+ rodadas seguidas)

- 73 lesões longas.
- Durante a lesão: variação média -0,1 (pior -1); nas 10 rodadas seguintes: 0,0 (n=70).

| Jogador | T | rodadas lesionado | força antes | ao fim da lesão | 10 rodadas depois |
|---|---:|---:|---:|---:|---:|
| Elias Uchoa Valadares (ply-1447) | 1 | 8 | 15 | 14 | 14 |
| Wesley Pacheco Barbosa (ply-1336) | 1 | 8 | 27 | 27 | 27 |
| João Zanetti Barbosa (ply-1555) | 2 | 8 | 15 | 15 | 15 |
| Wallace Macedo (ply-1070) | 2 | 8 | 20 | 20 | 20 |
| Caio Esteves (ply-0183) | 2 | 8 | 30 | 29 | 29 |
| Davi Teixeira Barbosa (ply-0849) | 2 | 8 | 28 | 28 | 28 |
| Breno Freitas Zanetti (ply-0789) | 2 | 8 | 34 | 34 | 34 |
| Wallace Macedo (ply-1070) | 2 | 8 | 20 | 20 | 20 |
| Caio Lopes (ply-1087) | 2 | 8 | 19 | 19 | 19 |
| Otávio Lacerda Duarte (ply-0681) | 3 | 8 | 28 | 28 | 28 |
| João Bragança (ply-0742) | 3 | 8 | 30 | 30 | 30 |
| Henrique Siqueira (ply-0232) | 3 | 8 | 34 | 34 | 34 |
| Mateus Freitas (ply-0374) | 3 | 8 | 35 | 35 | 36 |
| Luan Guedes (ply-0905) | 3 | 8 | 38 | 38 | 38 |
| Bruno Prates (ply-0826) | 3 | 8 | 35 | 35 | 35 |

## Exemplos reais (selecionados automaticamente)

- **A. jogador fraco que evoluiu (21+ anos no início):** Gustavo Jardim (MEI, 21 anos no início, 10 temporadas): 7 → 11 (+4); mundo A: 12
- **B. jogador forte que permaneceu estável:** Caio Toledo Freitas (ATA, 21 anos no início, 10 temporadas): 48 → 48 (0); mundo A: 50
- **C. jogador que caiu:** Luan Gomes (DEF, 27 anos no início, 10 temporadas): 32 → 10 (-22); mundo A: 20
- **D. jovem que evoluiu muito:** Igor Duarte (MEI, 19 anos no início, 6 temporadas): 13 → 24 (+11); mundo A: 18
- **E. veterano:** Wesley Duarte Uchoa (GOL, 33 anos no início, 4 temporadas): 20 → 19 (-1); mundo A: 17
- **F. reserva:** Leandro Freitas (GOL, 17 anos no início, 10 temporadas): 26 → 21 (-5); mundo A: 29
- **G. transferido para divisão superior:** Adriano Teixeira: D2 → D1 na T2, força 41 na chegada (ambiente 39,3 → 39,8); hoje 35
- **H. transferido para divisão inferior:** nenhuma transferência para divisão inferior no período; pelo rebaixamento do clube: Marcos Freitas Farias, D1 → D2 na T5, força 44 (ambiente 39,4 → 38,0); hoje 44
- **I. jogador que foi titular:** Thiago Nogueira (ATA, 17 anos no início, 8 temporadas): 8 → 17 (+9); mundo A: 19
- **J. jogador que perdeu espaço:** Gabriel Macedo (GOL, 27 anos no início, 10 temporadas): 25 → 9 (-16); mundo A: 22

## Anomalias (listadas, não corrigidas)

- Deflação: o mesmo conjunto de jogadores caiu em média -2,3 em 10 temporadas.
- 2 jogador(es) chegaram a 50 sem começar em 50.
- 146 jogador(es) chegaram a 1.
