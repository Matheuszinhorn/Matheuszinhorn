# Kit de divulgação, 1ª rodada (diretriz do proprietário "DEC-032")

Cada link tem um `src` próprio, então o contador anônimo separa as visitas por canal: `python3 ferramentas/funil.py`.
Regra geral: **uma** publicação por canal, com conteúdo útil, e só em lugares cujas regras foram lidas. Sem mensagens em massa, sem contas falsas.

| Canal | Produto(s) | Regra verificada | Quem publica | Situação |
|---|---|---|---|---|
| GitHub (READMEs dos produtos) | os 3 apps | Repositório do proprietário, com permissão de escrita desta sessão | Claude | **PUBLICADO** (23/10). Alcance esperado baixo: o branch não é o padrão, então a busca do GitHub não o indexa |
| TabNews (post "Pitch", técnico) | os 3 apps | FAQ: projeto próprio permitido se agregar conhecimento; título com "Pitch"; proibido conteúdo só comercial; não republicar | Proprietário (conta dele) | PRONTO, texto abaixo |
| LinkedIn (post pessoal) | Recebi do Exterior + Quanto Chega | Perfil próprio: sem restrição de divulgação | Proprietário | PRONTO, texto abaixo |
| r/brdev | os 3 apps | **Não verificada**: o Reddit bloqueou a leitura das regras pela sessão (HTTP 403) | Proprietário, depois de ler as regras | AGUARDA VERIFICAÇÃO |
| Grupos de WhatsApp/Telegram de devs de que o proprietário já participa | Recebi do Exterior | Regras de cada grupo | Proprietário | OPCIONAL |
| E-mail para os 55 profissionais (EXP-013) | Sites no celular | LGPD + opção "remover" | Proprietário (canal pendente) | PRONTO |
| Prompts para advocacia | — | — | — | **Sem divulgação**: o pacote pago foi abandonado (proposta substituível por material gratuito) |

---

## TabNews, título: `Pitch: 3 ferramentas grátis para quem recebe do exterior (e o que aprendi com as APIs do BC e da Wise)`

Quem trabalha para fora como pessoa física tem três tarefas chatas todo mês: emitir a invoice, decidir por onde trazer o dinheiro e converter cada recebimento para lançar no Carnê-Leão. Fiz uma ferramenta pequena para cada uma. As três rodam 100% no navegador, sem backend e sem cadastro.

**1. Recebi do Exterior:** converte cada recebimento com a PTAX de compra do BC. A parte interessante é a regra: a maioria das fontes diz que vale a cotação do último dia útil da **1ª quinzena do mês anterior** ao recebimento, mas outras dizem "cotação do dia". Num exemplo de 3 recebimentos, a diferença entre as duas regras deu R$ 1.022,43. A ferramenta calcula pelas duas e mostra a fonte.
Técnica: a API OData do BC (`olinda.bcb.gov.br`) aceita CORS. Busco o intervalo de 1 a 15 do mês anterior e pego a última cotação publicada, o que resolve sozinho fins de semana e feriados (15/08/2026 caiu num sábado e o resultado veio de 14/08).
https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/recebi-do-exterior/index.html?src=tabnews

**2. Quanto Chega:** quantos reais chegam por serviço, com a margem sobre o câmbio comercial. Aprendizado: a API de comparação da Wise devolve cotações com idades bem diferentes (de "ao vivo" até ~9 h), então a página mostra a idade de cada uma em vez de fingir que são simultâneas.
https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/quanto-chega/index.html?src=tabnews

**3. Invoice Simples:** invoice em inglês e PDF pelo próprio `window.print()` com CSS de impressão. Simples de propósito.
https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/invoice/index.html?src=tabnews

Não é aconselhamento fiscal. Código aberto no GitHub. Feito com ajuda de IA. Se acharem erro na regra ou nos cálculos, quero saber: tem um botão para isso em cada página.

---

## LinkedIn (proprietário)

Quem recebe em dólar trabalhando do Brasil: duas ferramentas gratuitas que montei (com ajuda de IA) para tarefas que todo mês tomam tempo.

→ **Quanto Chega:** compara quantos reais chegam por Remitly, Wise, PayPal, Western Union e outros. Num envio de US$ 1.000, a diferença entre o melhor e o pior passou de R$ 260.
https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/quanto-chega/index.html?src=linkedin

→ **Recebi do Exterior:** converte cada recebimento pela cotação PTAX do Banco Central para o Carnê-Leão e mostra a diferença entre as regras que circulam por aí.
https://htmlpreview.github.io/?https://github.com/Matheuszinhorn/Matheuszinhorn/blob/ccr-fb47334b-mm7jqd/DESAFIO-CLAUDE-50-ATE-10000/produtos/recebi-do-exterior/index.html?src=linkedin

Sem cadastro; os dados ficam no seu navegador. Não é aconselhamento fiscal. Feedback é bem-vindo.
