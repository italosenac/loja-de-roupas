const formulario = document.querySelector("#form-produto");
const aviso = document.querySelector("#aviso");
const botaoCadastrar = formulario.querySelector("button");

function lerCampo(nome) {
  return document.querySelector(`#${nome}`).value;
}

function atualizarCampos() {
  document.querySelector("#campo-manga").hidden = lerCampo("tipo") !== "Camiseta";
  document.querySelector("#campo-modelagem").hidden = lerCampo("tipo") !== "Calca";
  document.querySelector("#modelagem").required = lerCampo("tipo") === "Calca";
}

async function cadastrarProduto(evento) {
  evento.preventDefault();
  aviso.dataset.estado = "erro";
  const dados = {
    tipo: lerCampo("tipo"),
    nome: lerCampo("nome").trim(),
    preco: Number(lerCampo("preco")),
    tamanho: lerCampo("tamanho"),
  };
  if (dados.nome === "") {
    aviso.textContent = "Informe o nome do produto.";
    return;
  }
  if (!(dados.preco > 0)) {
    aviso.textContent = "O preço precisa ser maior que zero.";
    return;
  }
  if (dados.tipo === "Camiseta") {
    dados.manga = lerCampo("manga");
  }
  if (dados.tipo === "Calca") {
    dados.modelagem = lerCampo("modelagem").trim();
    if (dados.modelagem === "") {
      aviso.textContent = "Informe a modelagem da calça.";
      return;
    }
  }
  botaoCadastrar.disabled = true;
  aviso.textContent = "Cadastrando produto...";
  aviso.dataset.estado = "carregando";
  try {
    const resposta = await fetch(`${API}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      const detalhe = typeof corpo.detail === "string" ? corpo.detail : "Verifique os campos do produto.";
      aviso.textContent = resposta.status === 403
        ? "O cadastro está disponível apenas para o acesso autorizado da loja."
        : `Não cadastrou: ${detalhe}`;
      aviso.dataset.estado = "erro";
    } else {
      aviso.textContent = `${corpo.nome} cadastrado com o número ${corpo.id}.`;
      formulario.reset();
      atualizarCampos();
      aviso.dataset.estado = "sucesso";
    }
  } catch (erro) {
    aviso.textContent = "Não foi possível concluir o cadastro. Verifique sua conexão e tente novamente.";
    aviso.dataset.estado = "erro";
  }
  botaoCadastrar.disabled = false;
}

formulario.addEventListener("submit", cadastrarProduto);
document.querySelector("#tipo").addEventListener("change", atualizarCampos);
atualizarCampos();
