# Base legal verificada: recurso de multa de trânsito (25/10/2026)

Legenda: **FATO** (texto conferido), **A VERIFICAR** (ainda sem confirmação na fonte).

## Fontes
- **Planalto (fonte oficial):** fora do ar para este servidor (sem resposta e HTTP 503).
- **Texto do CTB usado:** CTB Digital (ctbdigital.com.br, Perkons), com notas de redação por lei.
  - Antes de cobrar pela primeira venda, reconferir no Planalto (pendência P-1).
- **MP 1.327/2025:** lida no PDF publicado pelo Detran-RS. Altera só os arts. 147, 148, 159, 268-A e 269 (CNH). **Não mexe nos arts. 280 a 290.** FATO.
- **Resolução CONTRAN 798/2020**, com as alterações da Resolução 804/2020: lida no Normas Brasil.
  - Vigência em 2026 e eventual consolidação posterior: **A VERIFICAR** (pendência P-2).

## O que o diagnóstico grátis usa (FATO)
| Regra | Artigo | Uso no produto |
|---|---|---|
| O auto de infração precisa conter: tipificação; local, data e hora; placa, marca e espécie; identificação do órgão e do agente ou equipamento | CTB art. 280 | Lista de conferência dos dados do auto |
| O auto é arquivado se for inconsistente ou irregular, ou se a notificação da autuação **não for expedida em até 30 dias** | CTB art. 281, § 1º, I e II | Verificação automática das datas (o indício mais forte) |
| O prazo da defesa prévia é de **pelo menos 30 dias**, contados da expedição da notificação | CTB art. 281-A | Cálculo do prazo |
| O prazo do recurso contra a penalidade é de **pelo menos 30 dias** | CTB art. 282, § 4º | Cálculo do prazo |
| Notificação da penalidade de multa: até **180 dias** da infração, ou **360 dias** se houve defesa prévia. Passado o prazo, o direito de punir **decai** | CTB art. 282, §§ 6º e 7º | Verificação automática das datas |
| Pagar a multa **não impede** recorrer depois | CTB art. 284, § 2º | Conteúdo dos vídeos |
| A exceção é o desconto de 60% pelo sistema eletrônico: quem escolhe esse desconto abre mão da defesa | CTB art. 284, § 1º | Alerta no diagnóstico |
| Enquanto o processo administrativo estiver aberto, não pode haver restrição ao licenciamento | CTB art. 284, § 3º | Conteúdo dos vídeos (época de licenciamento) |
| O recurso contra a penalidade tem **efeito suspensivo**; recurso fora do prazo é arquivado | CTB art. 285, caput e §§ 1º e 5º | Alerta de prazo |
| Os órgãos julgadores têm **24 meses** para julgar; passado isso, ocorre a prescrição | CTB arts. 285, § 6º, 289 e 289-A | Diagnóstico: recursos parados há muito tempo |
| O recurso pode ser apresentado sem pagar a multa | CTB art. 286 | Conteúdo |
| Contra a decisão da JARI cabe recurso ao CETRAN ou ao CONTRANDIFE, em 30 dias | CTB arts. 288 e 289, II | Terceira fase do kit |
| **A partir de 1º/1/2027, a notificação passa a ser só eletrônica.** A pessoa conta como notificada 30 dias depois de a mensagem entrar no sistema | CTB art. 282-A, na redação da Lei 14.440/2022 | Risco de perder prazo sem perceber: tema para o pico de janeiro |

## Radar (Resolução CONTRAN 798/2020, com as alterações da 804/2020)
- **FATO:** o medidor precisa de modelo aprovado pelo Inmetro e de verificação inicial e periódica (art. 4º, I).
- **FATO:** a velocidade usada na multa é a medida **menos a margem de erro** (art. 8º).
- **FATO:** os radares fixos precisam de placa R-19 (art. 10, § 2º, e art. 11).
- **FATO:** o órgão tem de publicar no próprio site a lista dos medidores (art. 9º, parágrafo único).
- **ARMADILHA:** a redação original do art. 9º exigia que a notificação trouxesse a data da última verificação, entre outros dados. **Depois da Resolução 804/2020, a exigência passou a ser só a imagem com a placa.**
  - Muitos modelos que circulam na internet ainda usam o argumento antigo.
  - O nosso produto não usa.

## Limites do produto
- O produto é uma ferramenta de documento: a própria pessoa assina e protocola. **Não é assessoria jurídica e não promete anular nada.**
- Os dados ficam no navegador da pessoa (LGPD): nada é enviado nem guardado.
