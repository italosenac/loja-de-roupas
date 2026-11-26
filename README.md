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

A loja usa CloudFront com HTTPS, com origens em `us-east-1`:

- [Vitrine](https://d35i4a7nhsg3b0.cloudfront.net)
- [Cadastro](https://d35i4a7nhsg3b0.cloudfront.net/cadastro.html)
- [Produtos da API](https://d35i4a7nhsg3b0.cloudfront.net/api/produtos)
- [Swagger, para o IP autorizado](https://d35i4a7nhsg3b0.cloudfront.net/api/docs)
- [Endereço anterior do S3](http://loja-roupas-italo-2026.s3-website-us-east-1.amazonaws.com)

A identidade visual usa preto e roxo, a fonte aberta Outfit hospedada localmente
(licença em `front/fonts/OFL.txt`) e ilustrações SVG próprias por tipo de peça.
Os nomes, preços, tamanhos e tipos dos cards vêm exclusivamente da API.
Os campos de manga e modelagem aparecem conforme o tipo escolhido no cadastro.

A fotografia da boutique mencionada no pedido não foi encontrada no projeto.
O fundo permanece escuro, sem substituição por imagem externa. Para concluir
essa parte, é necessário fornecer o arquivo original; o destino previsto é
`front/img/boutique-4k.webp`, em 3840 × 2160. Não houve ampliação de imagem.

A API executa como usuário `loja`, pelo serviço systemd `loja`, na EC2
`i-0e264386c9e6c6397` (t4g.micro, Ubuntu 24.04 ARM64). O banco fica em
`/opt/loja-de-roupas/app/loja.db`, no EBS gp3 criptografado de 8 GB.
O IPv4 é fixo. A porta 8000 preserva a regra do IP autorizado do aluno e permite
também o grupo gerenciado da origem privada CloudFront. Não há regra pública
`0.0.0.0/0` de entrada nem porta SSH aberta; a administração usa Systems Manager.

A distribuição exclusiva `E3IVPK8DZLEPM9` entrega os arquivos pelo endpoint REST
do S3 com OAC e redireciona HTTP para HTTPS. A leitura pública anterior do bucket
foi preservada durante a migração, conforme solicitado. O endereço antigo da
hospedagem estática redireciona para o HTTPS da loja. O certificado é o padrão
do CloudFront; não foi contratado domínio ou certificado adicional.

O JavaScript público utiliza a URL relativa `/api`, sem endereço HTTP da EC2.
Os caminhos `/api` e `/api/*` usam a origem privada VPC
`vo_GgfdGPzBJb2EENlqkMjrNN`, com cache desabilitado, parâmetros e corpos
encaminhados à API. A função `infra/cloudfront-api.js` remove o prefixo `/api`
e permite escrita (POST, PUT, DELETE e PATCH) e documentação apenas ao IPv4
autorizado `168.0.55.1`. A listagem é pública pelo HTTPS. O cliente não escolhe
o IP usado nessa verificação: a função usa `event.viewer.ip`.

Se o IP autorizado mudar, atualize a função do CloudFront e a regra /32 do
Security Group `loja-roupas-fastapi`. A distribuição usa IPv4 para manter essa
restrição consistente. A configuração da distribuição está em
`infra/cloudfront.json`. As tags acadêmicas anteriores foram preservadas.

Na EC2, `/etc/systemd/system/loja.service.d/cloudfront.conf` define
`API_ROOT_PATH=/api`, para que o Swagger use o endereço correto do proxy.
O desenvolvimento local continua usando `http://127.0.0.1:8000`.

A estimativa autorizada para 730 horas é US$ 10,42/mês, antes de impostos e
tráfego: EC2 US$ 0,0084/h, IPv4 US$ 0,005/h e 8 GB gp3 a US$ 0,08/GB-mês.
Parar a instância mantém cobranças do EBS e do IPv4 reservado.

O CloudFront usa cobrança por consumo, sem mensalidade fixa adicional neste
modelo. Referência conservadora na América do Sul: US$ 0,110/GB e US$ 0,022
por 10 mil requisições HTTPS. A função custa até US$ 0,10 por milhão de
execuções após a faixa gratuita. Um exemplo com 10 GB, 100 mil requisições
HTTPS e 10 mil execuções da função equivale a US$ 1,32, antes de franquias,
impostos, requisições e armazenamento no S3. Não foi contratado WAF, load
balancer, NAT Gateway ou outro servidor.
[Preços do CloudFront](https://aws.amazon.com/cloudfront/pricing/).

A Lambda `loja-api` e o API Gateway anteriores permanecem preservados:
[API anterior](https://txxvpco9jh.execute-api.us-east-1.amazonaws.com/produtos).
Os arquivos e as configurações anteriores estão em `.backup-aws/2026-11-24/`
e `.backup-aws/2026-11-26/`,
fora do controle de versão.

Validação do redesign: 69 testes passaram localmente e na EC2. Os dois HTMLs
passaram no W3C sem mensagens. Foram verificadas a fonte, a paleta, os produtos
reais, a busca, a navegação por teclado, os campos específicos, o cadastro e a
persistência após recarregar, com layout em uma coluna em 390 e 320 px.
As 18 verificações no navegador passaram também no endereço HTTPS publicado,
sem erros de console nem mixed content. Vitrine, cadastro, API, Swagger e
OpenAPI responderam HTTP 200; o Swagger usa `/api/openapi.json`.
Sete casos no teste nativo de CloudFront Functions confirmaram leitura pública,
escrita e Swagger autorizados e bloqueio de escrita e Swagger para outro IP,
mesmo com um cabeçalho `X-Forwarded-For` forjado.

Na versão inicial de 24/11/2026, as duas páginas obtiveram 100/100 em
acessibilidade no Lighthouse; esse resultado se refere ao visual anterior.

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
