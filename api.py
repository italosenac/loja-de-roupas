from contextlib import asynccontextmanager
from os import getenv
from typing import Literal

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlmodel import Session

from loja.banco import criar_engine, criar_tabelas
from loja.carrinho import Carrinho, ItemNaoEncontradoError
from loja.sessoes import LimiteSessoesError, SessoesCarrinho
from loja.repositorio import RepositorioProdutos
from loja.servico import (
    DadosInvalidos, ProdutoJaExiste, ProdutoNaoEncontrado, ServicoCatalogo, com_id,
)

engine = criar_engine()
CATALOGO_INICIAL = [
    {"tipo": "Camiseta", "nome": "Camiseta básica", "preco": 39.90, "tamanho": "M", "manga": "curta"},
    {"tipo": "Calca", "nome": "Calça jeans", "preco": 129.90, "tamanho": "G", "modelagem": "reta"},
    {"tipo": "Produto", "nome": "Moletom", "preco": 159.90, "tamanho": "P"},
]


class ProdutoEntrada(BaseModel):
    tipo: Literal["Produto", "Camiseta", "Calca"] = "Produto"
    nome: str
    preco: float = Field(gt=0, allow_inf_nan=False)
    tamanho: str
    manga: str | None = None
    modelagem: str | None = None


class ItemPedido(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0, le=10)


class QuantidadePedido(BaseModel):
    quantidade: int = Field(gt=0)


def popular_se_vazio(servico):
    if not servico.listar():
        for dados in CATALOGO_INICIAL:
            servico.cadastrar(dados)


@asynccontextmanager
async def ciclo_de_vida(app):
    criar_tabelas(engine)
    with Session(engine) as sessao:
        popular_se_vazio(ServicoCatalogo(RepositorioProdutos(sessao)))
    yield


app = FastAPI(title="Loja de Roupas", lifespan=ciclo_de_vida,
              root_path=getenv("API_ROOT_PATH", ""))
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500", "http://localhost:5500",
        "http://loja-roupas-italo-2026.s3-website-us-east-1.amazonaws.com",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


@app.middleware("http")
async def impedir_cache_da_api(request, call_next):
    resposta = await call_next(request)
    resposta.headers["Cache-Control"] = "no-store"
    return resposta


def obter_sessao():
    with Session(engine) as sessao:
        yield sessao


def obter_servico(sessao: Session = Depends(obter_sessao)):
    return ServicoCatalogo(RepositorioProdutos(sessao))


@app.exception_handler(ProdutoNaoEncontrado)
@app.exception_handler(ItemNaoEncontradoError)
def nao_encontrado(request, erro):
    return JSONResponse(status_code=404, content={"detail": str(erro)})


@app.exception_handler(ProdutoJaExiste)
def ja_existe(request, erro):
    return JSONResponse(status_code=409, content={"detail": str(erro)})


@app.exception_handler(DadosInvalidos)
def dados_invalidos(request, erro):
    return JSONResponse(status_code=422, content={"detail": str(erro)})


sessoes_carrinho = SessoesCarrinho()


@app.exception_handler(LimiteSessoesError)
def limite_de_sessoes(request, erro):
    return JSONResponse(status_code=503, content={"detail": str(erro)})


async def obter_carrinho(request: Request, response: Response):
    cookie, carrinho = sessoes_carrinho.obter(request.cookies.get("loja_sessao"))
    response.set_cookie("loja_sessao", cookie, max_age=sessoes_carrinho.duracao,
                        httponly=True, secure=getenv("COOKIE_SECURE") == "true"
                        or request.url.scheme == "https", samesite="lax")
    return carrinho


@app.get("/")
def inicio():
    return {"loja": "Loja de Roupas", "documentacao": f"{app.root_path}/docs"}


@app.get("/produtos")
def listar_produtos(tamanho: str | None = None, preco_max: float | None = None,
                    servico=Depends(obter_servico)):
    return servico.listar(tamanho, preco_max)


@app.get("/produtos/{produto_id}")
def buscar_produto(produto_id: int, servico=Depends(obter_servico)):
    return servico.buscar(produto_id)


@app.post("/produtos", status_code=201)
def cadastrar_produto(dados: ProdutoEntrada, servico=Depends(obter_servico)):
    return servico.cadastrar(dados.model_dump())


@app.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, dados: ProdutoEntrada,
                     servico=Depends(obter_servico)):
    return servico.atualizar(produto_id, dados.model_dump())


@app.delete("/produtos/{produto_id}", status_code=204)
def remover_produto(produto_id: int, servico=Depends(obter_servico)):
    servico.remover(produto_id)


@app.post("/carrinho/itens", status_code=201)
async def adicionar_item(item: ItemPedido, servico=Depends(obter_servico),
                         carrinho: Carrinho = Depends(obter_carrinho)):
    produto = servico.produto(item.produto_id)
    carrinho.adicionar(produto, item.quantidade)
    return {
        "adicionado": com_id(item.produto_id, produto),
        "quantidade": item.quantidade,
        "pecas_no_carrinho": carrinho.quantidade_de_pecas,
    }


@app.get("/carrinho/total")
async def total_do_carrinho(carrinho: Carrinho = Depends(obter_carrinho)):
    return carrinho.resumo()


@app.get("/carrinho/itens")
async def listar_itens(carrinho: Carrinho = Depends(obter_carrinho)):
    return carrinho.resumo()["itens"]


@app.put("/carrinho/itens/{produto_id}")
async def atualizar_item(produto_id: int, dados: QuantidadePedido,
                         servico=Depends(obter_servico),
                         carrinho: Carrinho = Depends(obter_carrinho)):
    carrinho.atualizar_quantidade(servico.produto(produto_id), dados.quantidade)
    return carrinho.resumo()


@app.delete("/carrinho/itens/{produto_id}", status_code=204)
async def remover_item(produto_id: int, carrinho: Carrinho = Depends(obter_carrinho)):
    carrinho.remover(produto_id)


@app.delete("/carrinho", status_code=204)
async def esvaziar_carrinho(carrinho: Carrinho = Depends(obter_carrinho)):
    carrinho.esvaziar()
