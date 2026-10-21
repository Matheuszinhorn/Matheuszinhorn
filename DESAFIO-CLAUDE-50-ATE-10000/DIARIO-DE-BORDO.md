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
