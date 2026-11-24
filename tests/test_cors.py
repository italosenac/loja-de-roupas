import pytest
from fastapi.testclient import TestClient

from api import app

cliente = TestClient(app)


@pytest.mark.parametrize("origem", ["http://127.0.0.1:5500", "http://localhost:5500"])
def test_permite_post_da_vitrine(origem):
    resposta = cliente.options("/produtos", headers={
        "Origin": origem,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert resposta.status_code == 200
    assert resposta.headers["access-control-allow-origin"] == origem


def test_nao_libera_origem_desconhecida():
    resposta = cliente.options("/produtos", headers={
        "Origin": "https://outro-site.example",
        "Access-Control-Request-Method": "POST",
    })
    assert resposta.status_code == 400
    assert "access-control-allow-origin" not in resposta.headers
