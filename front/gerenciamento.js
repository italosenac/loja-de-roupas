let produtos = [];
let produtoParaExcluir;
const estado = document.querySelector("#estado-gerenciamento");
const tabela = document.querySelector("#lista-produtos");
const busca = document.querySelector("#busca-gerenciamento");
const dialogo = document.querySelector("#confirmacao-exclusao");

function renderizarProdutos() {
  const termo = busca.value.trim().toLowerCase();
  const encontrados = produtos.filter(produto => produto.nome.toLowerCase().includes(termo));
  tabela.replaceChildren();
  for (const produto of encontrados) {
    const linha = document.createElement("tr");
    for (const valor of [produto.id, produto.nome, produto.tipo === "Calca" ? "Calça" : produto.tipo, produto.tamanho, formatarDinheiro(produto.preco)]) {
      linha.append(criarElemento("td", "", valor));
    }
    const acoes = criarElemento("td", "acoes-tabela");
    const detalhes = criarElemento("button", "botao-secundario", "Detalhes");
    detalhes.onclick = () => mostrarDetalhes(produto.id);
    const editar = criarElemento("a", "botao botao-secundario", "Editar");
    editar.href = "cadastro.html?id=" + produto.id;
    const excluir = criarElemento("button", "botao-perigo", "Excluir");
    excluir.onclick = () => {
      produtoParaExcluir = produto;
      document.querySelector("#nome-exclusao").textContent = produto.nome;
      document.querySelector("#estado-exclusao").textContent = "";
      dialogo.showModal();
    };
    acoes.append(detalhes, editar, excluir);
    linha.append(acoes);
    tabela.append(linha);
  }
  if (!encontrados.length) mostrarMensagem(estado, produtos.length ? "Nenhum produto encontrado." : "Nenhum produto cadastrado.", "pronto");
}

async function buscarProdutos() {
  produtos = await requisitar("/produtos");
  estado.textContent = "";
  renderizarProdutos();
}

async function iniciarGerenciamento() {
  try {
    await requisitar("/openapi.json");
    document.querySelector("#area-administrativa").hidden = false;
    await buscarProdutos();
    const informacao = await requisitar("/");
    document.querySelector("#informacoes-api").textContent = JSON.stringify(informacao, null, 2);
    document.querySelector("#link-swagger").href = API + "/docs";
  } catch (erro) {
    mostrarMensagem(estado, erro.message);
  }
}

document.querySelector("#cancelar-exclusao").onclick = () => dialogo.close();
document.querySelector("#confirmar-exclusao").onclick = async evento => {
  const botao = evento.currentTarget;
  botao.disabled = true;
  try {
    await requisitar("/produtos/" + produtoParaExcluir.id, { method: "DELETE" });
    dialogo.close();
    await buscarProdutos();
    mostrarMensagem(estado, produtoParaExcluir.nome + " excluído do catálogo.", "sucesso");
  } catch (erro) {
    mostrarMensagem(document.querySelector("#estado-exclusao"), erro.message);
  } finally {
    botao.disabled = false;
  }
};
busca.addEventListener("input", () => { estado.textContent = ""; renderizarProdutos(); });
iniciarGerenciamento();
