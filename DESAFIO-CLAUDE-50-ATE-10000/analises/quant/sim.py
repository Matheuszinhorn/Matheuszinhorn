import json,random,math,statistics as st
px=[p for _,p in json.load(open("btcbrl_daily.json"))]
r=[math.log(px[i]/px[i-1]) for i in range(1,len(px))]
mu=st.mean(r); sd=st.stdev(r)
print(f"histórico: {len(r)} dias | retorno log médio/dia {mu:.5f} (≈{(math.exp(mu*365)-1)*100:.0f}%/ano) | vol anual {sd*math.sqrt(365)*100:.0f}%")
FEE=0.007  # por lado (estimativa conservadora de taxa+spread para conta pequena)
def sim(days,drift_adj=0.0,n=20000,block=30,seed=1):
    random.seed(seed); hit10k=hit1k=loss50=0; finals=[]
    for _ in range(n):
        v=50*(1-FEE); maxv=v; t=0; reached=False
        while t<days:
            s=random.randrange(0,len(r)-block)
            for x in r[s:s+block]:
                v*=math.exp(x-drift_adj); t+=1
                if v*(1-FEE)>=10000: reached=True
                maxv=max(maxv,v)
                if t>=days: break
        fin=v*(1-FEE); finals.append(fin)
        hit10k+=reached; hit1k+=maxv*(1-FEE)>=1000; loss50+=fin<=25
    finals.sort()
    return dict(p10k=hit10k/n,p1k=hit1k/n,ploss50=loss50/n,med=finals[n//2],p5=finals[n//20],p95=finals[-n//20])
for days in (365,730,1095):
    a=sim(days); b=sim(days,drift_adj=mu)
    print(f"\nHorizonte {days//365} ano(s), R$ 50 tudo em BTC, sem alavancagem:")
    print(f"  cenário histórico (2020-26): P(≥R$10k)={a['p10k']*100:.2f}% | P(tocar R$1k)={a['p1k']*100:.2f}% | P(perder ≥50%)={a['ploss50']*100:.1f}% | mediana R${a['med']:.0f} | 5%–95%: R${a['p5']:.0f}–R${a['p95']:.0f}")
    print(f"  cenário sem tendência:      P(≥R$10k)={b['p10k']*100:.2f}% | P(tocar R$1k)={b['p1k']*100:.2f}% | P(perder ≥50%)={b['ploss50']*100:.1f}% | mediana R${b['med']:.0f} | 5%–95%: R${b['p5']:.0f}–R${b['p95']:.0f}")
# renda fixa
v=50
for y in (1,3): print(f"\nRenda fixa ~14% a.a. bruto, {y} ano(s): R$ {50*1.14**y:.2f} (IR regressivo reduz)")
# backtest tendência SMA 50/200
pos=0; v=50.0; trades=0
for i in range(200,len(px)):
    s50=sum(px[i-50:i])/50; s200=sum(px[i-200:i])/200; want=1 if s50>s200 else 0
    if want!=pos: v*=(1-FEE); pos=want; trades+=1
    if pos: v*=px[i]/px[i-1]
bh=50*(1-FEE)**2*px[-1]/px[200]
print(f"\nBacktest cruzamento de médias 50/200 (out/2021–out/2026): R$50 → R${v:.2f} ({trades} trocas) | comprar e segurar no mesmo período: R${bh:.2f}")
