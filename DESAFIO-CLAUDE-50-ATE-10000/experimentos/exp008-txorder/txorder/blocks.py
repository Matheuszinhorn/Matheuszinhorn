"""Fetch blocks and reduce them to the fields needed to study ordering."""
import struct

from .txbuild import COMPUTE_BUDGET

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
VOTE = "Vote111111111111111111111111111111111111111"


def b58decode(s: str) -> bytes:
    n = 0
    for ch in s:
        n = n * 58 + _B58.index(ch)
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big") if n else b""
    return b"\x00" * (len(s) - len(s.lstrip("1"))) + raw


def get_block(rpc, slot):
    try:
        return rpc.call("getBlock", [slot, {"encoding": "json", "transactionDetails": "full", "rewards": False,
                                           "maxSupportedTransactionVersion": 0, "commitment": "finalized"}])
    except Exception as e:  # skipped slot or not yet finalized
        return {"error": str(e)}


def summarize(block, slot):
    """Per transaction: index, signature, vote?, fee, CU consumed, requested CU limit and price."""
    if not block or "error" in block:
        return None
    out = []
    for i, t in enumerate(block["transactions"]):
        msg, meta = t["transaction"]["message"], t["meta"] or {}
        keys = msg["accountKeys"]
        progs = [keys[ix["programIdIndex"]] for ix in msg["instructions"] if ix["programIdIndex"] < len(keys)]
        limit, price = None, 0
        for ix in msg["instructions"]:
            if ix["programIdIndex"] < len(keys) and keys[ix["programIdIndex"]] == str(COMPUTE_BUDGET):
                d = b58decode(ix["data"])
                if d[:1] == b"\x02" and len(d) >= 5:
                    limit = struct.unpack("<I", d[1:5])[0]
                elif d[:1] == b"\x03" and len(d) >= 9:
                    price = struct.unpack("<Q", d[1:9])[0]
        out.append({"i": i, "sig": t["transaction"]["signatures"][0], "vote": VOTE in progs,
                    "fee": meta.get("fee"), "cu": meta.get("computeUnitsConsumed"), "cu_limit": limit,
                    "cu_price": price, "err": meta.get("err") is not None})
    return {"slot": slot,
            "blockhash": block.get("blockhash"), "block_time": block.get("blockTime"), "txs": out}
