# Loja de Roupas

![testes](https://github.com/italosenac/loja-de-roupas/actions/workflows/testes.yml/badge.svg)

Projeto acadêmico de Ítalo Rodrigues Pereira, Faculdade Senac Pernambuco, Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas, 4º módulo, semestre 2026.2. Professor: Sebastião Rogério. Integra as disciplinas Coding (aulas 08–13) e Cloud Computing (aulas 10–14), com implementação própria e sem acesso ao gabarito.

## Acesso público

| Página | Endereço |
| --- | --- |
| Vitrine Coding | https://d35i4a7nhsg3b0.cloudfront.net |
| Minha sacola Coding | https://d35i4a7nhsg3b0.cloudfront.net/carrinho.html |
| Gerenciamento | https://d35i4a7nhsg3b0.cloudfront.net/gerenciamento.html |
| Cadastro Coding | https://d35i4a7nhsg3b0.cloudfront.net/cadastro.html |
| Vitrine Cloud | https://d35i4a7nhsg3b0.cloudfront.net/cloud.html |
| Cadastro Cloud | https://d35i4a7nhsg3b0.cloudfront.net/cadastro.html?catalogo=cloud |
| Docs editável | https://d35i4a7nhsg3b0.cloudfront.net/docs.html |
| Informações da API Coding | https://d35i4a7nhsg3b0.cloudfront.net/api/ |
| Produtos Coding | https://d35i4a7nhsg3b0.cloudfront.net/api/produtos |
| Produtos Cloud | https://d35i4a7nhsg3b0.cloudfront.net/cloud-api/produtos |
| Swagger Coding, restrito | https://d35i4a7nhsg3b0.cloudfront.net/api/docs |

Cadastro, edição, exclusão e Swagger exigem o acesso administrativo autorizado na infraestrutura. Visitantes podem consultar as duas vitrines e usar sua sacola Coding. A vitrine Cloud permite totalização e um pedido demonstrativo, sem pagamento, emissão fiscal ou reserva de estoque.

## Duas trilhas e dois catálogos

- **Coding:** FastAPI, Pydantic, SQLModel e SQLite na EC2 existente. CRUD, consulta individual, filtros de tamanho/preço, busca por nome e sacola individual. O banco original foi preservado.
- **Cloud:** API Gateway HTTP e Lambda `loja-api` existentes, DynamoDB `loja-produtos`, VPC privada e gateway endpoints. Foram copiados os IDs 1, 2 e 3 e todos os campos existentes. Esse catálogo é independente: não há sincronização bidirecional nem migração definitiva do SQLite.
- **Pedidos Cloud:** Lambda `loja-pedidos` envia ao SQS; `loja-processa` consome em lote de um, com concorrência máxima dois. A DLQ recebe falhas persistentes; CloudWatch aciona SNS.
- **Docs:** 115 questões próprias de estudo, parafraseadas a partir dos 269 slides oficiais, com subitens separados, referências ocultas, autoavaliação, rascunhos locais, progresso e exportação/importação JSON/TXT.

A identidade visual mantém preto, roxo, Outfit local com licença OFL, SVGs e responsividade. O rodapé de todas as páginas contém somente o nome do aluno e a instituição.

## Execução local

Python 3.12 ou superior, sem Node ou framework de frontend:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r cloud/requirements.txt
uvicorn api:app --host 127.0.0.1 --port 8000 --workers 1
```

Em outro terminal:

```powershell
python -m http.server 5500 --bind 127.0.0.1 --directory front
```

Abra http://127.0.0.1:5500. A API local fica em http://127.0.0.1:8000 e o Swagger em /docs. A demonstração Cloud usa a infraestrutura AWS publicada; não há emulador ou dados simulados para encobrir indisponibilidade.

O SQLite local `loja.db` não é versionado. Os produtos iniciais só são inseridos se o catálogo estiver vazio. CORS permite as origens locais autorizadas. `COOKIE_SECURE=true` é obrigatório no serviço HTTPS; deixe essa variável ausente no desenvolvimento HTTP.

## Sacola e regras financeiras

Cada visitante recebe um token aleatório assinado pelo servidor em cookie HttpOnly, SameSite=Lax e Secure em produção. Alterar o identificador ou a assinatura não permite escolher a sacola de outro visitante. As respostas da API usam `Cache-Control: no-store`; os comportamentos dinâmicos do CloudFront usam CachingDisabled e encaminham cookies.

As sessões ficam em memória: expiração por inatividade de 30 minutos e limite de 1.000 sessões. **Use um único processo/worker.** Ao atingir a capacidade, a API responde 503 em vez de crescer indefinidamente. Reiniciar o serviço perde as sacolas, mas preserva produtos no SQLite. A chave de assinatura também é renovada no reinício.

A adição aceita de 1 a 10 unidades **por requisição**. Adições sucessivas podem resultar em mais de dez unidades do mesmo produto. Atualização e remoção individuais são atômicas no processo; não esvaziam e reconstroem a sacola.

O domínio Python calcula 10% de desconto e frete de R$ 15 quando o subtotal **após desconto** é inferior a R$ 200. A interface apenas apresenta os valores do servidor. O contrato acadêmico do carrinho vazio permanece com total R$ 15; a página mostra estado vazio e oculta o resumo, sem simular uma cobrança.

## Endpoints

Prefixo publicado Coding: `/api`. No desenvolvimento, os mesmos caminhos ficam sem prefixo.

| Método | Caminho Coding | Função |
| --- | --- | --- |
| GET | / | Informações |
| GET | /produtos | Listar; parâmetros tamanho e preco_max combináveis |
| GET | /produtos/{id} | Consultar |
| POST | /produtos | Cadastrar |
| PUT | /produtos/{id} | Editar |
| DELETE | /produtos/{id} | Excluir |
| POST | /carrinho/itens | Adicionar produto_id e quantidade |
| GET | /carrinho/itens | Listar itens da sessão |
| GET | /carrinho/total | Itens, quantidade, desconto, frete e total |
| PUT | /carrinho/itens/{id} | Alterar quantidade |
| DELETE | /carrinho/itens/{id} | Remover |
| DELETE | /carrinho | Esvaziar a sessão |

Prefixo Cloud: `/cloud-api`.

| Método | Caminho Cloud | Função |
| --- | --- | --- |
| GET | /produtos | Scan paginado do catálogo pequeno |
| GET | /produtos/{id} | GetItem; 200 ou 404 |
| POST | /produtos | Cadastro administrativo condicional; 201, 409 ou 422 |
| GET | /promocoes | Regras vigentes |
| POST | /carrinho/total | Lista itens com produto_id e quantidade; preços do DynamoDB |
| POST | /pedidos | Um pedido demonstrativo; 202 significa recebido |
| POST | /laboratorio/pedidos | Laboratório restrito, aceita a falha sintética 99 |

A chave `CHAVE_LOJA` fica na configuração do servidor e no cabeçalho de origem do CloudFront, nunca no bundle ou no navegador. A Lambda rejeita acessos sem chave, inclusive leituras diretas pelo endpoint AWS. CloudFront restringe escritas de produtos e laboratório usando o IP real da conexão. Não confia em cabeçalhos de IP enviados pelo visitante e rejeita caminhos ambíguos ou com dupla codificação. CORS não substitui autenticação.

O produtor limita JSON a 8 KB e quantidades públicas a 1–10. O estágio tem limite padrão de 50 requisições/s e burst 100; pedidos públicos têm limite específico de 1/s e burst 5. O laboratório é protegido e não tem botão público de carga ou falha.

## Idempotência e recuperação

O consumidor simula um segundo de trabalho sem efeito externo. Só depois grava o registro final em `loja-pedidos-processados`, condicionado à inexistência do ID. Essa gravação é o único efeito da demonstração: duas entregas produzem uma conclusão. Uma interrupção antes da gravação permite nova tentativa; depois da gravação, uma nova entrega é reconhecida.

Isso não implementa uma transação com pagamento ou estoque externos. Uma integração real exigiria idempotência no serviço externo ou coordenação transacional adequada.

O SDK usa timeouts de conexão/leitura e até duas tentativas no modo standard, com backoff e jitter nativos. SQS controla nova entrega e DLQ após três recebimentos. A visibilidade é 30 s, seis vezes o timeout de 5 s do consumidor. O catálogo e a porta usam 256 MB e timeout de 5 s; um primeiro cold start do catálogo com 128 MB excedeu o timeout anterior de 3 s, motivando essa margem.

Ao receber alerta, confira atraso, logs sanitizados e DLQ, corrija a causa e autorize redrive limitado. Não use Purge em produção. O alarme de idade vigia 120 s; o de DLQ usa Maximum de um minuto maior que zero.

## Testes e evidências reais

```powershell
pytest -q
```

Suíte atual: **159 testes aprovados, zero reprovados**. Há testes de domínio, filtros, CRUD, duplicidade, SQLite reaberto, duas sessões independentes, assinatura manipulada, expiração/capacidade, cookies, CORS, frontend, paginação DynamoDB, preço adulterado, condições, idempotência e cobertura dos subitens dos slides. Os testes Cloud usam objetos controlados; os smoke tests AWS são evidências separadas.

Verificações de navegador em HTTPS: 38 fluxos Coding, 20 de Docs e 15 de Cloud. Incluem desktop/celular, exportação/importação, persistência, XSS, cadastro temporário Cloud e aparecimento na vitrine sem redeploy. Os dois HTMLs autorizados passaram no W3C sem erros ou avisos.

Resultados AWS de 26/11/2026:

- Catálogo DynamoDB ACTIVE, id numérico, PAY_PER_REQUEST e cópia dos três produtos.
- VPC com quatro sub-redes, duas AZs, três tabelas de rotas e nenhum NAT; SG sem entrada e saída HTTPS limitada aos prefixos S3/DynamoDB.
- No laboratório isolado de rede, HTTP **500 antes** e **200 depois** do endpoint. O 502 dos slides não foi observado neste HTTP API.
- Carga protegida de 100 pedidos: **100 respostas 202**, paralelismo cinco pela cota real de dez execuções da conta. Média 318,76 ms; máximo 1.552,25 ms; 98 respostas abaixo de um segundo.
- 101 pedidos válidos concluídos, contando o pedido inicial. Entrega duplicada manteve 101 efeitos e gerou um registro de duplicata. Concorrência observada no CloudWatch: máximo dois.
- Quantidade 99 falhou três vezes e foi à DLQ. Alarme passou de OK para ALARM em 26/11/2026 19:34:01 UTC e executou ação SNS. Confirmação de assinatura/e-mail permanece pendente.
- Amostras S3 isoladas: dez objetos, uma cópia em Standard-IA e regras Enabled para logs 30/90/365 dias e temporários sete dias. Não houve transição futura antecipada.

As evidências públicas, sanitizadas e datadas ficam em [docs-evidencias.json](front/docs-evidencias.json). O gráfico em [fila-cloud.svg](front/img/fila-cloud.svg) deriva de métricas reais por minuto; não é captura de console. Os contadores SQS são aproximados e têm atraso. Backups e respostas operacionais completas ficam fora do Git.

`tools/carga_cloud.py --quantidade 100 --paralelismo 5` executa apenas o laboratório protegido e gera relatório local ignorado pelo Git. Não execute sem intenção de gerar carga e custo. `tools/verificar_publico.py` deve ser executado em ambiente fora do acesso administrativo para conferir os bloqueios 403, sem alterar produtos reais.

## Infraestrutura e publicação

Tudo foi integrado à loja existente em us-east-1: S3 `loja-roupas-italo-2026`, CloudFront `E3IVPK8DZLEPM9`, EC2 `loja-roupas-fastapi`, Lambda `loja-api` e API Gateway existentes. Não foi criado outro repositório, bucket, EC2 ou CloudFront.

Recursos Cloud adicionais: tabelas `loja-produtos` e `loja-pedidos-processados`; VPC `loja-vpc`; filas `loja-pedidos` e `loja-pedidos-dlq`; Lambdas `loja-pedidos` e `loja-processa`; tópico `loja-alertas`; alarmes `loja-pedido-perdido` e `loja-pedido-atrasado`. Recursos novos têm tags Project/Lesson. Logs ficam por sete dias. Foram removidos a Lambda temporária de diagnóstico, sua rota/integração e seus logs, o ZIP de implantação, dez amostras S3 e duas regras temporárias. Também foram excluídos somente os 102 pedidos sintéticos identificados desta execução, o produto temporário e a mensagem 99, sem Purge. Os três produtos reais e os serviços de produção foram preservados.

CloudFront mantém OAC, origem S3 e origem privada EC2, acrescentando /cloud-api e /cloud-api/* para API Gateway. Nenhuma regra pública da porta 8000 ou SSH foi criada. A leitura anterior do S3 não foi ampliada. Os outros projetos e suas distribuições não foram alterados.

O serviço EC2 usa usuário `loja`, pasta `/opt/loja-de-roupas/app`, virtualenv `/opt/loja-de-roupas/venv` e SQLite no diretório da aplicação. Antes da implantação foram feitos backup consistente pelo SQLite, verificação de integridade, cópia de código e unidade systemd. Não houve substituição do banco por testes.

Rollback: preservar o banco atual, restaurar código/configuração do backup ou checkout do commit anterior com alterações locais previamente protegidas, executar testes e reiniciar somente `loja.service`. Restaurar distribuição/função a partir do backup de configuração se necessário. Não usar reset --hard nem recriar o banco.

`infra/cloudfront.json` é um retrato sanitizado. Marcadores `__CONTA_AWS__`, `__DNS_PRIVADO_EC2__`, `__CHAVE_LOJA_SERVIDOR__` e `__IP_ADMINISTRATIVO__` precisam ser resolvidos no ambiente autorizado; não publicar esses valores. O arquivo não deve ser aplicado literalmente. `tools/empacotar_cloud.py` empacota somente módulos necessários às Lambdas, sem banco ou credenciais.

## Custos e pendências

Custos adicionais foram autorizados pelo usuário em 26/11/2026. Para uso didático baixo, a estimativa é até US$ 1/mês adicional, não um teto. Dois alarmes padrão custam US$ 0,20/mês antes das franquias; consumo de Lambda, SQS (incluindo polling), DynamoDB, logs, SNS, API Gateway e S3 varia. A consulta Free Tier mostrou franquias disponíveis de Lambda/CloudWatch, sem garantir custo futuro zero. Não há NAT ou endpoint de interface pago.

Preços de lista consultados em 26/11/2026, us-east-1: [S3](https://aws.amazon.com/s3/pricing/) Standard 0,023, Standard-IA 0,0125 e Glacier Flexible 0,0036 USD/GB-mês; [DynamoDB](https://aws.amazon.com/dynamodb/pricing/) 0,125 por milhão de unidades de leitura e 0,625 de escrita; [SQS](https://aws.amazon.com/sqs/pricing/) Standard 0,40 por milhão no primeiro nível; [Lambda](https://aws.amazon.com/lambda/pricing/) x86 0,0000166667 USD/GB-s no primeiro nível; [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/) alarme padrão 0,10/mês e logs Standard 0,50/GB ingerido. Inclua recuperação, permanência mínima, requisições, impostos e transferência na estimativa final.

O orçamento mensal `loja-cloud-aulas-10-14` é US$ 1, alerta a 80%, filtrado por Project=loja-de-roupas. A tag de custo foi ativada e pode demorar a aparecer no faturamento. Os orçamentos globais existentes foram preservados. Orçamento não bloqueia consumo. A pilha Coding já existente tem estimativa anterior de US$ 10,42/mês para EC2, EBS e IPv4 em 730 horas, além de tráfego.

Pendências externas: confirmação da assinatura SNS e prova de recebimento do e-mail; documento detalhado da atividade no Teams e eventual envio; capturas do console AWS (há evidência textual real); fotografia original da boutique, ainda não fornecida/localizada. Nenhuma imagem foi inventada nem ampliada para ser chamada de 4K nativa.

## Referências acadêmicas

Coding: os seis PDFs `aula-08-loja-de-roupas.pdf`, `aula-09-loja-abre-as-portas.pdf`, `aula-10-loja-nao-esquece.pdf`, `aula-11-loja-ganha-vitrine.pdf`, `aula-12-vitrine-ganha-vida.pdf` e `aula-13-vitrine-conversa-api.pdf`. As tags históricas aula-08 a aula-13 foram preservadas.

Cloud: leitura integral dos cinco HTMLs oficiais (269 slides). Os arquivos publicados foram comparados com o commit **1d0f89004448bf7b52d70533da530a8a9ddf0c96** do repositório público de materiais; todos corresponderam byte a byte:

- [Aula 10 · armazenamento](https://sebastrogers.github.io/assets/materiais/cloud/aula-10-cloud-armazenamento-distribuido.html)
- [Aula 11 · banco](https://sebastrogers.github.io/assets/materiais/cloud/aula-11-cloud-loja-ganha-banco.html)
- [Aula 12 · rede](https://sebastrogers.github.io/assets/materiais/cloud/aula-12-cloud-loja-ganha-rede.html)
- [Aula 13 · pico](https://sebastrogers.github.io/assets/materiais/cloud/aula-13-cloud-loja-aguenta-pico.html)
- [Aula 14 · confiabilidade](https://sebastrogers.github.io/assets/materiais/cloud/aula-14-cloud-confiabilidade-risco.html)

[Relatório oficial AWS de outubro/2025](https://aws.amazon.com/message/101925/), [Builders’ Library](https://aws.amazon.com/builders-library/) e [Data Act europeu](https://eur-lex.europa.eu/eli/reg/2023/2854/oj) complementam o estudo. Dados de mercado são atribuídos aos slides e suas datas, sem alegar confirmação independente. A matriz de seis serviços é preliminar; o documento detalhado do Teams não foi acessado. Respostas de referência não são apresentadas como autoria pessoal do aluno.

