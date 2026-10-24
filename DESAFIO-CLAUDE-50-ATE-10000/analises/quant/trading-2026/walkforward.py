"""Walk-forward: em cada dobra, escolhe parâmetros na janela de treino e aplica na janela de teste seguinte (nunca vista).
Concatena só os trechos de teste. Custo 0,12% por lado (estresse 0,30%). Spot long-only."""
import json, math, random
from backtest import ler, sinais, simular, metricas, GRADES

CFG = {86400: dict(treino=365, teste=90, ano=365), 21600: dict(treino=4*120, teste=4*45, ano=1460), 3600: dict(treino=24*60, teste=24*20, ano=8760)}

def stats_trades(tr, c):
    net = [(1 + t[4]) * (1 - c) ** 2 - 1 for t in tr]
    w = [x for x in net if x > 0]; l = [x for x in net if x <= 0]
    return dict(n=len(net), acerto=len(w) / len(net) if net else 0,
                payoff=(sum(w) / len(w)) / abs(sum(l) / len(l)) if w and l else None, net=net)

def wf(D, est, gran, c):
    k = CFG[gran]; n = len(D["close"]); i0 = 300; eq = 1.0; curva = []; trades = []; pos_bh = []
    a = i0 + k["treino"]
    while a + 10 < n:
        b = min(a + k["teste"], n)
        melhor = None
        for p in GRADES[est]:
            s = sinais(D, est, p); cv, _ = simular(D, s, a - k["treino"], a, c); m = metricas(cv, k["ano"])
            sc = m["ret"] / (abs(m["mdd"]) + 0.05)
            if melhor is None or sc > melhor[0]: melhor = (sc, p)
        s = sinais(D, est, melhor[1]); cv, tr = simular(D, s, a, b, c)
        curva += [eq * x for x in cv]; eq = curva[-1] if curva else eq; trades += tr
        a = b
    return curva, trades

if __name__ == "__main__":
    out = []
    for ativo in ["BTC-USD", "ETH-USD", "SOL-USD"]:
        for gran, tf in [(86400, "1d"), (21600, "6h"), (3600, "1h")]:
            D = ler(f"{ativo}-{gran}.csv"); k = CFG[gran]
            ini = 300 + k["treino"]; bh = D["close"][-1] / D["open"][ini] - 1
            pico, bmdd = 0, 0
            for x in D["close"][ini:]: pico = max(pico, x); bmdd = min(bmdd, x / pico - 1)
            for est in GRADES:
                cv, tr = wf(D, est, gran, 0.0012); cv3, _ = wf(D, est, gran, 0.0030)
                m, m3 = metricas(cv, k["ano"]), metricas(cv3, k["ano"]); st = stats_trades(tr, 0.0012)
                out.append(dict(ativo=ativo, tf=tf, est=est, n=st["n"], ret=m["ret"], ret3=m3["ret"], mdd=m["mdd"], acerto=st["acerto"], payoff=st["payoff"], bh=bh, bh_mdd=bmdd,
                                dias=round((len(D["close"]) - ini) * gran / 86400)))
    json.dump(out, open("walkforward.json", "w"), indent=1)
    print(f"{'ativo':8} {'tf':3} {'estratégia':9} {'dias':>4} {'trades':>6} {'líquido':>8} {'@0,30%':>8} {'mdd':>7} {'acerto':>7} {'payoff':>6} | {'B&H':>7} {'B&H mdd':>8}")
    for r in out:
        pf = f"{r['payoff']:.2f}" if r['payoff'] else "-"
        print(f"{r['ativo']:8} {r['tf']:3} {r['est']:9} {r['dias']:4d} {r['n']:6d} {r['ret']*100:7.1f}% {r['ret3']*100:7.1f}% {r['mdd']*100:6.1f}% {r['acerto']*100:6.0f}% {pf:>6} | {r['bh']*100:6.1f}% {r['bh_mdd']*100:7.1f}%")
    pos = [r for r in out if r["ret3"] > 0]
    print(f"\nCombinações com retorno líquido > 0 MESMO a 0,30%: {len(pos)}/{len(out)}")
    for est in GRADES:
        rs = [r for r in out if r["est"] == est]
        print(f"  {est:9}: positivas {sum(r['ret']>0 for r in rs)}/{len(rs)} | média {sum(r['ret'] for r in rs)/len(rs)*100:6.1f}% | trades totais {sum(r['n'] for r in rs)}")
