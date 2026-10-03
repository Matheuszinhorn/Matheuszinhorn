# Evolução contextual de força — PlayerDevelopment (PROJETO EM CALIBRAÇÃO)

> **Última etapa: validação no mundo real do engine (0.3), com a fórmula DEV-PROTO-0.2 sem mudanças.**
> Resultado: os princípios se mantêm, mas há dois problemas de calibração (deflação pelo banco e ambiente que não
> enxerga a divisão). Ver [Validação no mundo real](#validação-no-mundo-real-do-engine-03).

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
| `game/tests/development.test.ts` | 16 testes de invariantes |

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
