let produtos = [];

const vitrine = document.querySelector("#vitrine");
const busca = document.querySelector("#busca");
const estado = document.querySelector("#estado");
const quantidade = document.querySelector("#quantidade");

function montarCard(produto) {
  const cartao = document.createElement("article");
  cartao.className = "produto";
  const visual = document.createElement("div");
  visual.className = "produto-visual";
  const imagem = document.createElement("img");
  imagem.src = produto.tipo === "Calca" ? "img/calca.svg" : "img/camiseta.svg";
  imagem.alt = "";
  imagem.width = 112;
  imagem.height = 112;
  const tipo = document.createElement("span");
  tipo.className = "produto-tipo";
  tipo.textContent = produto.tipo === "Calca" ? "Calça" : produto.tipo;
  visual.append(imagem, tipo);
  const informacao = document.createElement("div");
  informacao.className = "produto-informacao";
  const titulo = document.createElement("h3");
  titulo.textContent = produto.nome;
  const tamanho = document.createElement("p");
  tamanho.className = "tamanho";
  tamanho.textContent = `Tamanho ${produto.tamanho}`;
  const preco = document.createElement("p");
  preco.className = "preco";
  const destaque = document.createElement("strong");
  destaque.textContent = `R$ ${produto.preco.toFixed(2).replace(".", ",")}`;
  preco.append(destaque);
  const detalhes = document.createElement("div");
  detalhes.className = "produto-detalhes";
  detalhes.append(tamanho, preco);
  informacao.append(titulo, detalhes);
  cartao.append(visual, informacao);
  return cartao;
}

function renderizarVitrine(lista) {
  vitrine.innerHTML = "";
  lista.forEach(produto => vitrine.append(montarCard(produto)));
  quantidade.textContent = `${lista.length} ${lista.length === 1 ? "peça" : "peças"}`;
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
  estado.dataset.estado = "carregando";
  busca.disabled = true;
  try {
    const resposta = await fetch(`${API}/produtos`);
    if (!resposta.ok) {
      throw new Error(`A API respondeu ${resposta.status}`);
    }
    produtos = await resposta.json();
    estado.dataset.estado = "pronto";
    filtrarProdutos();
    busca.disabled = false;
  } catch (erro) {
    produtos = [];
    renderizarVitrine(produtos);
    estado.textContent = "Não foi possível carregar a coleção. Tente recarregar a página em instantes.";
    estado.dataset.estado = "erro";
  }
}

busca.addEventListener("input", filtrarProdutos);
buscarProdutos();
