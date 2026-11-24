const API = "http://127.0.0.1:8000";
let produtos = [];

const vitrine = document.querySelector("#vitrine");
const busca = document.querySelector("#busca");
const estado = document.querySelector("#estado");

function montarCard(produto) {
  const cartao = document.createElement("article");
  cartao.className = "produto";
  const titulo = document.createElement("h3");
  titulo.textContent = produto.nome;
  const tamanho = document.createElement("p");
  tamanho.textContent = `Tamanho ${produto.tamanho}`;
  const preco = document.createElement("p");
  preco.className = "preco";
  const destaque = document.createElement("strong");
  destaque.textContent = `R$ ${produto.preco.toFixed(2).replace(".", ",")}`;
  preco.append(destaque);
  cartao.append(titulo, tamanho, preco);
  return cartao;
}

function renderizarVitrine(lista) {
  vitrine.innerHTML = "";
  lista.forEach(produto => vitrine.append(montarCard(produto)));
}

function filtrarProdutos() {
  const termo = busca.value.toLowerCase();
  const produtosEncontrados = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(termo)
  );
  renderizarVitrine(produtosEncontrados);
  if (produtos.length === 0) {
    estado.textContent = "Nenhum produto cadastrado ainda.";
  } else {
    estado.textContent = produtosEncontrados.length === 0 ? "Nenhum produto encontrado." : "";
  }
}

async function buscarProdutos() {
  estado.textContent = "Carregando produtos...";
  busca.disabled = true;
  try {
    const resposta = await fetch(`${API}/produtos`);
    if (!resposta.ok) {
      throw new Error(`A API respondeu ${resposta.status}`);
    }
    produtos = await resposta.json();
    filtrarProdutos();
    busca.disabled = false;
  } catch (erro) {
    produtos = [];
    renderizarVitrine(produtos);
    estado.textContent = "Não foi possível falar com a API. Ela está ligada?";
    console.error(erro);
  }
}

busca.addEventListener("input", filtrarProdutos);
buscarProdutos();
