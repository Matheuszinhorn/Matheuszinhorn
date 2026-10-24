"""Paper trading pré-registrado (diretriz do proprietário "DEC-046", opção A). Nenhuma ordem real.

Regras fixadas em 24/10/2026, antes de qualquer dado do período de teste:
  R1 momentum 6h: comprado se close > close de 120 barras atrás (30 dias). BTC-USD e ETH-USD.
  R2 RSI(2) diário: entra se RSI(2) < 10 e close > SMA(200); sai se close > SMA(5). BTC-USD e ETH-USD.
4 carteiras virtuais de R$ 12,50 (total R$ 50). Custo 0,12% por lado (estresse 0,30%).
Sinal no fechamento da barra; execução na abertura da barra seguinte. Início: 2026-10-25 00:00 UTC. Fim: 2026-12-20 00:00 UTC.
O script recalcula tudo do zero a cada execução (determinístico), a partir de candles públicos da Coinbase.
"""
import csv, datetime as dt, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backtest import sinais, simular, metricas
from dados import candles

INICIO = dt.datetime(2026, 10, 25, tzinfo=dt.timezone.utc)
FIM = dt.datetime(2026, 12, 20, tzinfo=dt.timezone.utc)
CARTEIRAS = [("R1-momentum-6h", "BTC-USD", 21600, "momentum", {"L": 120}),
             ("R1-momentum-6h", "ETH-USD", 21600, "momentum", {"L": 120}),
             ("R2-rsi2-1d", "BTC-USD", 86400, "rsi2", {"e": 10}),
             ("R2-rsi2-1d", "ETH-USD", 86400, "rsi2", {"e": 10})]
VALOR = 12.50
AQUI = os.path.dirname(os.path.abspath(__file__))

def main():
    agora = min(dt.datetime.now(dt.timezone.utc), FIM)
    linhas, resumo = [], []
    for nome, prod, gran, est, p in CARTEIRAS:
        aquec = 300 if gran == 86400 else 300
        rows = candles(prod, gran, INICIO - dt.timedelta(seconds=gran * aquec), agora)
        rows = [r for r in rows if r[0] + gran <= agora.timestamp()]  # só barras fechadas
        D = {k: [float(r[i]) for r in rows] for i, k in enumerate(["ts", "open", "high", "low", "close", "volume"])}
        a = next((i for i, t in enumerate(D["ts"]) if t >= INICIO.timestamp()), len(rows))
        if a >= len(rows) - 1:
            resumo.append(dict(carteira=nome, ativo=prod, barras=0, valor=VALOR, ret=0, ret_estresse=0, mdd=0, trades=0, bh=0, posicao="sem dados")); continue
        pos = sinais(D, est, p)
        curva, tr = simular(D, pos, a, len(rows), 0.0012)
        curva3, _ = simular(D, pos, a, len(rows), 0.0030)
        m, m3 = metricas(curva, 1), metricas(curva3, 1)
        bh = D["close"][-1] / D["open"][a] - 1
        aberta = pos[len(rows) - 2] == 1 if len(rows) >= 2 else False
        for t in tr:
            linhas.append([nome, prod, dt.datetime.fromtimestamp(t[0], dt.timezone.utc).isoformat(), round(t[1], 2),
                           dt.datetime.fromtimestamp(t[2], dt.timezone.utc).isoformat(), round(t[3], 2), round(t[4] * 100, 3)])
        resumo.append(dict(carteira=nome, ativo=prod, barras=len(rows) - a, valor=round(VALOR * (curva[-1] if curva else 1), 4),
                           ret=round(m["ret"] * 100, 3), ret_estresse=round(m3["ret"] * 100, 3), mdd=round(m["mdd"] * 100, 3),
                           trades=len(tr), bh=round(bh * 100, 3), posicao="comprado" if aberta else "caixa"))
    total = sum(r["valor"] for r in resumo)
    with open(os.path.join(AQUI, "operacoes-paper.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["carteira", "ativo", "entrada_utc", "preco_entrada", "saida_utc", "preco_saida", "retorno_bruto_pct"]); w.writerows(linhas)
    estado = dict(atualizado_utc=agora.isoformat(timespec="minutes"), total_virtual_brl=round(total, 2), retorno_total_pct=round((total / 50 - 1) * 100, 3), carteiras=resumo)
    json.dump(estado, open(os.path.join(AQUI, "estado.json"), "w"), indent=1, ensure_ascii=False)
    print(json.dumps(estado, indent=1, ensure_ascii=False))

if __name__ == "__main__":
    main()
