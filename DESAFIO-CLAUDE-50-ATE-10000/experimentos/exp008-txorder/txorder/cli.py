"""Command line: plan (dry-run, default) → run --live → collect → analyze.

Nothing is ever sent unless `run --live` is given AND a master keypair is mounted. All spending goes through
SpendLedger, whose cap defaults to 0.05 SOL.
"""
import argparse
import datetime as dt
import gzip
import json
import os
import random
import sys
import time

from solders.hash import Hash
from solders.keypair import Keypair

from . import analyze as an
from .blocks import get_block, summarize
from .cluster import leader_slots, pick_targets, validator_table, windows
from .rpc import Rpc
from .spendcap import SpendLedger, max_tx_cost
from .txbuild import RENT_EXEMPT_EMPTY, probe_tx, transfer_tx

CLUSTERS = {"mainnet": "https://api.mainnet-beta.solana.com", "devnet": "https://api.devnet.solana.com"}
PRICES = [0, 0, 10_000, 10_000, 100_000, 100_000, 1_000_000, 1_000_000]  # micro-lamports per CU, one per lane
CU_LIMIT = 2_000
LAMPORTS_PER_SOL = 1_000_000_000


def now_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds")


def log(msg):
    print(f"[{now_iso()}] {msg}", flush=True)


def load_keypair(path):
    with open(path) as f:
        return Keypair.from_bytes(bytes(json.load(f)))


def lanes(data_dir, n, persist):
    """Lane keypairs: one fee payer per probe slot so our own probes never share a writable account."""
    path = os.path.join(data_dir, "keys", "lanes.json")
    if os.path.exists(path):
        with open(path) as f:
            return [Keypair.from_bytes(bytes(k)) for k in json.load(f)]
    ks = [Keypair() for _ in range(n)]
    if persist:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump([list(bytes(k)) for k in ks], f)
        os.chmod(path, 0o600)
    return ks


def plan(args, rpc):
    table = validator_table(rpc)
    start = rpc.call("getSlot", [{"commitment": "processed"}]) + args.lead_slots + 30
    sched = leader_slots(rpc, [r["identity"] for r in table], start, args.horizon)
    if args.identities:
        targets = [r for r in table if r["identity"] in set(args.identities.split(",")) and r["identity"] in sched]
    else:
        targets = pick_targets(table, sched, per_client=args.per_client, min_clients=args.min_clients, seed=args.seed)
    jobs = []
    for t in targets:
        for w in windows(sched[t["identity"]])[: args.reps]:
            jobs.append({**t, "window": w})
    jobs.sort(key=lambda j: j["window"][0])
    fee = len(jobs) * len(PRICES) * max(max_tx_cost(1, CU_LIMIT, p) for p in PRICES)
    return {"created": now_iso(), "start_slot": start, "horizon": args.horizon, "targets": targets, "jobs": jobs,
            "probes_per_window": len(PRICES), "prices": PRICES, "cu_limit": CU_LIMIT,
            "max_probe_fees_lamports": fee}


def cmd_plan(args):
    rpc = Rpc(args.rpc)
    p = plan(args, rpc)
    os.makedirs(args.data, exist_ok=True)
    with open(os.path.join(args.data, "plan.json"), "w") as f:
        json.dump(p, f, indent=1)
    clients = sorted({t["client"] for t in p["targets"]})
    log(f"DRY-RUN plan: {len(p['targets'])} validators, clients={clients}, {len(p['jobs'])} windows")
    for j in p["jobs"]:
        log(f"  slots {j['window'][0]}-{j['window'][-1]}  {j['client']:<18} {j['version']:<10} {j['identity']}")
    # Build (and sign with throwaway keys) one batch to prove the transactions are well formed.
    ks = lanes(args.data, len(PRICES), persist=False)
    bh = Hash.from_string(rpc.call("getLatestBlockhash")["value"]["blockhash"])
    sizes = [len(bytes(probe_tx(k, bh, CU_LIMIT, pr, "txorder:dry-run"))) for k, pr in zip(ks, PRICES)]
    log(f"built {len(sizes)} probe txs (bytes: {min(sizes)}-{max(sizes)}); worst-case probe fees "
        f"{p['max_probe_fees_lamports']} lamports = {p['max_probe_fees_lamports'] / LAMPORTS_PER_SOL:.6f} SOL. "
        "Nothing was sent.")


def wait_for_slot(rpc, target, poll=0.08, deadline_s=900):
    t0 = time.time()
    while time.time() - t0 < deadline_s:
        s = rpc.call("getSlot", [{"commitment": "processed"}])
        if s >= target:
            return s
        time.sleep(poll if target - s < 5 else 0.4)
    raise TimeoutError(f"slot {target} not reached")


def send_raw(rpc, tx):
    import base64
    return rpc.call("sendTransaction", [base64.b64encode(bytes(tx)).decode(),
                                        {"encoding": "base64", "skipPreflight": True, "maxRetries": 0}])


def fund_lanes(rpc, master, ks, ledger, amount):
    bh = Hash.from_string(rpc.call("getLatestBlockhash")["value"]["blockhash"])
    for k in ks:
        bal = rpc.call("getBalance", [str(k.pubkey())])["value"]
        if bal >= amount:
            continue
        ledger.reserve(max_tx_cost(1, 200_000, 0), f"fund {k.pubkey()}")
        sig = send_raw(rpc, transfer_tx(master, k.pubkey(), amount - bal, bh))
        log(f"funded lane {k.pubkey()} sig={sig}")
    for _ in range(60):  # wait until every lane holds its float (confirmed), not a fixed sleep
        if all(rpc.call("getBalance", [str(k.pubkey()), {"commitment": "confirmed"}])["value"] >= amount for k in ks):
            return
        time.sleep(1)
    raise RuntimeError("lane funding not confirmed after 60 s")


def refund_lanes(rpc, master, ks, ledger):
    bh = Hash.from_string(rpc.call("getLatestBlockhash")["value"]["blockhash"])
    for k in ks:
        bal = rpc.call("getBalance", [str(k.pubkey())])["value"]
        if bal <= 5_000:
            continue
        ledger.reserve(5_000, f"refund {k.pubkey()}")
        sig = send_raw(rpc, transfer_tx(k, master.pubkey(), bal - 5_000, bh))
        log(f"refunded lane {k.pubkey()} -> master sig={sig}")


def cmd_run(args):
    if not args.live:
        log("run without --live is a dry-run: delegating to `plan`.")
        return cmd_plan(args)
    key = os.environ.get("MASTER_KEYPAIR", "/keys/master.json")
    if not os.path.exists(key):
        sys.exit(f"--live needs a master keypair mounted at {key} (volume/env only, never in the repo)")
    rpc, master = Rpc(args.rpc), load_keypair(key)
    ledger = SpendLedger(os.path.join(args.data, "spend_ledger.json"), int(args.cap_sol * LAMPORTS_PER_SOL))
    ks = lanes(args.data, len(PRICES), persist=True)
    max_windows = args.reps * args.per_client * 12  # upper bound used only to size the lane float
    per_lane = RENT_EXEMPT_EMPTY + (max_windows + 2) * max_tx_cost(1, CU_LIMIT, max(PRICES))
    fund_lanes(rpc, master, ks, ledger, per_lane)
    p = plan(args, rpc)  # planned AFTER funding so no window is lost while funding confirms
    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = os.path.join(args.data, "runs", run_id)
    os.makedirs(run_dir, exist_ok=True)
    with open(os.path.join(run_dir, "plan.json"), "w") as f:
        json.dump(p, f, indent=1)
    log(f"LIVE run {run_id}: {len(p['jobs'])} windows, cap {args.cap_sol} SOL, ledger reserved so far {ledger.spent}")
    rng = random.Random(args.seed)
    probes_path = os.path.join(run_dir, "probes.jsonl")
    try:
        for wi, job in enumerate(p["jobs"]):
            w0 = job["window"][0]
            if rpc.call("getSlot", [{"commitment": "processed"}]) >= w0 - 1:
                log(f"skip window {w0}: already passed")
                continue
            order = list(range(len(PRICES)))
            rng.shuffle(order)  # send order is randomized independently of price
            wait_for_slot(rpc, w0 - args.lead_slots)
            bh = Hash.from_string(rpc.call("getLatestBlockhash")["value"]["blockhash"])
            batch = []
            for send_order, lane in enumerate(order):
                price = PRICES[lane]
                ledger.reserve(max_tx_cost(1, CU_LIMIT, price), f"probe w{wi} lane{lane}")
                tag = f"txorder:{run_id}:w{wi}:l{lane}:p{price}:o{send_order}"
                tx = probe_tx(ks[lane], bh, CU_LIMIT, price, tag)
                batch.append((send_order, lane, price, tx))
            slot_at_send = rpc.call("getSlot", [{"commitment": "processed"}])
            with open(probes_path, "a") as f:
                for send_order, lane, price, tx in batch:
                    t_ns = time.time_ns()
                    try:
                        res = send_raw(rpc, tx)
                        err = None
                    except Exception as e:  # recorded, never retried: retries would change arrival order
                        res, err = None, str(e)
                    f.write(json.dumps({"run": run_id, "window_id": wi, "target": job["identity"],
                                        "client": job["client"], "version": job["version"],
                                        "window": job["window"], "slot_at_send": slot_at_send,
                                        "sig": str(tx.signatures[0]), "lane": lane, "cu_price": price,
                                        "cu_limit": CU_LIMIT, "send_order": send_order, "t_send_ns": t_ns,
                                        "rpc": args.rpc, "send_result": res, "send_error": err}) + "\n")
                    time.sleep(args.gap_ms / 1000)
            log(f"window {wi} {job['client']} slots {w0}-{job['window'][-1]} sent {len(batch)} probes")
    finally:
        refund_lanes(rpc, master, ks, ledger)
        log(f"ledger reserved {ledger.spent} lamports of cap {ledger.cap}")
    log(f"raw probes: {probes_path}. Next: collect --run {run_id} (wait ~1 min for finality)")


def cmd_collect(args):
    rpc = Rpc(args.rpc)
    run_dir = os.path.join(args.data, "runs", args.run)
    probes = an.load_jsonl(os.path.join(run_dir, "probes.jsonl"))
    sigs = [p["sig"] for p in probes]
    statuses = {}
    for i in range(0, len(sigs), 256):
        chunk = sigs[i:i + 256]
        res = rpc.call("getSignatureStatuses", [chunk, {"searchTransactionHistory": True}])["value"]
        statuses.update({s: r for s, r in zip(chunk, res)})
    slots = sorted({st["slot"] for st in statuses.values() if st})
    os.makedirs(os.path.join(run_dir, "blocks"), exist_ok=True)
    where, leaders = {}, {}
    for slot in slots:
        summ = summarize(get_block(rpc, slot), slot)
        if not summ:
            continue
        leaders[slot] = (rpc.call("getSlotLeaders", [slot, 1]) or [None])[0]
        summ["leader"] = leaders[slot]
        with gzip.open(os.path.join(run_dir, "blocks", f"{slot}.json.gz"), "wt") as f:
            json.dump(summ, f)
        for t in summ["txs"]:
            where[t["sig"]] = (slot, t["i"])
    with open(os.path.join(run_dir, "landed.jsonl"), "w") as f:
        for p in probes:
            slot, idx = where.get(p["sig"], (None, None))
            f.write(json.dumps({**p, "slot": slot, "index": idx, "leader": leaders.get(slot),
                                "in_target_window": slot in p["window"] if slot else False,
                                "status": statuses.get(p["sig"])}) + "\n")
    log(f"collected {len(slots)} blocks; {sum(1 for p in probes if p['sig'] in where)}/{len(probes)} probes landed")


def cmd_analyze(args):
    rows = []
    for run in sorted(os.listdir(os.path.join(args.data, "runs"))):
        path = os.path.join(args.data, "runs", run, "landed.jsonl")
        if os.path.exists(path):
            rows += an.load_jsonl(path)
    by_target = {}
    for r in rows:
        by_target.setdefault((r["client"], r["version"], r["target"]), []).append(r)
    out = []
    for (client, version, target), rs in sorted(by_target.items()):
        own = [dict(r, index=r["index"] if r["in_target_window"] else None) for r in rs]
        out.append({"client": client, "version": version, "validator": target,
                    "windows": len({r["window_id"] for r in rs}), **an.window_stats(own)})
    with open(os.path.join(args.data, "results.json"), "w") as f:
        json.dump(out, f, indent=1)
    for o in out:
        log(json.dumps(o))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="txorder")
    ap.add_argument("command", nargs="?", default="plan", choices=["plan", "run", "collect", "analyze"])
    ap.add_argument("--cluster", default="mainnet", choices=sorted(CLUSTERS))
    ap.add_argument("--rpc", default=None, help="RPC URL (defaults to the public endpoint of --cluster)")
    ap.add_argument("--data", default=os.environ.get("DATA_DIR", "data"))
    ap.add_argument("--live", action="store_true", help="actually send transactions (default: dry-run)")
    ap.add_argument("--cap-sol", type=float, default=0.05, help="hard cap on fees, in SOL")
    ap.add_argument("--horizon", type=int, default=1800, help="slots ahead to search for leader windows")
    ap.add_argument("--reps", type=int, default=3, help="windows per validator")
    ap.add_argument("--per-client", type=int, default=2)
    ap.add_argument("--min-clients", type=int, default=3)
    ap.add_argument("--identities", default="", help="comma-separated validator identities (overrides auto-pick)")
    ap.add_argument("--lead-slots", type=int, default=1, help="send this many slots before the window opens")
    ap.add_argument("--gap-ms", type=float, default=25.0, help="spacing between consecutive sends")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--run", default="")
    args = ap.parse_args(argv)
    args.rpc = args.rpc or os.environ.get("RPC_URL") or CLUSTERS[args.cluster]
    {"plan": cmd_plan, "run": cmd_run, "collect": cmd_collect, "analyze": cmd_analyze}[args.command](args)


if __name__ == "__main__":
    main()
