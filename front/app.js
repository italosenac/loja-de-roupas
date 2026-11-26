let produtos = [];
let falhaCarregamento = false;
const vitrine = document.querySelector("#vitrine");
const busca = document.querySelector("#busca");
const estado = document.querySelector("#estado");
const quantidade = document.querySelector("#quantidade");
const filtros = document.querySelector("#filtros");

function montarCard(produto) {
  const cartao = criarElemento("article", "produto");
  const visual = criarElemento("div", "produto-visual");
  visual.append(imagemProduto(produto),
    criarElemento("span", "produto-tipo", produto.tipo === "Calca" ? "Calça" : produto.tipo));
  const informacao = criarElemento("div", "produto-informacao");
  informacao.append(criarElemento("h3", "", produto.nome));
  const detalhes = criarElemento("div", "produto-detalhes");
  detalhes.append(criarElemento("p", "tamanho", "Tamanho " + produto.tamanho),
    criarElemento("p", "preco", formatarDinheiro(produto.preco)));
  const acoes = criarElemento("div", "produto-acoes");
  const consultar = criarElemento("button", "botao-secundario", "Ver detalhes");
  consultar.type = "button";
  consultar.onclick = () => mostrarDetalhes(produto.id);
  const adicionar = criarElemento("button", "", "Adicionar à sacola");
  adicionar.type = "button";
  adicionar.onclick = async () => {
    adicionar.disabled = true;
    const mensagem = document.querySelector("#estado-acao");
    try {
      await adicionarProduto(produto.id);
      mostrarMensagem(mensagem, produto.nome + " adicionado à sua sacola.", "sucesso");
    } catch (erro) {
      mostrarMensagem(mensagem, erro.message);
    } finally {
      adicionar.disabled = false;
    }
  };
  acoes.append(consultar, adicionar);
  informacao.append(detalhes, acoes);
  cartao.append(visual, informacao);
  return cartao;
}

function filtrarProdutos() {
  if (falhaCarregamento) return;
  const termo = busca.value.trim().toLowerCase();
  const encontrados = produtos.filter(produto => produto.nome.toLowerCase().includes(termo));
  vitrine.replaceChildren(...encontrados.map(montarCard));
  quantidade.textContent = encontrados.length + (encontrados.length === 1 ? " peça" : " peças");
  const temFiltro = termo || document.querySelector("#filtro-tamanho").value || document.querySelector("#filtro-preco").value;
  estado.textContent = encontrados.length ? "" : temFiltro
    ? "Nenhum produto encontrado. Experimente outros filtros."
    : "Nenhum produto cadastrado ainda.";
  estado.dataset.estado = "pronto";
}

async function buscarProdutos() {
  busca.disabled = true;
  mostrarMensagem(estado, "Carregando produtos...", "carregando");
  filtros.querySelectorAll("input, select, button").forEach(campo => campo.disabled = true);
  try {
    const parametros = new URLSearchParams();
    const tamanho = document.querySelector("#filtro-tamanho").value;
    const preco = document.querySelector("#filtro-preco").value;
    if (tamanho) parametros.set("tamanho", tamanho);
    if (preco !== "") parametros.set("preco_max", preco);
    produtos = await requisitar("/produtos?" + parametros);
    falhaCarregamento = false;
    filtrarProdutos();
  } catch (erro) {
    produtos = [];
    falhaCarregamento = true;
    vitrine.replaceChildren();
    quantidade.textContent = "";
    mostrarMensagem(estado, erro.message);
  } finally {
    busca.disabled = false;
    filtros.querySelectorAll("input, select, button").forEach(campo => campo.disabled = false);
  }
}

busca.addEventListener("input", filtrarProdutos);
filtros.addEventListener("submit", evento => { evento.preventDefault(); buscarProdutos(); });
document.querySelector("#limpar-filtros").onclick = () => { filtros.reset(); busca.value = ""; buscarProdutos(); };
buscarProdutos();
