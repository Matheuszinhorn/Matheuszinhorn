# Segurança do modo online (documentação; nada implementado)

## O que existe hoje (offline)

* **Perfil local**: só um nome em `localStorage` (`elite-manager:perfil-local`). Não há senha, servidor, token nem dado
  enviado. A tela de entrada diz isso. "CONTINUAR COM GOOGLE" explica que depende do modo online — **não simula login**.
* Save local em `fm-brasileiro:carreira:v1` (validado por `deserializeCareer`; save inválido nunca quebra a página).

## Requisitos para o online

* Autenticação: OAuth 2.0/OIDC (Google) com PKCE; senha própria com Argon2id/bcrypt, nunca em texto; sessão em cookie
  `HttpOnly`, `Secure`, `SameSite`; rotação de tokens.
* Autoridade do servidor: o resultado oficial é o calculado no servidor (engine determinístico). O cliente envia apenas
  comandos (`Command`), validados pelo engine (o mesmo `applyCommand`); nada de placar enviado pelo cliente.
* Anti-trapaça: replay de comandos com `commandId` único; limite de taxa; verificação de seed e de versão do engine
  (`engineVersion` no `MatchState`).
* Dados pessoais: mínimo necessário (LGPD): nome de exibição e e-mail; exclusão de conta sob pedido.
* Transporte: HTTPS/TLS 1.2+, CSP restritiva, sem scripts de terceiros na página do jogo.
* Pagamentos (se houver, ver MONETIZATION.md): processador externo certificado; o jogo nunca vê dados de cartão.
