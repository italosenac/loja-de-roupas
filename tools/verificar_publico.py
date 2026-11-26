"""Smoke tests HTTPS com clientes isolados; não altera produtos existentes."""
import json
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener


BASE = "https://d35i4a7nhsg3b0.cloudfront.net"


def requisitar(cliente, caminho, metodo="GET", dados=None, cookie=None):
    cabecalhos = {"Content-Type": "application/json"}
    if cookie:
        cabecalhos["Cookie"] = cookie
    corpo = json.dumps(dados).encode() if dados is not None else None
    pedido = Request(BASE + caminho, data=corpo, headers=cabecalhos, method=metodo)
    try:
        retorno = cliente.open(pedido, timeout=15)
    except HTTPError as erro:
        retorno = erro
    with retorno:
        texto = retorno.read()
        return retorno.status, json.loads(texto) if texto else None, retorno.headers


def main():
    cookies_a = CookieJar()
    cliente_a = build_opener(HTTPCookieProcessor(cookies_a))
    cliente_b = build_opener(HTTPCookieProcessor(CookieJar()))
    requisitar(cliente_a, "/api/carrinho/total")
    requisitar(cliente_b, "/api/carrinho/total")
    assert requisitar(cliente_a, "/api/carrinho/itens", "POST", {"produto_id": 1, "quantidade": 1})[0] == 201
    assert requisitar(cliente_b, "/api/carrinho/total")[1]["pecas"] == 0
    assert requisitar(cliente_b, "/api/carrinho/itens", "POST", {"produto_id": 2, "quantidade": 1})[0] == 201
    assert requisitar(cliente_a, "/api/carrinho/total")[1]["itens"][0]["id"] == 1
    sessao = next(cookie for cookie in cookies_a if cookie.name == "loja_sessao")
    assert sessao.secure and sessao.has_nonstandard_attr("HttpOnly")
    visitante = build_opener()
    forjada = "loja_sessao=" + sessao.value.split(".")[0] + ".invalida"
    codigo, resumo, cabecalhos = requisitar(visitante, "/api/carrinho/total", cookie=forjada)
    assert codigo == 200 and resumo["pecas"] == 0
    assert cabecalhos["Cache-Control"] == "no-store" and not cabecalhos.get("Age")
    assert requisitar(cliente_a, "/api/carrinho", "DELETE")[0] == 204
    assert requisitar(cliente_b, "/api/carrinho/total")[1]["pecas"] == 1
    requisitar(cliente_b, "/api/carrinho", "DELETE")
    protegidas = [("/api/openapi.json", "GET", None),
                  ("/api/produtos/99999999", "DELETE", None),
                  ("/cloud-api/produtos", "POST", {"id": 1, "nome": "Camiseta básica", "preco": 39.9}),
                  ("/cloud-api/laboratorio/pedidos", "POST", {"produto": 1, "quantidade": 99})]
    resultados = []
    for caminho, metodo, corpo in protegidas:
        codigo = requisitar(visitante, caminho, metodo, corpo)[0]
        resultados.append({"rota": caminho, "status": codigo})
        assert codigo == 403
    assert requisitar(visitante, "/cloud-api/produtos")[0] == 200
    assert requisitar(visitante, "/cloud-api/pedidos", "POST", {"produto": 1, "quantidade": 99})[0] == 422
    print(json.dumps({"isolamento": True, "cookie_forjado_rejeitado": True,
                      "cookie_secure_httponly": True, "sem_cache_compartilhado": True,
                      "operacoes_restritas": resultados, "cloud_publico": True}, ensure_ascii=False))


if __name__ == "__main__":
    main()
