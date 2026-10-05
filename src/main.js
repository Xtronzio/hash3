import './style.css';
import './hall.css';
import './board.css';
import {bindMap} from './map.js';
import {bindGestures} from './gestures.js';
import {maxLabel} from './max.js';
import {loadLocalGames,saveLocalGame,deleteLocalGame,selectExpansion} from './sessions.js';
import {gamesMarkup,worldRankMarkup,voteMarkup,periods} from './session-ui.js';
import './sessions.css';
import './mobile-game.css';
import {inventoryMarkup,usePracticeHint} from './inventory.js';
import {canUsePracticeTool,canErasePracticeCell,practiceTurn} from './practice-tools.js';
import {hallModes,hallModeClass,hallNameField,symbolSelector,machineDifficultySelector,machineLevelHints,hallMarkup,hallDialogMarkup,rulesMarkup} from './hall.js';
import {client, ensurePlayer, command} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions, terrainOf, connectedTerrain, availableCells} from './game.js';

import {createLocal, localCommand, machineChoice, localHumanId, localMachineId} from './local.js';
import {scoreFeedback,scoreBreakdown} from './feedback.js';
import {VERSION_LABEL} from './version.js';
import {startUpdates} from './updates.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
const save = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{/* device storage may be disabled */}};
let pairLobby=null,mapInteracting=false,mapDeferred=false,gameMenuOpen=false,worldMapOpen=false;
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let selectedExpansion=null, finishOpen=false, leaveOpen=false, roomSetup=null, localSetup=null, machineTimer=null,machineWorker=null,machineRequest=0;
let figureEffect=null,figureTimer,scoreFloatTimer;
let hallHistory=[],localReturnDialog=null,pendingDelete=null,inventoryOpen=false,inventorySelection=null;
const madridNow=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let hallMode='world',hallModeSelected=false,hallDialog=null,hallReturnAction='hall-play',hallRanking={period:'all',date:madridNow,hour:Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(new Date())),offset:0},myGames={},gamesRequest=0,rankRequest=0;
let previousTarget = null, blinkId = null, activeKey = null, noticeTimer, connected = true;
const urlCode = new URL(location.href).searchParams.get('sala') || '';
const urlRival = new URL(location.href).searchParams.get('rival') || '';
const pairUrlCode=new URL(location.href).searchParams.get('pareja')||'';
if(urlCode||pairUrlCode)hallDialog='online';
const humans = () => room.players.filter(p=>!p.bot);
const gameRank=()=>rankedPlayers(humans(),!!room.commonWorld);
const above=()=>immediateAbove(humans(),uid,!!room.commonWorld);
const iconPaths={center:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',above:'<path d="m5 19 14-14M5 5h14v14"/>',pause:'<path d="M8 5v14M16 5v14"/>',inventory:'<path d="M5 8h14l1 13H4L5 8ZM9 8V6a3 3 0 0 1 6 0v2"/>',games:'<path d="M3 7V5h7l2 3h9v12H3V7Z"/>',finish:'<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',exit:'<path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/>',map:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h11m0-7v18m0-7h7"/>',chevron:'<path d="m6 9 6 6 6-6"/>'};
const navIcon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[kind]||''}</svg>`;
const iconButton=(action,kind,label,extra='')=>`<button data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${navIcon(kind)}</button>`;
function setRankingOpen(open){rankOpen=open;blinkId=null;render();document.querySelector('.ranking-toggle')?.focus({preventScroll:true});}
bindGestures(app,{setRankingOpen});
const mark = symbol => symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message) {
  const n=document.querySelector('#notice'); n.classList.remove('score-notice');n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function isLocal(){return !!room?.mode;}
function localUid(){const p=room.pairs[0];return room.mode==='solo'?localHumanId(room):p.pending?p.expander:p.turn==='X'?p.x:p.o;}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function accept(next) {
  if(next.not_modified)return;
  if(room?.id===next.id&&next.version<room.version)return;
  const feedback=scoreFeedback(room,next);
  const changed = room?.id!==next.id;
  if(changed){rankOpen=false;zoom=1;inventoryOpen=false;worldMapOpen=false;gameMenuOpen=false;previousTarget=null;activeKey=null;figureEffect=null;clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);}
  if(next.mode)next=persistLocal(next);
  room=next;if(isLocal()){uid=localUid();}else {save('hash3_room',room.code);const me=room.players.find(p=>p.id===uid);if(me)save('hash3_name',me.name);}
  if(inventorySelection&&(!canUsePracticeTool(room,inventorySelection.player,'erase')||inventorySelection.player!==uid))inventorySelection=null;
  const target=above(), targetId=target?.lastMove?.id;
  if(!changed&&targetId&&targetId!==previousTarget)blinkId=targetId;
  else blinkId=null;
  previousTarget=targetId||null;
  const pair=ownPair(),show=feedback&&pair&&[pair.x,pair.o].includes(feedback.player);
  if(show)startFigureEffect(feedback);
  if(mapInteracting)mapDeferred=true;else render();if(show)showScore(feedback);scheduleMachine();
}
function render() {
  const previous=document.querySelector('.viewport');
  const scroll=previous?{left:previous.scrollLeft,top:previous.scrollTop}:null;
  if(pairLobby&&!room){renderPairLobby();return;}
  if(!room){renderHome();return;}
  if(!isLocal()&&ownPlayer()?.active===false&&room.status!=='finished'){renderReturn();return;}
  if(room.status==='lobby'||room.status==='finished'){renderLobby();return;}
  if(room.status==='paused'){renderPaused();return;}
  if(isLocal())uid=localUid();
  const own=ownPlayer(), pair=ownPair(), target=above(), list=gameRank();
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  const ready=!expanding&&pair.turn===own.symbol;
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const compact=list.filter(p=>p.id===uid||p.id===target?.id);
  const targetAvailable=!!(target&&(target.lastMove||room.pairs.find(p=>p.id===target.pair)));
  const jumpButtons=`${iconButton('center','center','Mi territorio')}${iconButton('locate','above','Rival superior',`class="blue" ${targetAvailable?'':'disabled'}`)}`;
  const rankRows=players=>players.map(p=>{const index=list.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':p.id===target?.id?' · superior':''}</span><span class="rank-score mono">${p.score}</span><span class="rank-max">${maxLabel(p)} <small>${p.max?.change>0?'↑':p.max?.change<0?'↓':''}</small></span></li>`;}).join('');
  const title=canExpand?'Amplía tu territorio':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  const tools=isLocal()?practiceTurn(room,uid):null,nextSymbol=tools?.nextSymbol||own.symbol;
  const toolBanner=inventorySelection?'<div class="practice-banner" role="status"><span>Borrar · toca una ficha rival resaltada. Tus fichas están protegidas.</span><button class="small" data-action="cancel-tool-selection">Cancelar</button></div>':tools&&(tools.used.includes('double')||tools.nextSymbol)?`<div class="practice-banner" role="status"><span>${tools.used.includes('double')?`Doble · ${tools.remaining} ficha${tools.remaining===1?'':'s'} por colocar. `:''}${tools.nextSymbol?`Próxima ficha: ${tools.nextSymbol} · puntúa para ${tools.nextSymbol}.`:''}</span></div>`:'';
  const modeLabel=isLocal()?(room.mode==='solo'?'VS MÁQUINA':'SIN CONEXIÓN'):room.commonWorld?'MUNDO':room.kind==='duel'?'DUELO':'SALA LIBRE';
  app.innerHTML=`<section class="game">
    <header class="topbar"><div class="row"><span class="brand heading">#3</span><div><div class="code-mini mono">${modeLabel}</div><span class="muted">${room.level==='advanced'?'Avanzado':'Normal'} · ${escape(own.name)} · ${own.symbol}</span></div></div><button class="game-menu-toggle" data-action="game-menu" aria-label="Opciones de partida">⋯</button></header>
    <div class="workspace"><aside class="ranking ${rankOpen?'is-open':''}" aria-label="${room.commonWorld?'Ranking de Mundo':'Marcador de la partida'}"><button class="ranking-toggle" data-action="ranking" aria-expanded="${rankOpen}" aria-controls="ranking-panel" aria-label="${rankOpen?'Plegar':'Desplegar'} ${room.commonWorld?'ranking de Mundo':'marcador'}"><span class="compact-rank">${compact.map(p=>`<span class="compact-player ${p.id===uid?own.symbol.toLowerCase():'blue'}"><b class="rank-position ${list.indexOf(p)===0?'gold':''}">${list.indexOf(p)+1}</b><span>${p.id===uid?'Tú':escape(p.name)}</span><strong>${p.score.toLocaleString('es-ES')}</strong></span>`).join('')}</span>${navIcon('chevron')}</button><section id="ranking-panel" class="ranking-panel" ${rankOpen?'':'hidden'}><h2 class="heading">${room.commonWorld?'RANKING MUNDO':'MARCADOR'}</h2><div class="rank-columns"><span>#</span><span>JUGADOR</span><span>PUNTOS</span><span>#MAX</span></div><ol class="ranking-list rank-extra">${rankRows(list)}</ol><div class="max-note">${room.commonWorld?'#MAX oficial':'#MAX de referencia'} · ${own.max?.value==null?'se calcula desde tu próxima jugada':own.max.provisional?`${own.max.actions}/100 acciones · provisional`:'últimas 100 acciones'}${own.practiceHints||own.practiceTools?' · Partida con inventario':''}</div><nav class="ranking-navigation" aria-label="Navegación del tablero"><button data-action="center">${navIcon('center')}Mi territorio</button><button class="blue" data-action="locate" ${targetAvailable?'':'disabled'}>${navIcon('above')}Rival superior</button><button data-action="map">${navIcon('map')}Mapa</button></nav></section></aside>
    <div class="arena">${voteMarkup(room.vote,uid)}<div class="turnbar"><div><h1 class="heading">${title}</h1><p>Contra ${escape(opponent.name)}${opponent.bot?' · esperando duelista':''}${room.timeMode==='untimed'?' · sin reloj':''}</p>${room.kind==='duel'&&room.timeMode!=='untimed'?'<p class="duel-clock"><strong>FIN DEL DUELO · <span id="duel-time" class="mono"></span></strong></p>':''}</div><div class="turn-chip ${ready?'ready':expanding?'expanding':''}"><span class="turn-timer mono" aria-label="Tiempo restante"></span>${expanding?'AMPLIACIÓN':ready?'JUEGA '+nextSymbol:'ESPERANDO'}</div></div>
    ${toolBanner}${canExpand?`<div class="expansion-controls"><span>${selectedExpansion?expansionSummary():'Toca para situar el 3×3; puedes solaparlo.'}</span><button class="small primary" data-action="confirm-expansion" ${!selectedExpansion?'disabled':''}>Colocar</button></div>`:''}
    <div class="map-wrap"><div class="viewport" aria-label="Tablero compartido"><div class="board"></div></div><button class="game-minimap" data-action="map" aria-label="Abrir mapa general" title="Mapa general">${navIcon('map')}</button><nav class="map-tools" aria-label="Controles del tablero"><div class="map-zoom"><button data-action="plus" aria-label="Acercar tablero" title="Acercar tablero">+</button><button data-action="minus" aria-label="Alejar tablero" title="Alejar tablero">−</button></div><div class="map-jumps">${jumpButtons}</div></nav><div class="world-map" ${worldMapOpen?'':'hidden'}><div class="map-heading"><span>MAPA GENERAL</span><button data-action="close-map" aria-label="Cerrar mapa">×</button></div><svg role="img" aria-label="Toca una zona para desplazarte"></svg><div class="map-legend"><span class="${own.symbol.toLowerCase()}">● Tú</span><span class="blue">● Rival superior</span><span>□ Vista actual</span></div></div></div>
    <footer class="game-dock"><section class="team-score-bottom" aria-label="Puntuación de los equipos"><div class="score-side x"><span class="score-symbol">X</span><strong>${totals.X.toLocaleString('es-ES')}</strong></div><div class="score-side o"><span class="score-symbol">O</span><strong>${totals.O.toLocaleString('es-ES')}</strong></div></section><nav class="game-bottom" aria-label="Acciones de partida">${!room.commonWorld?iconButton('pause','pause',isLocal()?'Pausar partida':'Solicitar pausa por mayoría'):iconButton('abandon','exit','Salir de Mundo','class="world-exit"')}${isLocal()?iconButton('inventory','inventory','Inventario'):''}${iconButton('go-games','games','Mis partidas')}${isLocal()||room.host===uid&&!room.commonWorld?iconButton('finish','finish','Finalizar partida','class="danger"'):''}</nav></footer></div></div>
    <div class="dialog-backdrop game-menu" ${gameMenuOpen?'':'hidden'}><section class="dialog" role="dialog" aria-modal="true" aria-label="Opciones de partida"><h2 class="heading">Opciones</h2><p class="menu-version">#3 · ${VERSION_LABEL} · ${isLocal()?'Este dispositivo':connected?'Conectado':'Reconectando…'} · ${3-(own.figures%3)} figuras para bonus +3</p>${isLocal()?'':`<p>Sala <strong class="mono">${escape(room.code)}</strong></p><button data-action="copy-room-code">Copiar código</button><button data-action="share">Copiar enlace</button>${opponent.bot&&!room.commonWorld?'<button data-action="share-pair">Invitar a mi rival</button>':''}`}${isLocal()||room.host===uid&&!room.commonWorld?'<button class="danger" data-action="finish">Finalizar sala</button>':''}<button data-action="go-games">Mis partidas</button><button class="danger" data-action="abandon">Abandonar</button><button data-action="close-game-menu">Volver a la partida</button></section></div>
  </section>`;
  drawBoard(canExpand,ready,target);renderFinish();renderLeave();renderInventory();updateTimer();
  const nowKey=key(pair.active.x,pair.active.y);
  if(!scroll||nowKey!==activeKey)requestAnimationFrame(()=>center(pair.active.x+1,pair.active.y+1));
  else {const v=document.querySelector('.viewport');v.scrollLeft=scroll.left;v.scrollTop=scroll.top;}
  activeKey=nowKey;
  bindMap({room,layout,zoom,target,own,changeZoom:changeMapZoom,onClose:()=>{worldMapOpen=false;},interacting:value=>{mapInteracting=value;if(!value&&mapDeferred){mapDeferred=false;setTimeout(()=>render(),0);}}});
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
  const viewport=document.querySelector('.viewport');
  const size=(innerWidth<=760?48:56)*zoom,padding=Math.max(90,viewport.clientWidth/2,viewport.clientHeight/2);Object.assign(layout,{minX,minY,size,padding});
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
    const erasing=inventorySelection?.player===uid,removable=erasing&&active&&ready&&canErasePracticeCell(room,uid,c);
    const glowing=figureEffect&&figureEffect.until>performance.now()&&figureEffect.cells.has(key(x,y));
    const glowStyle=glowing?`--figure-color:${figureEffect.symbol==='X'?'var(--red)':'var(--green)'};--figure-duration:${Math.max(1,figureEffect.until-performance.now())}ms;`:'';
    const hinted=active&&ready&&!c&&room.practiceHint?.player===uid&&room.practiceHint.x===x&&room.practiceHint.y===y;
    const label=removable?`Borrar ${c.symbol} de ${owner}, celda ${x}, ${y}`:select?`Situar ampliación en ${x}, ${y}`:c?`${c.symbol} de ${owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}`:`Celda vacía ${x}, ${y}${active?', tu territorio':''}`;
    return `<button class="cell terrain-cell ${glowing?'figure-glow':''} ${active?'connected':''} ${active&&ready&&!c&&!erasing?'available':''} ${removable?'removable':''} ${hinted?'hint-point':''} ${select?'placement-anchor':''} ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" style="${style(pos)};${glowStyle}" data-action="${removable?'inventory-erase':select?'select-expansion':active&&ready&&!c&&!erasing?'move':'invalid-cell'}" data-x="${x}" data-y="${y}" ${erasing&&!removable||!select&&!ready?'disabled':''} aria-disabled="${!removable&&!select&&(!active||!ready||!!c||erasing)}" aria-label="${escape(label+(hinted?', sugerencia de ayuda':''))}">${c?mark(c.symbol):''}</button>`;
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
function changeMapZoom(value,inGesture=false){
 const viewport=document.querySelector('.viewport');if(!viewport)return;
 const x=(viewport.scrollLeft+viewport.clientWidth/2-layout.padding)/layout.size+layout.minX-.5;
 const y=(viewport.scrollTop+viewport.clientHeight/2-layout.padding)/layout.size+layout.minY-.5;
 zoom=Math.max(.3,Math.min(2.2,value));
 if(inGesture){const p=ownPair(),o=ownPlayer(),ready=!p.pending&&p.turn===o.symbol;drawBoard(p.pending&&p.expander===uid,ready,above());center(x,y);const n=document.querySelector('.zoom-label');if(n)n.textContent='ZOOM · '+Math.round(zoom*100)+'%';}
 else{render();center(x,y);}
}
function savedLocal(){return localGames()[0]||null;}
function renderHome() {
  app.innerHTML=hallMarkup({name:read('hash3_name')||'',mode:hallMode,modeSelected:hallModeSelected,lastCode:read('hash3_room')||'',hasLocal:!!savedLocal()});
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
function rankingRows(players,byMax=false) {
  return `<ol class="hall-ranking-list">${rankedPlayers(players.filter(p=>!p.bot),byMax).map((p,i)=>`<li><span class="rank-position ${['gold','silver','bronze'][i]||''}">${i+1}</span><span>${escape(p.name)}<small>${p.figures} figuras · ${p.symbol||'—'}</small></span><strong class="mono">${byMax?maxLabel(p)+' #MAX':p.score}</strong></li>`).join('')}</ol>`;
}
function renderHallDialog() {
  document.querySelector('.hall-dialog')?.remove();
  const local=savedLocal();let markup;
  if(hallDialog==='help')markup=hallDialogFrame('Cómo se juega',rulesMarkup);
  else if(hallDialog==='inventory')markup=hallDialogFrame('Inventario',inventoryMarkup(null,null));
  else if(hallDialog==='ranking'){markup=hallDialogFrame('Ranking de Mundo',worldRankMarkup(hallRanking,uid));
  }else if(hallDialog==='games'){markup=hallDialogFrame('Mis partidas',gamesMarkup({...myGames,local:localGames()}));
  }else markup=hallDialogMarkup(hallDialog,{name:read('hash3_name')||'',mode:hallMode,code:urlCode,friendInvite:!!urlRival,local});
  app.insertAdjacentHTML('beforeend',markup);
  document.querySelector('#rank-date')?.addEventListener('change',async e=>{hallRanking.date=e.target.value||madridNow;hallRanking.offset=0;await refreshWorldRank();});
  document.querySelector('#rank-hour')?.addEventListener('change',async e=>{hallRanking.hour=Number(e.target.value);hallRanking.offset=0;await refreshWorldRank();});
  const form=document.querySelector('#entry-form');
  form?.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const values=new FormData(e.currentTarget),action=e.submitter?.value||'create';
    const name=String(values.get('name')||'').trim(),code=String(values.get('code')||'').trim().toUpperCase();
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');return;}
    if(action==='join'&&!/^[A-Z0-9]{8}$/.test(code)){notify('Introduce un código de sala de 8 caracteres.');return;}
    save('hash3_name',name);
    if(action==='world'&&values.get('preference')!=='auto'){const intent=values.get('preference')==='pair'?'pair_join':'pair_create',pairCode=String(values.get('pairCode')||'').trim().toUpperCase();if(intent==='pair_join'&&!/^[A-Z0-9]{8}$/.test(pairCode)){notify('Introduce el código de pareja.');return;}await run(async()=>{uid=await ensurePlayer();acceptPair(await command(intent,{name,code:pairCode}));});return;}
    if(action==='world'){await run(async()=>{uid=await ensurePlayer();const next=await command('world',{name,preference:values.get('preference')});hallHistory=[];closeHallDialog(false);accept(next);});return;}
    if(action==='create'){closeHallDialog(false);roomSetup={name,kind:'duel',format:'solo',minutes:5,level:'normal',timeMode:'timed',symbol:read('hash3_symbol')==='O'?'O':'X'};renderRoomSetup();return;}
    await run(async()=>{uid=await ensurePlayer();const next=await command('join',{name,code,preference:values.get('preference'),rival:code===urlCode.toUpperCase()?urlRival:undefined});closeHallDialog(false);accept(next);});
  });
  const preference=document.querySelector('#preference'),pairField=document.querySelector('#pair-code-field');
  if(pairField){const refreshPairField=()=>{pairField.hidden=preference.value!=='pair';const button=document.querySelector('#entry-form button[value="world"]');button.textContent=preference.value==='new'?'Crear pareja':preference.value==='pair'?'Unirme a la pareja':'Entrar en Mundo';};preference.addEventListener('change',refreshPairField);if(pairUrlCode){preference.value='pair';document.querySelector('#pair-code').value=pairUrlCode;}refreshPairField();}
  document.querySelector('#profile-form')?.addEventListener('submit',e=>{
    e.preventDefault();const name=document.querySelector('#profile-name').value.trim();
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');return;}
    save('hash3_name',name);closeHallDialog(false);renderHome();document.querySelector('[data-action="hall-profile"]')?.focus();notify('Apodo guardado.');
  });
  const dialog=document.querySelector('.hall-dialog');
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeHallDialog();});
  (document.querySelector('#name:not([type="hidden"])')||document.querySelector('#profile-name')||form?.querySelector('select,input:not([type="hidden"])')||dialog.querySelector('[data-action="hall-close"]')).focus();
  updateOfflineStatus();renderDeleteGame();
}
function localGames(){try{return loadLocalGames(localStorage);}catch{return [];}}
function persistLocal(next){
 try{return saveLocalGame(localStorage,next);}catch{notify('No se ha podido guardar la partida: revisa el espacio disponible de este navegador.');throw new Error('La partida sigue abierta para que puedas recuperarla.');}
}
function clearGameView(){stopMachine();room=null;inventoryOpen=false;inventorySelection=null;gameMenuOpen=false;worldMapOpen=false;finishOpen=false;leaveOpen=false;selectedExpansion=null;activeKey=null;mapInteracting=false;mapDeferred=false;history.replaceState(null,'',location.pathname);}
function goToHall(){
 if(room?.status!=='paused')throw new Error('Pausa la partida antes de volver al hall.');
 if(isLocal())persistLocal(room);
 clearGameView();hallDialog=null;hallHistory=[];renderHome();
}
async function goToGames(){
 if(isLocal()&&room.status==='playing')accept(localCommand(room,'pause'));
 const timed=room&&!isLocal()&&room.status==='playing'&&room.timeMode!=='untimed';
 clearGameView();hallDialog=null;hallHistory=[];renderHome();await openMyGames();
 if(timed)notify('La sala sigue jugando. En Mundo no hay pausa; en Duelo puedes solicitarla por votación.');
}
async function openMyGames(){
 const request=++gamesRequest;myGames={online:[],loading:navigator.onLine,error:''};
 openHallDialog('games','hall-games');
 if(!navigator.onLine){myGames.error='Sin conexión: puedes abrir tus partidas locales. Las salas online se mostrarán al reconectar.';renderHallDialog();return;}
 try{uid=await ensurePlayer();const next=await command('my_games');if(hallDialog!=='games'||request!==gamesRequest)return;myGames.online=next.games;}
 catch(error){if(hallDialog!=='games'||request!==gamesRequest)return;myGames.error=error.message||'No se han podido consultar tus salas.';}
 if(hallDialog==='games'&&request===gamesRequest){myGames.loading=false;renderHallDialog();}
}
async function refreshWorldRank(){
 const request=++rankRequest;hallRanking.loading=true;hallRanking.error='';if(hallDialog==='ranking')renderHallDialog();
 if(!navigator.onLine){hallRanking.loading=false;hallRanking.error='El Ranking de Mundo necesita conexión.';if(hallDialog==='ranking')renderHallDialog();return;}
 try{uid=await ensurePlayer();const next=await command('world_rank',{period:hallRanking.period,date:hallRanking.date,hour:Number(hallRanking.hour),offset:hallRanking.offset});if(request!==rankRequest)return;hallRanking.data=next;}
 catch(error){if(request!==rankRequest)return;hallRanking.error=error.message||'No se ha podido consultar el ranking.';}
 if(request===rankRequest){hallRanking.loading=false;if(hallDialog==='ranking')renderHallDialog();}
}
async function openHallRanking(){openHallDialog('ranking','hall-ranking');await refreshWorldRank();}
function renderPaused(){
 inventorySelection=null;
 const own=ownPlayer(),totals={X:0,O:0};room.players.forEach(p=>{if(p.symbol)totals[p.symbol]+=p.score;});
 const mode=isLocal()?(room.mode==='solo'?'VS máquina':'Sin conexión'):room.kind==='duel'?'Duelo':'Sala libre';
 const timer=room.pauseDuelMs==null?'':`${Math.floor(room.pauseDuelMs/60000)}:${String(Math.floor(room.pauseDuelMs/1000)%60).padStart(2,'0')} de duelo conservados`;
 app.innerHTML=`<section class="lobby paused-game"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL} · ${mode}</span></header><h1 class="heading">Partida pausada</h1><p class="instructions">Tablero, puntos y turno guardados. ${isLocal()?'Ni tú ni la máquina jugáis durante la pausa.':`Pausa compartida aprobada por mayoría. ${escape(timer)}`}</p><section class="paused-scores"><strong class="x">X ${totals.X}</strong><strong class="o">O ${totals.O}</strong></section><p class="muted">${escape(own.name)} · ${own.score} puntos · ${room.timeMode==='untimed'?'Sin reloj':'Con reloj'}</p>${voteMarkup(room.vote,uid)}<div class="paused-actions"><button class="primary" data-action="resume">${isLocal()?'Retomar partida':'Solicitar reanudación'}</button><button data-action="go-hall">Volver al hall</button><button data-action="go-games">Mis partidas</button>${isLocal()||room.host===uid?'<button class="ghost danger" data-action="finish">Finalizar partida</button>':''}</div></section>`;
 renderFinish();renderLeave();renderInventory();
}
function suspendLocal(){
 if(!isLocal()||room.status!=='playing'||busy)return;
 try{clearTimeout(machineTimer);accept(localCommand(room,'pause'));}catch{}
}
function timeModeSelector(id,value='timed'){
 return `<label for="${id}">Ritmo de la partida</label><select id="${id}"><option value="timed" ${value==='timed'?'selected':''}>Con reloj · 30 segundos por turno</option><option value="untimed" ${value==='untimed'?'selected':''}>Por turnos · sin reloj</option></select>`;
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
    ${finished?`<div class="finished"><h2 class="heading">${duel?teamResult:escape(winner?.name||'Sin jugadores')} · ${duel?`X ${scores.X} / O ${scores.O}`:winner?.score||0} puntos</h2><p>${duel?'Resultado por suma de puntos de X y O; incluye las sustituciones por máquina.':list.filter(p=>p.score===winner?.score).length>1?'Hay empate en la primera posición.':'Primero en el ranking individual.'}</p></div>`:`<div class="code-panel"><label>Código de la sala</label><div class="code mono">${escape(room.code)}</div><div class="row" style="margin-top:16px"><button class="small" data-action="copy-room-code">Copiar código</button><button class="small" data-action="share">Copiar enlace</button></div></div>`}
    <div class="row spread"><span>${count} jugador${count!==1?'es':''}</span><span class="muted">${finished?'Puntos / figuras':duel?`${teams?'Equipos X/O':'1 contra 1'} · ${room.timeMode==='untimed'?'Sin reloj':room.durationSeconds/60+' min'}`:'Mundo continuo'}</span></div>
    ${!finished&&duel&&host?symbolSelector(room.hostSymbol||'X','lobby-symbol'):''}${!finished&&duel?`<p class="instructions">${room.hostSymbol?`El creador juega con <strong class="${room.hostSymbol.toLowerCase()}">${room.hostSymbol}</strong>. ${teams?'Los demás equipos y parejas se sortean.':`Su rival juega con <strong class="${room.hostSymbol==='X'?'o':'x'}">${room.hostSymbol==='X'?'O':'X'}</strong>.`}`:'El creador puede elegir X u O antes de empezar.'} X siempre empieza.</p>`:''}
    <p class="instructions">Nivel <strong>${room.level==='advanced'?'Avanzado':'Normal'}</strong> · ${room.level==='advanced'?'Figuras básicas y grupos unidos por los lados.':'Líneas, L, cruces y cuadrados.'} Todas las figuras nuevas suman.</p>
    <ol class="player-list">${(finished?list:players).map((p,i)=>`<li><span>${finished?`${i+1}. `:''}${escape(p.name)}${p.id===uid?' · tú':''}${p.id===room.host?' <span class="host">ANFITRIÓN</span>':''}</span><span class="${p.symbol?.toLowerCase()||'muted'}">${finished?`${p.score} / ${p.figures}`:duel&&room.hostSymbol&&(p.id===room.host||!teams)?(p.id===room.host?room.hostSymbol:room.hostSymbol==='X'?'O':'X'):'Listo'}</span></li>`).join('')}</ol>
    ${!finished?`<p class="instructions">${host?duel?room.timeMode==='untimed'?'Al iniciar se forman las parejas, respetando el símbolo del creador. Cada uno mueve cuando pueda.':'Al iniciar se forman las parejas, respetando el símbolo del creador, y arranca el reloj del duelo.':'Al iniciar se sortean las parejas y los símbolos. Quien no tenga rival juega contra la máquina.': 'El anfitrión iniciará la partida cuando estéis todos.'}</p>${host?`<button class="primary" data-action="start" ${!canStart?'disabled':''} style="width:100%">Iniciar partida</button>${!canStart?`<p class="instructions">${teams?'Necesitamos un número par de al menos 4 jugadores.':'Necesitamos exactamente 2 jugadores para el duelo.'}</p>`:''}`:''}`:''}
    <div class="footer-actions">${finished?'<button class="ghost small" data-action="home">Volver al inicio</button><button class="ghost small" data-action="go-games">Mis partidas</button>':'<button class="ghost small" data-action="go-games">Mis partidas</button><button class="ghost small danger" data-action="abandon">Abandonar sala</button>'}${!finished&&host&&!room.commonWorld?'<button class="ghost small danger" data-action="finish">Cerrar sala para todos</button>':''}</div></section>`;
  document.querySelectorAll('[name="lobby-symbol"]').forEach(input=>input.addEventListener('change',async()=>{if(busy)return;save('hash3_symbol',input.value);await run(async()=>accept(await command('choose_symbol',{code:room.code,symbol:input.value})));}));
  renderFinish();renderLeave();renderInventory();
}
async function run(operation) {
  if(busy)return;busy=true;
  const buttons=[...app.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);
  try{await operation();connected=true;}catch(error){notify(error.message||'No se ha podido conectar. Inténtalo de nuevo.');}
  finally{busy=false;if(room)render();else buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}
}
app.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  let action=b.dataset.action;
  if(action==='invalid-cell'){if(!busy&&room?.status==='playing'&&ownPair()?.turn===ownPlayer()?.symbol&&!ownPair()?.pending){b.classList.remove('invalid-flash');void b.offsetWidth;b.classList.add('invalid-flash');setTimeout(()=>b.classList.remove('invalid-flash'),360);}return;}
  if(action==='delete-game'){
    const local=b.dataset.local==='true',game=local?localGames().find(g=>g.id===b.dataset.id):myGames.online?.find(g=>g.id===b.dataset.id);
    if(!game)return;pendingDelete={...game,local};renderDeleteGame();return;
  }
  if(action==='cancel-delete'){pendingDelete=null;document.querySelector('.delete-dialog')?.remove();return;}
  if(action==='confirm-delete'){
    const target=pendingDelete;if(!target)return;
    await run(async()=>{
      if(target.local)deleteLocalGame(localStorage,target.id);
      else {uid=await ensurePlayer();await command('remove_game',{code:target.code});myGames.online=myGames.online?.filter(g=>g.id!==target.id)||[];}
      pendingDelete=null;document.querySelector('.delete-dialog')?.remove();renderHallDialog();
    });return;
  }
  if(action==='hall-inventory'){openHallDialog('inventory','hall-inventory');return;}
  if(action==='inventory'){inventoryOpen=true;renderInventory();return;}
  if(action==='close-inventory'){inventoryOpen=false;document.querySelector('.inventory-dialog')?.remove();return;}
  if(action==='practice-hint'){
    await run(async()=>{const next=usePracticeHint(room,uid);inventoryOpen=false;accept(next);center(next.practiceHint.x,next.practiceHint.y);});return;
  }
  if(action==='practice-tool'){
    const tool=b.dataset.tool;
    if(!canUsePracticeTool(room,uid,tool)){notify('Herramienta no disponible en este turno.');return;}
    if(tool==='erase'){inventorySelection={player:uid};inventoryOpen=false;render();return;}
    await run(async()=>{const next=localCommand(room,'inventory',{tool,playerId:uid});inventoryOpen=false;accept(next);});return;
  }
  if(action==='cancel-tool-selection'){inventorySelection=null;render();return;}
  if(action==='inventory-erase'){
    await run(async()=>{
      if(inventorySelection?.player!==uid)throw new Error('Vuelve a elegir Borrar en el inventario.');
      const next=localCommand(room,'inventory',{tool:'erase',playerId:uid,x:Number(b.dataset.x),y:Number(b.dataset.y)});
      inventorySelection=null;accept(next);notify('Ficha borrada. Los puntos se conservan y puedes jugar.');
    });return;
  }
  if(action==='hall-games'){await openMyGames();return;}
  if(action==='go-games'){await goToGames();return;}
  if(action==='go-hall'){await run(async()=>goToHall());return;}
  if(action==='rank-period'){hallRanking.period=b.dataset.period;hallRanking.offset=0;await refreshWorldRank();return;}
  if(action==='rank-page'){hallRanking.offset=Number(b.dataset.offset);await refreshWorldRank();return;}
  if(action==='refresh-rank'){await refreshWorldRank();return;}
  if(action==='load-game'){
    await run(async()=>{let next;if(b.dataset.local==='true'){next=localGames().find(g=>g.id===b.dataset.id);if(!next)throw new Error('Esta partida no está disponible.');}
    else{uid=await ensurePlayer();next=await command('get',{code:b.dataset.code});const me=next.players.find(p=>p.id===uid);if(me?.active===false&&next.status!=='finished')next=await command('join',{code:b.dataset.code,name:me.name});}
    hallHistory=[];hallDialog=null;selectedExpansion=null;accept(next);});return;
  }
  if(action==='pause'||action==='resume'||action==='vote-yes'||action==='vote-no'){
    await run(async()=>{const vote=action.startsWith('vote-');gameMenuOpen=false;const next=isLocal()?localCommand(room,action):await command(vote?'vote':action,{code:room.code,voteId:room.vote?.id,yes:action==='vote-yes'});accept(next);});return;
  }
  if(action==='game-menu'||action==='close-game-menu'){gameMenuOpen=action==='game-menu';document.querySelector('.game-menu').hidden=!gameMenuOpen;return;}
  if(action==='map'||action==='close-map'){worldMapOpen=action==='map';if(worldMapOpen&&rankOpen){rankOpen=false;render();}document.querySelector('.world-map').hidden=!worldMapOpen;return;}
  if(action==='pair-start'){await run(async()=>{acceptPair(await command('pair_start',{code:pairLobby.code}));});return;}
  if(action==='pair-leave'){await run(async()=>{await command('pair_leave',{code:pairLobby.code});pairLobby=null;save('hash3_pair',null);renderHome();});return;}
  if(action==='pair-copy-code'){await copyGameCode(pairLobby.code,'Código de pareja');return;}
  if(action==='copy-room-code'){await copyGameCode(room.code,'Código de sala');return;}
  if(action==='pair-share'){const url=new URL(location.href);url.search='';url.searchParams.set('pareja',pairLobby.code);try{await navigator.clipboard.writeText(url.href);notify('Invitación de pareja copiada.');}catch{notify('Código de pareja: '+pairLobby.code);}return;}

  if(action==='hall-mode'){
    if(!hallModes.some(m=>m.id===b.dataset.mode))return;hallMode=b.dataset.mode;hallModeSelected=true;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(action==='hall-play'){playHallMode();return;}
  if(action==='hall-close'){if(!pendingDelete)closeHallDialog();return;}
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
  if(action==='ranking'){setRankingOpen(!rankOpen);return;}
  if(action==='center'){rankOpen=false;zoom=1;render();const p=ownPair();center(p.active.x+1,p.active.y+1);return;}
  if(action==='locate'){const target=above(),move=target?.lastMove||room.pairs.find(p=>p.id===target?.pair)?.active;if(move){rankOpen=false;zoom=1;render();center(move.x,move.y);}return;}
  if(action==='plus'||action==='minus'||action==='zoom-level'){changeMapZoom(action==='zoom-level'?(zoom<.75?1:zoom<1.3?1.6:.55):zoom*(action==='plus'?1.25:.8));return;}
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
      if(!isLocal())await command('leave',{code:room.code});else accept(localCommand(room,'pause'));
      clearTimeout(machineTimer);room=null;leaveOpen=false;finishOpen=false;selectedExpansion=null;activeKey=null;
      inventoryOpen=false;history.replaceState(null,'',location.pathname);render();notify('Has salido. Conservas tus puntos y puedes volver desde Mis partidas.');
    });return;
  }
  if(action==='home'){if(room?.status!=='finished'&&ownPlayer()?.active!==false){leaveOpen=true;renderLeave();return;}clearTimeout(machineTimer);room=null;finishOpen=false;selectedExpansion=null;activeKey=null;history.replaceState(null,'',location.pathname);render();return;}
  if(action==='finish'){gameMenuOpen=false;document.querySelector('.game-menu')?.setAttribute('hidden','');finishOpen=true;renderFinish();return;}
  if(action==='cancel-finish'){finishOpen=false;document.querySelector('.finish-dialog')?.remove();return;}
  if(action==='confirm-finish'){finishOpen=false;}
  if(action==='select-expansion'){const choice=selectExpansion(selectedExpansion,{x:Number(b.dataset.x),y:Number(b.dataset.y)});selectedExpansion=choice.selected;if(choice.confirm)action='confirm-expansion';else{render();return;}}
  if(action==='setup-solo'||action==='setup-local'){localReturnDialog=hallDialog;hallHistory=[];closeHallDialog(false);localSetup=action==='setup-solo'?'solo':'local';renderLocalSetup();return;}
  if(action==='cancel-local'){localSetup=null;document.querySelector('.local-dialog')?.remove();if(localReturnDialog){openHallDialog(localReturnDialog);localReturnDialog=null;}return;}
  if(action==='start-local'){
    const name=document.querySelector('#local-name').value.trim(),second=document.querySelector('#second-name')?.value.trim()||'Jugador 2';
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');document.querySelector('#local-name').focus();return;}
    const level=document.querySelector('#local-level').value,timeMode='timed',difficulty=document.querySelector('[name="machine-difficulty"]:checked')?.value||'medium',playerSymbol=document.querySelector('[name="local-symbol"]:checked').value;save('hash3_name',name);save('hash3_symbol',playerSymbol);
    if(localSetup==='solo')save('hash3_difficulty',difficulty);
    localSetup=null;selectedExpansion=null;accept(createLocal(document.querySelector('.local-dialog [data-mode]').dataset.mode,name,second,Date.now(),level,timeMode,difficulty,playerSymbol));return;
  }
  if(action==='resume-local'){closeHallDialog(false);try{const next=savedLocal();if(!['solo','local'].includes(next.mode))throw new Error();accept(next);}catch{notify('No se ha podido recuperar la partida local.');}return;}
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
    hallMode=hallModes[next].id;hallModeSelected=true;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(pendingDelete||inventoryOpen){
    if(e.key==='Escape'){e.preventDefault();if(pendingDelete){pendingDelete=null;document.querySelector('.delete-dialog')?.remove();}else{inventoryOpen=false;document.querySelector('.inventory-dialog')?.remove();}return;}
    if(e.key==='Tab'){const selector=pendingDelete?'.delete-dialog':'.inventory-dialog',nodes=[...document.querySelectorAll(selector+' button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(e.key==='Escape'&&rankOpen){e.preventDefault();setRankingOpen(false);return;}
  if(!hallDialog)return;
  if(e.key==='Escape'){e.preventDefault();closeHallDialog();return;}
  if(e.key==='Tab'){
    const nodes=[...document.querySelectorAll('.hall-dialog button:not(:disabled),.hall-dialog input,.hall-dialog select')];
    const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
});
async function poll() {
  if(pairLobby&&!busy&&!polling&&!document.hidden){polling=true;const code=pairLobby.code;try{const next=await command('pair_get',{code});if(pairLobby?.code===code)acceptPair(next);}catch(error){notify(error.message);}finally{polling=false;}return;}
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
  renderHome();
  const pendingPair=read('hash3_pair');if(pendingPair&&navigator.onLine){try{uid=await ensurePlayer();acceptPair(await command('pair_get',{code:pendingPair}));return;}catch{save('hash3_pair',null);}}
  try{
    if(sessionStorage.getItem('hash3_restore_local')==='1'){
      sessionStorage.removeItem('hash3_restore_local');
      const saved=JSON.parse(read('hash3_local'));
      if(saved&&localGames().some(g=>g.id===saved.id)){accept(saved);return;}
    }
  }catch{/* Continue at the start screen if storage is unavailable. */}
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
function renderRoomSetup(){
 document.querySelector('.room-dialog')?.remove();const setup=roomSetup;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop room-dialog"><section class="dialog game-mode-dialog ${hallModeClass(setup.kind)}" role="dialog" aria-modal="true" aria-labelledby="room-title"><h2 class="heading" id="room-title">Crear duelo</h2>${symbolSelector(setup.symbol,'duel-symbol')}<p>El creador elige su símbolo. X siempre empieza; en 1 contra 1 tu rival recibe el contrario.</p><label for="duel-format">Jugadores</label><select id="duel-format"><option value="solo" ${setup.format==='solo'?'selected':''}>1 contra 1</option><option value="teams" ${setup.format==='teams'?'selected':''}>Equipos X contra O</option></select>${timeModeSelector('room-time-mode',setup.timeMode)}${setup.timeMode==='timed'?`<label for="duel-minutes">Duración total</label><select id="duel-minutes">${[3,5,10].map(n=>`<option value="${n}" ${setup.minutes===n?'selected':''}>${n} minutos</option>`).join('')}</select><p>30 segundos por turno. El reloj total empieza al iniciar y, al terminar, gana X u O por puntos.</p>`:'<p>Sin límite por turno ni duración total. Cada jugada se guarda y queda esperando al rival. Podéis mover en momentos distintos y finalizar cuando decidáis.</p>'}${levelSelector('room-level',setup.level)}<p>Las pausas y reanudaciones se deciden por mayoría absoluta de los humanos activos.</p><div class="row"><button data-action="cancel-room">Volver</button><button class="primary" data-action="create-room">Crear duelo</button></div></section></div>`);
 document.querySelectorAll('[name="duel-symbol"]').forEach(input=>input.addEventListener('change',()=>{roomSetup.symbol=input.value;save('hash3_symbol',input.value);}));
 document.querySelector('#room-level').addEventListener('change',e=>{roomSetup.level=e.target.value;});
 document.querySelector('#duel-format').addEventListener('change',e=>{roomSetup.format=e.target.value;});
 document.querySelector('#duel-minutes')?.addEventListener('change',e=>{roomSetup.minutes=Number(e.target.value);});
 document.querySelector('#room-time-mode').addEventListener('change',e=>{roomSetup.timeMode=e.target.value;renderRoomSetup();});
}
function acceptPair(next){
 if(!next.pairLobby){pairLobby=null;hallDialog=null;hallHistory=[];save('hash3_pair',null);accept(next);return;}
 if(['left','cancelled'].includes(next.status)){pairLobby=null;save('hash3_pair',null);renderHome();if(next.status==='cancelled')notify('La antesala se ha cerrado o ha caducado.');return;}
 pairLobby=next;hallDialog=null;hallHistory=[];room=null;save('hash3_pair',next.code);renderPairLobby();
}
async function copyGameCode(code,label){
 try{await navigator.clipboard.writeText(code);notify(label+' copiado.');}
 catch{
  const field=document.createElement('textarea');field.value=code;field.readOnly=true;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();
  try{notify(document.execCommand('copy')?label+' copiado.':label+': '+code);}catch{notify(label+': '+code);}finally{field.remove();}
 }
}
function renderPairLobby(){
 const l=pairLobby,host=l.host===uid;
 app.innerHTML=`<section class="pair-wait"><header><span class="brand heading">#3</span><span class="tag">MUNDO · EN PAREJA</span></header><h1 class="heading">${l.ready?'Pareja preparada':'Esperando duelista'}</h1><p class="instructions">Reuníos aquí antes de entrar en el Mundo común. El turno empieza cuando entréis juntos.</p><div class="pair-code mono">${escape(l.code)}</div><div class="pair-share-actions"><button data-action="pair-copy-code">Copiar código</button><button data-action="pair-share">Copiar enlace</button></div><div class="pair-person"><strong>${escape(l.hostName)}</strong><small>${host?'Tú · preparas la pareja':'Creador de la pareja'}</small></div><div class="pair-person"><strong>${escape(l.guestName||'Esperando duelista…')}</strong><small>${l.guestName?l.ready?'En la antesala':'Esperando conexión':''}</small></div><p class="pair-status" role="status">${l.ready?(host?'Ya estáis los dos. Podéis entrar juntos.':'Tu compañero puede pulsar Entrar al Mundo.'):'Comparte el código o la invitación con tu duelista.'}</p><button class="primary" data-action="pair-start" ${host&&l.ready?'':'disabled'}>Entrar al Mundo</button><button class="ghost pair-back" data-action="pair-leave">${host?'Cancelar pareja':'Salir de la antesala'}</button></section>`;
}
function renderReturn() {
  const own=ownPlayer();
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL}</span></header><h1 class="heading">${room.status==='lobby'?'La sala te espera':'El mundo sigue'}</h1><p class="instructions">Has abandonado ${escape(room.code)}. Conservas tus ${own.score} puntos y ${own.figures} figuras. Tu antiguo rival puede seguir contra una máquina o contra alguien que haya entrado.</p><button class="primary return-button" data-action="return-room">Volver a la partida</button><p class="instructions">Recuperas tu hueco si sigue libre. Si está ocupado, se te busca otro rival; mientras tanto jugarás contra la máquina.</p><button class="ghost" data-action="go-games">Mis partidas</button>${room.host===uid&&!room.commonWorld?'<button class="ghost danger" data-action="finish">Cerrar sala para todos</button>':''}</section>`;
  renderFinish();
}
function renderLeave() {
  document.querySelector('.leave-dialog')?.remove();
  if(!leaveOpen||!room)return;
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop leave-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-title"><h2 class="heading" id="leave-title">${room.commonWorld?'¿Salir de Mundo?':'¿Abandonar la partida?'}</h2><p>${isLocal()?'La partida queda pausada en este dispositivo. Puedes retomarla desde Mis partidas.':'Conservas tus puntos. Tu rival sigue contra una máquina y puede emparejarse con otro jugador. La sala continúa y puedes volver cuando quieras.'}</p><div class="row"><button data-action="cancel-leave">Seguir jugando</button><button class="primary" data-action="confirm-leave">${room.commonWorld?'Salir de Mundo':'Abandonar'}</button></div></section></div>`);
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
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop local-dialog"><section class="dialog game-mode-dialog ${hallModeClass(hallMode==='offline'?'offline':'solo')}" role="dialog" aria-modal="true" aria-labelledby="local-title" data-mode="${localSetup}"><h2 class="heading" id="local-title">${localSetup==='solo'?'Contra la máquina':'Dos en este dispositivo'}</h2>${hallNameField(read('hash3_name'),{id:'local-name',label:localSetup==='solo'?'Tu apodo':'Tu nombre',placeholder:localSetup==='solo'?'Tú':'Jugador 1'})}${localSetup==='solo'?machineDifficultySelector(read('hash3_difficulty')):''}${localSetup==='local'?'<label for="second-name">Otro jugador</label><input id="second-name" placeholder="Jugador 2" maxlength="18">':''}${symbolSelector(read('hash3_symbol'),'local-symbol')}${levelSelector('local-level')}<p>X siempre empieza. ${localSetup==='solo'?'La máquina juega con el símbolo contrario al tuyo.':'El otro jugador usa el símbolo contrario. Pasad el dispositivo después de cada turno.'} Tenéis 30 segundos por turno. Puedes pausar, volver al hall y retomar con el tiempo restante.</p><div class="row"><button data-action="cancel-local">Volver</button><button class="primary" data-action="start-local">Empezar</button></div></section></div>`);
  document.querySelectorAll('[name="machine-difficulty"]').forEach(input=>input.addEventListener('change',()=>{document.querySelector('#machine-level-hint').textContent=machineLevelHints[input.value];}));
  (document.querySelector('#local-name:not([type="hidden"])')||document.querySelector('#second-name')||document.querySelector('[name="machine-difficulty"]:checked')||document.querySelector('#local-level')).focus();
}
function updateTimer() {
  if(!room||room.status!=='playing')return;
  const p=ownPair(),node=document.querySelector('.turn-timer');
  const duel=document.querySelector('#duel-time');if(duel&&room.endsAt){const left=Math.max(0,Math.ceil((Date.parse(room.endsAt)-Date.now())/1000));duel.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(left===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);}
  if(node&&room.timeMode==='untimed'&&!p?.deadline){node.textContent='Sin reloj';node.classList.remove('urgent');}
  if(node&&p?.deadline) {
    const seconds=Math.max(0,Math.ceil((Date.parse(p.deadline)-Date.now())/1000));
    node.textContent=seconds+' s';node.classList.toggle('urgent',seconds<=5);
    if(seconds===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
  }
}
function stopMachine(){clearTimeout(machineTimer);machineRequest++;machineWorker?.terminate();machineWorker=null;}
function scheduleMachine() {
  stopMachine();
  if(room?.mode!=='solo'||room.status!=='playing'||document.hidden)return;
  const p=room.pairs[0];
  const machineId=localMachineId(room);
  if(p.pending?p.expander!==machineId:p[p.turn.toLowerCase()]!==machineId)return;
  const expected=room.id,version=room.version;
  machineTimer=setTimeout(()=>{
    if(room?.id!==expected||room.version!==version||busy||document.hidden)return;
    const request=machineRequest;
    const applyChoice=choice=>{if(room?.id===expected&&room.version===version&&request===machineRequest&&!busy&&!document.hidden&&room.status==='playing')accept(localCommand(room,choice.action,choice.payload));};
    const fallback=()=>applyChoice(machineChoice(room,Math.random,{maxTimeMs:40,maxNodes:800}));
    try{
      const worker=new Worker(new URL('./machine-worker.js',import.meta.url),{type:'module'});machineWorker=worker;
      worker.onmessage=({data})=>{
        worker.terminate();if(machineWorker===worker)machineWorker=null;
        if(request!==machineRequest||room?.id!==expected||room.version!==version)return;
        if(data.error)fallback();else if(data.id===expected&&data.version===version)applyChoice(data.choice);
      };
      worker.onerror=()=>{worker.terminate();if(machineWorker===worker)machineWorker=null;if(request===machineRequest&&room?.id===expected&&room.version===version)fallback();};
      worker.postMessage({id:expected,room});
    }catch{fallback();}
  },room.lastEvent?.points?1500:650);
}
setInterval(()=>{
  updateTimer();
  if(isLocal()&&room.status==='playing'&&!busy&&!document.hidden) {
    const next=localCommand(room,'tick');if(next!==room){accept(next);if(!next.lastEvent?.points)notify(next.lastEvent?.kind==='expand'?'Tiempo agotado: ampliación automática.':'Tiempo agotado: jugada automática en una celda vacía.');}
  }
},500);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendLocal();else scheduleMachine();});
window.addEventListener('pagehide',suspendLocal);
function updateOfflineStatus() {
  const n=document.querySelector('#offline-status');if(!n)return;
  n.textContent=navigator.serviceWorker?.controller?'Preparado para jugar sin conexión.':'Los modos locales no necesitan cobertura durante la partida. Abre esta web una primera vez con internet.';
}
startUpdates({
  canReload:()=>(!room||room.status!=='playing')&&!pairLobby&&!worldMapOpen&&!gameMenuOpen&&!mapInteracting&&!busy&&!pendingDelete&&!inventoryOpen&&!hallDialog&&!localSetup&&!roomSetup&&!finishOpen&&!leaveOpen&&(!figureEffect||figureEffect.floatUntil<=performance.now())&&!document.activeElement?.matches('input,textarea'),
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

function renderInventory(){
 document.querySelector('.inventory-dialog')?.remove();if(!inventoryOpen||!room)return;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop inventory-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-title"><div class="hall-dialog-heading"><h2 class="heading" id="inventory-title">Inventario</h2><button data-action="close-inventory" aria-label="Cerrar inventario">×</button></div>${inventoryMarkup(room,uid)}<button class="inventory-back" data-action="close-inventory">Volver a la partida</button></section></div>`);
 document.querySelector('[data-action="close-inventory"]')?.focus();
}
function renderDeleteGame(){
 document.querySelector('.delete-dialog')?.remove();if(!pendingDelete)return;
 const g=pendingDelete,active=!g.local&&g.status!=='finished'&&g.active!==false;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop delete-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 class="heading" id="delete-title">${g.local?'¿Borrar esta partida?':'¿Quitar esta sala de Mis partidas?'}</h2><p>${g.local?'Se borrará el guardado de este navegador, con su tablero y puntuación. Esta acción no se puede deshacer.':active?'También saldrás de la sala. Los demás podrán seguir jugando. Tus puntos de Mundo se conservan.':'La sala deja de aparecer en tu lista. El tablero y el resultado compartidos se conservan.'}</p>${!g.local?'<p class="muted">Si vuelves a abrirla con su código, aparecerá de nuevo en Mis partidas.</p>':''}<div class="row"><button data-action="cancel-delete">Cancelar</button><button class="danger" data-action="confirm-delete">${g.local?'Borrar partida':active?'Salir y quitar':'Quitar de mi lista'}</button></div></section></div>`);
 document.querySelector('[data-action="cancel-delete"]')?.focus();
}
