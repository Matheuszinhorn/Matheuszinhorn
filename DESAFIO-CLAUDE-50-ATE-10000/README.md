# DESAFIO CLAUDE: R$ 50 → R$ 10.000

Desafio de empreendedorismo e sobrevivência financeira: transformar **R$ 50,00** em **R$ 10.000,00 de patrimônio acumulado**, sem novos aportes, com resultados reais e verificáveis.

Início oficial: 21/10/2026 (horário de Brasília).

## Estado atual (atualizado em 22/10/2026 19:35 BRT)

| Indicador | Valor | Situação |
|---|---:|---|
| Status | Sobrevivendo, em pré-operação | — |
| Capital disponibilizado | R$ 50,00 | **Confirmado em 21/10/2026 19:36 (FIN-001-C)** |
| Caixa disponível confirmado | R$ 50,00 | FIN-001-C |
| Receita recebida | R$ 0,00 | — |
| Despesas pagas | R$ 0,00 | — |
| Patrimônio líquido atual | R$ 50,00 | — |
| Total retirado | R$ 0,00 | — |
| Patrimônio acumulado | R$ 50,00 / R$ 10.000 (0,5%) | — |
| Estratégias | EXP-006: vagas do Superteam para agentes (em execução até 29/10) · EXP-009: canal de entrada no GitHub (aguarda T-31) · EXP-001/003: prontos, sem canal · EXP-007: CANCELADO (vaga só para a Índia) · EXP-008: ARQUIVADO (vaga só para a Ucrânia, sem gasto) · EXP-010: CONCLUÍDO (marketplaces rejeitados) | ver ESTRATEGIAS-E-EXPERIMENTOS.md e DEC-027 |
| Investimentos financeiros | nenhum. Simulação e arbitragem testadas e rejeitadas | DEC-004, DEC-013 |
| Portfólio público (serviço) | https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/demo/index.html | no ar desde 21/10 19:40 (ATV-023) |
| Página de venda do kit | https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/vitrine/kit/index.html | no ar, **sem meio de compra** até a chave Pix (T-05) |
| Contatos prontos | 77 (L001–L077), 0 contatados | VENDAS-E-CLIENTES.csv |

Fonte dos números: `CONTROLE-FINANCEIRO.csv`. O detalhamento está em `RELATORIOS-DE-PROGRESSO.md`.

## Índice

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Objetivo, regras, estado atual e índice |
| `DIARIO-DE-BORDO.md` | Registro cronológico das atividades (ATV-xxx) |
| `CONTROLE-FINANCEIRO.csv` | Todas as movimentações, previstas e realizadas |
| `ESTRATEGIAS-E-EXPERIMENTOS.md` | Oportunidades analisadas e experimentos (EXP-xxx) |
| `VENDAS-E-CLIENTES.csv` | Oportunidades e vendas (sem dados pessoais) |
| `DECISOES-E-APRENDIZADOS.md` | Decisões (DEC-xxx), alternativas e lições |
| `RELATORIOS-DE-PROGRESSO.md` | Relatórios periódicos e marcos |
| `PLANO-DE-ACAO.md` | Tarefas, responsáveis, prazos e situação |
| `ENCERRAMENTO-E-LICOES.md` | Resultado final e lições, atualizado ao longo do desafio |
| `RECURSOS-E-ACESSOS.md` | O que Claude executa sozinho, o que depende do proprietário (arquivo adicional) |
| `comercial/mensagens.md` | Roteiros de prospecção e fechamento (arquivo adicional) |
| `analises/quant/` | Monte Carlo do BTC, backtest e arbitragem, com scripts reproduzíveis |
| `comercial/anuncios-globais.md` | Anúncios prontos: Hotmart (PT/ES), Lemon Squeezy (EN), Fiverr (EN) |
| `demo/` | Página de oferta + 3 modelos fictícios: barbearia, estética, pet shop (arquivo adicional) |

## Versões do regulamento
- **v1 (21/10/2026, cerca de 18:00):** documento inicial, mais a seção 12 (documentação).
- **v2 (21/10/2026, 18:29):** "Regulamento oficial do experimento". Mantém as regras da v1 e acrescenta:
  - Investimentos financeiros permitidos, sem alavancagem, crédito ou concentração especulativa. Valorização não realizada fica separada do lucro realizado. Juros e dividendos só contam quando creditados. Ativos são avaliados a valor de mercado verificável, líquido de custos.
  - Proibido contrair dívidas ou obrigações sem autorização expressa.
  - Autonomia máxima dentro das permissões reais, sem contornar controles.
  - Novo estado de atividade: CANCELADO, com motivo. O estado BLOQUEADO exige motivo e providência.
  - Derrota também ocorre se não houver como prosseguir sem obrigações não autorizadas.
  - Revisão financeira específica antes de cada retirada. Se o dia não tiver movimentação, isso é registrado.
  - Formalização, licenças e análises especializadas devem ser identificadas antes de prosseguir.

- **v3 (21/10/2026, 19:15) — Adendo "Mercado global e liberdade empreendedora":**
  - Qualquer país, idioma ou modelo de negócio. Prestar serviço deixa de ser obrigatório.
  - Receitas e despesas em moeda estrangeira são registradas na moeda original e convertidas para reais por taxa verificável, com data e fonte. Este projeto usa a **PTAX de venda do Banco Central** do dia do crédito.
  - Custos pagos pelo proprietário especificamente para o desafio entram no controle financeiro.

- **v4 (22/10/2026) — DEC-023, autonomia sobre o capital:**
  - Os R$ 50 são capital operacional, e Claude decide quando e quanto alocar, em estratégias cautelosas, moderadas ou agressivas, dentro do saldo.
  - Continuam proibidos: empréstimos, alavancagem, crédito, obrigações futuras e capital adicional.
  - Toda operação é registrada com evidência.

Em caso de conflito, prevalece a versão mais recente.

## Regras oficiais (resumo fiel do documento do desafio)

### 1. Capital e proibições
- Capital inicial único: R$ 50,00. **Sem novos aportes.**
- É proibido usar dinheiro de terceiros sem autorização expressa.
- É proibido inventar receitas, clientes, vendas ou lucros.
- Uma tarefa planejada não pode ser declarada executada.
- Proposta comercial não conta como dinheiro recebido.
- Despesas, prejuízos e obrigações não podem ser omitidos.
- Proibido o que for ilegal, golpe, fraude ou prática enganosa.
- Nenhuma compra, contratação ou transferência acontece sem autorização. O proprietário executa as tarefas externas que Claude especificar.

### 2. Meta e cálculo do patrimônio
- Meta: **R$ 10.000,00 de patrimônio acumulado**.
- Patrimônio acumulado = patrimônio líquido atual + retiradas efetivamente recebidas pelo proprietário.
- Patrimônio líquido = caixa + ativos realizáveis avaliados com prudência − obrigações.
- Dinheiro não recebido não é caixa. O mesmo dinheiro não pode ser contado duas vezes.

### 3. Retiradas
- A cada marco de R$ 1.000 de patrimônio acumulado (R$ 1.000, R$ 2.000, … R$ 10.000), o proprietário pode retirar **R$ 500**, uma única vez por marco.
- A retirada só sai de caixa efetivamente disponível, depois de considerar obrigações e capital de giro. Sem caixa seguro, fica **pendente**.
- A retirada sai do capital operacional, mas continua no patrimônio acumulado. Não é lucro adicional.

### 4. Negócio e execução
- Qualquer oportunidade legal e viável é permitida. A escolha deve comparar custo, tempo até a 1ª venda, demanda, margem, custos, dificuldade, dependência de ferramentas pagas, recorrência, escala e risco.
- A estratégia pode mudar diante de evidências.
- Validar a venda antes de desenvolver produto complexo. Preferir ferramentas gratuitas.
- Primeira meta operacional: uma venda real em 7 dias (objetivo, não condição de derrota).

### 5. Vitória e derrota
- **Vitória:** patrimônio acumulado ≥ R$ 10.000,00, com resultados reais e verificáveis.
- **Derrota:** capital operacional acabou ou ficou insuficiente, **e** não existe alternativa legal, realista e financeiramente viável, **ou** continuar exigiria aportes proibidos.
- Uma tentativa que falhou não é derrota, se ainda houver capital e alternativa razoável.

### 6. Documentação (seção 12)
- Toda atividade relevante é registrada (ATV-xxx) antes de ser considerada concluída.
- As situações possíveis são PLANEJADO, EM EXECUÇÃO, CONCLUÍDO e BLOQUEADO. Nada passa a CONCLUÍDO sem evidência.
- O histórico não é apagado nem reescrito. Erros são corrigidos com um novo registro que explica o motivo. O histórico completo também fica preservado no git.
- Os critérios de sucesso dos experimentos não são alterados depois do início.
- Se houver divergência entre os registros e o dinheiro real, as decisões financeiras param até que ela seja esclarecida.
- Sempre diferenciar **FATO** (confirmado), **ESTIMATIVA**, **HIPÓTESE** e **PROJEÇÃO**.
- Estados: PLANEJADO, EM EXECUÇÃO, CONCLUÍDO, BLOQUEADO (com motivo e providência), CANCELADO (com motivo).

- **v5 (24/10/2026 19:28) — Bônus do proprietário (checkpoint):** o proprietário pode conceder bônus por avanço. O bônus entra como **aporte do proprietário**, nunca como receita, e é mostrado à parte:
  - **patrimônio total** = caixa + ativos (inclui bônus);
  - **resultado gerado pelo desafio** = patrimônio total − R$ 50 − bônus recebidos.
  - Primeiro bônus: 2,051824 USDC (≈ R$ 10,22 em 24/10), FIN-002.
