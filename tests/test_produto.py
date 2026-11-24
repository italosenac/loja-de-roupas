import pytest

from loja.produto import Produto


def test_produto_valido():
    produto = Produto("  Camiseta básica  ", 39.90, "M")
    assert produto.nome == "Camiseta básica"
    assert produto.descricao() == "Camiseta básica M: R$ 39.90"


def test_preco_zero_e_negativo_nao_sao_aceitos():
    for preco in (0, -10):
        with pytest.raises(ValueError):
            Produto("Camiseta básica", preco, "M")


def test_nome_vazio_nao_e_aceito():
    for nome in ("", "   "):
        with pytest.raises(ValueError):
            Produto(nome, 39.90, "M")


def test_tamanho_invalido_nao_e_aceito():
    with pytest.raises(ValueError):
        Produto("Moletom", 159.90, "g")
