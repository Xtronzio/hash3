import './style.css';
import './hall.css';
import {hallModes,hallMarkup,hallDialogMarkup,rulesMarkup} from './hall.js';
import {client, ensurePlayer, command} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions, terrainOf, connectedTerrain, availableCells} from './game.js';

import {createLocal, localCommand, machineChoice} from './local.js';
import {scoreFeedback,scoreBreakdown} from './feedback.js';
import {VERSION_LABEL} from './version.js';
import {startUpdates} from './updates.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
const save = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{/* device storage may be disabled */}};
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let selectedExpansion=null, finishOpen=false, leaveOpen=false, roomSetup=null, localSetup=null, machineTimer=null;
let figureEffect=null,figureTimer,scoreFloatTimer;
let hallHistory=[],localReturnDialog=null;
let hallMode='world',hallDialog=null,hallReturnAction='hall-play',hallRanking=null,hallRequest=0;
let previousTarget = null, blinkId = null, activeKey = null, noticeTimer, connected = true;
const urlCode = new URL(location.href).searchParams.get('sala') || '';
const urlRival = new URL(location.href).searchParams.get('rival') || '';
if(urlCode)hallDialog='online';
const humans = () => room.players.filter(p=>!p.bot);
const mark = symbol => symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message) {
  const n=document.querySelector('#notice'); n.classList.remove('score-notice');n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function isLocal(){return !!room?.mode;}
function localUid(){const p=room.pairs[0];return room.mode==='solo'?p.x:p.pending?p.expander:p.turn==='X'?p.x:p.o;}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function accept(next) {
  if(next.not_modified)return;
  if(room?.id===next.id&&next.version<room.version)return;
  const feedback=scoreFeedback(room,next);
  const changed = room?.id!==next.id;
  if(changed){previousTarget=null;activeKey=null;figureEffect=null;clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);}
  room=next;if(isLocal()){uid=localUid();save('hash3_local',JSON.stringify(room));}else {save('hash3_room',room.code);const me=room.players.find(p=>p.id===uid);if(me)save('hash3_name',me.name);}
  const target=immediateAbove(humans(),uid), targetId=target?.lastMove?.id;
  if(!changed&&targetId&&targetId!==previousTarget)blinkId=targetId;
  else blinkId=null;
  previousTarget=targetId||null;
  const pair=ownPair(),show=feedback&&pair&&[pair.x,pair.o].includes(feedback.player);
  if(show)startFigureEffect(feedback);
  render();if(show)showScore(feedback);scheduleMachine();
}
function render() {
  const previous=document.querySelector('.viewport');
  const scroll=previous?{left:previous.scrollLeft,top:previous.scrollTop}:null;
  if(!room){renderHome();return;}
  if(!isLocal()&&ownPlayer()?.active===false&&room.status!=='finished'){renderReturn();return;}
  if(room.status==='lobby'||room.status==='finished'){renderLobby();return;}
  if(isLocal())uid=localUid();
  const own=ownPlayer(), pair=ownPair(), target=immediateAbove(humans(),uid), list=rankedPlayers(humans());
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  const ready=!expanding&&pair.turn===own.symbol&&!(room.mode==='solo'&&pair.turn==='O');
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const visibleRank=rankOpen?list:list.filter(p=>p.id===uid||p.id===target?.id);
  const rank=list.findIndex(p=>p.id===uid)+1;
  const title=canExpand?'Amplía tu territorio':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  app.innerHTML=`<section class="game">
    <header class="topbar"><div class="row"><span class="brand heading">#3</span><div><div class="code-mini mono">${isLocal()?(room.mode==='solo'?'CONTRA LA MÁQUINA':'DOS EN ESTE DISPOSITIVO'):escape(room.code)}</div><span class="muted">Nivel ${room.level==='advanced'?'Avanzado':'Normal'}</span>${isLocal()?'':`<button class="ghost small" data-action="${opponent.bot?'share-pair':'share'}">${opponent.bot?'Invitar a mi rival':'Invitar al mundo'}</button>`}</div></div>
      <div class="team-score mono"><span class="x">X <strong>${totals.X}</strong></span><span class="o">O <strong>${totals.O}</strong></span></div>
      <div class="toolbar-name"><span class="${own.symbol.toLowerCase()}">${escape(own.name)} · ${own.symbol}</span>${room.host===uid&&!room.commonWorld?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    </header>
    <div class="workspace"><div class="arena">
      <div class="turnbar"><div><h1 class="heading">${title}</h1><p>Contra ${escape(opponent.name)}${opponent.bot?' · esperando rival humano':''} · ${canExpand?'Coloca el 3×3; puedes solaparlo.':'Usa cualquier celda vacía de tu territorio.'}</p>${room.kind==='duel'?'<p class="duel-clock"><strong>FIN DEL DUELO · <span id="duel-time" class="mono"></span></strong></p>':''}</div><div class="turn-chip ${ready?'ready':expanding?'expanding':''}"><span class="turn-timer mono" aria-label="Tiempo restante"></span> · ${expanding?'AMPLIACIÓN':ready?'JUEGA '+own.symbol:'ESPERANDO'}</div></div>
      ${canExpand?`<div class="expansion-controls"><span>${selectedExpansion?expansionSummary():'Toca una celda para situar la esquina del 3×3.'}</span><button class="small primary" data-action="confirm-expansion" ${!selectedExpansion?'disabled':''}>Colocar</button></div>`:''}
      <div class="viewport" aria-label="Tablero compartido"><div class="board"></div></div>
      <div class="controls"><div class="group"><button class="zoom" data-action="minus" aria-label="Alejar tablero">−</button><button class="zoom" data-action="plus" aria-label="Acercar tablero">+</button><button class="small" data-action="center">Mi territorio</button></div><div class="group">${target?.lastMove?'<button class="small blue" data-action="locate">Mi objetivo</button>':''}<button class="small ghost danger" data-action="abandon">Abandonar</button>${isLocal()||room.host===uid&&!room.commonWorld?'<button class="small ghost danger" data-action="finish">Finalizar sala</button>':''}</div><span class="legend">Gris: otras parejas · Azul: tu objetivo</span><span class="connection">${connected?'Conectado':'Reconectando…'}</span></div>
    </div><aside class="ranking"><button class="ranking-toggle" data-action="ranking" aria-expanded="${rankOpen}"><span>RANKING <span class="muted">${rankOpen?humans().length:'#'+rank}</span></span><span aria-hidden="true">${rankOpen?'−':'+'}</span></button>
      <ol class="ranking-list">${visibleRank.map(p=>{const index=list.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':''}<small>${p.figures} figura${p.figures!==1?'s':''} · ${p.symbol}</small></span><span class="rank-score mono">${p.score}</span></li>`;}).join('')}</ol>
      <div class="goal-panel">${target?`<p class="muted">Tu siguiente objetivo</p><p class="blue">${escape(target.name)} · ${Math.max(0,target.score-own.score)} puntos por delante</p>${target.lastMove?'<button class="small" data-action="locate">Localizar última jugada</button>':'<p class="muted">Todavía no ha jugado.</p>'}`:'<p class="heading" style="font-size:24px;color:#f4c65d">Vas primero</p><p class="muted">Mantén tu posición.</p>'}</div>
      <div class="bonus-progress">${3-(own.figures%3)} figura${3-(own.figures%3)!==1?'s':''} para el bonus +3<div class="bonus-track">${[0,1,2].map(i=>`<i class="${i<own.figures%3?'done':''}"></i>`).join('')}</div></div>
    </aside></div></section>`;
  drawBoard(canExpand,ready,target);renderFinish();renderLeave();updateTimer();
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
    const glowing=figureEffect&&figureEffect.until>performance.now()&&figureEffect.cells.has(key(x,y));
    const glowStyle=glowing?`--figure-color:${figureEffect.symbol==='X'?'var(--red)':'var(--green)'};--figure-duration:${Math.max(1,figureEffect.until-performance.now())}ms;`:'';
    const label=select?`Situar ampliación en ${x}, ${y}`:c?`${c.symbol} de ${owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}`:`Celda vacía ${x}, ${y}${active?', tu territorio':''}`;
    return `<button class="cell terrain-cell ${glowing?'figure-glow':''} ${active?'connected':''} ${select?'placement-anchor':''} ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" style="${style(pos)};${glowStyle}" data-action="${select?'select-expansion':'move'}" data-x="${x}" data-y="${y}" ${select?'':(!active||!ready||c?'disabled':'')} aria-label="${escape(label)}">${c?mark(c.symbol):''}</button>`;
  }).join('')+choices.filter(c=>!known.has(key(c.x,c.y))).map(c=>`<button class="placement-anchor new-anchor" data-action="select-expansion" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Situar ampliación en ${c.x}, ${c.y}">+</button>`).join('');
  if(figureEffect&&figureEffect.floatUntil>performance.now()){
    const e=figureEffect;
    board.insertAdjacentHTML('beforeend',`<span class="score-float ${e.symbol.toLowerCase()}" style="left:${(e.move.x-minX+.5)*size+padding}px;top:${(e.move.y-minY)*size+padding}px;animation-duration:${Math.max(1,e.floatUntil-performance.now())}ms" aria-hidden="true">+${e.points}</span>`);
  }
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
function savedLocal() {
  try{const saved=JSON.parse(read('hash3_local'));return saved&&['solo','local'].includes(saved.mode)&&Array.isArray(saved.players)?saved:null;}catch{return null;}
}
function renderHome() {
  app.innerHTML=hallMarkup({name:read('hash3_name')||'',mode:hallMode,lastCode:read('hash3_room')||'',hasLocal:!!savedLocal()});
  if(hallDialog)renderHallDialog();
  if(localSetup)renderLocalSetup();
  if(roomSetup)renderRoomSetup();
  updateOfflineStatus();
}
function closeHallDialog(restoreFocus=true) {
  hallDialog=hallHistory.pop()||null;document.querySelector('.hall-dialog')?.remove();
  if(hallDialog){renderHallDialog();return;}
  if(restoreFocus)document.querySelector(`[data-action="${hallReturnAction}"]`)?.focus();
}
function openHallDialog(kind,returnAction='hall-play') {
  if(hallDialog&&hallDialog!==kind)hallHistory.push(hallDialog);hallReturnAction=returnAction;hallDialog=kind;renderHallDialog();
}
function hallDialogFrame(title,body) {
  return `<div class="dialog-backdrop hall-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="hall-dialog-title"><div class="hall-dialog-heading"><h2 class="heading" id="hall-dialog-title">${title}</h2><button class="ghost small" data-action="hall-close" aria-label="Cerrar">×</button></div>${body}<div class="row hall-dialog-footer"><button data-action="hall-close">Volver</button></div></section></div>`;
}
function rankingRows(players) {
  return `<ol class="hall-ranking-list">${rankedPlayers(players.filter(p=>!p.bot)).map((p,i)=>`<li><span class="rank-position ${['gold','silver','bronze'][i]||''}">${i+1}</span><span>${escape(p.name)}<small>${p.figures} figuras · ${p.symbol||'—'}</small></span><strong class="mono">${p.score}</strong></li>`).join('')}</ol>`;
}
function renderHallDialog() {
  document.querySelector('.hall-dialog')?.remove();
  const local=savedLocal();let markup;
  if(hallDialog==='help')markup=hallDialogFrame('Cómo se juega',rulesMarkup);
  else if(hallDialog==='ranking') {
    const r=hallRanking;let body='';
    if(r?.loading)body+='<p role="status">Consultando tu última sala…</p>';
    if(r?.online)body+=`<h3 class="heading">Sala ${escape(r.online.code)}</h3>${rankingRows(r.online.players)}<button class="small" data-action="return-room" data-code="${escape(r.online.code)}">Volver a esta sala</button>`;
    if(local)body+=`<h3 class="heading hall-ranking-subtitle">Última partida local</h3>${rankingRows(local.players)}<button class="small" data-action="resume-local">Continuar partida local</button>`;
    if(r?.error)body+=`<p class="muted">${escape(r.error)}</p>`;
    if(!r?.loading&&!r?.online&&!local)body+='<p>Todavía no hay resultados en este dispositivo. Juega una partida para consultar su ranking.</p>';
    body+='<p class="muted">Cada sala tiene su propio ranking por puntos.</p>';markup=hallDialogFrame('Ranking',body);
  }else markup=hallDialogMarkup(hallDialog,{name:read('hash3_name')||'',mode:hallMode,code:urlCode,friendInvite:!!urlRival,local});
  app.insertAdjacentHTML('beforeend',markup);
  const form=document.querySelector('#entry-form');
  form?.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const values=new FormData(e.currentTarget),action=e.submitter?.value||'create';
    const name=String(values.get('name')||'').trim(),code=String(values.get('code')||'').trim().toUpperCase();
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');return;}
    if(action==='join'&&!/^[A-Z0-9]{8}$/.test(code)){notify('Introduce un código de sala de 8 caracteres.');return;}
    save('hash3_name',name);
    if(action==='world'){await run(async()=>{uid=await ensurePlayer();const next=await command('world',{name,preference:values.get('preference')});hallHistory=[];closeHallDialog(false);accept(next);});return;}
    if(action==='create'){closeHallDialog(false);roomSetup={name,kind:hallMode==='duel'?'duel':'world',format:'solo',minutes:5,level:'normal'};renderRoomSetup();return;}
    await run(async()=>{uid=await ensurePlayer();const next=await command('join',{name,code,preference:values.get('preference'),rival:code===urlCode.toUpperCase()?urlRival:undefined});closeHallDialog(false);accept(next);});
  });
  document.querySelector('#profile-form')?.addEventListener('submit',e=>{
    e.preventDefault();const name=document.querySelector('#profile-name').value.trim();
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');return;}
    save('hash3_name',name);closeHallDialog(false);renderHome();document.querySelector('[data-action="hall-profile"]')?.focus();notify('Apodo guardado.');
  });
  const dialog=document.querySelector('.hall-dialog');
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeHallDialog();});
  (document.querySelector('#name')||document.querySelector('#profile-name')||dialog.querySelector('[data-action="hall-close"]')).focus();
  updateOfflineStatus();
}
async function openHallRanking() {
  const request=++hallRequest;hallRanking={online:null,loading:!!read('hash3_room')&&navigator.onLine,error:''};
  openHallDialog('ranking','hall-ranking');
  const code=read('hash3_room');if(!code)return;
  if(!navigator.onLine){hallRanking.error='Sin conexión: el ranking de tu sala online estará disponible cuando vuelvas a conectarte.';renderHallDialog();return;}
  try{uid=await ensurePlayer();const next=await command('get',{code});if(hallDialog!=='ranking'||request!==hallRequest)return;hallRanking.online=next;}
  catch{if(hallDialog!=='ranking'||request!==hallRequest)return;hallRanking.error='No se ha podido consultar tu última sala. Puedes volver a entrar con su código.';}
  if(hallDialog==='ranking'&&request===hallRequest){hallRanking.loading=false;renderHallDialog();}
}
function playHallMode() {
  if(hallMode==='solo'){localSetup='solo';renderLocalSetup();}
  else openHallDialog(hallMode==='offline'?'offline':'online');
}
function renderLobby() {
  const finished=room.status==='finished',host=room.host===uid,list=rankedPlayers(humans()),winner=list[0];
  const players=humans().filter(p=>p.active!==false),duel=room.kind==='duel',teams=room.format==='teams';
  const scores={X:0,O:0};room.players.forEach(p=>{if(p.symbol)scores[p.symbol]+=p.score;});
  const teamResult=scores.X===scores.O?'Empate':scores.X>scores.O?(teams?'Gana el equipo X':'Gana X'):(teams?'Gana el equipo O':'Gana O');
  const count=players.length,canStart=duel?(teams?count>=4&&count%2===0:count===2):count>=1;
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL} · PILOTO</span></header><div class="row spread"><h1 class="heading">${finished?'Resultado final':'La sala está abierta'}</h1>${host?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    ${finished?`<div class="finished"><h2 class="heading">${duel?teamResult:escape(winner?.name||'Sin jugadores')} · ${duel?`X ${scores.X} / O ${scores.O}`:winner?.score||0} puntos</h2><p>${duel?'Resultado por suma de puntos de X y O; incluye las sustituciones por máquina.':list.filter(p=>p.score===winner?.score).length>1?'Hay empate en la primera posición.':'Primero en el ranking individual.'}</p></div>`:`<div class="code-panel"><label>Código de la sala</label><div class="code mono">${escape(room.code)}</div><button class="small" data-action="share" style="margin-top:16px">Copiar invitación</button></div>`}
    <div class="row spread"><span>${count} jugador${count!==1?'es':''}</span><span class="muted">${finished?'Puntos / figuras':duel?`${teams?'Equipos X/O':'1 contra 1'} · ${room.durationSeconds/60} min`:'Mundo continuo'}</span></div>
    <p class="instructions">Nivel <strong>${room.level==='advanced'?'Avanzado':'Normal'}</strong> · ${room.level==='advanced'?'Figuras básicas y grupos unidos por los lados.':'Líneas, L, cruces y cuadrados.'} Todas las figuras nuevas suman.</p>
    <ol class="player-list">${(finished?list:players).map((p,i)=>`<li><span>${finished?`${i+1}. `:''}${escape(p.name)}${p.id===uid?' · tú':''}${p.id===room.host?' <span class="host">ANFITRIÓN</span>':''}</span><span class="${p.symbol?.toLowerCase()||'muted'}">${finished?`${p.score} / ${p.figures}`:'Listo'}</span></li>`).join('')}</ol>
    ${!finished?`<p class="instructions">${host?duel?'Al iniciar, se sortean parejas y símbolos y arranca el reloj del duelo.':'Al iniciar se sortean las parejas y los símbolos. Quien no tenga rival juega contra la máquina.': 'El anfitrión iniciará la partida cuando estéis todos.'}</p>${host?`<button class="primary" data-action="start" ${!canStart?'disabled':''} style="width:100%">Iniciar partida</button>${!canStart?`<p class="instructions">${teams?'Necesitamos un número par de al menos 4 jugadores.':'Necesitamos exactamente 2 jugadores para el duelo.'}</p>`:''}`:''}`:''}
    <div class="footer-actions">${finished?'<button class="ghost small" data-action="home">Volver al inicio</button>':'<button class="ghost small danger" data-action="abandon">Abandonar sala</button>'}${!finished&&host&&!room.commonWorld?'<button class="ghost small danger" data-action="finish">Cerrar sala para todos</button>':''}</div></section>`;
  renderFinish();renderLeave();
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
  if(action==='hall-mode'){
    if(!hallModes.some(m=>m.id===b.dataset.mode))return;hallMode=b.dataset.mode;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(action==='hall-play'){playHallMode();return;}
  if(action==='hall-close'){closeHallDialog();return;}
  if(action==='hall-ranking'){await openHallRanking();return;}
  if(action==='hall-menu'||action==='hall-profile'||action==='hall-help'||action==='hall-offline'){
    openHallDialog(action.replace('hall-','')==='menu'?'menu':action.replace('hall-','')==='profile'?'profile':action.replace('hall-','')==='help'?'help':'offline',action);return;
  }
  if(action==='choose-world' ||action==='choose-duel'){roomSetup.kind=action==='choose-world'?'world':'duel';renderRoomSetup();return;}
  if(action==='cancel-room'){roomSetup=null;document.querySelector('.room-dialog')?.remove();openHallDialog('online');return;}
  if(action==='create-room'){const setup={...roomSetup};await run(async()=>{uid=await ensurePlayer();const next=await command('create',setup);roomSetup=null;accept(next);});return;}
  if(action==='abandon'){leaveOpen=true;renderLeave();return;}
  if(action==='cancel-leave'){leaveOpen=false;document.querySelector('.leave-dialog')?.remove();return;}
  if(action==='return-room'){const code=b.dataset.code||room?.code;await run(async()=>{uid=await ensurePlayer();const next=await command('join',{code,name:read('hash3_name')||ownPlayer()?.name||'Jugador'});closeHallDialog(false);accept(next);});return;}
  if(action==='ranking'){rankOpen=!rankOpen;blinkId=null;render();return;}
  if(action==='center'){const p=ownPair();center(p.active.x+1,p.active.y+1);return;}
  if(action==='locate'){const move=immediateAbove(humans(),uid)?.lastMove;if(move)center(move.x,move.y);return;}
  if(action==='plus'||action==='minus'){zoom=Math.max(.45,Math.min(1.8,zoom+(action==='plus'?.15:-.15)));blinkId=null;render();const p=ownPair();center(p.active.x+1,p.active.y+1);return;}
  if(action==='share'||action==='share-pair'){
    await run(async()=>{
      if(action==='share-pair')accept(await command('reserve',{code:room.code}));
      const url=new URL(location.href);url.searchParams.set('sala',room.code);url.searchParams.delete('rival');
      if(action==='share-pair')url.searchParams.set('rival',ownPair().invite);
      try{await navigator.clipboard.writeText(url.href);notify(action==='share-pair'?'Invitación a tu pareja copiada. Envíasela a tu rival.':'Invitación al mundo copiada.');}
      catch{notify('Invitación: '+url.href);}
    });return;
  }
  if(action==='confirm-leave'){
    await run(async()=>{
      if(!isLocal())await command('leave',{code:room.code});
      clearTimeout(machineTimer);room=null;leaveOpen=false;finishOpen=false;selectedExpansion=null;activeKey=null;
      history.replaceState(null,'',location.pathname);render();notify('Has abandonado. Conservas tus puntos y puedes volver desde el inicio.');
    });return;
  }
  if(action==='home'){if(room?.status!=='finished'&&ownPlayer()?.active!==false){leaveOpen=true;renderLeave();return;}clearTimeout(machineTimer);room=null;finishOpen=false;selectedExpansion=null;activeKey=null;history.replaceState(null,'',location.pathname);render();return;}
  if(action==='finish'){finishOpen=true;renderFinish();return;}
  if(action==='cancel-finish'){finishOpen=false;document.querySelector('.dialog-backdrop')?.remove();return;}
  if(action==='confirm-finish'){finishOpen=false;}
  if(action==='select-expansion'){selectedExpansion={x:Number(b.dataset.x),y:Number(b.dataset.y)};render();return;}
  if(action==='setup-solo'||action==='setup-local'){localReturnDialog=hallDialog;hallHistory=[];closeHallDialog(false);localSetup=action==='setup-solo'?'solo':'local';renderLocalSetup();return;}
  if(action==='cancel-local'){localSetup=null;document.querySelector('.local-dialog')?.remove();if(localReturnDialog){openHallDialog(localReturnDialog);localReturnDialog=null;}return;}
  if(action==='start-local'){
    const name=document.querySelector('#local-name').value.trim()||'Tú',second=document.querySelector('#second-name')?.value.trim()||'Jugador 2';
    const level=document.querySelector('#local-level').value;save('hash3_name',name);
    localSetup=null;selectedExpansion=null;accept(createLocal(document.querySelector('.local-dialog [data-mode]').dataset.mode,name,second,Date.now(),level));return;
  }
  if(action==='resume-local'){closeHallDialog(false);try{const next=JSON.parse(read('hash3_local'));if(!['solo','local'].includes(next.mode))throw new Error();accept(next);}catch{notify('No se ha podido recuperar la partida local.');}return;}
  const payload={code:room.code};
  if(action==='move'||action==='expand'){payload.x=Number(b.dataset.x);payload.y=Number(b.dataset.y);}
  if(action==='move')payload.requestId=crypto.randomUUID();
  await run(async()=>{
    const effectiveAction=action==='confirm-finish'?'finish':action==='confirm-expansion'?'expand':action;
    if(effectiveAction==='expand'){if(!selectedExpansion)return;Object.assign(payload,selectedExpansion);}
    const next=isLocal()?localCommand(room,effectiveAction,payload):await command(effectiveAction,payload);
    if(effectiveAction==='expand')selectedExpansion=null;
    if(action==='leave'){room=null;render();return;}
    accept(next);
    if(action==='move'){
      const ev=next.lastEvent;if(!ev.points&&ev.continuation)notify('No quedan celdas vacías: coloca una ampliación para continuar.');
    }
  });
});
document.addEventListener('keydown',e=>{
  const radio=e.target.closest?.('.hall-modes [role="radio"]');
  if(radio&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
    e.preventDefault();const i=hallModes.findIndex(m=>m.id===radio.dataset.mode),step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
    const next=e.key==='Home'?0:e.key==='End'?hallModes.length-1:(i+step+hallModes.length)%hallModes.length;
    hallMode=hallModes[next].id;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(!hallDialog)return;
  if(e.key==='Escape'){e.preventDefault();closeHallDialog();return;}
  if(e.key==='Tab'){
    const nodes=[...document.querySelectorAll('.hall-dialog button:not(:disabled),.hall-dialog input,.hall-dialog select')];
    const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
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
  if(room||localSetup||roomSetup||hallDialog||busy)return;
  uid=session?.user.id||null;
  if(uid){
    try{const next=await command('get',{code});if(!room&&!localSetup&&!roomSetup&&!hallDialog&&!busy)accept(next);}catch{notify('No se ha podido recuperar la sala. Puedes entrar con su código.');}
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
        return {code:room.code,status:room.status,level:room.level||'normal',ranking:rankedPlayers(room.players).map(p=>({name:p.name,symbol:p.symbol,score:p.score,figures:p.figures})),you:ownPlayer()?.name,pair:ownPair(),cells:room.cells.map(({x,y,symbol})=>({x,y,symbol}))};
      }
    },{signal:lifecycle.signal})).catch(()=>{});
  }catch{/* WebMCP is optional; normal play remains available. */}
}

function levelSelector(id,level='normal') {
  return `<label for="${id}">Nivel de figuras</label><select id="${id}"><option value="normal" ${level==='normal'?'selected':''}>Normal · líneas, L, cruces y cuadrados</option><option value="advanced" ${level==='advanced'?'selected':''}>Avanzado · también figuras complejas</option></select><p>Ambos niveles suman todas las figuras nuevas de una jugada. En Avanzado también cuenta el grupo completo de fichas del mismo símbolo unido por los lados, si tiene una forma distinta de las básicas. El nivel es común a toda la sala.</p>`;
}
function renderRoomSetup() {
  document.querySelector('.room-dialog')?.remove();
  const setup=roomSetup;
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop room-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="room-title"><h2 class="heading" id="room-title">Crear sala</h2><div class="room-modes"><button data-action="choose-duel" aria-pressed="${setup.kind==='duel'}"><strong class="heading">Duelo</strong><span>Partida con tiempo</span></button><button data-action="choose-world" aria-pressed="${setup.kind==='world'}"><strong class="heading">Sala libre</strong><span>Partida propia sin reloj final</span></button></div>${setup.kind==='duel'?`<label for="duel-format">Jugadores</label><select id="duel-format"><option value="solo" ${setup.format==='solo'?'selected':''}>1 contra 1</option><option value="teams" ${setup.format==='teams'?'selected':''}>Equipos X contra O</option></select><label for="duel-minutes">Duración</label><select id="duel-minutes">${[3,5,10].map(n=>`<option value="${n}" ${setup.minutes===n?'selected':''}>${n} minutos</option>`).join('')}</select><p>El reloj empieza al iniciar la partida. Al llegar a cero, se cierra el duelo y gana X u O por puntos.</p>`:setup.kind==='world'?'<p>La sala sigue abierta hasta que el anfitrión la cierre. No forma parte del Mundo común. Pueden entrar nuevas parejas mientras jugáis. Si te falta rival, juegas contra la máquina.</p>':'<p>Elige qué tipo de sala quieres abrir.</p>'}${setup.kind?levelSelector('room-level',setup.level):''}<div class="row"><button data-action="cancel-room">Volver</button><button class="primary" data-action="create-room" ${!setup.kind?'disabled':''}>${setup.kind==='duel'?'Crear duelo':setup.kind==='world'?'Crear sala libre':'Crear sala'}</button></div></section></div>`);
  document.querySelector('#room-level')?.addEventListener('change',e=>{roomSetup.level=e.target.value;});
  document.querySelector('#duel-format')?.addEventListener('change',e=>{roomSetup.format=e.target.value;});
  document.querySelector('#duel-minutes')?.addEventListener('change',e=>{roomSetup.minutes=Number(e.target.value);});
}
function renderReturn() {
  const own=ownPlayer();
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL}</span></header><h1 class="heading">${room.status==='lobby'?'La sala te espera':'El mundo sigue'}</h1><p class="instructions">Has abandonado ${escape(room.code)}. Conservas tus ${own.score} puntos y ${own.figures} figuras. Tu antiguo rival puede seguir contra una máquina o contra alguien que haya entrado.</p><button class="primary return-button" data-action="return-room">Volver a la partida</button><p class="instructions">Recuperas tu hueco si sigue libre. Si está ocupado, se te busca otro rival; mientras tanto jugarás contra la máquina.</p><button class="ghost" data-action="home">Ir al inicio</button>${room.host===uid&&!room.commonWorld?'<button class="ghost danger" data-action="finish">Cerrar sala para todos</button>':''}</section>`;
  renderFinish();
}
function renderLeave() {
  document.querySelector('.leave-dialog')?.remove();
  if(!leaveOpen||!room)return;
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop leave-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-title"><h2 class="heading" id="leave-title">¿Abandonar la partida?</h2><p>${isLocal()?'Conservas la partida en este dispositivo para volver desde el inicio.':'Conservas tus puntos. Tu rival sigue contra una máquina y puede emparejarse con otro jugador. La sala continúa y puedes volver cuando quieras.'}</p><div class="row"><button data-action="cancel-leave">Seguir jugando</button><button class="primary" data-action="confirm-leave">Abandonar</button></div></section></div>`);
  document.querySelector('[data-action="cancel-leave"]').focus();
}
function renderFinish() {
  document.querySelector('.finish-dialog')?.remove();
  if(!finishOpen||!room)return;
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop finish-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="finish-title"><h2 class="heading" id="finish-title">¿Finalizar la partida?</h2><p>Se cerrará la partida${isLocal()?'':' para todos los jugadores'} y se mostrará el resultado.</p><div class="row"><button data-action="cancel-finish">Seguir jugando</button><button class="primary" data-action="confirm-finish">Finalizar</button></div></section></div>`);
  document.querySelector('[data-action="cancel-finish"]').focus();
}
function renderLocalSetup() {
  document.querySelector('.local-dialog')?.remove();
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop local-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="local-title" data-mode="${localSetup}"><h2 class="heading" id="local-title">${localSetup==='solo'?'Contra la máquina':'Dos en este dispositivo'}</h2><label for="local-name">${localSetup==='solo'?'Tu apodo':'Jugador X'}</label><input id="local-name" value="${escape(read('hash3_name')||'')}" placeholder="${localSetup==='solo'?'Tú':'Jugador 1'}" maxlength="18">${localSetup==='local'?'<label for="second-name">Jugador O</label><input id="second-name" placeholder="Jugador 2" maxlength="18">':''}${levelSelector('local-level')}<p>${localSetup==='solo'?'Juegas con X. La máquina juega con O.':'Pasad el dispositivo después de cada turno.'} Tenéis 30 segundos para mover.</p><div class="row"><button data-action="cancel-local">Volver</button><button class="primary" data-action="start-local">Empezar</button></div></section></div>`);
  document.querySelector('#local-name').focus();
}
function updateTimer() {
  if(!room||room.status!=='playing')return;
  const p=ownPair(),node=document.querySelector('.turn-timer');
  const duel=document.querySelector('#duel-time');if(duel&&room.endsAt){const left=Math.max(0,Math.ceil((Date.parse(room.endsAt)-Date.now())/1000));duel.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(left===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);}
  if(node&&p?.deadline) {
    const seconds=Math.max(0,Math.ceil((Date.parse(p.deadline)-Date.now())/1000));
    node.textContent=seconds+' s';node.classList.toggle('urgent',seconds<=5);
    if(seconds===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
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
  },room.lastEvent?.points?1500:650);
}
setInterval(()=>{
  updateTimer();
  if(isLocal()&&room.status==='playing'&&!busy&&!document.hidden) {
    const next=localCommand(room,'tick');if(next!==room){accept(next);if(!next.lastEvent?.points)notify(next.lastEvent?.kind==='expand'?'Tiempo agotado: ampliación automática.':'Tiempo agotado: jugada automática en una celda vacía.');}
  }
},500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleMachine();});
function updateOfflineStatus() {
  const n=document.querySelector('#offline-status');if(!n)return;
  n.textContent=navigator.serviceWorker?.controller?'Preparado para jugar sin conexión.':'Los modos locales no necesitan cobertura durante la partida. Abre esta web una primera vez con internet.';
}
startUpdates({
  canReload:()=>!busy&&!hallDialog&&!localSetup&&!roomSetup&&!finishOpen&&!leaveOpen&&(!figureEffect||figureEffect.floatUntil<=performance.now())&&!document.activeElement?.matches('input,textarea'),
  beforeReload:()=>{
    if(isLocal()){save('hash3_local',JSON.stringify(room));try{sessionStorage.setItem('hash3_restore_local','1');}catch{/* The saved game remains available from the start screen. */}}
  },
  onReady:updateOfflineStatus
});

function startFigureEffect(feedback) {
  clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);
  const now=performance.now();
  figureEffect={...feedback,cells:new Set(feedback.cells.map(c=>key(c.x,c.y))),until:now+500,floatUntil:now+1400};
  figureTimer=setTimeout(()=>{
    document.querySelectorAll('.figure-glow').forEach(c=>c.classList.remove('figure-glow'));
  },500);
  scoreFloatTimer=setTimeout(()=>{
    document.querySelectorAll('.score-float').forEach(c=>c.remove());figureEffect=null;
  },1400);
}
function showScore(feedback) {
  const n=document.querySelector('#notice');
  n.innerHTML=`<strong class="score-notice-total ${feedback.symbol.toLowerCase()}">+${feedback.points}</strong><div class="score-notice-detail"><span>${escape(feedback.name)} · ${feedback.symbol}${feedback.automatic?' · jugada por tiempo':''}</span><b>${escape(scoreBreakdown(feedback)||'Figura completada')}</b></div>`;
  n.classList.add('visible','score-notice');clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>n.classList.remove('visible'),4500);
}
