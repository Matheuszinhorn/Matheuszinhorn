# Arquitetura

Três camadas, cada uma dependendo só da de baixo: **app → game → engine**. O engine não conhece interface; a
interface não contém regras de futebol. Tudo roda no navegador do jogador: não há servidor, backend nem banco.

```
app/     interface (TypeScript + DOM, sem framework)
  │        controller.ts: estado da tela e ações · views/*: telas e pop-ups · main.ts: ponto de entrada
  ▼
game/    regras de jogo fora da partida e orquestração
  │        career.ts: carreira, rodadas, lesões/suspensões, finanças, virada, (de)serialização
  │        session.ts: rodada ao vivo, 5 velocidades, pausas, decisões, temporizador injetável
  │        queries.ts / queries-lite.ts: consultas só de leitura (CLUBES, tabela, força)
  │        lineup-edit.ts: troca, formação, tática, batedor · assist.ts: sugestão = política da CPU
  │        goalkeeper.ts: monta o comando das decisões de goleiro a partir da escolha do jogador
  ▼
engine/  Engine 0.2.0, determinístico (ver ENGINE.md)
           partida, decisões, comandos, CPU, rodada, temporada, finanças, mundo, escalação, RNG
```

Não há divisão servidor/cliente: o jogo inteiro é uma página estática.

## Responsabilidades

| Camada | Faz | Não faz |
|---|---|---|
| `engine/` | Simula minutos, sorteia eventos, valida times e comandos, abre decisões, aplica a política da CPU, calcula tabela, acesso/rebaixamento e finanças. | Não sabe de telas, velocidade, armazenamento ou do clube "do jogador" além do `controlledClubId`. |
| `game/` | Carreira entre rodadas (aplicar resultados uma vez, lesões, suspensões, finanças, virada de temporada), sessão da rodada (ritmo, pausas, fila de decisões), consultas, edição de escalação. | Não desenha nada e não muda regras de partida. |
| `app/` | Mostra o estado, coleta escolhas, chama o controlador, salva e carrega. | Não decide resultado nem valida regras: quem valida é o engine. |

## Fluxo de dados

1. **Carreira.** `CareerState` (em `game/career.ts`) guarda mundo, calendário, rodada, resultados, escalação do
   jogador, extrato e histórico. Funções puras devolvem uma carreira nova; nada é alterado no lugar.
2. **Antes da rodada.** `planRound` monta as 40 partidas da rodada com a escalação do jogador e a seed da rodada.
3. **Rodada ao vivo.** `game/session.ts` cria a rodada no engine (`createRound`) e chama `stepRound` (1 minuto de
   todas as partidas) no ritmo da velocidade. Ao surgir uma decisão do jogador, a sessão para; o comando do jogador
   volta ao engine por `applyRoundCommand`, e a sessão retoma.
4. **Aplicação.** Com as 40 partidas encerradas, o controlador chama `finishRound` **uma vez** por rodada: resultados,
   classificação, finanças, lesões e suspensões. Na rodada 38, a temporada fecha com o acesso/rebaixamento pendente;
   `startNextSeason` o aplica.
5. **Tela.** `app/src/controller.ts` mantém o estado da interface (tela, fase PRE/LIVE/POST, rodada, pop-up) e avisa
   `main.ts`, que redesenha uma vez por ciclo.

## Controlador

`GameController` (`app/src/controller.ts`) é a única porta da interface para as camadas de baixo: iniciar e
continuar carreira, jogar rodada, pausar, velocidade, decisões (aceitar sugestão, escolher cobrador, enviar
ajuste), edição do MEU TIME, próxima rodada. Ele não tem DOM e é testado em Node (`app/tests/controller.test.ts`).

## Separação UI × engine

- As decisões chegam à tela como `Decision` (com `eligible` e `suggested`); a tela devolve um comando.
  "ACEITAR SUGESTÃO" envia o comando da política da CPU (`game/assist.ts`).
- Montar um comando que exige conhecer o time (por exemplo, quem vai para o gol) é feito em `game/`, nunca na view.
- A velocidade e o temporizador ficam em `game/session.ts`; o engine joga sempre 1 minuto por chamada.

## Persistência

`localStorage` do navegador (com memória como reserva se o `localStorage` não funcionar):

| Chave | Conteúdo | Quando grava |
|---|---|---|
| `fm-brasileiro:carreira:v1` | `serializeCareer(career)`: a carreira inteira em JSON, `version: 1` | Ao criar a carreira, ao aplicar cada rodada, na virada de temporada, a cada edição do MEU TIME |
| `fm-brasileiro:velocidade` | A velocidade escolhida | A cada troca de velocidade |

`deserializeCareer` recusa JSON inválido ou versão diferente. A rodada em andamento não é salva: ao recarregar,
volta ao início da mesma rodada sem nada aplicado. Recarregar no fim da temporada volta à tela FIM DE TEMPORADA.

## Build e distribuição

- `npm run build` executa `scripts/build-app.mjs`: um empacotador próprio, sem dependências, que usa a remoção de
  tipos do Node, resolve os imports relativos a partir de `app/src/main.ts` e gera **um único**
  `dist/app/index.html` com CSS e JavaScript embutidos.
- Por isso o código do app usa apenas imports relativos e sintaxe TypeScript "apagável" (sem `enum`, `namespace`
  ou parameter properties; `import type` para tipos).
- O HTML resultante é estático e autocontido: funciona aberto direto (`file://`) ou servido por qualquer servidor
  de arquivos. Não faz chamadas de rede.
- Testes e scripts de balanceamento não entram no build.
