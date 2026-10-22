# Varredura de oportunidades globais (22/10/2026, cerca de 18:30–19:30 BRT)

Todos os números são **FATOS** coletados de fontes públicas e oficiais nesta data. Nada foi enviado nem comprado, e nenhuma proteção anti-robô foi contornada.

## 1. Superteam Earn: elegibilidade por região (`/api/listings/details/<slug>`)
| Vaga | Região | Prêmio | Pode Claude executar? |
|---|---|---:|---|
| redesign-your-favourite-app-on-solana (EXP-007) | **India** | 1.500 USDC | Já executado, mas **inelegível** para residente no Brasil |
| inside-the-block-… (EXP-008) | **Ukraine** | 2.500 USDC | **Inelegível** |
| travel-boost-for-bp26 | Germany | 6.000 USDG | Inelegível |
| colosseum-founder-support-talk-to-5-users | Netherlands | 1.000 USDG | Inelegível |
| rumbo-a-breakpoint-2026… | Spain | 5.000 USDG | Inelegível |
| vaultline-security-audit-grants… | Global | auditoria (não é dinheiro) | Não. Exige um projeto do Colosseum |
| launch-and-trade-on-daejin… | Global | 620 USDC | Não. Thread no X e operação de trading pela conta pessoal |
| crea-contenido… El Encuentro | Global | 2.000 USDG | Não. Conteúdo em espanhol, conta pessoal e alcance; proíbe conteúdo "íntegramente con IA" |
| mozaikpay-video-chile-colombia | Global | 500 USDC | Não. Vídeo, conta no app e público em AR/CL/CO |
| panta-x-nectarfi-trading-competition | Global | 500 USDG | Não. Competição de trading com capital |
| chimp-on-metaplex | Global | 500 USDC | Não. Thread promovendo a venda de um token pela conta pessoal (risco de reputação) |
| create-content-on-premier-league-predictions | Global | 500 USDC | Não. Conteúdo pela conta pessoal |
| multihopper-build-and-route-challenge | Global | 5.000 USDC | Não. Exige US$ 100 mil de volume real em produção |

**Regra do servidor**, verificada no código aberto (SuperteamDAO/earn, commit `082cb9a`, `validateSubmissionRequest.ts`): um usuário humano fora da região recebe `Region not eligible`. Agentes estão isentos dessa checagem, mas só podem enviar a vagas AGENT_ALLOWED ou AGENT_ONLY, e hoje há 0 delas.

## 2. Recompensas open source (Algora)
- As páginas públicas por organização são legíveis (ex.: `algora.io/tscircuit/bounties`).
- **tscircuit:** 727 recompensas concluídas contra 10 abertas. As abertas são resquícios de 5 a 23 meses atrás (US$ 1–170).
- **projectdiscovery:** 2 abertas (US$ 100).
- **Leitura:** as recompensas novas são resolvidas rápido, e o que sobra é o difícil ou o abandonado.
- **Limite da sessão:** as issues e a API do GitHub de repositórios fora do escopo são negadas, então não dá para medir a concorrência por issue.
- Confirma o EXP-005 EM ESPERA.

## 3. Marketplaces de freelance
**Freelancer.com** (API pública oficial `projects/active`, 50 projetos ativos por busca):

| Busca | Lances (mediana) | Projetos com ≤ 5 lances | Teto típico (USD, preço fixo) |
|---|---:|---:|---:|
| landing page | 40 | 2/50 | 250 |
| web scraping | 59 | 1/50 | 500 |
| python script | 49 | 3/50 | 250 |
| excel automation | 34,5 | 4/50 | 750 |
| wordpress | 178 | 0/50 | 250 |

**99Freelas** (página pública de projetos, 10 mais recentes de Web/Mobile/Software): de 2 a 73 propostas por projeto.
- **Medição de velocidade:** "Desenvolvimento de site para serviços de marcenaria" foi publicado às 19:05 BRT. Tinha 8 propostas na primeira leitura e **31 propostas por volta das 19:30**.
- Uma proposta que dependa de o proprietário estar disponível chega tarde demais.
- Valor mínimo do projeto: R$ 50.

**Workana e Upwork:** bloqueados por Cloudflare/captcha. Não contornado.

## 4. Outros modelos (avaliados com evidência anterior)
- **Investimentos:** DEC-013. A renda fixa não chega a R$ 10 mil; a especulação tem valor esperado negativo depois dos custos.
- **Afiliados e conteúdo:** exigem audiência e contas pessoais, que não existem.
- **Produto digital (kit):** pronto, mas sem meio de pagamento publicado nem canal de tráfego.

## Conclusão
Hoje não existe canal que gere receita sem um ato de identidade do proprietário.

Os canais que dependem dele de forma **contínua** (proposta por proposta) são lentos demais para mercados que lotam em menos de 1 hora. Por isso, o próximo passo útil é um **canal que Claude opere sozinho depois de uma única configuração**, e não mais uma plataforma.
