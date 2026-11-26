function formatarDinheiro(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

async function requisitar(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(API + caminho, { credentials: "include", ...opcoes });
  } catch (erro) {
    throw new Error("Não foi possível falar com a loja. Verifique a conexão e tente novamente.");
  }
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    let mensagem = typeof dados?.detail === "string" ? dados.detail : "Verifique os dados informados.";
    if (resposta.status === 403) mensagem = "Esta operação está disponível apenas para o acesso autorizado da administração.";
    if (resposta.status >= 500) mensagem = "A loja está temporariamente indisponível. Tente novamente em instantes.";
    const erro = new Error(mensagem);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function mostrarMensagem(elemento, texto, estado = "erro") {
  elemento.textContent = texto;
  elemento.dataset.estado = estado;
}

function mostrarContador(quantidade) {
  document.querySelectorAll("[data-contador]").forEach(elemento => {
    elemento.textContent = quantidade;
    elemento.removeAttribute("title");
  });
}

async function atualizarContador() {
  try {
    const resumo = await requisitar("/carrinho/total");
    mostrarContador(resumo.pecas);
    return resumo;
  } catch (erro) {
    document.querySelectorAll("[data-contador]").forEach(elemento => {
      elemento.textContent = "—";
      elemento.title = "Sacola indisponível";
    });
    return null;
  }
}

const sessaoPronta = atualizarContador();

async function adicionarProduto(produtoId, quantidade = 1) {
  await sessaoPronta;
  const resultado = await requisitar("/carrinho/itens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ produto_id: produtoId, quantidade }),
  });
  mostrarContador(resultado.pecas_no_carrinho);
  return resultado;
}

function imagemProduto(produto) {
  const imagem = document.createElement("img");
  imagem.src = produto.tipo === "Calca" ? "img/calca.svg" : "img/camiseta.svg";
  imagem.alt = "";
  imagem.width = 112;
  imagem.height = 112;
  return imagem;
}

async function mostrarDetalhes(produtoId) {
  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo detalhes-produto";
  dialogo.setAttribute("aria-labelledby", "titulo-detalhes");
  dialogo.innerHTML = '<h2 id="titulo-detalhes">Detalhes da peça</h2><div id="dados-detalhes"></div><p id="estado-detalhes" class="mensagem" role="status">Carregando produto...</p><button type="button" class="botao-secundario fechar-dialogo">Voltar</button>';
  document.body.append(dialogo);
  dialogo.querySelector(".fechar-dialogo").onclick = () => dialogo.close();
  dialogo.addEventListener("close", () => dialogo.remove());
  dialogo.showModal();
  const estado = dialogo.querySelector("#estado-detalhes");
  try {
    const produto = await requisitar("/produtos/" + produtoId);
    const conteudo = dialogo.querySelector("#dados-detalhes");
    const tipo = produto.tipo === "Calca" ? "Calça" : produto.tipo;
    conteudo.append(imagemProduto(produto),
      criarElemento("h3", "", produto.nome),
      criarElemento("p", "", tipo + " · Tamanho " + produto.tamanho),
      criarElemento("p", "preco", formatarDinheiro(produto.preco)));
    if (produto.manga) conteudo.append(criarElemento("p", "", "Manga: " + produto.manga));
    if (produto.modelagem) conteudo.append(criarElemento("p", "", "Modelagem: " + produto.modelagem));
    const rotulo = criarElemento("label", "", "Quantidade para adicionar (1 a 10)");
    rotulo.htmlFor = "quantidade-detalhes";
    const quantidade = document.createElement("input");
    quantidade.id = "quantidade-detalhes";
    quantidade.type = "number";
    quantidade.min = "1";
    quantidade.max = "10";
    quantidade.step = "1";
    quantidade.value = "1";
    quantidade.required = true;
    const botao = criarElemento("button", "", "Adicionar à sacola");
    botao.type = "button";
    botao.onclick = async () => {
      if (!quantidade.reportValidity()) return;
      botao.disabled = true;
      try {
        await adicionarProduto(produto.id, Number(quantidade.value));
        mostrarMensagem(estado, "Peça adicionada à sua sacola.", "sucesso");
      } catch (erro) {
        mostrarMensagem(estado, erro.message);
      } finally {
        botao.disabled = false;
      }
    };
    conteudo.append(rotulo, quantidade, botao);
    estado.textContent = "";
  } catch (erro) {
    mostrarMensagem(estado, erro.message);
  }
}
