import json
from decimal import Decimal
from types import SimpleNamespace

import pytest

from cloud import catalogo, pedidos, processa
from cloud.comum import ler_corpo


class CondicaoFalhou(Exception):
    pass


class TabelaMemoria:
    def __init__(self):
        self.itens = {}
        self.meta = SimpleNamespace(client=SimpleNamespace(exceptions=SimpleNamespace(ConditionalCheckFailedException=CondicaoFalhou)))

    def get_item(self, Key, **opcoes):
        return {"Item": self.itens[Key["id"]]} if Key["id"] in self.itens else {}

    def put_item(self, Item, ConditionExpression):
        if Item["id"] in self.itens:
            raise CondicaoFalhou()
        self.itens[Item["id"]] = Item.copy()


@pytest.fixture
def tabela(monkeypatch):
    tabela = TabelaMemoria()
    monkeypatch.setattr(catalogo, "obter_tabela", lambda: tabela)
    monkeypatch.setattr(processa, "obter_tabela", lambda: tabela)
    monkeypatch.setenv("CHAVE_LOJA", "chave-unitaria-sem-valor-na-aws")
    return tabela


def evento(rota, dados=None, **extra):
    return {"routeKey": rota, "headers": {"x-api-key": "chave-unitaria-sem-valor-na-aws"},
            "body": json.dumps(dados or {}), **extra}


def test_catalogo_condicional_e_decimal(tabela):
    dados = {"id": 4, "nome": " Produto de teste ", "preco": 39.9}
    primeiro = catalogo.lambda_handler(evento("POST /produtos", dados), None)
    assert primeiro["statusCode"] == 201
    assert tabela.itens[4]["preco"] == Decimal("39.9")
    dados["preco"] = 1
    assert catalogo.lambda_handler(evento("POST /produtos", dados), None)["statusCode"] == 409
    assert tabela.itens[4]["preco"] == Decimal("39.9")


@pytest.mark.parametrize("campo,valor", [("id", True), ("id", 0), ("nome", " "), ("nome", 123),
                                       ("preco", 0), ("preco", -1), ("preco", "NaN"),
                                       ("preco", True), ("preco", "Infinity"), ("preco", "1e-999"),
                                       ("id", 10 ** 100), ("tipo", "Invalido"), ("tamanho", "XX")])
def test_cloud_rejeita_produto_invalido(tabela, campo, valor):
    dados = {"id": 4, "nome": "Teste", "preco": 10, campo: valor}
    assert catalogo.lambda_handler(evento("POST /produtos", dados), None)["statusCode"] == 422
    assert not tabela.itens


def test_cloud_consulta_existente_e_ausente(tabela):
    tabela.itens[2] = {"id": 2, "nome": "Calça", "preco": Decimal("129.90")}
    for identificador, codigo in [(2, 200), (9, 404)]:
        retorno = catalogo.lambda_handler(evento("GET /produtos/{id}", pathParameters={"id": str(identificador)}), None)
        assert retorno["statusCode"] == codigo
        assert retorno["headers"]["cache-control"] == "no-store"


def test_catalogo_paginado(monkeypatch):
    chamadas = []
    class Paginador:
        def paginate(self, **opcoes):
            chamadas.append(opcoes)
            return [{"Items": [{"id": 2}]}, {"Items": [{"id": 1}]}]
    banco = SimpleNamespace(meta=SimpleNamespace(client=SimpleNamespace(get_paginator=lambda operacao: Paginador())))
    monkeypatch.setattr(catalogo, "obter_banco", lambda: banco)
    monkeypatch.setenv("TABELA_PRODUTOS", "catalogo-unitario")
    assert catalogo.listar_produtos() == [{"id": 1}, {"id": 2}]
    assert chamadas == [{"TableName": "catalogo-unitario"}]


def test_total_cloud_ignora_preco_forjado_e_compartilha_regra(tabela):
    tabela.itens[1] = {"id": 1, "nome": "Camiseta", "preco": Decimal("39.90"), "tamanho": "M"}
    r = catalogo.lambda_handler(evento("POST /carrinho/total", {"itens": [{"produto_id": 1, "quantidade": 6, "preco": .01}]}), None)
    resumo = json.loads(r["body"])
    assert resumo["subtotal"] == 239.4
    assert resumo["valor_desconto"] == 23.94
    assert resumo["frete"] == 0
    assert resumo["total"] == 215.46
    assert resumo["pecas"] == 6


def test_total_cloud_vazio_preserva_contrato(tabela):
    retorno = catalogo.lambda_handler(evento("POST /carrinho/total", {"itens": []}), None)
    assert json.loads(retorno["body"])["total"] == 15


@pytest.mark.parametrize("itens", [None, "x", [{}], [{"produto_id": 1, "quantidade": 11}], [1]])
def test_total_cloud_valida_itens(tabela, itens):
    assert catalogo.lambda_handler(evento("POST /carrinho/total", {"itens": itens}), None)["statusCode"] == 422


def test_cloud_total_produto_ausente(tabela):
    assert catalogo.lambda_handler(evento("POST /carrinho/total", {"itens": [{"produto_id": 9, "quantidade": 1}]}), None)["statusCode"] == 404


@pytest.mark.parametrize("handler", [catalogo.lambda_handler, pedidos.lambda_handler])
def test_cloud_autenticacao_fechada(tabela, handler, monkeypatch):
    assert handler({"routeKey": "GET /produtos"}, None)["statusCode"] == 401
    monkeypatch.setenv("CHAVE_LOJA", "")
    assert handler(evento("GET /produtos"), None)["statusCode"] == 401


def test_porta_202_e_falha_restrita(tabela, monkeypatch):
    enviados = []
    monkeypatch.setenv("FILA_URL", "fila-unitaria")
    monkeypatch.setattr(pedidos, "obter_fila", lambda: SimpleNamespace(send_message=lambda **dados: enviados.append(dados)))
    normal = evento("POST /pedidos", {"produto": 1, "quantidade": 1})
    retorno = pedidos.lambda_handler(normal, None)
    assert retorno["statusCode"] == 202
    recebido = json.loads(enviados[0]["MessageBody"])
    assert len(recebido["id"]) == 32
    assert recebido["demonstracao"] is True
    normal["body"] = json.dumps({"produto": 1, "quantidade": 99})
    assert pedidos.lambda_handler(normal, None)["statusCode"] == 422
    normal["routeKey"] = "POST /laboratorio/pedidos"
    assert pedidos.lambda_handler(normal, None)["statusCode"] == 403
    normal["headers"]["x-loja-laboratorio"] = "autorizado"
    assert pedidos.lambda_handler(normal, None)["statusCode"] == 202
    assert len(enviados) == 2


def test_idempotencia_duravel_e_sem_conclusao_antecipada(tabela, monkeypatch):
    pedido = {"id": "a" * 32, "produto": 1, "quantidade": 2}
    def simular_trabalho(segundos):
        assert pedido["id"] not in tabela.itens
        assert segundos == 1
    monkeypatch.setattr(processa.time, "sleep", simular_trabalho)
    assert processa.processar_pedido(pedido) == "processado"
    assert processa.processar_pedido(pedido) == "duplicata"
    assert len(tabela.itens) == 1
    assert tabela.itens[pedido["id"]]["estado"] == "concluido"


def test_idempotencia_condicao_resolve_corrida(tabela, monkeypatch):
    pedido = {"id": "b" * 32, "produto": 1, "quantidade": 1}
    monkeypatch.setattr(processa.time, "sleep", lambda segundos: tabela.itens.update({pedido["id"]: {**pedido, "estado": "concluido"}}))
    assert processa.processar_pedido(pedido) == "duplicata"
    assert len(tabela.itens) == 1


def test_queda_antes_do_registro_permite_nova_tentativa(tabela, monkeypatch):
    pedido = {"id": "c" * 32, "produto": 1, "quantidade": 1}
    def falhar(segundos):
        raise TimeoutError()
    monkeypatch.setattr(processa.time, "sleep", falhar)
    with pytest.raises(TimeoutError):
        processa.processar_pedido(pedido)
    assert not tabela.itens
    monkeypatch.setattr(processa.time, "sleep", lambda segundos: None)
    assert processa.processar_pedido(pedido) == "processado"


def test_consumidor_envenenado_nao_conclui(tabela):
    with pytest.raises(ValueError):
        processa.processar_pedido({"id": "d" * 32, "produto": 1, "quantidade": 99})
    assert not tabela.itens


@pytest.mark.parametrize("corpo", ['[]', '{', '{"preco":NaN}', '"texto"'])
def test_corpo_cloud_invalido(corpo):
    with pytest.raises(ValueError):
        ler_corpo({"body": corpo})


def test_corpo_cloud_limitado():
    with pytest.raises(ValueError):
        ler_corpo({"body": "x" * 8193})
