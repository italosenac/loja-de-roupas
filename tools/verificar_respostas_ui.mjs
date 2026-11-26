import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:5500';
const pasta=process.argv[3];
const caminhoPagina=process.argv[4]||'/docs.html';
const abas=await (await fetch('http://127.0.0.1:9222/json/list')).json();
const versao=await (await fetch('http://127.0.0.1:9222/json/version')).json(); const ws=new WebSocket(versao.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let sessaoA;let id=0;const pendentes=new Map();const erros=[];const resultados=[];let contextoB;let sessaoB;let temporario;
ws.addEventListener('message',evento=>{const m=JSON.parse(evento.data);if(m.method==='Runtime.exceptionThrown')erros.push(m.params.exceptionDetails.text);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')erros.push(m.params.entry.text);const p=pendentes.get(m.id);if(p){clearTimeout(p.timer);pendentes.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function comando(method,params={},sessionId){return new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>reject(new Error('Tempo esgotado: '+method)),30000);pendentes.set(n,{resolve,reject,timer});const destino=sessionId||(['Page','Runtime','Log','Emulation','Input'].includes(method.split('.')[0])?sessaoA:undefined);ws.send(JSON.stringify({id:n,method,params,...(destino?{sessionId:destino}:{})}));});}
async function avaliar(expression,sessao){const r=await comando('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessao);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function esperar(expression,sessao){for(let i=0;i<250;i++){if(await avaliar(expression,sessao))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Condição não atendida: '+expression);}
function conferir(nome,passou){resultados.push({nome,passou:!!passou});if(!passou)throw new Error(nome);}
async function navegar(caminho,sessao){const r=await comando('Page.navigate',{url:base+caminho},sessao);if(r.errorText)throw new Error(r.errorText);await esperar("document.readyState === 'complete'",sessao);}
async function captura(nome){const r=await comando('Page.captureScreenshot',{format:'png'});await writeFile(join(pasta,nome),Buffer.from(r.data,'base64'));}
async function viewport(width,height=1000){await comando('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});}

try{
 contextoB=(await comando('Target.createBrowserContext')).browserContextId;
 const alvo=(await comando('Target.createTarget',{url:'about:blank',browserContextId:contextoB})).targetId;
 sessaoA=(await comando('Target.attachToTarget',{targetId:alvo,flatten:true})).sessionId;
 await comando('Page.enable');await comando('Runtime.enable');await comando('Log.enable');await navegar(caminhoPagina);await esperar("!document.querySelector('#importar-arquivo').disabled");await avaliar('document.fonts.ready');
 for(const largura of [320,360,375,390,412,430,768,1024,1440,1920]){
  await viewport(largura);
  for(const aula of [10,11,12,13,14]){
   await avaliar(`document.querySelector('#aba-${aula}').click()`);
   await avaliar('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   conferir('Respostas aula '+aula+' em '+largura+' sem cortes',await avaliar("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('#questoes-docs textarea')].every(t=>t.scrollHeight<=t.clientHeight+2)"));
  }
 }
 await viewport(390);await avaliar("document.querySelector('#aba-10').click();document.querySelector('#titulo-aula').scrollIntoView({behavior:'instant',block:'start'})");await captura('docs-avaliacao-mobile.png');
 await viewport(1440);await avaliar("document.querySelector('#aba-10').click();document.querySelector('#titulo-aula').scrollIntoView({behavior:'instant',block:'start'})");await captura('docs-avaliacao-desktop.png');
 conferir('115 respostas em navegador novo',await avaliar("document.querySelector('#progresso-geral').textContent.startsWith('115/115')"));
 conferir('Sem erros no console',erros.length===0);
 await writeFile(join(pasta,'respostas-layout.json'),JSON.stringify({base,resultados,erros},null,2));process.stdout.write(JSON.stringify({total:resultados.length,falhas:resultados.filter(x=>!x.passou),erros}));await comando('Target.disposeBrowserContext',{browserContextId:contextoB});ws.close();
}catch(erro){process.stdout.write(JSON.stringify({erro:String(erro),resultados,erros}));ws.close();process.exitCode=1;}
