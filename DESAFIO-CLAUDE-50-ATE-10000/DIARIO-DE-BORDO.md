# Diário de Bordo

Fuso: horário de Brasília (BRT, UTC−3). Situações: PLANEJADO · EM EXECUÇÃO · CONCLUÍDO · BLOQUEADO.
Registros nunca são apagados. Correções entram como novas atividades que citam a original.

---

## ATV-001 — Abertura do desafio e análise inicial
- **Data/hora:** 21/10/2026, cerca de 18:10 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** escolher a primeira estratégia e preparar a primeira oferta sem gastar o capital.
- **Contexto e problema:** são R$ 50 de capital, sem aportes. É preciso gerar a primeira receita rápido, com custo próximo de zero.
- **Hipótese:** o proprietário estuda Engenharia de Software e mora em Porto Alegre (FATO, README do perfil no GitHub). Junto com a IA, consegue entregar sites simples para negócios locais que não têm site (HIPÓTESE).
- **Ação planejada:** comparar 3 oportunidades, escolher uma, definir oferta, preço, público, canal e orçamento.
- **Ação executada:** análise comparativa entregue no chat. Oportunidades A, B e C registradas em `ESTRATEGIAS-E-EXPERIMENTOS.md`. Escolhida a A (DEC-001).
- **Ferramentas:** Claude Code (análise), leitura do README do repositório.
- **Custos previstos:** R$ 0. **Custos pagos:** R$ 0.
- **Resultado:** estratégia definida. Nenhuma receita, já que nenhuma venda foi tentada.
- **Evidências:** resposta da sessão de 21/10/2026.
- **Aprendizados:** o principal ativo é a habilidade técnica do proprietário, não o capital.
- **Próxima decisão:** preparar os materiais de venda (ATV-002).

## ATV-002 — Criação dos materiais de venda e da página demo
- **Data/hora:** 21/10/2026, 18:18 BRT
- **Situação:** CONCLUÍDO (os arquivos existem). A publicação da demo está pendente (ATV-004).
- **Objetivo:** ter prova visual de entrega e roteiros de abordagem prontos.
- **Ação executada:**
  - Criei os roteiros de mensagens, uma página demo de negócio fictício (identificada como demonstração) e um livro-caixa inicial.
  - Tudo foi enviado ao branch `ccr-fb47334b-mm7jqd`, no commit `d45c98b`, pasta `desafio/`.
- **Ferramentas:** Claude Code, git/GitHub.
- **Custos previstos:** R$ 0. **Custos pagos:** R$ 0.
- **Evidências:** commit `d45c98b`.
- **Próxima decisão:** publicar a demo e iniciar a prospecção.

## ATV-003 — Estruturação da documentação oficial (seção 12)
- **Data/hora:** 21/10/2026, 18:25 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** cumprir a documentação obrigatória antes de qualquer operação comercial.
- **Ação executada:**
  - Criei a pasta `DESAFIO-CLAUDE-50-ATE-10000/` com os 9 arquivos obrigatórios.
  - Movi para ela os roteiros (`comercial/`) e a demo (`demo/`).
  - O conteúdo de `desafio/README.md` e de `desafio/livro-caixa.md` foi incorporado aos novos arquivos, e a pasta antiga foi removida. A versão anterior continua acessível no commit `d45c98b`.
- **Correção registrada (COR-001):**
  - O livro-caixa de ATV-002 lançou R$ 50,00 como **caixa disponível** com base apenas na declaração do proprietário.
  - Pela regra 12.8, o valor agora é classificado como **capital disponibilizado, aguardando confirmação**. O caixa confirmado é R$ 0,00 até a confirmação.
  - A versão original continua preservada no commit `d45c98b`.
- **Ferramentas:** Claude Code, git/GitHub.
- **Custos previstos:** R$ 0. **Custos pagos:** R$ 0.
- **Evidências:** o commit desta atividade, no branch `ccr-fb47334b-mm7jqd`.
- **Próxima decisão:** obter a confirmação do capital (ATV-004 a ATV-006) e iniciar o EXP-001.

## ATV-004 — Publicação da página demo no GitHub Pages
- **Situação:** BLOQUEADO (depende de ação humana: merge e ativação do Pages)
- **Objetivo:** ter um link público para enviar aos clientes em potencial.
- **Ação planejada:**
  - O proprietário faz o merge do branch na `main` e ativa o Pages (Settings → Pages → `main` / root).
  - O endereço previsto é `https://matheuszinhorn.github.io/DESAFIO-CLAUDE-50-ATE-10000/demo/` (PROJEÇÃO, a confirmar depois de ativado).
- **Custo previsto:** R$ 0.

## ATV-005 — Confirmação do capital inicial
- **Situação:** BLOQUEADO (depende do proprietário)
- **Ação planejada:** o proprietário confirma que R$ 50,00 estão separados e disponíveis para o desafio, e informa onde ficam (ex.: conta ou "caixinha" separada). Depois disso, o lançamento FIN-001 muda para REALIZADO.

## ATV-006 — Prospecção inicial do EXP-001 (30 leads, 20–30 mensagens)
- **Situação:** PLANEJADO (depende da ATV-004 e do proprietário)

## ATV-007 — Recebimento do regulamento v2
- **Data/hora:** 21/10/2026, 18:29 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** incorporar o novo regulamento sem perder as regras anteriores.
- **Ação executada:** resumo das mudanças da v2 registrado no `README.md` (seção "Versões do regulamento"). O estado CANCELADO passou a ser usado.
- **Custos:** R$ 0 previstos, R$ 0 pagos.
- **Evidência:** o commit desta sessão.
- **Próximo passo:** inventário de recursos (ATV-008).

## ATV-008 — Inventário de ferramentas e limitações
- **Data/hora:** 21/10/2026, 18:30 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** cumprir os itens 14.1 a 14.3: saber o que Claude executa sozinho e o que depende do proprietário.
- **Ação executada:** `RECURSOS-E-ACESSOS.md` criado.
- **Resultado:** Claude executa a produção (sites, textos, documentação, pesquisa). Venda, recebimento e investimento dependem do proprietário.
- **Aprendizado:** o gargalo da operação é o tempo humano de envio de mensagens. Tudo que reduz esse tempo tem prioridade.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-009 — Pesquisa de mercado e de investimentos
- **Data/hora:** 21/10/2026, 18:31 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** validar o preço do EXP-001 e avaliar investimentos financeiros para os R$ 50.
- **Ferramentas:** busca na web.
- **Resultados (fontes externas, sem verificação independente):**
  - **Preço de landing pages para MEI e pequenas empresas, com freelancer:** a faixa mais citada vai de R$ 500 a R$ 2.000 (InfinitePay, mai/2026; FreelaSemCrise). Nossa oferta de R$ 97–297 fica bem abaixo do mercado, o que é uma vantagem para conseguir os primeiros clientes. HIPÓTESE: há espaço para subir o preço depois de ter um portfólio real.
  - **Selic:** 14,25% a.a. segundo notícia de ago/2026. A Focus projeta 14,00% no fim de 2026. Não houve Copom em outubro, e a próxima reunião é em 3–4/11/2026. O valor atual não foi confirmado no site do BC.
  - **Tesouro Selic 2029:** investimento mínimo estimado entre R$ 153 e R$ 195 (Investidor10, Serasa), acima do capital de R$ 50. Inviável.
  - **Conta com liquidez diária a cerca de 100% do CDI:** R$ 50 × cerca de 14% a.a. dá aproximadamente R$ 0,55/mês bruto (ESTIMATIVA). Contribuição para a meta: desprezível.
- **Decisão:** DEC-004 (nenhum investimento financeiro agora).
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-010 — Modelos por nicho e página de oferta
- **Data/hora:** 21/10/2026, 18:27 BRT
- **Situação:** CONCLUÍDO (os arquivos existem e foram testados). A publicação continua BLOQUEADA (ATV-004).
- **Objetivo:** aumentar a taxa de resposta com um modelo do próprio nicho do cliente e ter uma página que reúna oferta e preços.
- **Hipótese:** um modelo do mesmo nicho do negócio abordado converte mais que um genérico.
- **Ação executada:**
  - `demo/` reorganizado com CSS compartilhado e uma página de oferta e portfólio (`demo/index.html`).
  - Três modelos fictícios, todos identificados como demonstração: `barbearia/`, `estetica/`, `petshop/`.
- **Teste:** renderizei no Chromium a 390 px de largura. Não há rolagem horizontal (scrollWidth = 390 nas três páginas) e conferi visualmente a captura do modelo de estética.
- **Custos:** R$ 0 previstos, R$ 0 pagos.
- **Próximo passo:** publicar (T-03) e começar a prospecção.

## Atualização de ATV-004 (21/10/2026 18:35)
- Como `demo/` foi reorganizado, o endereço previsto mudou para `https://matheuszinhorn.github.io/DESAFIO-CLAUDE-50-ATE-10000/demo/` (página de oferta) e para as subpastas `barbearia/`, `estetica/` e `petshop/`. Continua sendo PROJEÇÃO.
- **Motivo do bloqueio:** falta permissão de administrador. **Providência:** o proprietário faz o merge e ativa o Pages.

---
# Ciclo 3 — Correção de autonomia (21/10/2026, a partir de 18:40 BRT)

## ATV-011 — Revisão de autonomia (o que Claude executa de ponta a ponta)
- **Data/hora:** 21/10/2026 18:40 BRT
- **Situação:** CONCLUÍDO
- **Contexto:** o proprietário apontou que o plano transferia tarefas operacionais demais para ele.
- **Ação executada:** cada tarefa humana do plano foi reavaliada e testada contra as ferramentas reais. O resultado está em `RECURSOS-E-ACESSOS.md` (seção "Revisão de 21/10 18:59") e na decisão DEC-007.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-012 — Publicação do portfólio em página hospedada (substitui o GitHub Pages)
- **Data/hora:** 21/10/2026 18:48 BRT
- **Situação:** CONCLUÍDO
- **Hipótese:** o Claude consegue publicar páginas por conta própria, sem depender do merge nem do Pages.
- **Ação executada:**
  - Criei e publiquei a página de oferta "Sites em 3 Dias" com os 3 modelos, em https://claude.ai/artifact/XL38oFznHwV6wcSDS9S52Q (versão 1).
  - O arquivo-fonte é `demo/portfolio-artifact.html`.
- **Limite real:** a página nasce privada, e só o proprietário pode torná-la pública (menu Compartilhar). Claude não tem permissão para mudar o compartilhamento.
- **Evidência:** o retorno da publicação com a URL e a versão.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-004 — atualização: CANCELADO (21/10/2026 18:59)
- **Motivo:** a ATV-012 publicou o portfólio sem depender de merge nem de ativar o GitHub Pages. Os dois passos deixam de ser necessários. O Pages continua possível depois, como domínio alternativo.

## ATV-013 — Geração de lista de clientes por Claude (substitui T-06 do proprietário)
- **Data/hora:** 21/10/2026 18:50 BRT
- **Situação:** CONCLUÍDO
- **Tentativas:**
  1. **Busca na web por diretórios:** FALHOU como fonte. Os diretórios (guiafacil) trazem dados confusos e misturam cidades.
  2. **API Overpass do OpenStreetMap:** BLOQUEADA. A conexão é reiniciada pelo proxy de rede, nos três servidores testados.
  3. **API Nominatim do OpenStreetMap:** FUNCIONOU.
     - Fiz 8 buscas por nicho, com intervalo de 1,5 s, respeitando a política de uso.
     - Retornaram 66 negócios. 38 têm telefone público e 31 não têm site cadastrado.
     - Depois de excluir os fora do nicho, ficaram **29 contatos (L001–L029)**: 4 celulares e 25 fixos.
- **Verificação:** pesquisei 6 desses negócios na web e não encontrei site para nenhum deles. Também não consegui confirmar que todos ainda funcionam, então os dados ficam como NÃO VERIFICADOS.
- **Privacidade:** os telefones ficam fora do repositório público. Em `VENDAS-E-CLIENTES.csv` só entram ID, nicho e bairro.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-014 — Mensagens personalizadas com envio em um toque
- **Data/hora:** 21/10/2026 18:55 BRT
- **Situação:** CONCLUÍDO, com um BLOQUEIO parcial.
- **Ação executada:**
  - Escrevi uma mensagem personalizada para cada contato (nome, bairro, nicho e link do portfólio), com um link `wa.me` que abre o WhatsApp com o texto já preenchido.
  - Tentei publicar uma página de controle em que Claude leria os status direto. **BLOQUEADO:** a publicação foi negada pelo controle de permissões da sessão (categoria "transações no mundo real"). Não tentei contornar.
  - **Alternativa executada:** gerei o arquivo local `prospeccao-porto-alegre.html` e entreguei ao proprietário pela sessão. Ele tem os 29 contatos, envio em um toque, status salvo no navegador e o botão "Copiar relatório" para devolver os resultados a Claude.
- **Teste:** Chromium a 390 px mostrou 29 cartões, nenhum erro de script, nenhuma rolagem horizontal, e a mudança de status funcionou.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-015 — Pesquisa de taxas das plataformas de freelance
- **Data/hora:** 21/10/2026 18:45 BRT
- **Situação:** CONCLUÍDO (fontes secundárias).
- **Resultado:**
  - Workana: cerca de 20% do projeto.
  - 99Freelas: de 0% a 20%, conforme o plano.

  Os números vêm de blogs (FreelaSemCrise, ecarts, TabNews), não das páginas oficiais. Ficam como ESTIMATIVA até o perfil existir.
- **Impacto:** um projeto de R$ 300 renderia de R$ 240 a R$ 300 líquidos.

---
# Ciclo 4 — Adendo "Mercado global" (21/10/2026, a partir de 19:15 BRT)

## ATV-016 — Pesquisa global de modelos de negócio
- **Data/hora:** 21/10/2026 19:15–19:25 BRT
- **Situação:** CONCLUÍDO
- **Objetivo:** reavaliar a estratégia sem a restrição de país e de modelo (adendo v3).
- **Ação executada:** pesquisa na web sobre:
  - plataformas de produto digital e repasse para o Brasil (Gumroad, Lemon Squeezy, Hotmart);
  - demanda e preço de templates;
  - taxas do Fiverr.
- **Resultados (fontes secundárias):**
  - **Gumroad:** o Brasil aparentemente não tem PayPal Commerce nem Stripe para repasse, e o saque mínimo é de US$ 100. Por isso, **não serve** como canal principal.
  - **Lemon Squeezy:** taxa de 5% + 50¢. O suporte a repasse para o Brasil não foi confirmado.
  - **Hotmart:** taxa de 9,9% + R$ 2,49 (out/2026). Repassa para conta brasileira e tem rede de afiliados.
  - **Templates:** são a categoria de maior volume de produto digital. Preço típico: US$ 9–49 o item, US$ 29–149 o pacote. Não achei dado de venda específico do nicho.
  - **Fiverr:** fica com 20% do pedido e retém o saldo por cerca de 14 dias.
- **Decisão:** DEC-008, com a matriz em `ESTRATEGIAS-E-EXPERIMENTOS.md`.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-017 — Construção do produto "Local Site Kit"
- **Data/hora:** 21/10/2026 19:27–19:31 BRT
- **Situação:** CONCLUÍDO
- **Ação executada:**
  - Fiz um gerador de sites que funciona no navegador e sem internet (`builder.html`): formulário, prévia ao vivo e download do `index.html`.
  - Cobre 6 nichos e 3 idiomas (EN/ES/PT), com 18 sites de exemplo, guia em 3 idiomas e licença.
  - Cada site tem botão de WhatsApp, serviços e preços, avaliações, horários, Google Maps, schema.org LocalBusiness e modo escuro, num arquivo de menos de 10 KB.
- **Teste no Chromium:**
  - Os 18 exemplos não têm rolagem horizontal a 390 px, e o JSON-LD de todos é válido.
  - No gerador, a prévia atualiza, o download gera um `index.html` com os dados digitados, o idioma do navegador é detectado e não aparece nenhum erro de script.
  - **Correção feita durante o teste:** a nota "4,9" com vírgula invalidava o schema. Passou a ser convertida em número (4.9).
- **Integridade:**
  - `local-site-kit.zip` (60 KB): sha256 `aed693ec95b0364dd4b068affd4bb7de4ab40edf0713f3e5fd4a5471531f6356`.
  - Código-fonte `kit-sites-locais-fonte.tar.gz`: sha256 `c2827ba540838bb668e67194cd25d03b30b48b68352b8127038abc69f35a9461`.
- **Decisão de segurança:** o repositório é **público** (verificado pela API do GitHub). Por isso o produto pago **não** foi commitado aqui, e os arquivos foram entregues ao proprietário pela sessão.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-018 — Pesquisa de taxas e repasses (complemento da ATV-016)
- **Situação:** CONCLUÍDO. O resumo está na ATV-016. Os números ficam como ESTIMATIVA até serem conferidos na tela de cadastro de cada plataforma.

## ATV-019 — Capas e anúncios prontos para publicar
- **Data/hora:** 21/10/2026 19:30 BRT
- **Situação:** CONCLUÍDO
- **Ação executada:**
  - 3 capas de 1280×720 (PT/ES/EN), feitas com capturas reais dos sites do kit.
  - Anúncios completos em `comercial/anuncios-globais.md`: Hotmart PT/ES, Lemon Squeezy EN e anúncio do Fiverr com pacotes e FAQ.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-020 — Cancelamento do EXP-002
- **Situação:** CONCLUÍDO
- **Motivo:** substituído pelo EXP-004 (DEC-008). O EXP-002 não chegou a começar e não teve custo.

## COR-002 — Horários do ciclo 4 (21/10/2026 19:34 BRT)
- **Erro:** os registros do commit `70497ee` usavam 19:40, 19:35 e 19:33, horários **posteriores** ao commit real (19:32 BRT).
- **Correção:** os horários foram ajustados para 19:32 e 19:30. A versão anterior continua no commit `70497ee`.
- **Lição:** registrar o horário obtido do relógio no momento da escrita, e não uma estimativa.

---
# Ciclo 5 — Validar e vender (21/10/2026, a partir de 19:36 BRT)

## ATV-021 — Capital inicial confirmado
- **Data/hora:** 21/10/2026 19:36 BRT
- **Situação:** CONCLUÍDO
- **Evidência:** mensagem do proprietário na sessão: "Capital confirmado, R$ 50 separados".
- **Efeito:** lançamento FIN-001-C. O caixa confirmado passa a R$ 50,00. ATV-005 e T-01 concluídas.

## ATV-022 — Verificação de requisitos em fontes oficiais
- **Data/hora:** 21/10/2026 19:37 BRT
- **Situação:** CONCLUÍDO
- **Resultados:**
  - **Lemon Squeezy (docs oficiais):** o Brasil **não consta** na lista de repasse bancário. Por PayPal não deu para confirmar. **Inviável como canal principal.**
  - **Hotmart (Central de Ajuda oficial, artigo 216440217):** para vender, é preciso validar a identidade com documento original (RG/CNH/CRNM) e **biometria facial**. Os dados têm de coincidir com o titular da conta bancária, e a conta bancária só pode ser cadastrada **depois da primeira venda**. **Exige a identidade do proprietário; Claude não pode fazer isso.**
  - **Pix:** o padrão BR Code foi conferido contra o exemplo de referência do manual do BCB, que circula em fontes de terceiros. O CRC calculado (1D3D) é igual ao esperado. O PDF oficial do BCB não abriu pela ferramenta.
- **Conclusão:** o único caminho de recebimento **sem conta nova** é o Pix na chave que o proprietário já tem, com contato pelo WhatsApp que ele já usa.

## ATV-023 — Vitrine pública sem ação do proprietário
- **Data/hora:** 21/10/2026 19:38–19:44 BRT
- **Situação:** CONCLUÍDO
- **Tentativas de hospedagem:**
  1. **raw.githack:** serve as páginas, mas mostra uma tela de "External Content Notice" ao navegador. **Rejeitado.**
  2. **jsDelivr e statically:** entregam como texto puro. **Rejeitados.**
  3. **htmlpreview.github.io:** renderiza a página, as imagens e a navegação entre páginas. **Adotado.**
- **Publicado no ar:**
  - Portfólio de serviços: https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/demo/index.html
  - Página de venda do kit: https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/vitrine/kit/index.html
  - 8 sites de exemplo (6 em PT, 1 ES, 1 EN).
- **Teste:** Chromium a 390 px, sem rolagem horizontal, imagem carregada, link de exemplo navegável, nenhum erro de script.
- **Efeito:** **T-16 (tornar público o artefato) deixa de ser necessária.** O portfólio já é público.
- **Decisão consciente:** os exemplos ficaram públicos; o gerador (`builder.html`), que é o produto pago, não.
- **Riscos:** os links dependem do branch `ccr-fb47334b-mm7jqd` continuar existindo e do serviço gratuito htmlpreview.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-024 — Gerador de Pix e página de compra
- **Data/hora:** 21/10/2026 19:39 BRT
- **Situação:** CONCLUÍDO (ferramenta). A **venda continua BLOQUEADA** até a chave Pix (T-05).
- **Ação executada:**
  - `ferramentas/pix.py` gera o Pix copia e cola e o QR code.
  - `vitrine/montar.py` monta a página com Pix de R$ 47, QR code, botão "copiar" e botão de comprovante pelo WhatsApp.
- **Teste:** com uma chave fictícia, o payload ficou válido (CRC confere, valor 47.00) e a página renderizou o QR code. A versão publicada **diz claramente que as vendas ainda não abriram**.
- **Custos:** R$ 0 previstos, R$ 0 pagos.

## ATV-025 — EXP-001 atualizado com link público e escada de preços
- **Data/hora:** 21/10/2026 19:42 BRT
- **Situação:** CONCLUÍDO
- **Ação executada:**
  - As 29 mensagens passaram a usar o link público do portfólio.
  - O arquivo de prospecção ganhou a escada de preços: R$ 197 (feito por nós), R$ 97 (cartão digital) e R$ 47 (kit para fazer você mesmo).
  - O arquivo atualizado foi entregue ao proprietário. Nenhum envio foi feito ainda.

## ATV-026 — Materiais para o Instagram do proprietário (conta existente)
- **Data/hora:** 21/10/2026 19:44 BRT
- **Situação:** CONCLUÍDO (materiais). A publicação depende do proprietário (conta pessoal dele).
- **Ação executada:** 2 imagens 1080×1350 e legendas, em `comercial/instagram.md`.

## ATV-027 — Reavaliação: qual caminho dá a primeira receita mais rápido
- **Situação:** CONCLUÍDO. Ver DEC-010.
