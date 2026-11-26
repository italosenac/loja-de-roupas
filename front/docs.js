let dadosDocs;
let aulaAtual;
const respostas = {};
const avaliacoes = ["", "Preciso revisar", "Entendi parcialmente", "Consigo explicar"];
const estadoDocs = document.querySelector("#estado-docs");
const chaveResposta = id => "loja.docs.v1." + id;

function identificarColunas() {
  document.querySelectorAll(".docs .tabela-responsiva table").forEach(tabela => {
    tabela.setAttribute("role", "table");
    const rotulos = [...tabela.querySelectorAll("thead th")].map(coluna => coluna.textContent.trim());
    tabela.querySelectorAll("tbody tr").forEach(linha => {
      [...linha.cells].forEach((celula, indice) => { celula.dataset.rotulo = rotulos[indice]; });
    });
  });
}

function lerResposta(id, respostaInicial) {
  const inicial = { resposta: respostaInicial, avaliacao: "", feedback: "" };
  try {
    const registro = JSON.parse(localStorage.getItem(chaveResposta(id)) || "null");
    if (registro && registroValido(registro)) return registro;
    localStorage.setItem(chaveResposta(id), JSON.stringify(inicial));
    return inicial;
  } catch {
    return inicial;
  }
}

function registroValido(registro) {
  return registro && typeof registro === "object" && !Array.isArray(registro)
    && typeof registro.resposta === "string" && registro.resposta.length <= 20000
    && typeof registro.feedback === "string" && registro.feedback.length <= 2000
    && avaliacoes.includes(registro.avaliacao);
}

function atualizarProgresso() {
  const todas = dadosDocs.aulas.flatMap(aula => aula.questoes);
  const contar = questoes => questoes.filter(questao => respostas[questao.id].resposta.trim()).length;
  document.querySelector("#progresso-geral").textContent = contar(todas) + "/" + todas.length + " respondidas no total";
  for (const aula of dadosDocs.aulas) {
    document.querySelector("#aba-" + aula.numero).textContent = "Aula " + aula.numero + " · " + contar(aula.questoes) + "/" + aula.questoes.length;
  }
  if (aulaAtual) document.querySelector("#progresso-aula").textContent = contar(aulaAtual.questoes) + "/" + aulaAtual.questoes.length + " respondidas nesta aula";
}

function salvarResposta(id, registro) {
  try {
    localStorage.setItem(chaveResposta(id), JSON.stringify(registro));
    respostas[id] = registro;
    estadoDocs.textContent = "Rascunho salvo neste navegador.";
    atualizarProgresso();
  } catch {
    estadoDocs.textContent = "Não foi possível salvar no navegador. Exporte suas respostas antes de sair.";
    respostas[id] = registro;
    atualizarProgresso();
  }
}

function campoTexto(rotulo, id, valor, limite) {
  const label = criarElemento("label", "", rotulo);
  label.htmlFor = id;
  const campo = document.createElement("textarea");
  campo.id = id;
  campo.value = valor;
  campo.maxLength = limite;
  campo.rows = 4;
  campo.addEventListener("input", () => ajustarAltura(campo));
  return { label, campo };
}

function ajustarAltura(campo) {
  campo.style.height = "auto";
  campo.style.height = campo.scrollHeight + 2 + "px";
}

function criarQuestao(questao, indice) {
  const artigo = criarElemento("article", "questao-docs");
  artigo.dataset.questao = questao.id;
  artigo.append(criarElemento("p", "sobretitulo", "FASE " + questao.fase + " · SLIDE " + questao.slide), criarElemento("h3", "", (indice + 1) + ". " + questao.enunciado));
  const registro = respostas[questao.id];
  const resposta = campoTexto("Sua resposta", "resposta-" + questao.id, registro.resposta, 20000);
  const feedback = campoTexto("Sua anotação de revisão", "feedback-" + questao.id, registro.feedback, 2000);
  feedback.campo.rows = 2;
  const rotulo = criarElemento("label", "", "Autoavaliação (opcional)");
  const avaliacao = document.createElement("select");
  avaliacao.id = "avaliacao-" + questao.id;
  rotulo.htmlFor = avaliacao.id;
  for (const valor of avaliacoes) {
    const opcao = criarElemento("option", "", valor || "Ainda não avaliei");
    opcao.value = valor;
    avaliacao.append(opcao);
  }
  avaliacao.value = registro.avaliacao;
  const salvar = () => salvarResposta(questao.id, { resposta: resposta.campo.value, avaliacao: avaliacao.value, feedback: feedback.campo.value });
  resposta.campo.addEventListener("input", salvar);
  feedback.campo.addEventListener("input", salvar);
  avaliacao.addEventListener("change", salvar);
  const botao = criarElemento("button", "botao-secundario", "Salvar resposta");
  botao.type = "button";
  botao.onclick = salvar;
  const limpar = criarElemento("button", "botao-perigo", "Limpar esta resposta");
  limpar.type = "button";
  limpar.onclick = () => {
    if (!confirm("Limpar somente sua resposta e revisão desta questão?")) return;
    resposta.campo.value = "";
    feedback.campo.value = "";
    avaliacao.value = "";
    salvar();
  };
  const referencia = document.createElement("details");
  referencia.append(criarElemento("summary", "", "Revelar resposta de referência"), criarElemento("p", "", questao.referencia), criarElemento("small", "", "Referência de estudo · Aula " + aulaAtual.numero + ", fase " + questao.fase + ", slide " + questao.slide + "."));
  const acoes = criarElemento("div", "dialogo-acoes");
  acoes.append(botao, limpar);
  artigo.append(resposta.label, resposta.campo, rotulo, avaliacao, feedback.label, feedback.campo, acoes, referencia);
  return artigo;
}

function mostrarAula(aula) {
  aulaAtual = aula;
  document.querySelector("#visao-geral").hidden = !!aula;
  document.querySelector("#aula-docs").hidden = !aula;
  document.querySelectorAll("#navegacao-docs button").forEach(botao => botao.setAttribute("aria-pressed", String(botao.id === (aula ? "aba-" + aula.numero : "aba-geral"))));
  if (aula) {
    document.querySelector("#titulo-aula").textContent = "Aula " + aula.numero + " · " + aula.titulo;
    document.querySelector("#resumo-aula").textContent = aula.resumo;
    document.querySelector("#objetivos-aula").replaceChildren(...aula.objetivos.map(texto => criarElemento("li", "", texto)));
    document.querySelector("#checklist-aula").replaceChildren(...aula.checklist.map(texto => criarElemento("li", "", texto)));
    document.querySelector("#questoes-docs").replaceChildren(...aula.questoes.map(criarQuestao));
    document.querySelectorAll("#questoes-docs textarea").forEach(ajustarAltura);
  }
  atualizarProgresso();
}

function exportarRespostas(formato) {
  const conteudo = formato === "json" ? JSON.stringify({ versao: 1, exportado_em: new Date().toISOString(), respostas }, null, 2)
    : dadosDocs.aulas.map(aula => "AULA " + aula.numero + " · " + aula.titulo + "\n\n" + aula.questoes.map((questao, indice) => {
      const registro = respostas[questao.id];
      return (indice + 1) + ". " + questao.enunciado + "\n" + registro.resposta + "\nAutoavaliação: " + registro.avaliacao + "\nRevisão: " + registro.feedback;
    }).join("\n\n")).join("\n\n");
  const endereco = URL.createObjectURL(new Blob([conteudo], { type: formato === "json" ? "application/json" : "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = endereco;
  link.download = "loja-respostas-cloud." + formato;
  link.click();
  setTimeout(() => URL.revokeObjectURL(endereco), 1000);
}

async function importarRespostas(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  try {
    if (arquivo.size > 3000000) throw new Error("Arquivo maior que 3 MB.");
    const dados = JSON.parse(await arquivo.text());
    if (dados.versao !== 1 || !dados.respostas || typeof dados.respostas !== "object" || Array.isArray(dados.respostas)) throw new Error("Formato de exportação inválido.");
    const registros = Object.entries(dados.respostas);
    if (registros.some(([id, registro]) => !Object.hasOwn(respostas, id) || !registroValido(registro))) throw new Error("Questão desconhecida ou resposta inválida.");
    if (!confirm("Importar " + registros.length + " registros e substituir as respostas correspondentes neste navegador?")) return;
    for (const [id, registro] of registros) salvarResposta(id, { resposta: registro.resposta, avaliacao: registro.avaliacao, feedback: registro.feedback });
    mostrarAula(aulaAtual);
    estadoDocs.textContent = "Respostas importadas. Nenhum dado foi enviado a um servidor.";
  } catch (erro) {
    estadoDocs.textContent = "Não foi possível importar: " + erro.message;
  } finally {
    evento.target.value = "";
  }
}

async function iniciarDocs() {
  try {
    const resposta = await fetch("docs-dados.json?v=ui-20261126-2", { cache: "no-cache" });
    if (!resposta.ok) throw new Error("Material de estudo indisponível.");
    dadosDocs = await resposta.json();
    const navegacao = document.querySelector("#navegacao-docs");
    for (const aula of [null, ...dadosDocs.aulas]) {
      const botao = criarElemento("button", "botao-secundario", aula ? "Aula " + aula.numero : "Arquitetura");
      botao.type = "button";
      botao.id = aula ? "aba-" + aula.numero : "aba-geral";
      botao.onclick = () => mostrarAula(aula);
      navegacao.append(botao);
    }
    for (const aula of dadosDocs.aulas) {
      for (const questao of aula.questoes) respostas[questao.id] = lerResposta(questao.id, questao.resposta_inicial ?? questao.referencia);
      const link = criarElemento("a", "", "Aula " + aula.numero + " · " + aula.titulo + " · " + aula.slides + " slides");
      link.href = aula.fonte;
      link.target = "_blank";
      link.rel = "noopener";
      const item = document.createElement("li");
      item.append(link);
      document.querySelector("#fontes-docs").append(item);
    }
    document.querySelector("#rastreabilidade").textContent = "Leitura integral em " + dadosDocs.consultado_em + ". Os cinco HTMLs publicados correspondem ao commit " + dadosDocs.sha + " do repositório público de materiais. " + dadosDocs.nota;
    const retornoEvidencias = await fetch("docs-evidencias.json?v=ui-20261126-2", { cache: "no-cache" });
    if (!retornoEvidencias.ok) throw new Error("Evidências indisponíveis; recarregue a página.");
    const prova = await retornoEvidencias.json();
    const evidencias = [
      ["Coding · EC2 / FastAPI / SQLite", "Implementado e testado", (prova.revisao_respostas?.pytest ?? prova.revisao_visual?.pytest ?? prova.testes.pytest) + " testes aprovados na revisão indicada nas evidências; SQLite íntegro e três produtos preservados."],
      ["Carrinho individual", "Implementado e testado", "Dois clientes isolados; assinatura de sessão; cookies HttpOnly/Secure/SameSite; respostas no-store. Sessões expiram em 30 minutos e se perdem ao reiniciar o processo."],
      ["S3 / CloudFront", "Implementado e testado", "Frontend funcional publicado por HTTPS; fontes e SVGs preservados. CRUD de produtos aberto para testes da demo."],
      ["S3 · Aula 10", "Implementado e testado", "Dez amostras isoladas, uma Standard-IA; regras Enabled conferidas. Transições de 30/90 dias não ocorreram. Limpeza: " + prova.s3.limpeza + "."],
      ["Cloud · DynamoDB / VPC", "Implementado e testado", "Catálogo real em tabela sob demanda; Lambda em duas sub-redes privadas; endpoints Gateway. Laboratório respondeu 500 antes e 200 depois do endpoint."],
      ["Cloud · SQS / consumidor", "Implementado e testado", prova.carga.enviados + " respostas 202; concorrência máxima " + prova.consumidor.concorrencia_observada + "; 101 conclusões únicas; duplicata reconhecida; três falhas sintéticas e DLQ."],
      ["CloudWatch / SNS", "Alarme testado; assinatura confirmada", "Histórico real OK → ALARM e ação SNS executada. Assinatura confirmada pela AWS; recebimento do alerta histórico não comprovado."],
      ["Cenários da Aula 14", "Simulação", "Dez situações explicadas no caderno, sem provocar incidente regional."],
      ["Orçamento", "Configurado", "US$ 1/mês com alerta a 80%, filtrado por Project=loja-de-roupas. Tag de custo ativada; faturamento pode levar tempo para refletir o escopo."],
      ["Capturas de console / Teams", "Escopo registrado", "Evidências textuais AWS e gráfico real disponíveis. Documento complementar não publicado; roteiro público utilizado. Não houve captura do console ou entrega no Teams."]
    ];
    document.querySelector("#evidencias-docs").replaceChildren(...evidencias.map(linha => {
      const tr = document.createElement("tr");
      tr.append(...linha.map(valor => criarElemento("td", "", valor)));
      return tr;
    }));
    identificarColunas();
    mostrarAula(null);
    document.querySelector("#exportar-json").disabled = false;
    document.querySelector("#exportar-txt").disabled = false;
    document.querySelector("#importar-docs").disabled = false;
    document.querySelector("#importar-arquivo").disabled = false;
    estadoDocs.textContent = "Você pode revisar e editar quando quiser; suas alterações ficam salvas neste navegador.";
  } catch (erro) {
    estadoDocs.textContent = erro.message;
  }
}

document.querySelector("#exportar-json").onclick = () => exportarRespostas("json");
document.querySelector("#exportar-txt").onclick = () => exportarRespostas("txt");
document.querySelector("#importar-docs").onchange = importarRespostas;
document.querySelector("#importar-arquivo").onclick = () => document.querySelector("#importar-docs").click();
window.addEventListener("resize", () => document.querySelectorAll("#questoes-docs textarea").forEach(ajustarAltura));
iniciarDocs();
