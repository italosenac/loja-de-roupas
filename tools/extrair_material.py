"""Extrai slides locais para conferir a cobertura do material, sem executar HTML."""
import json
from html.parser import HTMLParser
from pathlib import Path


class LeitorSlides(HTMLParser):
    def __init__(self):
        super().__init__()
        self.slides = []
        self.slide = None
        self.oculto = 0

    def handle_starttag(self, tag, attrs):
        atributos = dict(attrs)
        if tag in ("script", "style"):
            self.oculto += 1
        if tag == "section":
            self.slide = {"numero": len(self.slides) + 1,
                          "fase": atributos.get("data-fase", ""), "partes": []}
        if self.slide and tag in ("br", "p", "li", "h1", "h2", "h3", "tr", "pre", "button"):
            self.slide["partes"].append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.oculto = max(0, self.oculto - 1)
        if tag == "section" and self.slide:
            partes = self.slide.pop("partes")
            self.slide["texto"] = "\n".join(" ".join(linha.split()) for linha in "".join(partes).splitlines() if linha.strip())
            self.slides.append(self.slide)
            self.slide = None

    def handle_data(self, texto):
        if self.slide and not self.oculto:
            self.slide["partes"].append(texto)


def main():
    pasta = Path(".backup-aws/cloud-fontes")
    for arquivo in sorted(pasta.glob("aula-*.html")):
        leitor = LeitorSlides()
        leitor.feed(arquivo.read_text(encoding="utf-8"))
        arquivo.with_suffix(".json").write_text(json.dumps(leitor.slides, ensure_ascii=False, indent=2), encoding="utf-8")
        arquivo.with_suffix(".txt").write_text("\n\n".join(f"SLIDE {s['numero']} | FASE {s['fase']}\n{s['texto']}" for s in leitor.slides), encoding="utf-8")
        print(arquivo.name, len(leitor.slides), "slides")


if __name__ == "__main__":
    main()
