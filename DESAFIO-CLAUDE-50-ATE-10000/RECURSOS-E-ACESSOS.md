# Recursos e Acessos (inventário de ATV-008, 21/10/2026 18:30 BRT)

Apenas FATOS verificados nesta sessão. O inventário será revisto quando algum acesso mudar.

## O que Claude executa diretamente
| Recurso | Uso no desafio | Verificado por |
|---|---|---|
| Ambiente Linux com terminal, Node e Python | Gerar sites, scripts e planilhas | Uso nesta sessão |
| Git com push no repositório `matheuszinhorn/matheuszinhorn` (branch `ccr-fb47334b-mm7jqd`) | Versionar entregas e documentação, com histórico auditável | Commits `d45c98b`, `f107c14` |
| Pesquisa e leitura na web | Pesquisa de mercado, preços, concorrência, taxas | Buscas da ATV-009 |
| Navegador Chromium (Playwright) | Testar páginas no tamanho de celular, gerar capturas | Teste da ATV-010 |
| Ferramentas do GitHub (MCP) | Ler e editar o repositório, abrir PR se o proprietário pedir | Disponíveis na sessão |
| Canva e Figma (conectores) | Peças visuais para divulgação, se necessário | Listados na sessão, não testados |

## O que Claude NÃO tem (depende do proprietário)
| Limitação | Consequência | Alternativa ou providência |
|---|---|---|
| Sem acesso a WhatsApp, Instagram ou e-mail do proprietário | Não envia mensagens a clientes | Claude redige, o proprietário envia e cola as respostas no chat |
| Sem acesso a banco, Pix ou corretora | Não recebe, não paga, não investe | O proprietário executa, depois de autorizar, e informa o comprovante |
| Sem permissão de administrador nas configurações do repositório | Não consegue ativar o GitHub Pages | O proprietário ativa (T-03) |
| Sem acesso logado ao Google Maps nem a listas de empresas | Não monta a lista de clientes com telefone de forma confiável | O proprietário lista os negócios (T-06). Claude define os filtros |
| Sem contas em plataformas de freelance | Não envia propostas no Workana nem no 99Freelas | O proprietário cria o perfil. Claude escreve perfil e propostas (EXP-002) |
| Ambiente efêmero | Arquivos fora do git se perdem | Tudo que importa é commitado e enviado ao repositório |

---

## Revisão de 21/10 18:59 BRT (ATV-011), com testes reais

| Capacidade | Resultado do teste | Situação |
|---|---|---|
| Publicar páginas sozinho (artefatos do claude.ai) | Funcionou: portfólio publicado (ATV-012) | DISPONÍVEL. Torná-la pública depende do proprietário (Compartilhar) |
| Publicar páginas com banco de dados (para ler status de volta) | Negado pelo controle de permissões | BLOQUEADO. Liberação possível nas configurações de permissão |
| Montar a lista de clientes sozinho | Funcionou com OpenStreetMap/Nominatim; Overpass bloqueado na rede | DISPONÍVEL |
| Navegador headless (Chromium) | Funciona, mas sem login do proprietário | DISPONÍVEL só para sites públicos. Claude **não cria contas em nome do proprietário** (identidade e termos de uso) |
| Enviar WhatsApp, Instagram ou e-mail | Nenhuma ferramenta disponível | INDISPONÍVEL. Mitigação: links `wa.me` com o texto pronto (um toque) |
| Receber pagamento (Pix ou link de pagamento) | Nenhum acesso bancário | INDISPONÍVEL. Exige a chave Pix ou a conta do proprietário (identidade e finanças) |
| Push para `main` / ativar o Pages | Fora do branch autorizado e sem permissão de administrador | Desnecessário depois da ATV-012 |

### Intervenções humanas que restam (todas por identidade, finanças ou permissão)
1. Tornar pública a página do portfólio: 1 clique.
2. Confirmar o capital e informar a chave Pix.
3. Tocar em "enviar" nas mensagens. O WhatsApp é a identidade do proprietário, e não há ferramenta de envio.
4. (Opcional) Criar a conta na plataforma de freelance (cadastro com documento).
5. (Opcional) Liberar a publicação de páginas com banco de dados, para Claude ler os status sem o "Copiar relatório".

---

## Canais de aquisição — verificação de 21/10/2026 19:50 BRT (ATV-028 a ATV-031)

| Canal | Claude opera sozinho? | O que impede | Alternativa mais autônoma |
|---|---|---|---|
| WhatsApp dos negócios (EXP-001) | Não | Sem conector nem API. O WhatsApp Business API exige conta verificada na Meta e é pago | **Link `wa.me` com o texto pronto: o proprietário só toca em enviar** |
| E-mail para negócios | Tecnicamente seria possível com o conector Gmail | Só 3 de 206 negócios sem site têm e-mail público (ATV-029) | Não compensa |
| Instagram, Facebook, LinkedIn | Não | Sem conector de publicação ou mensagem | Posts e legendas prontos para a conta existente do proprietário |
| Comunidades (Reddit, TabNews, grupos) | Não | Exigem conta pessoal. Claude não cria contas em nome de terceiros | Nenhuma sem conta |
| Marketplaces (Hotmart, Fiverr, Lemon Squeezy, Gumroad) | Não | Identidade e biometria (Hotmart), conta (Fiverr), sem repasse para o Brasil (Lemon Squeezy, Gumroad) | Pix direto na página pública |
| Busca orgânica (Google) | Parcial | As páginas no htmlpreview são montadas por JavaScript, e a indexação é incerta | Sem efeito no curto prazo |
| Repositório GitHub (público) | Sim | Tráfego desprezível para esse público | — |

**Conclusão verificável:** não existe hoje um canal em que Claude alcance um comprador sem a identidade do proprietário. A ação de menor esforço humano com maior chance de receita é o envio pelo WhatsApp.
