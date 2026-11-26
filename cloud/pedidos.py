import json
import os
from uuid import uuid4

import boto3

from cloud.comum import CONFIGURACAO_AWS, cabecalhos, chave_valida, inteiro_positivo, ler_corpo, resposta


_fila = None


def obter_fila():
    global _fila
    if _fila is None:
        _fila = boto3.client("sqs", config=CONFIGURACAO_AWS)
    return _fila


def lambda_handler(evento, contexto):
    if not chave_valida(evento):
        return resposta(401, {"erro": "Acesso não autorizado"})
    rota = evento.get("routeKey", "")
    laboratorio = rota == "POST /laboratorio/pedidos"
    if rota not in ("POST /pedidos", "POST /laboratorio/pedidos"):
        return resposta(404, {"erro": "Rota não encontrada"})
    if laboratorio and cabecalhos(evento).get("x-loja-laboratorio") != "autorizado":
        return resposta(403, {"erro": "Laboratório restrito"})
    try:
        dados = ler_corpo(evento)
        produto_id = inteiro_positivo(dados.get("produto", dados.get("produto_id")), "produto")
        quantidade = inteiro_positivo(dados.get("quantidade"), "quantidade")
        if quantidade > 10 and not (laboratorio and quantidade == 99):
            raise ValueError("Quantidade deve estar entre 1 e 10")
    except (ValueError, TypeError) as erro:
        return resposta(422, {"erro": str(erro)})
    pedido = {"id": uuid4().hex, "produto": produto_id, "quantidade": quantidade,
              "demonstracao": True, "laboratorio": laboratorio}
    obter_fila().send_message(QueueUrl=os.environ["FILA_URL"], MessageBody=json.dumps(pedido))
    return resposta(202, {"pedido": pedido["id"], "status": "recebido", "demonstracao": True,
                          "mensagem": "Pedido recebido para demonstração; processamento ainda não concluído. Não há pagamento nem reserva de estoque."})
