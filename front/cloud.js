let produtosCloud = [];
let enviandoPedido = false;
const estadoCloud = document.querySelector("#estado-cloud");
const estadoPedidoCloud = document.querySelector("#estado-pedido-cloud");

async function requisitarCloud(caminho, dados) {
  let retorno;
  try {
    retorno = await fetch("/cloud-api" + caminho, dados === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados),
    });
  } catch {
    throw new Error("Não foi possível conectar à trilha Cloud.");
  }
  const corpo = await retorno.json().catch(() => null);
  if (!retorno.ok) {
    if (retorno.status === 403) throw new Error("Operação disponível somente para o acesso administrativo autorizado.");
    if (retorno.status === 429) throw new Error("Limite temporário atingido. Aguarde antes de tentar novamente.");
    throw new Error(retorno.status >= 500 ? "A trilha Cloud está temporariamente indisponível." : corpo?.erro || "Verifique os dados informados.");
  }
  return corpo;
}

function renderizarCloud() {
  const termo = document.querySelector("#busca-cloud").value.trim().toLowerCase();
  const encontrados = produtosCloud.filter(produto => produto.nome.toLowerCase().includes(termo));
  const cards = encontrados.map(produto => {
    const card = criarElemento("article", "produto");
    const visual = criarElemento("div", "produto-visual");
    visual.append(imagemProduto(produto), criarElemento("span", "produto-tipo", produto.tipo === "Calca" ? "Calça" : produto.tipo));
    const informacao = criarElemento("div", "produto-informacao");
    informacao.append(criarElemento("h3", "", produto.nome), criarElemento("p", "tamanho", "Tamanho " + produto.tamanho), criarElemento("p", "preco", formatarDinheiro(produto.preco)));
    const detalhes = [produto.manga ? "Manga: " + produto.manga : "", produto.modelagem ? "Modelagem: " + produto.modelagem : ""].filter(Boolean).join(" · ");
    if (detalhes) informacao.append(criarElemento("p", "", detalhes));
    const selecionar = criarElemento("button", "botao-secundario", "Selecionar para demonstração");
    selecionar.type = "button";
    selecionar.onclick = () => {
      document.querySelector("#produto-cloud").value = produto.id;
      document.querySelector("#titulo-demonstracao").scrollIntoView({ behavior: "smooth" });
      document.querySelector("#resumo-cloud").hidden = true;
      estadoPedidoCloud.textContent = "Peça selecionada: " + produto.nome;
    };
    informacao.append(selecionar);
    card.append(visual, informacao);
    return card;
  });
  document.querySelector("#vitrine-cloud").replaceChildren(...cards);
  estadoCloud.textContent = encontrados.length ? "Catálogo Cloud consultado no DynamoDB." : produtosCloud.length ? "Nenhum produto encontrado." : "Nenhum produto cadastrado no catálogo Cloud.";
}

async function buscarProdutosCloud() {
  mostrarMensagem(estadoCloud, "Consultando o catálogo Cloud...", "carregando");
  try {
    produtosCloud = await requisitarCloud("/produtos");
    const select = document.querySelector("#produto-cloud");
    select.replaceChildren(...produtosCloud.map(produto => {
      const opcao = criarElemento("option", "", produto.nome + " · " + formatarDinheiro(produto.preco));
      opcao.value = produto.id;
      return opcao;
    }));
    document.querySelector("#busca-cloud").disabled = false;
    select.disabled = !produtosCloud.length;
    document.querySelector("#calcular-cloud").disabled = !produtosCloud.length;
    document.querySelector("#enviar-cloud").disabled = !produtosCloud.length || enviandoPedido;
    renderizarCloud();
  } catch (erro) {
    document.querySelector("#vitrine-cloud").replaceChildren();
    document.querySelector("#produto-cloud").disabled = true;
    document.querySelector("#calcular-cloud").disabled = true;
    document.querySelector("#enviar-cloud").disabled = true;
    document.querySelector("#busca-cloud").disabled = true;
    mostrarMensagem(estadoCloud, erro.message);
  }
}

function lerPedidoCloud() {
  if (!document.querySelector("#form-cloud").reportValidity()) return null;
  return { produto_id: Number(document.querySelector("#produto-cloud").value), quantidade: Number(document.querySelector("#quantidade-cloud").value) };
}

document.querySelector("#form-cloud").onsubmit = async evento => {
  evento.preventDefault();
  const pedido = lerPedidoCloud();
  if (!pedido) return;
  try {
    const resumo = await requisitarCloud("/carrinho/total", { itens: [pedido] });
    const lista = document.querySelector("#resumo-cloud");
    lista.replaceChildren();
    for (const [nome, valor] of [["Quantidade", resumo.pecas], ["Subtotal", formatarDinheiro(resumo.subtotal)], ["Desconto " + resumo.percentual_desconto + "%", formatarDinheiro(resumo.valor_desconto)], ["Subtotal após desconto", formatarDinheiro(resumo.subtotal_com_desconto)], ["Frete", resumo.frete_gratis ? "Grátis" : formatarDinheiro(resumo.frete)], ["Total", formatarDinheiro(resumo.total)]]) {
      lista.append(criarElemento("dt", "", nome), criarElemento("dd", "", valor));
    }
    lista.hidden = false;
    estadoPedidoCloud.textContent = resumo.frete_gratis ? "Frete grátis nesta demonstração." : "Faltam " + formatarDinheiro(resumo.falta_para_frete_gratis) + " após desconto para frete grátis.";
  } catch (erro) {
    document.querySelector("#resumo-cloud").hidden = true;
    mostrarMensagem(estadoPedidoCloud, erro.message);
  }
};

document.querySelector("#enviar-cloud").onclick = async () => {
  const pedido = lerPedidoCloud();
  if (!pedido || enviandoPedido || !confirm("Enviar um pedido de demonstração, sem pagamento nem reserva de estoque?")) return;
  enviandoPedido = true;
  document.querySelector("#enviar-cloud").disabled = true;
  try {
    const recebido = await requisitarCloud("/pedidos", pedido);
    mostrarMensagem(estadoPedidoCloud, "Pedido " + recebido.pedido + ": " + recebido.mensagem, "sucesso");
  } catch (erro) {
    mostrarMensagem(estadoPedidoCloud, erro.message);
  } finally {
    enviandoPedido = false;
    document.querySelector("#enviar-cloud").disabled = false;
  }
};
document.querySelector("#produto-cloud").onchange = document.querySelector("#quantidade-cloud").onchange = () => { document.querySelector("#resumo-cloud").hidden = true; };
document.querySelector("#busca-cloud").oninput = renderizarCloud;
document.querySelector("#recarregar-cloud").onclick = buscarProdutosCloud;
buscarProdutosCloud();
