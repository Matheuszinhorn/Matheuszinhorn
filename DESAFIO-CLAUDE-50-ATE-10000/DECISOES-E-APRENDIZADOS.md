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
