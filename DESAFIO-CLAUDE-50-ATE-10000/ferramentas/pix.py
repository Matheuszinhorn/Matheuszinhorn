"""Gera o payload "Pix copia e cola" (BR Code estático) do Manual de Padrões para Iniciação do Pix (BCB).

Uso: python3 pix.py --chave CHAVE --nome "NOME" --cidade CIDADE [--valor 47.00] [--txid KIT001] [--png saida.png]
"""
import argparse
import unicodedata


def crc16(data: str) -> str:
    # CRC-16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão, sem XOR final
    crc = 0xFFFF
    for byte in data.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def field(tag: str, value: str) -> str:
    if len(value) > 99:
        raise ValueError(f"campo {tag} excede 99 caracteres")
    return f"{tag}{len(value):02d}{value}"


def ascii_upper(s: str, limit: int) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s.upper()[:limit]


def payload(chave: str, nome: str, cidade: str, valor: float | None = None, txid: str = "***", descricao: str = "") -> str:
    conta = field("00", "br.gov.bcb.pix") + field("01", chave) + (field("02", descricao) if descricao else "")
    p = (field("00", "01") + field("26", conta) + field("52", "0000") + field("53", "986")
         + (field("54", f"{valor:.2f}") if valor else "") + field("58", "BR")
         + field("59", ascii_upper(nome, 25)) + field("60", ascii_upper(cidade, 15))
         + field("62", field("05", txid)) + "6304")
    return p + crc16(p)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--chave", required=True)
    ap.add_argument("--nome", required=True)
    ap.add_argument("--cidade", required=True)
    ap.add_argument("--valor", type=float)
    ap.add_argument("--txid", default="***")
    ap.add_argument("--png")
    a = ap.parse_args()
    code = payload(a.chave, a.nome, a.cidade, a.valor, a.txid)
    print(code)
    if a.png:
        import qrcode
        qrcode.make(code).save(a.png)
