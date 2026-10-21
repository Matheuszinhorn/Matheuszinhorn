"""Monta vitrine/kit/index.html a partir de kit/modelo.html.

Sem vitrine/pagamento.json, a página é publicada sem meio de compra e diz isso com clareza.
Com o arquivo ({"chave": "...", "nome": "...", "cidade": "...", "whatsapp": "+55..."}),
gera o Pix copia e cola de R$ 47, o QR code e o botão de WhatsApp para o comprovante.
"""
import base64
import io
import json
import pathlib
import sys
import urllib.parse

aqui = pathlib.Path(__file__).parent
sys.path.insert(0, str(aqui.parent / "ferramentas"))
from pix import payload  # noqa: E402

PRECO = 47.00
modelo = (aqui / "kit" / "modelo.html").read_text(encoding="utf-8")
cfg_path = aqui / "pagamento.json"

if cfg_path.exists():
    import qrcode
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    codigo = payload(cfg["chave"], cfg["nome"], cfg["cidade"], PRECO, "KITSITES")
    buf = io.BytesIO()
    qrcode.make(codigo, border=1).save(buf, format="PNG")
    qr = base64.b64encode(buf.getvalue()).decode()
    numero = "".join(c for c in cfg["whatsapp"] if c.isdigit())
    msg = urllib.parse.quote("Olá! Paguei o Pix de R$ 47 do Kit Sites Locais. Segue o comprovante:")
    compra = f"""<ol class="steps">
      <li>Pague o Pix de <b>R$ 47,00</b> pelo QR code ou pelo código copia e cola.</li>
      <li>Envie o comprovante pelo WhatsApp.</li>
      <li>Receba o kit (.zip) no mesmo WhatsApp em até 12 horas, normalmente bem antes.</li>
    </ol>
    <div class="pix">
      <img src="data:image/png;base64,{qr}" alt="QR code Pix de R$ 47,00" width="200" height="200">
      <div style="display:grid;gap:10px;min-width:0">
        <div class="code" id="pix">{codigo}</div>
        <div><button type="button" id="copiar">Copiar código Pix</button></div>
        <a class="cta" href="https://wa.me/{numero}?text={msg}">Enviar comprovante no WhatsApp</a>
        <p class="note">O Pix é feito para {cfg["nome"]}. Confira o nome no app do banco antes de confirmar.</p>
      </div>
    </div>"""
    script = """<script>
document.getElementById("copiar").addEventListener("click", async e => {
  try { await navigator.clipboard.writeText(document.getElementById("pix").textContent); e.target.textContent = "Código copiado"; }
  catch (err) { e.target.textContent = "Selecione o código acima"; }
});
</script>"""
else:
    compra = """<p><b>Vendas abrem em breve.</b> O pagamento por Pix está sendo configurado. Os sites de exemplo acima já podem ser vistos.</p>"""
    script = ""

saida = modelo.replace("<!--COMPRA-->", compra).replace("<!--SCRIPT-->", script)
(aqui / "kit" / "index.html").write_text(saida, encoding="utf-8")
print("kit/index.html gerado", "com Pix" if cfg_path.exists() else "sem meio de compra")
