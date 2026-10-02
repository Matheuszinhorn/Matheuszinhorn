# Roadmap do modo online (documentação; nada implementado)

Status: **em desenvolvimento** — a tela de modos mostra ONLINE desabilitado. Este documento descreve o que precisa existir
antes de qualquer código online.

## Princípios

* O Engine 0.2.0 continua determinístico: no online o **servidor** roda a mesma função (`createRound`/`stepRound`) com a
  seed da rodada; o cliente só exibe e envia comandos. Mesma seed + mesmos dados + mesmas decisões = mesmo resultado.
* Nenhuma vantagem esportiva paga (ver MONETIZATION.md).

## Fases

1. **Contas** — login real (e-mail + senha com hash forte, Google via OAuth/OIDC). O perfil local atual migra para a
   conta mediante confirmação. Ver SECURITY-ONLINE.md.
2. **Saves na nuvem** — o save local (`fm-brasileiro:carreira:v1`) passa a ter cópia no servidor com versão e
   assinatura; migração planejada, sem trocar a chave local.
3. **Ligas privadas** — 4 a 20 treinadores humanos num mundo; rodadas em horário marcado; decisões ao vivo com limite de
   tempo (a decisão vence pela sugestão do jogo, a mesma política da CPU).
4. **Rankings** — **Top Brasil** e **Top Global**: pontuação por temporada (posição, acesso, título, reputação), sem
   dinheiro envolvido. Desempate determinístico.
5. **Hall da Fama** — temporadas históricas (campeões, artilheiros, técnicos) por mundo e global.
6. **Seleção e Copa** — o convite da seleção já existe na carreira offline como cargo honorário. A Copa (torneio de
   seleções) entra quando houver seleções com elencos e calendário próprio; é conteúdo normal do jogo, **nunca pago**.

## Fora do escopo

Integrações com sistemas de terceiros (comércio, ERP etc.), apostas, mercado com dinheiro real.
