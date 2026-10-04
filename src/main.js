import './style.css';
import {client, ensurePlayer, command} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions} from './game.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
const save = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{/* device storage may be disabled */}};
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let previousTarget = null, blinkId = null, activeKey = null, noticeTimer, connected = true;
const urlCode = new URL(location.href).searchParams.get('sala') || '';
const mark = symbol => symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message) {
  const n=document.querySelector('#notice'); n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function accept(next) {
  if(next.not_modified)return;
  if(room?.id===next.id&&next.version<room.version)return;
  const changed = room?.id!==next.id;
  if(changed){previousTarget=null;activeKey=null;}
  room=next;save('hash3_room',room.code);
  const target=immediateAbove(room.players,uid), targetId=target?.lastMove?.id;
  if(!changed&&targetId&&targetId!==previousTarget)blinkId=targetId;
  else blinkId=null;
  previousTarget=targetId||null;
  render();
}
function render() {
  const previous=document.querySelector('.viewport');
  const scroll=previous?{left:previous.scrollLeft,top:previous.scrollTop}:null;
  if(!room){renderHome();return;}
  if(room.status==='lobby'||room.status==='finished'){renderLobby();return;}
  const own=ownPlayer(), pair=ownPair(), target=immediateAbove(room.players,uid), list=rankedPlayers(room.players);
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  const ready=!expanding&&pair.turn===own.symbol;
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const visibleRank=rankOpen?list:list.filter(p=>p.id===uid||p.id===target?.id);
  const rank=list.findIndex(p=>p.id===uid)+1;
  const title=canExpand?'Amplía tu territorio':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  app.innerHTML=`<section class="game">
    <header class="topbar"><div class="row"><span class="brand heading">#3</span><div><div class="code-mini mono">${escape(room.code)}</div><button class="ghost small" data-action="share">Invitar</button></div></div>
      <div class="team-score mono"><span class="x">X <strong>${totals.X}</strong></span><span class="o">O <strong>${totals.O}</strong></span></div>
      <div class="toolbar-name"><span class="${own.symbol.toLowerCase()}">${escape(own.name)} · ${own.symbol}</span>${room.host===uid?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    </header>
    <div class="workspace"><div class="arena">
      <div class="turnbar"><div><h1 class="heading">${title}</h1><p>Contra ${escape(opponent.name)} · ${canExpand?'Elige uno de los huecos azules.':'Conecta tres en tu # activo.'}</p></div><div class="turn-chip ${ready?'ready':expanding?'expanding':''}">${canExpand?`${pair.pending} bloque${pair.pending>1?'s':''} pendiente${pair.pending>1?'s':''}`:ready?'JUEGA '+own.symbol:'ESPERANDO'}</div></div>
      <div class="viewport" aria-label="Tablero compartido"><div class="board"></div></div>
      <div class="controls"><div class="group"><button class="zoom" data-action="minus" aria-label="Alejar tablero">−</button><button class="zoom" data-action="plus" aria-label="Acercar tablero">+</button><button class="small" data-action="center">Mi # activo</button></div><div class="group">${target?.lastMove?'<button class="small blue" data-action="locate">Mi objetivo</button>':''}${room.host===uid?'<button class="small ghost danger" data-action="finish">Finalizar</button>':''}</div><span class="legend">Gris: otras parejas · Azul: tu objetivo</span><span class="connection">${connected?'Conectado':'Reconectando…'}</span></div>
    </div><aside class="ranking"><button class="ranking-toggle" data-action="ranking" aria-expanded="${rankOpen}"><span>RANKING <span class="muted">${rankOpen?room.players.length:'#'+rank}</span></span><span aria-hidden="true">${rankOpen?'−':'+'}</span></button>
      <ol class="ranking-list">${visibleRank.map(p=>{const index=list.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':''}<small>${p.figures} figura${p.figures!==1?'s':''} · ${p.symbol}</small></span><span class="rank-score mono">${p.score}</span></li>`;}).join('')}</ol>
      <div class="goal-panel">${target?`<p class="muted">Tu siguiente objetivo</p><p class="blue">${escape(target.name)} · ${Math.max(0,target.score-own.score)} puntos por delante</p>${target.lastMove?'<button class="small" data-action="locate">Localizar última jugada</button>':'<p class="muted">Todavía no ha jugado.</p>'}`:'<p class="heading" style="font-size:24px;color:#f4c65d">Vas primero</p><p class="muted">Mantén tu posición.</p>'}</div>
      <div class="bonus-progress">${3-(own.figures%3)} figura${3-(own.figures%3)!==1?'s':''} para el bonus +3<div class="bonus-track">${[0,1,2].map(i=>`<i class="${i<own.figures%3?'done':''}"></i>`).join('')}</div></div>
    </aside></div></section>`;
  drawBoard(canExpand,ready,target);
  const nowKey=key(pair.active.x,pair.active.y);
  if(!scroll||nowKey!==activeKey)requestAnimationFrame(()=>center(pair.active.x*3+1,pair.active.y*3+1));
  else {const v=document.querySelector('.viewport');v.scrollLeft=scroll.left;v.scrollTop=scroll.top;}
  activeKey=nowKey;
  if(busy)document.querySelectorAll('[data-action="move"],[data-action="expand"]').forEach(b=>b.disabled=true);
}
let layout={minX:0,minY:0,size:56,padding:100};
function drawBoard(canExpand,ready,target) {
  const pair=ownPair(), own=ownPlayer();
  const choices=canExpand?expansionOptions(room.blocks,pair.active):[];
  const all=[...room.blocks,...choices];
  const minX=Math.min(...all.map(b=>b.x)),minY=Math.min(...all.map(b=>b.y));
  const maxX=Math.max(...all.map(b=>b.x)),maxY=Math.max(...all.map(b=>b.y));
  const size=(innerWidth<=760?48:56)*zoom,padding=Math.max(110,innerWidth*.17);
  layout={minX,minY,size,padding};
  const board=document.querySelector('.board');
  board.style.width=`${(maxX-minX+1)*3*size+2*padding}px`;board.style.height=`${(maxY-minY+1)*3*size+2*padding}px`;
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
  const myPairIds=new Set([pair.x,pair.o]);
  board.innerHTML=room.blocks.map(b=>{
    const active=b.x===pair.active.x&&b.y===pair.active.y;
    let html='';
    for(let cy=0;cy<3;cy++)for(let cx=0;cx<3;cx++){
      const x=b.x*3+cx,y=b.y*3+cy,c=cells.get(key(x,y));
      const isTarget=c&&c.id===target?.lastMove?.id;
      const last=c&&c.id===own.lastMove?.id;
      const color=c?(myPairIds.has(c.owner)?c.symbol.toLowerCase():'foreign'):'';
      const owner=c?room.players.find(p=>p.id===c.owner)?.name:'';
      const label=c?`${c.symbol} de ${owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}`:`Celda ${x}, ${y}${active?', tu territorio activo':''}`;
      html+=`<button class="cell ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" data-action="move" data-x="${x}" data-y="${y}" ${!active||!ready||c?'disabled':''} aria-label="${escape(label)}">${c?mark(c.symbol):''}</button>`;
    }
    return `<div class="block ${active?'active':''}" style="left:${(b.x-minX)*3*size+padding}px;top:${(b.y-minY)*3*size+padding}px;width:${3*size}px;height:${3*size}px">${html}</div>`;
  }).join('')+choices.map(b=>`<button class="expand-option" data-action="expand" data-x="${b.x}" data-y="${b.y}" style="left:${(b.x-minX)*3*size+padding}px;top:${(b.y-minY)*3*size+padding}px;width:${3*size}px;height:${3*size}px" aria-label="Expandir al bloque ${b.x}, ${b.y}">+</button>`).join('');
}
function center(x,y) {
  const v=document.querySelector('.viewport');if(!v)return;
  const {minX,minY,size,padding}=layout;
  v.scrollLeft=(x-minX*3+.5)*size+padding-v.clientWidth/2;
  v.scrollTop=(y-minY*3+.5)*size+padding-v.clientHeight/2;
}
function renderHome() {
  app.innerHTML=`<section class="entry"><div class="entry-inner"><div class="entry-header"><span class="brand heading">#3</span><span class="tag">R0.1 · PILOTO</span></div>
    <h1 class="heading">Tres en línea.<br>El tablero crece.</h1><p class="muted">Juega por parejas en un tablero compartido. Cada figura suma y abre territorio.</p>
    <form id="entry-form"><div><label for="name">Tu apodo</label><input id="name" name="name" placeholder="Cómo te llamas" value="${escape(read('hash3_name')||'')}" minlength="2" maxlength="18" autocomplete="nickname" required></div>
    <button class="primary" type="submit" name="intent" value="create">Crear sala</button><div class="divider"></div><div><label for="code">¿Tienes un código?</label><input id="code" name="code" placeholder="CÓDIGO DE SALA" value="${escape(urlCode)}" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false"></div><button type="submit" name="intent" value="join">Entrar en una sala</button></form>
    <details class="rules"><summary>Cómo se juega</summary><p>El anfitrión inicia con un número par de jugadores. Se sortean las parejas y los símbolos X/O. Alternas turnos con tu rival en vuestro # activo.</p><p>Una línea de tres suma +3 al jugador que la completa. Cada tercera figura da +3 extra. Las figuras ya cobradas no vuelven a puntuar. Los puntos individuales también suman para el equipo X/O.</p><p>Una figura concede un bloque 3×3. Si el bloque se llena sin figura, se concede uno sin puntos para continuar. Los bloques nuevos deben tocar territorio conectado. El anfitrión decide cuándo finalizar este piloto.</p><p>El ranking se pliega al tocarlo. La última jugada del jugador justo por encima de ti queda en azul. Google y Apple se incorporarán más adelante.</p></details>
    <footer>Acceso como invitado. Para volver a tu sala, utiliza este mismo navegador.</footer></div></section>`;
  document.querySelector('#entry-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const form=new FormData(e.currentTarget),action=e.submitter?.value||'create';
    const name=String(form.get('name')).trim(),code=String(form.get('code')).trim().toUpperCase();
    if(action==='join'&&!/^[A-Z0-9]{8}$/.test(code)){notify('Introduce un código de sala de 8 caracteres.');return;}
    save('hash3_name',name);
    await run(async()=>{uid=await ensurePlayer();accept(await command(action,{name,code}));});
  });
}
function renderLobby() {
  const finished=room.status==='finished',host=room.host===uid,list=rankedPlayers(room.players),winner=list[0];
  const count=room.players.length,canStart=count>=2&&count%2===0;
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">R0.1 · PILOTO</span></header><div class="row spread"><h1 class="heading">${finished?'Resultado final':'La sala está abierta'}</h1>${host?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    ${finished?`<div class="finished"><h2 class="heading">${escape(winner.name)} · ${winner.score} puntos</h2><p>${list.filter(p=>p.score===winner.score).length>1?'Hay empate en la primera posición.':'Primero en el ranking individual.'}</p></div>`:`<div class="code-panel"><label>Código de la sala</label><div class="code mono">${escape(room.code)}</div><button class="small" data-action="share" style="margin-top:16px">Copiar invitación</button></div>`}
    <div class="row spread"><span>${count} jugador${count!==1?'es':''}</span><span class="muted">${finished?'Puntos / figuras':'De 2 a 12 · por parejas'}</span></div>
    <ol class="player-list">${(finished?list:room.players).map((p,i)=>`<li><span>${finished?`${i+1}. `:''}${escape(p.name)}${p.id===uid?' · tú':''}${p.id===room.host?' <span class="host">ANFITRIÓN</span>':''}</span><span class="${p.symbol?.toLowerCase()||'muted'}">${finished?`${p.score} / ${p.figures}`:'Listo'}</span></li>`).join('')}</ol>
    ${!finished?`<p class="instructions">${host?'Al iniciar, se sortearán las parejas y los símbolos. Cada pareja empezará en su propio 3×3.': 'El anfitrión iniciará la partida cuando estéis todos.'}</p>${host?`<button class="primary" data-action="start" ${!canStart?'disabled':''} style="width:100%">Iniciar partida</button>${!canStart?'<p class="instructions">Necesitamos un número par de jugadores para formar las parejas.</p>':''}`:''}`:''}
    <div class="footer-actions"><button class="ghost small" data-action="home">Volver al inicio</button>${!finished?`<button class="ghost small danger" data-action="${host?'finish':'leave'}">${host?'Cerrar sala':'Salir de la sala'}</button>`:''}</div></section>`;
}
async function run(operation) {
  if(busy)return;busy=true;
  const buttons=[...app.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);
  try{await operation();connected=true;}catch(error){notify(error.message||'No se ha podido conectar. Inténtalo de nuevo.');}
  finally{busy=false;if(room)render();else buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}
}
app.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  const action=b.dataset.action;
  if(action==='ranking'){rankOpen=!rankOpen;blinkId=null;render();return;}
  if(action==='center'){const p=ownPair();center(p.active.x*3+1,p.active.y*3+1);return;}
  if(action==='locate'){const move=immediateAbove(room.players,uid)?.lastMove;if(move)center(move.x,move.y);return;}
  if(action==='plus'||action==='minus'){zoom=Math.max(.45,Math.min(1.8,zoom+(action==='plus'?.15:-.15)));blinkId=null;render();const p=ownPair();center(p.active.x*3+1,p.active.y*3+1);return;}
  if(action==='share'){
    const url=new URL(location.href);url.searchParams.set('sala',room.code);
    try{await navigator.clipboard.writeText(url.href);notify('Invitación copiada. Compártela con el grupo.');}
    catch{notify(`Código de sala: ${room.code}`);}return;
  }
  if(action==='home'){save('hash3_room',null);room=null;activeKey=null;history.replaceState(null,'',location.pathname);render();return;}
  if(action==='finish'&&!confirm('¿Finalizar para todos los jugadores?'))return;
  const payload={code:room.code};
  if(action==='move'||action==='expand'){payload.x=Number(b.dataset.x);payload.y=Number(b.dataset.y);}
  if(action==='move')payload.requestId=crypto.randomUUID();
  await run(async()=>{
    const next=await command(action,payload);
    if(action==='leave'){save('hash3_room',null);room=null;render();return;}
    accept(next);
    if(action==='move'&&next.lastEvent?.player===uid){
      const ev=next.lastEvent;if(ev.points)notify(`+${ev.points} puntos${ev.bonus?' · bonus +3':''}. Elige tu expansión.`);
      else if(ev.continuation)notify('Bloque completo: elige otro para continuar, sin puntos.');
    }
  });
});
async function poll() {
  if(!room||room.status==='finished'||polling||busy||document.hidden)return;
  polling=true;const currentCode=room.code;
  try{
    const next=await command('get',{code:currentCode,version:room.version});
    if(room?.code===currentCode)accept(next);
    connected=true;
  }catch{connected=false;}
  finally{polling=false;const status=document.querySelector('.connection');if(status)status.textContent=connected?'Conectado':'Reconectando…';}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
window.addEventListener('online',poll);
window.addEventListener('resize',()=>{if(room?.status==='playing'){blinkId=null;render();}});
setInterval(poll,1800);
async function init(){
  app.innerHTML='<div class="loading">Preparando #3…</div>';
  const {data:{session}}=await client.auth.getSession();uid=session?.user.id||null;
  const code=read('hash3_room');
  if(uid&&code&&(!urlCode||urlCode.toUpperCase()===code)){
    try{accept(await command('get',{code}));return;}catch{notify('No se ha podido recuperar la sala. Puedes entrar con su código.');}
  }
  render();
}
init().catch(error=>{renderHome();notify(error.message||'No se ha podido conectar.');});

// Optional browser tool: reads exactly the state available to the current player.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  try{
    Promise.resolve(document.modelContext.registerTool({
      name:'read_hash3_game',title:'Consultar partida #3',
      description:'Consulta la sala visible, el ranking, el turno y el territorio activo del jugador actual. No modifica la partida.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute(input){
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('La consulta no acepta parámetros.');
        if(!room)return {status:'home'};
        return {code:room.code,status:room.status,ranking:rankedPlayers(room.players).map(p=>({name:p.name,symbol:p.symbol,score:p.score,figures:p.figures})),you:ownPlayer()?.name,pair:ownPair(),cells:room.cells.map(({x,y,symbol})=>({x,y,symbol}))};
      }
    },{signal:lifecycle.signal})).catch(()=>{});
  }catch{/* WebMCP is optional; normal play remains available. */}
}
