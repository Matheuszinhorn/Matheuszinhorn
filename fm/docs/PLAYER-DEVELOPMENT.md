# Evolução contextual de força — PlayerDevelopment (PROJETO)

> **Status: projeto e simulação. Nada implementado no jogo.** O protótipo `game/development/development.ts`
> (versão `DEV-PROTO-0.1`) não é importado por nenhum módulo do engine, do jogo ou do app (um teste garante isso).
> A evolução em uso continua sendo a de [PLAYER-PROGRESSION.md](PLAYER-PROGRESSION.md). Engine 0.2.0 sem alteração e
> nenhuma força aplicada.

Arquivos:
- **Protótipo:** `game/development/development.ts`
- **Simulação:** `scripts/simulate-development.ts`, que gera `reports/development-simulation.md`
- **Testes:** `game/tests/development.test.ts`

## Objetivo

Reproduzir um **princípio**, não um código: a força muda **pouco a pouco**, pelo **rendimento em campo**, e o nível do
clube funciona como **ambiente de desenvolvimento**, não como bônus imediato.

| Situação | Errado | Certo |
|---|---|---|
| Jogador 23 da Série D contratado por clube de elenco médio 40 | 23 → 40 na contratação | Entra com 23 e, se jogar e render, sobe +1 por vez: 23, 24, 24, 25, 26, 26, 27… |
| Jogador 45 na Série D | Cai porque a divisão é fraca | Continua 45: não cresce acima do ambiente, mas não é punido por ele |
| Jogador 20 no banco de um clube forte | Sobe porque o clube é forte | Não sobe: o ambiente só ajuda quem joga |

## ELIFOOT — PRINCÍPIO DE EVOLUÇÃO

### Fato encontrado na engenharia reversa (referência histórica)

Fonte: engenharia reversa pública do executável do Elifoot 98, feita por **trsthales** com Ghidra e Cheat Engine. O
binário é Borland Delphi 1.0, de 16 bits. Publicações:

- TabNews: "Desvendei o código do Elifoot 98 após 25 anos: engenharia reversa em 16-bit com Ghidra no Linux" —
  https://www.tabnews.com.br/trsthales/desvendei-o-codigo-do-elifoot-98-apos-25-anos-engenharia-reversa-em-16-bit-com-ghidra-no-linux
- TabNews, parte 2 (motor de gols; não trata de evolução) —
  https://www.tabnews.com.br/trsthales/engenharia-reversa-como-o-motor-do-elifoot-98-decide-os-gols-e-por-que-o-5-0-5-quebra-o-jogo
- Repositório "desvendando-elifoot-98" (declarado educacional e de preservação histórica; sem o executável) —
  https://github.com/trsthales/desvendando-elifoot-98

Consulta feita em 03/10/2026. O que essas fontes descrevem para a rotina de evolução (`FUN_17fb_4a41`):

| Ponto | O que a fonte diz |
|---|---|
| Escala | Força nominal de 1 a 50. |
| Momento | Rodada a rodada, no pós-jogo, para o elenco. |
| Gatilho | Uma avaliação de rendimento da partida, positiva ou negativa. |
| Ganho | +1 com avaliação positiva, só se a força estiver até `nivelBaseTime + 5` (e até 50). |
| Perda | −1 com avaliação negativa, depois de uma tolerância de 50%, e não abaixo de `nivelBaseTime − 5` (nem de 1). |
| Goleiro | Precisa vencer um sorteio extra de 50% para ganhar: evolui mais devagar. |

**O que as fontes NÃO esclarecem:**
- como `nivelBaseTime` é calculado;
- como a avaliação de rendimento (`AvaliarRendimento`) é feita.

O código não foi copiado nem reproduzido aqui. O ELITE MANAGER **não** usa a fórmula do Elifoot.

### Adaptação proposta para o ELITE MANAGER

| Princípio do Elifoot | Adaptação no ELITE MANAGER (protótipo) | Por que diferente |
|---|---|---|
| Avaliação a cada rodada | Pontos de desenvolvimento a cada rodada; a força só muda no **fim de janelas de 5 rodadas** (e na rodada 38), no máximo ±1 | Evita oscilar rodada a rodada e dá um ritmo legível (cerca de 8 chances por temporada). |
| ±1 por avaliação | ±1 por **janela**; o que sobra passa adiante até 0,99 (nunca vira dois passos) | Mesmo princípio de passo pequeno, sem sorteio. |
| Ganho até `nivelBaseTime + 5` | **Teto contextual** = nível do ambiente + margem por idade (+6 até 21 anos, +4 até 24, +2 até 28, 0 até 30, −2 depois). O ganho diminui perto do teto e some acima dele. | A margem fixa "+5" vira uma margem calibrada pela idade: promessa tem espaço, veterano não. |
| `nivelBaseTime` (não documentado) | **Ambiente = média de força dos 16 jogadores mais fortes do elenco atual** do clube | Definição explícita. É o clube, não a divisão. |
| Perda até `nivelBaseTime − 5` | **Sem piso pelo ambiente.** A perda vem só de rendimento ruim, idade (31+) ou tempo sem jogar (fora lesão). Ficar num clube fraco não derruba ninguém. | Requisito: o jogador forte não cai por estar numa divisão menor (caso C). |
| Goleiro: sorteio extra de 50% | Goleiro ganha **75%** dos pontos; o rendimento dele vem de jogo sem sofrer gol, defesas e gols sofridos, nunca de gols marcados | Mesmo efeito (mais lento), sem sorteio e calibrável. |
| Sorteio (`Random`) | **Determinístico:** as mesmas partidas dão a mesma evolução | Recarregar não muda nada; não há "rolar de novo". |

## Arquitetura proposta

```
EM-RATING (dado inicial) ──► strengthBase ─┐
                                           ├─ PlayerDevelopment ──► strengthCurrent ──► Player.strength (engine lê só isto)
partidas do jogo (eventos do engine) ──────┘     (histórico de mudanças)
```

`PlayerDevelopment`, um por jogador, tem só três números além do histórico. Não há atributo oculto:

| Campo | O que é |
|---|---|
| `strengthBase` | Força inicial: EM-RATING para jogador real, geração do mundo para o fictício. **Nunca muda.** |
| `strengthCurrent` | Força usada pelo jogo. O engine continuaria lendo só `Player.strength`, que passa a ser este valor. |
| `progress` | Pontos acumulados na janela atual. |
| `idleRounds` | Rodadas seguidas sem jogar, sem contar lesão. |
| `history[]` | Cada mudança com temporada, rodada, de → para, motivo e contexto (ambiente, teto, idade, pontos da janela). Dá para ver a evolução por rodada, por temporada e por quê. |

### Dados usados: só o que o ELITE MANAGER tem

| Fator | De onde vem | Usado |
|---|---|---|
| Idade | Jogador | Sim: tendência e margem do teto |
| Partidas e minutos | Eventos da partida (entrou em campo; minutos derivados de substituição, expulsão ou lesão) | Sim: o ganho é proporcional aos minutos |
| Titularidade | Escalação inicial da partida | Registrada; não pesa à parte, porque os minutos já a refletem |
| Rendimento | Resultado do time, gols, jogo sem sofrer gol, gols sofridos, defesas do goleiro, expulsão | Sim: nota de −1 a +1 por partida |
| Produção | Gols por posição | Sim, dentro do rendimento |
| Diferença para o ambiente | Força atual × ambiente do clube | Sim: o teto e a velocidade perto do teto |
| Sequência sem jogar | Rodadas seguidas fora | Sim: perde ritmo depois de 6 rodadas, a partir de 23 anos |
| Lesão | Rodadas lesionado | Sim: pausa, não pune |
| Competição | Divisão | **Não diretamente.** Só pelo ambiente do clube, nunca "Série A = +X" |
| Notas por jogador, passes, finalizações | Não existem no engine 0.2.0 | Não (nada inventado) |

Hoje o jogo guarda por temporada só partidas, gols, cartões e lesões (`StatLine`). Minutos, titularidade e defesas
**podem ser derivados** dos eventos que o engine já produz. Seria preciso guardá-los na camada de gestão, sem mudar o
engine.

## Fórmula conceitual (DEV-PROTO-0.1)

Por rodada:

```
teto      = min(50, ambiente + margemIdade(idade))
rendimento ∈ [−1, +1]   (resultado ±0,2; GOL: jogo sem sofrer gol +0,5, defesas até +0,3, 3+ sofridos −0,4;
                         DEF: jogo sem sofrer gol +0,3, gol +0,4; MEI: +0,5 por gol; ATA: +0,4 por gol,
                         −0,1 sem gol com 60+ min; expulsão −0,5)
bruto     = (minutos/90) × (max(0, tendênciaIdade) + 0,15 × rendimento)        só se jogou
se bruto > 0:  pontos += bruto × espaço × (GOL ? 0,75 : 1),   espaço = clamp((teto − força)/6, 0, 1)
se bruto ≤ 0:  pontos += bruto                                   (rendimento ruim pesa mesmo acima do teto)
idade 31+:     pontos += tendênciaIdade (× 0,5 se não jogou)
parado:        pontos −= 0,05 por rodada além de 6 seguidas sem jogar (23+ anos, sem lesão)
```

`tendênciaIdade` por rodada vale +0,14 até 21 anos, +0,09 até 24, +0,04 até 28, 0 até 30, −0,03 até 32 e −0,06
depois.

No fim da janela (rodadas 5, 10, …, 35 e 38):
- pontos ≥ 1 → +1, se a força ainda estiver abaixo do teto;
- pontos ≤ −1 → −1;
- a sobra é limitada a ±0,99.

## Casos simulados

Os números estão em `reports/development-simulation.md`. A força é mostrada ao fim de cada janela.

| Caso | Situação | Resultado |
|---|---|---|
| **A** | 23, 22 anos; Série D titular → Série A (ambiente 40) titular com bom rendimento | Série D: fica em 23 (teto 20). Na Série A: 23 → 27 (1ª temporada) → 32 (2ª) → 35 (3ª). Nunca 23 → 40; sempre +1. |
| A (variante) | Mesmo jogador, mas reserva na Série A (25 min a cada 3 rodadas) | 23 → 23 em 3 temporadas: o ambiente não ajuda quem não joga. |
| **B** | 34, 24 anos; Série D → Série A (ambiente 40) titular | 34 → 36 → 38: chega mais rápido ao nível competitivo e para no teto (42). |
| **C** | 45, 27 anos, fica na Série D (ambiente 16) | 45 durante 3 temporadas: não cai pela divisão e não cresce acima do ambiente. |
| **D** | 20, 25 anos, banco da Série A | 20 → 19 → 17 em 2 temporadas: nenhum ganho e perda de ritmo lenta. |
| **E** | 25, 23 anos, vira titular na Série A com bom rendimento | 25 → 29 → 34 → 36. |
| Estrela pronta | 46, 27 anos, ambiente 42 | 46 estável. |
| Jovem promessa | 22, 18 anos, ambiente 30, rendimento médio | 22 → 27 → 32 → 35 (teto 36). |
| Jogador mediano | 30, 27 anos, ambiente 31 | 30 → 31 em 3 temporadas. |
| Veterano | 40, 33 anos, titular, ambiente 38 | 40 → 38 → 35 → 33. |
| Subindo de divisão | 24, 23 anos; o clube sobe C → B → A (ambiente 22 → 28 → 34) | 24 → 25 → 28 → 30. |
| Goleiro jovem | 24, 21 anos, ambiente 36, time sólido | 24 → 29 → 34 → 37. |
| Rendimento ruim | 30, 26 anos, ambiente 32, time perde e ele não marca | 30 → 30 → 31. |
| Lesão no 2º turno | 26, 22 anos | 26 → 28 no 1º turno; parado no 2º, sem perda. |

### Achados para calibrar (sem correção nesta etapa)

1. **Veterano titular cai 7 pontos em 3 temporadas (33–35 anos).** É o "começar a cair". Se parecer rápido demais,
   a tendência −0,06 pode ir para −0,04.
2. **Rendimento ruim ainda ganha +1 em 2 temporadas (26 anos).** A tendência de idade (+0,04) compensa o rendimento
   ruim. Pode-se exigir rendimento ≥ 0 para a tendência de idade valer.
3. **Goleiro de time sólido evolui tanto quanto o jogador de linha.** O jogo sem sofrer gol rende muito. O fator 0,75
   segura, mas o rendimento do goleiro ainda precisa de calibração com partidas reais do engine, não sintéticas.
4. **Jovem brilhante em ambiente forte:** +6 a +7 por temporada (15 → 21 → 28). É o máximo prático, e o limite
   teórico é +8.

### Comparação com a evolução em uso

O sistema atual tem 2 checkpoints por temporada e sorteio estável. Ele usa a média da **divisão** e não olha minutos
nem rendimento por partida. Passo esperado por temporada no sistema atual × resultado do protótipo na 1ª temporada no
novo ambiente:

| Caso | Atual | Protótipo |
|---|---:|---:|
| A | +1,40 | +4 |
| B | +0,80 | +2 |
| C | +0,24 | 0 |
| D (banco) | +0,24 | −1 |
| E | +1,16 | +4 |

Diferenças principais do protótipo:
- o banco não evolui;
- a divisão não puxa ninguém;
- quem joga e rende evolui de forma perceptível.

## Possíveis exploits

| Exploit | Resposta do protótipo | Resultado simulado |
|---|---|---|
| "Estacionar" um jovem no banco de um clube forte | Ganho só com minutos | Caso D: nenhum ganho |
| "Minutos de lixo" (entrar aos 85' toda rodada) | Ganho proporcional a minutos/90 | 22 → 22 em 2 temporadas |
| Artilheiro de time fraco acima do ambiente | Sem ganho acima do teto | 30 → 30 |
| Acumular pontos para subir vários de uma vez | Teto do acúmulo (1,5); sobra até 0,99; ±1 por janela | +8 no máximo por temporada |
| Recarregar o save para "tentar de novo" | Sem sorteio: as mesmas partidas dão a mesma evolução | — |
| Inflar o ambiente comprando estrelas para fazer jovens crescerem | O ambiente sobe de fato (os 16 mais fortes). Custa caro e só ajuda quem joga. | Comportamento desejado ("ambiente forte"), limitado pelo dinheiro |
| Contratar um jogador de clube fraco esperando um salto | Contratação não muda a força | Caso A: entra com 23 |
| Escalar jogador fraco para farmar evolução | Funciona, mas o time joga mais fraco: é o custo real de desenvolver | Desejado |
| CPU × jogador humano | Mesmas regras para todos os clubes | — |

## Limites

- Passo máximo de ±1 por janela (8 janelas por temporada). A força fica sempre entre 1 e 50.
- Nunca ganha acima do teto do ambiente. Pode ficar acima do teto (estrela num clube fraco) sem perder por isso.
- `strengthBase` nunca muda: a EM-RATING é o ponto de partida, e a carreira registra o caminho.
- Os rendimentos simulados vêm de padrões sintéticos fixos. A calibração definitiva exige rodar com partidas reais
  do engine (nova simulação, antes de qualquer implementação).

## Integração futura (quando aprovada)

1. **Dados de partida:** registrar na camada de gestão, por jogador e por rodada, minutos, titularidade, defesas e
   gols sofridos. Tudo vem dos eventos do engine, **sem alterar o engine**.
2. **Estado:** `CareerState.manager.development: Record<playerId, PlayerDevelopment>`, campo opcional. Save antigo:
   `strengthBase = strengthCurrent = Player.strength` na carga (migração compatível, sem trocar a chave do save).
3. **Substituição:** o PlayerDevelopment substitui os checkpoints de `progression.ts`, sem rodar os dois ao mesmo
   tempo. O engine continua lendo `Player.strength`, que passa a ser `strengthCurrent`.
4. **EM-RATING:** quando a força oficial existir, `strengthBase = strength` da EM-RATING (com `strengthMethodVersion`).
   A EM-RATING define o ponto de partida; a evolução nunca reescreve a EM-RATING, e a EM-RATING nunca reescreve uma
   carreira em andamento.
5. **Regressão:** com a evolução desligada, as partidas têm de continuar idênticas (mesmo teste que existe hoje para
   `progression.ts`).
6. **Exibição:** histórico do jogador (força base → atual) e notícias de evolução, só com fatos aplicados.

## O que não muda nesta etapa

- O engine 0.2.0, o RNG, os saves, a gameplay e a evolução em uso.
- O universo fictício padrão.
- A força do universo real, que continua `null`.
