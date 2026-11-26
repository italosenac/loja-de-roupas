function handler(event) {
  var request = event.request;
  var ipAutorizado = "168.0.55.1";
  var caminho;
  try {
    caminho = decodeURIComponent(request.uri);
  } catch (erro) {
    return { statusCode: 400, statusDescription: "Bad Request" };
  }
  var leitura = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";
  var documentacao = caminho.indexOf("/api/docs") === 0
    || caminho.indexOf("/api/redoc") === 0
    || caminho.indexOf("/api/openapi.json") === 0;
  var itemDaSacola = /^\/api\/carrinho\/itens\/[0-9]+$/.test(caminho);
  var escritaNaSacola = (request.method === "POST" && caminho === "/api/carrinho/itens")
    || (request.method === "PUT" && itemDaSacola)
    || (request.method === "DELETE" && (itemDaSacola || caminho === "/api/carrinho"));

  if (((!leitura && !escritaNaSacola) || documentacao) && event.viewer.ip !== ipAutorizado) {
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

  request.uri = caminho.replace(/^\/api(?=\/|$)/, "") || "/";
  return request;
}
