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
    assert cliente.get("/carrinho/total").json() == {
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
