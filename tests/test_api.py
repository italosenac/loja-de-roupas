import pytest
from fastapi.testclient import TestClient

from sqlmodel import Session

from api import app, obter_sessao, popular_se_vazio
from loja.banco import criar_tabelas, engine_em_memoria
from loja.repositorio import RepositorioProdutos
from loja.servico import ServicoCatalogo

cliente = TestClient(app)


@pytest.fixture(autouse=True)
def banco_de_teste():
    engine = engine_em_memoria()
    criar_tabelas(engine)
    with Session(engine) as sessao:
        popular_se_vazio(ServicoCatalogo(RepositorioProdutos(sessao)))

    def sessao_de_teste():
        with Session(engine) as sessao:
            yield sessao

    app.dependency_overrides[obter_sessao] = sessao_de_teste
    cliente.delete("/carrinho")
    yield
    app.dependency_overrides.clear()
    engine.dispose()


def test_vitrine_tem_tres_produtos():
    resposta = cliente.get("/produtos")
    assert resposta.status_code == 200
    assert len(resposta.json()) == 3


def test_produto_inexistente_da_404():
    assert cliente.get("/produtos/99").status_code == 404


def test_filtro_por_tamanho():
    resposta = cliente.get("/produtos", params={"tamanho": "M"})
    assert [produto["nome"] for produto in resposta.json()] == ["Camiseta básica"]


def test_quantidade_zero_da_422():
    resposta = cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 0})
    assert resposta.status_code == 422


def test_adicionar_item_da_201():
    resposta = cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 3})
    assert resposta.status_code == 201
    assert resposta.json()["pecas_no_carrinho"] == 3


def test_total_com_promocao_sem_frete():
    cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 3})
    cliente.post("/carrinho/itens", json={"produto_id": 2, "quantidade": 1})
    resumo = cliente.get("/carrinho/total").json()
    assert {campo: resumo[campo] for campo in ("pecas", "subtotal", "total")} == {
        "pecas": 4, "subtotal": 249.6, "total": 224.64
    }


def test_total_abaixo_de_200_paga_frete():
    cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    assert cliente.get("/carrinho/total").json()["total"] == 50.91


def test_cadastro_da_201_e_fica_disponivel():
    resposta = cliente.post("/produtos", json={"nome": "Boné", "preco": 49.90, "tamanho": "M"})
    assert resposta.status_code == 201
    produto = resposta.json()
    assert cliente.get(f"/produtos/{produto['id']}").json() == produto


def test_nome_duplicado_da_409():
    resposta = cliente.post("/produtos", json={"nome": "Moletom", "preco": 49.90, "tamanho": "M"})
    assert resposta.status_code == 409
    assert "já existe" in resposta.json()["detail"]


def test_cadastro_invalido_da_422():
    for dados in ({"nome": "Boné", "preco": 0, "tamanho": "M"},
                  {"nome": "Boné", "preco": 49.90, "tamanho": "XL"},
                  {"nome": "Boné"}):
        assert cliente.post("/produtos", json=dados).status_code == 422


def test_atualiza_produto_e_trata_conflitos():
    dados = {"tipo": "Camiseta", "nome": "Camiseta básica", "preco": 45,
             "tamanho": "G", "manga": "longa"}
    resposta = cliente.put("/produtos/1", json=dados)
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == 45
    assert cliente.get("/produtos/1").json()["tamanho"] == "G"
    assert cliente.put("/produtos/99", json=dados).status_code == 404
    assert cliente.put("/produtos/1", json={**dados, "nome": "Moletom"}).status_code == 409


def test_remove_produto_sem_corpo_e_trata_inexistente():
    resposta = cliente.delete("/produtos/1")
    assert resposta.status_code == 204
    assert resposta.content == b""
    assert cliente.get("/produtos/1").status_code == 404
    assert cliente.delete("/produtos/1").status_code == 404


def test_filtros_por_preco_e_combinados():
    assert [p["id"] for p in cliente.get("/produtos?preco_max=100").json()] == [1]
    assert [p["id"] for p in cliente.get("/produtos?tamanho=G&preco_max=150").json()] == [2]
    assert cliente.get("/produtos?tamanho=G&preco_max=100").json() == []


def test_sacola_vazia_preserva_regra_e_nao_tem_itens():
    dados = cliente.get("/carrinho/total").json()
    assert dados["pecas"] == 0
    assert dados["itens"] == []
    assert dados["subtotal"] == dados["valor_desconto"] == 0
    assert dados["frete"] == dados["total"] == 15


def test_dois_visitantes_tem_sacolas_independentes():
    primeiro, segundo = TestClient(app), TestClient(app)
    primeiro.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 2})
    assert segundo.get("/carrinho/total").json()["pecas"] == 0
    segundo.post("/carrinho/itens", json={"produto_id": 2, "quantidade": 1})
    assert primeiro.get("/carrinho/total").json()["subtotal"] == 79.8
    assert segundo.get("/carrinho/total").json()["subtotal"] == 129.9
    primeiro.delete("/carrinho")
    assert primeiro.get("/carrinho/total").json()["pecas"] == 0
    assert segundo.get("/carrinho/total").json()["pecas"] == 1


def test_cookie_adulterado_nao_acessa_outra_sacola():
    primeiro, segundo = TestClient(app), TestClient(app)
    primeiro.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    segundo.get("/carrinho/total")
    cookie_primeiro = primeiro.cookies.get("loja_sessao")
    cookie_segundo = segundo.cookies.get("loja_sessao")
    identificador = cookie_primeiro.split(".")[0]
    assinatura_alheia = cookie_segundo.split(".")[1]
    invasor = TestClient(app)
    invasor.cookies.set("loja_sessao", f"{identificador}.{assinatura_alheia}")
    assert invasor.get("/carrinho/total").json()["pecas"] == 0
    invasor.cookies.set("loja_sessao", identificador)
    assert invasor.get("/carrinho/total").json()["pecas"] == 0
    assert primeiro.get("/carrinho/total?session_id=" + cookie_segundo).json()["pecas"] == 1


def test_cookie_https_e_resposta_individual_sem_cache(monkeypatch):
    monkeypatch.setenv("COOKIE_SECURE", "true")
    visitante = TestClient(app, base_url="https://testserver")
    resposta = visitante.get("/carrinho/total")
    cookie = resposta.headers["set-cookie"].lower()
    assert "httponly" in cookie and "secure" in cookie and "samesite=lax" in cookie
    assert "max-age=1800" in cookie
    assert resposta.headers["cache-control"] == "no-store"
    visitante.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    assert visitante.get("/carrinho/total").json()["pecas"] == 1


def test_mesmo_produto_soma_e_pode_ter_mais_de_dez_unidades():
    for _ in range(2):
        assert cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 10}).status_code == 201
    itens = cliente.get("/carrinho/itens").json()
    assert len(itens) == 1 and itens[0]["quantidade"] == 20
    resposta = cliente.put("/carrinho/itens/1", json={"quantidade": 11})
    assert resposta.status_code == 200
    assert resposta.json()["pecas"] == 11


@pytest.mark.parametrize("quantidade", [0, -1, 11, 1.5])
def test_adicao_recusa_quantidade_invalida(quantidade):
    assert cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": quantidade}).status_code == 422


@pytest.mark.parametrize("quantidade", [0, -1, 1.5])
def test_alteracao_recusa_quantidade_invalida(quantidade):
    cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    assert cliente.put("/carrinho/itens/1", json={"quantidade": quantidade}).status_code == 422
    assert cliente.get("/carrinho/total").json()["pecas"] == 1


def test_atualizacao_remocao_e_esvaziamento():
    cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    cliente.post("/carrinho/itens", json={"produto_id": 2, "quantidade": 1})
    dados = cliente.put("/carrinho/itens/1", json={"quantidade": 3}).json()
    assert dados["pecas"] == 4 and dados["subtotal"] == 249.6
    assert dados["valor_desconto"] == 24.96 and dados["subtotal_com_desconto"] == 224.64
    assert dados["frete_gratis"] and dados["frete"] == 0 and dados["total"] == 224.64
    assert dados["falta_para_frete_gratis"] == 0
    assert cliente.delete("/carrinho/itens/1").status_code == 204
    assert cliente.get("/carrinho/itens").json()[0]["id"] == 2
    assert cliente.delete("/carrinho").status_code == 204
    assert cliente.get("/carrinho/itens").json() == []


def test_sacola_trata_produto_e_item_inexistentes():
    assert cliente.post("/carrinho/itens", json={"produto_id": 99, "quantidade": 1}).status_code == 404
    assert cliente.put("/carrinho/itens/99", json={"quantidade": 1}).status_code == 404
    assert cliente.put("/carrinho/itens/1", json={"quantidade": 1}).status_code == 404
    assert cliente.delete("/carrinho/itens/99").status_code == 404


def test_resumo_com_frete_e_valor_faltante():
    cliente.post("/carrinho/itens", json={"produto_id": 1, "quantidade": 1})
    dados = cliente.get("/carrinho/total").json()
    assert dados["percentual_desconto"] == 10 and dados["valor_desconto"] == 3.99
    assert dados["subtotal_com_desconto"] == 35.91
    assert dados["frete"] == 15 and dados["falta_para_frete_gratis"] == 164.09
    assert dados["total"] == 50.91
