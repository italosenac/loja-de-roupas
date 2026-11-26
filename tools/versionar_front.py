"""Atualiza URLs de CSS/JS para evitar mistura de versões no navegador."""
import hashlib
import re
from pathlib import Path

front = Path(__file__).resolve().parents[1] / "front"


def versionar(referencia):
    atributo, arquivo = referencia.groups()
    versao = hashlib.sha256((front / arquivo).read_bytes()).hexdigest()[:12]
    return f'{atributo}="{arquivo}?v={versao}"'


for pagina in front.glob("*.html"):
    texto = pagina.read_text(encoding="utf-8")
    texto = re.sub(r'(href|src)="([^"?]+\.(?:css|js))(?:\?v=[^"]*)?"', versionar, texto)
    pagina.write_text(texto, encoding="utf-8")
