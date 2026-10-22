"""Minimal JSON-RPC client (stdlib only) with retries."""
import json
import time
import urllib.error
import urllib.request


class RpcError(RuntimeError):
    pass


class Rpc:
    def __init__(self, url: str, timeout: float = 30.0, retries: int = 4):
        self.url, self.timeout, self.retries = url, timeout, retries

    def call(self, method: str, params=None):
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}).encode()
        delay = 0.5
        for attempt in range(self.retries + 1):
            try:
                req = urllib.request.Request(self.url, data=body, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    out = json.load(r)
                if "error" in out:
                    raise RpcError(f"{method}: {out['error']}")
                return out["result"]
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                if attempt == self.retries:
                    raise RpcError(f"{method}: {e}") from e
            except urllib.error.HTTPError as e:  # pragma: no cover - network dependent
                if e.code != 429 or attempt == self.retries:
                    raise RpcError(f"{method}: HTTP {e.code}") from e
            time.sleep(delay)
            delay *= 2
