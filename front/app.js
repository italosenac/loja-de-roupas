const produtos = [
  { nome: "Camiseta básica", preco: 39.90, tamanho: "M" },
  { nome: "Calça jeans", preco: 129.90, tamanho: "G" },
  { nome: "Moletom", preco: 159.90, tamanho: "P" },
];

const vitrine = document.querySelector("#vitrine");
const busca = document.querySelector("#busca");
const formulario = document.querySelector("#form-produto");
const aviso = document.querySelector("#aviso");

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
}

if (busca) {
  busca.addEventListener("input", filtrarProdutos);
}

if (formulario) {
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    const nome = document.querySelector("#nome").value.trim();
    const preco = Number(document.querySelector("#preco").value);
    const tamanho = document.querySelector("#tamanho").value;
    if (nome === "") {
      aviso.textContent = "Informe o nome do produto.";
      return;
    }
    if (!(preco > 0)) {
      aviso.textContent = "O preço precisa ser maior que zero.";
      return;
    }
    produtos.push({ nome, preco, tamanho });
    renderizarVitrine(produtos);
    formulario.reset();
    aviso.textContent = "Produto cadastrado nesta sessão. Os dados são temporários.";
  });
}

renderizarVitrine(produtos);
