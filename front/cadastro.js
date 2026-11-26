const formulario = document.querySelector("#form-produto");
const aviso = document.querySelector("#aviso");
const botaoCadastrar = formulario.querySelector("button");
const campos = formulario.querySelector("fieldset");
const parametrosCadastro = new URLSearchParams(location.search);
const catalogoCloud = parametrosCadastro.get("catalogo") === "cloud";
const produtoId = catalogoCloud ? null : parametrosCadastro.get("id");

async function enviarProdutoCloud(dados) {
  const resposta = await fetch("/cloud-api/produtos", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados),
  });
  const produto = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(resposta.status === 403 ? "Cadastro Cloud disponível somente para o acesso administrativo autorizado."
    : resposta.status >= 500 ? "A trilha Cloud está temporariamente indisponível." : produto?.erro || "Verifique os dados do produto.");
  return produto;
}

function lerCampo(nome) {
  return document.querySelector("#" + nome).value;
}

function atualizarCampos() {
  document.querySelector("#campo-manga").hidden = lerCampo("tipo") !== "Camiseta";
  document.querySelector("#campo-modelagem").hidden = lerCampo("tipo") !== "Calca";
  document.querySelector("#modelagem").required = lerCampo("tipo") === "Calca";
}

async function prepararFormulario() {
  campos.disabled = true;
  try {
    await requisitar("/openapi.json");
    if (catalogoCloud) {
      document.querySelector("#campo-id-cloud").hidden = false;
      document.querySelector("#id-cloud").required = true;
      document.querySelector("h1").textContent = "Uma nova peça na trilha Cloud.";
      document.querySelector("#titulo-formulario").textContent = "Cadastrar no DynamoDB · catálogo independente";
      formulario.querySelector("a").href = "cloud.html";
      formulario.querySelector("a").textContent = "Voltar à vitrine Cloud";
    } else if (produtoId) {
      const produto = await requisitar("/produtos/" + produtoId);
      for (const campo of ["nome", "tipo", "preco", "tamanho", "manga", "modelagem"]) {
        document.querySelector("#" + campo).value = produto[campo] ?? "";
      }
      document.querySelector("h1").textContent = "Uma nova versão da sua peça.";
      document.querySelector("#titulo-formulario").textContent = "Editar produto";
      document.title = "Editar produto · Loja de Roupas";
      botaoCadastrar.textContent = "Salvar alterações";
    }
    atualizarCampos();
    campos.disabled = false;
  } catch (erro) {
    mostrarMensagem(aviso, erro.message);
  }
}

async function cadastrarProduto(evento) {
  evento.preventDefault();
  const dados = { tipo: lerCampo("tipo"), nome: lerCampo("nome").trim(),
    preco: Number(lerCampo("preco")), tamanho: lerCampo("tamanho") };
  if (!dados.nome || !(dados.preco > 0)) {
    mostrarMensagem(aviso, "Informe um nome e um preço maior que zero.");
    return;
  }
  if (dados.tipo === "Camiseta") dados.manga = lerCampo("manga");
  if (catalogoCloud) dados.id = Number(lerCampo("id-cloud"));
  if (dados.tipo === "Calca") {
    dados.modelagem = lerCampo("modelagem").trim();
    if (!dados.modelagem) {
      mostrarMensagem(aviso, "Informe a modelagem da calça.");
      return;
    }
  }
  botaoCadastrar.disabled = true;
  mostrarMensagem(aviso, produtoId ? "Salvando alterações..." : "Cadastrando produto...", "carregando");
  try {
    const produto = catalogoCloud ? await enviarProdutoCloud(dados) : await requisitar("/produtos" + (produtoId ? "/" + produtoId : ""), {
      method: produtoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    mostrarMensagem(aviso, produto.nome + (produtoId ? " atualizado com sucesso." : " cadastrado com o número " + produto.id + "."), "sucesso");
    if (!produtoId || catalogoCloud) {
      formulario.reset();
      atualizarCampos();
    }
  } catch (erro) {
    mostrarMensagem(aviso, erro.message);
  } finally {
    botaoCadastrar.disabled = false;
  }
}

formulario.addEventListener("submit", cadastrarProduto);
document.querySelector("#tipo").addEventListener("change", atualizarCampos);
prepararFormulario();
