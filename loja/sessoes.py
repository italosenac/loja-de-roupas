from hmac import compare_digest, digest
from secrets import token_bytes, token_urlsafe
from time import monotonic

from loja.carrinho import Carrinho
from loja.promocao import Percentual


class LimiteSessoesError(Exception):
    pass


class SessoesCarrinho:
    def __init__(self, duracao=1800, limite=1000):
        self.duracao = duracao
        self.limite = limite
        self._chave = token_bytes(32)
        self._sessoes = {}

    def assinar(self, identificador):
        assinatura = digest(self._chave, identificador.encode(), "sha256").hex()
        return f"{identificador}.{assinatura}"

    def obter(self, cookie):
        agora = monotonic()
        expiradas = [chave for chave, sessao in self._sessoes.items()
                     if agora - sessao["acesso"] >= self.duracao]
        for chave in expiradas:
            del self._sessoes[chave]

        identificador = ""
        if cookie and cookie.isascii() and len(cookie) <= 200:
            candidato = cookie.split(".", 1)[0]
            if compare_digest(cookie, self.assinar(candidato)):
                identificador = candidato
        if identificador not in self._sessoes:
            if len(self._sessoes) >= self.limite:
                raise LimiteSessoesError("A loja está ocupada. Tente novamente em instantes.")
            identificador = token_urlsafe(32)
            self._sessoes[identificador] = {"carrinho": Carrinho(Percentual(10)), "acesso": agora}
        sessao = self._sessoes[identificador]
        sessao["acesso"] = agora
        return self.assinar(identificador), sessao["carrinho"]
