import pytest

import loja.sessoes as modulo
from loja.sessoes import LimiteSessoesError, SessoesCarrinho


def test_expira_sessao_sem_afetar_sessao_ativa(monkeypatch):
    tempo = [0]
    monkeypatch.setattr(modulo, "monotonic", lambda: tempo[0])
    sessoes = SessoesCarrinho(duracao=30)
    cookie, carrinho = sessoes.obter(None)
    tempo[0] = 20
    outro_cookie, outro = sessoes.obter(None)
    tempo[0] = 31
    novo_cookie, novo = sessoes.obter(cookie)
    assert novo_cookie != cookie and novo is not carrinho
    assert sessoes.obter(outro_cookie)[1] is outro


def test_limite_de_sessoes_e_liberacao_apos_expirar(monkeypatch):
    tempo = [0]
    monkeypatch.setattr(modulo, "monotonic", lambda: tempo[0])
    sessoes = SessoesCarrinho(duracao=30, limite=1)
    cookie, carrinho = sessoes.obter(None)
    assert sessoes.obter(cookie)[1] is carrinho
    with pytest.raises(LimiteSessoesError):
        sessoes.obter(None)
    tempo[0] = 31
    assert sessoes.obter(None)[0] != cookie


@pytest.mark.parametrize("cookie", ["inventado", "a.b", "é", "x" * 201])
def test_identificador_invalido_cria_sacola_nova(cookie):
    sessoes = SessoesCarrinho()
    valido, carrinho = sessoes.obter(cookie)
    assert valido != cookie
    assert carrinho.quantidade_de_pecas == 0
    assert sessoes.obter(valido)[1] is carrinho
