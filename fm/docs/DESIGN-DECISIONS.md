# Decisões de design

Decisões já tomadas e em vigor no MVP. Não estão em aberto.

| Tema | Decisão |
|---|---|
| Filosofia | Poucas regras, muitas decisões: simplicidade, velocidade e consequências. Sem dezenas de atributos escondidos. |
| Referência | Simplicidade e ritmo dos clássicos do gênero como conceito; identidade própria, sem copiar código, textos, imagens, áudio ou identidade visual de terceiros. |
| Identidade visual | **ELITE MANAGER** (decisão do proprietário, 01/10/2026, aplicada na V1): logo oficial, azul-marinho `#071522` como estrutura, verde-lima `#B3FA46` só como destaque/ação, off-white `#F2F4ED` para leitura; estética de futebol, moderna e profissional, sem excesso de efeitos. Substitui a decisão anterior (azul/preto/branco, verde recusado). Detalhes em [BRAND.md](BRAND.md). |
| Tela PARTIDA | Formato de "rodada ao vivo": placar, relógio, lances e todos os jogos da rodada; não vira painel genérico de cards. |
| Navegação | Cinco áreas: PARTIDA, MEU TIME, CAMPEONATO, CLUBES (só consulta) e CARREIRA. |
| Identidade dos clubes | Nome e cor; sem escudos ou badges oficiais (por enquanto, iniciais em um círculo). |
| Jogadores | Só nomes, sem fotos. |
| Dados | Clubes, jogadores e estádios fictícios, gerados por seed; licenciamento real fica para o futuro. |
| Carreira | Começa sempre na 4ª divisão; 3 propostas de clubes da 4ª. |
| Formação | Configurável (8 formações) e editável no campo por toque; o campo é desenhado com o gol embaixo e o ataque em cima. |
| Posições | Só quatro setores: goleiro, defesa, meio-campo e ataque. |
| Estilo | Defensivo, Equilibrado, Ofensivo. |
| Comportamento | Normal, Agressivo, Reativo. As consequências pertencem ao engine; a interface não inventa efeitos. |
| Decisões na partida | Pênalti, lesão, expulsão, goleiro e MEU TIME. A decisão do clube do jogador pausa a rodada, um pop-up por vez, e nunca é perdida. A CPU decide pela mesma máquina de estados. |
| Goleiro | Exatamente um goleiro em campo sempre; sem reserva, um jogador de linha vai ao gol (fator 0,30). |
| Batedor | Definido antes da rodada como sugestão; no pênalti o jogador escolhe o cobrador. Não há troca do batedor padrão durante a partida. |
| Velocidades | Cinco (lenta, normal, rápida, muito rápida, instantânea), só na sessão/interface. Não alteram resultado nem RNG. Decisões pausam em todas. |
| Determinismo | Mesma seed + mesmos dados + mesmas decisões = mesmo resultado. RNG por canal e minuto. |
| Engine | Engine 0.2.0 é contrato: só muda com bug estrutural comprovado e nova versão. |
| Replay | Não há replay para o jogador; a reprodução existe só como ferramenta técnica (testes, depuração). |
| IA | Fora do engine de partida; camada futura. |
| Plataforma | Página web estática e responsiva (celular e desktop), TypeScript puro sem framework; Next.js foi descartado porque o ambiente original não tinha rede npm. |
| Persistência | Carreira inteira salva no navegador a cada ponto estável; a rodada em andamento não é salva. |

## ELITE MANAGER (evolução da gestão)

* **Engine fechado.** Toda a gestão mora em `game/manager/`. Assistências, influência do árbitro e faltas dependem do
  engine e estão documentadas em ENGINE.md como dependências, não implementadas.
* **Mundo esportivo da CPU parado durante a temporada.** Evolução, transferências da CPU e renovações só na virada:
  a 1ª temporada joga as mesmas partidas da versão anterior (verificado: 1.520 placares idênticos no QA da temporada).
* **Negociação por regra fixa**, não por IA: mesmo pedido, mesmo estado → mesma resposta (MARKET.md, CONTRACTS.md).
* **Notícias só de fatos reais** (NEWS.md).
* **Perfil local, não login.** Não existe servidor; a tela não finge autenticação; Google explica que depende do online.
* **Sem sorteio de novas propostas.** Três propostas; recusou, aguarda (o mundo joga e propostas chegam).
* **Paradas obrigatórias na sessão**, não no engine: intervalo, pênalti, lesão e expulsão no jogo do treinador.
* **INSTANTÂNEA fora da tela**, mantida no código para testes; quem a tinha salva volta como MUITO RÁPIDA.
* **Cores do clube com moderação**: borda da barra superior, faixa do clube, escudo de iniciais; a marca (marinho, lima,
  off-white) continua sendo a identidade do jogo. Sem escudos oficiais, sem imagens de jogadores.
* **Som original**: ruído filtrado sintetizado no navegador; desligado por padrão; nenhuma narração ou gravação.

## Etapa Força + Economia

* **Força esperada = média real da divisão**, não as referências fixas (regerar o mundo mudaria todos os placares).
* **Evolução em checkpoints (rodada 19 e virada), ±1**: gradual e determinística; a virada roda antes do
  acesso/rebaixamento, para que subir ou cair não mude ninguém na hora.
* **Salário guardado por rodada, mostrado por temporada**: preserva `engine/finance.ts` e os saves.
* **Propostas só por eventos reais**: removido o "preenchimento" que gerava proposta a cada rodada sem clube.
* **Três velocidades na tela**; VERY_FAST/INSTANT ficam só na sessão para testes.
