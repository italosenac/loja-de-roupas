const estado = document.querySelector("#estado-sacola");
const itens = document.querySelector("#itens-sacola");
let ocupado = false;
let ultimoResumo;

function criarItem(item) {
  const artigo = criarElemento("article", "item-sacola");
  artigo.append(imagemProduto(item));
  const informacao = criarElemento("div", "item-informacao");
  informacao.append(criarElemento("h2", "", item.nome),
    criarElemento("p", "", (item.tipo === "Calca" ? "Calça" : item.tipo) + " · Tamanho " + item.tamanho),
    criarElemento("p", "", "Unitário: " + formatarDinheiro(item.preco)),
    criarElemento("p", "preco", formatarDinheiro(item.subtotal)));
  const controle = criarElemento("div", "controle-quantidade");
  const rotulo = criarElemento("label", "sr-only", "Quantidade de " + item.nome);
  rotulo.htmlFor = "quantidade-" + item.id;
  const quantidade = document.createElement("input");
  quantidade.type = "number";
  quantidade.min = "1";
  quantidade.step = "1";
  quantidade.value = item.quantidade;
  quantidade.required = true;
  quantidade.id = rotulo.htmlFor;
  const diminuir = criarElemento("button", "botao-secundario", "−");
  diminuir.setAttribute("aria-label", "Diminuir quantidade de " + item.nome);
  diminuir.disabled = item.quantidade <= 1;
  diminuir.onclick = () => atualizarQuantidade(item.id, item.quantidade - 1);
  const aumentar = criarElemento("button", "botao-secundario", "+");
  aumentar.setAttribute("aria-label", "Aumentar quantidade de " + item.nome);
  aumentar.onclick = () => atualizarQuantidade(item.id, item.quantidade + 1);
  quantidade.onchange = () => {
    if (quantidade.reportValidity()) atualizarQuantidade(item.id, Number(quantidade.value));
  };
  controle.append(rotulo, diminuir, quantidade, aumentar);
  const remover = criarElemento("button", "botao-perigo", "Remover");
  remover.onclick = () => removerProduto(item.id);
  informacao.append(controle, remover);
  artigo.append(informacao);
  return artigo;
}

function renderizarCarrinho(resumo) {
  ultimoResumo = resumo;
  mostrarContador(resumo.pecas);
  const vazio = resumo.pecas === 0;
  document.querySelector("#sacola-vazia").hidden = !vazio;
  document.querySelector("#conteudo-sacola").hidden = vazio;
  itens.replaceChildren(...resumo.itens.map(criarItem));
  if (vazio) return;
  const valores = { pecas: resumo.pecas, subtotal: formatarDinheiro(resumo.subtotal),
    percentual: resumo.percentual_desconto + "%", desconto: "− " + formatarDinheiro(resumo.valor_desconto),
    liquido: formatarDinheiro(resumo.subtotal_com_desconto),
    frete: resumo.frete_gratis ? "Grátis" : formatarDinheiro(resumo.frete),
    total: formatarDinheiro(resumo.total) };
  for (const [nome, valor] of Object.entries(valores)) document.querySelector("#resumo-" + nome).textContent = valor;
  document.querySelector("#economia").textContent = "Você economiza " + formatarDinheiro(resumo.valor_desconto) + " com a promoção.";
  document.querySelector("#progresso-frete").textContent = resumo.frete_gratis
    ? "Frete grátis garantido para esta sacola."
    : "Faltam " + formatarDinheiro(resumo.falta_para_frete_gratis) + " no subtotal após desconto para frete grátis.";
}

async function buscarCarrinho() {
  const resumo = await requisitar("/carrinho/total");
  renderizarCarrinho(resumo);
}

async function alterarCarrinho(caminho, opcoes) {
  if (ocupado) return;
  ocupado = true;
  document.querySelectorAll("#conteudo-sacola button, #conteudo-sacola input").forEach(campo => campo.disabled = true);
  try {
    await requisitar(caminho, opcoes);
    await buscarCarrinho();
    estado.textContent = "";
  } catch (erro) {
    mostrarMensagem(estado, erro.message);
  } finally {
    ocupado = false;
    document.querySelector("#esvaziar-sacola").disabled = false;
    if (ultimoResumo) renderizarCarrinho(ultimoResumo);
  }
}

async function atualizarQuantidade(produtoId, quantidade) {
  await alterarCarrinho("/carrinho/itens/" + produtoId, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantidade }),
  });
}

async function removerProduto(produtoId) {
  await alterarCarrinho("/carrinho/itens/" + produtoId, { method: "DELETE" });
}

document.querySelector("#esvaziar-sacola").onclick = () => alterarCarrinho("/carrinho", { method: "DELETE" });

async function iniciarSacola() {
  mostrarMensagem(estado, "Carregando sua sacola...", "carregando");
  await sessaoPronta;
  try {
    await buscarCarrinho();
    estado.textContent = "";
  } catch (erro) {
    mostrarMensagem(estado, erro.message);
  }
}
iniciarSacola();
