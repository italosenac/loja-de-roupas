import json
import os
from decimal import Decimal
from hmac import compare_digest

from botocore.config import Config


CONFIGURACAO_AWS = Config(connect_timeout=1, read_timeout=1,
                         retries={"mode": "standard", "total_max_attempts": 2})


def para_json(valor):
    if isinstance(valor, Decimal):
        return int(valor) if valor == valor.to_integral_value() else float(valor)
    raise TypeError("Tipo não serializável")


def resposta(status, dados):
    return {"statusCode": status,
            "headers": {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"},
            "body": json.dumps(dados, ensure_ascii=False, default=para_json)}


def cabecalhos(evento):
    return {nome.lower(): valor for nome, valor in (evento.get("headers") or {}).items()}


def chave_valida(evento):
    esperada = os.environ.get("CHAVE_LOJA", "")
    recebida = cabecalhos(evento).get("x-api-key", "")
    return bool(esperada) and compare_digest(recebida.encode(), esperada.encode())


def ler_corpo(evento):
    texto = evento.get("body") or "{}"
    if evento.get("isBase64Encoded") or len(texto.encode("utf-8")) > 8192:
        raise ValueError("Corpo deve ser JSON de até 8 KB")
    try:
        dados = json.loads(texto, parse_float=Decimal, parse_constant=rejeitar_constante)
    except (json.JSONDecodeError, UnicodeError) as erro:
        raise ValueError("JSON inválido") from erro
    if not isinstance(dados, dict):
        raise ValueError("O corpo deve ser um objeto JSON")
    return dados


def rejeitar_constante(valor):
    raise ValueError("Número inválido: " + valor)


def inteiro_positivo(valor, nome):
    if isinstance(valor, bool) or not isinstance(valor, int) or not 0 < valor <= 9007199254740991:
        raise ValueError(nome + " deve ser inteiro positivo dentro do limite seguro do JSON")
    return valor
