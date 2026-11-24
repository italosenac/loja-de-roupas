import pytest

from loja.carrinho import Carrinho
from loja.produto import Produto
from loja.promocao import Cupom, Percentual, SemPromocao


@pytest.mark.parametrize("promocao, esperado", [
    (SemPromocao(), 249.60),
    (Percentual(10), 224.64),
    (Cupom(100), 164.60),
])
def test_total_com_cada_promocao(promocao, esperado):
    carrinho = Carrinho(promocao)
    carrinho.adicionar(Produto("Camiseta básica", 39.90, "M"), 3)
    carrinho.adicionar(Produto("Calça jeans", 129.90, "G"))
    assert carrinho.total == pytest.approx(esperado)


def test_percentual_fora_do_intervalo_nao_e_aceito():
    for percentual in (-1, 101):
        with pytest.raises(ValueError):
            Percentual(percentual)


def test_cupom_nao_aceita_valor_negativo_nem_deixa_subtotal_negativo():
    with pytest.raises(ValueError):
        Cupom(-1)
    assert Cupom(100).aplicar(50) == 0
