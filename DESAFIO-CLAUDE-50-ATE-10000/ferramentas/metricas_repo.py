"""Coleta métricas OBSERVADAS do repositório local-site-kit-lite e acrescenta uma linha em METRICAS-REPO-LITE.csv.

Usa só endpoints do próprio repositório (a sessão do GitHub é limitada aos repositórios adicionados).
As visitas e clones vêm da API de tráfego (janela de 14 dias, exige permissão de push/admin).
Uso: python3 metricas_repo.py   (rodar 1x por dia; nunca preencher valores à mão)
"""
import csv
import datetime as dt
import json
import pathlib
import subprocess

REPO = "Matheuszinhorn/local-site-kit-lite"
OUT = pathlib.Path(__file__).resolve().parent.parent / "METRICAS-REPO-LITE.csv"


def api(path):
    r = subprocess.run(["curl", "-sS", "-m", "30", "-H", "Accept: application/vnd.github+json",
                        f"https://api.github.com/repos/{REPO}{path}"], capture_output=True, text=True)
    return json.loads(r.stdout or "{}")


repo = api("")
views = api("/traffic/views")
clones = api("/traffic/clones")
refs = api("/traffic/popular/referrers")
issues = api("/issues?state=all&per_page=100")
issues = issues if isinstance(issues, list) else []
order = sum(1 for i in issues if any(l.get("name") == "order" for l in i.get("labels", [])))
linha = {
    "data_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M"),
    "estrelas": repo.get("stargazers_count", ""),
    "forks": repo.get("forks_count", ""),
    "visitas_14d": views.get("count", ""),
    "visitantes_unicos_14d": views.get("uniques", ""),
    "clones_14d": clones.get("count", ""),
    "origens": ";".join(f"{r['referrer']}:{r['count']}" for r in refs) if isinstance(refs, list) else "",
    "issues_total": len(issues),
    "issues_pedido": order,
    "erro_api": repo.get("message", "") or views.get("message", ""),
}
novo = not OUT.exists()
with OUT.open("a", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(linha))
    if novo:
        w.writeheader()
    w.writerow(linha)
print(linha)
