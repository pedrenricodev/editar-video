// Print REAL de uma pagina (paginas com animacao no scroll: por isso CDP e nao --screenshot).
// Remove banner de cookie fixo antes de cada captura. Precisa de Node 22+ (WebSocket nativo).
//
// Uso: node cdp_print.js <url> <pasta_saida>
// <pasta_saida>/alvos.json: [{"nome": "tabela", "sel": "document.querySelector('table')", "dy": -40, "espera": 2500}]
// Chrome: env CHROME_BIN (padrao: Google Chrome do macOS).
const {spawn}=require('child_process');const http=require('http');const fs=require('fs');
const [,,url,outdir]=process.argv;
const C=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ch=spawn(C,['--headless=new','--remote-debugging-port=9333','--hide-scrollbars','--window-size=1400,1100',`--user-data-dir=${outdir}/prof`,'about:blank']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=u=>new Promise((res,rej)=>http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)))}).on('error',rej));
(async()=>{
 let t;for(let i=0;i<40;i++){try{t=(await get('http://127.0.0.1:9333/json')).find(x=>x.type==='page');if(t)break}catch(e){}await sleep(250)}
 const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
 let id=0;const pend={};ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}});
 const send=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
 const ev=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result.result.value;
 await send('Emulation.setDeviceMetricsOverride',{width:1400,height:1100,deviceScaleFactor:2,mobile:false});
 await send('Page.navigate',{url});await sleep(9000);
 const tiraCookie=`(()=>{let n=0;document.querySelectorAll('body *').forEach(e=>{const cs=getComputedStyle(e);if((cs.position==='fixed'||cs.position==='sticky')&&/cookie/i.test(e.innerText||'')){e.remove();n++}});return n})()`;
 console.log('cookie removidos',await ev(tiraCookie));
 const alvos=JSON.parse(fs.readFileSync(outdir+'/alvos.json'));
 for(const a of alvos){
  // desce ate o alvo em passos, pra animacao de scroll disparar
  const y=await ev(`(()=>{const e=${a.sel};return e?e.getBoundingClientRect().top+scrollY:-1})()`);
  if(y<0){console.log('nao achei',a.nome);continue}
  const cur=await ev('scrollY');for(let s=cur;s<y+(a.dy||0);s+=600){await ev(`scrollTo(0,${s})`);await sleep(60)}
  await ev(`scrollTo(0,${y+(a.dy||0)})`);await sleep(a.espera||2500);await ev(tiraCookie);
  const r=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(`${outdir}/${a.nome}.png`,Buffer.from(r.result.data,'base64'));console.log('ok',a.nome,y);
 }
 ws.close();ch.kill();process.exit(0)
})().catch(e=>{console.error(e);ch.kill();process.exit(1)});
