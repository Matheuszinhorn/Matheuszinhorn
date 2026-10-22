import json,urllib.request,datetime as dt
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=20))
q={}
try:
    d=get("https://api.mercadobitcoin.net/api/v4/BTC-BRL/orderbook?limit=5"); q["Mercado Bitcoin"]=(float(d["bids"][0][0]),float(d["asks"][0][0]))
except Exception as e: print("MB",e)
try:
    d=get("https://api.foxbit.com.br/rest/v3/markets/btcbrl/orderbook?depth=5"); q["Foxbit"]=(float(d["bids"][0][0]),float(d["asks"][0][0]))
except Exception as e: print("Foxbit",e)
try:
    d=get("https://api.bitpreco.com/btc-brl/ticker"); q["BitPreço"]=(float(d["buy"]),float(d["sell"]))
except Exception as e: print("BitPreço",e)
try:
    d=get("https://data-api.binance.vision/api/v3/depth?symbol=BTCBRL&limit=5"); q["Binance"]=(float(d["bids"][0][0]),float(d["asks"][0][0]))
except Exception as e: print("Binance",e)
print("instante (UTC):",dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
for k,(b,a) in q.items(): print(f"  {k:16} compra(bid) R${b:,.0f}  venda(ask) R${a:,.0f}  spread {100*(a-b)/a:.3f}%")
best=max(((sell,buy,(q[sell][0]-q[buy][1])/q[buy][1]) for buy in q for sell in q if buy!=sell),key=lambda x:x[2])
print(f"\nMelhor oportunidade bruta: comprar em {best[1]} e vender em {best[0]}: {best[2]*100:.3f}%")
cap=50; fee=0.005  # taxa por ordem estimada (taker) — conta pequena
btc_fee=0.00002  # taxa de saque on-chain/rede mais baixa plausível em BTC (estimativa)
px=q[best[1]][1]
lucro=cap*best[2]-cap*fee*2-btc_fee*px
print(f"Com R$50: ganho bruto R${cap*best[2]:.2f} − taxas de ordem R${cap*fee*2:.2f} − saque de BTC entre corretoras ≈R${btc_fee*px:.2f} = R${lucro:.2f} por ciclo")
