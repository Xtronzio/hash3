import {eventOutlook} from './event-outlook.js';
import {wormTrailParts,wormTrailMarkup} from './worm-trails.js';
import {snapshotMemo} from './snapshot-memo.js';
import {ONLINE_ENABLED,ONLINE_NOTICE,modeAvailable} from './online-availability.js';
import {machineTurnKey} from './machine-turn.js';
import {copyText,legacyCopyText} from './clipboard.js';
import {profileToken,profileUrl,restoreProfile,validProfileToken} from './profile-link.js';
import {eventOutlookMarkup,ecologyWarningsMarkup} from './event-outlook.js';
import {ecologyNavigationMarkup,ecologyTargets,nextEcologyTarget,ecologyIcon,ecologyPinTargets,ecologyClockEvents,territoryRenderRegion} from './ecology-navigation.js';
import {ecologySeconds} from './ecology-clock.js';
import {matchGoalsMarkup} from './match-goals-ui.js';
import {loadTerritoryResults,achievementsMarkup,achievementSelection} from './achievements.js';
import {canRequestFreeExpansion} from './free-expansion.js';
import './style.css';
import './hall.css';
import './board.css';
import {bindMap} from './map.js';
import {bindGestures} from './gestures.js';
import {maxLabel} from './max.js';
import {navigationPaths} from './navigation-icons.js';
import {metricsMarkup,metricsModePicker,localMetrics} from './metrics.js';
import {comboLabel} from './records.js';
import {ecologyChoicesMarkup} from './ecology-ui.js';
import {territoryIcons} from './territory-tools.js';
import {neutralIcon} from './neutral.js';
import {boardActionFeedback} from './rodent-feedback.js';
import {habitatMark,habitatIcons} from './inhabitants.js';
import {habitatLocations,habitatReservations,habitatTargets,rodentTurnsRemaining} from './habitat-tools.js';
import {rodentMark,rodentSleeping,rodentIcon,rodentLabel} from './rodents.js';
import {loadLocalGames,saveLocalGame,deleteLocalGame,selectExpansion,loadGamePins,toggleGamePin,assertGameDeletionAllowed} from './sessions.js';
import {savedMapModel,thumbnailMarkup,bindInspection} from './saved-map.js';
import {createSnapshotQueue} from './snapshot-queue.js';
import {gamesMarkup,worldRankMarkup,voteMarkup,periods} from './session-ui.js';
import './sessions.css';
import './mobile-game.css';
import './map-overview.css';
import './inventory-sheet.css';
import './game-chrome.css';
import './inventory-status.css';
import './mobile-viewport.css';
import {overviewMarkup,overviewModel} from './map-overview.js';
import {prepareMapRendering,mapWindowMarkup,MAP_SYMBOL_SCALE} from './map-render.js';
import {extensionView,clampBoardZoom} from './map-camera.js';
import {cellIndex,viewportCellWindow,cachedCellWindow,reconcileCells} from './board-window.js';
import {inventoryStatusMarkup,inventoryMarkup,inventoryShortcutsMarkup,usePracticeHint,inventoryRefill,inventoryDockMarkup,immunityComboNotice} from './inventory.js';
import {canUsePracticeTool,practiceTurn,practiceTools,toolCells,toolAllowance} from './practice-tools.js';
import {selectFrontier,frontierTiles,frontierCells,frontierGroups,frontierDiamond,frontierDirections,frontierEdges,frontierFootprint,borderPath} from './frontiers.js';
import {frontierAnchors,borderOptions} from './area-tools.js';
import {useExpansionHint,planSuperHelp,suggestExpansion,executeSuperHelp} from './assistance.js';
import {hallModes,hallModeClass,hallNameField,symbolSelector,machineDifficultySelector,machineLevelHints,hallMarkup,hallDialogMarkup,rulesMarkup,hallIcon,hallReturnButton} from './hall.js';
import {client, ensurePlayer, command, profileAccess} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions, terrainOf, playableTerrain, availableCells} from './game.js';

import {reconcileLocalBoard,createLocal, localCommand, machineChoice, localHumanId, localMachineId} from './local.js';
import {scoreFeedback,scoreBreakdown} from './feedback.js';
import {tornadoFeedback} from './tornado-feedback.js';
import {needsLocalTick} from './local-clock.js';
import {isImmune,immunitySeconds} from './immunity.js';
import {VERSION_LABEL} from './version.js';
import {startUpdates} from './updates.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
const save = (key,value) => {try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{/* device storage may be disabled */}};
let pairLobby=null,mapInteracting=false,mapDeferred=false,worldMapOpen=false;
let worldMapState={},refreshBoard=()=>{},boardFrame=0;
function scheduleBoard(immediate=false){if(immediate){cancelAnimationFrame(boardFrame);boardFrame=0;refreshBoard();}else if(!boardFrame)boardFrame=requestAnimationFrame(()=>{boardFrame=0;refreshBoard();});}
let pauseMapOpen=false,pauseMapState={},disposeInspection=null,disposeMap=null,thumbnailObserver=null;
const onlinePreviews=new Map();
const previewRequests=createSnapshotQueue(code=>command('get',{code}),(key,snapshot)=>onlinePreviews.set(key,{room:snapshot,at:Date.now()}));
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let selectedExpansion=null, finishOpen=false, leaveOpen=false, roomSetup=null, localSetup=null, machineTimer=null,machineWorker=null,machineRequest=0,machinePendingKey=null;
let figureEffect=null,figureTimer,scoreFloatTimer;
let rodentEffect=null,rodentTimer;
function startRodentEffect(feedback){
 clearTimeout(rodentTimer);rodentEffect=feedback?{...feedback,until:performance.now()+900,index:cellIndex(feedback.visits)}:null;
 if(feedback)rodentTimer=setTimeout(()=>{rodentEffect=null;scheduleBoard(true);},900);
}
let tornadoEffect=null,tornadoTimer;
function clearTornadoEffect(){clearTimeout(tornadoTimer);tornadoEffect=null;}
function startTornadoEffect(feedback){
 clearTornadoEffect();if(!feedback)return;
 tornadoEffect={...feedback,until:performance.now()+900,positions:new Set(feedback.affected.map(p=>key(p.x,p.y))),moving:new Set(feedback.moves.map(m=>m.id))};
 tornadoTimer=setTimeout(()=>{tornadoEffect=null;scheduleBoard(true);},900);
}
let hallHistory=[],localReturnDialog=null,pendingDelete=null,inventoryOpen=false,eventsOpen=false,inventorySelection=null;
let inventoryRefillEffect=null,inventoryRefillTimer,inventoryCardChoice=null;
let superHelpPlan=null;
const pendingInventoryRefills=new Map();
const madridNow=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let hallMode=hallModes.find(mode=>modeAvailable(mode.id)).id,hallModeSelected=false,hallDialog=null,hallReturnAction='hall-play',hallRanking={period:'all',date:madridNow,hour:Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(new Date())),offset:0},myGames={},gamesRequest=0,rankRequest=0;
let achievementView=null;
let metricView='personal',metricMode='solo',metricState={entries:[],loading:false,error:''},metricsRequest=0;
let previousTarget = null, blinkId = null, activeKey = null, noticeTimer, connected = true;
const ecologyFocus={};
const urlCode = new URL(location.href).searchParams.get('sala') || '';
const urlRival = new URL(location.href).searchParams.get('rival') || '';
const pairUrlCode=new URL(location.href).searchParams.get('pareja')||'';
if(ONLINE_ENABLED&&(urlCode||pairUrlCode))hallDialog='online';
const humans = () => room.players.filter(p=>!p.bot);
const gameRank=()=>rankedPlayers(humans(),!!room.commonWorld);
const above=()=>immediateAbove(humans(),uid,!!room.commonWorld);
const iconPaths={back:'<path d="m15 5-7 7 7 7"/>',expand:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',worm:habitatIcons.worm,bomb:habitatIcons.bomb,build:habitatIcons.build,frontier:'<rect x="3" y="3" width="18" height="18"/><path d="m12 6 6 6-6 6-6-6Z"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',rodent:rodentIcon,activate:'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/><path d="M12 8v8m-4-4h8"/>',fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8l-5-5m13 5 5-5M8 16l-5 5m13-5 5 5"/>',center:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',above:'<path d="m5 19 14-14M5 5h14v14"/>',pause:'<path d="M8 5v14M16 5v14"/>',inventory:'<path d="M5 8h14l1 13H4L5 8ZM9 8V6a3 3 0 0 1 6 0v2"/>',games:'<path d="M3 7V5h7l2 3h9v12H3V7Z"/>',finish:'<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',exit:'<path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/>',map:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h11m0-7v18m0-7h7"/>',chevron:'<path d="m6 9 6 6 6-6"/>'};
const navIcon=kind=>`<svg viewBox="0 0 ${['rodent','worm','bomb','build'].includes(kind)?'32 32':'24 24'}" aria-hidden="true" focusable="false">${navigationPaths[kind]||iconPaths[kind]||''}</svg>`;
const iconButton=(action,kind,label,extra='')=>`<button data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${navIcon(kind)}</button>`;
function setRankingOpen(open){
 rankOpen=open;
 const panel=document.querySelector('.score-sheet');if(!panel)return;
 panel.hidden=!open;
 const toggle=document.querySelector('.team-score-bottom');
 toggle?.setAttribute('aria-expanded',String(open));
 toggle?.setAttribute('aria-label',open?'Recoger marcador y detalles':'Desplegar marcador y detalles');
 toggle?.focus({preventScroll:true});
}
function pinSavedGame(row){
 const local=row.dataset.local==='true',game=local?localGames().find(g=>g.id===row.dataset.id):myGames.online?.find(g=>g.id===row.dataset.id);if(!game)return;
 try{const pinned=toggleGamePin(localStorage,{...game,local},uid);renderHallDialog();document.querySelector(`.saved-game[data-id="${CSS.escape(game.id)}"] [data-action="toggle-game-menu"]`)?.focus({preventScroll:true});notify(pinned?'Partida anclada.':'Partida desanclada.');}catch{notify('No se ha podido guardar el anclaje en este navegador.');}
}
bindGestures(app,{setRankingOpen});
const mark = symbol => symbol==='*'?'<span class="invader-asterisk" aria-label="Ocupación invasora">*</span>':symbol==='#'?`<svg viewBox="0 0 64 64" aria-hidden="true">${neutralIcon}</svg>`:symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message) {
  const n=document.querySelector('#notice'); n.classList.remove('score-notice');n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function isLocal(){return !!room?.mode;}
function localUid(){const p=room.pairs[0];return room.mode==='solo'?localHumanId(room):p.pending?p.expander:p.turn==='X'?p.x:p.o;}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function resetInventoryFeedback(){
 clearTimeout(inventoryRefillTimer);inventoryRefillEffect=null;inventoryCardChoice=null;pendingInventoryRefills.clear();
}
function updateInventoryFeedback(previous,next){
 if(!isLocal())return;
 const players=room.mode==='solo'?[localHumanId(room)]:room.players.map(p=>p.id);
 for(const id of players){const refill=inventoryRefill(previous,next,id);if(refill)pendingInventoryRefills.set(id,refill);}
 // On a shared device, show each player's recarga when their turn returns.
 const refill=pendingInventoryRefills.get(uid);
 if(!refill||room.status!=='playing')return;
 pendingInventoryRefills.delete(uid);clearTimeout(inventoryRefillTimer);
 inventoryRefillEffect={...refill,until:performance.now()+3500};
 inventoryRefillTimer=setTimeout(()=>{
   inventoryRefillEffect=null;
   document.querySelector('.inventory-dock-button.is-refilled')?.classList.remove('is-refilled');
   document.querySelector('.inventory-refill-toast')?.remove();
 },3500);
}
function accept(next) {
  if(next.not_modified)return;
  if(next.mode)next=reconcileLocalBoard(next);
  if(room?.id===next.id&&next.version<room.version)return;
  const rodentVisit=boardActionFeedback(room,next),tornado=tornadoFeedback(room,next);clearTornadoEffect();
  const previousRoom=room,feedback=scoreFeedback(room,next),comboNotice=feedback?immunityComboNotice(room,next,feedback.player):null;
  const changed = room?.id!==next.id;
  if(changed){for(const k of Object.keys(ecologyFocus))delete ecologyFocus[k];resetInventoryFeedback();startRodentEffect(null);}
  if(changed){eventsOpen=false;pauseMapOpen=false;pauseMapState={};rankOpen=false;zoom=1;inventoryOpen=false;worldMapOpen=false;worldMapState={};previousTarget=null;activeKey=null;figureEffect=null;clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);}
  if(next.mode)next=persistLocal(next);
  room=next;if(isLocal()){uid=localUid();}else {save('hash3_room',room.code);const me=room.players.find(p=>p.id===uid);if(me)save('hash3_name',me.name);}
  if(superHelpPlan&&(room.id!==superHelpPlan.roomId||room.version!==superHelpPlan.version||room.status!=='playing'))superHelpPlan=null;
  updateInventoryFeedback(previousRoom,next);
  if(inventoryCardChoice){
    const {player,tool}=inventoryCardChoice,before=previousRoom?.players.find(p=>p.id===player)?.inventory?.cards[tool]||0,after=next.players.find(p=>p.id===player)?.inventory?.cards[tool]||0;
    if(after<before)inventoryCardChoice.applied=true;
    const event=next.lastEvent,eventChanged=event?.id!==previousRoom?.lastEvent?.id;
    const turnEnded=eventChanged&&event?.kind==='move'&&event.actor===player&&next.practiceTurn?.player!==player;
    const expansionEnded=eventChanged&&['expand','cancel-free-expansion'].includes(event?.kind)&&['hint-expand','frontier','border'].includes(tool);
    if(player!==uid||turnEnded||expansionEnded)inventoryCardChoice=null;
  }
  if(inventorySelection&&(!canUsePracticeTool(room,inventorySelection.player,inventorySelection.tool)||inventorySelection.player!==uid||inventorySelection.source&&!room.cells.some(c=>c.id===inventorySelection.source.id))){inventorySelection=null;if(inventoryCardChoice&&!inventoryCardChoice.applied)inventoryCardChoice=null;}
  const target=above(), targetId=target?.lastMove?.id;
  if(!changed&&targetId&&targetId!==previousTarget)blinkId=targetId;
  else blinkId=null;
  previousTarget=targetId||null;
  const pair=ownPair(),show=feedback&&pair&&[pair.x,pair.o].includes(feedback.player);
  if(show)startFigureEffect(feedback);
  if(tornado)startTornadoEffect(tornado);
  if(rodentVisit)startRodentEffect(rodentVisit);
  if(mapInteracting)mapDeferred=true;else render();if(show)showScore(feedback,comboNotice);scheduleMachine();
}
function render() {
  const scoreFocus=document.activeElement?.closest('.team-score-bottom')!=null;
  mapInteracting=false;mapDeferred=false;
  disposeMap?.();disposeMap=null;
  if(room?.status!=='paused'){disposeInspection?.();disposeInspection=null;pauseMapOpen=false;}
  cancelAnimationFrame(boardFrame);boardFrame=0;refreshBoard=()=>{};
  const previous=document.querySelector('.viewport');
  const scroll=previous?{left:previous.scrollLeft,top:previous.scrollTop,width:previous.clientWidth,height:previous.clientHeight,x:layout.minX+(previous.scrollLeft+previous.clientWidth/2-layout.padding)/layout.size-.5,y:layout.minY+(previous.scrollTop+previous.clientHeight/2-layout.padding)/layout.size-.5}:null;
  if(pairLobby&&!room){renderPairLobby();return;}
  if(!room){renderHome();return;}
  if(!isLocal()&&ownPlayer()?.active===false&&room.status!=='finished'){renderReturn();return;}
  if(room.status==='lobby'||room.status==='finished'){renderLobby();return;}
  if(room.status==='paused'){renderPaused();return;}
  if(isLocal())uid=localUid();
  const own=ownPlayer(), pair=ownPair(), target=above(), list=gameRank();
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  if(canExpand&&!selectedExpansion&&room.practiceHint?.action==='expand'&&room.practiceHint.player===uid)selectedExpansion={x:room.practiceHint.x,y:room.practiceHint.y};
  const ready=!expanding&&pair.turn===own.symbol;
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const scoreList=room.commonWorld?list:rankedPlayers(room.players);
  const targetAvailable=!!(target&&(target.lastMove||room.pairs.find(p=>p.id===target.pair)));
  const jumpButtons=`${iconButton('center','center','Mi territorio')}${iconButton('locate','above','Rival superior',`class="blue" ${targetAvailable?'':'disabled'}`)}`;
  const habitatButtons=ecologyNavigationMarkup(room,uid),availabilityPhase=pair.deadline&&Date.parse(pair.deadline)<=Date.now()?'expired':'active',inventoryStatus=snapshotMemo(room,'inventory:'+uid+':'+availabilityPhase,()=>inventoryStatusMarkup(room,{playerId:uid}));
  const rankRows=players=>players.map(p=>{const index=scoreList.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':p.id===target?.id?' · superior':''}<small class="rank-combo">Combo máx. ${comboLabel(p)}</small><small class="rank-rodent">${escape(rodentLabel(room,p.id))}</small></span><span class="rank-score mono">${p.score}</span><span class="rank-max">${maxLabel(p)} <small>${p.max?.change>0?'↑':p.max?.change<0?'↓':''}</small></span></li>`;}).join('');
  const title=canExpand?'Estás ampliando':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  const tools=isLocal()?practiceTurn(room,uid):null,nextSymbol=room.inventoryEffects?.forced?.find(e=>e.player===uid)?.symbol||own.symbol;
  const turnSymbol=room.inventoryEffects?.forced?.find(e=>e.player===pair[pair.turn.toLowerCase()])?.symbol||pair.turn;
  const comboStatus=tools?.used.includes('combo')?toolAllowance(room,uid):null;
  const instructions={destroy:'Toca una celda vacía resaltada para eliminarla del tablero; después coloca tu ficha.',activate:'Toca un hueco resaltado para construir una celda; después coloca tu ficha normalmente.',erase:'Toca una ficha rival resaltada para borrarla.',opposite:'Toca una ficha rival resaltada para convertirla en tuya.',shift:inventorySelection?.source?'Elige una celda vacía para desplazar la ficha seleccionada.':'Toca la ficha rival que quieres mover.',block:'Elige una celda vacía para reservarla; después coloca tu ficha en otra.',shield:'Toca una ficha tuya para protegerla.'};
  Object.assign(instructions,{border:'Sitúa una línea de tres celdas y gírala hacia la entrada de la invasión.',tornado:'Sitúa el marco 3×3 para mezclar sus fichas y huecos.',bomb:'Elige el centro; vuelve a tocarlo o pulsa Aplicar. La bomba vacía tres celdas contiguas al azar.',frontier:'Toca un + para situar una casilla de muro; vuelve a tocarla o pulsa Colocar.'});
  const toolBanner=inventorySelection?`<div class="practice-banner inventory-target-banner" role="status"><span>${instructions[inventorySelection.tool]}</span>${inventorySelection.tool==='border'?'<button class="small" data-action="rotate-border">Girar ↻</button>':''}${['tornado','bomb','frontier','border'].includes(inventorySelection.tool)?`<button class="small primary" data-action="confirm-area-tool" ${inventorySelection.point&&(!['frontier','border'].includes(inventorySelection.tool)||toolCells(room,uid,inventorySelection.tool,{side:inventorySelection.side||'north'}).some(p=>p.x===inventorySelection.point.x&&p.y===inventorySelection.point.y))?'':'disabled'}>${inventorySelection.tool==='frontier'?'Colocar':'Aplicar'}</button>`:''}<button class="small" data-action="cancel-tool-selection">Cancelar</button></div>`:tools&&(comboStatus||tools.used.includes('double')||room.inventoryEffects?.forced?.length)?`<div class="practice-banner" role="status"><span>${comboStatus?`Combo · ${comboStatus.remaining} herramienta${comboStatus.remaining===1?'':'s'} disponible${comboStatus.remaining===1?'':'s'}. `:''}${tools.used.includes('double')?`Doble · ${tools.remaining} ficha${tools.remaining===1?'':'s'} por colocar. `:''}${room.inventoryEffects?.forced?.map(e=>`Ficha rival · ${escape(room.players.find(p=>p.id===e.player)?.name||'Rival')} pondrá ${e.symbol} en su próxima colocación.`).join(' ')||''}</span></div>`:'';
  const blockedTurn=isLocal()&&ready&&!availableCells(room,pair).length&&availableCells(room,pair,{ignoreBlocks:true}).length;
  const modeLabel=isLocal()?(room.mode==='solo'?'VS MÁQUINA':'SIN CONEXIÓN'):room.commonWorld?'MUNDO':room.kind==='duel'?'DUELO':'SALA LIBRE';
  app.innerHTML=`<section class="game ${hallModeClass(isLocal()?(room.mode==='solo'?'solo':'offline'):room.commonWorld?'world':'duel')} ${inventoryOpen?'inventory-visible':''}">
    <header class="topbar turnbar compact-turnbar"><span class="brand heading" aria-label="#3">#3</span><h1 class="heading turn-state">${title}${expanding?'':` <span class="turn-symbol ${ready?nextSymbol.toLowerCase():turnSymbol.toLowerCase()}">· ${ready?nextSymbol:turnSymbol}</span>`}</h1><div class="turn-clocks">${room.matchGoal?.type==='moves'?`<span class="mono" aria-label="Movimientos de partida">${room.players.reduce((n,p)=>n+(p.placements||0),0)}/${room.matchGoal.target}</span>`:room.cellTarget?`<span class="mono" aria-label="Celdas construidas">${room.terrain.length}/${room.cellTarget}</span>`:''}<span class="turn-timer mono" aria-label="Tiempo restante del turno" ${pair.deadline?'':'hidden'}></span>${room.endsAt?'<span class="duel-clock">FIN <strong id="duel-time" class="mono"></strong></span>':''}</div></header>
    <div class="workspace"><div class="arena">${voteMarkup(room.vote,uid)}
    ${toolBanner}${blockedTurn?'<div class="practice-banner"><span>Las celdas vacías están bloqueadas. Puedes pasar este turno.</span><button class="small" data-action="pass">Pasar turno</button></div>':''}${canExpand&&inventorySelection?.tool!=='frontier'?`<div class="expansion-controls"><span>${selectedExpansion?expansionSummary():'Toca para situar el 3×3; puedes solaparlo.'}</span>${isLocal()&&own.inventory?.cards.frontier>0?iconButton('practice-tool','frontier',pair.frontierUsed?'Muro ya colocada en esta ampliación':'Colocar Muro antes de ampliar',`class="expansion-frontier" data-tool="frontier" ${canUsePracticeTool(room,uid,'frontier')?'':'disabled'}`):''}${pair.optionalExpansion?iconButton('cancel-free-expansion','back','Cancelar ampliación estratégica'):''}<button class="small primary" data-action="confirm-expansion" ${!selectedExpansion?'disabled':''}>Colocar</button></div>`:''}
    <div class="map-wrap"><div class="board-inventory-status">${inventoryStatus}</div><div class="viewport" tabindex="0" aria-label="Tablero compartido"><div class="board-space"><div class="board"></div></div></div><button class="game-minimap" data-action="map" aria-label="Abrir mapa general" title="Mapa general">${navIcon('map')}</button><nav class="map-tools" aria-label="Controles del tablero"><div class="map-zoom"><button data-action="plus" aria-label="Acercar tablero" title="Acercar tablero">+</button><button data-action="minus" aria-label="Alejar tablero" title="Alejar tablero">−</button>${room.commonWorld?'':iconButton('fit-board','fit','Zoom extensión del tablero')}</div><div class="map-jumps icon-navigation">${jumpButtons}${habitatButtons}</div></nav>${overviewMarkup({open:worldMapOpen,jumpButtons,habitatButtons,inventoryStatus})}</div>
    <footer class="game-dock"><section class="score-sheet score-panel" id="ranking-panel" role="region" aria-labelledby="score-panel-title" ${rankOpen?'':'hidden'}><div class="score-panel-heading"><h2 class="heading" id="score-panel-title">${room.commonWorld?'Ranking Mundo':'Marcador'}</h2></div><div class="rank-columns"><span>#</span><span>JUGADOR</span><span>PUNTOS</span><span>#MAX</span></div><ol class="ranking-list rank-extra">${rankRows(scoreList)}</ol><div class="max-note">${room.commonWorld?'#MAX oficial':'#MAX de referencia'} · ${own.max?.value==null?'se calcula desde tu próxima jugada':own.max.provisional?`${own.max.actions}/100 acciones · provisional`:'últimas 100 acciones'}</div><dl class="game-details"><div><dt>Modalidad</dt><dd>${modeLabel}</dd></div><div><dt>Figuras</dt><dd>${room.level==='advanced'?'Avanzadas':'Normales'}</dd></div><div><dt>Juegas como</dt><dd>${escape(own.name)} · ${own.symbol}</dd></div><div><dt>Rival</dt><dd>${escape(opponent.name)}${room.mode==='solo'?` · ${room.machineInventory?'con':'sin'} inventario`:''}${opponent.bot&&room.mode!=='solo'?' · esperando duelista':''}</dd></div><div><dt>Fauna y habitantes</dt><dd>${room.faunaEnabled===false?'Desactivados':'Activados'}</dd></div><div><dt>Invasores y fenómenos</dt><dd>${room.territoryEnabled===false?'Desactivados':'Activados'}</dd></div><div><dt>Reloj</dt><dd>${room.timeMode==='untimed'?'Sin reloj':'33 segundos por turno'}</dd></div><div><dt>Bonus +3</dt><dd>${3-(own.figures%3)} figuras restantes</dd></div></dl><p class="menu-version">#3 · ${VERSION_LABEL} · <span class="connection">${isLocal()?'Este dispositivo':connected?'Conectado':'Reconectando…'}</span></p>${isLocal()?'':`<p class="score-room">Sala <strong class="mono">${escape(room.code)}</strong></p>`}</section><button class="team-score-bottom" data-action="ranking" aria-label="${rankOpen?'Recoger':'Desplegar'} marcador y detalles" aria-expanded="${rankOpen}" aria-controls="ranking-panel"><span class="score-disclosure-tab" aria-hidden="true">${navIcon('chevron')}</span><div class="score-side x"><span class="score-symbol">X</span><strong>${totals.X.toLocaleString('es-ES')}</strong></div><div class="score-side o"><span class="score-symbol">O</span><strong>${totals.O.toLocaleString('es-ES')}</strong></div></button>${isLocal()?ecologyWarningsMarkup(room):''}<nav class="game-bottom" aria-label="Acciones de partida">${!room.commonWorld?iconButton('pause','pause',isLocal()?'Pausar partida':'Solicitar pausa por mayoría'):iconButton('abandon','exit','Salir de Mundo','class="world-exit"')}${isLocal()?inventoryDockMarkup(room,uid,{icon:navIcon('inventory'),open:inventoryOpen,choice:inventoryCardChoice?{...inventoryCardChoice,now:performance.now(),prepared:!inventoryCardChoice.applied}:null,refill:inventoryRefillEffect?.until>performance.now()?inventoryRefillEffect:null}):''}${isLocal()?iconButton('events','events','Próximos eventos',`aria-expanded="${eventsOpen}" aria-controls="events-panel"`):''}${iconButton('go-games','games','Mis partidas')}${isLocal()||room.host===uid&&!room.commonWorld?iconButton('finish','finish','Finalizar partida','class="danger"'):''}</nav></footer></div></div>

  </section>`;
  drawBoard(canExpand,ready,target);renderFinish();renderLeave();renderInventory();renderEvents();renderSuperHelp();updateTimer();
  if(scoreFocus)document.querySelector('.team-score-bottom')?.focus({preventScroll:true});
  const nowKey=key(pair.active.x,pair.active.y);
  if(!scroll||nowKey!==activeKey)requestAnimationFrame(()=>center(pair.active.x+1,pair.active.y+1));
  else center(scroll.x,scroll.y);
  activeKey=nowKey;
  disposeMap=bindMap({room,layout,zoom,target,own,onNavigate:scheduleBoard,mapState:worldMapState,changeZoom:changeMapZoom,onClose:()=>{worldMapOpen=false;},interacting:value=>{mapInteracting=value;if(!value&&mapDeferred){mapDeferred=false;setTimeout(()=>render(),0);}}});
  if(busy)document.querySelectorAll('[data-action="move"],[data-action="select-expansion"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
}
let layout={minX:0,minY:0,size:56,padding:100};
function boardFrontierCell(cell,minX,minY,size,padding,preview=false,pivot=false,valid=true,bombTarget=false){
 if(cell.borderSide)return `<span class="board-border-cell ${preview?'is-preview':''}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" aria-label="${preview?'Propuesta de frontera':'Frontera'} · ${cell.borderSide}"><svg viewBox="${cell.x} ${cell.y} 1 1"><path d="${borderPath(cell)}"/></svg></span>`;
 if(bombTarget)return `<button class="board-frontier-cell is-bomb-target" data-action="inventory-target" data-x="${cell.x}" data-y="${cell.y}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" aria-label="Bomba sobre muro en ${cell.x}, ${cell.y}">${frontierDiamond}</button>`;
 const controls=pivot?`<button class="frontier-pivot-place" data-action="inventory-target" data-x="${cell.x}" data-y="${cell.y}" aria-label="Colocar muro en el punto elegido ${cell.x}, ${cell.y}" ${valid?'':'disabled'}></button>`:'';
 return `<span class="board-frontier-cell ${preview?'is-preview':''} ${preview&&!valid?'is-invalid':''}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" role="${pivot?'group':'img'}" aria-label="${preview?'Propuesta de muro':'Muro, solo se rompe con Bomba'} · ${cell.x}, ${cell.y}">${frontierDiamond}${controls}</span>`;
}
async function analyzeHelp(kind){
 const snapshot=structuredClone(room),player=uid,now=Date.now();notify(kind==='expand'?'Buscando una ampliación favorable…':'Analizando movimientos e inventario…');
 return new Promise((resolve,reject)=>{
  let worker,timer;const finish=(result,error)=>{clearTimeout(timer);worker?.terminate();if(error)reject(new Error(error));else if(room?.id!==snapshot.id||room.version!==snapshot.version||room.status!=='playing')reject(new Error('La partida ha cambiado; vuelve a pedir ayuda.'));else resolve(result);};
  try{
   worker=new Worker(new URL('./assistance-worker.js',import.meta.url),{type:'module'});
   timer=setTimeout(()=>finish(null,'No se ha podido completar el análisis. Puedes volver a pedir ayuda.'),6000);
   worker.onmessage=({data})=>finish(data.result,data.error);worker.onerror=()=>finish(null,'No se ha podido analizar la ayuda.');
   worker.postMessage({kind,room:snapshot,player,now});
  }catch{finish(kind==='expand'?suggestExpansion(snapshot,player):planSuperHelp(snapshot,player,now,{maxTimeMs:250}));}
 });
}
function renderSuperHelp(){
 document.querySelector('.super-help-dialog')?.remove();if(!superHelpPlan)return;
 const steps=superHelpPlan.steps.map(s=>s.action==='inventory'?`${escape(practiceTools.find(t=>t.id===s.payload.tool)?.label||'Inmunidad')} · ×1`:`Colocar ficha en ${s.payload.x}, ${s.payload.y}`);
 const cards=superHelpPlan.steps.filter(s=>s.action==='inventory').map(s=>practiceTools.find(t=>t.id===s.payload.tool)?.label||'Inmunidad');
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop super-help-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="super-help-title"><h2 class="heading" id="super-help-title">Súper Ayuda</h2><p>Usará 1 Súper Ayuda${cards.length?` y ${escape(cards.join(', '))}`:''}. Solo juega tu turno actual.</p><ol class="super-help-steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol><p class="super-help-points">+${superHelpPlan.points} puntos previstos</p><div class="row"><button data-action="cancel-super-help">Cancelar</button><button class="primary" data-action="confirm-super-help">Ejecutar</button></div></section></div>`);
 document.querySelector('[data-action="cancel-super-help"]')?.focus({preventScroll:true});
}
function expansionSummary() {
  const known=snapshotMemo(room,'terrain-keys',()=>new Set(terrainOf(room).map(c=>key(c.x,c.y)))),b=selectedExpansion;
  const count=Array.from({length:9},(_,i)=>key(b.x+i%3,b.y+Math.floor(i/3))).filter(k=>!known.has(k)).length;
  return `${count} celda${count!==1?'s':''} nueva${count!==1?'s':''} · ${9-count} existentes`;
}
function drawBoard(canExpand,ready,target) {
  const pair=ownPair(),own=ownPlayer(),terrain=snapshotMemo(room,'board-terrain',()=>terrainOf(room));
  const selection=inventorySelection?.player===uid?inventorySelection:null;
  const activationTargets=selection?.tool==='activate'?snapshotMemo(room,'board-activation:'+uid,()=>toolCells(room,uid,'activate')):[];
  const choices=canExpand&&!selection?snapshotMemo(room,'expansion:'+pair.id,()=>expansionOptions(terrain,pair.terrainAnchor||pair.active,room)):[],choiceKeys=new Set(choices.map(c=>key(c.x,c.y)));
  const areaSelection=['tornado','bomb','frontier','border'].includes(selection?.tool),areaOptions=areaSelection?snapshotMemo(room,'board-area:'+uid+':'+selection.tool+':'+selection.side,()=>selection.tool==='frontier'?frontierAnchors(room,uid):toolCells(room,uid,selection.tool,{side:selection.side||'north'})):[];
  const areaKeys=new Set(areaOptions.map(c=>key(c.x,c.y)));
  if(selectedExpansion&&!choiceKeys.has(key(selectedExpansion.x,selectedExpansion.y)))selectedExpansion=null;
  const barriers=snapshotMemo(room,'board-barriers',()=>frontierCells(room)),reservations=snapshotMemo(room,'board-reservations',()=>habitatReservations(room));
  const barrierKeys=new Set(barriers.filter(c=>!c.borderSide).map(c=>key(c.x,c.y)));
  const {minX,minY,maxX,maxY}=snapshotMemo(room,'board-bounds:'+uid+':'+canExpand+':'+selection?.tool+':'+selection?.point?.x+','+selection?.point?.y,()=>{
    const all=[...terrain,...barriers,...(selection?.tool==='frontier'&&selection.point?frontierTiles({...selection.point,side:selection.side||'north'}):[]),...reservations,...choices,...choices.map(c=>({x:c.x+2,y:c.y+2})),...activationTargets,...areaOptions,...areaOptions.map(c=>({x:c.x+2,y:c.y+2}))];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const c of all){minX=Math.min(minX,c.x);minY=Math.min(minY,c.y);maxX=Math.max(maxX,c.x);maxY=Math.max(maxY,c.y);}
    return {minX,minY,maxX,maxY};
  });
  const viewport=document.querySelector('.viewport');
  const size=(innerWidth<=760?48:56)*zoom,padding=Math.max(90,viewport.clientWidth/2,viewport.clientHeight/2);Object.assign(layout,{minX,minY,size,padding,previewScale:1,minZoom:room.commonWorld?.55:.3});
  const board=document.querySelector('.board');board.replaceChildren();
  board.style.width=`${(maxX-minX+1)*size+2*padding}px`;board.style.height=`${(maxY-minY+1)*size+2*padding}px`;
  const space=board.parentElement;space.style.width=board.style.width;space.style.height=board.style.height;
  const {cells,linked,known,myPairIds,habitatPoints,wormBody,projects,roders,eaten}=snapshotMemo(room,'board-model:'+pair.id,()=>{
    const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),linked=new Set(playableTerrain(room,pair).map(c=>key(c.x,c.y))),known=new Set(terrain.map(c=>key(c.x,c.y))),myPairIds=new Set([pair.x,pair.o]);
    const habitatPoints=new Map(habitatLocations(room).map(e=>[key(e.x,e.y),e])),wormBody=new Set((room.worms||[]).flatMap(w=>w.body).map(c=>key(c.x,c.y))),projects=new Map((room.works||[]).flatMap(w=>[...w.destroy.slice(w.done).map(c=>({...c,kind:'destroy'})),...w.build.slice(w.done).map(c=>({...c,kind:'build'}))]).map(c=>[key(c.x,c.y),c]));
    const roders=new Map((room.rodents||[]).map(r=>[key(r.x,r.y),r])),eaten=new Set((room.eatenCells||[]).map(c=>key(c.x,c.y)));
    return {cells,linked,known,myPairIds,habitatPoints,wormBody,projects,roders,eaten};
  });
  const targets=selection?new Set((areaSelection&&selection.tool!=='frontier'?areaOptions:toolCells(room,uid,selection.tool,{side:selection.side||'north'})).map(c=>key(c.x,c.y))):null;
  const style=c=>`left:${(c.x-minX)*size+padding}px;top:${(c.y-minY)*size+padding}px;width:${size}px;height:${size}px`;
  const index=snapshotMemo(room,'board-index',()=>cellIndex(terrain)),choiceIndex=snapshotMemo(room,'board-choice-index:'+pair.id+':'+canExpand,()=>cellIndex(choices.filter(c=>!known.has(key(c.x,c.y))))),activationIndex=snapshotMemo(room,'board-activation-index:'+uid+':'+selection?.tool,()=>cellIndex(activationTargets));
  const areaIndex=snapshotMemo(room,'board-area-index:'+uid+':'+selection?.tool+':'+selection?.side,()=>cellIndex(areaOptions.filter(p=>!known.has(key(p.x,p.y))&&!(selection?.tool==='bomb'&&barrierKeys.has(key(p.x,p.y))))));
  const reservationIndex=snapshotMemo(room,'board-reservation-index',()=>cellIndex(reservations.filter(c=>!known.has(key(c.x,c.y)))));
  const liveHabitatIndex=snapshotMemo(room,'board-inhabitants',()=>cellIndex(habitatLocations(room)));
  const phenomenonIndex=snapshotMemo(room,'board-phenomena:'+uid,()=>cellIndex(ecologyPinTargets(room,uid).filter(e=>!!territoryIcons[e.kind])));
  const territoryIndex=snapshotMemo(room,'board-warnings',()=>cellIndex((room.territoryEvents||[]).flatMap(e=>territoryRenderRegion(room,e).map(c=>({...c,kind:e.kind,eventId:e.id})))));
  const wormTrailIndex=snapshotMemo(room,'board-worm-trails',()=>cellIndex(wormTrailParts(room)));
  const frontierIndex=snapshotMemo(room,'board-walls',()=>cellIndex(frontierGroups(room).flatMap(f=>f.cells.map(c=>({...c,frontierId:f.id})))));
  const playerNames=new Map(room.players.map(p=>[p.id,p.name])),shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));
  const habitatBlocks=new Set([...barrierKeys,...wormBody,...reservations.map(c=>key(c.x,c.y))]);
  const blockedFor=id=>new Set([...habitatBlocks,...(room.inventoryEffects?.blocks||[]).filter(e=>e.remaining>0&&(e.by===id?e.fresh:!isImmune(room,id))).map(e=>key(e.x,e.y))]);
  const blockedKeys=blockedFor(uid),sourceBlocked=selection?.source?blockedFor(selection.source.owner):null;
  const reservedKeys=new Set((room.inventoryEffects?.blocks||[]).filter(e=>e.by===uid&&e.remaining>0).map(e=>key(e.x,e.y)));
  let nodes=new Map();
  const cellMarkup=pos=>{
    const {x,y}=pos,c=cells.get(key(x,y)),rodent=roders.get(key(x,y)),active=linked.has(key(x,y));
    const isTarget=c&&c.id===target?.lastMove?.id,last=c&&c.id===own.lastMove?.id;
    const color=c?(c.symbol==='*'?'invader':c.symbol==='#'?'neutral':myPairIds.has(c.owner)?c.symbol.toLowerCase():'foreign'):'';
    const owner=c?(c.symbol==='*'?'los invasores':c.symbol==='#'?'el tablero':playerNames.get(c.owner)):'';
    const select=canExpand&&choiceKeys.has(key(x,y));
    const targeting=!!selection,source=selection?.source,chosen=source&&c?.id===source.id;
    const removable=targeting&&ready&&(areaSelection?areaKeys.has(key(x,y)):active&&(source?!c&&!blockedKeys.has(key(x,y))&&!sourceBlocked.has(key(x,y)):targets.has(key(x,y))));
    const habitat=habitatPoints.get(key(x,y)),project=projects.get(key(x,y)),body=wormBody.has(key(x,y));
    const blocked=blockedKeys.has(key(x,y)),reserved=!c&&reservedKeys.has(key(x,y));
    const playable=active&&ready&&!c&&!blocked&&!targeting;
    const swirling=tornadoEffect&&tornadoEffect.until>performance.now()&&tornadoEffect.positions.has(key(x,y));
    const moving=swirling&&c&&tornadoEffect.moving.has(c.id);
    const swirlStyle=swirling?`--tornado-delay:${Math.min(0,tornadoEffect.until-performance.now()-900)}ms;`:'';
    const glowing=figureEffect&&figureEffect.until>performance.now()&&figureEffect.cells.has(key(x,y));
    const glowStyle=glowing?`--figure-color:${figureEffect.symbol==='X'?'var(--red)':'var(--green)'};--figure-duration:${Math.max(1,figureEffect.until-performance.now())}ms;`:'';
    const hinted=active&&ready&&!c&&room.practiceHint?.player===uid&&room.practiceHint.x===x&&room.practiceHint.y===y;
    const toolLabel=practiceTools.find(t=>t.id===selection?.tool)?.label;
    const label=removable?`${source?'Destino de Desplazar':toolLabel} ${c?c.symbol+' de '+owner:'celda vacía'}, celda ${x}, ${y}`:select?`Situar ampliación en ${x}, ${y}`:c?`${c.symbol} de ${owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}${c&&shields.has(c.id)?', protegida por escudo':''}`:`Celda vacía ${x}, ${y}${active?', tu territorio':''}${blocked?', bloqueada':''}${reserved?', reservada por ti':''}`;
    return `<button class="cell terrain-cell ${project?'project-'+project.kind:''} ${body?'worm-body':''} ${rodent&&!rodentSleeping(rodent)?'rodent-eating':''} ${!c&&eaten.has(key(x,y))?'rodent-cleared':''} ${swirling?'tornado-zone':''} ${moving?'tornado-destination':''} ${glowing?'figure-glow':''} ${active?'connected':''} ${playable?'available':''} ${removable&&selection.tool!=='tornado'?'tool-target':''} ${removable&&selection.tool!=='tornado'&&!c&&!habitat&&!project&&!body?'tool-destination':''} ${chosen?'tool-source':''} ${blocked&&!c?'blocked':''} ${reserved&&!blocked?'reserved':''} ${c&&shields.has(c.id)?'shielded':''} ${hinted?'hint-point':''} ${select?'placement-anchor':''} ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" style="${style(pos)};${glowStyle}${swirlStyle}" data-action="${removable?'inventory-target':select?'select-expansion':playable?'move':'invalid-cell'}" data-x="${x}" data-y="${y}" ${!removable&&!select&&(targeting||!ready||blocked)?'disabled':''} aria-disabled="${!removable&&!select&&!playable}" aria-label="${escape((body?'Gusano · cuerpo bloquea esta celda. ':rodent?`Roedor · ${rodent.eaten}/3 comidas · ${rodentSleeping(rodent)?'dormido':'comiendo'}. `:'')+label+(hinted?', sugerencia de ayuda':''))}">${c?mark(c.symbol):''}${rodent?rodentMark(rodent):habitat?habitatMark(habitat.kind,habitat.kind==='rodent'?rodentTurnsRemaining(habitat)+'↷':'',habitat):''}</button>`;
  };
  const visibleCells=cachedCellWindow(index,cellMarkup);
  const density=size<24?snapshotMemo(room,'board-density:'+uid+':'+target?.id,()=>{const model=overviewModel(room,own,target,{includeFrontiers:false});return {model,index:prepareMapRendering(model,frontierCells(room))};}):null;
  let lastEntries=null,lastExtras=null;
  refreshBoard=()=>{
   if(!board.isConnected)return;
   const now=performance.now(),window=viewportCellWindow(viewport,layout);
   const visiting=!!rodentEffect&&rodentEffect.until>now,swirling=!!tornadoEffect&&tornadoEffect.until>now;
   if(density){
    const entries=[{id:'board-map',markup:`<svg class="board-overview-map ${size>=MAP_SYMBOL_SCALE?'show-symbols':''}" data-action="board-overview" style="left:${(window.x-minX)*size+padding}px;top:${(window.y-minY)*size+padding}px;width:${window.width*size}px;height:${window.height*size}px" viewBox="${window.x} ${window.y} ${window.width} ${window.height}" role="img" aria-label="Vista general del tablero; toca para acercarte">${mapWindowMarkup(density.model,density.index,window,size)}</svg>`}];
    for(const e of liveHabitatIndex.query(window).slice(0,33))entries.push({id:'inhabitant:'+e.id+':'+e.kind,markup:`<span class="cell inhabitant-overview" style="${style(e)};width:32px;height:32px" aria-label="${e.kind}">${habitatMark(e.kind,e.kind==='rodent'?rodentTurnsRemaining(e)+'↷':'',e)}</span>`});
    for(const e of phenomenonIndex.query(window).slice(0,33))entries.push({id:'phenomenon:'+e.id,markup:`<span class="cell phenomenon-marker" style="${style(e)};width:32px;height:32px" aria-hidden="true">${ecologyIcon(e.kind)}${e.approach?`<span class="invasion-entry" style="transform:rotate(${{north:0,east:90,south:180,west:270}[e.approach.side]}deg)">↓</span>`:''}<b class="ecology-clock mono" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId}">${ecologySeconds(e)}</b></span>`});
    nodes=reconcileCells(board,entries,nodes);return;
   }
   const visible=visibleCells.query(window,`${!!figureEffect&&figureEffect.until>now}:${swirling}:${visiting}`);
   const extras=`${visiting}:${swirling}:${!!figureEffect&&figureEffect.floatUntil>now}:${selectedExpansion?.x},${selectedExpansion?.y}`;
   if(visible===lastEntries&&extras===lastExtras)return;
   lastEntries=visible;lastExtras=extras;
   const entries=[...visible];
   entries.push({id:'worm-trail',markup:`<svg class="worm-trail-layer" style="left:${(window.x-minX)*size+padding}px;top:${(window.y-minY)*size+padding}px;width:${window.width*size}px;height:${window.height*size}px" viewBox="${window.x} ${window.y} ${window.width} ${window.height}" aria-hidden="true">${wormTrailMarkup(wormTrailIndex.query(window),{})}</svg>`});
   entries.push(...choiceIndex.query(window).map(c=>({id:'choice:'+key(c.x,c.y),markup:`<button class="placement-anchor new-anchor" data-action="select-expansion" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Situar ampliación en ${c.x}, ${c.y}">+</button>`})));
  if(ready&&activationTargets.length)entries.push(...activationIndex.query(window).map(c=>({id:'activate:'+key(c.x,c.y),markup:`<button class="cell activation-hole tool-target" data-action="inventory-target" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Construir celda ${c.x}, ${c.y}">${navIcon('activate')}</button>`})));
  if(areaSelection){
   for(const point of areaIndex.query(window).filter(p=>selection.tool!=='tornado'||!known.has(key(p.x,p.y))))entries.push({id:'area:'+key(point.x,point.y),markup:`<button class="cell ${selection.tool==='tornado'?'tornado-anchor':'tool-target'} area-anchor ${['frontier','border'].includes(selection.tool)?'frontier-anchor':''}" data-action="inventory-target" data-x="${point.x}" data-y="${point.y}" style="${style(point)}" aria-label="Situar ${selection.tool==='tornado'?'Tornado 3×3':selection.tool==='bomb'?'Bomba':selection.tool==='border'?'Frontera de tres celdas':'Muro de una casilla'} en ${point.x}, ${point.y}">${['frontier','border'].includes(selection.tool)?'+':selection.tool==='tornado'?'·':'◇'}</button>`});
   if(selection.point){const p=selection.point;if(['frontier','border'].includes(selection.tool)){
    const valid=targets.has(key(p.x,p.y));
    for(const [i,cell] of (selection.tool==='border'?frontierFootprint({type:'border',edges:frontierEdges({...p,side:selection.side||'north'})},room):frontierTiles({...p,side:selection.side||'north'})).entries())entries.push({id:'frontier-preview:'+key(cell.x,cell.y),markup:boardFrontierCell(cell,minX,minY,size,padding,true,i===0,valid)});
   }else entries.push({id:'area-preview',markup:`<div class="placement-preview area-preview ${selection.tool==='bomb'?'bomb-preview':'tornado-preview'}" style="left:${(p.x-minX)*size+padding}px;top:${(p.y-minY)*size+padding}px;width:${(selection.tool==='bomb'?1:3)*size}px;height:${(selection.tool==='bomb'?1:3)*size}px" aria-hidden="true"></div>`});}
  }
  for(const c of reservationIndex.query(window))entries.push({id:'project:'+key(c.x,c.y),markup:`<div class="cell project-build construction-ghost" style="${style(c)}" aria-label="Proyecto de construcción: celda reservada ${c.x}, ${c.y}">${habitatPoints.has(key(c.x,c.y))?habitatMark('build','',habitatPoints.get(key(c.x,c.y))):'<span class="project-reservation">·</span>'}</div>`});
  for(const cell of frontierIndex.query(window))entries.push({id:'frontier:'+cell.frontierId+key(cell.x,cell.y)+cell.borderSide,markup:boardFrontierCell(cell,minX,minY,size,padding,false,false,true,ready&&selection?.tool==='bomb'&&areaKeys.has(key(cell.x,cell.y)))});
  if(figureEffect&&figureEffect.floatUntil>performance.now()){
    const e=figureEffect;
    entries.push({id:'score',markup:nodes.get('score')?.markup||`<span class="score-float ${e.symbol.toLowerCase()}" style="left:${(e.move.x-minX+.5)*size+padding}px;top:${(e.move.y-minY)*size+padding}px;animation-duration:${Math.max(1,e.floatUntil-performance.now())}ms" aria-hidden="true">+${e.points}</span>`});
  }
  if(selectedExpansion) {
    const b=selectedExpansion;
    entries.push({id:'preview',markup:`<div class="placement-preview" style="left:${(b.x-minX)*size+padding}px;top:${(b.y-minY)*size+padding}px;width:${3*size}px;height:${3*size}px" aria-hidden="true"></div>`});
  }
  for(const e of phenomenonIndex.query(window))entries.push({id:'phenomenon:'+e.id,markup:`<span class="cell phenomenon-marker" style="${style(e)}" aria-hidden="true">${ecologyIcon(e.kind)}${e.approach?`<span class="invasion-entry" style="transform:rotate(${{north:0,east:90,south:180,west:270}[e.approach.side]}deg)">↓</span>`:''}<b class="ecology-clock mono" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId}">${ecologySeconds(e)}</b></span>`});
  for(const c of territoryIndex.query(window))entries.push({id:'territory-warning:'+c.eventId+key(c.x,c.y),markup:`<span class="cell territory-warning territory-${c.kind}" style="${style(c)}" aria-hidden="true"></span>`});
  if(visiting)for(const visit of rodentEffect.index.query(window).filter(v=>v.kind!=='rodent')){
   const id='board-action:'+visit.kind+key(visit.x,visit.y),path=visit.kind==='neutral'?neutralIcon:visit.kind==='rodent'?rodentIcon:territoryIcons[visit.kind]||habitatIcons[visit.kind];
   entries.push({id,markup:nodes.get(id)?.markup||`<span class="cell board-action ${visit.kind==='rodent'?'rodent-visit':''} board-action-${visit.kind}" style="${style(visit)};--visit-delay:${Math.min(0,rodentEffect.until-now-900)+Math.min(600,(visit.group||0)*60)}ms" aria-hidden="true"><svg viewBox="0 0 ${visit.kind==='neutral'?64:32} ${visit.kind==='neutral'?64:32}" aria-hidden="true">${path}</svg></span>`});
  }
  if(swirling)for(const [i,m] of tornadoEffect.moves.entries()){
   const left=Math.min(m.from.x,m.to.x),top=Math.min(m.from.y,m.to.y);
   if(left>window.x+window.width||top>window.y+window.height||Math.max(m.from.x,m.to.x)+1<window.x||Math.max(m.from.y,m.to.y)+1<window.y)continue;
   const color=m.symbol==='#'?'neutral':myPairIds.has(m.owner)?m.symbol.toLowerCase():'foreign';
   entries.push({id:'tornado:'+m.id,markup:nodes.get('tornado:'+m.id)?.markup||`<span class="cell tornado-piece ${color}" style="${style(m.from)};--tornado-dx:${(m.to.x-m.from.x)*size}px;--tornado-dy:${(m.to.y-m.from.y)*size}px;--tornado-spin:${i%2?-1:1};--tornado-delay:${Math.min(0,tornadoEffect.until-now-900)}ms" aria-hidden="true">${mark(m.symbol)}</span>`});
  }
  nodes=reconcileCells(board,entries,nodes);
  };
  refreshBoard();
}
function center(x,y) {
  const v=document.querySelector('.viewport');if(!v)return;
  const {minX,minY,size,padding}=layout;
  v.scrollLeft=(x-minX+.5)*size+padding-v.clientWidth/2;
  v.scrollTop=(y-minY+.5)*size+padding-v.clientHeight/2;refreshBoard();
}
function changeMapZoom(value,inGesture=false,anchor=null){
 const viewport=document.querySelector('.viewport');if(!viewport)return;
 const x=(viewport.scrollLeft+viewport.clientWidth/2-layout.padding)/layout.size+layout.minX-.5;
 const y=(viewport.scrollTop+viewport.clientHeight/2-layout.padding)/layout.size+layout.minY-.5;
 zoom=clampBoardZoom(value,!!room.commonWorld);
 if(inGesture){const p=ownPair(),o=ownPlayer(),ready=!p.pending&&p.turn===o.symbol;drawBoard(p.pending&&p.expander===uid,ready,above());if(anchor){viewport.scrollLeft=(anchor.point.x-layout.minX)*layout.size+layout.padding-anchor.screen.x;viewport.scrollTop=(anchor.point.y-layout.minY)*layout.size+layout.padding-anchor.screen.y;}else center(x,y);refreshBoard();const n=document.querySelector('.zoom-label');if(n)n.textContent='ZOOM · '+Math.round(zoom*100)+'%';}
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
function hallDialogFrame(title,body,{home=false,actions=''}={}) {
  return `<div class="dialog-backdrop hall-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="hall-dialog-title"><div class="hall-dialog-heading"><h2 class="heading" id="hall-dialog-title">${title}</h2><button class="ghost small" data-action="hall-close" aria-label="Cerrar">×</button></div>${body}<div class="row hall-dialog-footer">${actions}${hallReturnButton(home||!hallHistory.length?'hall-home':'hall-close',{previous:!home&&hallHistory.length>0})}</div></section></div>`;
}
function rankingRows(players,byMax=false) {
  return `<ol class="hall-ranking-list">${rankedPlayers(players.filter(p=>!p.bot),byMax).map((p,i)=>`<li><span class="rank-position ${['gold','silver','bronze'][i]||''}">${i+1}</span><span>${escape(p.name)}<small>${p.figures} figuras · ${p.symbol||'—'}</small></span><strong class="mono">${byMax?maxLabel(p)+' #MAX':p.score}</strong></li>`).join('')}</ol>`;
}
function renderHallDialog() {
  document.querySelector('.hall-dialog')?.remove();
  const local=savedLocal();let markup;
  if(hallDialog==='help')markup=hallDialogFrame('Cómo se juega',rulesMarkup);
  else if(hallDialog==='achievements')markup=hallDialogFrame('Logros',achievementsMarkup(loadTerritoryResults(localStorage,localGames()),achievementView||{}),{home:true});
  else if(hallDialog==='inventory')markup=hallDialogFrame('Inventario',`<div class="inventory-catalog">${inventoryMarkup(null,null,{showShortcuts:false})}</div>`,{home:true,actions:inventoryShortcutsMarkup()});
  else if(hallDialog==='ranking'){markup=hallDialogFrame('Ranking y métricas',`${metricsModePicker(metricView==='personal'?metricMode:null)}<div class="metrics-classification"><button class="mode-green" data-action="metrics-view" data-view="world" aria-pressed="${metricView==='world'}" ${modeAvailable('world')?'':'disabled title="En construcción"'}>${hallIcon('world')}Clasificación Mundo${modeAvailable('world')?'':' · En construcción'}</button></div>${metricView==='world'?worldRankMarkup(hallRanking,uid):metricsMarkup({...metricState,entries:[...localMetrics(localGames()),...metricState.entries],mode:metricMode,showModes:false})}`,{home:true});
  }else if(hallDialog==='games'){markup=hallDialogFrame('Mis partidas',gamesMarkup({...myGames,local:localGames(),pins:loadGamePins(localStorage),uid}),{home:true});
  }else markup=hallDialogMarkup(hallDialog,{name:read('hash3_name')||'',mode:hallMode,code:urlCode,friendInvite:!!urlRival,local,hasPrevious:hallHistory.length>0});
  app.insertAdjacentHTML('beforeend',markup);
  if(hallDialog==='profile')hydrateProfileAccess();
  if(hallDialog==='games')bindOnlineThumbnails();
  document.querySelector('#rank-date')?.addEventListener('change',async e=>{hallRanking.date=e.target.value||madridNow;hallRanking.offset=0;await refreshWorldRank();});
  document.querySelector('#rank-hour')?.addEventListener('change',async e=>{hallRanking.hour=Number(e.target.value);hallRanking.offset=0;await refreshWorldRank();});
  document.querySelector('#achievement-rules')?.addEventListener('change',e=>{achievementView={...achievementView,comparison:e.target.value};renderHallDialog();});
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
  document.querySelector('#profile-form')?.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const name=document.querySelector('#profile-name').value.trim();
    if(name.length<2||name.length>18){profileStatus('profile-name-status','El apodo debe tener entre 2 y 18 caracteres.','error');return;}
    save('hash3_name',name);
    document.querySelector('.profile-identity strong').textContent=name;
    profileStatus('profile-name-status','Apodo guardado en este navegador.','ok');
    if(ONLINE_ENABLED&&read('hash3_profile_token')){
     try{await profileAccess('sync',{name});profileStatus('profile-name-status','Apodo guardado y sincronizado con tu perfil online.','ok');}
     catch(error){profileStatus('profile-name-status','Apodo guardado aquí, pero no se ha sincronizado: '+error.message,'error');}
    }
  });
  document.querySelector('#profile-import')?.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const input=document.querySelector('#profile-link')?.value.trim();
    profileStatus('profile-restore-status','Verificando tu enlace…');
    busy=true;
    const submit=document.querySelector('#profile-import button[type="submit"]');if(submit)submit.disabled=true;
    try{await loadProfileAccess(input);}
    catch(error){profileStatus('profile-restore-status',error.message||'No se pudo cargar el perfil.','error');}
    finally{busy=false;if(submit?.isConnected)submit.disabled=false;}
  });
  const dialog=document.querySelector('.hall-dialog');
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeHallDialog();});
  // Focusing the nickname automatically on iOS opens the keyboard and moves
  // the visual viewport before the modal can be sized. Preserve keyboard
  // focus for desktop, but focus a non-editable control on touch devices.
  const touchProfile=hallDialog==='profile'&&matchMedia('(max-width:760px) and (pointer:coarse)').matches;
  const focusTarget=touchProfile
    ?dialog.querySelector('[data-action="hall-close"]')
    :(document.querySelector('#name:not([type="hidden"])')||document.querySelector('#profile-name')||form?.querySelector('select,input:not([type="hidden"])')||dialog.querySelector('[data-action="hall-close"]'));
  focusTarget?.focus({preventScroll:true});
  updateOfflineStatus();renderDeleteGame();
}
function profileStatus(id,message,state='info'){
 const el=document.getElementById(id);if(el){el.textContent=message;el.dataset.state=state;}
}
function localProfileLink(){
 const token=read('hash3_profile_token'),owner=read('hash3_profile_owner');
 if(!owner||!validProfileToken(token)||!token.startsWith('h31_'+owner+'_'))return null;
 try{return profileUrl(token,location.href);}catch{return null;}
}
function hydrateProfileAccess(){
 const link=localProfileLink(),ready=document.querySelector('#profile-ready');
 if(ready)ready.hidden=!link;
 const field=document.querySelector('#profile-export');if(field)field.value=link||'';
 const generate=document.querySelector('#profile-generate');if(generate)generate.hidden=!!link;
 const copy=document.querySelector('#profile-copy-ready');if(copy)copy.hidden=!link;
 const share=document.querySelector('#profile-share');if(share)share.hidden=!link||typeof navigator.share!=='function';
 const incoming=profileToken(location.href,location.href),importField=document.querySelector('#profile-link');
 if(incoming&&importField&&!importField.value)importField.value=profileUrl(incoming,location.href);
}
async function loadProfileAccess(input){
 const token=profileToken(input,location.href);
 if(!token)throw Error('Pega un enlace de perfil válido de #3. Comprueba que está completo.');
 const result=await profileAccess('restore',{token}),id=await restoreProfile(client,result);
 if(new URLSearchParams(location.hash.slice(1)).has('perfil'))
  history.replaceState(null,'',location.pathname+location.search);
 clearGameView();uid=id;save('hash3_name',result.name);
 save('hash3_profile_token',token);save('hash3_profile_owner',id);
 save('hash3_pair',null);save('hash3_room',null);
 myGames={};onlinePreviews.clear();gamesRequest++;metricsRequest++;
 metricState={entries:[],loading:false,error:''};
 hallDialog='profile';hallHistory=[];renderHome();
 profileStatus('profile-restore-status','Perfil recuperado correctamente. Ya puedes entrar en tus partidas online.','ok');
 notify('Perfil recuperado. Tus partidas online están en Mis partidas.');
}
async function generateProfileAccess(renew=false){
 const name=(document.querySelector('#profile-name')?.value||read('hash3_name')||'').trim();
 if(name.length<2||name.length>18)throw Error('Escribe primero un apodo de 2 a 18 caracteres.');
 if(!renew&&localProfileLink())return localProfileLink();
 const id=await ensurePlayer(),existing=read('hash3_profile_owner')===id?read('hash3_profile_token'):null;
 const result=await profileAccess(renew?'renew':'copy',{name,token:existing});
 if(!validProfileToken(result?.token))throw Error('El servidor no ha generado un enlace válido.');
 save('hash3_profile_token',result.token);save('hash3_profile_owner',id);save('hash3_name',name);
 hydrateProfileAccess();
 return profileUrl(result.token,location.href);
}
async function copySavedProfileLink(){
 const link=localProfileLink();
 if(!link){profileStatus('profile-copy-status','Primero genera un enlace de acceso.','error');return;}
 const copied=await copyText(link,{fallback:legacyCopyText}),field=document.querySelector('#profile-export');
 if(!copied){field?.focus();field?.select();}
 profileStatus('profile-copy-status',copied?'Enlace copiado. Pégalo en el otro navegador.':'Enlace preparado: selecciónalo y utiliza Copiar.',copied?'ok':'info');
}

function localGames(){try{return loadLocalGames(localStorage);}catch{return [];}}
function persistLocal(next){
 try{return saveLocalGame(localStorage,next);}catch{notify('No se ha podido guardar la partida: revisa el espacio disponible de este navegador.');throw new Error('La partida sigue abierta para que puedas recuperarla.');}
}
function clearGameView(){clearTornadoEffect();disposeMap?.();disposeMap=null;cancelAnimationFrame(boardFrame);boardFrame=0;refreshBoard=()=>{};disposeInspection?.();disposeInspection=null;pauseMapOpen=false;pauseMapState={};stopMachine();resetInventoryFeedback();superHelpPlan=null;room=null;eventsOpen=false;inventoryOpen=false;inventorySelection=null;rankOpen=false;worldMapOpen=false;finishOpen=false;leaveOpen=false;selectedExpansion=null;activeKey=null;mapInteracting=false;mapDeferred=false;history.replaceState(null,'',location.pathname);}
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
 const request=++gamesRequest;myGames={online:[],loading:ONLINE_ENABLED&&navigator.onLine,error:''};
 openHallDialog('games','hall-games');
 if(!ONLINE_ENABLED){myGames.error='Duelo y Mundo · En construcción. Aquí están tus partidas locales.';renderHallDialog();return;}
 if(!navigator.onLine){myGames.error='Sin conexión: puedes abrir tus partidas locales. Las salas online se mostrarán al reconectar.';renderHallDialog();return;}
 try{uid=await ensurePlayer();const next=await command('my_games');if(hallDialog!=='games'||request!==gamesRequest)return;myGames.online=next.games.map(g=>({...g,preview:onlinePreviews.get(`${uid}:${g.id}`)?.room}));}
 catch(error){if(hallDialog!=='games'||request!==gamesRequest)return;myGames.error=error.message||'No se han podido consultar tus salas.';}
 if(hallDialog==='games'&&request===gamesRequest){myGames.loading=false;renderHallDialog();}
}
function bindOnlineThumbnails(){
 thumbnailObserver?.disconnect();
 const request=gamesRequest,player=uid;
 const current=()=>hallDialog==='games'&&request===gamesRequest&&player===uid;
 const update=(game,snapshot)=>{
   if(!current())return;game.preview=snapshot;
   const row=document.querySelector(`.saved-game[data-local="false"][data-id="${CSS.escape(game.id)}"]`);
   const thumbnail=row?.querySelector('.saved-game-thumbnail');if(thumbnail)thumbnail.innerHTML=thumbnailMarkup(snapshot);
 };
 thumbnailObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;thumbnailObserver.unobserve(entry.target);
     const game=myGames.online?.find(g=>g.id===entry.target.dataset.id);if(!game)continue;
     const cached=onlinePreviews.get(`${player}:${game.id}`);if(cached){update(game,cached.room);if(Date.now()-cached.at<30000)continue;}
     requestOnlinePreview(game,player,current).then(snapshot=>{if(snapshot)update(game,snapshot);}).catch(()=>{
       if(current()){const thumb=document.querySelector(`.saved-game[data-local="false"][data-id="${CSS.escape(game.id)}"] .saved-game-thumbnail`);if(thumb)thumb.title='No se ha podido consultar el mapa. Puedes abrir la partida.';}
     });
   }
 },{rootMargin:'100px'});
 document.querySelectorAll('.saved-game[data-local="false"]').forEach(row=>thumbnailObserver.observe(row));
}
function requestOnlinePreview(game,player,current){
 return previewRequests.request(`${player}:${game.id}`,game.code,()=>current()&&myGames.online?.some(g=>g.id===game.id));
}
async function refreshWorldRank(){
 if(!ONLINE_ENABLED){hallRanking.loading=false;hallRanking.error=ONLINE_NOTICE;if(hallDialog==='ranking')renderHallDialog();return;}
 const request=++rankRequest;hallRanking.loading=true;hallRanking.error='';if(hallDialog==='ranking')renderHallDialog();
 if(!navigator.onLine){hallRanking.loading=false;hallRanking.error='El Ranking de Mundo necesita conexión.';if(hallDialog==='ranking')renderHallDialog();return;}
 try{uid=await ensurePlayer();const next=await command('world_rank',{period:hallRanking.period,date:hallRanking.date,hour:Number(hallRanking.hour),offset:hallRanking.offset});if(request!==rankRequest)return;hallRanking.data=next;}
 catch(error){if(request!==rankRequest)return;hallRanking.error=error.message||'No se ha podido consultar el ranking.';}
 if(request===rankRequest){hallRanking.loading=false;if(hallDialog==='ranking')renderHallDialog();}
}
async function refreshMetrics(){
 if(!ONLINE_ENABLED){metricState={entries:[],loading:false,error:''};renderHallDialog();return;}
 const request=++metricsRequest;metricState.loading=navigator.onLine;metricState.error='';renderHallDialog();
 if(!navigator.onLine){metricState.error='Sin conexión: se muestran tus partidas locales. Conecta para consultar Mundo y Duelo.';renderHallDialog();return;}
 try{uid=await ensurePlayer();const next=await command('my_metrics');if(request!==metricsRequest)return;metricState.entries=next.entries||[];}
 catch(error){if(request!==metricsRequest)return;metricState.error=error.message||'No se han podido consultar tus métricas online.';}
 if(request===metricsRequest){metricState.loading=false;if(hallDialog==='ranking')renderHallDialog();}
}
async function openHallRanking(){metricView='personal';openHallDialog('ranking','hall-ranking');await refreshMetrics();}
function renderPaused(){
 inventorySelection=null;
 const own=ownPlayer(),totals={X:0,O:0};room.players.forEach(p=>{if(p.symbol)totals[p.symbol]+=p.score;});
 const mode=isLocal()?(room.mode==='solo'?'VS máquina':'Sin conexión'):room.kind==='duel'?'Duelo':'Sala libre';
 const timer=room.pauseDuelMs==null?'':`${Math.floor(room.pauseDuelMs/60000)}:${String(Math.floor(room.pauseDuelMs/1000)%60).padStart(2,'0')} de duelo conservados`;
 const list=gameRank();
 const ranking=`<section class="paused-ranking" aria-label="Ranking de la partida pausada"><h2 class="heading">Marcador</h2><ol>${list.map((p,i)=>`<li class="${p.id===uid?'me '+own.symbol.toLowerCase():''}"><b class="rank-position ${['gold','silver','bronze'][i]||''}">${i+1}</b><div><strong>${escape(p.name)}${p.id===uid?' · tú':''}</strong><span>${p.score.toLocaleString('es-ES')} puntos · #MAX ${maxLabel(p)}</span><small>Combo máx. ${comboLabel(p)} · ${escape(rodentLabel(room,p.id))}</small></div></li>`).join('')}</ol></section>`;
 const inspection=savedMapModel(room,own);
 const inspectButton=(action,kind,label)=>`<button data-inspect-action="${action}" aria-label="${label}" title="${label}">${navIcon(kind)}</button>`;
 const mapControls=inspection?`<nav class="inspection-controls" aria-label="Controles del mapa guardado"><span>${inspection.terrain.length.toLocaleString('es-ES')} casillas <span class="map-dimensions">· ${inspection.bounds.width-4} × ${inspection.bounds.height-4}</span></span>${inspectButton('fit','fit','Ver mapa completo')}${inspection.active?inspectButton('own','center','Mi territorio'):''}${inspection.target?inspectButton('rival','above','Rival superior'):''}${pauseMapOpen?iconButton('close-pause-map','restore','Salir de pantalla completa'):iconButton('expand-pause-map','fullscreen','Ampliar mapa a pantalla completa')}</nav>`:'';
 const mapStatus=inventoryStatusMarkup(room,{paused:true,playerId:uid}),mapEcology=`<nav class="inspection-controls ecology-controls" aria-label="Fauna y fenómenos del territorio">${ecologyNavigationMarkup(room,uid,{inspection:true})}</nav>`;
 const canvas='<svg class="inspection-canvas" tabindex="0" role="img" aria-label="Tablero guardado: arrastra o pellizca para inspeccionar. Con teclado, flechas para moverte y más o menos para acercar."></svg>';
 const minimap=inspection?`<section class="paused-minimap inspection-panel" aria-label="Mapa de la partida pausada">${mapControls}${mapStatus}${canvas}${mapEcology}</section>`:'';
 disposeInspection?.();disposeInspection=null;
 app.innerHTML=`<section class="lobby paused-game"><header class="row spread lobby-header"><span class="brand heading">#3</span><span class="tag">${VERSION_LABEL} · ${mode}</span></header><h1 class="heading">Partida pausada</h1><p class="instructions">Tablero, puntos y turno guardados.${!isLocal()?` Pausa compartida. ${escape(timer)}`:''}</p><section class="paused-scores" aria-label="Puntuación de los equipos"><strong class="x">X ${totals.X}</strong><strong class="o">O ${totals.O}</strong></section><nav class="paused-actions" aria-label="Acciones de partida pausada">${iconButton('resume','play',isLocal()?'Retomar partida':'Solicitar reanudación','class="primary"')}${iconButton('go-hall','home','Volver al hall')}${iconButton('go-games','games','Mis partidas')}${isLocal()||room.host===uid?iconButton('finish','finish','Finalizar partida','class="danger"'):''}</nav>${voteMarkup(room.vote,uid)}<div class="paused-details">${ranking}${minimap}</div><p class="paused-turn muted">${room.timeMode==='untimed'?'Sin reloj':'Con reloj'} · ${ownPair()?.pending?'Ampliación pendiente':'Turno '+(ownPair()?.turn||'')} · ${room.level==='advanced'?'Avanzado':'Normal'}</p></section>`;
 if(inspection){
   if(pauseMapOpen){document.querySelector('.paused-game').inert=true;app.insertAdjacentHTML('beforeend',`<div class="inspection-overlay"><section class="inspection-panel inspection-fullscreen" role="dialog" aria-modal="true" aria-label="Mapa de la partida pausada">${mapControls}${mapStatus}${canvas}${mapEcology}</section></div>`);}
   const panel=document.querySelector(pauseMapOpen?'.inspection-fullscreen':'.paused-minimap');
   disposeInspection=bindInspection(panel,inspection,pauseMapState,value=>{mapInteracting=value;if(!value&&mapDeferred){mapDeferred=false;render();}});
 }
 renderFinish();renderLeave();renderInventory();
}
function suspendLocal(){
 if(!isLocal()||room.status!=='playing'||busy)return;
 try{clearTimeout(machineTimer);accept(localCommand(room,'pause'));}catch{}
}
function timeModeSelector(id,value='timed'){
 return `<label for="${id}">Ritmo de la partida</label><select id="${id}"><option value="timed" ${value==='timed'?'selected':''}>◷ Con reloj · 33 segundos por turno</option><option value="untimed" ${value==='untimed'?'selected':''}>Por turnos · sin reloj</option></select>`;
}

function playHallMode() {
  if(!modeAvailable(hallMode)){notify(ONLINE_NOTICE);return;}
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
    <div class="row spread"><span>${count} jugador${count!==1?'es':''}</span><span class="muted">${finished?'Resultados individuales':duel?`${teams?'Equipos X/O':'1 contra 1'} · ${room.timeMode==='untimed'?'Sin reloj':room.durationSeconds/60+' min'}`:'Mundo continuo'}</span></div>
    ${!finished&&duel&&host?symbolSelector(room.hostSymbol||'X','lobby-symbol'):''}${!finished&&duel?`<p class="instructions">${room.hostSymbol?`El creador juega con <strong class="${room.hostSymbol.toLowerCase()}">${room.hostSymbol}</strong>. ${teams?'Los demás equipos y parejas se sortean.':`Su rival juega con <strong class="${room.hostSymbol==='X'?'o':'x'}">${room.hostSymbol==='X'?'O':'X'}</strong>.`}`:'El creador puede elegir X u O antes de empezar.'} X siempre empieza.</p>`:''}
    <p class="instructions">Nivel <strong>${room.level==='advanced'?'Avanzado':'Normal'}</strong> · ${room.level==='advanced'?'Figuras básicas y grupos unidos por los lados.':'Líneas, L, cruces y cuadrados.'} Todas las figuras nuevas suman.</p>
    ${finished?`<p class="max-note">${room.commonWorld?'#MAX oficial':'#MAX de referencia'} · Combo máx.: puntos de una sola jugada, incluidos bonus. Los datos nuevos se registran desde esta versión.</p>`:''}<ol class="player-list">${(finished?list:players).map((p,i)=>`<li><span>${finished?`${i+1}. `:''}${escape(p.name)}${p.id===uid?' · tú':''}${p.id===room.host?' <span class="host">ANFITRIÓN</span>':''}</span><span class="${p.symbol?.toLowerCase()||'muted'}">${finished?`${p.score} ptos · ${p.figures} figuras<span class="result-metrics">#MAX ${maxLabel(p)} · Combo máx. ${comboLabel(p)}</span>`:duel&&room.hostSymbol&&(p.id===room.host||!teams)?(p.id===room.host?room.hostSymbol:room.hostSymbol==='X'?'O':'X'):'Listo'}</span></li>`).join('')}</ol>
    ${!finished?`<p class="instructions">${host?duel?room.timeMode==='untimed'?'Al iniciar se forman las parejas, respetando el símbolo del creador. Cada uno mueve cuando pueda.':'Al iniciar se forman las parejas, respetando el símbolo del creador, y arranca el reloj del duelo.':'Al iniciar se sortean las parejas y los símbolos. Quien no tenga rival juega contra la máquina.': 'El anfitrión iniciará la partida cuando estéis todos.'}</p>${host?`<button class="primary" data-action="start" ${!canStart?'disabled':''} style="width:100%">Iniciar partida</button>${!canStart?`<p class="instructions">${teams?'Necesitamos un número par de al menos 4 jugadores.':'Necesitamos exactamente 2 jugadores para el duelo.'}</p>`:''}`:''}`:''}
    <div class="footer-actions">${finished?`<button class="ghost small" data-action="go-games">Mis partidas</button>${hallReturnButton('home')}`:'<button class="ghost small" data-action="go-games">Mis partidas</button><button class="ghost small danger" data-action="abandon">Abandonar sala</button>'}${!finished&&host&&!room.commonWorld?'<button class="ghost small danger" data-action="finish">Cerrar sala para todos</button>':''}</div></section>`;
  document.querySelectorAll('[name="lobby-symbol"]').forEach(input=>input.addEventListener('change',async()=>{if(busy)return;save('hash3_symbol',input.value);await run(async()=>accept(await command('choose_symbol',{code:room.code,symbol:input.value})));}));
  renderFinish();renderLeave();renderInventory();
}
async function run(operation) {
  if(busy)return;busy=true;
  const buttons=[...app.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);
  try{await operation();connected=true;}catch(error){if(inventoryCardChoice&&!inventoryCardChoice.applied&&!inventorySelection&&!superHelpPlan&&!ownPair()?.strategicExpansion)inventoryCardChoice=null;notify(error.message||'No se ha podido conectar. Inténtalo de nuevo.');}
  finally{busy=false;if(room){render();scheduleMachine();}else buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}
}
app.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  let action=b.dataset.action;
  if(action==='expand-pause-map'||action==='close-pause-map'){
    pauseMapOpen=action==='expand-pause-map';renderPaused();document.querySelector(pauseMapOpen?'[data-action="close-pause-map"]':'[data-action="expand-pause-map"]')?.focus({preventScroll:true});return;
  }
  if(action==='toggle-game-menu'){
    const menu=b.parentElement.querySelector('.saved-game-menu'),open=menu.hidden;
    document.querySelectorAll('.saved-game-menu').forEach(m=>m.hidden=true);document.querySelectorAll('[data-action="toggle-game-menu"]').forEach(t=>t.setAttribute('aria-expanded','false'));
    menu.hidden=!open;b.setAttribute('aria-expanded',String(open));return;
  }
  if(action==='pin-game'){pinSavedGame(b.closest('.saved-game'));return;}
  if(action==='invalid-cell'){if(!busy&&room?.status==='playing'&&ownPair()?.turn===ownPlayer()?.symbol&&!ownPair()?.pending){b.classList.remove('invalid-flash');void b.offsetWidth;b.classList.add('invalid-flash');setTimeout(()=>b.classList.remove('invalid-flash'),360);}return;}
  if(action==='delete-game'){
    const local=b.dataset.local==='true',game=local?localGames().find(g=>g.id===b.dataset.id):myGames.online?.find(g=>g.id===b.dataset.id);
    if(!game)return;try{assertGameDeletionAllowed(localStorage,{...game,local},uid);}catch(error){notify(error.message);return;}pendingDelete={...game,local};renderDeleteGame();return;
  }
  if(action==='cancel-delete'){pendingDelete=null;document.querySelector('.delete-dialog')?.remove();return;}
  if(action==='confirm-delete'){
    const target=pendingDelete;if(!target)return;
    await run(async()=>{
      assertGameDeletionAllowed(localStorage,target,uid);
      if(target.local)deleteLocalGame(localStorage,target.id);
      else {uid=await ensurePlayer();await previewRequests.get(`${uid}:${target.id}`)?.catch(()=>{});assertGameDeletionAllowed(localStorage,target,uid);await command('remove_game',{code:target.code});myGames.online=myGames.online?.filter(g=>g.id!==target.id)||[];}
      pendingDelete=null;document.querySelector('.delete-dialog')?.remove();renderHallDialog();
    });return;
  }
  if(action==='hall-achievements'){achievementView=achievementSelection(loadTerritoryResults(localStorage,localGames()),achievementView||{});openHallDialog('achievements','hall-achievements');return;}
  if(action==='hall-inventory'){openHallDialog('inventory','hall-inventory');return;}
  if(action==='profile-copy-ready'){await copySavedProfileLink();return;}
  if(action==='profile-generate'||action==='profile-renew-confirm'){
   if(busy)return;
   const renew=action==='profile-renew-confirm';
   profileStatus('profile-copy-status',renew?'Renovando el enlace…':'Generando tu enlace…');
   busy=true;
   try{
    await generateProfileAccess(renew);
    document.querySelector('#profile-renew-confirm').hidden=true;
    profileStatus('profile-copy-status',renew?'Enlace renovado. El anterior ya no sirve. Pulsa Copiar enlace.':'Enlace creado. Pulsa Copiar enlace para llevártelo a otro navegador.','ok');
   }catch(error){
    profileStatus('profile-copy-status',error.message||'No se pudo generar el enlace.','error');
    if(error.message?.includes('Ya existe un enlace'))document.querySelector('#profile-renew-confirm').hidden=false;
   }finally{busy=false;}
   return;
  }
  if(action==='profile-renew'){document.querySelector('#profile-renew-confirm').hidden=false;return;}
  if(action==='profile-renew-cancel'){document.querySelector('#profile-renew-confirm').hidden=true;return;}
  if(action==='profile-share'){
   const link=localProfileLink();if(!link)return;
   if(navigator.share){
    try{await navigator.share({title:'#3 · Acceso a mi perfil',url:link});}
    catch(error){if(error?.name!=='AbortError')profileStatus('profile-copy-status','No se pudo compartir. Prueba Copiar enlace.','error');}
   }else await copySavedProfileLink();
   return;
  }
  if(action==='events'){eventsOpen=!eventsOpen;inventoryOpen=false;render();return;}
  if(action==='close-events'){eventsOpen=false;renderEvents();document.querySelector('[data-action="events"]')?.focus();return;}
  if(action==='inventory'){eventsOpen=false;inventoryOpen=!inventoryOpen;if(inventorySelection)inventoryCardChoice=null;inventorySelection=null;render();return;}
  if(action==='close-inventory'){inventoryOpen=false;render();document.querySelector('[data-action="inventory"]')?.focus({preventScroll:true});return;}
  if(action==='practice-hint'){
    const kind=b.dataset.tool||'hint';
    if(!canUsePracticeTool(room,uid,kind)){notify('Herramienta no disponible en este turno.');return;}
    inventoryCardChoice={player:uid,tool:kind,at:performance.now(),applied:false};inventorySelection=null;inventoryOpen=false;render();
    if(kind==='hint-expand'){await run(async()=>{const id=room.id,version=room.version,point=await analyzeHelp('expand');if(room.id!==id||room.version!==version)throw new Error('La partida ha cambiado.');const next=useExpansionHint(room,uid,Date.now(),point);selectedExpansion={x:point.x,y:point.y};inventoryOpen=false;accept(next);center(point.x+1,point.y+1);notify('Ampliación sugerida. Puedes colocarla o elegir otra.');});return;}
    if(kind==='super-hint'){await run(async()=>{superHelpPlan=await analyzeHelp('super');inventoryOpen=false;render();});return;}
    await run(async()=>{const next=usePracticeHint(room,uid);inventoryOpen=false;accept(next);center(next.practiceHint.x,next.practiceHint.y);});return;
  }
  if(action==='cancel-super-help'){inventoryCardChoice=null;superHelpPlan=null;render();return;}
  if(action==='confirm-super-help'){await run(async()=>{const plan=superHelpPlan,next=executeSuperHelp(room,plan);superHelpPlan=null;accept(next);notify(`Súper Ayuda completada · +${plan.points} puntos.`);});return;}
  if(action==='practice-tool'){
    const tool=b.dataset.tool,toolPlayer=b.dataset.player||uid;
    if(!canUsePracticeTool(room,toolPlayer,tool)){notify('Herramienta no disponible en este turno.');return;}
    inventoryCardChoice={player:toolPlayer,tool,at:performance.now(),applied:false};inventorySelection=null;
    if(!['double','rival','combo','immunity'].includes(tool)){inventorySelection={player:uid,tool};inventoryOpen=false;render();return;}
    await run(async()=>{const next=localCommand(room,'inventory',{tool,playerId:toolPlayer});inventoryOpen=false;accept(next);});return;
  }
  if(action==='cancel-tool-selection'){inventoryCardChoice=null;inventorySelection=null;render();return;}
  if(action==='rotate-border'&&inventorySelection?.tool==='border'){const i=frontierDirections.indexOf(inventorySelection.side||'north');inventorySelection.side=frontierDirections[(i+1)%4];delete inventorySelection.point;render();return;}
  if(action==='inventory-target'&&['frontier','border'].includes(inventorySelection?.tool)){
    const choice=selectFrontier(inventorySelection,{x:Number(b.dataset.x),y:Number(b.dataset.y)},inventorySelection.tool==='border'?borderOptions(room,inventorySelection.side||'north'):frontierAnchors(room,uid));
    inventorySelection=choice.selected;
    if(choice.confirm)action='confirm-area-tool';else{render();return;}
  }
  if(action==='inventory-target'&&inventorySelection?.tool==='bomb'){
    const selection=inventorySelection,point={x:Number(b.dataset.x),y:Number(b.dataset.y)};
    if(selection.player!==uid)return;
    if(selection.point?.x===point.x&&selection.point?.y===point.y)action='confirm-area-tool';
    else{selection.point=point;render();return;}
  }
  if(action==='confirm-area-tool'){
    const selection=inventorySelection;if(!selection?.point)return;
    await run(async()=>{const next=localCommand(room,'inventory',{tool:selection.tool,playerId:uid,...selection.point,side:selection.side||'north'});inventorySelection=null;accept(next);notify(selection.tool==='tornado'?'Tornado: mezcla las fichas y los huecos del 3×3.':selection.tool==='frontier'?(next.pairs[0].pending?'Muro colocado. Ahora sitúa tu ampliación 3×3.':'Muro colocado. Coloca tu ficha.'):`${practiceTools.find(t=>t.id===selection.tool).label} aplicada. Coloca tu ficha.`);});return;
  }
  if(action==='inventory-target'){
    const selection=inventorySelection;
    if(!selection||selection.player!==uid)return;
    if(['tornado','bomb'].includes(selection.tool)){selection.point={x:Number(b.dataset.x),y:Number(b.dataset.y)};render();return;}
    if(selection.tool==='shift'&&!selection.source){const cell=room.cells.find(c=>c.x===Number(b.dataset.x)&&c.y===Number(b.dataset.y));if(!cell)return;selection.source={...cell};render();return;}
    await run(async()=>{
      const destination={x:Number(b.dataset.x),y:Number(b.dataset.y)},payload=selection.source?{x:selection.source.x,y:selection.source.y,toX:destination.x,toY:destination.y}:destination;
      const next=localCommand(room,'inventory',{tool:selection.tool,playerId:uid,...payload});
      inventorySelection=null;accept(next);if(!next.lastEvent.points)notify(`${practiceTools.find(t=>t.id===selection.tool).label} aplicada. Los puntos se conservan; coloca tu ficha.`);
    });return;
  }
  if(action==='hall-games'){await openMyGames();return;}
  if(action==='go-games'){await goToGames();return;}
  if(action==='go-hall'){await run(async()=>goToHall());return;}
  if(action==='rank-period'){hallRanking.period=b.dataset.period;hallRanking.offset=0;await refreshWorldRank();return;}
  if(action==='rank-page'){hallRanking.offset=Number(b.dataset.offset);await refreshWorldRank();return;}
  if(action==='refresh-rank'){await refreshWorldRank();return;}
  if(action==='load-game'){
    await run(async()=>{const row=b.closest('.saved-game');row?.classList.add('is-opening');await new Promise(resolve=>setTimeout(resolve,110));let next;if(b.dataset.local==='true'){next=localGames().find(g=>g.id===b.dataset.id);if(!next)throw new Error('Esta partida no está disponible.');}
    else{uid=await ensurePlayer();next=await command('get',{code:b.dataset.code});const me=next.players.find(p=>p.id===uid);if(me?.active===false&&next.status!=='finished')next=await command('join',{code:b.dataset.code,name:me.name});}
    hallHistory=[];hallDialog=null;selectedExpansion=null;accept(next);});b.closest('.saved-game')?.classList.remove('is-opening');return;
  }
  if(action==='pause'||action==='resume'||action==='vote-yes'||action==='vote-no'){
    await run(async()=>{const vote=action.startsWith('vote-');rankOpen=false;const next=isLocal()?localCommand(room,action):await command(vote?'vote':action,{code:room.code,voteId:room.vote?.id,yes:action==='vote-yes'});accept(next);});return;
  }
  if(action==='close-ranking'){setRankingOpen(false);return;}
  if(action==='map'||action==='close-map'){worldMapOpen=action==='map';if(worldMapOpen&&rankOpen){rankOpen=false;render();}document.querySelector('.world-map').hidden=!worldMapOpen;if(worldMapOpen)document.querySelector('.world-map').dispatchEvent(new Event('map-open'));document.querySelector(worldMapOpen?'.world-map [data-action="close-map"]':'.game-minimap')?.focus({preventScroll:true});return;}
  if(action==='pair-start'){await run(async()=>{acceptPair(await command('pair_start',{code:pairLobby.code}));});return;}
  if(action==='pair-leave'){await run(async()=>{await command('pair_leave',{code:pairLobby.code});pairLobby=null;save('hash3_pair',null);renderHome();});return;}
  if(action==='pair-copy-code'){await copyGameCode(pairLobby.code,'Código de pareja');return;}
  if(action==='copy-room-code'){await copyGameCode(room.code,'Código de sala');return;}
  if(action==='pair-share'){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('pareja',pairLobby.code);await copyGameCode(url.href,'Invitación de pareja');return;}

  if(action==='hall-mode'){
    if(!hallModes.some(m=>m.id===b.dataset.mode)||!modeAvailable(b.dataset.mode))return;hallMode=b.dataset.mode;hallModeSelected=true;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(action==='hall-play'){playHallMode();return;}
  if(action==='hall-home'){if(!pendingDelete){hallHistory=[];closeHallDialog();}return;}
  if(action==='hall-close'){if(!pendingDelete)closeHallDialog();return;}
  if(action==='hall-ranking'){await openHallRanking();return;}
  if(action==='metrics-view'){metricView=b.dataset.view;renderHallDialog();if(metricView==='world')await refreshWorldRank();return;}
  if(action==='achievements-mode'||action==='achievements-goal'||action==='achievements-target'||action==='achievements-metric'){
    const view=achievementView||{};
    if(action==='achievements-mode')achievementView={mode:b.dataset.mode,metric:view.metric};
    if(action==='achievements-goal')achievementView={mode:view.mode,goal:b.dataset.goal,metric:view.metric};
    if(action==='achievements-target')achievementView={...view,target:Number(b.dataset.target),comparison:null};
    if(action==='achievements-metric')achievementView={...view,metric:b.dataset.metric};
    achievementView=achievementSelection(loadTerritoryResults(localStorage,localGames()),achievementView);renderHallDialog();return;
  }
  if(action==='metrics-mode'){metricView='personal';metricMode=b.dataset.mode;renderHallDialog();return;}
  if(action==='refresh-metrics'){await refreshMetrics();return;}
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
  if(action==='locate-ecology'){
    const kind=b.dataset.ecologyKind,item=nextEcologyTarget(ecologyTargets(room,kind,uid),ecologyFocus[kind]);if(!item)return;
    ecologyFocus[kind]=item.id;
    const map=b.closest('.world-map');if(map){map.dispatchEvent(new CustomEvent('map-focus',{detail:{x:item.x+.5,y:item.y+.5}}));return;}
    rankOpen=false;worldMapOpen=false;zoom=1;render();center(item.x,item.y);return;
  }
  if(action==='locate-territory'){const event=room.territoryEvents?.find(e=>e.id===b.dataset.id);if(event){zoom=1;render();center(event.x+.5,event.y+.5);}return;}
  if(action==='center'){rankOpen=false;worldMapOpen=false;zoom=1;render();const p=ownPair();center(p.active.x+1,p.active.y+1);document.querySelector('.game-minimap')?.focus({preventScroll:true});return;}
  if(action==='locate'){const target=above(),pair=room.pairs.find(p=>p.id===target?.pair),move=target?.lastMove||(pair?{x:pair.active.x+1,y:pair.active.y+1}:null);if(move){rankOpen=false;worldMapOpen=false;zoom=1;render();center(move.x,move.y);document.querySelector('.game-minimap')?.focus({preventScroll:true});}return;}
  if(action==='plus'||action==='minus'||action==='zoom-level'){changeMapZoom(action==='zoom-level'?(zoom<.75?1:zoom<1.3?1.6:.55):zoom*(action==='plus'?1.25:.8));return;}
  if(action==='board-overview'){
    const v=document.querySelector('.viewport'),r=v.getBoundingClientRect(),x=layout.minX+(v.scrollLeft+e.clientX-r.left-v.clientLeft-layout.padding)/layout.size-.5,y=layout.minY+(v.scrollTop+e.clientY-r.top-v.clientTop-layout.padding)/layout.size-.5;
    zoom=1;render();center(x,y);return;
  }
  if(action==='fit-board'){
    if(room.commonWorld)return;
    const v=document.querySelector('.viewport'),fit=extensionView(terrainOf(room),{width:v.clientWidth,height:v.clientHeight},innerWidth<=760?48:56);
    if(fit){zoom=fit.zoom;render();center(fit.x,fit.y);}
    return;
  }
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
  if(action==='finish'){setRankingOpen(false);finishOpen=true;renderFinish();return;}
  if(action==='cancel-finish'){finishOpen=false;document.querySelector('.finish-dialog')?.remove();return;}
  if(action==='confirm-finish'){finishOpen=false;}
  if(action==='select-expansion'){const choice=selectExpansion(selectedExpansion,{x:Number(b.dataset.x),y:Number(b.dataset.y)});selectedExpansion=choice.selected;if(choice.confirm)action='confirm-expansion';else{const controls=document.querySelector('.expansion-controls');if(controls){controls.querySelector('span').textContent=expansionSummary();controls.querySelector('[data-action="confirm-expansion"]').disabled=false;}refreshBoard();return;}}
  if(action==='setup-solo'||action==='setup-local'){localReturnDialog=hallDialog;hallHistory=[];closeHallDialog(false);localSetup=action==='setup-solo'?'solo':'local';renderLocalSetup();return;}
  if(action==='cancel-local'){localSetup=null;document.querySelector('.local-dialog')?.remove();if(localReturnDialog){openHallDialog(localReturnDialog);localReturnDialog=null;}return;}
  if(action==='start-local'){
    const name=document.querySelector('#local-name').value.trim(),second=document.querySelector('#second-name')?.value.trim()||'Jugador 2';
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');document.querySelector('#local-name').focus();return;}
    const level=document.querySelector('#local-level').value,timeMode=document.querySelector('#local-time-mode').value,difficulty=document.querySelector('[name="machine-difficulty"]:checked')?.value||'medium',playerSymbol=document.querySelector('[name="local-symbol"]:checked').value;save('hash3_name',name);save('hash3_symbol',playerSymbol);
    const machineInventory=document.querySelector('#machine-inventory')?.checked===true,ecology={cellTarget:document.querySelector('#local-goal-type').value==='cells'?Number(document.querySelector('#local-goal-target').value):undefined,matchGoal:['time','moves'].includes(document.querySelector('#local-goal-type').value)?{type:document.querySelector('#local-goal-type').value,target:Number(document.querySelector('#local-goal-target').value)}:undefined,faunaEnabled:document.querySelector('#fauna-enabled').checked,territoryEnabled:document.querySelector('#territory-enabled').checked};save('hash3_goal_type',document.querySelector('#local-goal-type').value);save('hash3_goal_target',document.querySelector('#local-goal-target').value);save('hash3_fauna_enabled',String(ecology.faunaEnabled));save('hash3_territory_enabled',String(ecology.territoryEnabled));save('hash3_local_time_mode',timeMode);
    if(localSetup==='solo'){save('hash3_difficulty',difficulty);save('hash3_machine_inventory',machineInventory?'true':'false');}
    localSetup=null;selectedExpansion=null;accept(createLocal(document.querySelector('.local-dialog [data-mode]').dataset.mode,name,second,Date.now(),level,timeMode,difficulty,playerSymbol,machineInventory,ecology));return;
  }
  if(action==='resume-local'){closeHallDialog(false);try{const next=savedLocal();if(!['solo','local'].includes(next.mode))throw new Error();accept(next);}catch{notify('No se ha podido recuperar la partida local.');}return;}
  const payload={code:room.code};
  if(action==='move'||action==='expand'){payload.x=Number(b.dataset.x);payload.y=Number(b.dataset.y);}
  if(action==='move')payload.requestId=crypto.randomUUID();
  await run(async()=>{
    const effectiveAction=action==='confirm-finish'?'finish':action==='confirm-expansion'?'expand':action;
    if(effectiveAction==='expand'){if(!selectedExpansion)return;Object.assign(payload,selectedExpansion);}
    const next=isLocal()?localCommand(room,effectiveAction,payload):await command(effectiveAction,payload);
    if(['expand','request-free-expansion','cancel-free-expansion'].includes(effectiveAction)){selectedExpansion=null;if(['hint-expand','frontier','border'].includes(inventoryCardChoice?.tool))inventoryCardChoice=null;}
    if(action==='leave'){room=null;render();return;}
    accept(next);
  });
});
document.addEventListener('keydown',e=>{
  if(superHelpPlan){
   if(e.key==='Escape'){e.preventDefault();inventoryCardChoice=null;superHelpPlan=null;render();return;}
   if(e.key==='Tab'){const buttons=[...document.querySelectorAll('.super-help-dialog button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
   return;
  }
  if(rankOpen&&e.key==='Escape'){e.preventDefault();setRankingOpen(false);return;}
  if(e.key==='Escape'&&eventsOpen){e.preventDefault();eventsOpen=false;renderEvents();document.querySelector('[data-action="events"]')?.focus({preventScroll:true});return;}
  if(e.key==='Escape'&&(inventoryOpen||inventorySelection)){e.preventDefault();if(inventorySelection)inventoryCardChoice=null;inventoryOpen=false;inventorySelection=null;render();document.querySelector('[data-action="inventory"]')?.focus({preventScroll:true});return;}
  if(e.key==='Escape'&&worldMapOpen){e.preventDefault();worldMapOpen=false;document.querySelector('.world-map').hidden=true;document.querySelector('.game-minimap')?.focus({preventScroll:true});return;}
  const radio=e.target.closest?.('.hall-modes [role="radio"]');
  if(radio&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
    e.preventDefault();const enabled=hallModes.filter(m=>modeAvailable(m.id)),i=enabled.findIndex(m=>m.id===radio.dataset.mode),step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
    const next=e.key==='Home'?0:e.key==='End'?enabled.length-1:(i+step+enabled.length)%enabled.length;
    hallMode=enabled[next].id;hallModeSelected=true;renderHome();document.querySelector(`[data-mode="${hallMode}"][role="radio"]`)?.focus();return;
  }
  if(pauseMapOpen){
    if(e.key==='Escape'){e.preventDefault();pauseMapOpen=false;renderPaused();document.querySelector('[data-action="expand-pause-map"]')?.focus({preventScroll:true});return;}
    if(e.key==='Tab'){const nodes=[...document.querySelectorAll('.inspection-fullscreen button,.inspection-fullscreen [tabindex="0"]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(e.key==='Escape'&&document.querySelector('.saved-game-menu:not([hidden])')){e.preventDefault();const menu=document.querySelector('.saved-game-menu:not([hidden])');menu.hidden=true;const toggle=menu.parentElement.querySelector('[data-action="toggle-game-menu"]');toggle.setAttribute('aria-expanded','false');toggle.focus();return;}
  if(pendingDelete){
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
  if(!ONLINE_ENABLED)return;
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
window.addEventListener('resize',()=>{if(room?.status==='playing'){blinkId=null;if(mapInteracting)mapDeferred=true;else render();}});
setInterval(poll,1800);
async function init(){
 const incoming=profileToken(location.href,location.href),hasProfile=new URLSearchParams(location.hash.slice(1)).has('perfil');
 renderHome();
 if(ONLINE_ENABLED&&incoming){
  try{await loadProfileAccess(profileUrl(incoming,location.href));}
  catch(error){hallDialog='profile';renderHome();profileStatus('profile-restore-status','No se pudo cargar automáticamente: '+error.message+' Puedes volver a intentarlo desde aquí.','error');}
  return;
 }
 if(hasProfile){
  hallDialog='profile';renderHome();
  profileStatus('profile-restore-status',ONLINE_ENABLED?'El enlace no tiene el formato correcto. Tu perfil actual se conserva.':'Perfil online · En construcción. Tu acceso guardado se conserva.',ONLINE_ENABLED?'error':'info');
  return;
 }
  const pendingPair=read('hash3_pair');if(ONLINE_ENABLED&&pendingPair&&navigator.onLine){try{uid=await ensurePlayer();acceptPair(await command('pair_get',{code:pendingPair}));return;}catch{save('hash3_pair',null);}}
  try{
    if(sessionStorage.getItem('hash3_restore_local')==='1'){
      sessionStorage.removeItem('hash3_restore_local');
      const pointer=JSON.parse(read('hash3_local')),saved=localGames().find(g=>g.id===pointer?.id);
      if(saved){accept(saved);return;}
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
  return `<label for="${id}">${id==='local-level'?'Tipo de figuras':'Nivel de figuras'}</label><select id="${id}"><option value="normal" ${level==='normal'?'selected':''}>${id==='local-level'?'Sencillas (Normal)':'Normal'} · líneas, L, cruces y cuadrados</option><option value="advanced" ${level==='advanced'?'selected':''}>${id==='local-level'?'Complejas (Avanzado)':'Avanzado'} · también figuras complejas</option></select><p>Ambos niveles suman todas las figuras nuevas de una jugada. En Avanzado también cuenta el grupo completo de fichas del mismo símbolo unido por los lados, si tiene una forma distinta de las básicas. El nivel es común a toda la sala.</p>`;
}
function renderRoomSetup(){
 document.querySelector('.room-dialog')?.remove();const setup=roomSetup;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop room-dialog"><section class="dialog game-mode-dialog ${hallModeClass(setup.kind)}" role="dialog" aria-modal="true" aria-labelledby="room-title"><h2 class="heading" id="room-title">Crear duelo</h2>${symbolSelector(setup.symbol,'duel-symbol')}<p>El creador elige su símbolo. X siempre empieza; en 1 contra 1 tu rival recibe el contrario.</p><label for="duel-format">Jugadores</label><select id="duel-format"><option value="solo" ${setup.format==='solo'?'selected':''}>1 contra 1</option><option value="teams" ${setup.format==='teams'?'selected':''}>Equipos X contra O</option></select>${timeModeSelector('room-time-mode',setup.timeMode)}${setup.timeMode==='timed'?`<label for="duel-minutes">Duración total</label><select id="duel-minutes">${[3,5,10].map(n=>`<option value="${n}" ${setup.minutes===n?'selected':''}>${n} minutos</option>`).join('')}</select><p>33 segundos por turno. El reloj total empieza al iniciar y, al terminar, gana X u O por puntos.</p>`:'<p>Sin límite por turno ni duración total. Cada jugada se guarda y queda esperando al rival. Podéis mover en momentos distintos y finalizar cuando decidáis.</p>'}${levelSelector('room-level',setup.level)}<p>Las pausas y reanudaciones se deciden por mayoría absoluta de los humanos activos.</p><div class="row">${hallReturnButton('cancel-room',{previous:true})}<button class="primary" data-action="create-room">Crear duelo</button></div></section></div>`);
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
 const copied=await copyText(code,{fallback:legacyCopyText});
 if(copied)notify(label+' copiado.');
 else{
  let field=document.querySelector('#share-export');if(!field){field=document.createElement('textarea');field.id='share-export';field.readOnly=true;field.setAttribute('aria-label',label+' para copiar');document.querySelector('.pair-share-actions,.score-room')?.append(field);}
  field.value=code;field.focus();field.select();notify('Selecciona el enlace o código y usa Copiar.');
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
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop local-dialog"><section class="dialog game-mode-dialog ${hallModeClass(hallMode==='offline'?'offline':'solo')}" role="dialog" aria-modal="true" aria-labelledby="local-title" data-mode="${localSetup}"><h2 class="heading" id="local-title">${localSetup==='solo'?'Contra la máquina':'Dos en este dispositivo'}</h2>${hallNameField(read('hash3_name'),{id:'local-name',label:localSetup==='solo'?'Tu apodo':'Tu nombre',placeholder:localSetup==='solo'?'Tú':'Jugador 1'})}${localSetup==='solo'?machineDifficultySelector(read('hash3_difficulty')):''}${localSetup==='local'?'<label for="second-name">Otro jugador</label><input id="second-name" placeholder="Jugador 2" maxlength="18">':''}${levelSelector('local-level')}${ecologyChoicesMarkup({machine:localSetup==='solo',machineInventory:read('hash3_machine_inventory')==='true',faunaEnabled:read('hash3_fauna_enabled')!=='false',territoryEnabled:read('hash3_territory_enabled')!=='false'},navIcon('inventory'))}${matchGoalsMarkup(read('hash3_goal_type')||'cells',Number(read('hash3_goal_target'))||33333)}${timeModeSelector('local-time-mode',read('hash3_local_time_mode')==='untimed'?'untimed':'timed')}${symbolSelector(read('hash3_symbol'),'local-symbol')}<p>X siempre empieza. ${localSetup==='solo'?'La máquina juega con el símbolo contrario al tuyo.':'El otro jugador usa el símbolo contrario. Pasad el dispositivo después de cada turno.'} <span id="local-time-hint"></span> Puedes pausar y volver al hall sin perder la partida.</p><div class="row">${hallReturnButton('cancel-local',{previous:!!localReturnDialog})}<button class="primary" data-action="start-local">Empezar</button></div></section></div>`);
  document.querySelectorAll('[name="machine-difficulty"]').forEach(input=>input.addEventListener('change',()=>{document.querySelector('#machine-level-hint').textContent=machineLevelHints[input.value];}));
  document.querySelector('#local-goal-type').addEventListener('change',e=>{const temporary=document.createElement('div');temporary.innerHTML=matchGoalsMarkup(e.target.value);document.querySelector('#local-goal-target-row').replaceWith(temporary.querySelector('#local-goal-target-row'));});
  const localClock=document.querySelector('#local-time-mode'),refreshClock=()=>{document.querySelector('#local-time-hint').textContent=localClock.value==='untimed'?'Sin límite por turno ni jugadas automáticas. Cada jugador espera a que juegue su rival.':'33 segundos por turno. Al agotarse se coloca una ficha automática; la pausa conserva el tiempo restante.';};
  localClock.addEventListener('change',refreshClock);refreshClock();
  (document.querySelector('#local-name:not([type="hidden"])')||document.querySelector('#second-name')||document.querySelector('[name="machine-difficulty"]:checked')||document.querySelector('#local-level')).focus();
}
function updateTimer() {
  if(!room||room.status!=='playing')return;
  for(const node of document.querySelectorAll('.territory-countdown')){const event=room.territoryEvents?.find(e=>e.id===node.dataset.territoryId);if(event){const seconds=Math.max(0,Math.ceil((event.remainingMs??event.nextAt-Date.now())/1000));node.textContent=seconds;node.setAttribute('aria-label',`${seconds} segundos`);}}
  const clockNow=Date.now(),clocks=new Map();
  for(const node of document.querySelectorAll('.ecology-clock')){
    const kind=node.dataset.ecologyKind;if(!clocks.has(kind))clocks.set(kind,ecologyClockEvents(room,kind));
    const events=clocks.get(kind).filter(e=>!node.dataset.ecologySource||e.id===node.dataset.ecologySource);
    if(events.length){const seconds=Math.min(...events.map(e=>ecologySeconds(e,clockNow)));node.textContent=seconds;node.setAttribute('aria-label',`${seconds} segundos`);}
  }
  for(const node of document.querySelectorAll('[data-immunity-clock]')){const seconds=immunitySeconds(room,node.dataset.immunityClock,clockNow);node.textContent=seconds;node.setAttribute('aria-label',`${seconds} segundos de inmunidad`);}
  for(const node of document.querySelectorAll('[data-recovery-clock]'))node.textContent=Math.max(0,Math.ceil((room.ecologyRecovery?.remainingMs??((room.ecologyRecovery?.until??clockNow)-clockNow))/1000));
  if(document.querySelector('[data-appearance-clock]')){const rows=eventOutlook(room,uid,clockNow).rows;for(const node of document.querySelectorAll('[data-appearance-clock]'))node.textContent=rows.find(e=>e.clockKind===node.dataset.appearanceClock)?.seconds??0;}
  const p=ownPair(),node=document.querySelector('.turn-timer');
  const duel=document.querySelector('#duel-time');if(duel&&room.endsAt){const left=Math.max(0,Math.ceil((Date.parse(room.endsAt)-Date.now())/1000));duel.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');if(left===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);}
  if(node){node.hidden=!p?.deadline;if(node.hidden){node.textContent='';node.classList.remove('urgent');}}
  if(node&&p?.deadline) {
    const seconds=Math.max(0,Math.ceil((Date.parse(p.deadline)-Date.now())/1000));
    node.textContent=seconds+' s';node.classList.toggle('urgent',seconds<=5);
    if(seconds===0)document.querySelectorAll('[data-action="move"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
  }
}
function stopMachine(){clearTimeout(machineTimer);machineRequest++;machineWorker?.terminate();machineWorker=null;machinePendingKey=null;}
function scheduleMachine() {
  const turnKey=machineTurnKey(room,document.hidden);
  if(!turnKey){stopMachine();return;}
  if(machinePendingKey===turnKey)return;
  stopMachine();machinePendingKey=turnKey;
  const expected=room.id;
  machineTimer=setTimeout(()=>{
    if(machineTurnKey(room,document.hidden)!==turnKey||busy){stopMachine();return;}
    const request=machineRequest,version=room.version;
    const applyChoice=choice=>{
      if(request!==machineRequest||machineTurnKey(room,document.hidden)!==turnKey)return;
      if(busy){stopMachine();return;}
      machinePendingKey=null;
      try{accept(localCommand(room,choice.action,choice.payload));}
      catch{scheduleMachine();} // A worker may finish after a work changed its destination.
    };
    const fallback=()=>applyChoice(machineChoice(room,Math.random,{maxTimeMs:40,maxNodes:800}));
    try{
      const worker=new Worker(new URL('./machine-worker.js',import.meta.url),{type:'module'});machineWorker=worker;
      worker.onmessage=({data})=>{
        worker.terminate();if(machineWorker===worker)machineWorker=null;
        if(request!==machineRequest||machineTurnKey(room,document.hidden)!==turnKey)return;
        if(data.error)fallback();else if(data.id===expected&&data.version===version)applyChoice(data.choice);
      };
      worker.onerror=()=>{worker.terminate();if(machineWorker===worker)machineWorker=null;if(request===machineRequest&&machineTurnKey(room,document.hidden)===turnKey)fallback();};
      worker.postMessage({id:expected,room});
    }catch{fallback();}
  },room.lastEvent?.points?1500:650);
}
setInterval(()=>{
  updateTimer();
  if(isLocal()&&!busy&&!document.hidden&&needsLocalTick(room)) {
    const previous=room.lastEvent?.id,next=localCommand(room,'tick');if(next!==room){accept(next);if(next.lastEvent?.id!==previous&&!next.lastEvent?.points)notify(next.lastEvent?.kind==='expand'?'Tiempo agotado: ampliación automática.':'Tiempo agotado: jugada automática en una celda vacía.');}
  }
},500);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendLocal();else scheduleMachine();});
window.addEventListener('pagehide',suspendLocal);
function updateOfflineStatus() {
  const n=document.querySelector('#offline-status');if(!n)return;
  n.textContent=navigator.serviceWorker?.controller?'Preparado para jugar sin conexión.':'Los modos locales no necesitan cobertura durante la partida. Abre esta web una primera vez con internet.';
}
startUpdates({
  canReload:()=>(!room||room.status!=='playing')&&!pairLobby&&!worldMapOpen&&!pauseMapOpen&&!rankOpen&&!mapInteracting&&!busy&&!pendingDelete&&!inventoryOpen&&!hallDialog&&!localSetup&&!roomSetup&&!finishOpen&&!leaveOpen&&(!figureEffect||figureEffect.floatUntil<=performance.now())&&!document.activeElement?.matches('input,textarea'),
  beforeReload:()=>{
    if(isLocal()){save('hash3_local',JSON.stringify({id:room.id}));try{sessionStorage.setItem('hash3_restore_local','1');}catch{/* The saved game remains available from the start screen. */}}
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
function showScore(feedback,comboNotice=null) {
  const n=document.querySelector('#notice'),roomId=room.id;
  n.innerHTML=`<button class="score-notice-jump" aria-label="Ver jugada de ${escape(feedback.name)} · +${feedback.points} puntos"><strong class="score-notice-total ${feedback.symbol.toLowerCase()}">+${feedback.points}</strong><span class="score-notice-detail"><span>${escape(feedback.name)} · ${feedback.symbol}${feedback.automatic?' · jugada por tiempo':''}</span><b>${escape(scoreBreakdown(feedback)||'Figura completada')}</b>${comboNotice?`<span class="score-combo-progress" style="--combo-color:${getComputedStyle(document.querySelector('.game')).getPropertyValue('--mode-color')}">${escape(comboNotice.message)}</span>`:''}<span class="score-notice-hint">Toca para ver la jugada ↗</span></span></button>`;
  n.querySelector('button').addEventListener('click',()=>{
    if(room?.id!==roomId||room.status!=='playing')return;
    inventoryOpen=false;inventorySelection=null;worldMapOpen=false;zoom=Math.max(zoom,.8);
    startFigureEffect(feedback);render();center(feedback.move.x,feedback.move.y);
    n.classList.remove('visible');clearTimeout(noticeTimer);
  });
  n.classList.add('visible','score-notice');clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>n.classList.remove('visible'),4500);
}

function renderEvents(){
 document.querySelector('[data-action="events"]')?.setAttribute('aria-expanded',String(eventsOpen));
 document.querySelector('.events-sheet')?.remove();if(!eventsOpen||room?.status!=='playing')return;
 document.querySelector('.game-dock').insertAdjacentHTML('beforeend',`<section class="events-sheet" id="events-panel" role="region" aria-labelledby="events-title"><div class="inventory-sheet-heading"><h2 class="heading" id="events-title">Próximos eventos</h2><button data-action="close-events" aria-label="Cerrar próximos eventos">×</button></div><div class="event-outlook-body">${eventOutlookMarkup(room,uid)}</div></section>`);
}
function renderInventory(){
 document.querySelector('.inventory-sheet')?.remove();if(!inventoryOpen||room?.status!=='playing')return;
 document.querySelector('.game-dock').insertAdjacentHTML('beforebegin',`<section class="inventory-sheet" id="inventory-panel" role="region" aria-labelledby="inventory-title"><div class="inventory-sheet-heading"><h2 class="heading" id="inventory-title">Inventario</h2><button data-action="close-inventory" aria-label="Cerrar inventario">×</button></div><div class="inventory-sheet-body">${inventoryMarkup(room,uid)}</div></section>`);
 document.querySelector('[data-action="close-inventory"]')?.focus({preventScroll:true});
}
function renderDeleteGame(){
 document.querySelector('.delete-dialog')?.remove();if(!pendingDelete)return;
 const g=pendingDelete,active=!g.local&&g.status!=='finished'&&g.active!==false;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop delete-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 class="heading" id="delete-title">${g.local?'¿Borrar esta partida?':'¿Quitar esta sala de Mis partidas?'}</h2><p>${g.local?'Se borrará el guardado de este navegador, con su tablero y puntuación. Esta acción no se puede deshacer.':active?'También saldrás de la sala. Los demás podrán seguir jugando. Tus puntos de Mundo se conservan.':'La sala deja de aparecer en tu lista. El tablero y el resultado compartidos se conservan.'}</p>${!g.local?'<p class="muted">Si vuelves a abrirla con su código, aparecerá de nuevo en Mis partidas.</p>':''}<div class="row"><button data-action="cancel-delete">Cancelar</button><button class="danger" data-action="confirm-delete">${g.local?'Borrar partida':active?'Salir y quitar':'Quitar de mi lista'}</button></div></section></div>`);
 document.querySelector('[data-action="cancel-delete"]')?.focus();
}
