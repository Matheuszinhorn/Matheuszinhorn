# Auditoria do desafio (DEC-029), 22/10/2026 ≈ 22:30 BRT

Período: 21/10/2026 18:10 a 22/10/2026 22:30 BRT (≈ 28 h de calendário).
Resultado financeiro de todas as iniciativas: **R$ 0 de receita, R$ 0 de despesa. Caixa: R$ 50,00.**

Legenda: **FATO** (verificado e registrado), **ESTIMATIVA** (número aproximado, sem medição), **HIPÓTESE** (a testar).
Os tempos são ESTIMATIVAS a partir dos horários do diário.

## 1. Iniciativa por iniciativa

| # | Iniciativa | Hipótese original | O que foi executado | Evidência obtida (FATO) | Tempo (ESTIMATIVA) | R$ | Aprendizado que muda a próxima decisão | Veredito |
|---|---|---|---|---|---|---|---|---|
| EXP-001 | Sites para negócios locais via WhatsApp (POA) | Negócio sem site compra página de R$ 197 | 77 leads (OSM), mensagens, portfólio, 3 demos | 0 mensagens enviadas; o envio dependia do WhatsApp do proprietário | 5 h | 0 | O produto nunca foi o gargalo; faltou um canal que Claude opere | **Aproveitar parcialmente**: oferta, demos e entrega |
| EXP-002 | Perfil em plataforma de freelance | Projeto ganho em 14 dias | Nada (cancelado antes de começar) | — | 0,2 h | 0 | — | Abandonado |
| EXP-003 | Produto "Local Site Kit" (R$ 47) | Venda de kit digital | Kit, página de venda, gerador de Pix | Página no ar **sem meio de compra** (sem chave Pix) | 3 h | 0 | Construído antes de ter forma de receber nem compradores | **Pausar.** Ativo pronto, sem canal |
| EXP-004 | Serviço no Fiverr (USD) | Pedido em 14 dias | Anúncios redigidos | Exige conta do proprietário; nunca publicado | 1 h | 0 | Depende de plataforma inacessível | Abandonar |
| EXP-005 | Recompensas open source (Algora) | Claude resolve issues pagas | Investigação | Mercado esvaziado rápido; PRs com a identidade do proprietário | 1 h | 0 | — | Abandonar |
| EXP-006 | Superteam como agente | Surgem vagas para agentes | 3 varreduras automáticas | 0 vagas para agentes em 3 dias | 2 h | 0 | Mercado de agentes sem demanda paga ativa | **Encerrar em 29/10** (critério fixado) |
| EXP-007 | Redesign do Jupiter (US$ 1.500) | Prêmio de design | 10 telas no Figma | Vaga **só para a Índia** (descoberto depois) | 3 h | 0 | **Erro: construir antes de checar a elegibilidade** | Encerrado. Figma vira portfólio |
| EXP-008 | Medição de ordenação de transações na Solana (US$ 2.500) | Prêmio de pesquisa | Ferramenta completa, 9 testes, rede local | Vaga **só para a Ucrânia**; mainnet não executada | 5 h | 0 | O mesmo erro, agravado pelo custo de construção | Arquivado sem gasto |
| EXP-009 | Repositório lite no GitHub | Tráfego orgânico gera pedidos | Conteúdo pronto | Acesso ao repositório negado 5 vezes | 1,5 h | 0 | **Erro: escolher um repositório novo em vez desta pasta pública**, que já era acessível | **Abandonar** o repositório separado |
| EXP-010 | Marketplaces de freelance | Demanda pouco disputada | Medição em Freelancer.com e 99Freelas | Mediana de 35–178 lances; 31 propostas em ≈ 25 min | 0,7 h | 0 | Velocidade de chegada é um requisito | Abandonado |
| EXP-011 | E-mail para 4 negócios (OSM) | Aviso de problema vira venda | 603 negócios auditados, 4 e-mails redigidos | Rendimento de 0,7%; nada enviado (sem canal) | 1,5 h | 0 | A fonte (OSM) era o gargalo, não a ideia | **Substituído pelo EXP-013** |
| — | Investimentos e arbitragem (DEC-004, DEC-013) | Capital rende | Monte Carlo, backtest, spreads | Valor esperado negativo depois dos custos | 2 h | 0 | Com R$ 50, investir não move a meta | Abandonado |
| — | Mercados de agentes (AgentHansa, NEAR, etc.) | Trabalho pago para IA | 6 plataformas verificadas | Pouca demanda ativa | 1,5 h | 0 | — | Abandonado |

## 2. Padrões de erro (honestamente)
1. **Construir antes de confirmar elegibilidade e recebimento:** EXP-007 e EXP-008 (≈ 8 h), EXP-003 (sem meio de pagamento).
2. **Depender de acesso que eu não tinha:** repositório lite, Fiverr, Workana, Superteam humano.
3. **Canal sem estratégia de distribuição:** quase tudo foi pensado a partir do produto. **Em 28 h, nenhuma conversa com um comprador real.**
4. **Pesquisa em excesso:** 6 plataformas de agentes, 4 marketplaces e várias análises de investimento, sem nenhuma oferta diante de um comprador.
5. **Transferir ao proprietário o que eu podia fazer:** pedi um repositório separado quando esta pasta pública já servia. Pedi envios manuais de WhatsApp quando poderia ter buscado leads com e-mail publicado em escala (feito só agora, com o EXP-013).
6. **Abandonar no primeiro obstáculo:** o e-mail foi descartado (ATV-035) pelo baixo rendimento do OSM, sem testar outra fonte de leads. A fonte certa (certificados públicos + auditoria em navegador) rendeu **14 vezes mais** (55 contra 4).

## 3. Ativos reaproveitáveis
- **Máquina de leads verificáveis** (nova, FATO):
  - certificados públicos (crt.sh) → ≈ 5.010 domínios de profissionais (.adv, .cnt, .med, .odo, .arq);
  - auditoria HTTP + renderização num celular real → 224 sites com problema provado → 55 com e-mail ativo.
  - Reaproveitável para outras profissões e outros problemas (site fora do ar, sem HTTPS, página vazia).
- **Entrega de baixo custo** (FATO): ajuste responsivo de um site real (serodiocosta.adv.br) em ≈ 1 min de relógio, sem mudar nada no computador. Capturas antes e depois.
- Oferta pública, demos, gerador de Pix (BR Code validado), Figma do redesign (portfólio) e ferramenta de medição da Solana (código aberto).

## 4. Princípios de referência, confrontados com o desafio
| Fonte | Princípio | Como muda a decisão | Crítica |
|---|---|---|---|
| Ries, *A Startup Enxuta* | Construir-medir-aprender; MVP é o menor teste da hipótese mais arriscada | A hipótese mais arriscada é "alguém responde e paga", não "consigo construir". O MVP é um e-mail com prova, não um produto | Supõe acesso a clientes; aqui o acesso é o recurso escasso |
| Fitzpatrick, *The Mom Test* (acréscimo) | Comportamento vale mais que opinião | Medir respostas e pedidos de prévia, não elogios | — |
| Guillebeau, *A Startup de $100* | Venda algo que as pessoas já compram; oferta = produto + preço + forma de pagar | Profissionais liberais já pagam por site (têm domínio e certificado ativos). Oferta com preço único e forma de pagamento clara | Exemplos têm viés de sobrevivência |
| Hormozi, *$100M Offers* (acréscimo) | Valor = resultado × probabilidade ÷ (tempo × esforço); reversão de risco | Prova do problema, prévia grátis e "só paga se aprovar"; 48 h | Superestima o poder da oferta sem canal |
| Kiyosaki, *Pai Rico, Pai Pobre* | Ativos geram renda sem o seu tempo | A máquina de leads e a entrega automatizada são ativos. O próximo passo de ativo é a manutenção mensal (recorrência) | Exemplos financeiros com alavancagem são proibidos aqui |
| Housel, *Psicologia Financeira* | Sobreviver primeiro; margem de segurança | Capital intacto até haver hipótese com teto de perda | — |
| Eker, *O Segredo da Mente Milionária* | Foco em oportunidades, não em obstáculos | Útil como antídoto ao padrão 6 | Afirmações não testáveis; não usar como base de decisão |

## 5. Comparação das oportunidades (DEC-028: 6 perguntas)
| Oportunidade | Quem paga | Como chego a ele | Como recebo | Custo/tempo | Teste mais barato | Bloqueio | Nota (1–5) |
|---|---|---|---|---|---|---|---|
| **A. Profissionais liberais com site quebrado no celular** | Escritórios e consultórios (já pagam domínio e certificado) | E-mail publicado por eles, com prova do problema | Pix depois de aprovar a prévia | R$ 0; ≈ minutos por entrega | 55 e-mails, medir respostas em 72 h | **Canal de envio** (Gmail) e chave Pix | **5** |
| B. Mesma base, plano mensal de manutenção (R$ 39–59) | Clientes da A | Upsell depois da 1ª entrega | Pix mensal | Baixo | Oferecer a cada cliente da A | Depende da A | 4 (depois da A) |
| C. Rede de confiança do proprietário | Conhecidos com negócio | 1 mensagem no status ou num grupo | Pix | 5 min do proprietário | 1 publicação, medir respostas em 48 h | Ação do proprietário | 3 |
| D. Produtos digitais no Etsy | Compradores globais | Busca do Etsy | Payoneer | US$ 0,20/anúncio + taxa incerta | 10 anúncios | Conta do proprietário + taxa | 2 |
| E. Conteúdo, personagens e música com IA | Plataformas (programas de criador) | Contas pessoais | Repasse da plataforma | Meses | — | Contas + limiares | 1 |
| F. Micro-SaaS de diagnóstico de sites | Profissionais | Ferramenta gratuita + SEO | Assinatura | Exige servidor; a API pública do Google esgotou a cota (429) | — | Infraestrutura | 2 (rever depois da A) |

## 6. Escolha (no máximo 3)
1. **EXP-013 = A** (principal): prova + oferta para os 55 leads verificados.
2. **EXP-014 = C** (paralelo, opcional): uma única publicação do proprietário com o link da oferta para pequenos negócios.
3. **EXP-006:** só termina, em 29/10.
4. **B** entra como upsell dentro do EXP-013, não como experimento separado.
5. **D, E e F:** não abrir agora.
