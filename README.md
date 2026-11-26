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

Cadastro, edição e exclusão estão abertos para qualquer pessoa testar a demo, para facilitar os testes. As alterações no catálogo são compartilhadas; as sacolas continuam individuais. Swagger e rotas de laboratório permanecem restritos. A vitrine Cloud permite totalização e um pedido demonstrativo, sem pagamento, emissão fiscal ou reserva de estoque.

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
| POST | /produtos | Cadastro público da demo, condicional; 201, 409 ou 422 |
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

Suíte atual: **172 testes aprovados, zero reprovados**. Há testes de domínio, filtros, CRUD, duplicidade, SQLite reaberto, duas sessões independentes, assinatura manipulada, expiração/capacidade, cookies, CORS, frontend, paginação DynamoDB, preço adulterado, condições, idempotência e cobertura dos subitens dos slides. Os testes Cloud usam objetos controlados; os smoke tests AWS são evidências separadas.

Verificações de navegador em HTTPS: 38 fluxos Coding, 20 de Docs e 15 de Cloud. Incluem desktop/celular, exportação/importação, persistência, XSS, cadastro temporário Cloud e aparecimento na vitrine sem redeploy. Os dois HTMLs autorizados passaram no W3C sem erros ou avisos.

Resultados AWS de 26/11/2026:

- Catálogo DynamoDB ACTIVE, id numérico, PAY_PER_REQUEST e cópia dos três produtos.
- VPC com quatro sub-redes, duas AZs, três tabelas de rotas e nenhum NAT; SG sem entrada e saída HTTPS limitada aos prefixos S3/DynamoDB.
- No laboratório isolado de rede, HTTP **500 antes** e **200 depois** do endpoint. O 502 dos slides não foi observado neste HTTP API.
- Carga protegida de 100 pedidos: **100 respostas 202**, paralelismo cinco pela cota real de dez execuções da conta. Média 318,76 ms; máximo 1.552,25 ms; 98 respostas abaixo de um segundo.
- 101 pedidos válidos concluídos, contando o pedido inicial. Entrega duplicada manteve 101 efeitos e gerou um registro de duplicata. Concorrência observada no CloudWatch: máximo dois.
- Quantidade 99 falhou três vezes e foi à DLQ. Alarme passou de OK para ALARM em 26/11/2026 19:34:01 UTC e executou ação SNS. Assinatura SNS confirmada na revisão posterior; recebimento do alerta histórico por e-mail não comprovado.
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

O modelo reproduzível `python tools/estimar_custos_cloud.py` estima uma base mensal de US$ 0,49 para 100 pedidos/10 mil consultas e US$ 0,78 para 10 mil pedidos/100 mil consultas, sem franquias. Hipóteses: produtor 256 MB/0,1 s; consumidor 128 MB/1 s; catálogo 256 MB/0,2 s; 648 mil chamadas SQS ociosas/mês mais três por pedido; itens até 1 KB; duas métricas de alarme; 0,01/0,1 GB de logs. São cenários, não medição de fatura; não incluem Coding, CloudFront, S3 compartilhado, SNS, transferência ou impostos. Outra região com preços hipoteticamente iguais acrescentaria a mesma base, mais replicação e tráfego. Como referência portável em outro provedor, [VM DigitalOcean de 1 GiB](https://www.digitalocean.com/pricing/droplets) a US$ 6/mês mais [Spaces](https://docs.digitalocean.com/products/spaces/details/pricing/) a US$ 5/mês somam US$ 11/mês; duas VMs somam US$ 17 com Spaces. Preços consultados em 26/11/2026. Isso exige adaptação e operação própria, sem equivalência automática aos serviços gerenciados ou garantia de alta disponibilidade. Nenhum recurso foi contratado em outra região/provedor.

Assinatura SNS confirmada pela AWS em 26/11/2026; não foi enviado e-mail de teste adicional. Recebimento do alerta histórico não comprovado. Documento complementar não publicado; roteiro público utilizado, conforme informado pelo aluno; nenhuma entrega no Teams. Há evidência textual real AWS, sem alegar capturas do console. Fotografia original anexada pelo aluno (1398 × 790), convertida para WebP de 191.948 bytes e ampliada para 3840 × 2160; não é 4K nativa.

## Referências acadêmicas

Coding: os seis PDFs `aula-08-loja-de-roupas.pdf`, `aula-09-loja-abre-as-portas.pdf`, `aula-10-loja-nao-esquece.pdf`, `aula-11-loja-ganha-vitrine.pdf`, `aula-12-vitrine-ganha-vida.pdf` e `aula-13-vitrine-conversa-api.pdf`. As tags históricas aula-08 a aula-13 foram preservadas.

Cloud: leitura integral dos cinco HTMLs oficiais (269 slides). Os arquivos publicados foram comparados com o commit **1d0f89004448bf7b52d70533da530a8a9ddf0c96** do repositório público de materiais; todos corresponderam byte a byte:

- [Aula 10 · armazenamento](https://sebastrogers.github.io/assets/materiais/cloud/aula-10-cloud-armazenamento-distribuido.html)
- [Aula 11 · banco](https://sebastrogers.github.io/assets/materiais/cloud/aula-11-cloud-loja-ganha-banco.html)
- [Aula 12 · rede](https://sebastrogers.github.io/assets/materiais/cloud/aula-12-cloud-loja-ganha-rede.html)
- [Aula 13 · pico](https://sebastrogers.github.io/assets/materiais/cloud/aula-13-cloud-loja-aguenta-pico.html)
- [Aula 14 · confiabilidade](https://sebastrogers.github.io/assets/materiais/cloud/aula-14-cloud-confiabilidade-risco.html)

[Relatório oficial AWS de outubro/2025](https://aws.amazon.com/message/101925/), [Builders’ Library](https://aws.amazon.com/builders-library/) e [Data Act europeu](https://eur-lex.europa.eu/eli/reg/2023/2854/oj) complementam o estudo. Dados de mercado são atribuídos aos slides e suas datas, sem alegar confirmação independente. A matriz de seis serviços é preliminar; documento complementar não publicado; roteiro público utilizado. Respostas de referência não são apresentadas como autoria pessoal do aluno.


## Refinamento global de interface (26/11/2026)

As seis páginas compartilham menu compacto abaixo de 1100 px, botão acessível, fechamento com Escape e devolução do foco. O conteúdo usa largura máxima centralizada e margens laterais de 16 a 48 px. Campos, botões e painéis usam espaçamentos comuns; tabelas informativas de Docs viram blocos verticais abaixo de 900 px, com rótulos e todas as colunas. A tabela administrativa mantém o layout anterior, conforme solicitado. Não se oculta overflow horizontal da página.

Validação real em HTTPS: **580 verificações aprovadas, zero falhas e zero erros no console**, sendo 538 da matriz de seis páginas nas larguras 320, 360, 375, 390, 412, 430, 768, 1024, 1440 e 1920 px; 18 fluxos de busca, filtros, detalhes, quantidades, carrinho isolado, consulta administrativa e total Cloud; 20 verificações de Docs e quatro conferências das tabelas totalmente carregadas. A matriz verifica menu aberto/fechado, foco, margens, IDs e ausência de overflow. W3C novamente sem erros ou avisos para index/cadastro. Carga e falhas AWS anteriores não foram repetidas.

[Resultados detalhados](evidencias/interface-2026-11-26.json), [Docs mobile](evidencias/docs-mobile.png), [menu mobile](evidencias/menu-mobile.png), [sacola mobile](evidencias/sacola-mobile.png) e [vitrine desktop](evidencias/vitrine-desktop.png). O script `tools/verificar_interface.mjs` usa o protocolo nativo de um Edge/Chromium aberto em modo de teste com porta 9222; recebe URL base e pasta de capturas como argumentos. Sem dependências npm.

Codificação: arquivos UTF-8 e Content-Type explícito no S3. As duas APIs foram conferidas por decodificação UTF-8. Os nomes dos IDs 1 e 2 estavam corrompidos somente no DynamoDB; houve backup dos itens e atualização condicional apenas do atributo nome, preservando todos os demais campos. SQLite permaneceu intacto. As evidências históricas mantêm suas datas; `revisao_ui` registra a assinatura SNS confirmada e a auditoria atual, com filas vazias e alarmes OK.


## Revisão final da demo

O CSS foi consolidado para remover regras concorrentes. Busca, tamanho, preço e ações seguem a proposta de layout, com espaçamentos de 8 a 24 px entre controles e margens simétricas. O menu usa uma única navegação, com visibilidade explícita no HTML e no JavaScript. `python tools/versionar_front.py` atualiza as URLs de CSS e JS pelo hash do conteúdo; execute depois de editar esses arquivos. Os arquivos publicados revalidam o cache para evitar mistura de versões.

No celular, as tabelas informativas de Docs mostram cada linha como um bloco com os nomes das colunas, sem ocultar dados nem exigir rolagem lateral. No desktop, continuam em colunas. A tabela de gerenciamento foi mantida como estava. [Tabela Docs no celular](evidencias/docs-tabelas-mobile.png), [tabela Docs no desktop](evidencias/docs-tabelas-desktop.png) e [filtros no celular](evidencias/filtros-mobile.png).

Cadastro, edição e exclusão da demo estão abertos ao público. A Vitrine Cloud também permite cadastro. As mudanças nos catálogos são compartilhadas; as sacolas permanecem individuais. Swagger e laboratório continuam restritos, sem abrir a origem EC2 ou expor a chave interna Cloud. Antes da abertura, foi feito backup consistente do SQLite, com integridade ok e três produtos. [Teste externo real da demo](evidencias/demo-publica.json): POST 201, PUT 200, DELETE 204 em registro temporário; duplicidade Cloud 409; Swagger e laboratório 403; IDs 1, 2 e 3 preservados. Dez casos da CloudFront Function foram aprovados antes da publicação. Nenhum novo recurso AWS foi criado.

Os textos da interface e os resumos foram revisados para uma linguagem mais direta. Os enunciados, as refer?ncias acad?micas e as 115 quest?es foram preservados. O caderno permite editar, salvar, exportar e importar as respostas no navegador; as respostas existentes s?o preservadas. A autoavalia??o fica dispon?vel para preenchimento pessoal.

No S3, publique documentos `.html` com `Content-Type: text/html; charset=utf-8` e sem `Content-Disposition: attachment`; caso contr?rio, o navegador pode baix?-los em vez de abri-los. A p?gina Docs foi corrigida e validada por HTTPS. Evid?ncia: `evidencias/docs-html-publicacao.json`.
