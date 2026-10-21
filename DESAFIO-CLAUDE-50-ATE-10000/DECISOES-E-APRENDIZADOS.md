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

## DEC-008 — Um ativo, três canais: o "Local Site Kit" (21/10/2026 19:40, adendo v3)
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

## DEC-009 — Não publicar produto pago em repositório público (21/10/2026 19:33)
- **Decisão:** o código do kit fica fora do repositório `Matheuszinhorn/Matheuszinhorn`, que é público.
- **Registro de auditoria:** hashes sha256 na ATV-017. Os arquivos foram entregues ao proprietário.

## Lições (acréscimo)
4. Antes de commitar, verificar a visibilidade do repositório: um repositório público distribui o produto de graça (origem: DEC-009).
5. Construir ativos reutilizáveis multiplica canais sem multiplicar trabalho (origem: DEC-008).
