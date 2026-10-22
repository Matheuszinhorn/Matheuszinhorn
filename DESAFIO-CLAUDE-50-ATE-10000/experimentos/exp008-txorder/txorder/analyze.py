"""Statistics: is the in-block position explained by priority price, by send order, or by neither?"""
import itertools
import json
import random


def _pair_counts(xs, ys):
    conc = disc = tx = ty = 0
    for (x1, y1), (x2, y2) in itertools.combinations(zip(xs, ys), 2):
        dx, dy = (x1 > x2) - (x1 < x2), (y1 > y2) - (y1 < y2)
        if dx == 0 and dy == 0:
            continue
        if dx == 0:
            tx += 1
        elif dy == 0:
            ty += 1
        elif dx == dy:
            conc += 1
        else:
            disc += 1
    return conc, disc, tx, ty


def _tau(c, d, tx, ty):
    denom = ((c + d + tx) * (c + d + ty)) ** 0.5
    return None if denom == 0 else (c - d) / denom


def kendall_tau(xs, ys):
    """Tau-b without scipy. None when undefined."""
    return _tau(*_pair_counts(xs, ys))


def stratified_tau(groups):
    """Tau-b pooled over groups: only pairs INSIDE the same group are compared.

    groups: list of (xs, ys). Positions from different slots are never compared with each other.
    """
    c = d = tx = ty = 0
    for xs, ys in groups:
        a, b, e, f = _pair_counts(xs, ys)
        c, d, tx, ty = c + a, d + b, tx + e, ty + f
    return _tau(c, d, tx, ty)


def stratified_permutation_p(groups, observed, n=2000, seed=0):
    """Two-sided p-value: shuffle ys within each group, recompute the pooled tau."""
    if observed is None:
        return None
    rng = random.Random(seed)
    hits = 0
    for _ in range(n):
        shuffled = []
        for xs, ys in groups:
            ys = list(ys)
            rng.shuffle(ys)
            shuffled.append((xs, ys))
        t = stratified_tau(shuffled)
        if t is not None and abs(t) >= abs(observed) - 1e-12:
            hits += 1
    return (hits + 1) / (n + 1)


def window_stats(probes):
    """probes: dicts with index (position in block), slot, cu_price, send_order. Unlanded probes have index None.

    tau_position_vs_price < 0 means higher price lands earlier; tau_position_vs_send_order > 0 means
    earlier-sent probes land earlier (FIFO). Both are computed only between probes in the same slot.
    """
    landed = [p for p in probes if p.get("index") is not None]
    by_slot = {}
    for p in landed:
        by_slot.setdefault(p["slot"], []).append(p)
    g_price = [([p["index"] for p in ps], [p["cu_price"] for p in ps]) for ps in by_slot.values() if len(ps) > 1]
    g_order = [([p["index"] for p in ps], [p["send_order"] for p in ps]) for ps in by_slot.values() if len(ps) > 1]
    t_price, t_order = stratified_tau(g_price), stratified_tau(g_order)
    return {"sent": len(probes), "landed": len(landed), "slots_with_probes": len(by_slot),
            "comparable_pairs": sum(len(xs) * (len(xs) - 1) // 2 for xs, _ in g_price),
            "tau_position_vs_price": t_price, "p_price": stratified_permutation_p(g_price, t_price),
            "tau_position_vs_send_order": t_order, "p_order": stratified_permutation_p(g_order, t_order, seed=1)}


def block_price_order(summary):
    """Supplementary: across ALL non-vote txs in a block, does position follow requested CU price?"""
    txs = [t for t in summary["txs"] if not t["vote"]]
    if len(txs) < 3:
        return None
    return {"non_vote_txs": len(txs),
            "tau_index_vs_price": kendall_tau([t["i"] for t in txs], [t["cu_price"] for t in txs]),
            "share_with_price": sum(1 for t in txs if t["cu_price"] > 0) / len(txs)}


def load_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]
