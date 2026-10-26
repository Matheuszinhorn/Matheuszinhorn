# Decisões e Aprendizados

## DEC-001 — Escolha da estratégia inicial (21/10/2026, ATV-001)
- **Decisão:** começar pelo EXP-001 (sites de uma página para negócios locais).
- **Alternativas consideradas:** B (otimização do perfil no Google) e C (produto digital).
- **Motivos:**
  - Custo zero.
  - Venda possível em dias.
  - Demanda verificável antes do contato.
  - Margem alta e recorrência possível.
  - Usa a habilidade técnica que o proprietário já tem.
- **Por que não a C:** depende de audiência que não existe e tem ciclo de venda longo.
- **Por que a B não vem sozinha:** valor percebido menor. Fica como venda complementar.

## DEC-002 — Não gastar capital antes da validação (21/10/2026)
- **Decisão:** manter os R$ 50 intactos. O único gasto previsto é até R$ 20 em transporte, e só se o canal WhatsApp falhar, com autorização.
- **Motivo:** nenhum gasto atual aumenta a chance de vender, e o capital é a única reserva de sobrevivência.

## DEC-003 — Reclassificar o capital inicial como "a confirmar" (21/10/2026, ATV-003, COR-001)
- **Decisão:** o caixa confirmado fica em R$ 0,00 até o proprietário confirmar que os R$ 50 estão separados.
- **Motivo:** a regra 12.8 exige confirmação antes de classificar o valor como caixa.

## O que funcionou
_Ainda sem dados de mercado._

## O que falhou
_Ainda sem dados de mercado._

## Lições para decisões futuras
1. Registrar como caixa apenas o que tiver confirmação (origem: COR-001).

## DEC-004 — Nenhum investimento financeiro por enquanto (21/10/2026, ATV-009)
- **Decisão:** não aplicar os R$ 50 em ativos financeiros.
- **Alternativas consideradas:**
  - Tesouro Selic: mínimo de cerca de R$ 153–195, acima do capital.
  - Conta com cerca de 100% do CDI: aproximadamente R$ 0,55/mês.
  - Ações e criptomoedas: alta volatilidade, com risco de perder a única reserva.
- **Motivo:** retorno irrelevante para a meta, ou risco incompatível com a sobrevivência. Na prática, o capital é a reserva de emergência da operação.
- **Opcional, sem impacto na estratégia:** se o proprietário quiser, pode deixar os R$ 50 em conta própria com liquidez diária e rendimento de cerca de 100% do CDI. Os rendimentos só serão lançados quando creditados.
- **Revisão:** reavaliar quando o caixa passar de R$ 1.000, para guardar o capital de giro ocioso em renda fixa com liquidez diária.

## DEC-005 — Dois canais em paralelo para a mesma oferta (21/10/2026)
- **Decisão:** EXP-001 (WhatsApp para negócios locais) como canal principal e EXP-002 (plataformas de freelance) como complementar.
- **Motivo:** diversificar o canal sem dispersar o produto. É o mesmo serviço, o mesmo portfólio e o mesmo custo zero.
- **Alternativa descartada:** F (revenda), porque arriscaria todo o capital em estoque.

## DEC-006 — Manter o preço de lançamento abaixo do mercado (21/10/2026)
- **Fato:** o mercado cobra R$ 500–2.000 por landing page de freelancer (ATV-009).
- **Decisão:** manter R$ 197 para os 3 primeiros clientes, em troca de depoimento, e R$ 297 depois disso. O preço do EXP-001 **não muda durante o experimento**.
- **Motivo:** o objetivo agora é ganhar prova social e chegar à primeira receita. O reajuste vai ser avaliado como experimento próprio.

## Lições (acréscimo)
2. A alavanca do desafio é a habilidade com custo zero, não o rendimento do capital (origem: ATV-009).

## DEC-007 — Claude assume a operação; o humano só entra por identidade, finanças ou permissão (21/10/2026 18:59)
- **Decisão:** toda pesquisa, redação, construção, publicação, lista de clientes e acompanhamento fica com Claude. Ao proprietário cabem apenas: tornar a página pública, confirmar o capital e a chave Pix, tocar em enviar e criar contas que exigem documento.
- **Alternativas avaliadas para tirar o humano do envio:**
  - **Criar contas em nome do proprietário pelo navegador headless:** rejeitada (falsidade de identidade, termos de uso).
  - **API do WhatsApp Business:** exige conta verificada e cobra por conversa. Fica para quando houver caixa.
  - **E-mail:** Claude não tem ferramenta de envio.
- **Escolha:** links `wa.me` com texto pronto. O esforço humano cai para cerca de 5 segundos por contato.
- **Erro reconhecido:** nos ciclos 1 e 2, tarefas como montar a lista de clientes e publicar a demo foram atribuídas ao proprietário sem antes testar se Claude conseguia fazê-las.

## Lições (acréscimo)
3. Antes de delegar uma tarefa ao humano, testar se as ferramentas disponíveis resolvem (origem: DEC-007).

## DEC-008 — Um ativo, três canais: o "Local Site Kit" (21/10/2026 19:32, adendo v3)
- **Decisão:** construir um ativo próprio (o gerador de sites) e vendê-lo de três formas:
  - (a) como produto digital global (EXP-003), canal principal de longo prazo;
  - (b) como serviço global no Fiverr em USD (EXP-004);
  - (c) como serviço local no Brasil (EXP-001), que já estava pronto.
- **Alternativas consideradas:**
  - Afiliados e conteúdo: exigem audiência e contas de rede social.
  - Revenda física: consome capital e logística.
  - Micro-SaaS: tem custo fixo; fica adiado até haver lucro.
  - Investimento: retorno irrelevante.
  - Gumroad: o repasse para o Brasil é inviável.
- **Motivos:**
  - É o único modelo em que o esforço humano por venda cai a zero (G3).
  - O mesmo trabalho alimenta os três canais.
  - O custo continua R$ 0.
  - O produto aumenta a velocidade de entrega dos serviços: um site personalizado sai em menos de 1 hora.
- **Riscos:**
  - A demanda pelo produto não está comprovada.
  - Plataformas novas não têm avaliações.
  - Dependência de plataformas (Hotmart, Fiverr).
- **Mitigação:** critérios de abandono fixados antes do início, e nenhum gasto até haver receita.

## DEC-009 — Não publicar produto pago em repositório público (21/10/2026 19:30)
- **Decisão:** o código do kit fica fora do repositório `Matheuszinhorn/Matheuszinhorn`, que é público.
- **Registro de auditoria:** hashes sha256 na ATV-017. Os arquivos foram entregues ao proprietário.

## Lições (acréscimo)
4. Antes de commitar, verificar a visibilidade do repositório: um repositório público distribui o produto de graça (origem: DEC-009).
5. Construir ativos reutilizáveis multiplica canais sem multiplicar trabalho (origem: DEC-008).

## DEC-010 — Ordem de prioridade para a primeira receita (21/10/2026 19:44)
- **Fato:** todo marketplace (Hotmart, Fiverr, Lemon Squeezy) exige identidade, biometria ou repasse que o Brasil não tem (ATV-022). Claude não tem nenhum canal de envio próprio.
- **Análise honesta:**
  - Um produto digital sem audiência e sem marketplace tem tráfego **perto de zero**. A chance de vender o kit nesta semana é baixa.
  - A abordagem direta (EXP-001) tem a maior chance de gerar a primeira receita: 29 contatos qualificados, mensagem personalizada e ticket de R$ 197.
- **Decisão:**
  1. **Primeira receita:** EXP-001. Usa o WhatsApp que o proprietário já tem e não precisa de conta nova.
  2. **Escada de preços na mesma conversa:** R$ 197, R$ 97 e R$ 47 (kit). O kit encontra compradores reais dentro das conversas do EXP-001.
  3. **Kit para o público geral:** Pix direto (taxa zero) na página pública, divulgado no Instagram que o proprietário já tem.
  4. **Hotmart e Fiverr:** ficam como opcionais. Só valem a biometria e o cadastro se o proprietário quiser escala além do Brasil.
- **Recebimento:** Pix na chave existente. Taxa: 0%. A entrega do kit é manual (envio do .zip pelo WhatsApp, cerca de 1 min por venda).
- **Funcionalidades novas:** **congeladas** até haver feedback de comprador, conforme a regra da fase.

## Lições (acréscimo)
6. Testar a hospedagem no navegador real, e não só com curl: o raw.githack respondia 200, mas mostrava uma tela de aviso (origem: ATV-023).
7. Produto sem canal de distribuição não vende. O canal vem antes do produto (origem: DEC-010).

## DEC-011 — Canal único de aquisição nesta fase: WhatsApp do proprietário, com o mínimo de esforço (21/10/2026 19:50)
- **Evidência:** ATV-028 a ATV-031.
- **Decisão:**
  - Não pedir conector novo nem conta nova. O Gmail alcançaria só 3 contatos.
  - Concentrar tudo no envio por WhatsApp, começando pelos **11 celulares** (L001–L004 e os 7 do lote 2), que têm a maior chance de ser WhatsApp ativo.
- **Divisão do trabalho depois do envio:** Claude faz tudo o que vem a seguir — redigir respostas, preparar a prévia personalizada em menos de 1 h, gerar o Pix da entrada e entregar o site. O proprietário só repassa as mensagens.
- **Descartado:** contas criadas por Claude em plataformas (falsidade de identidade e termos de uso), envio automatizado em massa (spam) e compra de listas de contatos (LGPD e spam).

## DEC-012 — Manter o EXP-001 como estratégia, com prioridade para o segmento "site fora do ar" (21/10/2026 23:00)
- **Alternativas investigadas nesta rodada:**
  - Recompensas open source (ATV-032).
  - E-mail para sites fracos (ATV-033).
  - Automação do WhatsApp (ATV-035).
  - Conector Gmail (ATV-035).
  - Contas próprias (ATV-035).
- **Resultado:** nenhum canal gera receita sem uma ação de identidade do proprietário. Os que exigem menos dele são:
  - WhatsApp: cerca de 5 s por mensagem, sem risco.
  - Algora: um PR por tentativa com a identidade dele, KYC e cerca de 15% de aceitação.
- **Decisão:** o EXP-001 continua sendo a estratégia, agora começando pelo lote 3 (dor verificada) e pelos 11 celulares. O EXP-005 fica em espera.
- **O que muda no modelo:** nada no produto. Muda só a **segmentação**: os negócios com site quebrado têm o problema que o serviço resolve, comprovado.

## Lições (acréscimo)
8. A auditoria técnica automática é um gerador de leads qualificados: transforma dados públicos em uma dor verificável e específica (origem: ATV-033/034).

## DEC-013 — Mercados financeiros não são o motor do desafio; o capital continua como reserva (21/10/2026 23:10)

| Estratégia | Chance de chegar a R$ 10 mil (evidência) | Risco de perda | Execução autônoma | Decisão |
|---|---|---|---|---|
| BTC, comprar e segurar | ≈0,01% em 3 anos (ATV-037) | 7–29% de chance de perder ≥ 50% em 3 anos | Não (KYC do proprietário) | Rejeitada |
| Tendência ou quant em BTC | Abaixo de comprar e segurar no backtest (ATV-038) | Igual ou maior | Não | Rejeitada |
| Arbitragem entre corretoras | Negativa: ≈−R$ 8,90 por ciclo (ATV-039) | Certa | Não (duas contas KYC) | Rejeitada |
| Renda fixa | 0% (R$ 74 em 3 anos) | Muito baixo | Não (conta do proprietário) | Só como reserva |
| Recompensas open source | Positiva, mas cerca de 15% de aceitação e mercado saturado (ATV-032) | Reputação do proprietário | Parcial (PR com a identidade dele) | Em espera |
| Produto digital (kit) | Depende de canal; sem tráfego hoje (DEC-010) | Nenhum (R$ 0) | Parcial | Mantido, aguardando a chave Pix |
| Serviço para negócios com site quebrado ou sem site | **A maior entre as opções**: ticket de R$ 197 contra o capital de R$ 50, com dor verificada (ATV-034) | Nenhum financeiro | Parcial (o envio exige o WhatsApp do proprietário) | **Escolhida** |

- **Conclusão:**
  - Para ir de R$ 50 a R$ 10.000 é preciso multiplicar o capital por 200. Nenhum ativo sem alavancagem chega a isso com probabilidade relevante.
  - Alavancagem é proibida e tornaria a ruína o resultado mais provável.
  - A meta só é plausível com **receita de trabalho** (serviço ou produto), e não com rendimento de capital.
- **Capital:** os R$ 50 ficam intactos como reserva. Nenhuma operação financeira foi feita.
- **Limite de exposição** (se um dia houver investimento): no máximo 10% do patrimônio em cripto, só depois do patrimônio acumulado passar de R$ 1.000, e sem alavancagem.

## DEC-014 — Mapa final do que Claude faz sozinho e do que depende de autorização (21/10/2026 23:59)
- **Claude executa sozinho (provado):**
  - produtos (kit testado);
  - páginas públicas (htmlpreview);
  - listas de clientes por dados abertos;
  - auditoria técnica de sites, que revela uma dor verificável;
  - mensagens personalizadas;
  - Pix válido a partir de uma chave;
  - análises quantitativas;
  - documentação.
- **Claude não consegue fazer (provado, com o erro técnico registrado):**
  1. alcançar um comprador: nenhum conector de mensagens, nenhuma conta em comunidade, criação de repositório bloqueada (403);
  2. receber dinheiro: toda forma de recebimento exige uma conta financeira de uma pessoa real.
- **Menor conjunto de autorizações que transforma a operação em autônoma:**
  - **A1:** um repositório público vazio (ou permissão de push na `main` do perfil). Abre um canal de entrada **e** de conversa (Issues) operado 100% por Claude.
  - **A2:** a chave Pix, que só é necessária quando houver um comprador.
  - A WhatsApp continua disponível como alternativa, e não como única saída.
- **Rejeitado de novo:** carteira cripto criada por Claude como meio de recebimento. É tecnicamente possível, mas o comprador local paga por Pix e a guarda da chave privada é um risco. Só faz sentido se um comprador estrangeiro pedir.

## DEC-016 — Portfólio de experimentos com prazo (22/10/2026 00:27)
| Experimento | Exige o proprietário? | Prazo | Situação |
|---|---|---|---|
| EXP-006 Superteam (agente) | Só no resgate de um prêmio ganho | 7 dias para surgir uma vaga | EM EXECUÇÃO |
| Repositório lite (distribuição gratuita e pedidos por Issue) | Liberar o acesso do app (uma vez) | 48 h depois do acesso para a 1ª métrica | BLOQUEADO (ATV-044) |
| EXP-001 Sites (WhatsApp) | Tocar em enviar | — | Alternativa disponível, não é a principal |
| Mercados financeiros | Conta KYC | — | Rejeitado (DEC-013) |
| Outros mercados para agentes (gigs.sh) | Varia | — | Avaliar só se o EXP-006 não tiver vagas em 7 dias |

- **Lição 9:** procurar onde agentes são **aceitos pelas regras da plataforma** abriu um canal que dispensa a identidade do proprietário até o pagamento (origem: ATV-052/053).

## DEC-019 — Encerrar a busca ampla em mercados para agentes (22/10/2026 00:32)
- **Evidência:**
  - AgentHansa está inativo desde junho/2026, com valor esperado de cerca de US$ 0,25 por envio.
  - NEAR, Daydreams, BountyBook e Toku não têm documentação ou tarefas verificáveis.
  - Clustly exige login de uma pessoa.
  - Superteam está ativo, mas hoje tem 0 vagas para agentes.
- **Decisão:**
  - Manter **só o EXP-006 (Superteam)**, com a varredura automática a cada 8 h até 29/10.
  - Não fazer novos cadastros em plataformas sem tarefas verificáveis.
- **Tempo investido nesta rodada:** cerca de 5 min (commit anterior às 00:27, este às 00:32). Receita: R$ 0.
- **Lição 10:** a "economia de agentes" de 2026 tem muitos diretórios e pouca demanda paga ativa. Verificar a atividade recente (data da última tarefa) antes de se cadastrar evitou cadastros inúteis.

## DEC-021 — Vagas humanas com entregável produzido por Claude (22/10/2026 08:27)
- **Mudança de modelo:** em vez de esperar vagas para agentes, Claude produz entregáveis completos para vagas abertas a humanos, que o proprietário envia. Ele fica com cerca de 5 min por envio, e não com a operação.
- **Primeira aplicação:** EXP-007 (US$ 1.500).
- **Regra ética:** só vagas cujo regulamento não proíba IA, sempre com a menção "AI-assisted" no entregável, e nunca vagas que exijam algo que Claude não faz de verdade (entrevistas, presença, contas sociais).
- **Lição 11:** respeitar proteção anti-robô. A primeira captura usou opções de evasão; foi descartada e o app foi trocado.

## DEC-025 — Portfólio de oportunidades por estágio (22/10/2026 09:31)
| Estágio | Oportunidade | Próximo passo | Bloqueio |
|---|---|---|---|
| **Monetização (aguardando envio)** | EXP-007: redesign do Jupiter, US$ 1.500 | Envio pelo proprietário | Identidade (vaga humana), prazo 23/10 15:29 BRT |
| **Execução (pronto para rodar)** | EXP-008: medição de ordenação de transações, US$ 2.500 com 5 prêmios | Rodar na mainnet, analisar, publicar o repositório | Permissão técnica da sessão para transações reais + cerca de 0,02 SOL na carteira |
| **Teste contínuo** | EXP-006: vagas para agentes no Superteam | Varredura automática a cada 8 h | Nenhum (0 vagas até agora) |
| **Pronto, sem canal** | Local Site Kit e repositório lite | — | Acesso do app ao repositório lite |
| **Pronto, sem canal** | EXP-001: sites locais (77 contatos) | — | Envio pelo WhatsApp (identidade) |
| **Encerrado** | Mercados para agentes (AgentHansa, Clustly…), MultiHopper, Breakpoint, investimentos, arbitragem | — | Evidência registrada em cada atividade |

- **Leitura honesta:** o trabalho que Claude faz de ponta a ponta já soma **US$ 4.000 em prêmios disputáveis** (EXP-007 e EXP-008). O que separa isso de dinheiro são dois atos que só o proprietário pode fazer: um envio de cerca de 5 min e a liberação de uma permissão. Procurar mais plataformas agora custaria tempo sem mudar esse gargalo.
- **Lição 12:** com recursos humanos mínimos, o melhor portfólio é o de entregáveis completos que esperam um único ato de identidade, e não o de canais que exigem operação humana contínua.

## COR-005 — A leitura "US$ 4.000 em prêmios disputáveis" da DEC-025 está corrigida (22/10/2026 19:35)
- O EXP-007 e o EXP-008 tinham região restrita (Índia e Ucrânia), então o valor disputável pelo proprietário era US$ 0. Detalhes no DIARIO (COR-005).
- A tabela da DEC-025 fica como estava, por histórico, e esta correção prevalece.

## DEC-026 — Diretriz do proprietário: priorização, preservação e novas oportunidades (22/10/2026 19:35; recebida com o título "DEC-025")
- **Conteúdo:**
  1. Tratar o EXP-007 com urgência e encerrá-lo se houver inelegibilidade.
  2. Preservar o EXP-008 sem gastar.
  3. Manter o EXP-006 em segundo plano.
  4. Ampliar a exploração comercial.
  5. Exigir execução, prazo, custo, hipótese e critério de abandono.
- **Capital:** pode ser usado com justificativa econômica.

## DEC-027 — Encerrar o EXP-007, arquivar o EXP-008 e filtrar por região (22/10/2026 19:35)
| Item | Decisão | Motivo (evidência) |
|---|---|---|
| EXP-007 | **CANCELADO** | `region` = India, e o servidor recusa com `Region not eligible` (ATV-068) |
| EXP-008 | **ARQUIVADO**, sem gasto, com plano reproduzível | `region` = Ukraine. Sem pagador elegível, comprar SOL não tem retorno (ATV-069) |
| EXP-006 | Continua até 29/10, agora com filtro de região | Critério fixado; a varredura funciona (3 execuções registradas) |
| Freelance com proposta pelo proprietário | **Não abrir** | Os projetos lotam em menos de 1 h (31 propostas em ≈ 25 min). Um relé humano chega tarde (ATV-071) |
| Algora | Continua EM ESPERA | Mercado esvaziado rapidamente; sobram resquícios (ATV-071) |

- **Leitura honesta do gargalo:** Claude produz entregáveis completos rápido. Faltam duas coisas, e as duas pertencem ao proprietário: **um meio de receber dinheiro** e **um canal de distribuição** que não dependa dele para cada ação. Nenhuma plataforma nova testada hoje muda isso.
- **Lição 13:** antes de produzir para qualquer vaga, ler as regras de **elegibilidade do pagador** (região, KYC, país de pagamento) direto na fonte oficial. Dois entregáveis bons (EXP-007 e EXP-008) foram feitos para vagas que o proprietário não podia disputar.
- **Lição 14:** em marketplaces abertos, a vantagem do trabalho rápido de Claude se perde se cada proposta passa por um humano. A velocidade de chegada também é um requisito do canal.

## DEC-028 — Diretriz do proprietário: mudança de postura (recebida em 22/10/2026 ≈ 21:00 BRT)
- **Regra nova, permanente:** antes de desenvolver, responder 6 perguntas:
  1. Elegibilidade e regras.
  2. Quem paga e pelo quê.
  3. Como chegar ao comprador.
  4. Como receber legalmente.
  5. Tempo e dinheiro necessários.
  6. Qual é o teste mais barato.
- **Formato de trabalho:** três frentes em paralelo (A, B e C), sinais desde o 1º dia e evidências em 24 h.

## DEC-029 — Cadeia de venda escolhida e o único bloqueio dela (22/10/2026 21:45)

### Pré-teste das opções
| Pergunta | EXP-011: e-mail para negócios com site quebrado | EXP-009: repositório lite | EXP-012: loja de produtos digitais no Etsy |
|---|---|---|---|
| Elegibilidade | Serviço legal no Brasil, prestado por pessoa física | Sem restrição | Brasil elegível via Payoneer (ajuda oficial do Etsy) |
| Quem paga e pelo quê | O dono do negócio, R$ 197 por uma página no ar | Negócio local que quer versão personalizada | Comprador estrangeiro de modelo digital, US$ 3–15 |
| Como chegar | E-mail individual sobre o problema verificado do site | Busca do GitHub/Google (lento, sem controle) | Busca interna do Etsy |
| Como receber | Pix depois da aprovação da prévia | Pix | Etsy → Payoneer → banco |
| Custo e tempo | R$ 0; cerca de 1 h por cliente | R$ 0 | US$ 0,20 por anúncio + taxa de abertura **não confirmada** (≈ US$ 15) |
| Teste mais barato | 4 e-mails já redigidos, medir respostas em 72 h | Publicar e medir visitas | 10 anúncios (US$ 2), medir visualizações e favoritos em 7 dias |
| **Bloqueio** | **Nenhum canal de envio** (sem conector de e-mail) | Acesso do app ao repositório (T-31) | Abertura da loja e da Payoneer (identidade do proprietário) + confirmar a taxa |

### Decisão
1. **EXP-011 é a frente A.** É a cadeia completa mais curta: problema verificado → oferta → e-mail → resposta → prévia → Pix. Precisa de **uma** configuração do proprietário: o conector Gmail em claude.ai (o Microsoft 365 também serve, se ele concluir a conexão já iniciada), com autorização para Claude escrever em nome dele. Depois disso, Claude envia, lê as respostas, produz a prévia e cobra **sem o proprietário abordar ninguém**.
2. **Pix:** pedir agora uma **chave aleatória**, autorizada só para cobranças enviadas em particular a quem aprovar a prévia, nunca publicada. Sem ela, uma venda aprovada fica parada.
3. **EXP-012 (Etsy):** só depois de confirmada a taxa de abertura. Se ela existir e superar o caixa (R$ 50), é **abandonado**, porque aporte novo é proibido.
4. **EXP-009:** continua dependendo da T-31. Não é prioridade.
5. **Frente C:** nenhum modelo passou no pré-teste para gerar receita em menos de 30 dias. Fica registrado na ATV-077, sem construção.
6. **Ampliação da frente A:** a fonte aberta (OSM) rende cerca de 1 lead por capital. Se o EXP-011 mostrar resposta (≥ 1 em 4), a próxima fonte avaliada será a lista pública de domínios `.adv.br` e `.com.br` cujo DNS não resolve: o problema é verificável em massa sem coletar dados pessoais.

- **Lição 15:** a cadeia de venda quebra no elo mais fraco, e hoje esse elo é sempre o canal de contato, nunca o produto. A primeira pergunta de qualquer oportunidade deve ser "por onde a mensagem sai e por onde a resposta volta".

## DEC-030 — Reset estratégico: EXP-013 como frente principal (22/10/2026 22:21; responde à diretriz do proprietário intitulada "DEC-029")
- O proprietário mandou a diretriz com o número DEC-029, que já estava em uso pela decisão de 22/10 21:45. O conteúdo foi registrado sem alteração; esta decisão usa o próximo número livre.
- **Auditoria e comparação:** `analises/AUDITORIA-2026-10-22.md`.
- **Escolha:**
  1. **EXP-013** (prova + oferta para profissionais liberais), principal.
  2. **EXP-014** (uma publicação do proprietário na rede de confiança dele), paralelo e opcional.
  3. **EXP-006** encerra em 29/10.
  4. Upsell de manutenção mensal dentro do EXP-013.
- **Abandonados ou pausados:**
  - EXP-009 com repositório separado (erro: esta pasta pública já servia);
  - EXP-011, substituído pelo EXP-013;
  - EXP-012, Etsy;
  - frente C;
  - micro-SaaS de diagnóstico, que precisa de servidor.
- **Lição 16:** quando um canal parece não funcionar, testar **outra fonte** antes de abandonar. O e-mail parecia inviável pelo OSM (0,7%) e rendeu 55 leads verificados com certificados públicos.
- **Lição 17:** a hipótese mais arriscada nunca foi "consigo construir". Foi "alguém responde e paga". O MVP é a mensagem com prova, não o produto.

## DEC-031 — Tese de produto: P1 "Recebi do Exterior" (22/10/2026 23:56; responde à diretriz do proprietário intitulada "DEC-030")
- A diretriz chegou com o número DEC-030, que já estava em uso. O conteúdo foi registrado sem alteração.
- **Três oportunidades avaliadas:** `analises/TESE-DE-PRODUTO-2026-10-22.md`.
- **Escolhida: P1.** Motivos: confusão pública comprovada sobre a regra, necessidade mensal e recorrente, público online, custo zero e funcionamento sem servidor.
- **Rejeitadas:**
  - **P2:** geradores grátis saturam o mercado.
  - **P3:** exige uma conversa por venda; fica só como entrega do EXP-013.
- **Princípio aplicado:** a menor versão útil resolve a parte confusa (conversão e regra), não a parte arriscada (cálculo do imposto, que o Carnê-Leão Web já faz).
- **Lição 18:** o bloqueio de canal muda o *tipo* de produto que convém testar. Sem canal de saída, priorizar produtos que **se distribuem por busca** e medem intenção por um registro público (Issue), em vez de serviços que dependem de abordagem.

## DEC-032 — Cinco experimentos (23/10/2026 14:16; responde à diretriz do proprietário intitulada "DEC-031")
- A diretriz chegou com o número DEC-031, que já estava em uso. O conteúdo foi registrado sem alteração.

| # | Exigência | Experimento | Público | Canal | Custo máx. | Prazo | Sucesso | Abandono |
|---|---|---|---|---|---|---|---|---|
| 1 | Software | EXP-015 Recebi do Exterior | Quem recebe do exterior como PF | Busca (README) + comunidades | R$ 0 | 14 dias | ≥ 5 pedidos da versão anual | 0 pedidos depois de 2 divulgações |
| 2 | Afiliados | EXP-016 Quanto Chega | Quem envia ou recebe dinheiro do exterior | Busca ("taxa wise", "wise ou remessa") + links cruzados | R$ 0 | 14 dias | ≥ 3 pedidos de alerta, ou 1 programa de indicação aprovado | API indisponível ou programas incompatíveis com o regulamento |
| 3 | Comercial rápida | EXP-013 Sites no celular | 55 profissionais com problema provado | E-mail (canal pendente) | R$ 0 | 72 h depois do envio | ≥ 2 respostas | > 5% de falhas de entrega ou qualquer reclamação de spam |
| 4 | Livre | EXP-017 Invoice Simples + kit | Freelancers que faturam para fora | Busca ("gerador de invoice gratuito") | R$ 0 | 14 dias | ≥ 3 pedidos do kit | 0 pedidos depois de 2 divulgações |
| 5 | Livre (outro mercado) | EXP-018 Prompts para advocacia | Advogados | Busca + e-mail (EXP-013) | R$ 0 | 14 dias | ≥ 3 pedidos do pacote | 0 pedidos com ≥ 50 contatos alcançados |

- **Por que estes:** 3 modelos de receita distintos (assinatura ou relatório, indicação, venda de produto) mais 1 serviço e 1 produto para outro mercado. Os experimentos 1, 2 e 4 formam um **funil** para o mesmo público, com links cruzados: cada visitante pode virar usuário de três ferramentas.
- **Capital:** nenhum gasto. Nenhum dos testes exige dinheiro, e nenhuma aposta especulativa tem valor esperado positivo (DEC-013).
- **Lição 19:** a mesma ação (consultar uma API pública) pode virar produto em minutos quando a API aceita chamadas do navegador. Checar o CORS primeiro é o teste mais barato de viabilidade.

## DEC-033 — Fase de distribuição (23/10/2026 19:21; responde à diretriz do proprietário intitulada "DEC-032")
- A diretriz chegou com o número DEC-032, que já estava em uso. O conteúdo foi registrado sem alteração.
- **Nenhum produto novo** até rodar a 1ª distribuição dos atuais.
- **EXP-018 (prompts):** pacote pago **ABANDONADO**, por ser substituível por material gratuito. A amostra grátis permanece publicada.
- **EXP-017 (invoice):** hipótese paga **MODIFICADA** de "kit" para "fechamento mensal para o Carnê-Leão".
- **EXP-016 (comparador):** antes de qualquer inscrição em programa de afiliados, confirmar os termos de uso da API da Wise e a elegibilidade de residente no Brasil.
- **Critério de leitura do funil:**
  - sem visitas → problema de **canal**;
  - visitas sem uso → problema de **produto**;
  - uso sem pedido → problema de **proposta ou monetização**.
  - Só se abandona por falta de interesse depois de exposição real, de pelo menos 1 canal com público executado.
- **Lição 20:** medir antes de divulgar. Sem contador, uma rodada de divulgação não ensinaria nada.

## DEC-035 — Produto principal e canal (23/10/2026 21:51; responde à diretriz do proprietário intitulada "DEC-034")
- A diretriz chegou com o número DEC-034. As decisões de Claude seguem a numeração própria do diário.

| Critério | Recebi do Exterior | Quanto Chega | Invoice Simples |
|---|---|---|---|
| Problema | Regra de conversão confusa (fontes divergem), todo mês | Escolher o serviço mais barato (até R$ 270 por US$ 1.000) | Emitir a invoice |
| Diferenciação | Alta: aplica as duas regras em lote, com fonte | Média: Wise e Monito já comparam | Baixa: a Wise tem gerador grátis |
| Qualidade dos dados | **Oficial** (BCB), conferida | De um concorrente (Wise), com cotações de idades diferentes | Não se aplica |
| Concorrência | Blogs + 1 calculadora | Forte | Forte |
| Monetização | Relatório anual pago (HIPÓTESE fraca) | Afiliados (não aprovados; termos da API não encontrados) | Fechamento mensal (HIPÓTESE) |
| Risco de confiança | Baixo (só calcula com dado oficial) | Médio | Baixo |

- **Principal: Recebi do Exterior.** Melhor diferenciação e dados mais confiáveis. Também gera o conteúdo educativo mais forte (ATV-098).
- **Alternativa: Quanto Chega.** Problema de alto valor em reais, mas depende de dados de terceiros e de afiliação não aprovada.
- **Invoice:** fica em espera; não se constrói o fechamento mensal sem sinal.
- **Canal:** artigo educativo, não pitch. O TabNews tem a regra verificada (FAQ), mas exige conta, e os dados mostram alcance baixo para pitches. Nenhum canal com público aceita publicação sem conta pessoal, e Claude não cria contas (regra do desafio e termos das plataformas).
- **Lição 21:** medir o canal **antes** de publicar evita gastar a única ação disponível do proprietário no formato errado (pitch saturado).

## DEC-036 — Reset: duas oportunidades com caminho até o comprador (24/10/2026 14:05; responde à diretriz do proprietário intitulada "DEC-035")
- A diretriz chegou com o número DEC-035, que já estava em uso. O conteúdo foi registrado sem alteração.
- **A:** serviço "mobile friendly em 24 h" no Fiverr. Comprador entra pela busca da plataforma, pagamento pela plataforma, entrega em minutos com técnica testada.
- **B:** oferta direta a 51 profissionais com o problema provado em navegador, por e-mail individual.
- **Critérios** em `analises/RESET-2026-10-24.md`, fixados antes de qualquer resultado.
- **Lição 22:** toda oportunidade avaliada exigiu um ato de identidade do proprietário. O critério de escolha passa a ser o *menor ato, uma única vez*, e não a ausência de ato, que não existe neste desafio.
- **Lição 23 (técnica):** ao corrigir um site, o CSS novo entra **depois** do original; regras de mesma especificidade valem pela ordem.

## DEC-038 — Principal e alternativa (24/10/2026 15:12; responde à diretriz do proprietário "DEC-037")
- **Testado de fato até hoje:** nada chegou a um comprador. Pesquisado ou preparado: tudo o mais (ver `analises/RESET-2026-10-24.md`).
- **Principal: oferta direta a 51 profissionais com site quebrado no celular** (e-mail individual, prova verificada em 24/10, prévia grátis, R$ 297 via Pix só depois de aprovar).
  1. **Quem paga:** escritórios e consultórios que já pagam domínio e certificado.
  2. **Problema:** o site não é legível no celular (provado em navegador).
  3. **Evidência de que pagam por isso:** a busca do Fiverr tem 57.150 serviços do tipo, e os mais vendidos acumulam até 1.521 avaliações.
  4. **Acesso:** e-mail publicado pelo próprio profissional, com MX ativo.
  5. **Oferta:** prévia grátis do próprio site.
  6. **Tempo até tentar vender:** minutos depois de liberado o canal.
  7. **Custo:** R$ 0.
  8. **Margem:** ≈ 100%; sem risco de capital.
  9. **Menor teste:** 51 envios, 72 h.
  10. **Escala:** ≈ 5.010 domínios profissionais mapeados + manutenção mensal.
- **Alternativa: serviço no Fiverr** (`oferta/fiverr/PACOTE-FIVERR.md`). Entra se a principal não tiver ≥ 2 respostas em 72 h ou se o canal de e-mail não for liberado.
- **Por que essa ordem:** a principal tem o comprador já identificado, com a dor provada, e não depende de visibilidade num marketplace onde uma conta nova compete com 57 mil serviços.
- **Executado agora:**
  - lote final de 51 e-mails personalizados (data preenchida no envio) e registro de envios, ambos privados no scratchpad;
  - nenhum lead novo.
- **Dependência única:** um canal de envio de e-mail autorizado pelo proprietário (conector Gmail). Se o conector só criar rascunhos, o proprietário clica "Enviar" em cada um (≈ 5 min no total).

## COR-006 — "Margem ≈ 100%" e "demanda" estavam ditos com força demais (24/10/2026 18:52)
- DEC-038, a matriz da DEC-039 e o relatório de 24/10 afirmaram margem de "≈ 100%" para o piloto B2B. Isso ignorava o tempo de Claude e do proprietário. **Correção:** margem **a apurar**. Estimativa (não medida): 20–60 min de Claude por caso + o tempo do proprietário para repassar mensagens; nenhum gasto em dinheiro previsto.
- Os 51 sites são **potenciais clientes com um problema verificado**, não demanda validada. Demanda só existe com resposta, pedido ou pagamento.

## DEC-047 — Nova frente: Confere Multa (25/10/2026 15:10; aprovada pelo proprietário)
- **Contexto:** o proprietário pediu monetização em paralelo ao ciclo de trading. Também vetou as frentes antigas (B2B, Fiverr e indicação) e escolheu a ideia 2: recurso de multa de trânsito, vendido por meio de um canal sem rosto no TikTok.
- **Decisão:**
  - **Produto:** diagnóstico grátis, seguido de documento pago a R$ 19,90.
  - **Order bumps:** kit das 3 fases (+R$ 12,90) e guia "CNH sem suspensão" (+R$ 7,90).
  - **Oferta depois da compra:** pacote de 3 multas a R$ 39,90.
- **Plataforma recomendada: Kiwify.**
  - Order bump, oferta pós-compra, Pix, área de membros e afiliados já vêm prontos.
  - Taxa: 8,99% + R$ 2,49 por venda, segundo fonte de terceiros (a confirmar no cadastro). Numa venda de R$ 19,90, sobram ≈ R$ 15,62.
  - A Hotmart fica como alternativa. Ela tem o maior mercado de afiliados, o que dá mais alcance e também mais exposição a cópias.
- **Proteção contra plágio:** nenhuma plataforma esconde a página de vendas, que é pública por natureza. A proteção vem da arquitetura:
  1. os modelos pagos e o gerador nunca ficam no repositório público. São entregues só depois da compra, na área de membros;
  2. a afiliação depende de aprovação manual, e o produto não aparece na vitrine pública;
  3. vale a velocidade e o canal próprio: quem chega primeiro e tem audiência leva a vantagem;
  4. o registro da marca no INPI fica para depois da primeira venda.
- **Base legal:** conferida em `analises/multas/BASE-LEGAL.md`. Pendências antes da primeira cobrança:
  - P-1: reconferir o CTB no Planalto;
  - P-2: confirmar se a Resolução CONTRAN 798/2020 ainda está em vigor.
- **Não muda:**
  - o ciclo de trading na Coinbase (decisão em 27/10, sem ordem real sem aprovação);
  - a Binance fica só com dados públicos (as chaves foram recusadas; recomendado revogá-las).

## DEC-048 — Autorização permanente para operar e 1ª ordem real (26/10/2026 00:56)
- **Autorização do proprietário:** "você tem liberdade, aprovação de operar a qualquer momento [...] usando valores disponíveis [...] Sempre com intuito do lucro."
  - Isso substitui a exigência de aprovação prévia de cada ordem (DEC-046).
  - Os demais limites continuam: spot, sem alavancagem, sem transferências, nunca o capital inteiro numa operação.
- **Regras operacionais:** fixadas em `analises/quant/trading-2026/real/REGRAS-REAIS.md`. Só regra testada fora da amostra, 1 posição de até ≈ 60% do saldo e parada total abaixo de 1,60 USDC.
- **1ª ordem (OP-001):** a R2 deu sinal de entrada no fechamento de 25/10.
  - O sinal apareceu tanto no BTC (RSI2 7,8) quanto no ETH (RSI2 5,2), os dois acima da SMA200.
  - Escolhido o ETH: o sinal estava mais extremo e o resultado fora da amostra foi melhor.
  - Compra a mercado de 1,25 USDC: 0,00054058 ETH a 2.293,83, taxa de 0,1%.
  - A venda foi pré-verificada por prévia.
- **Por que 1,25 e não 1,00:** com 1,00, qualquer queda deixaria a posição abaixo do mínimo de venda (1 USDC). Com 1,25, ela continua vendável mesmo com queda de até ≈ 20%.
