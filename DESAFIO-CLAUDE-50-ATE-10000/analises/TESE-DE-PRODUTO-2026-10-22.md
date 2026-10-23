# Tese de produto (resposta à diretriz do proprietário "DEC-030"), 22/10/2026 ≈ 23:55 BRT

Critério: produto construído uma vez, usado por muitos, sem uma conversa por venda.
Legenda: **FATO** (verificado), **HIPÓTESE**, **ESTIMATIVA**.

## Sinais de demanda coletados (FATO, 22/10/2026)
- **Autocompletar do Google** (pt-BR, Brasil; mostra que as buscas existem, não o volume), arquivo bruto no scratchpad:
  - "carnê leão exterior" → "recebimento exterior", "salario exterior", "dividendos exterior", "rendimento exterior".
  - "calculadora pj x clt" → "**dev na gringa**", "2026".
  - "declarar ações no exterior" → "2026", "imposto de renda 2026".
  - "lei 14.754" → 10 variações.
  - "ptax imposto de renda" → "ptax 31/12/25 para imposto de renda".
  - Geradores: "gerador de recibo" e "gerador de orçamento" → 10 e 7 variações ("online grátis", "pdf"); "gerador pix" e "qr code pix" → 10 cada.
  - "como deixar site responsivo" → 10 variações ("no wordpress", "no canva").
- **Divergência entre fontes sobre a cotação do carnê-leão** (NetCPA, AmdJus e auditor-fiscal citado pela imprensa: PTAX de compra do último dia útil da 1ª quinzena do mês anterior; InvestNews e Contabilidade Zen: cotação do dia). A confusão sobre a regra é o problema.
- **Concorrência encontrada:**
  - Recebimento do exterior: calculadora da Contabilidade Zen (usa "cotação de referência" e compara PF × PJ).
  - Orçamento: VISU (grátis, sem Pix de cobrança); geradores de Pix grátis (TecMestre); plugin SwiftInvoice (WooCommerce).
- **Viabilidade técnica:** a API PTAX do BC aceita chamadas do navegador (CORS liberado). A API PageSpeed do Google sem chave está com a cota esgotada (HTTP 429).

## Três oportunidades

| # | Pergunta | P1. Recebi do Exterior (PTAX → Carnê-Leão) | P2. Orçamento e recibo com Pix embutido | P3. Ajuste responsivo automático para sites antigos |
|---|---|---|---|---|
| 1 | Problema | Converter cada recebimento em dólar com a cotação e a data certas, todo mês; as fontes divergem e o site do BC consulta uma data por vez | Autônomo monta o orçamento num lugar e a cobrança Pix em outro; o cliente demora a pagar | Site antigo abre como miniatura no celular; refazer custa caro |
| 2 | Público | Brasileiros que recebem de fora como pessoa física: devs e designers "na gringa", freelancers de plataformas, quem recebe dividendos | MEI e autônomos (técnicos, diaristas, fotógrafos) | Profissionais liberais com site antigo (224 verificados) e web designers que os atendem |
| 3 | Como resolvem hoje | Planilha + site do BC (data a data), contador (mensalidade), blogs que se contradizem | Word ou Canva + app do banco para o Pix; geradores grátis separados | Ignoram, pagam um site novo (R$ 1.000+) ou trocam de plataforma |
| 4 | O que faria melhor | Lote de datas, regra aplicada automaticamente, comparação entre as regras, total do mês, vencimento do DARF, CSV; privado (no navegador) | Um único PDF com QR Pix (BR Code) do valor exato e "copia e cola"; sem cadastro | Ajuste só para celular, sem mexer na versão de computador (testado num site real em ≈ 1 min) |
| 5 | Monetização | Versão anual paga (relatório para a declaração: rendimentos, ganhos de capital, Lei 14.754) por R$ 29–49/ano (HIPÓTESE); indicação de plataformas de câmbio; Pix voluntário | Plano pago com logotipo, numeração e histórico (R$ 9–19/mês) (HIPÓTESE) | R$ 97–297 por site ajustado, ou licença para web designers |
| 6 | Primeiros usuários | Busca no Google (README indexável), comunidades de devs (TabNews, r/brdev, grupos "dev na gringa"), newsletters | Busca no Google ("gerador de orçamento pdf grátis") | E-mail com prova (EXP-013), agências pequenas |
| 7 | Custo do teste | R$ 0 (página estática, API pública) | R$ 0 | R$ 0 |
| 8 | Menor versão útil | Conversor com regra, comparação, total mensal e CSV: **construído** | Formulário → PDF com QR Pix | Script que gera o CSS + prévia |
| 9 | Validar sem depender do proprietário | Página pública + "porta falsa" da versão paga (Issue no GitHub = intenção medida) + README indexável; comparação com fontes oficiais | Página pública; sem métrica de uso (sem analytics) | Precisa de canal de contato (é o bloqueio do EXP-013) |
| 10 | Riscos e abandono | Regra fiscal errada ou alterada (mitigado: cita fontes, mostra as duas regras, não calcula o imposto); público pequeno; descoberta lenta. **Abandonar se:** 0 pedidos da versão paga e 0 relatos depois de 2 divulgações em comunidades, ou se a Receita publicar ferramenta igual | Mercado saturado de geradores grátis; diferenciação fraca. **Abandonar se:** < 1% de cliques no plano pago | Depende de conversa individual (contraria a tese). Fica como serviço dentro do EXP-013 |

## Escolha: P1 (Recebi do Exterior)
1. **Problema com prova pública de confusão:** fontes conflitantes, e a diferença no exemplo verificado foi de **R$ 1.022,43 em 3 recebimentos**.
2. **Recorrência:** o carnê-leão é mensal, e a declaração anual gera a necessidade da versão paga.
3. **Público online e técnico,** que encontra ferramentas por busca e comunidades e paga por conveniência fiscal (HIPÓTESE a validar).
4. **Custo zero e sem servidor:** o produto não depende de conta de ninguém para funcionar.
5. **Diferencia-se do concorrente encontrado** (que usa "cotação de referência") por aplicar a regra com a cotação oficial do dia certo, em lote.

**Por que não P2:** mercado saturado de geradores grátis; o sinal de demanda existe, mas a diferenciação é fraca.
**Por que não P3:** exige conversa individual; continua apenas como entrega do EXP-013.
