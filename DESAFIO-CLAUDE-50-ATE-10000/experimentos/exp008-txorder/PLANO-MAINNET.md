# EXP-008: plano reproduzível da medição na mainnet

Situação em 22/10/2026 19:30 BRT: **ARQUIVADO. Não executar.** Nenhum SOL foi comprado e nenhuma transação real foi feita.

## Por que está arquivado
- A vaga que motivava a medição, "Inside the Block" (US$ 2.500), tem `region = Ukraine` na API oficial do Superteam (`/api/listings/details/inside-the-block-how-solana-validators-order-transactions`, consultada em 22/10/2026 22:30 UTC).
- O código-fonte público do Superteam Earn (SuperteamDAO/earn, commit `082cb9a`, `src/features/listings/utils/validateSubmissionRequest.ts`) recusa o envio humano com `Region not eligible` quando a localização do perfil não pertence à região da vaga.
- O proprietário mora no Brasil, então não é elegível. Mudar a localização do perfil seria contornar a regra, e isso não será feito.
- Sem prêmio elegível nem cliente, gastar SOL não tem justificativa econômica.

## Onde o projeto está preservado
- **Repositório:** `Matheuszinhorn/Matheuszinhorn`, branch `ccr-fb47334b-mm7jqd`, pasta `DESAFIO-CLAUDE-50-ATE-10000/experimentos/exp008-txorder/`. Entrou no commit `21de1c5` e é idêntico à cópia de trabalho (verificado com `diff -r` em 22/10/2026).
- **Conteúdo:**
  - código: `txorder/`;
  - 9 testes unitários: `tests/`;
  - Dockerfile, docker-compose, README.md, REPORT.md e este plano;
  - dados da linha de base local: `data/localnet-baseline/`.
- **Fora do repositório (por segurança):** chaves e o registro de gastos (`keys/`, `data/keys/` e `data/spend_ledger.json` estão no `.gitignore`).

## Custos (FATO = medido; ESTIMATIVA = a confirmar)
Dados consultados em 22/10/2026 22:30 UTC:
- RPC pública da mainnet: `getRecentPrioritizationFees` deu mediana 0 e p90 0 µlamports/CU em 150 slots; `getMinimumBalanceForRentExemption(0)` = 650.240 lamports.
- CoinGecko: 1 SOL = R$ 522,57 (US$ 103,44).

| Item | Cálculo | SOL | R$ | Tipo |
|---|---|---:|---:|---|
| Taxa máxima por transação de teste | 5.000 + ⌈2.000 × 1.000.000 / 10⁶⌉ lamports | 0,000007 | 0,0037 | FATO (regra do protocolo + teto do código) |
| Taxas de 1 rodada (40 janelas × 8 transações = 320) | média de 5.555 lamports por transação (preços 0/0/10k/10k/100k/100k/1M/1M) | 0,00178 | 0,93 | ESTIMATIVA |
| Teto de taxas de 1 rodada | 320 × 7.000 | 0,00224 | 1,17 | FATO (dry-run) |
| Abastecer e devolver 8 lanes (16 transferências) | 16 × 5.000 | 0,00008 | 0,04 | FATO |
| Saldo mínimo das lanes (devolvido no fim) | 8 × 650.240 | 0,0052 | 2,72 | FATO, recuperável |
| **Saldo necessário na carteira** | taxas + saldo mínimo + folga | **≈ 0,010** | **≈ 5,23** | ESTIMATIVA |
| **Gasto efetivo (não recuperável)** | taxas | **≤ 0,0023** | **≤ 1,21** | FATO (teto) |
| Comprar SOL em corretora e sacar para a carteira | spread + taxa de saque | ? | ? | **A VERIFICAR** na corretora escolhida. A taxa de saque pode superar o custo da medição |

- **Teto rígido no código:** 0,05 SOL (`--cap-sol`), com registro de gastos persistente.
- **Teto proposto para uma rodada real:** 0,005 SOL, menos de 1% do capital, se um dia houver justificativa.

## Riscos
1. **Perda total do saldo da carteira** por erro de código ou chave vazada. Mitigação: carteira dedicada, saldo de no máximo 0,01 SOL e chave fora do repositório.
2. **Resultado inconclusivo** (tau perto de 0), porque o caminho RPC → QUIC → líder embaralha a ordem de envio. É um resultado válido, mas sem valor comercial.
3. **Taxa de saque da corretora** maior que o próprio experimento.
4. **Permissão da sessão:** criar carteira na mainnet e assinar transações reais foi negado pelo controle de permissões ("Real-World Transactions"). Só o proprietário pode mudar o modo de permissão. Claude não contorna.
5. **Regras de terceiros:** sem Jito ou bundles, sem spam, apenas cerca de 320 transações de custo mínimo.

## Critérios (fixados antes de qualquer gasto)
- **Condição para reabrir**, com as três exigências ao mesmo tempo:
  1. Uma vaga, bolsa ou cliente **elegível para o proprietário** (região Global ou Brasil, ou um pagador direto) que pague pela medição.
  2. Custo de compra e saque do SOL verificado, com custo total abaixo de 10% do prêmio esperado.
  3. Permissão da sessão concedida explicitamente pelo proprietário.
- **Sucesso da rodada:** pelo menos 6 validadores em pelo menos 3 clientes medidos, e pelo menos 80% das transações de teste localizadas no slot do líder-alvo.
- **Encerramento da rodada:** atingir o teto de 0,005 SOL ou 2 rodadas sem 50% de inclusão.
- **Encerramento do EXP-008:** nenhuma condição para reabrir aparece até 05/11/2026, a data da vaga original. Nesse caso, fica só como código aberto.

## Passos (para quem rodar)
```
cd experimentos/exp008-txorder
pip install -r requirements.txt && python -m unittest discover -s tests   # 9 testes
python -m txorder.cli plan                                                  # dry-run na mainnet, não envia nada
# somente com autorização + carteira dedicada com ≈0,01 SOL em keys/master.json:
python -m txorder.cli run --live --cap-sol 0.005
python -m txorder.cli collect --run <RUN_ID>
python -m txorder.cli analyze
```
