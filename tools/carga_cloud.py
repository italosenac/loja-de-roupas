"""Carga limitada ao laboratório HTTPS autorizado da loja, sem pagamentos reais."""
import argparse
import json
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ENDERECO = "https://d35i4a7nhsg3b0.cloudfront.net/cloud-api/laboratorio/pedidos"


def enviar_pedido(indice):
    inicio = time.perf_counter()
    requisicao = Request(ENDERECO, data=b'{"produto":1,"quantidade":1}',
                        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(requisicao, timeout=15) as retorno:
            codigo = retorno.status
            corpo = json.load(retorno)
    except HTTPError as erro:
        codigo = erro.code
        corpo = {}
    return {"indice": indice, "status": codigo,
            "latencia_ms": round((time.perf_counter() - inicio) * 1000, 2),
            "pedido": corpo.get("pedido")}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--quantidade", type=int, choices=range(1, 101), required=True)
    parser.add_argument("--paralelismo", type=int, choices=range(1, 21), default=5)
    argumentos = parser.parse_args()
    inicio = time.time()
    with ThreadPoolExecutor(max_workers=argumentos.paralelismo) as executor:
        resultados = list(executor.map(enviar_pedido, range(1, argumentos.quantidade + 1)))
    resumo = {"enviados": len(resultados), "paralelismo": argumentos.paralelismo,
              "inicio_epoch": inicio, "fim_epoch": time.time(),
              "status": dict(Counter(resultado["status"] for resultado in resultados)),
              "latencia_min_ms": min(r["latencia_ms"] for r in resultados),
              "latencia_max_ms": max(r["latencia_ms"] for r in resultados),
              "latencia_media_ms": round(sum(r["latencia_ms"] for r in resultados) / len(resultados), 2)}
    destino = Path(".backup-aws/2026-11-26/carga-cloud.json")
    destino.write_text(json.dumps({"resumo": resumo, "resultados": resultados}, indent=2), encoding="utf-8")
    print(json.dumps(resumo))


if __name__ == "__main__":
    main()
