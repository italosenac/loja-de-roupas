function handler(event) {
  var request = event.request;
  var ipAutorizado = "__IP_ADMINISTRATIVO__";
  var caminho;
  try {
    caminho = decodeURIComponent(request.uri);
  } catch (erro) {
    return { statusCode: 400, statusDescription: "Bad Request" };
  }
  if (caminho.indexOf("%") !== -1 || caminho.indexOf("..") !== -1
      || caminho.indexOf("\\") !== -1 || caminho.indexOf("//") !== -1) {
    return { statusCode: 400, statusDescription: "Bad Request" };
  }
  var trilhaCloud = /^\/cloud-api(?:\/|$)/.test(caminho);
  var laboratorio = caminho.indexOf("/cloud-api/laboratorio") === 0;
  var leitura = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";
  var documentacao = caminho.indexOf("/api/docs") === 0
    || caminho.indexOf("/api/redoc") === 0
    || caminho.indexOf("/api/openapi.json") === 0;
  var itemDaSacola = /^\/api\/carrinho\/itens\/[0-9]+$/.test(caminho);
  var escritaNaSacola = (request.method === "POST" && caminho === "/api/carrinho/itens")
    || (request.method === "PUT" && itemDaSacola)
    || (request.method === "DELETE" && (itemDaSacola || caminho === "/api/carrinho"));
  var demonstracaoCloud = request.method === "POST"
    && (caminho === "/cloud-api/carrinho/total" || caminho === "/cloud-api/pedidos");
  var produtoDaDemo = /^\/api\/produtos\/[0-9]+$/.test(caminho);
  var escritaDeProdutos = (request.method === "POST"
      && (caminho === "/api/produtos" || caminho === "/cloud-api/produtos"))
    || ((request.method === "PUT" || request.method === "DELETE") && produtoDaDemo);

  if (((!leitura && !escritaNaSacola && !demonstracaoCloud && !escritaDeProdutos) || documentacao || laboratorio)
      && event.viewer.ip !== ipAutorizado) {
    return {
      statusCode: 403,
      statusDescription: "Forbidden",
      headers: {
        "content-type": { value: "application/json; charset=utf-8" },
        "cache-control": { value: "no-store" }
      },
      body: JSON.stringify({ detail: "Operacao disponivel apenas para o acesso autorizado da loja." })
    };
  }

  if (trilhaCloud) {
    delete request.headers["x-api-key"];
    delete request.headers["x-loja-laboratorio"];
    if (laboratorio) request.headers["x-loja-laboratorio"] = { value: "autorizado" };
    request.uri = caminho.replace(/^\/cloud-api(?=\/|$)/, "") || "/produtos";
    return request;
  }

  // Evita que o DefaultRootObject da vitrine transforme a raiz da API em index.html.
  request.uri = caminho === "/api" || caminho === "/api/"
    ? "/api/" : caminho.replace(/^\/api(?=\/|$)/, "");
  return request;
}
