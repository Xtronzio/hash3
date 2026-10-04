import './style.css';
import {client, ensurePlayer, command} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions, terrainOf, connectedTerrain, availableCells} from './game.js';

import {createLocal, localCommand, machineChoice} from './local.js';
import {VERSION_LABEL} from './version.js';
import {startUpdates} from './updates.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
const save = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{/* device storage may be disabled */}};
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let selectedExpansion=null, finishOpen=false, localSetup=null, machineTimer=null;
let previousTarget = null, blinkId = null, activeKey = null, noticeTimer, connected = true;
const urlCode = new URL(location.href).searchParams.get('sala') || '';
const mark = symbol => symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message) {
  const n=document.querySelector('#notice'); n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function isLocal(){return !!room?.mode;}
function localUid(){const p=room.pairs[0];return room.mode==='solo'?p.x:p.pending?p.expander:p.turn==='X'?p.x:p.o;}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function accept(next) {
  if(next.not_modified)return;
  if(room?.id===next.id&&next.version<room.version)return;
  const changed = room?.id!==next.id;
  if(changed){previousTarget=null;activeKey=null;}
  room=next;if(isLocal()){uid=localUid();save('hash3_local',JSON.stringify(room));}else save('hash3_room',room.code);
  const target=immediateAbove(room.players,uid), targetId=target?.lastMove?.id;
  if(!changed&&targetId&&targetId!==previousTarget)blinkId=targetId;
  else blinkId=null;
  previousTarget=targetId||null;
  render();scheduleMachine();
}
function render() {
  const previous=document.querySelector('.viewport');
  const scroll=previous?{left:previous.scrollLeft,top:previous.scrollTop}:null;
  if(!room){renderHome();return;}
  if(room.status==='lobby'||room.status==='finished'){renderLobby();return;}
  if(isLocal())uid=localUid();
  const own=ownPlayer(), pair=ownPair(), target=immediateAbove(room.players,uid), list=rankedPlayers(room.players);
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  const ready=!expanding&&pair.turn===own.symbol&&!(room.mode==='solo'&&pair.turn==='O');
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const visibleRank=rankOpen?list:list.filter(p=>p.id===uid||p.id===target?.id);
  const rank=list.findIndex(p=>p.id===uid)+1;
  const title=canExpand?'Amplía tu territorio':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  app.innerHTML=`<section class="game">
    <header class="topbar"><div class="row"><span class="brand heading">#3</span><div><div class="code-mini mono">${isLocal()?(room.mode==='solo'?'CONTRA LA MÁQUINA':'DOS EN ESTE DISPOSITIVO'):escape(room.code)}</div>${isLocal()?'':'<button class="ghost small" data-action="share">Invitar</button>'}</div></div>
      <div class="team-score mono"><span class="x">X <strong>${totals.X}</strong></span><span class="o">O <strong>${totals.O}</strong></span></div>
      <div class="toolbar-name"><span class="${own.symbol.toLowerCase()}">${escape(own.name)} · ${own.symbol}</span>${room.host===uid?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    </header>
    <div class="workspace"><div class="arena">
      <div class="turnbar"><div><h1 class="heading">${title}</h1><p>Contra ${escape(opponent.name)} · ${canExpand?'Coloca el 3×3; puedes solaparlo.':'Usa cualquier celda vacía de tu territorio.'}</p></div><div class="turn-chip ${ready?'ready':expanding?'expanding':''}">${expanding?'AMPLIACIÓN':`<span class="turn-timer mono" aria-label="Tiempo restante"></span> · ${ready?'JUEGA '+own.symbol:'ESPERANDO'}`}</div></div>
      ${canExpand?`<div class="expansion-controls"><span>${selectedExpansion?expansionSummary():'Toca una celda para situar la esquina del 3×3.'}</span><button class="small primary" data-action="confirm-expansion" ${!selectedExpansion?'disabled':''}>Colocar</button></div>`:''}
      <div class="viewport" aria-label="Tablero compartido"><div class="board"></div></div>
      <div class="controls"><div class="group"><button class="zoom" data-action="minus" aria-label="Alejar tablero">−</button><button class="zoom" data-action="plus" aria-label="Acercar tablero">+</button><button class="small" data-action="center">Mi territorio</button></div><div class="group">${target?.lastMove?'<button class="small blue" data-action="locate">Mi objetivo</button>':''}${isLocal()||room.host===uid?'<button class="small ghost danger" data-action="finish">Finalizar</button>':''}</div><span class="legend">Gris: otras parejas · Azul: tu objetivo</span><span class="connection">${connected?'Conectado':'Reconectando…'}</span></div>
    </div><aside class="ranking"><button class="ranking-toggle" data-action="ranking" aria-expanded="${rankOpen}"><span>RANKING <span class="muted">${rankOpen?room.players.length:'#'+rank}</span></span><span aria-hidden="true">${rankOpen?'−':'+'}</span></button>
      <ol class="ranking-list">${visibleRank.map(p=>{const index=list.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':''}<small>${p.figures} figura${p.figures!==1?'s':''} · ${p.symbol}</small></span><span class="rank-score mono">${p.score}</span></li>`;}).join('')}</ol>
      <div class="goal-panel">${target?`<p class="muted">Tu siguiente objetivo</p><p class="blue">${escape(target.name)} · ${Math.max(0,target.score-own.score)} puntos por delante</p>${target.lastMove?'<button class="small" data-action="locate">Localizar última jugada</button>':'<p class="muted">Todavía no ha jugado.</p>'}`:'<p class="heading" style="font-size:24px;color:#f4c65d">Vas primero</p><p class="muted">Mantén tu posición.</p>'}</div>
      <div class="bonus-progress">${3-(own.figures%3)} figura${3-(own.figures%3)!==1?'s':''} para el bonus +3<div class="bonus-track">${[0,1,2].map(i=>`<i class="${i<own.figures%3?'done':''}"></i>`).join('')}</div></div>
    </aside></div></section>`;
  drawBoard(canExpand,ready,target);renderFinish();updateTimer();
  const nowKey=key(pair.active.x,pair.active.y);
  if(!scroll||nowKey!==activeKey)requestAnimationFrame(()=>center(pair.active.x+1,pair.active.y+1));
  else {const v=document.querySelector('.viewport');v.scrollLeft=scroll.left;v.scrollTop=scroll.top;}
  activeKey=nowKey;
  if(busy)document.querySelectorAll('[data-action="move"],[data-action="select-expansion"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
}
let layout={minX:0,minY:0,size:56,padding:100};
function expansionSummary() {
  const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),b=selectedExpansion;
  const count=Array.from({length:9},(_,i)=>key(b.x+i%3,b.y+Math.floor(i/3))).filter(k=>!known.has(k)).length;
  return `${count} celda${count!==1?'s':''} nueva${count!==1?'s':''} · ${9-count} existentes`;
}
function drawBoard(canExpand,ready,target) {
  const pair=ownPair(),own=ownPlayer(),terrain=terrainOf(room);
  const choices=canExpand?expansionOptions(terrain,pair.active):[],choiceKeys=new Set(choices.map(c=>key(c.x,c.y)));
  if(selectedExpansion&&!choiceKeys.has(key(selectedExpansion.x,selectedExpansion.y)))selectedExpansion=null;
  const all=[...terrain,...choices,...choices.map(c=>({x:c.x+2,y:c.y+2}))];
  const minX=Math.min(...all.map(c=>c.x)),minY=Math.min(...all.map(c=>c.y)),maxX=Math.max(...all.map(c=>c.x)),maxY=Math.max(...all.map(c=>c.y));
  const size=(innerWidth<=760?48:56)*zoom,padding=Math.max(90,innerWidth*.12);layout={minX,minY,size,padding};
  const board=document.querySelector('.board');
  board.style.width=`${(maxX-minX+1)*size+2*padding}px`;board.style.height=`${(maxY-minY+1)*size+2*padding}px`;
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),linked=new Set(connectedTerrain(terrain,pair.active).map(c=>key(c.x,c.y))),known=new Set(terrain.map(c=>key(c.x,c.y))),myPairIds=new Set([pair.x,pair.o]);
  const style=c=>`left:${(c.x-minX)*size+padding}px;top:${(c.y-minY)*size+padding}px;width:${size}px;height:${size}px`;
  board.innerHTML=terrain.map(pos=>{
    const {x,y}=pos,c=cells.get(key(x,y)),active=linked.has(key(x,y));
    const isTarget=c&&c.id===target?.lastMove?.id,last=c&&c.id===own.lastMove?.id;
    const color=c?(myPairIds.has(c.owner)?c.symbol.toLowerCase():'foreign'):'';
    const owner=c?room.players.find(p=>p.id===c.owner)?.name:'';
    const select=canExpand&&choiceKeys.has(key(x,y));
    const label=select?`Situar ampliación en ${x}, ${y}`:c?`${c.symbol} de ${owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}`:`Celda vacía ${x}, ${y}${active?', tu territorio':''}`;
    return `<button class="cell terrain-cell ${active?'connected':''} ${select?'placement-anchor':''} ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" style="${style(pos)}" data-action="${select?'select-expansion':'move'}" data-x="${x}" data-y="${y}" ${select?'':(!active||!ready||c?'disabled':'')} aria-label="${escape(label)}">${c?mark(c.symbol):''}</button>`;
  }).join('')+choices.filter(c=>!known.has(key(c.x,c.y))).map(c=>`<button class="placement-anchor new-anchor" data-action="select-expansion" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Situar ampliación en ${c.x}, ${c.y}">+</button>`).join('');
  if(selectedExpansion) {
    const b=selectedExpansion;
    board.insertAdjacentHTML('beforeend',`<div class="placement-preview" style="left:${(b.x-minX)*size+padding}px;top:${(b.y-minY)*size+padding}px;width:${3*size}px;height:${3*size}px" aria-hidden="true"></div>`);
  }
}
function center(x,y) {
  const v=document.querySelector('.viewport');if(!v)return;
  const {minX,minY,size,padding}=layout;
  v.scrollLeft=(x-minX+.5)*size+padding-v.clientWidth/2;
  v.scrollTop=(y-minY+.5)*size+padding-v.clientHeight/2;
}
function renderHome() {
  app.innerHTML=`<section class="entry"><div class="entry-inner"><div class="entry-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL} · PILOTO</span></div>
    <h1 class="heading">Elige cómo jugar</h1>
    <form id="entry-form"><div><label for="name">Tu apodo</label><input id="name" name="name" placeholder="Cómo te llamas" value="${escape(read('hash3_name')||'')}" minlength="2" maxlength="18" autocomplete="nickname" required></div>
    <button class="primary" type="submit" name="intent" value="create">Crear sala</button><div class="divider"></div><div><label for="code">¿Tienes un código?</label><input id="code" name="code" placeholder="CÓDIGO DE SALA" value="${escape(urlCode)}" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false"></div><button type="submit" name="intent" value="join">Entrar en una sala</button></form>
    <div class="offline-options"><button data-action="setup-solo">Contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button>${read('hash3_local')?'<button class="ghost" data-action="resume-local">Continuar partida local</button>':''}</div><p class="offline-hint muted" id="offline-status">Los modos locales no necesitan cobertura durante la partida.</p><details class="rules"><summary>Cómo se juega</summary><p>El anfitrión inicia con un número par de jugadores. Se sortean las parejas y los símbolos X/O. Alternas turnos con tu rival. Puedes usar todas las celdas vacías de vuestro territorio conectado.</p><p>Las líneas de tres o más, L de tres o cuatro, cuadrados 2×2 y cruces de cinco suman tantos puntos como celdas tienen. Se reconocen en todas las orientaciones. Una jugada puede completar varias figuras, aunque compartan fichas. Cada tercera figura da +3 extra. Las figuras ya cobradas no vuelven a puntuar. Los puntos individuales también suman para el equipo X/O.</p><p>Las figuras acumulan ampliaciones, pero solo puedes colocar un 3×3 cuando ya no queda ninguna celda vacía en vuestro territorio conectado. Puedes solaparlo con terreno existente: solo añade las celdas nuevas, sin borrar fichas. Si no tienes ampliaciones, se concede una para continuar. Cada turno dura 30 segundos; al agotarse, se juega una celda vacía al azar. El anfitrión decide cuándo finalizar este piloto.</p><p>El ranking se pliega al tocarlo. La última jugada del jugador justo por encima de ti queda en azul. Google y Apple se incorporarán más adelante.</p></details>
    <footer>Acceso como invitado. Para volver a tu sala, utiliza este mismo navegador.</footer></div></section>`;
  if(localSetup)renderLocalSetup();
  updateOfflineStatus();
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
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL} · PILOTO</span></header><div class="row spread"><h1 class="heading">${finished?'Resultado final':'La sala está abierta'}</h1>${host?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
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
  if(action==='center'){const p=ownPair();center(p.active.x+1,p.active.y+1);return;}
  if(action==='locate'){const move=immediateAbove(room.players,uid)?.lastMove;if(move)center(move.x,move.y);return;}
  if(action==='plus'||action==='minus'){zoom=Math.max(.45,Math.min(1.8,zoom+(action==='plus'?.15:-.15)));blinkId=null;render();const p=ownPair();center(p.active.x+1,p.active.y+1);return;}
  if(action==='share'){
    const url=new URL(location.href);url.searchParams.set('sala',room.code);
    try{await navigator.clipboard.writeText(url.href);notify('Invitación copiada. Compártela con el grupo.');}
    catch{notify(`Código de sala: ${room.code}`);}return;
  }
  if(action==='home'){if(!isLocal())save('hash3_room',null);clearTimeout(machineTimer);room=null;finishOpen=false;selectedExpansion=null;activeKey=null;history.replaceState(null,'',location.pathname);render();return;}
  if(action==='finish'){finishOpen=true;renderFinish();return;}
  if(action==='cancel-finish'){finishOpen=false;document.querySelector('.dialog-backdrop')?.remove();return;}
  if(action==='confirm-finish'){finishOpen=false;}
  if(action==='select-expansion'){selectedExpansion={x:Number(b.dataset.x),y:Number(b.dataset.y)};render();return;}
  if(action==='setup-solo'||action==='setup-local'){localSetup=action==='setup-solo'?'solo':'local';renderLocalSetup();return;}
  if(action==='cancel-local'){localSetup=null;document.querySelector('.dialog-backdrop')?.remove();return;}
  if(action==='start-local'){
    const name=document.querySelector('#local-name').value.trim()||'Tú',second=document.querySelector('#second-name')?.value.trim()||'Jugador 2';
    localSetup=null;selectedExpansion=null;accept(createLocal(document.querySelector('[data-mode]').dataset.mode,name,second));return;
  }
  if(action==='resume-local'){try{const next=JSON.parse(read('hash3_local'));if(!['solo','local'].includes(next.mode))throw new Error();accept(next);}catch{notify('No se ha podido recuperar la partida local.');}return;}
  const payload={code:room.code};
  if(action==='move'||action==='expand'){payload.x=Number(b.dataset.x);payload.y=Number(b.dataset.y);}
  if(action==='move')payload.requestId=crypto.randomUUID();
  await run(async()=>{
    const effectiveAction=action==='confirm-finish'?'finish':action==='confirm-expansion'?'expand':action;
    if(effectiveAction==='expand'){if(!selectedExpansion)return;Object.assign(payload,selectedExpansion);}
    const next=isLocal()?localCommand(room,effectiveAction,payload):await command(effectiveAction,payload);
    if(effectiveAction==='expand')selectedExpansion=null;
    if(action==='leave'){save('hash3_room',null);room=null;render();return;}
    accept(next);
    if(action==='move'){
      const ev=next.lastEvent;if(ev.points)notify(`+${ev.points} puntos${ev.bonus?' · bonus incluido':''}.${ev.continuation?' Ya puedes ampliar.':' Sigue usando las celdas vacías.'}`);
      else if(ev.continuation)notify('No quedan celdas vacías: coloca una ampliación para continuar.');
    }
  });
});
async function poll() {
  if(!room||isLocal()||room.status==='finished'||polling||busy||document.hidden)return;
  polling=true;const currentCode=room.code;
  try{
    const next=await command('tick',{code:currentCode,version:room.version});
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
  const code=read('hash3_room');
  renderHome();
  try{
    if(sessionStorage.getItem('hash3_restore_local')==='1'){
      sessionStorage.removeItem('hash3_restore_local');
      const saved=JSON.parse(read('hash3_local'));
      if(saved&&['solo','local'].includes(saved.mode)){accept(saved);return;}
    }
  }catch{/* Continue at the start screen if storage is unavailable. */}
  if(!navigator.onLine||!code||(urlCode&&urlCode.toUpperCase()!==code))return;
  const {data:{session}}=await client.auth.getSession();
  if(room||localSetup||busy)return;
  uid=session?.user.id||null;
  if(uid){
    try{const next=await command('get',{code});if(!room&&!localSetup&&!busy)accept(next);}catch{notify('No se ha podido recuperar la sala. Puedes entrar con su código.');}
  }
}
init().catch(error=>{renderHome();notify('Puedes jugar en los modos locales. '+(error.message||'No se ha podido conectar.'));});

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

function renderFinish() {
  document.querySelector('.finish-dialog')?.remove();
  if(!finishOpen||!room)return;
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop finish-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="finish-title"><h2 class="heading" id="finish-title">¿Finalizar la partida?</h2><p>Se cerrará la partida${isLocal()?'':' para todos los jugadores'} y se mostrará el resultado.</p><div class="row"><button data-action="cancel-finish">Seguir jugando</button><button class="primary" data-action="confirm-finish">Finalizar</button></div></section></div>`);
  document.querySelector('[data-action="cancel-finish"]').focus();
}
function renderLocalSetup() {
  document.querySelector('.local-dialog')?.remove();
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop local-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="local-title" data-mode="${localSetup}"><h2 class="heading" id="local-title">${localSetup==='solo'?'Contra la máquina':'Dos en este dispositivo'}</h2><label for="local-name">${localSetup==='solo'?'Tu apodo':'Jugador X'}</label><input id="local-name" value="${escape(read('hash3_name')||'')}" placeholder="${localSetup==='solo'?'Tú':'Jugador 1'}" maxlength="18">${localSetup==='local'?'<label for="second-name">Jugador O</label><input id="second-name" placeholder="Jugador 2" maxlength="18">':''}<p>${localSetup==='solo'?'Juegas con X. La máquina juega con O.':'Pasad el dispositivo después de cada turno.'} Tenéis 30 segundos para mover.</p><div class="row"><button data-action="cancel-local">Volver</button><button class="primary" data-action="start-local">Empezar</button></div></section></div>`);
  document.querySelector('#local-name').focus();
}
function updateTimer() {
  if(!room||room.status!=='playing')return;
  const p=ownPair(),node=document.querySelector('.turn-timer');
  if(node&&p.deadline) {
    const seconds=Math.max(0,Math.ceil((Date.parse(p.deadline)-Date.now())/1000));
    node.textContent=seconds+' s';node.classList.toggle('urgent',seconds<=5);
    if(seconds===0)document.querySelectorAll('[data-action="move"]').forEach(b=>b.disabled=true);
  }
}
function scheduleMachine() {
  clearTimeout(machineTimer);
  if(room?.mode!=='solo'||room.status!=='playing'||document.hidden)return;
  const p=room.pairs[0];
  if(p.pending?p.expander!==p.o:p.turn!=='O')return;
  const expected=room.id,version=room.version;
  machineTimer=setTimeout(()=>{
    if(room?.id!==expected||room.version!==version||busy||document.hidden)return;
    const choice=machineChoice(room);accept(localCommand(room,choice.action,choice.payload));
  },650);
}
setInterval(()=>{
  updateTimer();
  if(isLocal()&&room.status==='playing'&&!busy&&!document.hidden) {
    const next=localCommand(room,'tick');if(next!==room){accept(next);notify('Tiempo agotado: jugada automática en una celda vacía.');}
  }
},500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleMachine();});
function updateOfflineStatus() {
  const n=document.querySelector('#offline-status');if(!n)return;
  n.textContent=navigator.serviceWorker?.controller?'Preparado para jugar sin conexión.':'Los modos locales no necesitan cobertura durante la partida. Abre esta web una primera vez con internet.';
}
startUpdates({
  canReload:()=>!busy&&!localSetup&&!finishOpen&&!document.activeElement?.matches('input,textarea'),
  beforeReload:()=>{
    if(isLocal()){save('hash3_local',JSON.stringify(room));try{sessionStorage.setItem('hash3_restore_local','1');}catch{/* The saved game remains available from the start screen. */}}
  },
  onReady:updateOfflineStatus
});
