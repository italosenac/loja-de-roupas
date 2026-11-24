from loja.produto import Calca, Camiseta, Produto


def test_produto_vira_dicionario():
    produto = Produto("Moletom", 159.90, "P")
    assert produto.para_dict() == {
        "tipo": "Produto", "nome": "Moletom", "preco": 159.90, "tamanho": "P"
    }


def test_camiseta_acrescenta_a_manga():
    dados = Camiseta("Camiseta básica", 39.90, "M", "curta").para_dict()
    assert dados["tipo"] == "Camiseta"
    assert dados["manga"] == "curta"


def test_calca_acrescenta_a_modelagem():
    dados = Calca("Calça jeans", 129.90, "G", "reta").para_dict()
    assert dados["tipo"] == "Calca"
    assert dados["modelagem"] == "reta"
