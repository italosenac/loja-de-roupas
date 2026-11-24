import pytest

from loja.carrinho import Carrinho, CarrinhoFinalizadoError
from loja.produto import Produto


def carrinho_exemplo():
    carrinho = Carrinho()
    carrinho.adicionar(Produto("Camiseta básica", 39.90, "M"), 3)
    carrinho.adicionar(Produto("Calça jeans", 129.90, "G"))
    return carrinho


def test_subtotal_e_quantidade():
    carrinho = carrinho_exemplo()
    assert carrinho.quantidade_de_pecas == 4
    assert carrinho.subtotal == pytest.approx(249.60)


def test_acima_de_200_frete_gratis():
    assert carrinho_exemplo().total == pytest.approx(249.60)


def test_abaixo_de_200_paga_frete():
    carrinho = Carrinho()
    carrinho.adicionar(Produto("Moletom", 159.90, "P"))
    assert carrinho.total == pytest.approx(174.90)


def test_quantidade_invalida_nao_entra():
    for quantidade in (0, -1):
        with pytest.raises(ValueError):
            Carrinho().adicionar(Produto("Moletom", 159.90, "P"), quantidade)


def test_apenas_produtos_entram():
    with pytest.raises(TypeError):
        Carrinho().adicionar({"nome": "Moletom", "preco": 159.90})


def test_itens_devolve_copia():
    carrinho = carrinho_exemplo()
    carrinho.itens.clear()
    assert len(carrinho.itens) == 2


def test_finalizacao_protege_o_carrinho():
    with pytest.raises(ValueError):
        Carrinho().finalizar()
    carrinho = carrinho_exemplo()
    carrinho.finalizar()
    with pytest.raises(CarrinhoFinalizadoError):
        carrinho.adicionar(Produto("Moletom", 159.90, "P"))
