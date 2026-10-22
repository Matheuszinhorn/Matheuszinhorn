# txorder — how do Solana leaders order transactions inside their blocks?

A measurement tool. It sends small, cheap probe transactions into the leader windows of chosen validators on **mainnet**, then reads the produced blocks back and tests two candidate rules for each validator:

- **Price rule:** do probes that pay a higher compute-unit price land earlier in the block?
- **Arrival rule (FIFO):** do probes that were sent earlier land earlier?

It can also return **neither**: "no rule / it's noise" is a valid, reported outcome.

```
docker compose up                                   # mainnet DRY-RUN: plans windows, builds + signs probes, sends nothing
docker compose run --rm txorder run --live          # real sending; hard fee cap 0.05 SOL (override: --cap-sol)
docker compose run --rm txorder collect --run <ID>  # fetch the blocks, locate every probe
docker compose run --rm txorder analyze             # per-validator statistics -> data/results.json
```

Without Docker: `pip install -r requirements.txt && python -m txorder.cli plan` (same commands).

**Keys:** the master keypair is read from `/keys/master.json` (volume) or `MASTER_KEYPAIR` (env). It is never in the repo. `keys/` and the lane keys under `data/keys/` are git-ignored.
**Safety:** dry-run is the default. Sending requires `run --live` **and** a mounted key, and every lamport goes through a persistent spend ledger that refuses any transaction that would cross the cap.

## Experiment design

| Element | Choice | Why |
|---|---|---|
| Validators | Picked from `getClusterNodes.clientId` + `version`, up to 2 per client, highest stake first, among those with a leader window in the next `--horizon` slots | Covers many clients (Agave, JitoLabs, AgaveBam, HarmonicAgave, Rakurai, Firedancer, FireBAM, HarmonicFiredancer at the time of writing); the client is recorded per measurement |
| Window | A leader's 4-slot rotation (`NUM_CONSECUTIVE_LEADER_SLOTS`) | Ordering is the leader's decision; back-to-back rotations of the same validator are kept separate |
| Probe | `SetComputeUnitLimit(2000)` + `SetComputeUnitPrice(p)` + `Memo(tag)` | Cheap and deterministic; the memo tag makes each probe identifiable in the raw data |
| Batch | 8 probes per window, from **8 different fee payers ("lanes")** | The only writable account of a probe is its own payer, so our probes never contend for the same lock; any order we see is the scheduler's choice, not a lock queue |
| Price treatment | Prices `0, 0, 10k, 10k, 100k, 100k, 1M, 1M` µlamports/CU, one per lane | Spans four orders of magnitude; duplicates give within-price comparisons |
| Order treatment | The send order is a **random permutation, independent of price**, re-drawn every window; 25 ms between sends | Separates "earlier sent" from "higher paid". If both mattered equally they could not be told apart without this |
| Timing | Send starts one slot before the window opens (`--lead-slots`) | Probes arrive while the target leads, not the previous leader |
| Evidence | Primary: our own probes. Supplementary: every non-vote transaction in the same blocks (index vs requested CU price) | As required, conclusions rest on transactions we sent |
| Statistic | Kendall tau-b **within each slot**, pooled across slots; p-value by permutation inside each slot | Positions in different slots are never compared; permutations make no normality assumption and are honest with small samples |

## What the design accounts for

- **Leader schedule and leader types:** the schedule comes from `getLeaderSchedule` for the current epoch, and leaders are mapped to client and version through gossip (`getClusterNodes`). Every probe row records the target identity, client and version, and every collected block records its actual leader (`getSlotLeaders`). Probes that land in someone else's slot are kept in the raw data but excluded from that validator's statistics (`in_target_window`).
- **Path from our backend to the executing node:** probes go to an RPC endpoint (`--rpc`/`RPC_URL`) with `skipPreflight=true, maxRetries=0`. The RPC forwards to the current and next leaders over QUIC. Retries are disabled on purpose, because a retried probe would arrive twice and blur the arrival order. **This path is the largest uncontrolled factor**: RPC forwarding, QUIC streams and stake-weighted QoS sit between our send order and the leader's arrival order. That is why the send order is randomized and the result is a correlation, not an exact replay.
- **Interaction of our transactions with each other:** there are no shared writable accounts (one payer per lane), so the probes do not conflict with each other. They do compete for block space and scheduler slots the same way any transaction does.
- **Competition inside the block:** other users' transactions are recorded (index, fee, CU, requested price) for the supplementary check, and the analysis reports how many probes landed and in which slot.
- **Send order:** randomized per window and logged with nanosecond timestamps (`t_send_ns`).
- **Noise versus rule:** tau near 0 with a high permutation p-value means no detectable rule. We report it as such and do not over-fit.
- **Alpenglow (21 Oct 2026):** all measurements are taken after the upgrade and dated in `REPORT.md`. No run mixes the two periods.
- **Jito bundles and tips:** not used and not analysed. The probes are plain transactions. Jito-Solana leaders are measured only through their normal scheduler.

## What it does NOT separate

- Network/RPC delay from scheduler behaviour. FIFO measured here is FIFO **by our send time**, not by the leader's receive time, which we cannot observe.
- Per-leader quirks from per-client behaviour. With about 2 validators per client, a result is a statement about those validators, not a proof about the client.
- Price-per-CU from total priority fee. All probes have the same CU limit, so the two are proportional here.
- Microblock or entry boundaries. Position is the transaction index in the block; entries are not reconstructed.

## Cost and spend cap

A probe costs at most `5000 + ceil(2000 × price / 1e6)` lamports, which is at most 7,000 lamports. A typical run (≈40 windows × 8 probes) reserves about 0.0023 SOL in fees. Lanes are funded with a small refundable float (rent-exempt minimum plus fees) and refunded to the master wallet at the end of every run, even on errors (`finally`). The spend ledger (`data/spend_ledger.json`) survives restarts, so repeated runs cannot add up past the cap.

## Raw data (for judges)

`data/runs/<RUN_ID>/`:
- `plan.json`: targets, windows and parameters.
- `probes.jsonl`: one row per probe: signature, lane, price, send order, `t_send_ns`, target identity, client and version, RPC response.
- `landed.jsonl`: the same rows plus `slot`, `index`, actual `leader`, `in_target_window` and signature status.
- `blocks/<slot>.json.gz`: per-transaction summary of every block a probe landed in.

Every claim can be re-checked with `getBlock(<slot>)` and the listed signatures.

## Development path used

1. Unit tests (`python -m unittest discover -s tests`): spend cap, statistics, base58 and compute-budget parsing, window splitting.
2. **Localnet** (`solana-test-validator` 3.0.10): a full live run, collect and analyze on a single-leader chain. See `data/localnet-baseline/` and REPORT.md.
3. **Mainnet dry-run**: real leader schedule, real targets, probes built and signed, nothing sent.
4. **Mainnet live**: with the spend cap. See REPORT.md.

Devnet was skipped: the public faucets returned HTTP 429 from our network. The localnet run covers the same pipeline.
