"""Baixa candles da API pública da Coinbase Exchange (sem autenticação) e salva em CSV."""
import csv, json, subprocess, time, datetime as dt

def candles(prod, gran, inicio, fim):
    out, t = {}, inicio
    while t < fim:
        t2 = min(t + dt.timedelta(seconds=gran * 300), fim)
        u = f"https://api.exchange.coinbase.com/products/{prod}/candles?granularity={gran}&start={t.isoformat().replace('+', '%2B')}&end={t2.isoformat().replace('+', '%2B')}"
        for tent in range(3):
            try:
                for ts, lo, hi, op, cl, vol in json.loads(subprocess.run(["curl", "-s", "-m", "30", u], capture_output=True, text=True).stdout):
                    out[ts] = (ts, op, hi, lo, cl, vol)
                break
            except Exception:
                time.sleep(2)
        t = t2
        time.sleep(0.35)
    return [out[k] for k in sorted(out)]

if __name__ == "__main__":
    fim = dt.datetime(2026, 10, 24, tzinfo=dt.timezone.utc)
    for prod in ["BTC-USD", "ETH-USD", "SOL-USD"]:
        for gran, anos in [(86400, 4), (21600, 2)]:
            rows = candles(prod, gran, fim - dt.timedelta(days=365 * anos), fim)
            with open(f"{prod}-{gran}.csv", "w", newline="") as f:
                w = csv.writer(f); w.writerow(["ts", "open", "high", "low", "close", "volume"]); w.writerows(rows)
            print(prod, gran, len(rows), dt.datetime.fromtimestamp(rows[0][0], dt.timezone.utc).date(), "→", dt.datetime.fromtimestamp(rows[-1][0], dt.timezone.utc).date())
