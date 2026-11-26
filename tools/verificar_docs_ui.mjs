import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:5500';
const pasta=process.argv[3];
const abas=await (await fetch('http://127.0.0.1:9222/json/list')).json();
const versao=await (await fetch('http://127.0.0.1:9222/json/version')).json(); const ws=new WebSocket(versao.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let sessaoA;let id=0;const pendentes=new Map();const erros=[];const resultados=[];let contextoB;let sessaoB;let temporario;
ws.addEventListener('message',evento=>{const m=JSON.parse(evento.data);if(m.method==='Runtime.exceptionThrown')erros.push(m.params.exceptionDetails.text);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')erros.push(m.params.entry.text);const p=pendentes.get(m.id);if(p){clearTimeout(p.timer);pendentes.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function comando(method,params={},sessionId){return new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(new Error('Tempo esgotado: '+method)),30000);pendentes.set(n,{resolve,reject,timer});const destino=sessionId||(['Page','Runtime','Log','Emulation'].includes(method.split('.')[0])?sessaoA:undefined);ws.send(JSON.stringify({id:n,method,params,...(destino?{sessionId:destino}:{})}));});}
async function avaliar(expression,sessao){const r=await comando('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessao);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function esperar(expression,sessao){for(let i=0;i<250;i++){if(await avaliar(expression,sessao))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Condição não atendida: '+expression);}
function conferir(nome,passou){resultados.push({nome,passou:!!passou});if(!passou)throw new Error(nome);}
async function navegar(caminho,sessao){const r=await comando('Page.navigate',{url:base+caminho},sessao);if(r.errorText)throw new Error(r.errorText);await esperar("document.readyState === 'complete'",sessao);}
async function captura(nome){const r=await comando('Page.captureScreenshot',{format:'png'});await writeFile(join(pasta,nome),Buffer.from(r.data,'base64'));}
async function viewport(width,height=1000){await comando('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});}

try {
 contextoB=(await comando('Target.createBrowserContext')).browserContextId;
 const alvoNovo=(await comando('Target.createTarget',{url:'about:blank',browserContextId:contextoB})).targetId;
 sessaoA=(await comando('Target.attachToTarget',{targetId:alvoNovo,flatten:true})).sessionId;
 await comando('Page.enable'); await comando('Runtime.enable'); await comando('Log.enable');
 await navegar('/docs.html'); await esperar("typeof dadosDocs!=='undefined' && dadosDocs && !document.querySelector('#exportar-json').disabled");
 conferir('115 questões em cinco aulas',await avaliar("dadosDocs.aulas.length===5 && dadosDocs.aulas.flatMap(a=>a.questoes).length===115"));
 conferir('115 respostas iniciais preenchidas',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('115/115')"));
 conferir('Respostas iniciais completas e salvas',await avaliar("dadosDocs.aulas.flatMap(a=>a.questoes).every(q=>respostas[q.id].resposta===q.resposta_inicial && JSON.parse(localStorage.getItem(chaveResposta(q.id))).resposta===q.resposta_inicial)"));
 conferir('Autoavaliacao continua pessoal e opcional',await avaliar("Object.values(respostas).every(r=>r.avaliacao==='')"));
 conferir('Cinco fontes e SHA',await avaliar("document.querySelectorAll('#fontes-docs a').length===5 && document.querySelector('#rastreabilidade').textContent.includes('1d0f890')"));
 await avaliar("document.querySelector('#aba-10').click()");
 conferir('27 subquestões da aula 10',await avaliar("document.querySelectorAll('.questao-docs').length===27"));
 conferir('Referências inicialmente ocultas',await avaliar("[...document.querySelectorAll('.questao-docs details')].every(d=>!d.open)"));
 await viewport(390);await captura('docs-respostas-mobile.png');
 conferir('Campos mostram a resposta inteira',await avaliar("[...document.querySelectorAll('#questoes-docs textarea')].every(t=>t.scrollHeight<=t.clientHeight+2)"));
 const idQuestao=await avaliar("dadosDocs.aulas[0].questoes[0].id");
 const texto='<img src=x onerror="window.injecaoDocs=true"> Minha resposta de estudo';
 await avaliar(`document.querySelector('#resposta-${idQuestao}').value=${JSON.stringify(texto)};document.querySelector('#resposta-${idQuestao}').dispatchEvent(new Event('input'))`);
 conferir('Progresso somente com texto efetivo',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('115/115')"));
 await avaliar(`document.querySelector('#avaliacao-${idQuestao}').value='Consigo explicar';document.querySelector('#avaliacao-${idQuestao}').dispatchEvent(new Event('change'))`);
 await navegar('/docs.html');await esperar("typeof dadosDocs!=='undefined' && dadosDocs && !document.querySelector('#exportar-json').disabled");
 await avaliar("document.querySelector('#aba-10').click()");
 conferir('Resposta e autoavaliação sobrevivem ao recarregamento',await avaliar(`document.querySelector('#resposta-${idQuestao}').value===${JSON.stringify(texto)} && document.querySelector('#avaliacao-${idQuestao}').value==='Consigo explicar'`));
 conferir('HTML digitado permanece texto sem XSS',await avaliar("!window.injecaoDocs && !document.querySelector('.questao-docs img')"));
 await avaliar("document.querySelector('.questao-docs summary').click()");
 conferir('Referência pode ser revelada sem substituir a resposta',await avaliar(`document.querySelector('.questao-docs details').open && document.querySelector('#resposta-${idQuestao}').value===${JSON.stringify(texto)}`));
 await avaliar("window.criarUrlOriginal=URL.createObjectURL;URL.createObjectURL=(blob)=>{window.blobExportado=blob;return window.criarUrlOriginal(blob)};document.querySelector('#exportar-json').click()");
 const exportado=await avaliar("window.blobExportado.text()");
 conferir('Exportação JSON contém o rascunho',JSON.parse(exportado).respostas[idQuestao].resposta===texto);
 await avaliar("document.querySelector('#exportar-txt').click()");
 conferir('Exportação TXT contém o rascunho',await avaliar("window.blobExportado.text().then(t=>t.includes('Minha resposta de estudo')&&t.includes('AULA 14'))"));
 await avaliar("importarRespostas({target:{files:[new File(['{\"versao\":1,\"respostas\":{\"desconhecida\":{}}}'],'invalido.json')],value:''}})");
 conferir('Importação inválida é rejeitada sem alterar respostas',await avaliar("document.querySelector('#estado-docs').textContent.includes('não foi possível') || document.querySelector('#estado-docs').textContent.includes('Não foi possível')"));
 let aceitar=true;
 ws.addEventListener('message',evento=>{const m=JSON.parse(evento.data);if(m.method==='Page.javascriptDialogOpening')comando('Page.handleJavaScriptDialog',{accept:aceitar},m.sessionId);});
 await avaliar("window.confirmarImportacao=importarRespostas");
 await avaliar(`importarRespostas({target:{files:[new File([${JSON.stringify(exportado)}],'respostas.json')],value:''}})`);
 conferir('Importação válida restaura dados',await avaliar("document.querySelector('#estado-docs').textContent.includes('importadas')"));
 await avaliar("document.querySelector('.questao-docs .botao-perigo').click()");
 conferir('Limpeza individual confirmada',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('114/115')"));
 await avaliar(`document.querySelector('#resposta-${idQuestao}').value='   ';document.querySelector('#resposta-${idQuestao}').dispatchEvent(new Event('input'))`);
 conferir('Espaços não contam como resposta',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('114/115')"));
 await navegar('/docs.html');await esperar("typeof dadosDocs!=='undefined' && dadosDocs && !document.querySelector('#exportar-json').disabled");
 conferir('Resposta apagada nao e sobrescrita pelo modelo',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('114/115')"));
 await avaliar("document.querySelector('#aba-14').click()");
 conferir('Dez cenários rotulados simulação',await avaliar("dadosDocs.aulas[4].questoes.filter(q=>q.fase.startsWith('simulacao-')).length===10 && [...document.querySelectorAll('.questao-docs details')].every(d=>!d.open)"));
 await viewport(390);
 conferir('Docs móvel sem rolagem horizontal',await avaliar("document.documentElement.scrollWidth<=innerWidth"));
 await captura('docs-mobile.png');
 await viewport(1440);await avaliar("document.querySelector('#aba-geral').click()");await captura('docs-desktop.png');
 conferir('Rodapé exclusivo e centralizado',await avaliar("document.querySelector('footer').innerText.trim()==='Ítalo Rodrigues Pereira · Faculdade Senac Pernambuco'&&!document.querySelector('footer a')"));
 conferir('Menu liga Docs e Cloud',await avaliar("document.querySelector('header a[href=\"docs.html\"]')&&document.querySelector('header a[href=\"cloud.html\"]')"));
 conferir('Nenhum erro no console',erros.length===0);
 const saida={base,resultados,erros};await writeFile(join(pasta,'docs-verificacao.json'),JSON.stringify(saida,null,2));process.stdout.write(JSON.stringify(saida));await comando('Target.disposeBrowserContext',{browserContextId:contextoB});ws.close();
} catch(erro) {process.stdout.write(JSON.stringify({erro:String(erro),resultados,erros,pagina:await avaliar('document.body.innerText').catch(()=>null)}));ws.close();process.exitCode=1;}
