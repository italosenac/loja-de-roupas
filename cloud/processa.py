import json
import os
import time
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr

from cloud.comum import CONFIGURACAO_AWS, inteiro_positivo


_tabela = None


def obter_tabela():
    global _tabela
    if _tabela is None:
        _tabela = boto3.resource("dynamodb", config=CONFIGURACAO_AWS).Table(os.environ["TABELA_PEDIDOS"])
    return _tabela


def processar_pedido(pedido):
    identificador = pedido.get("id")
    if not isinstance(identificador, str) or len(identificador) != 32:
        raise ValueError("Identificador de pedido inválido")
    try:
        int(identificador, 16)
    except ValueError as erro:
        raise ValueError("Identificador de pedido inválido") from erro
    quantidade = inteiro_positivo(pedido.get("quantidade"), "quantidade")
    produto_id = inteiro_positivo(pedido.get("produto"), "produto")
    if quantidade > 10:
        raise ValueError("Quantidade inválida no pedido de demonstração")
    tabela = obter_tabela()
    existente = tabela.get_item(Key={"id": identificador}, ConsistentRead=True).get("Item")
    if existente:
        return "duplicata"
    time.sleep(1)
    # O único efeito é este registro final. Não há cobrança, nota ou baixa de estoque.
    concluido = {"id": identificador, "produto": produto_id, "quantidade": quantidade,
                 "estado": "concluido", "demonstracao": True,
                 "concluido_em": datetime.now(timezone.utc).isoformat()}
    try:
        tabela.put_item(Item=concluido, ConditionExpression=Attr("id").not_exists())
    except tabela.meta.client.exceptions.ConditionalCheckFailedException:
        return "duplicata"
    return "processado"


def lambda_handler(evento, contexto):
    for registro in evento["Records"]:
        pedido = json.loads(registro["body"])
        resultado = processar_pedido(pedido)
        print(json.dumps({"evento": resultado, "pedido": pedido["id"], "demonstracao": True}))
    return {"processado": True}
