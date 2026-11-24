import pytest
from sqlmodel import Session

from loja.banco import criar_engine, criar_tabelas, engine_em_memoria
from loja.produto import Calca, Camiseta, Produto
from loja.repositorio import RepositorioProdutos


@pytest.fixture
def repositorio():
    engine = engine_em_memoria()
    criar_tabelas(engine)
    with Session(engine) as sessao:
        yield RepositorioProdutos(sessao)
    engine.dispose()


@pytest.mark.parametrize("produto", [
    Produto("Moletom", 159.90, "P"),
    Camiseta("Camiseta básica", 39.90, "M", "curta"),
    Calca("Calça jeans", 129.90, "G", "reta"),
])
def test_grava_e_reconstroi_o_tipo_do_produto(repositorio, produto):
    produto_id = repositorio.adicionar(produto)
    produto_encontrado = repositorio.buscar(produto_id)
    assert type(produto_encontrado) is type(produto)
    assert produto_encontrado.para_dict() == produto.para_dict()


def test_listagem_filtros_e_nome_unico(repositorio):
    produto_id = repositorio.adicionar(Produto("Camiseta básica", 39.90, "M"))
    repositorio.adicionar(Produto("Moletom", 159.90, "P"))
    assert len(repositorio.listar()) == 2
    assert [produto.nome for _, produto in repositorio.listar("M", 100)] == ["Camiseta básica"]
    assert repositorio.listar("G") == []
    assert repositorio.existe_nome("Camiseta básica")
    assert not repositorio.existe_nome("Camiseta básica", exceto_id=produto_id)


def test_atualiza_remove_e_identifica_inexistente(repositorio):
    produto_id = repositorio.adicionar(Camiseta("Camiseta", 39.90, "M", "longa"))
    assert repositorio.atualizar(produto_id, Calca("Calça", 100, "G", "reta"))
    assert repositorio.buscar(produto_id).para_dict() == {
        "tipo": "Calca", "nome": "Calça", "preco": 100, "tamanho": "G", "modelagem": "reta"
    }
    assert repositorio.remover(produto_id)
    assert repositorio.buscar(produto_id) is None
    assert not repositorio.remover(produto_id)
    assert not repositorio.atualizar(produto_id, Produto("Moletom", 159.90, "P"))


def test_dados_sobrevivem_ao_reinicio(tmp_path):
    url = f"sqlite:///{tmp_path / 'loja.db'}"
    engine = criar_engine(url)
    criar_tabelas(engine)
    with Session(engine) as sessao:
        produto_id = RepositorioProdutos(sessao).adicionar(Produto("Moletom", 159.90, "P"))
    engine.dispose()
    outro_engine = criar_engine(url)
    with Session(outro_engine) as sessao:
        assert RepositorioProdutos(sessao).buscar(produto_id).nome == "Moletom"
    outro_engine.dispose()
