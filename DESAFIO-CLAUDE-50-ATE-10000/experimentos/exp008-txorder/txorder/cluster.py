"""Identify validators, their client software and stake, and pick measurement targets."""
import collections
import random


def validator_table(rpc):
    nodes = {n["pubkey"]: n for n in rpc.call("getClusterNodes")}
    rows = []
    for v in rpc.call("getVoteAccounts")["current"]:
        n = nodes.get(v["nodePubkey"])
        if not n:
            continue
        rows.append({"identity": v["nodePubkey"], "vote": v["votePubkey"], "stake": v["activatedStake"],
                     "client": n.get("clientId") or "unknown", "version": n.get("version") or "unknown",
                     "tpu_quic": n.get("tpuQuic")})
    return rows


def leader_slots(rpc, identities, start_slot, horizon):
    """Map identity -> sorted absolute slots it leads within [start_slot, start_slot + horizon)."""
    epoch = rpc.call("getEpochInfo")
    first = epoch["absoluteSlot"] - epoch["slotIndex"]
    sched = rpc.call("getLeaderSchedule", [None, {}]) or {}
    out = {}
    for ident in identities:
        slots = sorted(first + i for i in sched.get(ident, []) if start_slot <= first + i < start_slot + horizon)
        if slots:
            out[ident] = slots
    return out


NUM_CONSECUTIVE_LEADER_SLOTS = 4


def windows(slots):
    """Group leader slots into windows: consecutive slots inside the same 4-slot leader rotation.

    A validator can hold several rotations in a row; each rotation is a separate window.
    """
    groups, cur = [], []
    for s in slots:
        if cur and (s != cur[-1] + 1 or s // NUM_CONSECUTIVE_LEADER_SLOTS != cur[-1] // NUM_CONSECUTIVE_LEADER_SLOTS):
            groups.append(cur)
            cur = []
        cur.append(s)
    if cur:
        groups.append(cur)
    return groups


def pick_targets(table, schedule, per_client=2, min_clients=3, seed=0):
    """Pick up to `per_client` validators per client that lead at least once in the horizon.

    Highest-stake leaders first (more windows, less schedule risk); ties broken with a fixed seed.
    """
    rng = random.Random(seed)
    by_client = collections.defaultdict(list)
    for row in table:
        if row["identity"] in schedule:
            by_client[row["client"]].append(row)
    picked = []
    for client, rows in sorted(by_client.items(), key=lambda kv: -sum(r["stake"] for r in kv[1])):
        rng.shuffle(rows)
        rows.sort(key=lambda r: -r["stake"])
        picked += rows[:per_client]
    clients = {r["client"] for r in picked}
    if len(clients) < min_clients:
        raise RuntimeError(f"only {len(clients)} clients lead in the horizon; widen it")
    return picked
