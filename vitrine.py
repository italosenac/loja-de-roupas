TAMANHOS = ("PP", "P", "M", "G", "GG")

produtos_disponiveis = [
    {"nome": "Camiseta básica", "preco": 39.90, "tamanho": "M"},
    {"nome": "Calça jeans", "preco": 129.90, "tamanho": "G"},
    {"nome": "Moletom", "preco": 159.90, "tamanho": "P"},
]
itens_carrinho = [("Camiseta básica", 3), ("Calça jeans", 1)]

precos_produtos = {}
for produto in produtos_disponiveis:
    precos_produtos[produto["nome"]] = produto["preco"]

valor_total = 0
for nome_produto, quantidade in itens_carrinho:
    valor_total += precos_produtos[nome_produto] * quantidade

print("Peças na vitrine:", len(produtos_disponiveis))
print("Total do carrinho: R$", round(valor_total, 2))
