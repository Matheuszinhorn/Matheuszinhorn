"""Backtest spot long-only, sem alavancagem. Sinal no fechamento da barra t, execução na abertura de t+1.
Seleção de parâmetros só no trecho dentro da amostra (70% iniciais); avaliação no trecho fora da amostra (30% finais)."""
import csv, itertools, json, math, sys

def ler(f):
    r = list(csv.DictReader(open(f)))
    return {k: [float(x[k]) for x in r] for k in ["ts", "open", "high", "low", "close", "volume"]}

def sma(x, n):
    out, s = [None] * len(x), 0.0
    for i, v in enumerate(x):
        s += v
        if i >= n: s -= x[i - n]
        if i >= n - 1: out[i] = s / n
    return out

def rsi(x, n=2):
    out = [None] * len(x); g = l = 0.0
    for i in range(1, len(x)):
        d = x[i] - x[i - 1]; up, dn = max(d, 0), max(-d, 0)
        if i <= n: g += up / n; l += dn / n
        else: g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n
        if i >= n: out[i] = 100 if l == 0 else 100 - 100 / (1 + g / l)
    return out

def sinais(D, est, p):
    c, v, n = D["close"], D["volume"], len(D["close"])
    pos, s = [0] * n, 0
    if est == "sma":
        f, sl = sma(c, p["f"]), sma(c, p["s"])
        for i in range(n): pos[i] = 1 if (f[i] and sl[i] and f[i] > sl[i]) else 0
    elif est == "momentum":
        L = p["L"]
        for i in range(n): pos[i] = 1 if i >= L and c[i] > c[i - L] else 0
    elif est == "rsi2":
        r, m5, m200 = rsi(c, 2), sma(c, 5), sma(c, 200)
        for i in range(n):
            if s == 0 and r[i] is not None and r[i] < p["e"] and m200[i] and c[i] > m200[i]: s = 1
            elif s == 1 and m5[i] and c[i] > m5[i]: s = 0
            pos[i] = s
    elif est == "breakout":
        N, M, k = p["N"], p["N"] // 2, p["k"]; va = sma(v, 20)
        for i in range(n):
            if i > N:
                hi = max(D["high"][i - N:i]); lo = min(D["low"][i - M:i])
                if s == 0 and c[i] > hi and va[i] and v[i] > k * va[i]: s = 1
                elif s == 1 and c[i] < lo: s = 0
            pos[i] = s
    return pos

def simular(D, pos, a, b, custo):
    """Executa na abertura de i+1 a posição decidida em i. Retorna equity, trades."""
    o, eq, cash, units, trades, curva, entrada = D["open"], 1.0, 1.0, 0.0, [], [], None
    for i in range(a, b - 1):
        alvo = pos[i]
        px = o[i + 1]
        if alvo == 1 and units == 0:
            units = cash * (1 - custo) / px; cash = 0.0; entrada = (D["ts"][i + 1], px)
        elif alvo == 0 and units > 0:
            cash = units * px * (1 - custo); trades.append((entrada[0], entrada[1], D["ts"][i + 1], px, px / entrada[1] - 1)); units = 0.0
        curva.append(cash + units * D["close"][i + 1])
    if units > 0:
        px = D["close"][b - 1]; cash = units * px * (1 - custo); trades.append((entrada[0], entrada[1], D["ts"][b - 1], px, px / entrada[1] - 1)); curva.append(cash)
    return curva, trades

def metricas(curva, barras_ano):
    if not curva: return dict(ret=0, cagr=0, mdd=0)
    pico, mdd = curva[0], 0
    for x in curva: pico = max(pico, x); mdd = min(mdd, x / pico - 1)
    anos = len(curva) / barras_ano
    return dict(ret=curva[-1] - 1, cagr=curva[-1] ** (1 / anos) - 1 if anos > 0 and curva[-1] > 0 else -1, mdd=mdd)

GRADES = {
    "sma": [dict(f=f, s=s) for f, s in itertools.product([10, 20, 50], [50, 100, 200]) if f < s],
    "momentum": [dict(L=L) for L in [20, 60, 120]],
    "rsi2": [dict(e=e) for e in [5, 10, 20]],
    "breakout": [dict(N=N, k=k) for N, k in itertools.product([20, 55], [1.0, 1.5])],
}

if __name__ == "__main__":
    res, log = [], []
    for ativo in ["BTC-USD", "ETH-USD", "SOL-USD"]:
        for gran, barras_ano in [(86400, 365), (21600, 1460)]:
            D = ler(f"{ativo}-{gran}.csv"); n = len(D["close"]); corte = int(n * 0.7)
            bh_in = metricas([D["close"][i] / D["open"][300] for i in range(300, corte)], barras_ano)
            bh_out = metricas([D["close"][i] / D["open"][corte] for i in range(corte, n)], barras_ano)
            for est, grade in GRADES.items():
                melhor = None
                for p in grade:
                    pos = sinais(D, est, p)
                    cin, _ = simular(D, pos, 300, corte, 0.0012)
                    m = metricas(cin, barras_ano); score = m["ret"] / (abs(m["mdd"]) + 0.05)
                    if melhor is None or score > melhor[0]: melhor = (score, p, m)
                _, p, m_in = melhor; pos = sinais(D, est, p)
                cout, tr = simular(D, pos, corte, n, 0.0012)
                cout3, _ = simular(D, pos, corte, n, 0.0030)
                m_out, m_out3 = metricas(cout, barras_ano), metricas(cout3, barras_ano)
                res.append(dict(ativo=ativo, tf="1d" if gran == 86400 else "6h", est=est, params=p, in_ret=m_in["ret"], in_mdd=m_in["mdd"],
                                out_ret=m_out["ret"], out_mdd=m_out["mdd"], out_ret_custo030=m_out3["ret"], trades_out=len(tr),
                                bh_out_ret=bh_out["ret"], bh_out_mdd=bh_out["mdd"]))
                for t in tr: log.append([ativo, res[-1]["tf"], est, json.dumps(p), int(t[0]), round(t[1], 2), int(t[2]), round(t[3], 2), round(t[4] * 100, 3)])
    json.dump(res, open("resultados.json", "w"), indent=1)
    with open("operacoes-simuladas-fora-da-amostra.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["ativo", "tf", "estrategia", "parametros", "ts_entrada", "preco_entrada", "ts_saida", "preco_saida", "retorno_bruto_pct"]); w.writerows(log)
    print(f"{'ativo':8} {'tf':3} {'estratégia':9} {'parâmetros':18} {'IN ret':>8} {'OUT ret':>8} {'OUT mdd':>8} {'OUT@0,3%':>9} {'trades':>6} | {'B&H OUT':>8} {'B&H mdd':>8}")
    for r in res:
        print(f"{r['ativo']:8} {r['tf']:3} {r['est']:9} {json.dumps(r['params']):18} {r['in_ret']*100:7.1f}% {r['out_ret']*100:7.1f}% {r['out_mdd']*100:7.1f}% {r['out_ret_custo030']*100:8.1f}% {r['trades_out']:6d} | {r['bh_out_ret']*100:7.1f}% {r['bh_out_mdd']*100:7.1f}%")
    ganha_caixa = sum(r["out_ret"] > 0 for r in res); ganha_bh = sum(r["out_ret"] > r["bh_out_ret"] for r in res)
    print(f"\nFora da amostra: {ganha_caixa}/{len(res)} com retorno líquido > 0 (melhor que ficar em caixa); {ganha_bh}/{len(res)} melhores que comprar e segurar; operações simuladas registradas: {len(log)}")
