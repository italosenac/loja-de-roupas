from math import ceil

from loja.calculos import FRETE_GRATIS_A_PARTIR_DE, frete, total_carrinho
from loja.produto import Produto
from loja.promocao import Promocao, SemPromocao


class CarrinhoFinalizadoError(Exception):
    pass


class ItemNaoEncontradoError(Exception):
    pass


class Carrinho:
    def __init__(self, promocao=None):
        if promocao is not None and not isinstance(promocao, Promocao):
            raise TypeError("promoção deve seguir o contrato Promocao")
        self._itens = []
        self._finalizado = False
        self.promocao = promocao or SemPromocao()

    def adicionar(self, produto, quantidade=1):
        if self._finalizado:
            raise CarrinhoFinalizadoError("carrinho finalizado não recebe peças")
        if not isinstance(produto, Produto):
            raise TypeError("só é possível adicionar um Produto")
        if quantidade <= 0:
            raise ValueError("quantidade deve ser positiva")
        for indice, (existente, unidades) in enumerate(self._itens):
            if self.mesmo_produto(existente, produto):
                self._itens[indice] = (produto, unidades + quantidade)
                return
        self._itens.append((produto, quantidade))

    @staticmethod
    def mesmo_produto(primeiro, segundo):
        return primeiro is segundo or (primeiro.id is not None and primeiro.id == segundo.id)

    def atualizar_quantidade(self, produto, quantidade):
        if self._finalizado:
            raise CarrinhoFinalizadoError("carrinho finalizado não permite alterações")
        if quantidade <= 0:
            raise ValueError("quantidade deve ser positiva")
        for indice, (existente, unidades) in enumerate(self._itens):
            if self.mesmo_produto(existente, produto):
                self._itens[indice] = (produto, quantidade)
                return
        raise ItemNaoEncontradoError("produto não está na sacola")

    def remover(self, produto_id):
        if self._finalizado:
            raise CarrinhoFinalizadoError("carrinho finalizado não permite alterações")
        for indice, (produto, quantidade) in enumerate(self._itens):
            if produto.id == produto_id:
                self._itens.pop(indice)
                return
        raise ItemNaoEncontradoError("produto não está na sacola")

    def esvaziar(self):
        if self._finalizado:
            raise CarrinhoFinalizadoError("carrinho finalizado não permite alterações")
        self._itens.clear()

    def resumo(self):
        subtotal = self.subtotal
        liquido = self.promocao.aplicar(subtotal)
        valor_frete = frete(liquido)
        falta = max(0, FRETE_GRATIS_A_PARTIR_DE - liquido)
        return {
            "pecas": self.quantidade_de_pecas,
            "subtotal": round(subtotal, 2),
            "percentual_desconto": getattr(self.promocao, "pct", 0),
            "valor_desconto": round(subtotal - liquido, 2),
            "subtotal_com_desconto": round(liquido, 2),
            "frete": valor_frete,
            "frete_gratis": valor_frete == 0,
            "falta_para_frete_gratis": ceil(falta * 100 - 1e-9) / 100,
            "total": round(self.total, 2),
            "itens": [{"id": produto.id, **produto.para_dict(), "quantidade": quantidade,
                       "subtotal": round(produto.preco * quantidade, 2)}
                      for produto, quantidade in self._itens],
        }

    @property
    def itens(self):
        return list(self._itens)

    @property
    def quantidade_de_pecas(self):
        return sum(quantidade for produto, quantidade in self._itens)

    @property
    def subtotal(self):
        return total_carrinho([
            (produto.preco, quantidade) for produto, quantidade in self._itens
        ])

    @property
    def total(self):
        valor_com_desconto = self.promocao.aplicar(self.subtotal)
        return valor_com_desconto + frete(valor_com_desconto)

    def finalizar(self):
        if not self._itens:
            raise ValueError("não é possível finalizar um carrinho vazio")
        self._finalizado = True
