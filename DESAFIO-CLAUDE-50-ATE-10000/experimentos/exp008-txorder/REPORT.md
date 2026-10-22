# Report

All dates and times are UTC.

## Measurements

| Date | Network | Run | Validators (client, version) | Windows | Probes sent / landed | Result |
|---|---|---|---|---|---|---|
| 2026-10-22 11:36 | localnet (solana-test-validator 3.0.10, Agave) | `20261022T113630Z` | 1 (`unknown` client id, 3.0.10) | 4 | 32 / 32 | **FIFO**: tau(position, send order) = **+1.00**, p = 0.0005. **No price effect**: tau(position, price) = −0.14, p = 0.40 |
| — | mainnet | pending | target set: ≥ 6 validators across ≥ 4 clients | — | — | — |

Raw data: `data/localnet-baseline/`.

### Reading the localnet baseline
On an empty, single-leader chain with no contention, the Agave scheduler emitted our probes exactly in send order, and the compute-unit price did not change their position. This is the expected behaviour when nothing competes for the block. It works as a pipeline check (all 32 probes were located by signature, slot and index) and as the null baseline for mainnet, where blocks are full and prices should start to matter.

## Mainnet results
_To be filled by the `analyze` step after the live run (`data/results.json`)._

## What went wrong (so far)

1. **Window grouping bug, caught on localnet.** The first version merged back-to-back leader rotations of the same validator into one "window", which on localnet became one window spanning the whole horizon. Windows are now split on the protocol's 4-slot rotation boundaries (test `Windows.test_split_by_rotation`).
2. **Lost windows during funding, caught on localnet.** A fixed 20 s sleep after funding the lanes meant the first planned windows had already passed. The plan is now computed after funding is confirmed, by polling balances.
3. **Devnet faucet unavailable.** `requestAirdrop` returned HTTP 429 on devnet and testnet. The localnet run replaced devnet for the end-to-end test.
4. **Container not built in the development sandbox.** Docker Hub returned 429 for anonymous pulls, and running a test build through the sandbox's network proxy was not permitted. The Python code is validated natively (tests, localnet, mainnet dry-run). The Dockerfile only installs `requirements.txt` and runs the unit tests at build time, so a build failure would show immediately. If Docker Hub limits you too, the base image can be swapped: `BASE_IMAGE=mirror.gcr.io/library/python:3.12-slim docker compose build`.
5. **An early statistical mistake, caught in review.** The first draft concatenated positions from different slots before computing tau. Tau is now pooled strictly within slots (`stratified_tau`), with a test proving that cross-slot pairs are never compared.
