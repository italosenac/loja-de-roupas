"""Modelo didático mensal em USD, preços consultados em 26/11/2026, sem franquias."""
import json
from decimal import Decimal


def estimar(pedidos, consultas, logs_gb, armazenamento_gb):
    pedidos = Decimal(pedidos)
    consultas = Decimal(consultas)
    duracao_gb_s = pedidos * Decimal("0.15") + consultas * Decimal("0.05")
    custos = {
        "lambda": duracao_gb_s * Decimal("0.0000166667") + (2 * pedidos + consultas) * Decimal("0.0000002"),
        "api_gateway": (pedidos + consultas) * Decimal("0.000001"),
        "sqs": (Decimal(648000) + 3 * pedidos) * Decimal("0.0000004"),
        "dynamodb": (pedidos + consultas / 2) * Decimal("0.000000125") + pedidos * Decimal("0.000000625"),
        "armazenamento": Decimal(armazenamento_gb) * Decimal("0.25"),
        "logs": Decimal(logs_gb) * Decimal("0.50"),
        "alarmes": Decimal("0.20"),
    }
    return {**{nome: float(valor.quantize(Decimal("0.000001"))) for nome, valor in custos.items()},
            "total": float(sum(custos.values()).quantize(Decimal("0.01")))}


def main():
    print(json.dumps({"normal": estimar(100, 10000, "0.01", "0.001"),
                      "pico": estimar(10000, 100000, "0.1", "0.01")}, indent=2))


if __name__ == "__main__":
    main()
