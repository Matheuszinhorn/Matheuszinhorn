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
  │        manager/: camada de GESTÃO (ELITE MANAGER) — state (tipos), core (criação/migração), flow (rodada e
  │          virada gerenciadas), actions (mercado, contratos, estádio, finanças, emprego), market, contracts,
  │          finance, stadium (obras + público), news, board (objetivo/moral), people (personalidade, árbitros,
  │          técnicos, bandeiras, cores, datas), stats (estatísticas reais), world (mundo vivo)
  ▼
engine/  Engine 0.2.0, determinístico (ver ENGINE.md)
           partida, decisões, comandos, CPU, rodada, temporada, finanças, mundo, escalação, RNG
```

Não há divisão servidor/cliente: o jogo inteiro é uma página estática.

**Camada de dados (V1.1, branch `feature/real-rosters-2026`):** `data/` fornece mundos ao jogo a partir de
universos de dados (ex.: Brasileirão 2026), pelo fluxo fonte → raw → normalização → validação → `Universe` →
`World`. Ela depende só dos tipos e de `generateWorld` do engine; o engine não a conhece. Ainda não é usada por
`game/` nem pelo build do app (o jogo continua no universo fictício). Detalhes em [UNIVERSES.md](UNIVERSES.md).

**Camada de gestão (`game/manager/`):** tudo o que acontece fora da partida e que a especificação ELITE MANAGER pede
(estatísticas, mercado, contratos, estádio, finanças, notícias, moral, árbitros, técnicos da CPU, mundo vivo).
Determinística (seed + dados + decisões do jogador) e sem nenhuma regra de partida: o engine recebe os mesmos elencos e
as mesmas seeds; só o público de cada jogo é calculado aqui (o engine apenas o guarda). `planManagedRound` e
`finishManagedRound` envolvem `planRound`/`finishRound`; `startManagedSeason` envolve `startNextSeason`.
O estado vive em `CareerState.manager` (campo opcional; save antigo recebe os padrões em `ensureManager`).

## Responsabilidades

| Camada | Faz | Não faz |
|---|---|---|
| `engine/` | Simula minutos, sorteia eventos, valida times e comandos, abre decisões, aplica a política da CPU, calcula tabela, acesso/rebaixamento e finanças. | Não sabe de telas, velocidade, armazenamento ou do clube "do jogador" além do `controlledClubId`. |
| `game/` | Carreira entre rodadas (aplicar resultados uma vez, lesões, suspensões, finanças, virada de temporada), sessão da rodada (ritmo, pausas, fila de decisões), consultas, edição de escalação. | Não desenha nada e não muda regras de partida. |
| `app/` | Mostra o estado, coleta escolhas, chama o controlador, salva e carrega. | Não decide resultado nem valida regras: quem valida é o engine. |
| `data/` | Universos de dados: modelos, normalização, validação, importação JSON, conversão para `World`, registro de universos. | Não simula nada, não acessa a internet em runtime e não muda o engine. |

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
  `dist/app/index.html` com CSS e JavaScript embutidos. As imagens da marca também vão embutidas (data: URI): a logo
  oficial `docs/brand/elite-manager-logo-referencia.png`, uma vez, no token `--brand-logo` do CSS, e o favicon e o
  ícone de atalho de `app/assets/`. O jogo continua um arquivo único que funciona offline.
- Por isso o código do app usa apenas imports relativos e sintaxe TypeScript "apagável" (sem `enum`, `namespace`
  ou parameter properties; `import type` para tipos).
- O HTML resultante é estático e autocontido: funciona aberto direto (`file://`) ou servido por qualquer servidor
  de arquivos. Não faz chamadas de rede.
- Testes e scripts de balanceamento não entram no build.

## ELITE MANAGER: telas e fluxo

* Telas (`Screen`): ENTRY, MODE, START, TEAM, MATCH, LEAGUE, MARKET, CLUBS, NEWS, CALENDAR, STADIUM, FINANCE, CAREER.
  Sem clube, TEAM/MARKET/STADIUM/FINANCE ficam bloqueadas.
* Navegação: barra de baixo no celular com MEU TIME, PARTIDA, CAMPEONATO, MERCADO e **MAIS** (as outras seis numa folha);
  coluna lateral com as 10 telas no computador.
* Pop-ups (um por vez, nesta ordem): decisão do engine → parada da sessão (intervalo/lance) → proposta → perfil do jogador.
  A animação de entrada roda só no primeiro desenho (a tela é redesenhada a cada minuto de jogo).
* Ações de gestão passam por `GameController.act`: recusadas durante a rodada, salvas logo depois.
* Persistência: mesma chave de save (`fm-brasileiro:carreira:v1`, versão 1). Chaves novas só de preferência:
  `elite-manager:perfil-local` (perfil local), `elite-manager:som` (som da torcida), `sessionStorage`
  `elite-manager:splash-visto` (splash longo só na 1ª abertura da sessão).
