import pytest

from loja.carrinho import Carrinho
from loja.promocao import Cupom, Percentual, Promocao, SemPromocao


def test_classe_abstrata_nao_pode_ser_instanciada():
    with pytest.raises(TypeError):
        Promocao()


def test_promocao_sem_aplicar_nao_nasce():
    class BlackFriday(Promocao):
        def aplicar_desconto(self, subtotal):
            return subtotal / 2

    with pytest.raises(TypeError):
        BlackFriday()


def test_carrinho_recusa_quem_nao_segue_o_contrato():
    class Parecida:
        def aplicar(self, subtotal):
            return subtotal

    with pytest.raises(TypeError):
        Carrinho(Parecida())


@pytest.mark.parametrize("promocao", [SemPromocao(), Percentual(10), Cupom(20)])
def test_implementacoes_seguem_o_contrato(promocao):
    assert isinstance(promocao, Promocao)
    assert Carrinho(promocao).promocao is promocao
