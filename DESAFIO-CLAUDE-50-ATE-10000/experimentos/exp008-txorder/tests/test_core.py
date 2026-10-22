import os
import tempfile
import unittest

from txorder.analyze import block_price_order, kendall_tau, stratified_tau, window_stats
from txorder.blocks import b58decode
from txorder.spendcap import SpendCapExceeded, SpendLedger, max_tx_cost


class SpendCap(unittest.TestCase):
    def test_cost_bound(self):
        self.assertEqual(max_tx_cost(1, 2000, 1_000_000), 5000 + 2000)
        self.assertEqual(max_tx_cost(1, 2000, 1), 5000 + 1)  # rounds up

    def test_refuses_over_cap_and_persists(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "ledger.json")
            led = SpendLedger(p, 10_000)
            led.reserve(6_000, "a")
            with self.assertRaises(SpendCapExceeded):
                led.reserve(5_000, "b")
            self.assertEqual(SpendLedger(p, 10_000).spent, 6_000)


class Stats(unittest.TestCase):
    def test_tau(self):
        self.assertAlmostEqual(kendall_tau([1, 2, 3], [1, 2, 3]), 1.0)
        self.assertAlmostEqual(kendall_tau([1, 2, 3], [3, 2, 1]), -1.0)

    def test_stratified_never_compares_across_groups(self):
        # inside each group positions are perfectly increasing with y; across groups they are not
        self.assertAlmostEqual(stratified_tau([([1, 2], [10, 20]), ([100, 200], [1, 2])]), 1.0)

    def test_price_priority_detected(self):
        probes = [{"slot": 7, "index": i, "cu_price": 1000 - i * 100, "send_order": (i * 3) % 8} for i in range(8)]
        st = window_stats(probes)
        self.assertAlmostEqual(st["tau_position_vs_price"], -1.0)
        self.assertLess(st["p_price"], 0.01)

    def test_unlanded_ignored(self):
        st = window_stats([{"slot": 1, "index": None, "cu_price": 1, "send_order": 0}])
        self.assertEqual(st["landed"], 0)
        self.assertIsNone(st["tau_position_vs_price"])

    def test_block_order(self):
        summ = {"txs": [{"i": i, "vote": False, "cu_price": 100 - i} for i in range(5)]}
        self.assertAlmostEqual(block_price_order(summ)["tau_index_vs_price"], -1.0)


class Base58(unittest.TestCase):
    def test_compute_budget_price(self):
        # 3 + u64(1000) little endian, encoded in base58 by the Solana JSON encoding
        import struct
        raw = bytes([3]) + struct.pack("<Q", 1000)
        alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        n, s = int.from_bytes(raw, "big"), ""
        while n:
            n, r = divmod(n, 58)
            s = alphabet[r] + s
        self.assertEqual(b58decode(s), raw)


if __name__ == "__main__":
    unittest.main()


class Windows(unittest.TestCase):
    def test_split_by_rotation(self):
        from txorder.cluster import windows
        self.assertEqual(windows([100, 101, 102, 103, 104, 105, 106, 107, 120]),
                         [[100, 101, 102, 103], [104, 105, 106, 107], [120]])
