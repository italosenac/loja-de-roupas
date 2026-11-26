from html.parser import HTMLParser
from pathlib import Path

import pytest

PASTA_FRONT = Path(__file__).resolve().parents[1] / "front"
PAGINAS = ["index.html", "cadastro.html", "carrinho.html", "gerenciamento.html", "docs.html", "cloud.html"]


class LeitorHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elementos = []

    def handle_starttag(self, tag, atributos):
        self.elementos.append((tag, dict(atributos)))


def ler(nome):
    leitor = LeitorHTML()
    leitor.feed((PASTA_FRONT / nome).read_text(encoding="utf-8"))
    return leitor.elementos


@pytest.mark.parametrize("pagina", PAGINAS)
def test_estrutura_semantica(pagina):
    nomes = [tag for tag, atributos in ler(pagina)]
    for tag in ("header", "nav", "main", "footer"):
        assert tag in nomes
    assert nomes.count("main") == 1
    assert nomes.count("h1") == 1


@pytest.mark.parametrize("pagina", PAGINAS)
def test_toda_imagem_tem_alt(pagina):
    for tag, atributos in ler(pagina):
        if tag == "img":
            assert "alt" in atributos


@pytest.mark.parametrize("pagina", PAGINAS)
def test_idioma_viewport_e_estilo(pagina):
    elementos = ler(pagina)
    assert any(tag == "html" and atributos.get("lang") == "pt-BR" for tag, atributos in elementos)
    assert any(tag == "meta" and atributos.get("name") == "viewport" for tag, atributos in elementos)
    assert any(tag == "link" and atributos.get("href", "").split("?")[0] == "estilo.css" for tag, atributos in elementos)


def test_campos_do_cadastro_tem_label_e_nome():
    elementos = ler("cadastro.html")
    rotulos = [atributos.get("for") for tag, atributos in elementos if tag == "label"]
    campos = [atributos for tag, atributos in elementos if tag in ("input", "select")]
    for campo in campos:
        assert campo["id"] in rotulos
        assert campo.get("name") == campo["id"]
    assert {"tipo", "nome", "preco", "tamanho"}.issubset({campo["name"] for campo in campos})


def test_preco_e_nome_tem_validacao_html():
    campos = {atributos.get("id"): atributos for tag, atributos in ler("cadastro.html")
              if tag in ("input", "select")}
    assert "required" in campos["nome"]
    assert "required" in campos["preco"]
    assert campos["preco"]["min"] == "0.01"
    assert campos["preco"]["step"] == "0.01"


@pytest.mark.parametrize("pagina", PAGINAS)
def test_rodape_contem_apenas_nome_e_instituicao(pagina):
    texto = (PASTA_FRONT / pagina).read_text(encoding="utf-8")
    rodape = texto.split("<footer>")[1].split("</footer>")[0]
    assert rodape == "<span>Ítalo Rodrigues Pereira · Faculdade Senac Pernambuco</span>"
    assert "<a " not in rodape


@pytest.mark.parametrize("pagina", PAGINAS)
def test_menu_acessivel_sem_ids_duplicados(pagina):
    elementos = ler(pagina)
    ids = [a["id"] for _, a in elementos if "id" in a]
    assert len(ids) == len(set(ids))
    botoes = [a for tag, a in elementos if tag == "button" and a.get("aria-controls") == "navegacao-principal"]
    assert len(botoes) == 1
    assert botoes[0]["aria-expanded"] == "false"
    assert botoes[0]["aria-label"] == "Abrir menu"
    assert "navegacao-principal" in ids
    navegacoes = [a for tag, a in elementos if tag == "nav" and a.get("id") == "navegacao-principal"]
    assert len(navegacoes) == 1
    assert "hidden" in navegacoes[0]


@pytest.mark.parametrize("pagina", PAGINAS)
def test_versao_dos_estilos_e_scripts_corresponde_aos_arquivos(pagina):
    import hashlib
    from urllib.parse import parse_qs, urlsplit

    for tag, atributos in ler(pagina):
        referencia = atributos.get("href" if tag == "link" else "src", "")
        url = urlsplit(referencia)
        if url.path.endswith((".css", ".js")):
            esperado = hashlib.sha256((PASTA_FRONT / url.path).read_bytes()).hexdigest()[:12]
            assert parse_qs(url.query).get("v") == [esperado]


def test_arquivos_publicados_sao_utf8_sem_texto_corrompido():
    for arquivo in PASTA_FRONT.rglob("*"):
        if arquivo.suffix in {".html", ".js", ".json", ".css", ".svg"}:
            texto = arquivo.read_text(encoding="utf-8")
            for corrompido in ("\ufffd", "\u00c3\u00a1", "\u00c3\u00a7", "\u00c3\u00a3", "\u00c2\u00b7", "\u00e2\u20ac\u2122"):
                assert corrompido not in texto, arquivo
