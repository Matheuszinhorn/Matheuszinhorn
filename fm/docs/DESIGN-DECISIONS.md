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
