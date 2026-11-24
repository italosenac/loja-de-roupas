const API = "http://127.0.0.1:8000";
const formulario = document.querySelector("#form-produto");
const aviso = document.querySelector("#aviso");
const botaoCadastrar = formulario.querySelector("button");

function lerCampo(nome) {
  return document.querySelector(`#${nome}`).value;
}

async function cadastrarProduto(evento) {
  evento.preventDefault();
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
  try {
    const resposta = await fetch(`${API}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      const detalhe = typeof corpo.detail === "string" ? corpo.detail : "Verifique os campos do produto.";
      aviso.textContent = `Não cadastrou: ${detalhe}`;
    } else {
      aviso.textContent = `${corpo.nome} cadastrado com o número ${corpo.id}.`;
      formulario.reset();
    }
  } catch (erro) {
    aviso.textContent = "Não foi possível falar com a API. Ela está ligada?";
    console.error(erro);
  }
  botaoCadastrar.disabled = false;
}

formulario.addEventListener("submit", cadastrarProduto);
