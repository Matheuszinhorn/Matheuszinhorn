# Playtest 13A — protocolo com pessoas reais

Protocolo para testar o **ELITE MANAGER 1.0.0-rc.1** (codinome FM Brasileiro) (Engine 0.2.0) com jogadores humanos, antes de qualquer nova
mudança de código. O objetivo é confirmar ou descartar, com evidência humana, o que o playtest simulado
([reports/playtest-01.md](../reports/playtest-01.md)) apontou, e descobrir o que ele não conseguiu medir.

## 1. Objetivo do teste

1. Ver se uma pessoa sem explicação prévia consegue iniciar, jogar e entender o jogo.
2. Confirmar ou descartar os achados do playtest simulado, em especial:
   - **P1 (corrigido na auditoria de release):** depois de NOVA CARREIRA, a primeira rodada da carreira nova ficava
     presa em "Preparando a rodada…"; confirmar que não acontece mais;
   - **P2:** a força exibida não explica os resultados; o dinheiro só cai e o jogador não tem ação sobre ele;
   - dúvidas sobre substituições, cartões, pênaltis e goleiro improvisado;
   - interesse espontâneo em reforçar o time (mercado).
3. Medir o que só uma pessoa pode dizer: entendimento do objetivo, motivação, vontade de jogar "só mais uma rodada" e
   expectativa de elencos reais.

Este é um teste de **coleta de evidências**: nada é corrigido durante ele.

## 2. Perfil dos participantes

| Perfil | Quem | Mínimo |
|---|---|---|
| Casual | Joga pouco ou só no celular; não acompanha jogos de manager | 1 |
| Conhece futebol | Acompanha futebol, mas não joga jogos de gerenciamento | 1 |
| Não conhece Elifoot | Nunca jogou Elifoot nem jogos parecidos | 1 (pode coincidir com os anteriores) |
| Conhece manager (se possível) | Já jogou Elifoot, Brasfoot, Football Manager ou parecido | 1 |

Recomendação: **5 participantes** (pelo menos 1 de cada perfil), com pelo menos 2 jogando no celular e 2 no desktop.

## 3. Ambiente recomendado

| Dispositivo | Tela | Navegador |
|---|---|---|
| Desktop | 1280 px de largura ou mais | Chrome, Edge ou Firefox atualizado |
| Celular | ~390 px de largura (ex.: iPhone 12–15, Pixel 6–8) | Navegador padrão do aparelho |

- Abrir o build do RC: `fm/dist/app/index.html`, servido por HTTP (ver [RELEASE.md](RELEASE.md#executar-localmente)) ou
  hospedado num endereço temporário. Para celular, o endereço precisa ser acessível pela rede do aparelho.
- **Começar sem save:** aba anônima, ou limpar os dados do site antes de cada participante.
- Gravar a tela (com permissão do participante) e, se possível, a voz (pensar em voz alta).

## 4. Tempo por sessão

**10 a 20 minutos** de jogo, mais 5 minutos de perguntas. Encerrar aos 20 minutos mesmo no meio de uma rodada.

## 5. Instruções ao participante

Ler exatamente isto:

> "Este é um jogo de gerenciamento de futebol em teste. Jogue como quiser, do jeito que achar natural.
> Se puder, fale em voz alta o que está pensando. Não existe resposta certa: estamos testando o jogo, não você.
> Eu não vou explicar nada durante o teste; no final faço algumas perguntas."

Regras para quem conduz:
- **Não explicar as regras antes.** Deixar a pessoa descobrir.
- **Observar sem conduzir.** Não apontar botões e não dizer "agora clique em…".
- Se a pessoa travar por mais de **2 minutos**, perguntar apenas "o que você está tentando fazer?". Ajudar só se ela pedir,
  e registrar a ajuda.
- Anotar falas espontâneas **literalmente**, entre aspas.

## 6. Tarefas

Não ler as tarefas para o participante. Elas servem para o observador marcar o que aconteceu naturalmente. Se ao fim dos
20 minutos uma tarefa não aconteceu, pedir só as de A a I que faltarem, de forma neutra ("tente mudar a formação do time").

| # | Tarefa | O que observar |
|---|---|---|
| A | Iniciar nova carreira | Achou o campo de nome e as propostas? Como escolheu o clube? |
| B | Jogar algumas rodadas | Achou JOGAR RODADA? Mudou a velocidade? Acompanhou a partida? |
| C | Acessar MEU TIME | Encontrou sozinho? Por qual caminho? |
| D | Alterar formação | Entendeu as opções? Descobriu a troca por toque no campo? |
| E | Alterar estilo/comportamento | Mudou? Antes ou durante a partida? Esperava qual efeito? |
| F | Fazer substituição quando possível | Usou o pop-up MEU TIME na partida ou o de lesão/expulsão? |
| G | Observar uma decisão durante a partida | Percebeu a pausa? Entendeu o pop-up? Entendeu o resultado da escolha? |
| H | Avançar algumas rodadas | Seguiu sozinho? Em que momento parou ou desacelerou? |
| I | Tentar entender a classificação | Achou CAMPEONATO? Entendeu a zona de acesso? |
| J | Explicar a força do time | Com as próprias palavras (pergunta pós-teste) |
| K | Explicar como funciona o dinheiro | Com as próprias palavras (pergunta pós-teste) |
| L | Explicar o objetivo da temporada | Com as próprias palavras (pergunta pós-teste) |

Tarefa extra, só se sobrar tempo e **ao final**: pedir "comece uma carreira nova" (CARREIRA → NOVA CARREIRA) e jogar uma
rodada, **sem recarregar a página**. Serve para confirmar a correção do P1.

## 7. Perguntas pós-teste

Fazer nesta ordem, sem sugerir respostas:

1. O que você acha que é o objetivo do jogo?
2. O que significa a força do time?
3. O que você faria para melhorar seu time?
4. O que significa o dinheiro?
5. Você entendeu por que ganhou ou perdeu?
6. O que você procurou e não encontrou?
7. Em algum momento ficou sem saber o que fazer?
8. O que faria você jogar mais uma rodada?

## 8. Critérios de observação

Cada anotação recebe **um** destes tipos:

| Tipo | Quando usar | Exemplo |
|---|---|---|
| Erro funcional | O jogo não fez o que deveria | Rodada parada sem botões |
| Dúvida de compreensão | A pessoa não entendeu algo que está na tela | "Força 24 é bom?" |
| Problema visual | Texto cortado, sobreposto, ilegível, fora da tela | Nomes sobrepostos no campo |
| Informação ausente | A pessoa precisou de algo que o jogo não mostra | "Quem está no gol agora?" |
| Comportamento inesperado | O jogo fez algo diferente do que a pessoa esperava | CONTINUAR do pop-up não retomou a partida |
| Desejo espontâneo | A pessoa pediu algo que não existe, sem ser perguntada | "Queria contratar um atacante" |

## 9. Como classificar as evidências

Depois da sessão, cada anotação vira **uma** destas categorias:

| Categoria | Critério |
|---|---|
| **BUG confirmado** | Erro funcional reproduzido pelo observador com os mesmos passos. |
| **Problema de UX confirmado** | A mesma dificuldade aparece em **2 ou mais** participantes, ou impede um participante de concluir uma tarefa de A a I. |
| **Dúvida individual** | Aparece em 1 participante e não impede de continuar. |
| **Sugestão** | Ideia de melhoria dita pelo participante ou pelo observador. |
| **Opinião do participante** | Gosto pessoal ("achei lento", "não gostei do azul"), sem dificuldade observada. |

## 10. Ficha de registro

Uma linha por participante. Para as colunas sim/não, usar **S**, **N** ou **P** (parcial), com uma nota curta se for P.

| Participante | Perfil | Dispositivo | Tempo de sessão | Chegou a iniciar carreira? | Jogou quantas rodadas? | Encontrou MEU TIME? | Alterou formação? | Entendeu força? | Entendeu dinheiro? | Entendeu objetivo? | Encontrou algum bug? | Principais dúvidas | Principais frustrações | Funcionalidade desejada espontaneamente | Comentário final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| P2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| P3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| P4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| P5 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

Registro de ocorrências (uma linha por anotação):

| Participante | Minuto da sessão | Tela | O que aconteceu (fala literal entre aspas) | Tipo (seção 8) | Categoria (seção 9) |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Os resultados vão para `reports/playtest-13a.md`, com a ficha preenchida, o registro de ocorrências e um resumo por
categoria.

## 11. Instrumentação

**Situação atual (verificada no código):**
- O jogo não registra nenhum evento de uso: não há logs, analytics ou telemetria.
- `app/src/main.ts` expõe o controlador como `globalThis.__fm`, um gancho de inspeção usado pelos scripts de QA. Ele não é usado pelo jogo.
- A carreira inteira fica salva em `localStorage['fm-brasileiro:carreira:v1']`.

**Uso seguro sem mudar código (desktop, ao fim da sessão):** no console das ferramentas de desenvolvedor do navegador,
`copy(localStorage.getItem('fm-brasileiro:carreira:v1'))` copia a carreira completa (rodadas, resultados, finanças,
escalação) para anexar ao relatório. No celular isso exige depuração remota; ali a evidência principal é a gravação de
tela e as anotações.

**Proposta — não implementada; depende de autorização:**
- Registro local e opcional, ativado só por `?playtest=1` na URL.
- Um ouvinte em `app/src/main.ts`, via `ctrl.subscribe`, anotaria em `localStorage['fm-brasileiro:playtest-log']` (limitado a ~2.000 entradas):
  - mudanças de tela, de fase (antes, ao vivo, depois) e de velocidade;
  - decisão aberta e resolvida (tipo, minuto, se aceitou a sugestão);
  - início e fim de rodada, nova carreira, recarregar e continuar.
- Um botão "EXPORTAR LOG", visível só com o parâmetro, baixaria o JSON pelo navegador.
- Sem rede, sem serviço externo, sem dependência nova, sem efeito no jogo. O engine e o `game/` não seriam tocados, e o
  registro seria só leitura do estado.
- Custo estimado: ~60 linhas em `app/`, mais um teste do controlador e a regressão completa (typecheck, suíte, build, QAs).

## 12. Checklist técnico antes do teste

Executado em 01/10/2026, no commit `b9fbe1b`:

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm test` | 158/158 |
| `npm run build` | OK; `dist/app/index.html` igual ao versionado, sha256 `2c09004217685fdb414a5f1c58cf4c095d055a20288de9cafbe9a063ffd73de2` |
| Versão (`package.json`) | 1.0.0-rc.1 |
| Engine (`engine/config.ts`) | `engineVersion: '0.2.0'` |
| `engine/` alterado | Não (0 linhas desde a importação do projeto) |
| `engine/`, `game/`, `app/` alterados desde o commit da documentação | Não (0 linhas) |

**Identidade na tela:** o jogo abre com a splash da logo oficial e usa o nome ELITE MANAGER e a paleta oficial
(`#071522` / `#B3FA46` / `#F2F4ED`), aplicados na V1 ([BRAND.md](BRAND.md)).

**P1 corrigido no build do teste** (sha256 `089164b0…`): NOVA CARREIRA sem recarregar a página deixava a primeira
rodada presa. Se ainda acontecer, registrar como erro funcional (regressão), anotar se a pessoa tentou recarregar, e
só então orientar: "recarregue a página e toque em CONTINUAR CARREIRA". Registrar essa ajuda.

## 13. Evidências para aprovar a Etapa 14

A Etapa 14 (correções de UX) só deve começar com:

1. Pelo menos **5 sessões** completas registradas, cobrindo os 4 perfis, com pelo menos 2 no celular e 2 no desktop.
2. A ficha da seção 10 preenchida para todos e o registro de ocorrências classificado (seções 8 e 9).
3. Para cada item proposto para a Etapa 14: a categoria **BUG confirmado** ou **Problema de UX confirmado**, com
   participantes e falas literais como evidência.
4. A correção do P1 confirmada por pelo menos um observador seguindo os passos da tarefa extra.
5. Os P2 (força e dinheiro) avaliados pelas respostas às perguntas 2, 4 e 5: quantos participantes explicaram
   corretamente com as próprias palavras.
6. Os desejos espontâneos (mercado, elencos reais e outros) contados por participante, separados de opiniões.
7. Nenhuma mudança de engine proposta com base só em percepção ("perco demais"): precisa de evidência concreta de
   comportamento incorreto.
