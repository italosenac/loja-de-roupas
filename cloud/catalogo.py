import os
from decimal import Decimal, InvalidOperation

import boto3
from boto3.dynamodb.conditions import Attr

from cloud.comum import CONFIGURACAO_AWS, chave_valida, inteiro_positivo, ler_corpo, resposta
from loja.carrinho import Carrinho
from loja.produto import Produto
from loja.promocao import Percentual


_banco = None


def obter_banco():
    global _banco
    if _banco is None:
        _banco = boto3.resource("dynamodb", config=CONFIGURACAO_AWS)
    return _banco


def obter_tabela():
    return obter_banco().Table(os.environ["TABELA_PRODUTOS"])


def listar_produtos():
    banco = obter_banco()
    paginas = banco.meta.client.get_paginator("scan").paginate(TableName=os.environ["TABELA_PRODUTOS"])
    return sorted((item for pagina in paginas for item in pagina.get("Items", [])), key=lambda item: item["id"])


def buscar_produto(produto_id):
    return obter_tabela().get_item(Key={"id": produto_id}, ConsistentRead=True).get("Item")


def validar_produto(dados):
    produto_id = inteiro_positivo(dados.get("id"), "id")
    nome = dados.get("nome")
    if not isinstance(nome, str) or not nome.strip() or len(nome) > 120:
        raise ValueError("Nome obrigatório, com até 120 caracteres")
    try:
        if isinstance(dados.get("preco"), bool):
            raise ValueError("Preço inválido")
        preco = Decimal(str(dados.get("preco")))
        if not preco.is_finite() or preco <= 0 or preco > 1000000:
            raise ValueError("Preço deve ser positivo e até 1000000")
        if preco.as_tuple().exponent < -2:
            raise ValueError("Preço deve ter no máximo duas casas decimais")
    except InvalidOperation as erro:
        raise ValueError("Preço inválido") from erro
    tipo = dados.get("tipo", "Produto")
    tamanho = dados.get("tamanho", "M")
    if tipo not in ("Produto", "Camiseta", "Calca") or tamanho not in ("PP", "P", "M", "G", "GG"):
        raise ValueError("Tipo ou tamanho inválido")
    produto = {"id": produto_id, "nome": nome.strip(), "preco": preco, "tipo": tipo, "tamanho": tamanho}
    if tipo == "Camiseta":
        if dados.get("manga") not in ("curta", "longa"):
            raise ValueError("Manga deve ser curta ou longa")
        produto["manga"] = dados["manga"]
    if tipo == "Calca":
        modelagem = dados.get("modelagem")
        if not isinstance(modelagem, str) or not modelagem.strip() or len(modelagem) > 60:
            raise ValueError("Modelagem obrigatória, com até 60 caracteres")
        produto["modelagem"] = modelagem.strip()
    return produto


def totalizar_carrinho(dados):
    itens = dados.get("itens")
    if not isinstance(itens, list) or len(itens) > 30:
        raise ValueError("Envie uma lista de até 30 itens")
    carrinho = Carrinho(Percentual(10))
    for item in itens:
        if not isinstance(item, dict):
            raise ValueError("Item inválido")
        produto_id = inteiro_positivo(item.get("produto_id"), "produto_id")
        quantidade = inteiro_positivo(item.get("quantidade"), "quantidade")
        if quantidade > 10:
            raise ValueError("Quantidade por item deve estar entre 1 e 10")
        dados_produto = buscar_produto(produto_id)
        if dados_produto is None:
            return resposta(404, {"erro": "Produto não encontrado"})
        produto = Produto(dados_produto["nome"], float(dados_produto["preco"]), dados_produto.get("tamanho", "M"))
        produto.id = produto_id
        carrinho.adicionar(produto, quantidade)
    return resposta(200, carrinho.resumo())


def lambda_handler(evento, contexto):
    if not chave_valida(evento):
        return resposta(401, {"erro": "Acesso não autorizado"})
    rota = evento.get("routeKey", "")
    try:
        if rota in ("GET /produtos", "GET /laboratorio/rede"):
            return resposta(200, listar_produtos())
        if rota == "GET /produtos/{id}":
            produto_id = inteiro_positivo(int((evento.get("pathParameters") or {}).get("id", "0")), "id")
            produto = buscar_produto(produto_id)
            return resposta(200, produto) if produto else resposta(404, {"erro": "Produto não encontrado"})
        if rota == "POST /produtos":
            produto = validar_produto(ler_corpo(evento))
            tabela = obter_tabela()
            try:
                tabela.put_item(Item=produto, ConditionExpression=Attr("id").not_exists())
            except tabela.meta.client.exceptions.ConditionalCheckFailedException:
                return resposta(409, {"erro": "ID já cadastrado"})
            return resposta(201, produto)
        if rota == "POST /carrinho/total":
            return totalizar_carrinho(ler_corpo(evento))
        if rota == "GET /promocoes":
            return resposta(200, {"percentual_desconto": 10, "frete_gratis_a_partir_de": 200,
                                  "base_frete": "subtotal após desconto", "catalogo": "Cloud · DynamoDB"})
        return resposta(404, {"erro": "Rota não encontrada"})
    except (ValueError, TypeError, OverflowError) as erro:
        return resposta(422, {"erro": str(erro)})
