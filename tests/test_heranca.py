import pytest

from loja.carrinho import Carrinho
from loja.produto import Calca, Camiseta, Produto


def test_camiseta_e_produto_e_entra_no_carrinho():
    camiseta = Camiseta("Camiseta básica", 39.90, "M", "curta")
    carrinho = Carrinho()
    carrinho.adicionar(camiseta)
    assert isinstance(camiseta, Produto)
    assert camiseta.descricao() == "Camiseta básica M: R$ 39.90 · manga curta"
    assert carrinho.quantidade_de_pecas == 1


def test_camiseta_herda_a_validacao_do_produto():
    with pytest.raises(ValueError):
        Camiseta("Camiseta básica", -10, "M", "curta")


def test_manga_invalida():
    with pytest.raises(ValueError):
        Camiseta("Camiseta básica", 39.90, "M", "regata")


def test_calca_sobrescreve_descricao_e_preserva_validacao():
    calca = Calca("Calça jeans", 129.90, "G", "reta")
    assert isinstance(calca, Produto)
    assert calca.descricao() == "Calça jeans G: R$ 129.90 · reta"
    with pytest.raises(ValueError):
        Calca("Calça jeans", 0, "G", "reta")
