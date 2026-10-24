# Piloto comercial controlado: 5 casos (diretriz do proprietário "DEC-038")

Situação: **PRONTO PARA REVISÃO E APROVAÇÃO. Nada foi enviado.** As mensagens completas, com os endereços, ficam fora do repositório (dados de terceiros) e foram apresentadas ao proprietário no relatório.

## Seleção (critérios objetivos, aplicados aos 51 sites reverificados em 24/10)
1. Problema provado em navegador de celular (Chromium 390×844): layout de computador de 980–1.090 px e texto a ≈ 36–40% do tamanho.
2. Página com conteúdo (≥ 300 caracteres visíveis), sem estar em branco.
3. E-mail **institucional** (contato@, secretaria@, administrativo@…) publicado no **próprio domínio**. Endereços pessoais ficaram de fora.
4. Correção viável dentro do escopo de R$ 297, testada **no ambiente de Claude** (cópia local; nada foi alterado no site real).

| ID | Categoria | Largura no celular | Demonstração sob medida (cópia local) |
|---|---|---|---|
| P1 | advocacia | 980 px | Pronta: sem rolagem lateral; versão de computador idêntica |
| P2 | advocacia | 1.090 px | Pronta |
| P3 | medicina | 985 px | Pronta (menu ainda carregado) |
| P4 | advocacia (Joomla) | 980 px | Parcial: exige ajuste no template |
| P5 | arquitetura | 980 px | Parcial: blocos de texto ainda saem da tela |

- **Testados e descartados (correção fora do escopo ou demonstração ruim):**
  - um site feito em construtor, com posições absolutas;
  - dois sites com conteúdo cortado;
  - um site com texto sem sentido visível na página.
- **Lição técnica:** o ajuste genérico não serve de demonstração (só 1 de 8 ficou limpo). Cada site precisa de CSS sob medida, de 5 a 20 min.

## Escopo exato da oferta de R$ 297
- **Inclui:**
  - adaptação para telas de até 760 px de **até 6 páginas existentes**, sem mudar a versão de computador;
  - texto legível sem zoom;
  - fim da rolagem lateral;
  - menu utilizável;
  - botão "Ligar" com o telefone que já está no site;
  - capturas antes e depois (celular e computador);
  - 30 dias de ajustes.
- **Não inclui:** redesign, conteúdo novo, troca de plataforma, hospedagem, domínio nem SEO.
- **Sites em CMS** (WordPress, Joomla): orçamento confirmado depois de ver o painel. Se passar de R$ 297, o cliente é avisado **antes** de qualquer trabalho.
- **Publicação:** só com autorização do cliente. Ou ele (ou o responsável pela hospedagem) sobe os arquivos, ou cria um acesso temporário só para isso. **Nunca** se pede senha de e-mail ou de banco. Nenhuma alteração em produção sem autorização por escrito.
- **Pagamento:** Pix, só depois de o cliente aprovar a prévia.

## Verificações antes do envio
- **LGPD:**
  - **Base legal:** legítimo interesse (art. 7º, IX), avaliado conforme o Guia Orientativo da ANPD (02/2024). O fato de o dado ser público não basta, por isso a avaliação foi feita assim:
    - **Finalidade:** oferta B2B sobre o próprio site do destinatário.
    - **Dado mínimo:** só o e-mail institucional publicado para contato.
    - **Expectativa razoável:** o endereço foi publicado para receber contatos sobre o escritório.
    - **Transparência:** a mensagem diz de onde veio o endereço.
    - **Oposição:** "remover" é atendido na hora e sem novo contato.
    - **Dados sensíveis:** nenhum.
  - **Retenção:** apagar o contato se não houver resposta em 30 dias.
- **Provedor (Gmail):**
  - As regras do Google valem para todos os remetentes (autenticação SPF/DKIM, que uma conta Gmail já tem; taxa de spam abaixo de 0,3%). As exigências extras de remetente em massa começam em 5.000 mensagens por dia.
  - O piloto tem **5** mensagens, enviadas uma a uma, em texto simples, sem anexos, com opção de "remover".
- **Honestidade:** nenhuma mensagem afirma perda de clientes, vendas ou receita. Só citam o que foi medido.

## Registro (preencher a cada evento real)
| ID | Enviado em | Falha de entrega | Resposta | Pedido de prévia | Recusa / remover | Venda |
|---|---|---|---|---|---|---|
| P1–P5 | — | — | — | — | — | — |
