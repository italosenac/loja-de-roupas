import pytest
from sqlmodel import Session

from loja.banco import criar_tabelas, engine_em_memoria
from loja.repositorio import RepositorioProdutos
from loja.servico import DadosInvalidos, ProdutoJaExiste, ProdutoNaoEncontrado, ServicoCatalogo

CAMISETA = {"tipo": "Camiseta", "nome": "Camiseta básica", "preco": 39.90,
            "tamanho": "M", "manga": "curta"}


@pytest.fixture
def servico():
    engine = engine_em_memoria()
    criar_tabelas(engine)
    with Session(engine) as sessao:
        yield ServicoCatalogo(RepositorioProdutos(sessao))
    engine.dispose()


def test_cadastra_busca_e_filtra(servico):
    produto = servico.cadastrar(CAMISETA)
    assert produto["id"] == 1
    assert servico.buscar(1) == produto
    assert servico.listar("M", 100) == [produto]


def test_nome_repetido_nao_entra(servico):
    servico.cadastrar(CAMISETA)
    with pytest.raises(ProdutoJaExiste):
        servico.cadastrar({**CAMISETA, "nome": "  Camiseta básica  "})


def test_regra_do_dominio_vira_dados_invalidos(servico):
    for alteracao in ({"preco": 0}, {"nome": " "}, {"tamanho": "XL"}, {"manga": "regata"}):
        with pytest.raises(DadosInvalidos):
            servico.cadastrar({**CAMISETA, **alteracao})


def test_tipo_desconhecido_e_invalido(servico):
    with pytest.raises(DadosInvalidos):
        servico.cadastrar({**CAMISETA, "tipo": "Sapato"})
    with pytest.raises(DadosInvalidos):
        servico.cadastrar({**CAMISETA, "tipo": "Calca"})


def test_buscar_inexistente(servico):
    with pytest.raises(ProdutoNaoEncontrado):
        servico.buscar(99)


def test_atualiza_sem_duplicar_nome(servico):
    servico.cadastrar(CAMISETA)
    atualizado = servico.atualizar(1, {**CAMISETA, "preco": 45})
    assert atualizado["preco"] == 45
    servico.cadastrar({"nome": "Moletom", "preco": 159.90, "tamanho": "P"})
    with pytest.raises(ProdutoJaExiste):
        servico.atualizar(1, {**CAMISETA, "nome": "Moletom"})
    with pytest.raises(ProdutoNaoEncontrado):
        servico.atualizar(99, CAMISETA)


def test_remove_e_informa_inexistente(servico):
    servico.cadastrar(CAMISETA)
    servico.remover(1)
    assert servico.listar() == []
    with pytest.raises(ProdutoNaoEncontrado):
        servico.remover(1)
