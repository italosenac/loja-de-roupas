import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const base=process.argv[2]||'http://127.0.0.1:5500';
const pasta=process.argv[3];
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

try {
 sessaoA=(await comando('Target.attachToTarget',{targetId:abas.find(x=>x.type==='page').id,flatten:true})).sessionId;
 await comando('Page.enable'); await comando('Runtime.enable'); await comando('Log.enable');
 const paginas=['index.html','carrinho.html','cadastro.html','gerenciamento.html','cloud.html','docs.html'];
 for(const largura of [320,360,375,390,412,430,768,1024,1440,1920]) {
  await viewport(largura);
  for(const pagina of paginas) {
   await navegar('/'+pagina);
   await esperar("typeof botaoMenu !== 'undefined'");
   const pronto={
    'index.html':"document.querySelectorAll('#vitrine article').length>=3",
    'cloud.html':base.includes('127.0.0.1')?"document.querySelector('#estado-cloud').textContent.length>0":"document.querySelectorAll('#vitrine-cloud article').length>=3",
    'gerenciamento.html':"document.querySelectorAll('#lista-produtos tr').length>=3",
    'cadastro.html':"!document.querySelector('fieldset').disabled",
    'carrinho.html':"!document.querySelector('#sacola-vazia').hidden || !document.querySelector('#conteudo-sacola').hidden",
    'docs.html':"typeof dadosDocs!=='undefined' && dadosDocs && !document.querySelector('#importar-arquivo').disabled"
   };
   await esperar(pronto[pagina]);
   await avaliar("document.fonts.ready");
   if(pagina==='docs.html') {
    conferir(largura+' Docs tabelas completas sem arrastar',await avaliar("[...document.querySelectorAll('.tabela-responsiva')].every(e=>e.scrollWidth<=e.clientWidth+1)"));
    conferir(largura+' Docs celulas com rotulos completos',await avaliar("[...document.querySelectorAll('.tabela-responsiva tbody td')].every(e=>e.dataset.rotulo && (innerWidth>=900 || getComputedStyle(e,'::before').content!=='none'))"));
   }
   const geometria=await avaliar(`(() => {
    const controles=[...document.querySelectorAll('button,input:not([type=file]),select,textarea,.botao,.sacola-compacta,#navegacao-principal a,.marca')].map(e=>({e,r:e.getBoundingClientRect()})).filter(({e,r})=>e.getClientRects().length && r.width>2 && r.height>2 && r.bottom>0);
    const problemas=[];
    for(let a=0;a<controles.length;a++)for(let b=a+1;b<controles.length;b++){
     const x=controles[a],y=controles[b];if(x.e.contains(y.e)||y.e.contains(x.e))continue;
     const dx=Math.min(x.r.right,y.r.right)-Math.max(x.r.left,y.r.left),dy=Math.min(x.r.bottom,y.r.bottom)-Math.max(x.r.top,y.r.top);
     const nome=e=>e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,35);
     if(dx>1 && dy>1)problemas.push({tipo:'sobreposicao',a:nome(x.e),b:nome(y.e)});
     if((dy>Math.min(x.r.height,y.r.height)/2 && dx<=0 && dx> -7.5)||(dx>Math.min(x.r.width,y.r.width)/2 && dy<=0 && dy> -7.5))problemas.push({tipo:'controles_colados',a:nome(x.e),b:nome(y.e)});
    }
    return problemas;
   })()`);
   conferir(largura+' '+pagina+' controles sem sobreposicao ou contato: '+JSON.stringify(geometria),geometria.length===0);
   conferir(largura+' '+pagina+' somente uma navegacao principal',await avaliar("document.querySelectorAll('header nav').length===1 && (innerWidth<1100 ? navegacaoPrincipal.hidden && !acoesCabecalho.hidden : !navegacaoPrincipal.hidden && acoesCabecalho.hidden)"));
   const medida=await avaliar(`(() => {const m=document.querySelector('main'),r=m.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,margem:r.left,largura:r.width,viewport:document.documentElement.clientWidth,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),marca:document.querySelector('.marca').getBoundingClientRect().right,acoes:document.querySelector('.cabecalho-acoes').getBoundingClientRect().left}})()`);
   conferir(largura+' '+pagina+' sem overflow',!medida.overflow);
   conferir(largura+' '+pagina+' centralizada',Math.abs(medida.margem-(medida.viewport-medida.largura)/2)<2);
   conferir(largura+' '+pagina+' IDs unicos',new Set(medida.ids).size===medida.ids.length);
   if(largura<1100) {
    conferir(largura+' '+pagina+' marca livre',medida.marca<=medida.acoes);
    conferir(largura+' '+pagina+' menu fechado',await avaliar("getComputedStyle(navegacaoPrincipal).display==='none' && botaoMenu.getAttribute('aria-expanded')==='false'"));
    await avaliar("botaoMenu.click()");
    conferir(largura+' '+pagina+' menu aberto com 5 links',await avaliar("getComputedStyle(navegacaoPrincipal).display==='flex' && botaoMenu.getAttribute('aria-expanded')==='true' && navegacaoPrincipal.querySelectorAll('a').length===5 && document.documentElement.scrollWidth<=innerWidth"));
    if(largura===390)await captura(pagina.replace('.html','')+'-menu-mobile.png');
    await comando('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    conferir(largura+' '+pagina+' Escape devolve foco',await avaliar("botaoMenu.getAttribute('aria-expanded')==='false' && document.activeElement===botaoMenu"));
   } else conferir(largura+' '+pagina+' navegacao desktop',await avaliar("getComputedStyle(navegacaoPrincipal).display==='flex'"));
   if(largura===390 || largura===1440)await captura(pagina.replace('.html','')+'-'+largura+'.png');
   if(pagina==='docs.html') {
    await esperar("typeof dadosDocs!=='undefined' && dadosDocs");
    await avaliar("document.querySelector('#aba-14').click()");
    conferir(largura+' Docs formulario sem overflow',await avaliar("document.querySelectorAll('.questao-docs').length===20 && document.documentElement.scrollWidth<=innerWidth"));
   }
  }
 }
 for(const largura of [390,1440,390]) {
  await viewport(largura);
  conferir('Redimensionamento sem recarregar '+largura,await avaliar("innerWidth<1100 ? navegacaoPrincipal.hidden && !acoesCabecalho.hidden : !navegacaoPrincipal.hidden && acoesCabecalho.hidden"));
 }
 for(const largura of [390,1440]) {
  await viewport(largura);
  for(const [pagina,seletor,nome] of [['index.html','#colecao','filtros'],['cloud.html','#vitrine-cloud','cloud-produtos'],['docs.html','#navegacao-docs','docs-ferramentas'],['docs.html','.tabela-responsiva','docs-tabelas']]){
   await navegar('/'+pagina);await esperar("typeof botaoMenu!=='undefined'");
   if(pagina==='docs.html')await esperar("typeof dadosDocs!=='undefined' && dadosDocs && !document.querySelector('#importar-arquivo').disabled && document.querySelector('#evidencias-docs tr')");
   if(pagina==='index.html')await esperar("document.querySelectorAll('#vitrine article').length>=3");
   if(pagina==='cloud.html'&&!base.includes('127.0.0.1'))await esperar("document.querySelectorAll('#vitrine-cloud article').length>=3");
   await avaliar(`document.querySelector(${JSON.stringify(seletor)}).scrollIntoView({behavior:'instant',block:'start'})`);await captura(nome+'-'+largura+'.png');
  }
 }
 conferir('nenhum erro JavaScript',erros.filter(e=>!e.includes('404')).length===0);
 const saida={base,resultados,erros};await writeFile(join(pasta,'responsividade.json'),JSON.stringify(saida,null,2));process.stdout.write(JSON.stringify({total:resultados.length,falhas:resultados.filter(x=>!x.passou),erros}));ws.close();
}catch(erro){await captura('falha.png');process.stdout.write(JSON.stringify({erro:String(erro),ultimos:resultados.slice(-5),erros}));ws.close();process.exitCode=1;}

