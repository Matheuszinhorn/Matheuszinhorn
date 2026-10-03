# Evolução contextual de força — PlayerDevelopment (PROJETO EM CALIBRAÇÃO)

> **Última etapa: [Validação DEV-PROTO-0.4 — Mundo Real](#validação-dev-proto-04--mundo-real)** (antes: 0.3).
> **DEV-PROTO-0.3 continua NÃO integrada ao jogo.** Nenhuma das três variantes de inatividade resolveu sozinha os
> dois lados do problema. A divisão como oportunidade funcionou como pedido.

> **Status: projeto e simulação. Nada implementado no jogo.**
> - O protótipo `game/development/development.ts` (versão **DEV-PROTO-0.2**) não é importado por nenhum módulo do
>   engine, do jogo ou do app (um teste garante isso).
> - A evolução em uso continua sendo a de [PLAYER-PROGRESSION.md](PLAYER-PROGRESSION.md).
> - Engine 0.2.0, saves, calendário e gameplay sem alteração; nenhuma força aplicada.

| Arquivo | O que é |
|---|---|
| `game/development/development.ts` | Protótipo (DEV-PROTO-0.2) |
| `scripts/simulate-development-10.ts` (`npm run development:sim10`) | Calibração de 10 temporadas → `reports/development-10-seasons.md` e `.json` |
| `scripts/simulate-development.ts` (`npm run development:sim`) | Casos A–E, perfis e exploits → `reports/development-simulation.md` |
| `scripts/simulate-development-world.ts` (`npm run development:world`) | Validação em 10 temporadas reais do universo fictício → `reports/development-world-10-seasons.md` e `.json` |
| `game/development/evidence.ts` | Leitura (só leitura) da evidência de cada partida a partir do `MatchState` do engine |
| `scripts/simulate-development-world-v03.ts` (`npm run development:world03`) | Validação da 0.3 (variantes A/B/C + 0.2) no mundo real → `reports/development-world-10-seasons-v03.md` e `.json` |
| `scripts/simulate-development-world-v04.ts` e `scripts/simulate-development-v04-synthetic.ts` | Validação da 0.4 (mundo real e casos sintéticos) |
| `game/tests/development.test.ts` | 23 testes de invariantes |

## Princípios aprovados

1. **A contratação não altera a força.** O jogador 23 que vai para um clube de ambiente 40 continua 23. Ele só
   evolui depois, aos poucos, se jogar, tiver minutos, render, tiver idade favorável e for consistente.
2. **O ambiente é oportunidade, não alvo.** `environmentLevel` não é "a força para onde o jogador vai". Ele aumenta a
   chance de desenvolvimento de quem está abaixo dele e marca um limite contextual para o ganho. Não define a força
   final, não puxa ninguém para cima e não derruba ninguém.
3. **Acúmulo, não automatismo:** rodada → rendimento → acumulador → limiar → no máximo ±1.

## ELIFOOT — PRINCÍPIO DE EVOLUÇÃO

### Fato encontrado na engenharia reversa (REFERÊNCIA HISTÓRICA, não fórmula original)

Fonte: engenharia reversa pública do executável do Elifoot 98, feita por **trsthales** com Ghidra e Cheat Engine. O
binário é Borland Delphi 1.0, de 16 bits. Consulta em 03/10/2026.

- TabNews: "Desvendei o código do Elifoot 98 após 25 anos: engenharia reversa em 16-bit com Ghidra no Linux" —
  https://www.tabnews.com.br/trsthales/desvendei-o-codigo-do-elifoot-98-apos-25-anos-engenharia-reversa-em-16-bit-com-ghidra-no-linux
- TabNews, parte 2 (motor de gols; não trata de evolução) —
  https://www.tabnews.com.br/trsthales/engenharia-reversa-como-o-motor-do-elifoot-98-decide-os-gols-e-por-que-o-5-0-5-quebra-o-jogo
- Repositório "desvendando-elifoot-98" (declarado educacional e de preservação histórica) —
  https://github.com/trsthales/desvendando-elifoot-98

| Ponto | O que a fonte descreve (rotina `FUN_17fb_4a41`) |
|---|---|
| Escala | Força nominal de 1 a 50 |
| Momento | Rodada a rodada, no pós-jogo, para o elenco |
| Gatilho | Avaliação de rendimento da partida, positiva ou negativa |
| Ganho | +1, só se a força estiver até `nivelBaseTime + 5` (e até 50) |
| Perda | −1, depois de uma tolerância de 50%, e não abaixo de `nivelBaseTime − 5` (nem de 1) |
| Goleiro | Sorteio extra de 50% para ganhar |

**A própria engenharia reversa NÃO documenta:**
- como `nivelBaseTime` é calculado;
- como a avaliação de rendimento é feita.

Por isso o "+5" aqui é **referência histórica**: confirma o princípio de uma margem em relação ao nível do time, mas
não é uma fórmula a copiar. Nenhum código foi copiado.

### Adaptação proposta para o ELITE MANAGER (DEV-PROTO-0.2)

| Princípio do Elifoot | Adaptação | Diferença deliberada |
|---|---|---|
| Avaliação a cada rodada | Pontos por rodada num acumulador; a força só muda no fim de janelas de 5 rodadas (e na 38), no máximo ±1 | Sem oscilação rodada a rodada |
| Ganho até `nivelBaseTime + 5` | **Limite contextual** = ambiente + margem suave por idade (+5 aos 20, +4 aos 24, +2 aos 27, 0 aos 30, −2 dos 33 em diante) | A margem varia com a idade e não é um "+5" fixo |
| `nivelBaseTime` (não documentado) | **Ambiente** = média dos 16 jogadores mais fortes do elenco atual do clube | Definição explícita: o clube, não a divisão |
| Ganho igual em qualquer distância | **Oportunidade:** o ganho é multiplicado por 0,6 no nível do ambiente, chegando a 1,0 a 12 pontos abaixo dele, e por 0,5 acima dele; diminui nos últimos 3 pontos antes do limite | O ambiente acelera o desenvolvimento sem ser alvo |
| Perda até `nivelBaseTime − 5` | **Sem piso nem pressão do ambiente.** A perda vem de rendimento ruim persistente, idade ou tempo sem jogar | Um jogador forte num clube fraco não cai por isso |
| Goleiro: sorteio de 50% | Goleiro ganha 75% dos pontos; o rendimento vem de jogo sem sofrer gol, defesas e gols sofridos | Sem sorteio |
| `Random` | Determinístico | Recarregar não muda nada |

## Arquitetura

```
EM-RATING (dado inicial) ──► strengthBase ─┐
                                           ├─ PlayerDevelopment ──► strengthCurrent ──► Player.strength (engine lê só isto)
partidas do jogo (eventos do engine) ──────┘     (histórico com motivo e contexto)
```

| Campo | O que é |
|---|---|
| `strengthBase` | Força inicial (EM-RATING ou geração do mundo fictício). Nunca muda. |
| `strengthCurrent` | Força usada pelo jogo. |
| `progress` | Acumulador da janela. |
| `idleRounds` | Rodadas seguidas sem jogar, sem contar lesão. |
| `history[]` | Cada mudança com temporada, rodada, de → para, motivo e contexto (ambiente, limite, idade, pontos). |

Cada rodada pode ser decomposta em idade, rendimento, envelhecimento e parado (`roundPoints`) para auditoria. Não há
atributos ocultos.

Só entram dados que o ELITE MANAGER tem:
- **Já guardados:** idade, partidas e gols.
- **Deriváveis dos eventos do engine:** minutos, titularidade, defesas, gols sofridos, resultado e expulsão.
- **Mais:** lesão e rodadas parado.

Nota por jogador, passes e finalizações não existem e não são inventados. A divisão nunca entra diretamente.

## Fórmula conceitual (DEV-PROTO-0.2)

**Rendimento da partida, de −1 a +1:**
- resultado do time ±0,2;
- goleiro: jogo sem sofrer gol +0,5, defesas até +0,3, 3+ gols sofridos −0,4;
- defensor: jogo sem sofrer gol +0,3, gol +0,4;
- meia: +0,5 por gol;
- atacante: +0,4 por gol, −0,1 sem gol jogando 60 minutos ou mais;
- expulsão −0,5.

**Por rodada:**

```
limite        = min(50, ambiente + margem(idade))
tendência     = curva suave: +0,08 (18 anos) +0,07 (21) +0,05 (24) +0,02 (27) 0 (29) −0,02 (32) −0,04 (35) −0,06 (38)
oportunidade  = 0 no limite; senão (0,6…1,0 abaixo do ambiente | 0,5 acima) × afunilamento nos 3 pontos finais
                (goleiro × 0,75)
jogou:  desenvolvimento = (min/90) × max(0, tendência)
        rendimento      = (min/90) × 0,10 × rendimentoDaPartida
        com espaço:  soma > 0 → × oportunidade;  soma ≤ 0 → conta inteira
        sem espaço:  só o rendimento, COM SINAL (bons jogos compensam ruins)
envelhecimento (tendência < 0) = tendência × (jogou ? 1 − 0,7 × max(0, rendimento) × min/90 : 1)
parado: −0,04 por rodada além de 6 seguidas sem jogar (23+ anos; lesão não conta)
```

**No fim da janela:**
- acumulador ≥ 1 → +1 (se abaixo do limite);
- acumulador ≤ −1 → −1;
- a sobra fica limitada a ±0,99;
- no limite ou acima dele, o acumulador não guarda crédito de ganho (máximo 0).

Correções da 0.1 para a 0.2, motivadas pela simulação:
- **Velocidade:** promessa 22 → 35 em 3 temporadas; passou a 22 → 29.
- **Ambiente:** deixou de ser alvo (`espaço = (limite − força)/6` puxava para o ambiente) e passou a ser oportunidade.
- **Idade:** a curva em degraus virou suave, e o bom rendimento compensa 70% do envelhecimento na rodada.
- **Veterano reserva:** envelhecia mais devagar que o titular, por falta de desgaste; corrigido.
- **Deriva:** acima do limite, os jogos bons eram descartados e os ruins contavam, o que derrubava estrelas em clubes
  fracos (46 → 44). O rendimento passou a contar com sinal.

## Calibração em 10 temporadas (`reports/development-10-seasons.md`)

Partidas sintéticas com padrões fixos: titular bom, médio ou ruim, reserva (25 minutos a cada 3 rodadas) e lesão de 10
rodadas. Ambiente fixo por caso, salvo nas transferências. As forças abaixo são o fim de cada temporada.

| Caso | Início → fim | Trajetória (fim de cada temporada) |
|---|---|---|
| 1. Promessa 21, força 22, titular bom (ambiente 32) | 22 → 34 | 25, 28, 31, 33, 34 e estável no limite do ambiente |
| 2. Promessa 21, força 22, reserva | 22 → 22 | Sem minutos, sem desenvolvimento |
| 3. 25 anos, força 28, titular bom (ambiente 32) | 28 → 32 | 29, 31, 32 e estável |
| 4. 25 anos, força 28, titular médio | 28 → 30 | 29, 30, 31, então −1 com a idade |
| 5. 25 anos, força 28, titular ruim | 28 → 24 | 28, 29 e estável; cai dos 31 anos em diante |
| 6. Veterano 33, força 40, titular bom (ambiente 38) | 40 → 32 | 40, 40, 40 (até os 35), depois −1 por ano até os 42 |
| 7. Veterano 33, força 40, reserva | 40 → 22 | 40, 38, 37, 35, 33… (−1 a −3 por ano) |
| 8. Forte 45 (27 anos) em ambiente 25, titular | 45 → 45 | Estável: não cresce acima do ambiente nem cai por ele |
| 9. Fraco 20 (24 anos) em ambiente 40, reserva | 20 → 19 | Sem ganho por estar num clube forte |
| 10. Fraco 20 (24 anos) em ambiente 40, titular bom | 20 → 31 | 22, 25, 27, 28, 29, 30, 31 e estável. Nunca chega a 40. |
| 11. Lesão de 10 rodadas na 2ª temporada (26 anos, 30, ambiente 34) | 30 → 33 | A lesão só interrompe: 31 → 32 na temporada da lesão |

**Força × ambiente 40** (24 anos, titular médio, 10 temporadas):
- 23 → 31 (+8): maior espaço;
- 35 → 40 (+5): espaço moderado;
- 43 → 43 (0): não precisa acompanhar o ambiente.

**Transferências.** A força é a mesma antes e depois da 1ª rodada no novo clube em todos os casos. Trajetórias
(origem, depois 4 temporadas no destino):

| Transferência | Trajetória |
|---|---|
| D4 → D1, força 20 | 20 → 23 → 25 → 27 → 28 |
| D3 → D2, força 24 | 24 → 25 → 26 → 28 → 29 |
| D2 → D1, força 31 | 31 → 32 → 33 → 34 → 35 |
| D1 → D2, força 37 | 37 estável |
| D1 → D4, força 36 | 36 estável |

**Estrela 46 vai para ambiente 30:** fica 46, igual ao controle que permaneceu no clube forte (46).

### Verificações dos objetivos (todas atendidas na 0.2)

| Objetivo | Medida |
|---|---|
| Sem inflação geral | Variação média dos 11 casos de 10 temporadas: +0,1 |
| Sem deflação exagerada | Maior queda numa temporada: −3 (veterano reserva aos 39 anos) |
| Jovens não chegam a 50 | Maior força final entre promessas: 34 |
| Excepcional ≤ 3–6 por temporada | Maior ganho numa temporada, em todos os casos: +3 |
| Veteranos não desaparecem rápido | Titular bom: 40 após 3 temporadas; reserva: 37 |
| Reservas não evoluem | Caso 2: 22 → 22; caso 9: 20 → 19 |
| Titulares evoluem | Caso 1: +12 em 10 temporadas; caso 10: +11 |
| Ambiente não cria força artificial | 43 em ambiente 40 fica 43; 45 em ambiente 25 fica 45; estrela em ambiente 30 = controle |
| Promessa × jogador pronto | Promessa titular: +3 por temporada no início; jogador de 25 anos: +1 a +2 e estabiliza |
| Bom > médio > ruim | Casos 3/4/5: 32 · 30 · 24 |

**Tempo para o 1º +1:** 15 rodadas para a promessa titular boa e o caso 10; 25–30 rodadas para um titular de 25
anos; nunca para reservas, para quem já está no limite e para veteranos.

**Efeito de cada fator** (média por temporada, em pontos):
- **Rendimento:** é o principal motor de quem já está pronto (+0,8 a +1,4).
- **Idade:** é o motor da promessa (+0,8).
- **Envelhecimento:** −1,6 (titular bom) a −1,9 (reserva) por temporada aos 36–42 anos.
- **Ambiente:** atua só como fator de oportunidade (0 para quem está no limite; até 1,0 para quem está bem abaixo).

**Teto sazonal opcional:** testado com no máximo 4 subidas por temporada. Não mudou nenhum caso, porque o ritmo
natural já fica em +3 no máximo. Por isso a proposta é **não** ter teto sazonal (`seasonGainCap = null`); o parâmetro
fica disponível.

### Limitações da calibração

- **Partidas sintéticas.** O rendimento real virá dos eventos do engine. É preciso uma nova calibração com
  temporadas reais simuladas antes da integração, com foco no goleiro e no rendimento médio do jogador de linha.
- **Aposentadoria não modelada.** Os veteranos jogam até 42 anos na simulação.
- **Ambiente fixo por caso.** Num jogo real, o ambiente muda com contratações e com a própria evolução do elenco.

## Possíveis exploits

| Exploit | Resposta |
|---|---|
| Estacionar um jovem no banco de um clube forte | Ganho só com minutos (casos 2 e 9) |
| Minutos de lixo (entrar aos 85') | Ganho proporcional a minutos/90 |
| Artilheiro de time fraco acima do ambiente | Sem ganho acima do limite; também sem queda |
| Acumular para subir vários de uma vez | ±1 por janela; acumulador limitado; sem crédito acima do limite |
| Recarregar o save | Determinístico: mesmas partidas = mesma evolução |
| Comprar estrelas para inflar o ambiente | O ambiente sobe de fato, mas custa caro e só ajuda quem joga |
| Contratar esperando salto | A contratação não muda a força |
| CPU × humano | As mesmas regras para todos |

## Proposta calibrada para a futura integração

1. **Configuração:** DEV-PROTO-0.2 como ponto de partida. Antes de integrar, recalibrar com partidas reais do
   engine: 10 temporadas do mundo fictício, todos os clubes, mesmas verificações deste relatório.
2. **Dados de partida:** registrar na camada de gestão, por jogador e rodada, minutos, titularidade, defesas e gols
   sofridos, tudo a partir dos eventos do engine. **O engine não muda.**
3. **Estado:** `CareerState.manager.development` (campo opcional). Save antigo: `strengthBase = strengthCurrent =
   Player.strength` na carga, sem trocar a chave do save.
4. **Substituição:** o PlayerDevelopment substitui os checkpoints de `progression.ts`; os dois nunca rodam juntos. O
   engine continua lendo `Player.strength` = `strengthCurrent`.
5. **EM-RATING:** define só `strengthBase` (com `strengthMethodVersion`). A evolução nunca reescreve a EM-RATING, e
   uma nova EM-RATING nunca reescreve uma carreira em andamento.
6. **Regressão:** com a evolução desligada, as partidas têm de continuar idênticas (o mesmo teste que já existe).
7. **Exibição:** força base → atual e histórico do jogador; notícias só de mudanças aplicadas.

## Validação no mundo real do engine (0.3)

Simulação de 10 temporadas do universo fictício (seed `elite-dev-world-10`, carreira gerenciada sem decisões
manuais): 15.200 partidas reais do Engine 0.2.0. A fórmula é a DEV-PROTO-0.2, sem nenhuma mudança.
Relatório completo: `reports/development-world-10-seasons.md` (dados em `.json`).

### Como foi montado

- **Mundo A (controle):** o jogo exatamente como roda hoje, inclusive a evolução em uso (`progression.ts`).
- **Mundo B (observador):** a camada DEV-PROTO-0.2 lê o `MatchState` que o engine já produziu para o mundo A e
  calcula `strengthCurrent` à parte. Os dados lidos são:
  - minutos e titularidade, derivados das substituições e expulsões;
  - gols, defesas, gols sofridos, resultado e expulsão;
  - lesão, de `condition.injuryRounds`.
- O B nunca devolve força ao engine. Clubes, jogadores, calendários, seeds, decisões e resultados são os mesmos.
- **Determinismo:** o mundo A foi rodado com e sem o observador; o hash dos 15.200 placares é **idêntico**. O teste
  de `evidence.ts` confirma, numa rodada real, que a leitura não altera a partida.
- **Ambiente recalculado** a cada rodada com o elenco atual de cada clube (contratações, vendas, base, acesso,
  rebaixamento e aposentadoria do jogo).
- **Limitação:** o efeito de volta (jogador evolui → joga melhor → rende mais) não é medido. Para medir, a força do
  B teria de entrar nas partidas, o que muda os resultados (etapa futura, com aprovação).

### Números principais

| | Início | 1 temp. | 3 temp. | 5 temp. | 10 temp. |
|---|---:|---:|---:|---:|---:|
| Média da força atual B (em clube) | 25,5 | 25,3 | 24,4 | 23,6 | 22,2 |
| Média do mundo A (evolução em uso) | 25,5 | 25,5 | 25,8 | 25,8 | 25,5 |
| B: força = 1 | 1 | 2 | 20 | 44 | 67 |
| B: 46–50 | 12 | 14 | 16 | 15 | 12 |
| A: 46–50 | 12 | 13 | 19 | 16 | 16 |

Variação dos 1.111 jogadores presentes no início e no fim:
- **B:** média −2,3 (mediana 0);
- **A:** média +1,6 (mediana +2).

O sistema em uso infla de leve, e o protótipo desinfla.

**De onde vem a variação** (pontos por temporada, média por jogador):

| Uso na temporada | Desenvolvimento | Rendimento | Envelhecimento | Parado | Total | Variação real |
|---|---:|---:|---:|---:|---:|---:|
| Titular (≥ 55% dos minutos) | +0,2 | +0,2 | −0,3 | 0,0 | +0,1 | 0,0 (20% sobem, 19% caem) |
| Reserva (15–55%) | +0,2 | 0,0 | −0,5 | −0,1 | −0,4 | −0,4 |
| Poucos minutos (< 15%) | 0,0 | 0,0 | −0,5 | −0,7 | −1,2 | −1,0 |
| Sem minutos | 0,0 | 0,0 | −0,6 | −1,3 | −1,8 | −1,6 (0 sobem; 80% caem) |

### O que ficou bom (com evidência)

- **Transferência não muda a força:** 4.311 de 4.311 mudanças de clube ou divisão chegaram com a mesma força.
- **Banco não evolui:** 0 subidas em 3.360 temporadas sem minutos.
- **Jovem ≠ evolução automática:**
  - jovens (até 20 anos) com pelo menos 38 partidas completas somadas: +3,4 em média;
  - jovens com menos de 5 partidas completas: −1,1, e nenhum subiu.
- **Titular jovem evolui:** +1,1 por temporada (até 20 anos) e +0,7 (21–23).
- **Titular maduro é estável:** +0,2 (24–27) e 0,0 (28–30).
- **Ritmo:** maior variação numa temporada +3 / −4. Maior ganho em 10 temporadas: +11. Ninguém passou de +15.
- **Estrelas sem inflação:** 46–50 vai de 12 para 12 em 10 temporadas. Só 2 jogadores chegaram a 50: Ulisses
  Rocha (45 → 50) e Nícolas Uchoa (44 → 50), ambos com 18–19 anos, titulares, em ambiente ~45.
- **Lesões:** 73 lesões longas (8 rodadas ou mais). Durante a lesão, a variação média é −0,1 (pior −1); nas 10
  rodadas seguintes, 0,0.
- **Rendimento compensa idade:** o titular de 31–33 anos cai −0,4 por temporada; o sem minutos da mesma idade cai
  −2,0.

### O que precisa de calibração (números que preocupam)

1. **Deflação pelo banco (o problema principal).**
   - No mundo fictício, cerca de 20% das linhas de temporada não têm nenhum minuto (elencos de 24 jogadores).
   - A perda de ritmo por ficar parado não tem limite: −1,3 ponto por temporada, somado ao envelhecimento.
   - Efeito: **146 jogadores chegaram a 1**, 374 perderam mais de 10, e o maior caso é −22 (Luan Gomes, 32 → 10,
     zero minutos em 10 temporadas).
   - O pedido "não aplicar penalização excessiva só por estar no banco" **não** foi atendido.
   - Sugestão a testar: limitar a perda por inatividade (por exemplo, no máximo −1 por temporada, ou nenhuma perda
     por inatividade abaixo de `strengthBase − N`).
2. **O ambiente não enxerga a divisão.**
   - O ambiente é o próprio elenco do clube. Promoção e rebaixamento não o mudam: média 19,5 → 19,5 na promoção
     D4→D3.
   - O jogador de um clube recém-promovido não ganha oportunidade nenhuma com a divisão mais forte.
   - Sugestão a testar: um ambiente que combine o elenco próprio com o nível da competição (adversários), sempre
     como oportunidade e nunca como bônus direto.
3. **Veteranos caem rápido entre 34 e 36 anos:** −1,8 por temporada, com 91% caindo. Começando com 33+, a média até a
   aposentadoria é −5,6 (pior −11). O "40 → 22" sintético não acontece no mundo real, porque o jogo aposenta aos 37.
   Mesmo assim, o declínio dos 34–36 merece revisão junto com o item 1, já que muitos veteranos estão no banco.
4. **Poucas transferências para testar o ambiente.** Só 86 transferências entre clubes em 10 temporadas, e nenhuma
   para divisão inferior. O efeito do ambiente novo foi medido em grupos pequenos:
   - D4 → D3: +2,0 em 3 temporadas (n = 5);
   - D3 → D2: −0,8 (n = 12);
   - D2 → D1: −0,6 (n = 14).
5. **Quase todos os 50 vêm de jovens em clubes de ambiente 45.** São só 2, mas mostram que um jovem de 44–45 num
   clube forte chega ao teto em 1–2 temporadas. É desejável que 50 seja raro; vale observar.

### Veredito

A DEV-PROTO-0.2 **sobreviveu em parte**:
- **Mantiveram-se:** os princípios centrais (contratação ≠ força, banco ≠ evolução, jovem só evolui jogando, sem
  inflação de estrelas, lesão não pune, ritmo ±1 por janela).
- **Não passou:** o mundo não ficou saudável em 10 temporadas. A deflação de −2,3 no mesmo conjunto e os 146
  jogadores em 1 vêm quase toda da regra de inatividade, e o ambiente não reage à divisão.
- **Antes de qualquer integração:** recalibrar esses dois pontos (nova versão, por exemplo DEV-PROTO-0.3) e repetir
  esta mesma validação.

## Validação DEV-PROTO-0.3 — Mundo Real

> **DEV-PROTO-0.3 continua NÃO integrada ao jogo.** Nada mudou no Engine 0.2.0, nos saves, na gameplay, no
> calendário, no universo fictício ou na força base. Relatório completo: `reports/development-world-10-seasons-v03.md`
> (`npm run development:world03`).

### 1. Metodologia

- **Mesmo método da validação anterior:**
  - universo fictício, seed `elite-dev-world-10`, carreira gerenciada sem decisões manuais;
  - 10 temporadas e 15.200 partidas reais do Engine 0.2.0;
  - gestão da CPU, envelhecimento, aposentadoria aos 37, acesso e rebaixamento, transferências da CPU e lesões do
    jogo.
- **Mundos:**
  - **controle** (nenhuma camada observando);
  - observadores sobre as mesmas partidas: **0.2** (referência), **0.3-A**, **0.3-B** e **0.3-C**.
- **Placares:** o hash dos 15.200 é idêntico entre o controle e os observados (`af11672f…`). A força dos
  observadores **não volta ao engine**.
- **Limitação registrada:** não há efeito de volta (strengthCurrent → engine → novo rendimento → novo
  desenvolvimento). As variantes são comparadas com os mesmos resultados de partida.

### 2. Variantes testadas

Todas com a fórmula da 0.2. Elas mudam só a inatividade e o contexto.

| Variante | Perda por inatividade | Idade para quem não joga | Contexto |
|---|---|---|---|
| 0.2 (referência) | −0,04/rodada após 6 sem jogar, sem limite | sim | só o elenco |
| 0.3-A | idem, no máximo −1 por temporada | sim | 50% elenco + 50% divisão |
| 0.3-B | idem, no máximo −0,5 por temporada | sim | 50% elenco + 50% divisão |
| 0.3-C | nenhuma perda direta | não: a idade só pesa quando o jogador participa | 50% elenco + 50% divisão |

**Nível da divisão** = média dos ambientes (os 16 mais fortes de cada elenco) dos clubes da divisão, recalculado a
cada rodada. Ele entra só na oportunidade e no limite do ganho; nunca soma força.

### 3–5. Resultados, comparação com a 0.2 e distribuição

| 10 temporadas | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| Variação média do mesmo conjunto (1.111 jogadores) | −2,3 | −1,8 | −0,8 | +1,4 |
| Chegaram a 1 | 146 | 110 | 57 | 2 |
| Perderam 10 ou mais | 436 | 338 | 157 | 0 |
| Perderam 5 ou mais | 962 | 935 | 819 | 104 |
| Ganharam 5 ou mais / 10 ou mais | 165 / 1 | 167 / 2 | 185 / 2 | 259 / 2 |
| Maior queda / maior ganho | −22 / +11 | −17 / +11 | −12 / +11 | −8 / +11 |
| Chegaram a 50 | 2 | 0 | 0 | 0 |

Distribuição da força atual (jogadores em clube). Início: média 25,5, mediana 26, P10 12, P90 38.

| | Média (1 / 3 / 5 / 10 temporadas) | Após 10: mediana · P10 · P25 · P75 · P90 | Após 10: 1–10 · 11–20 · 21–30 · 31–40 · 41–50 · =50 |
|---|---|---|---|
| 0.2 | 25,3 / 24,4 / 23,6 / 22,2 | 22 · 7 · 14 · 30 · 37 | 228 · 403 · 477 · 270 · 74 · 2 |
| A | 25,3 / 24,7 / 24,0 / 22,6 | 22 · 9 · 15 · 30 · 37 | 195 · 416 · 494 · 288 · 59 · 0 |
| B | 25,4 / 25,1 / 24,7 / 23,4 | 23 · 10 · 16 · 31 · 37 | 150 · 424 · 511 · 306 · 61 · 0 |
| C | 25,6 / 26,0 / 26,0 / 25,1 | 25 · 13 · 18 · 32 · 38 | 96 · 388 · 522 · 367 · 79 · 0 |

A base do mundo (strengthBase de quem está em clube) também cai, de 25,5 para 23,6 em 10 temporadas, porque a base
que entra é mais jovem e fraca. Por isso a comparação justa é a do mesmo conjunto.

### 6. Por idade (variação média por temporada)

| Idade | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| 18–20 | +0,6 | +0,6 | +0,6 | +0,6 |
| 21–23 | +0,4 | +0,4 | +0,5 | +0,5 |
| 24–27 | −0,2 | −0,1 | 0,0 | +0,2 |
| 28–30 | −0,4 | −0,3 | −0,2 | 0,0 |
| 31–33 | −1,0 | −0,9 | −0,8 | −0,2 |
| 34–36 | −1,8 (91% caem) | −1,7 | −1,6 | −0,5 (39% caem) |

Jovens não evoluem rápido demais em nenhuma variante: no máximo +3 numa temporada e +11 em 10 temporadas.

### 7. Por utilização (variação média por temporada)

| Uso | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| Titular frequente (≥ 70% dos minutos) | 0,0 | 0,0 | 0,0 | +0,1 |
| Titular parcial (40–70%) | −0,2 | −0,2 | −0,2 | +0,1 |
| Reserva (> 0 e < 40%) | −0,8 | −0,8 | −0,6 | 0,0 |
| Zero minutos | −1,6 | −1,3 | −0,9 | 0,0 (nenhuma queda) |

527 jogadores passaram 3 ou mais temporadas sem nenhum minuto. Variação total média (entre parênteses, o pior caso):

| Temporadas sem jogar | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| 3–4 | −8,3 (−19) | −7,1 (−16) | −5,2 (−12) | +0,3 (−5) |
| 5–7 | −12,3 (−21) | −10,3 (−17) | −7,3 (−12) | +0,1 (−2) |
| 8–10 | −14,4 (−22) | −11,3 (−17) | −7,5 (−12) | 0,0 (0) |

**"Um jogador que não joga perde força, mas essa perda destrói a carreira?"**

| Variante | Resposta |
|---|---|
| A | **Sim, ainda destrói** (110 chegam a 1). O limite de −1 vale só para a inatividade; a idade continua pesando no banco sem limite. |
| B | **Ainda pesa muito para veteranos** (−1,6 por temporada aos 34+) e para longas inatividades (−7,5 em média com 8–10 temporadas paradas). |
| C | **Não destrói**, mas a inatividade **fica sem consequência nenhuma** (0 queda em 3.360 temporadas sem minutos). Não atende "deve perder força". |

### 8. Por divisão (efeito isolado no titular)

Para o titular, a inatividade não pesa. A diferença entre a 0.2 e as variantes da 0.3 vem do contexto da divisão.

| Titulares frequentes | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| 1ª temporada após promoção (% que subiu) | −0,1 (17%) | 0,0 (22%) | 0,0 (23,5%) | +0,1 (25%) |
| 1ª temporada após rebaixamento (% que subiu) | 0,0 (18%) | −0,1 (12%) | −0,1 (13%) | 0,0 (16%) |
| Titulares até 27 anos, D1 → D4 | +0,5 em todas | +0,5 | +0,5 | +0,6 |

- **Promoção:** com a divisão no contexto, a chance de subir vai de 17% para 22–25%.
- **Rebaixamento:** a chance de subir cai de 18% para 12–16%. Ninguém perde força por isso; a perda vem só da
  inatividade.
- **D1 sem minutos:** 853 temporadas, **0 subidas** em todas as variantes. Divisão superior não dá força a quem
  não joga.

### 9. Transferências

Todas as 4.311 mudanças de clube ou de divisão chegaram com a mesma força em todas as variantes: 0 mudanças na
1ª rodada. Força antes → logo depois · evolução após 1 / 3 / 5 temporadas:

| Movimento | n | 0.2 | B | C |
|---|---:|---|---|---|
| Transferência D4 → D3 | 6 | 24,0 → 24,0 · +0,5 / +2,0 / +2,5 | 24,0 → 24,0 · +0,3 / +1,2 / +2,3 | 24,2 → 24,2 · +0,2 / +1,6 / +2,0 |
| Transferência D3 → D2 | 15 | 33,1 → 33,1 · −0,1 / −0,8 / −2,1 | 33,0 → 33,0 · 0,0 / −0,2 / −0,8 | 33,2 → 33,2 · 0,0 / +0,1 / 0,0 |
| Transferência D2 → D1 | 16 | 40,8 → 40,8 · 0,0 / −0,6 / −1,1 | 40,5 → 40,5 · 0,0 / −0,4 / −1,0 | 40,7 → 40,7 · 0,0 / +0,1 / −0,3 |
| Transferência D1 → D2 e D1 → D4 | 0 | **nenhum caso no mundo** (a CPU não vende para baixo) | | |

O detalhamento por variante, incluindo a A, está no relatório. Promoções e rebaixamentos (cerca de 700 jogadores por
par de divisões) seguem o mesmo padrão: a força é igual na chegada, e a evolução depois depende do uso.

### 10. Lesões (variação média por temporada)

| | 0.2 | A | B | C |
|---|---:|---:|---:|---:|
| Sem lesão | −0,6 | −0,5 | −0,4 | 0,0 |
| Lesão curta | 0,0 | 0,0 | 0,0 | +0,1 |
| Lesão longa (8+ rodadas) | −0,1 | −0,2 | −0,1 | 0,0 |

A lesão só interrompe a evolução. Exemplo: Davi Duarte (caso 10) teve 8 rodadas lesionado aos 21 anos e terminou com
29–30.

### 11. Casos individuais (reais)

Trajetórias completas por temporada no relatório. Destaques:

- **1. Jovem fraco titular na D1:** Heitor Xavier, MEI, 18 anos, 30.
  - 0.2: 30 → 34.
  - A e B: 30 → 37.
  - C: 30 → 38.
  - Com a divisão no contexto, cresce mais e de forma gradual: no máximo +2 por temporada.
- **2. Jovem fraco que fica reserva:** Everton Siqueira, 23. Fica em 23 até os 22 anos em todas as variantes. Depois
  vai a 18 (0.2), 20 (A), 22 (B) ou 23 (C).
- **3. Forte em clube fraco:** Mateus Uchoa Teixeira, goleiro, 37 na D3. Estável em 37 por 10 temporadas em todas as
  variantes; o ambiente fraco não o derruba.
- **4. Forte em clube forte:** Marcos Freitas Farias, goleiro, 44. Estável em 44 em todas.
- **5. Veterano titular:** Everton Valadares, 32 → 30 dos 32 aos 36 anos, igual em todas.
- **6. Veterano reserva sem minutos:** Henrique Jardim, 26 (dos 32 aos 36 anos).
  - 0.2: → 13.
  - A: → 15.
  - B: → 18.
  - C: → 26.
- **7. Transferido para cima:** Paulo Valadares, 42, D2 → D1. Vira reserva e termina com 43–44.
- **8. Para baixo (pelo rebaixamento do clube):** Davi Gomes Nogueira, 38. Fica em 38 e depois cai a 36–37 com a
  idade (30+).
- **9. Dez temporadas sem jogar:** Breno Bragança Almeida, goleiro, 35.
  - 0.2: → 19.
  - A: → 24.
  - B: → 29.
  - C: → 35.
- **10. Volta de lesão longa:** Davi Duarte, 26 → 29/30.

### 12. Alertas (sinalizados, não corrigidos)

- **0.2:**
  - 146 jogadores chegam a 1;
  - deflação de −2,3;
  - veteranos (34+) caem −1,8 por temporada;
  - quem não joga cai −1,6 por temporada.
- **A:**
  - 110 chegam a 1;
  - deflação de −1,8;
  - veteranos caem −1,7 por temporada;
  - quem não joga cai −1,3 por temporada.
- **B:**
  - 57 chegam a 1;
  - veteranos caem −1,6 por temporada.
- **C:** inatividade sem nenhuma consequência (3.360 temporadas sem minutos, nenhuma queda).
- **Nenhuma variante teve:**
  - jogador evoluindo sem minutos;
  - ganho de força por transferência ou por estar na D1 sem jogar;
  - excesso de jogadores em 50;
  - inflação acima de +2;
  - jovens rápidos demais;
  - jogador forte destruído pelo ambiente.

### 13. Limitações

- **Sem efeito de volta da força nas partidas:** todos os mundos usam os mesmos placares.
- **Poucas transferências reais:** 86 entre clubes em 10 temporadas, nenhuma para divisão inferior. O efeito da
  divisão foi medido principalmente via acesso e rebaixamento.
- **Uma seed só.** A aposentadoria aos 37 (do jogo) limita a análise de veteranos.

### 14. Recomendação técnica

1. **Manter a divisão como contexto de oportunidade (peso 0,5).** Ela fez o que se pediu:
   - mais chance de evolução para titulares de clubes promovidos;
   - nenhum ganho para quem não joga;
   - nenhuma mudança de força na transferência ou na promoção;
   - nenhuma inflação.
2. **Nenhuma das três variantes de inatividade deve virar definitiva.**
   - A e B ainda deixam o **envelhecimento sem minutos** sem limite, e é ele que derruba veteranos e reservas
     antigos.
   - C elimina qualquer consequência.
3. **Próximo teste sugerido** (variante nova, só com evidência e sem integrar): limitar a **perda total sem
   participação** (inatividade + idade nas rodadas sem jogar) a cerca de −0,5 a −1 por temporada, mantendo o
   envelhecimento normal para quem joga. Objetivo: quem não joga perde algo todo ano, e ninguém chega a 1 só por
   ficar no banco.
4. **Antes de integrar:** medir o efeito de volta (com aprovação, porque muda placares) e testar mais seeds.

## Validação DEV-PROTO-0.4 — Mundo Real

> **DEV-PROTO-0.4 continua NÃO integrada ao jogo e isolada.** Nenhuma variante foi declarada definitiva. Curva de
> idade inalterada; strengthBase não é piso. Relatórios: `reports/development-world-10-seasons-v04.md`
> (`npm run development:world04`) e `reports/development-v04-synthetic.md` (`npm run development:synthetic04`).

**O que a 0.4 testa** (sobre a 0.3: contexto 50% elenco + 50% divisão):

1. **Limite CONJUNTO da perda sem participação:** envelhecimento + inatividade das rodadas sem jogar, somados por
   temporada e limitados a A −0,50, B −0,75 ou C −1,00. Para quem não joga o ano todo, é o teto da perda total do ano.
   Rodadas jogadas seguem o envelhecimento normal. Lesão conta como rodada sem participação.
2. **Preservação do rendimento no limite contextual** (`performancePreservation`):
   - A = atual (descarta);
   - B = parcial (reserva de até 0,5 no acumulador);
   - C = integral (até 1,5).

   O +1 continua proibido no limite.

**Mundo real.** Mesma seed e metodologia, 15.200 partidas; controle sem observador × 10 observadores (0.3-B e a
grade 3 × 3). Hash dos placares idêntico (`af11672f38c7…0318328`). A decomposição bate com a fórmula (diferença
máxima de 0,0001).

| 10 temporadas | 0.3-B | A (−0,50) | B (−0,75) | C (−1,00) |
|---|---:|---:|---:|---:|
| Mesmo conjunto (1.111 jogadores) | −0,8 | −0,1 a +0,2 | −0,7 a −0,4 | −1,2 a −1,0 |
| Chegaram a 1 | 57 | 16 | 25 | 49 |
| Dos que chegaram a 1, força inicial ≤ 10 | 52 | 16 (todos) | 25 (todos) | 47 |
| −10 ou mais | 157 | 0 | 1 | 77 |
| Maior queda | −12 | −9 | −10 | −11 |
| Veteranos 31–36 sem minutos (por temporada) | −1,6 | −0,5 | −0,7 | −1,0 |
| Todas as temporadas sem minutos | −0,9 | −0,4 | −0,6 | −0,8 |
| Jovens (≤ 23) sem minutos | 0,0 | 0,0 | 0,0 | −0,1 |
| Jovens (≤ 23) titulares | +0,9 | +0,9 | +0,9 | +0,8 a +0,9 |
| Veteranos titulares, rendimento > 0 × ≤ 0 | −0,61 × −1,12 | −0,61…−0,55 × −1,12…−1,00 | −0,60…−0,54 × −1,12…−1,01 | −0,60…−0,54 × −1,12…−1,00 |
| Chegaram a 50 / subidas sem minutos / força por transferência | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

Faixas com "a" ou "…" vão da preservação A à C.

- **O limite conjunto age onde o diagnóstico apontou.** Nos veteranos 31–36 sem minutos, a perda bruta média é
  −2,67 por temporada (envelhecimento −1,19 + inatividade −1,48). A aplicada passa a −0,50, −0,75 ou −1,00.
- **Casos obrigatórios** (força final; 0.3-B → A / B / C, com preservação atual):

| Jogador | 0.3-B | A | B | C |
|---|---:|---:|---:|---:|
| Breno Bragança Almeida | 29 | 30 | 28 | 25 |
| Henrique Jardim | 18 | 24 | 23 | 21 |
| Luan Gomes | 20 | 27 | 25 | 22 |
| Gabriel Macedo | 15 | 22 | 20 | 19 |

  Igor Duarte (24) e Caio Toledo Freitas (48) não mudam: eles jogam.
- **A preservação mexe pouco:**
  - nos veteranos titulares com rendimento ruim, a queda vai de −1,12 para −1,00;
  - nos com rendimento bom, de −0,61 para −0,54;
  - a reserva descartada é quase toda de titulares de até 27 anos (0,20 por temporada) e de veteranos só 0,02;
  - na preservação integral, a média sobe +0,1 a +0,3 e os "+5 ou mais" vão de 199 para 229 (na A).
- **Casos sintéticos** (5 temporadas):
  - veterano de 35 anos, 40, sem minutos: 0.3-B 40 → 28; 0.4 A → 38, B → 37, C → 35;
  - jovem de 20 anos sem minutos: −1 a −2;
  - jovem titular: +12;
  - a preservação não diferencia os padrões sintéticos.

**Anomalias que permanecem** (registradas, não corrigidas):

- **Jogadores ainda chegam a 1:** 16 (A), 25 (B) e 49 (C). Na A e na B, todos começaram com força 10 ou menos e
  passaram em média 4 temporadas sem minutos. Sem piso pela força inicial (proibido nesta etapa), isso continua
  possível.
- **Titulares de 34–36 anos caem −1,1 a −1,2 por temporada.** É a curva de idade, não alterada.
- **Extremos sintéticos da curva de idade:**
  - titular de 36 anos, força 48, rendimento bom: fica em 48 até os 40 (o rendimento compensa a idade);
  - com rendimento ruim: cai −3 por ano (48 → 34).

  Só existem até os 36 no jogo, por causa da aposentadoria aos 37.
- **Sem efeito de volta da força nas partidas;** uma seed só.

## Teste de feedback — Temporada 1

> **DEV-INTEGRATION-0.1 — teste de integração EXPERIMENTAL.** Não é integração oficial. Nada entra no produto, nos
> saves, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado. Relatório completo:
> `reports/development-feedback-season-01.md`; dados para reproduzir: `reports/development-feedback-season-01.json`;
> comando: `npm run development:feedback1` (~1,5 min, roda o experimento duas vezes).

**Montagem**

- Candidata: DEV-PROTO-0.4-B (`devProto04('B', 'B')`):
  - limite conjunto −0,75 por temporada sem participação;
  - preservação parcial;
  - divisão como oportunidade;
  - sem piso de strengthBase;
  - curva de idade inalterada.
- Dois mundos com a mesma seed (`elite-dev-world-10`), universo, calendário, carreira sem decisões manuais e 1.520
  partidas cada:
  - **Controle:** strengthBase → Engine 0.2.0. Usa `evolution: false`, então a força fica fixa.
  - **Desenvolvimento:** strengthBase → DEV-PROTO-0.4-B → strengthCurrent → Engine 0.2.0.
- Camada de composição: `game/development/feedback.ts`. Nenhum código do produto a importa (há teste para isso).
  - `stepDevelopment` lê as partidas já jogadas.
  - `withDevelopedStrength` devolve o mundo trocando só `Player.strength`.
  - Escalação, chances, conversão, RNG, gols, cartões, lesões, placares e calendário continuam no engine e no jogo.

**Divergências**

Nenhuma além de strengthCurrent. Ficaram idênticos:

- o universo inicial;
- calendário, seeds e mandos das 38 rodadas;
- o mundo inteiro e os placares até a 1ª mudança real de força (rodada 20);
- identidade, idade, posição e temperamento dos jogadores;
- as divisões.

A composição só alterou a força em todas as rodadas. Efeitos derivados (esperados, porque a escalação automática
ordena por força):

- 31 placares diferentes em 1.520, o primeiro na rodada 21;
- 257 jogadores com condição diferente no fim;
- 28 clubes com caixa diferente;
- nenhuma transferência diferente.

**Resultado (1 temporada)**

- **Desenvolvimento:**
  - 350 de 1.920 jogadores mudaram a força (255 subiram, 95 caíram), magnitude média 1,05;
  - média 25,49 → 25,58; mediana igual; P10 12 → 13; P90 igual;
  - maior ganho +2, maior queda −2;
  - ninguém chegou a 50 ou a 1.
- **Engine (Controle → Experimental):**
  - gols por partida 2,746 → 2,747;
  - conversão 35,5% → 35,5%;
  - vitória do favorito 47,1% → 46,6%, do azarão 28,6% → 28,7%;
  - placares típicos e 4+/5+/7+ dentro de ±0,3 p.p., também por divisão.
- **Divisões:**
  - todas sobem cerca de +0,1;
  - as distâncias ficam estáveis (D1−D4: 19,26 → 19,29);
  - não divergem nem convergem.
- **Feedback:**
  - a variação por janela cresce até a rodada 25 e depois cai (0,02 · 0,03 · 0,03 · 0,01 · 0,00);
  - os 4 primeiros da tabela não ganham mais que os 4 últimos (diferença entre −0,05 e +0,06);
  - não há sinal de retroalimentação positiva.
- **Casos:**
  - o jovem fraco titular da D1 sobe +1;
  - os demais não mudam em uma temporada: jovem reserva sem minutos, jovem forte da D4 já no limite contextual,
    veteranos (limite conjunto < 1) e estrela 50;
  - não houve transferido entre divisões, porque a CPU só transfere e o acesso/rebaixamento só acontece na virada.
- **Critérios de segurança:** nenhum disparou.
- **Determinismo:** duas execuções completas com hashes iguais (placares dos dois mundos, evolução e relatório).

**Limites do teste**

- Uma temporada e uma seed.
- A força só muda a partir da rodada 20, com ±1 por janela, então o efeito de volta é pequeno por construção.
- Sem virada de temporada (envelhecimento, aposentadoria, acesso, mercado).
- **Não avançar para 10 temporadas sem decisão do responsável.**

## Teste de feedback — 10 temporadas

> **DEV-INTEGRATION-0.2 — simulação/validação EXPERIMENTAL.** Não é integração oficial. Nada entra no produto, nos
> saves, na UI, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado e nenhum balanceamento alterado.
> Relatório completo: `reports/development-feedback-10-seasons.md`; dados: `reports/development-feedback-10-seasons.json`;
> comando: `npm run development:feedback10` (~15 min, roda o experimento duas vezes).

**Montagem**

- Mesma composição da temporada 1 (`game/development/feedback.ts`, DEV-PROTO-0.4-B).
- Agora com 10 temporadas e todas as regras do jogo: acesso/rebaixamento, CPU (transferências e renovações), base,
  aposentadoria, finanças, lesões e suspensões.
- **A — Controle:** força fixa. **B — Desenvolvimento:** strengthCurrent no engine.
- Os checkpoints antigos de `progression.ts` ficam desligados nos dois mundos.

**Auditoria**

- O engine não teve nenhum commit desde o snapshot, e a impressão digital confere.
- A única escrita de força no jogo é `progression.ts`.
- `movePlayer`, `agePlayers`, renovações e acesso/rebaixamento não tocam na força. Isso foi conferido em toda virada,
  e há teste novo para transferência e envelhecimento.
- strengthBase nunca muda.
- A nova divisão só altera o ambiente das rodadas seguintes.

**Divergências**

Nenhum erro. Ficaram idênticos:

- o universo;
- id e seed das 380 rodadas;
- o mundo e os placares até a 1ª mudança de força;
- a força fixa do Controle.

Divergências derivadas da força:

- **Calendário a partir da T2:** o sorteio usa a ordem dos clubes, que vem da classificação final
  (`applyPromotionRelegation`). Por isso a mesma divisão com outra ordem gera outro calendário.
- **A partir da T3:** clubes diferentes sobem e caem nos dois mundos.
- **Juniores:** nascem com o mesmo id mas outra posição ou força.
- **Placares:** 31 diferentes na T1, cerca de 550–630 por temporada depois.

**Resultado (10 temporadas)**

- **Média de força (todos com clube):**
  - A: 25,49 → 23,72; B: 25,58 → 23,44.
  - A cai sozinho por aposentadorias e juniores.
  - A diferença B − A fica entre −0,7 e +0,1. Não há inflação nem deflação forte.
- **Mesmo conjunto** (1.111 jogadores do início ao fim): −0,91 em 10 anos, já com o envelhecimento.
- **Mudança acumulada:**
  - maior ganho +13, maior queda −10;
  - +5 ou mais: 167; −5 ou mais: 613;
  - nenhum jogador chegou a 50.
- **Mudança por temporada:** ±2 a ±3 no máximo; magnitude média 1,05–1,20 entre quem mudou.
- **Engine (10 temporadas, A → B):**
  - gols por partida 2,710 → 2,686;
  - conversão 35,3% → 35,0%;
  - vitória do favorito 45,3% → 44,5%, do azarão 30,0% → 30,3%;
  - 4+ gols 28,8% → 28,3%.
  - Nenhuma temporada passa de ±5% em gols ou conversão.
- **Divisões (A × B no fim da T10):**
  - D1−D2 6,76 × 5,58;
  - D2−D3 5,74 × 6,30;
  - D3−D4 7,37 × 7,46;
  - D1−D4 19,87 × 19,35.
  - No próprio Controle essas distâncias oscilam bastante, por exemplo D1−D2 de 2,4 a 7,2.
- **Retroalimentação pela tabela:** a diferença de variação entre os 4 primeiros e os 4 últimos fica entre −0,24 e
  +0,47 por temporada. Fica longe do alerta (+1,0), mas é positiva na maioria das temporadas da D1 e da D4.
- **Casos:**
  - jovem fraco titular da D1: 28 → 34;
  - jovem reserva sem minutos: 22 → 21;
  - jovem forte da D4: 28 → 29, limitado pelo ambiente;
  - veterano bom titular: 42 → 42 até se aposentar;
  - veterano ruim: 22 → 16;
  - veterano sem minutos: 45 → 41;
  - estrela de força 50: mantém até os 34 e chega a 48 aos 36;
  - transferido para a D1: 43 → 41, por idade.

**Critérios de segurança que dispararam** (registrados; nada foi calibrado)

- **Concentração em 1, da T6 à T10:** 11 a 20 jogadores com força 1 em B, contra 0 em A. Os 31 que chegaram a 1 começaram
  todos com força ≤ 10. É a mesma anomalia da validação em observador: sem piso pela força inicial, que é proibido
  nesta etapa.
- **Divisão inferior forte demais, só na T9:** D1−D2 ficou em 4,75 em B, contra 6,48 em A (73% de A). Na T10 voltou a
  5,58 × 6,76, e o valor fica dentro da oscilação natural do Controle. Está registrado, sem conclusão.

**Determinismo:** duas execuções completas com hashes iguais (placares de A e B, evolução e relatório).

**Não decidido aqui:** integração oficial, piso para força muito baixa e qualquer ajuste de calibração.
