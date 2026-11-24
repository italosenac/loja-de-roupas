# Loja de Roupas

![testes](https://github.com/italosenac/loja-de-roupas/actions/workflows/testes.yml/badge.svg)

Projeto acadêmico da Faculdade Senac Pernambuco, curso de Análise e
Desenvolvimento de Sistemas, 4º módulo, disciplina Coding, semestre 2026.2.

Professor: Sebastião Rogério. Aluno: Ítalo Rodrigues Pereira.

Implementação própria das aulas 08 a 13, com Python, Pytest, FastAPI, Pydantic,
SQLModel, SQLite, HTML, CSS e JavaScript puro. O catálogo permite cadastrar,
consultar, filtrar, alterar e excluir produtos. A vitrine consulta a API e o
formulário grava os produtos no banco.

O carrinho usa composição e promoções com contrato abstrato. Na API, o desconto
é de 10%; o frete custa R$ 15 abaixo de R$ 200, considerando o valor após o
desconto. O catálogo fica no SQLite; o carrinho permanece em memória, como na aula.

Os arquivos em `loja/` contêm os cálculos, as classes, o banco, o repositório e
o serviço. `api.py` contém as rotas HTTP, `front/` contém as páginas e
`tests/` reúne os testes. `vitrine.py` preserva o primeiro exercício com coleções.

Para instalar no PowerShell, na pasta do projeto, use Python 3.12 ou superior:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Execute a API em um terminal com o ambiente ativado:

```powershell
fastapi dev api.py
```

Em outro terminal, execute as páginas:

```powershell
python -m http.server 5500 --bind 127.0.0.1 --directory front
```

- Vitrine: http://127.0.0.1:5500
- Cadastro: http://127.0.0.1:5500/cadastro.html
- Swagger: http://127.0.0.1:8000/docs

O arquivo `loja.db` é criado automaticamente na pasta de execução da API e não
vai para o GitHub. Os três produtos iniciais são inseridos quando o catálogo está
vazio. CORS permite as páginas locais nas origens `127.0.0.1:5500` e
`localhost:5500`, além do endereço do site no S3.

Para testar, com o ambiente ativado:

```powershell
pytest -v
```

São 69 testes, incluindo regras de negócio, CRUD, banco em memória, reabertura
do SQLite, estrutura HTML e CORS. O workflow `testes` executa o Pytest no GitHub
Actions. As tags `aula-08` a `aula-13` registram os estados reais de cada aula.

A versão completa está implantada em `us-east-1`:

- [Vitrine no S3](http://loja-roupas-italo-2026.s3-website-us-east-1.amazonaws.com)
- [Cadastro no S3](http://loja-roupas-italo-2026.s3-website-us-east-1.amazonaws.com/cadastro.html)
- [Swagger da API FastAPI](http://32.194.222.146:8000/docs)

A API executa como usuário `loja`, pelo serviço systemd `loja`, na EC2
`i-0e264386c9e6c6397` (t4g.micro, Ubuntu 24.04 ARM64). O banco fica em
`/opt/loja-de-roupas/app/loja.db`, no EBS gp3 criptografado de 8 GB.
O IPv4 é fixo. A porta 8000 aceita somente o IP autorizado do aluno; portanto,
o catálogo e o cadastro dependem desse acesso. Não há porta SSH aberta;
a administração usa Systems Manager. Se o IP do aluno mudar, atualize a regra
do grupo `loja-roupas-fastapi` para o novo endereço /32.

O site usa HTTP, adequado à demonstração acadêmica sem dados sensíveis.
A estimativa autorizada para 730 horas é US$ 10,42/mês, antes de impostos e
tráfego: EC2 US$ 0,0084/h, IPv4 US$ 0,005/h e 8 GB gp3 a US$ 0,08/GB-mês.
Parar a instância mantém cobranças do EBS e do IPv4 reservado.

A Lambda `loja-api` e o API Gateway anteriores permanecem preservados:
[API anterior](https://txxvpco9jh.execute-api.us-east-1.amazonaws.com/produtos).
Os arquivos e as configurações anteriores estão em `.backup-aws/2026-11-24/`,
fora do controle de versão.

Validação: 69 testes passaram localmente e na EC2; o cadastro persistiu após
reiniciar o serviço. Os dois HTMLs passaram no W3C sem mensagens e obtiveram
100/100 em acessibilidade no Lighthouse. A navegação por Tab/Enter e o layout
de uma coluna em 390 px também foram verificados no navegador.

Referências: materiais de Coding do professor Sebastião Rogério:

- `aula-08-loja-de-roupas.pdf`
- `aula-09-loja-abre-as-portas.pdf`
- `aula-10-loja-nao-esquece.pdf`
- `aula-11-loja-ganha-vitrine.pdf`
- `aula-12-vitrine-ganha-vida.pdf`
- `aula-13-vitrine-conversa-api.pdf`

Também foram usados princípios básicos de legibilidade e responsabilidade única
de Robert C. Martin, *Clean Code: A Handbook of Agile Software Craftsmanship*,
2008. O projeto foi desenvolvido com assistência de IA (Codex) na implementação
e na validação. O repositório gabarito do professor não foi consultado.
