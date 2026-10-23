"""Lê os contadores anônimos dos produtos (abacus.jasoncameron.dev) sem incrementá-los.

Uso: python3 ferramentas/funil.py   -> tabela por produto e evento.
Os contadores são públicos e podem ser inflados por terceiros; trate como indicativo, não como prova.
"""
import json
import urllib.request

NS = "matheuszinhorn-desafio50"
CANAIS = ["direto", "tabnews", "linkedin", "x", "github", "whatsapp", "telegram", "reddit", "email"]
EVENTOS = {
    "rde": ["visita", "calculo", "csv", "imprimir", "quero-pro", "feedback"],
    "qc": ["visita", "comparacao", "quero-alerta"] + [f"clique-{a}" for a in ["remitly", "wise", "instarem", "western-union", "xoom", "paypal", "ofx"]],
    "inv": ["visita", "pdf", "nova-invoice", "quero-kit"],
}


def valor(chave):
    try:
        with urllib.request.urlopen(f"https://abacus.jasoncameron.dev/get/{NS}/{chave}", timeout=15) as r:
            return json.load(r).get("value", 0)
    except Exception:
        return 0  # chave ainda não criada = nenhum evento


if __name__ == "__main__":
    for p, evs in EVENTOS.items():
        linha = {e: valor(f"{p}-{e}") for e in evs}
        origem = {c: valor(f"{p}-visita-{c}") for c in CANAIS}
        print(p, json.dumps({k: v for k, v in linha.items() if v} or {"eventos": 0}, ensure_ascii=False),
              "| origem:", json.dumps({k: v for k, v in origem.items() if v} or {}, ensure_ascii=False))
