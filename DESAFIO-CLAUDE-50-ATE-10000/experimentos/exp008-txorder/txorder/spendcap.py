"""Persistent spend ledger. Every lamport that can leave the master wallet passes through here."""
import json
import os
import threading

BASE_FEE_PER_SIGNATURE = 5_000  # lamports


def max_tx_cost(signatures: int, cu_limit: int, cu_price_micro: int) -> int:
    """Upper bound of the fee a transaction can be charged: base fee + priority fee (rounded up)."""
    priority = -(-cu_limit * cu_price_micro // 1_000_000)
    return BASE_FEE_PER_SIGNATURE * signatures + priority


class SpendCapExceeded(RuntimeError):
    pass


class SpendLedger:
    """Reserves the worst-case cost BEFORE a transaction is sent; refuses once the cap would be crossed.

    The ledger file lives on the mounted volume so the cap survives restarts and repeated runs.
    """

    def __init__(self, path: str, cap_lamports: int):
        self.path, self.cap = path, cap_lamports
        self._lock = threading.Lock()
        self.spent = 0
        if os.path.exists(path):
            with open(path) as f:
                self.spent = json.load(f)["reserved_lamports"]

    def reserve(self, lamports: int, note: str) -> None:
        with self._lock:
            if self.spent + lamports > self.cap:
                raise SpendCapExceeded(
                    f"refusing '{note}': {self.spent} + {lamports} > cap {self.cap} lamports")
            self.spent += lamports
            tmp = self.path + ".tmp"
            with open(tmp, "w") as f:
                json.dump({"reserved_lamports": self.spent, "cap_lamports": self.cap, "last": note}, f)
            os.replace(tmp, self.path)

    @property
    def remaining(self) -> int:
        return self.cap - self.spent
