import {inverseFocusGroups} from './inverse-focus.js';
import {inverseContourNotice} from './inverse-contour-ui.js';
import {phenomenaPickerMarkup,bindPhenomenaPicker,readPhenomenaPicker,faunaPickerMarkup,bindFaunaPicker,readFaunaPicker} from './phenomena-ui.js';
import {manualInverse,canClaimInverse,inverseClaimsAt} from './inverse-claims.js';
import {inverseBeeIcon,inverseBeeClocks,inverseBeeNotices} from './inverse-bee-ui.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {inverseClaimControl,inverseClaimPanel} from './inverse-claim-ui.js';
import {enhanceSetupChoices} from './setup-choices.js';
import {filledInverse,inverseFillSet,inverseBoundary} from './inverse-progress.js';
import {INVERSE_DRAWINGS,INVERSE_SCALES,scaledInverseBoard} from './inverse-catalog.js';
import {fogKeys,fogCellMarkup,perceivedRoom} from './fog.js';
import './fog.css';
import {backpackIcon} from './backpack-icon.js';
import {stampTurnCards,displayedTurnCards} from './turn-card-display.js';
import {prepareImpactFocus,impactFocusEntries} from './impact-focus.js';
import {briefIcons} from './brief-ecology.js';
import {isInverse,inverseToolAllowed} from './inverse-rules.js';
import {INVERSE_PRESETS,loadInverseBoards} from './inverse-boards.js';
import {inverseBoardPreview,openInverseEditor} from './inverse-editor.js';
import './inverse.css';
import {territoryThreatCells} from './territory-threats.js';
import {inventoryPreferences,storeInventoryPreferences,inventoryBandMarkup,territoryBandMarkup,floatingInventoryMarkup,inventoryEditorMarkup,bindInventoryEditor,bindFloatingInventory,reorderInventory} from './inventory-personalization.js';
import {nuclearBlast,nuclearContext,nuclearIcon} from './nuclear-tool.js';
import './inventory-personalization.css';
import {createMachineRunner} from './machine-runner.js';
import {stampCellPresentation,cellGlyphs,glyphMarkup,glyphLabel} from './cell-presentation.js';
import {animateInventoryAction,resumeInventoryAnimations} from './inventory-animation.js';
import {resumeTurnFeedback} from './turn-feedback.js';
import {pausedScoreMarkup} from './paused-ui.js';
import {bindRefillHold,floatingRefillMarkup,refillSelectorMarkup,canOpenRefill,REFILL_HOLD_MS} from './floating-refill.js';
import {startingInventoryMarkup} from './starting-inventory.js';
import {RECOMMENDED_CARDS,validateStartingCards} from './practice-tools.js';
import {newTerritoryImpacts,territoryImpactText} from './territory-impact.js';
import {microLength,microSelectionOptions} from './micro-expansion.js';
import {bindFloatingImmunity} from './floating-immunity.js';
import {pendingInvasionBombs,activeInvasionBombs,bombDestinations} from './pending-bombs.js';
import {targetIcon,targetNavigation,targetDestinations,watchedKeys,targetColors,lastNavigationMove} from './watch-targets.js';
import {turnWarnings} from './turn-event-ui.js';
import {landingFeedback,landingScoreMarkup} from './landing-feedback.js';
import {invasionGrowthCells} from './invasion-paths.js';
import {invaderIcon,invasionBombIcon,bombDisarmCross} from './invader-mark.js';
import {eventOutlook} from './event-outlook.js';
import {wormTrailParts,wormTrailMarkup} from './worm-trails.js';
import {snapshotMemo} from './snapshot-memo.js';
import {ONLINE_ENABLED,ONLINE_NOTICE,modeAvailable} from './online-availability.js';
import {copyText,legacyCopyText} from './clipboard.js';
import {profileToken,profileUrl,restoreProfile,validProfileToken} from './profile-link.js';
import {bindLocalTransfer} from './local-transfer-ui.js';
import './local-transfer.css';
import {eventOutlookMarkup,ecologyWarningsMarkup} from './event-outlook.js';
import {ecologyNames,ecologyNavigationMarkup,ecologyTargets,nextEcologyTarget,ecologyIcon,ecologyPinTargets,ecologyClockEvents} from './ecology-navigation.js';
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
import {loadLocalGames,saveLocalGame,deleteLocalGames,gamePinKey,selectExpansion,loadGamePins,toggleGamePin,assertGameDeletionAllowed} from './sessions.js';
import {savedMapModel,thumbnailMarkup,bindInspection} from './saved-map.js';
import {createSnapshotQueue} from './snapshot-queue.js';
import {gamesMarkup,gamesSelectionActions,worldRankMarkup,voteMarkup,periods} from './session-ui.js';
import './sessions.css';
import './mobile-game.css';
import './map-overview.css';
import './inventory-sheet.css';
import './game-chrome.css';
import './inventory-status.css';
import './mobile-viewport.css';
import './strategy-r39.css';
import './refill.css';
import './local-presentation-r47.css';
import './local-feedback-r48.css';
import './local-inventory-r50.css';
import {scoreNoticeMarkup} from './score-notice.js';
import {brandMark} from './brand.js';
import './brand.css';
import './paused-inventory.css';
import './territory-presentation.css';
import './zones-r66.css';
import './alignment-r67.css';
import './saved-game-settings.css';
import {playerGameSettingsMarkup} from './saved-game-settings.js';
import './drawers-r69.css';
import './control-glow-r71.css';
import './player-feedback-r73.css';
import './player-layout-r74.css';
import {pausedInventorySummaryMarkup} from './paused-inventory.js';
import {overviewMarkup,overviewModel} from './map-overview.js';
import {prepareMapRendering,mapWindowMarkup,MAP_SYMBOL_SCALE} from './map-render.js';
import {extensionView,clampBoardZoom} from './map-camera.js';
import {cellIndex,viewportCellWindow,cachedCellWindow,reconcileCells} from './board-window.js';
import {toolIcon,inventoryStatusMarkup,inventoryMarkup,inventoryShortcutsMarkup,usePracticeHint,inventoryRefill,inventoryDockMarkup,immunityComboNotice} from './inventory.js';
import {canUsePracticeTool,practiceTurn,practiceTools,toolCells,toolAllowance} from './practice-tools.js';
import {selectFrontier,frontierTiles,frontierCells,frontierGroups,frontierSlash,frontierDirections,frontierEdges,frontierFootprint,borderPath} from './frontiers.js';
import {frontierAnchors,borderOptions,validBorder} from './area-tools.js';
import {useExpansionHint,planSuperHelp,suggestExpansion,executeSuperHelp} from './assistance.js';
import {hallModes,hallModeClass,hallNameField,symbolSelector,machineDifficultySelector,machineLevelHints,hallMarkup,hallDialogMarkup,rulesMarkup,hallIcon,hallReturnButton} from './hall.js';
import {client, ensurePlayer, command, profileAccess} from './api.js';
import {key, rankedPlayers, immediateAbove, expansionOptions, terrainOf, playableTerrain, availableCells} from './game.js';

import {reconcileLocalBoard,createLocal, localCommand, localHumanId} from './local.js';
import {scoreFeedback} from './feedback.js';
import {tornadoFeedback} from './tornado-feedback.js';
import {needsLocalTick} from './local-clock.js';
import {isImmune,immunityCountdown,immunityUnit} from './immunity.js';
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
let incomingTransfer=null,inventoryEditorOpen=false,inventoryEditorActor=null,inventoryEditorSelected=null,disposeInventoryEditor=null;
const onlinePreviews=new Map();
const previewRequests=createSnapshotQueue(code=>command('get',{code}),(key,snapshot)=>onlinePreviews.set(key,{room:snapshot,at:Date.now()}));
let room = null, uid = null, busy = false, polling = false, rankOpen = false, zoom = 1;
let inventorySection='player',impactFocus=null,impactFocusTimer;
let targetMarking=false,refillPlayer=null,refillPurchases=0,refillExchange=false,refillReplace=null,impactNotices=[],impactNoticeTimer;
function impactNoticesMarkup(){return `<div class="territory-impact-announcements" role="status" aria-live="polite">${impactNotices.filter(e=>e.until>Date.now()).map(e=>`<button data-impact-id="${e.id}" data-action="locate-impact" data-id="${e.id}" title="Ver las posiciones afectadas">${escape(territoryImpactText(e))}</button>`).join('')}</div>`;}
function updateImpactNotices(previous,next){
 clearTimeout(impactNoticeTimer);if(previous?.id!==next.id)impactNotices=[];
 impactNotices=[...impactNotices.filter(e=>e.until>Date.now()),...newTerritoryImpacts(previous,next).map(e=>({...e,until:Date.now()+8000}))].slice(-3);
 if(impactNotices.length)impactNoticeTimer=setTimeout(()=>{impactNotices=impactNotices.filter(e=>e.until>Date.now());for(const n of document.querySelectorAll('[data-impact-id]'))if(!impactNotices.some(e=>e.id===n.dataset.impactId))n.remove();},Math.max(...impactNotices.map(e=>e.until))-Date.now()+10);
}
let selectedExpansion=null, finishOpen=false, leaveOpen=false, roomSetup=null, localSetup=null;
let figureEffect=null,figureTimer,scoreFloatTimer,landingEffect=null,landingGlowTimer,landingFloatTimer;
let rodentEffect=null,rodentTimer;
function startRodentEffect(feedback){
 clearTimeout(rodentTimer);rodentEffect=feedback?{...feedback,until:performance.now()+900,index:cellIndex(feedback.visits),keys:new Set(feedback.visits.map(c=>key(c.x,c.y)))}:null;
 if(feedback)rodentTimer=setTimeout(()=>{rodentEffect=null;scheduleBoard(true);},900);
}
let tornadoEffect=null,tornadoTimer;
function clearTornadoEffect(){clearTimeout(tornadoTimer);tornadoEffect=null;}
function startTornadoEffect(feedback){
 clearTornadoEffect();if(!feedback)return;
 tornadoEffect={...feedback,until:performance.now()+900,positions:new Set(feedback.affected.map(p=>key(p.x,p.y))),moving:new Set(feedback.moves.map(m=>m.id))};
 tornadoTimer=setTimeout(()=>{tornadoEffect=null;scheduleBoard(true);},900);
}
let inverseBeeEffect=null,inverseBeeTimer,inverseClaimTapGuard=null;
function updateInverseBeeEffect(previous,next){
 if(previous?.id!==next.id||next.status!=='playing'){clearTimeout(inverseBeeTimer);inverseBeeEffect=null;return;}
 const event=next.inverseBeeEvent;
 if(!event?.moved||event.id===previous.inverseBeeEvent?.id)return;
 clearTimeout(inverseBeeTimer);inverseBeeEffect={symbol:event.symbol,until:performance.now()+1800};
 inverseBeeTimer=setTimeout(()=>{inverseBeeEffect=null;document.querySelector('.inverse-bee-swarm')?.remove();scheduleBoard(true);},1800);
}
let inverseClaimSelection=null,inverseFocus=null,inverseFocusStep=0,contourFocusStep=0,inverseFocusGame=null;
let hallHistory=[],localReturnDialog=null,pendingDelete=null,gameSelection=null,inventoryOpen=false,eventsOpen=false,inventorySelection=null;
const inventoryDescriptionsOpen=new Set(),hallDescriptionsOpen=new Set();
let setupVariant='original',setupDrawing='heart',setupScale='m';
const inverseRecommended=['erase','shift','opposite'];
let startingSelections=[ [...RECOMMENDED_CARDS],[...RECOMMENDED_CARDS] ];
let inventoryRefillEffect=null,inventoryRefillTimer,inventoryCardChoice=null,inventoryUserNotice=null,inventoryUserNoticeTimer;
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
const above=()=>immediateAbove(isLocal()?room.players:humans(),uid,!!room.commonWorld);
const iconPaths={back:'<path d="m15 5-7 7 7 7"/>',expand:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',worm:habitatIcons.worm,bomb:habitatIcons.bomb,build:habitatIcons.build,frontier:'<rect x="3" y="3" width="18" height="18"/><path d="m12 6 6 6-6 6-6-6Z"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',rodent:rodentIcon,activate:'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/><path d="M12 8v8m-4-4h8"/>',fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8l-5-5m13 5 5-5M8 16l-5 5m13-5 5 5"/>',center:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',above:'<path d="m5 19 14-14M5 5h14v14"/>',pause:'<path d="M8 5v14M16 5v14"/>',games:'<path d="M3 7V5h7l2 3h9v12H3V7Z"/>',finish:'<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',exit:'<path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/>',map:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h11m0-7v18m0-7h7"/>',chevron:'<path d="m6 9 6 6 6-6"/>'};
const navIcon=kind=>kind==='inventory'?backpackIcon():`<svg viewBox="0 0 ${['rodent','worm','bomb','build'].includes(kind)?'32 32':'24 24'}" aria-hidden="true" focusable="false">${navigationPaths[kind]||iconPaths[kind]||''}</svg>`;
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
function savedGameFromRow(row){
 if(!row)return null;
 const local=row.dataset.local==='true',game=(local?localGames():myGames.online||[]).find(g=>g.id===row.dataset.id);
 return game?{...game,local}:null;
}
function selectSavedGame(row){
 if(busy||pendingDelete||hallDialog!=='games')return;
 const game=savedGameFromRow(row);if(!game)return;
 try{assertGameDeletionAllowed(localStorage,game,uid);}catch(error){notify(error.message);return;}
 gameSelection??=new Set();const key=gamePinKey(game,uid);
 if(gameSelection.has(key))gameSelection.delete(key);else gameSelection.add(key);
 renderHallDialog();document.querySelector(`.saved-game[data-local="${game.local}"][data-id="${CSS.escape(game.id)}"] .saved-game-select`)?.focus({preventScroll:true});
}
function selectedSavedGames(){
 return [...localGames().map(g=>({...g,local:true})),...(myGames.online||[]).map(g=>({...g,local:false}))].filter(g=>gameSelection?.has(gamePinKey(g,uid)));
}
function cancelGameDeletion(){
 pendingDelete=null;document.querySelector('.delete-dialog')?.remove();
 document.querySelector(gameSelection?'[data-action="delete-selected-games"]':'[data-action="start-game-selection"]')?.focus({preventScroll:true});
}
bindGestures(app,{setRankingOpen,onSelectGame:selectSavedGame,isSelecting:()=>gameSelection!==null});
const mark = (symbol,{activeBomb=false,disarm=false}={}) => symbol==='*'?`<svg class="invader-asterisk" viewBox="0 0 64 64" ${disarm?'style="color:var(--red)"':''} ${activeBomb?'data-invasion-bomb="active"':''} role="img" aria-label="${activeBomb?'Bomba invasora activa':'Ocupación invasora *'}">${activeBomb?invasionBombIcon:invaderIcon}${disarm?bombDisarmCross:''}</svg>`:symbol==='#'?`<svg viewBox="0 0 64 64" aria-hidden="true">${neutralIcon}</svg>`:symbol==='X' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 14 50 50M50 14 14 50"/></svg>' : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
function notify(message,{inventory=false}={}) {
  const n=document.querySelector('#notice'); n.classList.remove('score-notice','landing-score-notice');n.classList.toggle('inventory-notice',inventory);n.textContent=message; n.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>n.classList.remove('visible'),5000);
}
function notifyInventory(message){
 if(room?.status!=='playing'){notify(message,{inventory:true});return;}
 clearTimeout(inventoryUserNoticeTimer);inventoryUserNotice={message,until:performance.now()+5000};render();
 inventoryUserNoticeTimer=setTimeout(()=>{inventoryUserNotice=null;if(room?.status==='playing')render();},5000);
}
function isLocal(){return !!room?.mode;}
function localUid(){const p=room.pairs[0];return room.mode==='solo'?localHumanId(room):p.pending?p.expander:p.turn==='X'?p.x:p.o;}
function ownPlayer(){return room?.players.find(p=>p.id===uid);}
function ownPair(){const own=ownPlayer();return own?.pair===undefined?null:room.pairs.find(p=>p.id===own.pair);}
function resetInventoryFeedback(){
 clearTimeout(inventoryRefillTimer);clearTimeout(inventoryUserNoticeTimer);inventoryRefillEffect=null;inventoryUserNotice=null;inventoryCardChoice=null;pendingInventoryRefills.clear();
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
   if(room?.status==='playing')render();
 },3500);
}
function accept(next) {
  if(next.not_modified)return;
  inverseClaimSelection=null;
  if(next.mode)next=reconcileLocalBoard(next);
  if(next.mode)next=stampCellPresentation(room,next);if(next.mode)next=stampTurnCards(room,next);
  if(room?.id===next.id&&next.version<room.version)return;
  const rodentVisit=boardActionFeedback(room,next),tornado=tornadoFeedback(room,next);clearTornadoEffect();
  const previousRoom=room,landing=landingFeedback(room,next),feedback=scoreFeedback(room,next),comboNotice=feedback?immunityComboNotice(room,next,feedback.player):null;
  const changed = room?.id!==next.id;
  updateInverseBeeEffect(previousRoom,next);
  if(changed){for(const k of Object.keys(ecologyFocus))delete ecologyFocus[k];resetInventoryFeedback();startRodentEffect(null);}
  if(changed){clearTimeout(impactFocusTimer);impactFocus=null;inventorySection='player';inventoryEditorOpen=false;inventoryEditorActor=null;disposeInventoryEditor?.();disposeInventoryEditor=null;refillPlayer=null;targetMarking=false;eventsOpen=false;pauseMapOpen=false;pauseMapState={};rankOpen=false;zoom=1;inventoryOpen=false;worldMapOpen=false;worldMapState={};previousTarget=null;activeKey=null;figureEffect=null;landingEffect=null;clearTimeout(landingGlowTimer);clearTimeout(landingFloatTimer);clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);}
  if(next.mode)next=persistLocal(next);
  room=next;if(manualInverse(room)&&room.practiceHint?.action==='claim')inverseClaimSelection={x:room.practiceHint.x,y:room.practiceHint.y,figureId:room.practiceHint.figureId};if(isLocal()){uid=localUid();}else {save('hash3_room',room.code);const me=room.players.find(p=>p.id===uid);if(me)save('hash3_name',me.name);}
  if(superHelpPlan&&(room.id!==superHelpPlan.roomId||room.version!==superHelpPlan.version||room.status!=='playing'))superHelpPlan=null;
  if(refillPlayer&&(!canOpenRefill(room,refillPlayer)||refillPlayer!==uid))refillPlayer=null;
  updateInventoryFeedback(previousRoom,next);updateImpactNotices(previousRoom,next);
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
  if(landing)startLandingEffect(landing);
  if(tornado)startTornadoEffect(tornado);
  if(rodentVisit)startRodentEffect(rodentVisit);
  if(mapInteracting)mapDeferred=true;else render();
  animateInventoryAction(app,previousRoom,next);
  if(landing)showLandingScore(landing,show?feedback:null);else if(show)showScore(feedback,comboNotice);
  scheduleMachine();
}
function render() {
 if(room?.status!=='playing'){resumeInventoryAnimations(app,room);resumeTurnFeedback(app,room);}
 const stripSelectors=['.board-inventory-status .inventory-shortcuts','.board-territory-status .custom-band-content','.world-map .inventory-shortcuts','.world-map .custom-territory-band .custom-band-content','.inspection-panel .inventory-shortcuts','.inspection-panel .custom-territory-band .custom-band-content'];
 const stripScroll=stripSelectors.map(selector=>({selector,left:document.querySelector(selector)?.scrollLeft||0}));
 const restoreStrips=()=>{for(const {selector,left}of stripScroll){const el=document.querySelector(selector);if(el)el.scrollLeft=left;}};

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
  if(room.status==='paused'){renderPaused();restoreStrips();return;}
  if(isLocal())uid=localUid();
  const own=ownPlayer(), pair=ownPair(), target=above(), list=gameRank();
  const opponent=room.players.find(p=>p.id===(own.symbol==='X'?pair.o:pair.x));
  const expanding=pair.pending>0, canExpand=expanding&&pair.expander===uid;
  if(canExpand&&!selectedExpansion&&room.practiceHint?.action==='expand'&&room.practiceHint.player===uid)selectedExpansion={x:room.practiceHint.x,y:room.practiceHint.y};
  const ready=!expanding&&pair.turn===own.symbol;
  const totals={X:0,O:0};room.players.forEach(p=>totals[p.symbol]+=p.score);
  const scoreList=room.commonWorld?list:rankedPlayers(room.players);
  const jumpButtons=targetNavigation(room,{playerId:uid});
  const preferences=inventoryPreferences(room,uid,localStorage);
  const habitatButtons=isInverse(room)?'':territoryBandMarkup(ecologyNavigationMarkup(room,uid),preferences),availabilityPhase=pair.deadline&&Date.parse(pair.deadline)<=Date.now()?'expired':'active';
  const inventoryContent=snapshotMemo(room,'inventory:'+uid+':'+availabilityPhase+':'+JSON.stringify(preferences),()=>inventoryStatusMarkup(room,{playerId:uid,preferences}));
  const usedCards=isLocal()?inventoryDockMarkup(room,uid,{section:'uses',uses:displayedTurnCards(room),choice:inventoryCardChoice?{...inventoryCardChoice,now:performance.now(),prepared:!inventoryCardChoice.applied}:null}):'';
  const inventoryAccess=isLocal()?`<div class="inventory-counter-pair">${inventoryDockMarkup(room,uid,{icon:navIcon('inventory'),section:'bag',refillNotice:false,open:inventoryOpen&&inventorySection==='player',refill:inventoryRefillEffect?.until>performance.now()?inventoryRefillEffect:null})||pausedInventorySummaryMarkup(room,uid,{participants:'own'})}<div class="player-cards-slot">${manualInverse(room)?`${preferences.floating.includes('inverse-claim')?'':inverseClaimControl(room,uid,{selected:!!inverseClaimSelection})}<span class="inverse-aux-clocks"><span class="inverse-wild-clock" aria-label="Próximo comodín en ${room.inverseWildNext-room.inverseMoves} colocaciones"># ${room.inverseWildNext-room.inverseMoves}</span></span>`:''}${usedCards}</div>${pausedInventorySummaryMarkup(room,uid,{participants:'rival'})}</div>`:'';
  const boardNavigation=`${room.commonWorld?'':iconButton('fit-board','fit','Zoom extensión del tablero')}${jumpButtons}`;
  const inventoryStatus=inventoryBandMarkup(inventoryContent,room,uid,preferences,{access:worldMapOpen?'':inventoryAccess,navigation:boardNavigation,status:worldMapOpen?'':inverseBeeClocks(room,uid)});
  const mapNavigation=`<button data-map-action="fit" aria-label="Ver mapa completo" title="Zoom extensión del mapa">${navIcon('fit')}</button>${jumpButtons}${iconButton('close-map','restore','Volver al tablero')}`;
  const mapInventoryStatus=inventoryBandMarkup(inventoryContent,room,uid,preferences,{access:worldMapOpen?inventoryAccess:'',navigation:mapNavigation,status:worldMapOpen?inverseBeeClocks(room,uid):''});
  const rankRows=players=>players.map(p=>{const index=scoreList.findIndex(t=>t.id===p.id);return `<li class="rank-row ${p.id===uid?'me '+own.symbol.toLowerCase():''} ${p.id===target?.id?'target-row':''}"><span class="rank-position ${['gold','silver','bronze'][index]||''}">${index+1}</span><span class="rank-name ${p.id===target?.id?'blue':''}">${escape(p.name)}${p.id===uid?' · tú':p.id===target?.id?' · superior':''}<small class="rank-combo">Combo máx. ${comboLabel(p)}</small><small class="rank-rodent">${escape(rodentLabel(room,p.id))}</small></span><span class="rank-score mono">${p.score}</span><span class="rank-max">${maxLabel(p)} <small>${p.max?.change>0?'↑':p.max?.change<0?'↓':''}</small></span>${playerGameSettingsMarkup(room,p.id)}</li>`;}).join('');
  const title=canExpand?'Estás ampliando':expanding?'Tu rival está ampliando':ready?'Tu turno':'Turno de tu rival';
  const tools=isLocal()?practiceTurn(room,uid):null,nextSymbol=room.inventoryEffects?.forced?.find(e=>e.player===uid)?.symbol||own.symbol;
  const turnSymbol=room.inventoryEffects?.forced?.find(e=>e.player===pair[pair.turn.toLowerCase()])?.symbol||pair.turn;
  const comboStatus=tools?.used.includes('combo')?toolAllowance(room,uid):null;
  const instructions={swap:inventorySelection?.source?'Toca la segunda ficha para intercambiarlas.':'Toca la primera ficha que quieres permutar.',destroy:'Toca una celda vacía resaltada para eliminarla del tablero; después coloca tu ficha.',activate:'Toca un hueco resaltado para construir una celda; después coloca tu ficha normalmente.',erase:'Toca una ficha rival resaltada para borrarla.',opposite:'Toca una ficha rival resaltada para convertirla en tuya.',shift:inventorySelection?.source?'Elige una celda vacía para desplazar la ficha seleccionada.':'Toca la ficha rival que quieres mover.',block:'Elige una celda vacía para reservarla; después coloca tu ficha en otra.',shield:'Toca una ficha tuya para protegerla.'};
  Object.assign(instructions,{nuclear:'Elige el centro para previsualizar hasta 33 celdas. Aplicar demuele el terreno y todas sus fichas; conserva los puntos cobrados.',ambush:'Elige un invasor para limpiar hasta tres celdas, conservando el terreno.',reconquest:'Elige un invasor para recuperar hasta 33 celdas, conservando el terreno.',antidote:'Toca una ficha amenazada por Contagio o Pandemia para proteger solo esa celda antes del impacto.',border:`Toca tres casillas vacías contiguas por un lado; pueden formar una L. ${inventorySelection?.cells?.length||0}/3 seleccionadas.`,tornado:'Sitúa el marco 3×3 para mezclar sus fichas y huecos.',bomb:'Elige el centro; vuelve a tocarlo o pulsa Aplicar. La bomba vacía tres celdas contiguas al azar.',frontier:'Toca un + para situar una casilla de muro; vuelve a tocarla o pulsa Colocar.'});
  instructions.sapper='Toca una bomba con X roja: desactiva hasta tres del mismo aviso o foco activo de Bombardeo. Las restantes conservan su plazo y crecimiento.';
  if(inventorySelection?.tool==='shift')instructions.shift=inventorySelection.source?'Elige el destino resaltado. La bomba seleccionada conserva su marco y su cuenta.':'Toca una ficha rival o una bomba anunciada con marco para desplazarla.';
  if(inventorySelection?.tool==='nuclear'&&inventorySelection.point)instructions.nuclear=`Bomba atómica · ${nuclearBlast(room,inventorySelection.point).length}/33 celdas resaltadas. Aplicar demuele terreno y fichas X/O/*/#. Los puntos cobrados se conservan.`;
  if(isInverse(room)){instructions.erase='Toca una ficha de cualquier color para borrarla sin quitar su celda.';instructions.shift=inventorySelection?.source?'Elige una celda vacía del dibujo.':'Toca una ficha de cualquier color para moverla.';}
  const toolBanner=inventorySelection?`<div class="practice-banner inventory-target-banner" role="status"><span>${microLength(inventorySelection.tool)>1?`Toca ${microLength(inventorySelection.tool)} casillas sin construir contiguas por un lado. ${inventorySelection.cells?.length||0}/${microLength(inventorySelection.tool)} seleccionadas.`:instructions[inventorySelection.tool]}</span>${['tornado','bomb','nuclear','frontier','border'].includes(inventorySelection.tool)?`<button class="small primary" data-action="confirm-area-tool" ${inventorySelection.tool==='border'?validBorder(room,inventorySelection.cells):inventorySelection.point&&(inventorySelection.tool!=='frontier'||toolCells(room,uid,inventorySelection.tool,{side:inventorySelection.side||'north'}).some(p=>p.x===inventorySelection.point.x&&p.y===inventorySelection.point.y))?'':'disabled'}>${inventorySelection.tool==='frontier'?'Colocar':'Aplicar'}</button>`:''}<button class="small" data-action="cancel-tool-selection" aria-label="Cancelar selección" title="Cancelar selección"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>`:tools&&(comboStatus||tools.used.includes('double')||room.inventoryEffects?.forced?.length)?`<div class="practice-banner" role="status"><span>${comboStatus?`Combo · ${comboStatus.remaining} herramienta${comboStatus.remaining===1?'':'s'} disponible${comboStatus.remaining===1?'':'s'}. `:''}${tools.used.includes('double')?`Doble · ${tools.remaining} ficha${tools.remaining===1?'':'s'} por colocar. `:''}${room.inventoryEffects?.forced?.map(e=>`Ficha rival · ${escape(room.players.find(p=>p.id===e.player)?.name||'Rival')} pondrá ${e.symbol} en su próxima colocación.`).join(' ')||''}</span></div>`:'';
  const blockedTurn=isLocal()&&ready&&!availableCells(room,pair).length&&availableCells(room,pair,{ignoreBlocks:true}).length;
  const inverseFull=isInverse(room)&&!availableCells(room,pair).length;
  let playerNotices=`${inverseBeeNotices(room)}${inverseContourNotice(room)}${inverseFull?'<div class="practice-banner" role="status"><span>Dibujo lleno: usa una carta para liberar espacio o, en cobro voluntario, cobra un combo.</span></div>':''}${targetMarking?'<div class="practice-banner target-mark-banner"><span>Toca una celda para marcarla o quitar su diana. Puedes seguir tres.</span><button data-action="mark-target" class="small">Terminar</button></div>':''}${toolBanner}${blockedTurn?'<div class="practice-banner"><span>Las celdas vacías están bloqueadas. Puedes pasar este turno.</span><button class="small" data-action="pass">Pasar turno</button></div>':''}${canExpand&&inventorySelection?.tool!=='frontier'?`<div class="expansion-controls"><span>${selectedExpansion?expansionSummary():'Toca para situar el 3×3; puedes solaparlo.'}</span>${isLocal()&&own.inventory?.cards.frontier>0?iconButton('practice-tool','frontier',pair.frontierUsed?'Muro ya colocada en esta ampliación':'Colocar Muro antes de ampliar',`class="expansion-frontier" data-tool="frontier" ${canUsePracticeTool(room,uid,'frontier')?'':'disabled'}`):''}${pair.optionalExpansion?iconButton('cancel-free-expansion','back','Cancelar ampliación estratégica'):''}<button class="small primary" data-action="confirm-expansion" ${!selectedExpansion?'disabled':''}>Colocar</button></div>`:''}`;
  const refill=inventoryRefillEffect?.until>performance.now()&&inventoryRefillEffect.player===uid?inventoryRefillEffect:null;
  const refillText=refill?.message||(refill?`Inventario recargado · +${refill.added} ${refill.tool}`:'');
  const userText=inventoryUserNotice?.until>performance.now()?inventoryUserNotice.message:'';
  const noticeText=[refillText,userText].filter((text,i,list)=>text&&list.indexOf(text)===i).map(text=>escape(text)).join(' · ');
  if(noticeText){
   const extra=`<small class="player-notice-extra ${refill?'inventory-refill-toast':''}" role="status">${noticeText}</small>`;
   playerNotices=playerNotices?playerNotices.replace('</span>',extra+'</span>'):`<div class="practice-banner inventory-user-notice" role="status"><span>${extra}</span></div>`;
  }
  const claimFigures=inverseClaimSelection?.x!=null?inverseClaimsAt(room,uid,inverseClaimSelection):[];
  if(inverseClaimSelection&&claimFigures[0]?.figures)inverseClaimSelection.figureId=claimFigures[0].id;
  const claimPanel=inverseClaimPanel(inverseClaimSelection,claimFigures);
  const playerFeedback=playerNotices?`<div class="player-feedback-row" aria-label="Avisos del jugador"><div class="player-feedback-notices">${playerNotices}</div></div>`:'';
  const modeLabel=isLocal()?(room.mode==='solo'?'VS MÁQUINA':'SIN CONEXIÓN'):room.commonWorld?'MUNDO':room.kind==='duel'?'DUELO':'SALA LIBRE';
  app.innerHTML=`<section class="game ${isInverse(room)?'inverse-game':''} ${hallModeClass(isLocal()?(room.mode==='solo'?'solo':'offline'):room.commonWorld?'world':'duel')} ${inventoryOpen?'inventory-visible':''}">
    <div class="turn-feedback-bar ${playerNotices?'has-player-notices':''}"><header class="topbar turnbar compact-turnbar"><span class="brand heading" aria-label="#33">${brandMark}</span><h1 class="heading turn-state" role="status">${title}${expanding?'':` <span class="turn-symbol ${ready?nextSymbol.toLowerCase():turnSymbol.toLowerCase()}">· ${ready?nextSymbol:turnSymbol}</span>`}</h1><div class="turn-clocks">${isInverse(room)?`<button class="inverse-progress mono" data-action="locate-inverse-fill" title="Toca para recorrer el relleno pendiente con zoom" aria-label="Localizar relleno pendiente">${filledInverse(room)?room.inverseFill.length:room.cells.length}${filledInverse(room)?' por vaciar':' fichas'}</button>`:''}${room.matchGoal?.type==='moves'?`<span class="mono" aria-label="Movimientos de partida">${room.players.reduce((n,p)=>n+(p.placements||0),0)}/${room.matchGoal.target}</span>`:room.cellTarget?`<span class="mono" aria-label="Celdas construidas">${room.terrain.length}/${room.cellTarget}</span>`:''}<span class="turn-timer mono" aria-label="Tiempo restante del turno" ${pair.deadline?'':'hidden'}></span>${room.endsAt?'<span class="duel-clock">FIN <strong id="duel-time" class="mono"></strong></span>':''}</div></header>${playerFeedback}</div>
    <div class="workspace"><div class="arena">${voteMarkup(room.vote,uid)}
    <aside class="board-inventory-status" aria-label="Herramientas del jugador">${inventoryStatus}</aside><div class="map-wrap">${claimPanel}${inverseBeeEffect?.until>performance.now()?`<div class="inverse-bee-swarm" aria-hidden="true">${inverseBeeIcon.repeat(3)}</div>`:''}${floatingRefillMarkup(room,uid)}${floatingInventoryMarkup(room,uid,preferences,{claimSelected:!!inverseClaimSelection})}<div class="viewport" tabindex="0" aria-label="Tablero compartido"><div class="board-space"><div class="board"></div></div></div><button class="game-minimap" data-action="map" aria-label="Abrir mapa general" title="Mapa general">${navIcon('map')}</button>${overviewMarkup({open:worldMapOpen,controlsInInventory:true,jumpButtons,habitatButtons,inventoryStatus:mapInventoryStatus,usedCards:'',floatingInventory:floatingInventoryMarkup(room,uid,preferences,{claimSelected:!!inverseClaimSelection}),warningMarkup:isLocal()?ecologyWarningsMarkup(room)+(worldMapOpen?impactNoticesMarkup():''):''})}</div><div class="territory-zone">${isLocal()?ecologyWarningsMarkup(room):''}${worldMapOpen?'':impactNoticesMarkup()}<aside class="board-territory-status" aria-label="Eventos del territorio">${habitatButtons}</aside></div>
    <footer class="game-dock"><section class="score-sheet score-panel" id="ranking-panel" role="region" aria-labelledby="score-panel-title" ${rankOpen?'':'hidden'}><div class="score-panel-heading"><h2 class="heading" id="score-panel-title">${room.commonWorld?'Ranking Mundo':'Marcador'}</h2></div><div class="rank-columns"><span>#</span><span>JUGADOR</span><span>PUNTOS</span><span>#MAX</span></div><ol class="ranking-list rank-extra">${rankRows(scoreList)}</ol><div class="max-note">${room.commonWorld?'#MAX oficial':'#MAX de referencia'} · ${own.max?.value==null?'se calcula desde tu próxima jugada':own.max.provisional?`${own.max.actions}/100 acciones · provisional`:'últimas 100 acciones'}</div><dl class="game-details"><div><dt>Modalidad</dt><dd>${isInverse(room)?'INVERSO · ':''}${modeLabel}</dd></div><div><dt>Figuras</dt><dd>${room.level==='advanced'?'Avanzadas':'Normales'}</dd></div><div><dt>Juegas como</dt><dd>${escape(own.name)} · ${own.symbol}</dd></div><div><dt>Rival</dt><dd>${escape(opponent.name)}${room.mode==='solo'?` · ${room.machineInventory?'con':'sin'} inventario`:''}${opponent.bot&&room.mode!=='solo'?' · esperando duelista':''}</dd></div><div><dt>Fauna y habitantes</dt><dd>${room.faunaEnabled===false?'Desactivados':'Activados'}</dd></div><div><dt>Invasores y fenómenos</dt><dd>${room.territoryEnabled===false?'Desactivados':'Activados'}</dd></div><div><dt>Reloj</dt><dd>${room.timeMode==='untimed'?'Sin reloj':'33 segundos por turno'}</dd></div><div><dt>Trueque</dt><dd>${(own.tradeSpent||0).toLocaleString('es-ES')} puntos gastados · ${(own.score+(own.tradeSpent||0)).toLocaleString('es-ES')} ganados</dd></div><div><dt>Bonus +3</dt><dd>${3-(own.figures%3)} figuras restantes</dd></div></dl><p class="menu-version">#33 · ${VERSION_LABEL} · <span class="connection">${isLocal()?'Este dispositivo':connected?'Conectado':'Reconectando…'}</span></p>${isLocal()?'':`<p class="score-room">Sala <strong class="mono">${escape(room.code)}</strong></p>`}</section><button class="team-score-bottom" data-action="ranking" aria-label="${rankOpen?'Recoger':'Desplegar'} marcador y detalles" aria-expanded="${rankOpen}" aria-controls="ranking-panel"><span class="score-disclosure-tab" aria-hidden="true">${navIcon('chevron')}</span><div class="score-side x"><span class="score-symbol">X</span><strong>${totals.X.toLocaleString('es-ES')}</strong></div><div class="score-side o"><span class="score-symbol">O</span><strong>${totals.O.toLocaleString('es-ES')}</strong></div></button><nav class="game-bottom" aria-label="Acciones de partida">${!room.commonWorld?iconButton('pause','pause',isLocal()?'Pausar partida':'Solicitar pausa por mayoría'):iconButton('abandon','exit','Salir de Mundo','class="world-exit"')}${iconButton('go-games','games','Mis partidas')}${isLocal()||room.host===uid&&!room.commonWorld?iconButton('finish','finish','Finalizar partida','class="danger"'):''}${iconButton('go-hall','home','Volver al hall')}</nav></footer></div></div>

  </section>`;
  restoreStrips();drawBoard(canExpand,ready,target);renderFinish();renderLeave();renderInventory();renderEvents();renderSuperHelp();updateTimer();
  if(scoreFocus)document.querySelector('.team-score-bottom')?.focus({preventScroll:true});
  const nowKey=key(pair.active.x,pair.active.y);
  if(!scroll||nowKey!==activeKey)requestAnimationFrame(()=>center(pair.active.x+1,pair.active.y+1));
  else center(scroll.x,scroll.y);
  activeKey=nowKey;
  disposeMap=bindMap({room,layout,zoom,target,own,onNavigate:scheduleBoard,mapState:worldMapState,changeZoom:changeMapZoom,onClose:()=>{worldMapOpen=false;},interacting:value=>{mapInteracting=value;if(!value&&mapDeferred){mapDeferred=false;setTimeout(()=>render(),0);}}});
  const mapCleanup=disposeMap,floatingCleanup=bindFloatingImmunity(document.querySelector('.map-wrap'),room.id),favoriteCleanup=bindFavoriteSurfaces(['.map-wrap','.world-map'],preferences);disposeMap=()=>{mapCleanup?.();floatingCleanup();favoriteCleanup();};
  renderRefill();renderInventoryEditor();
  if(inventoryCardChoice&&!inventoryCardChoice.applied)for(const node of app.querySelectorAll('[data-tool]'))if(!node.closest('.inventory-sheet')&&node.dataset.tool===inventoryCardChoice.tool&&node.dataset.player===inventoryCardChoice.player)node.classList.add('is-feedback-active');
  resumeInventoryAnimations(app,room);resumeTurnFeedback(app,room);
  if(busy)document.querySelectorAll('[data-action="move"],[data-action="select-expansion"],[data-action="confirm-expansion"]').forEach(b=>b.disabled=true);
}
let layout={minX:0,minY:0,size:56,padding:100};
function boardFrontierCell(cell,minX,minY,size,padding,preview=false,pivot=false,valid=true,bombTarget=false,glyphVisible=true){
 if(cell.borderSide)return `<span class="board-border-cell ${preview?'is-preview':''}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" aria-label="${preview?'Propuesta de frontera':'Frontera'} · ${cell.borderSide}"><svg viewBox="${cell.x} ${cell.y} 1 1"><path d="${borderPath(cell)}"/></svg></span>`;
 if(bombTarget)return `<button class="board-frontier-cell is-bomb-target" data-action="inventory-target" data-x="${cell.x}" data-y="${cell.y}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" aria-label="Bomba sobre muro en ${cell.x}, ${cell.y}">${frontierSlash}</button>`;
 const controls=pivot?`<button class="frontier-pivot-place" data-action="inventory-target" data-x="${cell.x}" data-y="${cell.y}" aria-label="Colocar muro en el punto elegido ${cell.x}, ${cell.y}" ${valid?'':'disabled'}></button>`:'';
 return `<span class="board-frontier-cell ${glyphVisible?'':'glyph-covered'} ${cell.beaver?'is-beaver':''} ${preview?'is-preview':''} ${preview&&!valid?'is-invalid':''}" style="left:${(cell.x-minX)*size+padding}px;top:${(cell.y-minY)*size+padding}px;width:${size}px;height:${size}px" role="${pivot?'group':'img'}" aria-label="${cell.beaver?'Barrera de castor // · '+cell.turnsRemaining+' turnos':preview?(cell.borderCell?'Propuesta de frontera':'Propuesta de muro'):(cell.borderCell?'Frontera, solo se rompe con Bomba':'Muro, solo se rompe con Bomba')} · ${cell.x}, ${cell.y}">${cell.beaver?`<svg viewBox="0 0 32 32" class="beaver-barrier-sign" aria-hidden="true">${briefIcons['beaver-barrier']}</svg><b class="beaver-barrier-turns">${cell.turnsRemaining}</b>`:frontierSlash}${controls}</span>`;
}
async function analyzeHelp(kind){
 const snapshot=structuredClone(room),player=uid,now=Date.now();notifyInventory(kind==='expand'?'Buscando una ampliación favorable…':'Analizando movimientos e inventario…');
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
 const steps=superHelpPlan.steps.map(s=>s.action==='inventory'?`${escape(practiceTools.find(t=>t.id===s.payload.tool)?.label||'Inmunidad')} · ×1`:s.action==='claim'?`Cobrar figura en ${s.payload.x}, ${s.payload.y}`:`Colocar ficha en ${s.payload.x}, ${s.payload.y}`);
 const cards=superHelpPlan.steps.filter(s=>s.action==='inventory').map(s=>practiceTools.find(t=>t.id===s.payload.tool)?.label||'Inmunidad');
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop super-help-dialog"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="super-help-title"><h2 class="heading" id="super-help-title">Súper Ayuda</h2><p>Usará 1 Súper Ayuda${cards.length?` y ${escape(cards.join(', '))}`:''}. Solo juega tu turno actual.</p><ol class="super-help-steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol><p class="super-help-points">${superHelpPlan.uncertain?'Estimación con la memoria anterior a la niebla':`+${superHelpPlan.points} puntos previstos`}</p><div class="row"><button data-action="cancel-super-help">Cancelar</button><button class="primary" data-action="confirm-super-help">Ejecutar</button></div></section></div>`);
 document.querySelector('[data-action="cancel-super-help"]')?.focus({preventScroll:true});
}
function expansionSummary() {
  const known=snapshotMemo(room,'terrain-keys',()=>new Set(terrainOf(room).map(c=>key(c.x,c.y)))),b=selectedExpansion;
  const count=Array.from({length:9},(_,i)=>key(b.x+i%3,b.y+Math.floor(i/3))).filter(k=>!known.has(k)).length;
  return `${count} celda${count!==1?'s':''} nueva${count!==1?'s':''} · ${9-count} existentes`;
}
function drawBoard(canExpand,ready,target) {
  const hidden=fogKeys(room);
  const pair=ownPair(),own=ownPlayer(),terrain=snapshotMemo(room,'board-terrain',()=>terrainOf(room));
  const selection=inventorySelection?.player===uid?inventorySelection:null;
  const claimMode=!!inverseClaimSelection&&canClaimInverse(room,uid),claimFigure=inverseClaimSelection?.figureId?inverseClaimsAt(room,uid,inverseClaimSelection).find(f=>f.id===inverseClaimSelection.figureId):null,claimKeys=new Set(claimFigure?.points.map(([x,y])=>key(x,y))||[]);
  const activationTargets=selection?.tool==='activate'?snapshotMemo(room,'board-activation:'+uid,()=>toolCells(room,uid,'activate')):[];
  const choices=canExpand&&!selection?snapshotMemo(room,'expansion:'+pair.id,()=>expansionOptions(terrain,pair.terrainAnchor||pair.active,room)):[],choiceKeys=new Set(choices.map(c=>key(c.x,c.y)));
  const areaSelection=['expand-2','expand-3','tornado','bomb','nuclear','frontier','border'].includes(selection?.tool),areaOptions=areaSelection?snapshotMemo(room,'board-area:'+uid+':'+selection.tool+':'+selection.side+':'+JSON.stringify(selection.cells||[]),()=>selection.tool==='frontier'?frontierAnchors(room,uid):toolCells(room,uid,selection.tool,{side:selection.side||'north',selected:selection.cells||[]})):[];
  const areaKeys=new Set(areaOptions.map(c=>key(c.x,c.y)));
  if(selectedExpansion&&!choiceKeys.has(key(selectedExpansion.x,selectedExpansion.y)))selectedExpansion=null;
  const barriers=snapshotMemo(room,'board-barriers',()=>frontierCells(room)),reservations=snapshotMemo(room,'board-reservations',()=>habitatReservations(room));
  const barrierKeys=new Set(barriers.filter(c=>!c.borderSide).map(c=>key(c.x,c.y)));
  const {minX,minY,maxX,maxY}=snapshotMemo(room,'board-bounds:'+uid+':'+canExpand+':'+selection?.tool+':'+selection?.point?.x+','+selection?.point?.y+':'+JSON.stringify(selection?.cells||[])+':'+(impactFocus?.id||''),()=>{
    const all=[...(impactFocus?.corners||[]),...terrain,...territoryThreatCells(room),...barriers,...(selection?.tool==='frontier'&&selection.point?frontierTiles({...selection.point,cells:selection.cells,side:selection.side||'north'}):[]),...reservations,...(room.watchTargets||[]),...(lastNavigationMove(ownPlayer())?[lastNavigationMove(ownPlayer())]:[]),...choices,...choices.map(c=>({x:c.x+2,y:c.y+2})),...activationTargets,...(selection?.cells||[]),...areaOptions,...areaOptions.map(c=>({x:c.x+2,y:c.y+2}))];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const c of all){minX=Math.min(minX,c.x);minY=Math.min(minY,c.y);maxX=Math.max(maxX,c.x);maxY=Math.max(maxY,c.y);}
    return {minX,minY,maxX,maxY};
  });
  const viewport=document.querySelector('.viewport');
  const size=(innerWidth<=760?48:56)*zoom,padding=Math.max(90,viewport.clientWidth/2,viewport.clientHeight/2);Object.assign(layout,{minX,minY,size,padding,previewScale:1,minZoom:room.commonWorld?.55:.3});
  const board=document.querySelector('.board');board.replaceChildren();
  const focusKeys=new Set(inverseFocus?.game===room.id?inverseFocus.points.map(c=>key(c.x,c.y)):[]),contourKeys=new Set(room.inverseContour?.targets||[]);
  const inversePaint=snapshotMemo(room,'inverse-paint',()=>({fill:inverseFillSet(room),edges:new Map(filledInverse(room)?inverseBoundary(terrain).map(c=>[key(c.x,c.y),c.sides]):[])}));
  board.style.width=`${(maxX-minX+1)*size+2*padding}px`;board.style.height=`${(maxY-minY+1)*size+2*padding}px`;
  const space=board.parentElement;space.style.width=board.style.width;space.style.height=board.style.height;
  const {deadKeys,cells,linked,known,myPairIds,habitatPoints,wormBody,projects,roders,eaten,growthKeys,bombKeys}=snapshotMemo(room,'board-model:'+pair.id,()=>{
    const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),linked=new Set(playableTerrain(room,pair).map(c=>key(c.x,c.y))),known=new Set(terrain.map(c=>key(c.x,c.y))),myPairIds=new Set([pair.x,pair.o]);
    const habitatPoints=new Map(habitatLocations(room).map(e=>[key(e.x,e.y),e])),wormBody=new Set([...(room.worms||[]),...(room.anacondas||[])].flatMap(w=>w.body).map(c=>key(c.x,c.y))),projects=new Map((room.works||[]).flatMap(w=>[...w.destroy.slice(w.done).map(c=>({...c,kind:'destroy'})),...w.build.slice(w.done).map(c=>({...c,kind:'build'}))]).map(c=>[key(c.x,c.y),c]));
    const roders=new Map((room.rodents||[]).map(r=>[key(r.x,r.y),r])),eaten=new Set((room.eatenCells||[]).map(c=>key(c.x,c.y)));
    const growthCells=invasionGrowthCells(room);
    return {deadKeys:new Set((room.deadCells||[]).map(c=>key(c.x,c.y))),cells,linked,known,myPairIds,habitatPoints,wormBody,projects,roders,eaten,growthKeys:new Set(growthCells.map(c=>key(c.x,c.y))),bombKeys:new Set(activeInvasionBombs(room,growthCells).map(c=>key(c.x,c.y)))};
  });
  const nuclearPreview=selection?.tool==='nuclear'&&selection.point?nuclearBlast(room,selection.point,nuclearContext(room)):[],nuclearKeys=new Set(nuclearPreview.map(c=>key(c.x,c.y)));
  const selectionReady=selection&&(ready||(microLength(selection.tool)||selection.tool==='nuclear')&&canUsePracticeTool(room,uid,selection.tool));
  const targets=selection?new Set((areaSelection&&selection.tool!=='frontier'?areaOptions:toolCells(room,uid,selection.tool,{side:selection.side||'north',selected:selection.cells||[]})).map(c=>key(c.x,c.y))):null;
  const style=c=>`left:${(c.x-minX)*size+padding}px;top:${(c.y-minY)*size+padding}px;width:${size}px;height:${size}px`;
  const index=snapshotMemo(room,'board-index',()=>cellIndex(terrain)),choiceIndex=snapshotMemo(room,'board-choice-index:'+pair.id+':'+canExpand,()=>cellIndex(choices.filter(c=>!known.has(key(c.x,c.y))))),activationIndex=snapshotMemo(room,'board-activation-index:'+uid+':'+selection?.tool,()=>cellIndex(activationTargets));
  const areaIndex=snapshotMemo(room,'board-area-index:'+uid+':'+selection?.tool+':'+selection?.side+':'+JSON.stringify(selection?.cells||[]),()=>cellIndex(areaOptions.filter(p=>!known.has(key(p.x,p.y))&&!(selection?.tool==='bomb'&&barrierKeys.has(key(p.x,p.y))))));
  const reservationIndex=snapshotMemo(room,'board-reservation-index',()=>cellIndex(reservations.filter(c=>!known.has(key(c.x,c.y)))));
  const glyphs=cellGlyphs(room,uid),glyphIndex=snapshotMemo(room,'board-glyph-index:'+uid,()=>cellIndex([...glyphs.values()].filter(e=>e.type!=='frontier')));
  const antidoteKeys=snapshotMemo(room,'antidote-keys',()=>new Set((room.territoryEvents||[]).flatMap(e=>(e.antidotes||[]).map(c=>key(c.x,c.y)))));
  const territoryIndex=snapshotMemo(room,'board-warnings',()=>cellIndex(territoryThreatCells(room)));
  const wormTrailIndex=snapshotMemo(room,'board-worm-trails',()=>cellIndex(wormTrailParts(room)));
  const frontierIndex=snapshotMemo(room,'board-walls',()=>cellIndex(frontierGroups(room).flatMap(f=>f.cells.map(c=>({...c,frontierId:f.id})))));
  const playerNames=new Map(room.players.map(p=>[p.id,p.name])),shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));
  const habitatBlocks=new Set([...deadKeys,...barrierKeys,...wormBody,...reservations.map(c=>key(c.x,c.y))]);
  const blockedFor=id=>new Set([...habitatBlocks,...(room.inventoryEffects?.blocks||[]).filter(e=>e.remaining>0&&(e.by===id?e.fresh:!isImmune(room,id))).map(e=>key(e.x,e.y))]);
  const blockedKeys=blockedFor(uid),sourceBlocked=selection?.source?blockedFor(selection.source.owner):null,watch=watchedKeys(room);
  const bombDestinationKeys=selection?.source?.bombId?new Set(bombDestinations(room,selection.source).map(c=>key(c.x,c.y))):null;
  const bombIndex=snapshotMemo(room,'pending-invasion-bombs',()=>cellIndex(pendingInvasionBombs(room)));
  const reservedKeys=new Set((room.inventoryEffects?.blocks||[]).filter(e=>e.by===uid&&e.remaining>0).map(e=>key(e.x,e.y)));
  let nodes=new Map();
  const cellMarkup=pos=>{
    if(deadKeys.has(key(pos.x,pos.y)))return `<span class="cell terrain-cell dead-cell ${rodentEffect?.until>performance.now()&&rodentEffect.keys.has(key(pos.x,pos.y))?'glyph-covered':''}" style="${style(pos)}" role="img" aria-label="Celda muerta inalterable ${pos.x}, ${pos.y}"><svg viewBox="0 0 32 32" aria-hidden="true">${briefIcons.death}</svg></span>`;
    const {x,y}=pos,c=cells.get(key(x,y)),rodent=roders.get(key(x,y)),active=linked.has(key(x,y));
    const obscured=hidden.has(key(x,y));
    const isTarget=!obscured&&c&&c.id===target?.lastMove?.id,last=!obscured&&c&&c.id===own.lastMove?.id;
    const color=obscured?'fog-covered'+(c?' fog-occupied':' fog-empty'):c?(c.symbol==='*'?'invader':c.symbol==='#'?'neutral'+(c.wildcardSymbol?' wildcard-'+c.wildcardSymbol.toLowerCase():''):myPairIds.has(c.owner)?c.symbol.toLowerCase():'foreign'):'';
    const owner=c?(c.symbol==='*'?'los invasores':c.symbol==='#'?'el tablero':playerNames.get(c.owner)):'';
    const select=canExpand&&choiceKeys.has(key(x,y));
    const targeting=!!selection,source=selection?.source,chosen=source&&c?.id===source.id;
    const removable=targeting&&selectionReady&&(areaSelection?areaKeys.has(key(x,y)):(active||selection.tool==='sapper')&&(source?selection.tool==='swap'?targets.has(key(x,y))&&c?.id!==source.id:source.bombId?bombDestinationKeys.has(key(x,y)):!c&&!blockedKeys.has(key(x,y))&&!sourceBlocked.has(key(x,y)):targets.has(key(x,y))));
    const habitat=habitatPoints.get(key(x,y)),project=projects.get(key(x,y)),body=wormBody.has(key(x,y));
    const blocked=blockedKeys.has(key(x,y)),reserved=!c&&reservedKeys.has(key(x,y));
    const playable=active&&ready&&!c&&!blocked&&!targeting&&!claimMode;
    const claimable=claimMode&&c&&[own.symbol,'#'].includes(c.symbol);
    const beeMoved=c&&c.symbol===inverseBeeEffect?.symbol&&inverseBeeEffect.until>performance.now();
    const swirling=tornadoEffect&&tornadoEffect.until>performance.now()&&tornadoEffect.positions.has(key(x,y));
    const moving=swirling&&c&&tornadoEffect.moving.has(c.id);
    const swirlStyle=swirling?`--tornado-delay:${Math.min(0,tornadoEffect.until-performance.now()-900)}ms;`:'';
    const landingSymbol=landingEffect?.until>performance.now()?landingEffect.cells.get(key(x,y)):null;
    const glowing=!obscured&&(landingSymbol||figureEffect&&figureEffect.until>performance.now()&&figureEffect.cells.has(key(x,y)));
    const glowStyle=glowing?`--figure-color:${(landingSymbol||figureEffect.symbol)==='X'?'var(--red)':'var(--green)'};--figure-duration:${Math.max(1,(landingSymbol?landingEffect.until:figureEffect.until)-performance.now())}ms;`:'';
    const hinted=active&&ready&&!c&&room.practiceHint?.player===uid&&room.practiceHint.x===x&&room.practiceHint.y===y;
    const toolLabel=practiceTools.find(t=>t.id===selection?.tool)?.label;
    const label=obscured?`Niebla · celda ${c?'ocupada, signo oculto':'libre'}, ${x}, ${y}${blocked?', bloqueada':''}`:removable?`${source?(selection.tool==='swap'?'Segunda ficha de Permutar':'Destino de Desplazar'):toolLabel} ${c?c.symbol+' de '+owner:'celda vacía'}, celda ${x}, ${y}`:select?`Situar ampliación en ${x}, ${y}`:c?`${c.symbol==='#'?'Comodín # compartido'+(c.wildcardSymbol?' · usado por '+c.wildcardSymbol:' · sin usar'):c.symbol+' de '+owner}, celda ${x}, ${y}${isTarget?', objetivo inmediato':''}${c&&shields.has(c.id)?', protegida por escudo':''}`:`Celda vacía ${x}, ${y}${active?', tu territorio':''}${blocked?', bloqueada':''}${reserved?', reservada por ti':''}`;
    return `<button class="cell terrain-cell ${focusKeys.has(key(x,y))?(inversePaint.fill.has(key(x,y))?'inverse-fill-focus':inverseFocus?.impact?'inverse-contour-hit':''):''} ${contourKeys.has(key(x,y))&&inversePaint.fill.has(key(x,y))?'inverse-contour-target':''} ${beeMoved?'inverse-bee-moved':''} ${claimKeys.has(key(x,y))?'inverse-claim-highlight':''} ${filledInverse(room)?`inverse-tile ${inversePaint.fill.has(key(x,y))?'inverse-filled':'inverse-cleared'} ${(inversePaint.edges.get(key(x,y))||[]).map(side=>'inverse-edge-'+side).join(' ')}`:''} ${(glyphs.has(key(x,y))||rodentEffect?.until>performance.now()&&rodentEffect.keys.has(key(x,y)))?'glyph-covered':''} ${nuclearKeys.has(key(x,y))?'nuclear-preview':''} ${growthKeys.has(key(x,y))?'invasion-growth':''} ${project?'project-'+project.kind:''} ${body?'worm-body':''} ${rodent&&!rodentSleeping(rodent)?'rodent-eating':''} ${!c&&eaten.has(key(x,y))?'rodent-cleared':''} ${swirling?'tornado-zone':''} ${moving?'tornado-destination':''} ${glowing?'figure-glow':''} ${active?'connected':''} ${playable?'available':''} ${removable&&selection.tool!=='tornado'?'tool-target':''} ${removable&&selection.tool!=='tornado'&&!c&&!habitat&&!project&&!body?'tool-destination':''} ${chosen?'tool-source':''} ${blocked&&!c?'blocked':''} ${reserved&&!blocked?'reserved':''} ${c&&shields.has(c.id)?'shielded':''} ${hinted?'hint-point':''} ${select?'placement-anchor':''} ${color} ${last?'last':''} ${isTarget?'target':''} ${isTarget&&blinkId===c.id?'blink':''}" style="${style(pos)};${glowStyle}${swirlStyle}" data-action="${claimable?'inverse-claim-cell':targetMarking?'watch-target-cell':removable?'inventory-target':select?'select-expansion':playable?'move':'invalid-cell'}" data-x="${x}" data-y="${y}" ${!claimable&&!targetMarking&&!removable&&!select&&(targeting||!ready||blocked)?'disabled':''} aria-disabled="${!claimable&&!targetMarking&&!removable&&!select&&!playable}" aria-label="${escape((bombKeys.has(key(x,y))?'Bomba invasora activa · puede expandirse. ':growthKeys.has(key(x,y))?'Invasión · puede expandirse. ':body?'Gusano · cuerpo bloquea esta celda. ':rodent?`Roedor · ${rodent.eaten}/3 comidas · ${rodentSleeping(rodent)?'dormido':'comiendo'}. `:'')+label+(filledInverse(room)?(inversePaint.fill.has(key(x,y))?' · relleno pendiente':' · vaciada, utilizable'):'')+(hinted?', sugerencia de ayuda':''))}">${obscured?fogCellMarkup(!!c):c?mark(c.symbol,{activeBomb:bombKeys.has(key(x,y)),disarm:removable&&selection.tool==='sapper'}):''}</button>`;
  };
  const visibleCells=cachedCellWindow(index,cellMarkup);
  const glyphEntries=(window,compact=false)=>glyphIndex.query(window).filter(e=>!(tornadoEffect?.until>performance.now()&&tornadoEffect.positions.has(key(e.x,e.y)))&&!(rodentEffect?.until>performance.now()&&rodentEffect.keys.has(key(e.x,e.y)))&&!(['shift','sapper'].includes(selection?.tool)&&bombIndex.query(window).some(b=>b.x===e.x&&b.y===e.y))).map(e=>({id:'glyph:'+key(e.x,e.y),markup:`<span class="cell static-cell-card ${e.type==='event'?'phenomenon-marker':''}" data-cell-glyph="${e.kind}" data-glyph-x="${e.x}" data-glyph-y="${e.y}" style="${style(e)}${compact?';width:32px;height:32px':''}" role="img" aria-label="${glyphLabel(e)}">${glyphMarkup(e)}</span>`}));
  const density=size<24?snapshotMemo(room,'board-density:'+uid+':'+target?.id,()=>{const model=overviewModel(room,own,target,{includeFrontiers:false});return {model,index:prepareMapRendering(model)};}):null;
  const animationEntries=(window,compact=false)=>rodentEffect?.until>performance.now()?rodentEffect.index.query(window).slice(0,compact?33:Infinity).map(visit=>{const id='board-action:'+key(visit.x,visit.y);return {id,markup:nodes.get(id)?.markup||`<span class="cell board-action ${visit.inventory?'inventory-action':''} board-action-${visit.kind}" data-animation-kind="${visit.kind}" data-animation-x="${visit.x}" data-animation-y="${visit.y}" style="${style(visit)}${compact?';width:32px;height:32px':''};--visit-delay:${Math.min(0,rodentEffect.until-performance.now()-900)+Math.min(600,(visit.group||0)*60)}ms" aria-hidden="true">${visit.inventory?toolIcon(visit.kind):ecologyIcon(visit.kind)}</span>`};}):[];
  let lastEntries=null,lastExtras=null;
  refreshBoard=()=>{
   if(!board.isConnected)return;
   const now=performance.now(),window=viewportCellWindow(viewport,layout);
   const visiting=!!rodentEffect&&rodentEffect.until>now,swirling=!!tornadoEffect&&tornadoEffect.until>now;
   if(density){
    const entries=[{id:'board-map',markup:`<svg class="board-overview-map ${size>=MAP_SYMBOL_SCALE?'show-symbols':''}" data-action="board-overview" style="left:${(window.x-minX)*size+padding}px;top:${(window.y-minY)*size+padding}px;width:${window.width*size}px;height:${window.height*size}px" viewBox="${window.x} ${window.y} ${window.width} ${window.height}" role="img" aria-label="Vista general del tablero; toca para acercarte">${mapWindowMarkup(density.model,density.index,window,size)}</svg>`}];
    entries.push(...glyphEntries(window,true).slice(0,33));
    entries.push(...animationEntries(window,true));entries.push(...impactFocusEntries(impactFocus,window,style,true));
    nodes=reconcileCells(board,entries,nodes);return;
   }
   const visible=visibleCells.query(window,`${!!figureEffect&&figureEffect.until>now||!!landingEffect&&landingEffect.until>now}:${swirling}:${visiting}`);
   const extras=`${visiting}:${swirling}:${!!impactFocus&&impactFocus.until>performance.now()}:${!!figureEffect&&figureEffect.floatUntil>now||!!landingEffect&&landingEffect.floatUntil>now}:${selectedExpansion?.x},${selectedExpansion?.y}`;
   if(visible===lastEntries&&extras===lastExtras)return;
   lastEntries=visible;lastExtras=extras;
   const entries=[...visible];
   entries.push({id:'worm-trail',markup:`<svg class="worm-trail-layer" style="left:${(window.x-minX)*size+padding}px;top:${(window.y-minY)*size+padding}px;width:${window.width*size}px;height:${window.height*size}px" viewBox="${window.x} ${window.y} ${window.width} ${window.height}" aria-hidden="true">${wormTrailMarkup(wormTrailIndex.query(window),{})}</svg>`});
   entries.push(...choiceIndex.query(window).map(c=>({id:'choice:'+key(c.x,c.y),markup:`<button class="placement-anchor new-anchor" data-action="select-expansion" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Situar ampliación en ${c.x}, ${c.y}">+</button>`})));
  if(ready&&activationTargets.length)entries.push(...activationIndex.query(window).map(c=>({id:'activate:'+key(c.x,c.y),markup:`<button class="cell activation-hole tool-target" data-action="inventory-target" data-x="${c.x}" data-y="${c.y}" style="${style(c)}" aria-label="Construir celda ${c.x}, ${c.y}">${navIcon('activate')}</button>`})));
  if(areaSelection){
   for(const point of areaIndex.query(window).filter(p=>selection.tool!=='tornado'||!known.has(key(p.x,p.y))))entries.push({id:'area:'+key(point.x,point.y),markup:`<button class="cell ${selection.tool==='tornado'?'tornado-anchor':'tool-target'} area-anchor ${['frontier','border'].includes(selection.tool)?'frontier-anchor':''}" data-action="inventory-target" data-x="${point.x}" data-y="${point.y}" style="${style(point)}" aria-label="Situar ${microLength(selection.tool)>1?'Ampliación +'+microLength(selection.tool):selection.tool==='tornado'?'Tornado 3×3':selection.tool==='bomb'?'Bomba':selection.tool==='border'?'Frontera de tres celdas':'Muro de una casilla'} en ${point.x}, ${point.y}">${['expand-2','expand-3','frontier','border'].includes(selection.tool)?'+':selection.tool==='tornado'?'·':'◇'}</button>`});
   if(microLength(selection.tool)>1)for(const cell of selection.cells||[])entries.push({id:'micro-preview:'+key(cell.x,cell.y),markup:`<div class="cell micro-selected-preview" style="${style(cell)}" aria-hidden="true">+</div>`});
   if(selection.point&&microLength(selection.tool)<2&&selection.tool!=='nuclear'){const p=selection.point;if(['frontier','border'].includes(selection.tool)){
    const valid=targets.has(key(p.x,p.y));
    for(const [i,cell] of (selection.tool==='border'?(selection.cells||[]).map(c=>({...c,borderCell:true})):frontierTiles({...p,side:selection.side||'north'})).entries())entries.push({id:'frontier-preview:'+key(cell.x,cell.y),markup:boardFrontierCell(cell,minX,minY,size,padding,true,selection.tool!=='border'&&i===0,valid)});
   }else entries.push({id:'area-preview',markup:`<div class="placement-preview area-preview ${selection.tool==='bomb'?'bomb-preview':'tornado-preview'}" style="left:${(p.x-minX)*size+padding}px;top:${(p.y-minY)*size+padding}px;width:${(selection.tool==='bomb'?1:3)*size}px;height:${(selection.tool==='bomb'?1:3)*size}px" aria-hidden="true"></div>`});}
  }
  for(const c of reservationIndex.query(window))entries.push({id:'project:'+key(c.x,c.y),markup:`<div class="cell project-build construction-ghost" style="${style(c)}" aria-label="Proyecto de construcción: celda reservada ${c.x}, ${c.y}"><span class="project-reservation">·</span></div>`});
  for(const cell of frontierIndex.query(window))entries.push({id:'frontier:'+cell.frontierId+key(cell.x,cell.y)+cell.borderSide,markup:boardFrontierCell(cell,minX,minY,size,padding,false,false,true,ready&&selection?.tool==='bomb'&&areaKeys.has(key(cell.x,cell.y)),(!glyphs.has(key(cell.x,cell.y))||glyphs.get(key(cell.x,cell.y)).type==='frontier')&&!(rodentEffect?.until>performance.now()&&rodentEffect.keys.has(key(cell.x,cell.y))))});
  if(figureEffect&&figureEffect.floatUntil>performance.now()){
    const e=figureEffect;
    entries.push({id:'score',markup:nodes.get('score')?.markup||`<span class="score-float ${e.symbol.toLowerCase()}" style="left:${(e.move.x-minX+.5)*size+padding}px;top:${(e.move.y-minY)*size+padding}px;animation-duration:${Math.max(1,e.floatUntil-performance.now())}ms" aria-hidden="true">+${e.points}</span>`});
  }
  if(landingEffect&&landingEffect.floatUntil>performance.now())for(const score of landingEffect.scores){
    if(!score.move)continue;
    const id='landing-score:'+landingEffect.id+':'+score.symbol;
    entries.push({id,markup:nodes.get(id)?.markup||`<span class="score-float landing-score-float ${score.symbol.toLowerCase()}" style="left:${(score.move.x-minX+.5)*size+padding}px;top:${(score.move.y-minY)*size+padding}px;animation-duration:${Math.max(1,landingEffect.floatUntil-performance.now())}ms" aria-hidden="true">+${score.points}</span>`});
  }
  if(selectedExpansion) {
    const b=selectedExpansion;
    entries.push({id:'preview',markup:`<div class="placement-preview" style="left:${(b.x-minX)*size+padding}px;top:${(b.y-minY)*size+padding}px;width:${3*size}px;height:${3*size}px" aria-hidden="true"></div>`});
  }
  if(['shift','sapper'].includes(selection?.tool))for(const bomb of bombIndex.query(window)){
    const chosen=selection.source?.bombId===bomb.id,selectable=!selection.source;
    if(!selectable&&!chosen)continue;
    const tag=selectable?'button':'span';
    entries.push({id:'bomb-source:'+bomb.id,markup:`<${tag} class="cell pending-invasion-bomb ${chosen?'tool-source':'tool-target'}" ${selectable?'data-action="inventory-target"':''} data-bomb-id="${bomb.id}" data-x="${bomb.x}" data-y="${bomb.y}" style="${style(bomb)}" aria-label="${selection.tool==='sapper'?'Desactivar':'Desplazar'} bomba pendiente en ${bomb.x}, ${bomb.y}"><svg viewBox="0 0 64 64" ${selection.tool==='sapper'?'style="color:var(--red)"':''} aria-hidden="true">${invasionBombIcon}${selection.tool==='sapper'?bombDisarmCross:''}</svg><b>${bomb.turnsRemaining}↷</b></${tag}>`});
  }
  entries.push(...glyphEntries(window));
  for(const c of territoryIndex.query(window))entries.push({id:'territory-warning:'+c.eventId+key(c.x,c.y),markup:`<span class="cell territory-warning territory-${c.kind}" style="${style(c)}" aria-hidden="true"></span>`});
  entries.push(...animationEntries(window));entries.push(...impactFocusEntries(impactFocus,window,style));
  if(swirling)for(const [i,m] of tornadoEffect.moves.entries()){
   const left=Math.min(m.from.x,m.to.x),top=Math.min(m.from.y,m.to.y);
   if(left>window.x+window.width||top>window.y+window.height||Math.max(m.from.x,m.to.x)+1<window.x||Math.max(m.from.y,m.to.y)+1<window.y)continue;
   if(hidden.has(key(m.from.x,m.from.y))||hidden.has(key(m.to.x,m.to.y)))continue;
   const color=m.symbol==='#'?'neutral'+(m.wildcardSymbol?' wildcard-'+m.wildcardSymbol.toLowerCase():''):myPairIds.has(m.owner)?m.symbol.toLowerCase():'foreign';
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
  if(pendingDelete)return;gameSelection=null;hallDialog=hallHistory.pop()||null;document.querySelector('.hall-dialog')?.remove();
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
  const previous=document.querySelector('.hall-dialog .dialog'),scroll=hallDialog==='games'?previous?.scrollTop||0:0,closedOpen=previous?.querySelector('.closed-games')?.open||false;
  document.querySelector('.hall-dialog')?.remove();
  const local=savedLocal();let markup;
  if(hallDialog==='help')markup=hallDialogFrame('Cómo se juega',rulesMarkup);
  else if(hallDialog==='achievements')markup=hallDialogFrame('Logros',achievementsMarkup(loadTerritoryResults(localStorage,localGames()),achievementView||{}),{home:true});
  else if(hallDialog==='inventory')markup=hallDialogFrame('Inventario',`<div class="inventory-catalog">${inventoryMarkup(null,null,{showShortcuts:false,openTools:hallDescriptionsOpen})}</div>`,{home:true,actions:inventoryShortcutsMarkup()});
  else if(hallDialog==='ranking'){markup=hallDialogFrame('Ranking y métricas',`${metricsModePicker(metricView==='personal'?metricMode:null)}<div class="metrics-classification"><button class="mode-green" data-action="metrics-view" data-view="world" aria-pressed="${metricView==='world'}" ${modeAvailable('world')?'':'disabled title="En construcción"'}>${hallIcon('world')}Clasificación Mundo${modeAvailable('world')?'':' · En construcción'}</button></div>${metricView==='world'?worldRankMarkup(hallRanking,uid):metricsMarkup({...metricState,entries:[...localMetrics(localGames()),...metricState.entries],mode:metricMode,showModes:false})}`,{home:true});
  }else if(hallDialog==='games'){markup=hallDialogFrame('Mis partidas',gamesMarkup({...myGames,local:localGames(),pins:loadGamePins(localStorage),uid,selection:gameSelection}),{home:true,actions:gamesSelectionActions(gameSelection)});
  }else markup=hallDialogMarkup(hallDialog,{name:read('hash3_name')||'',mode:hallMode,code:urlCode,friendInvite:!!urlRival,local,hasPrevious:hallHistory.length>0});
  app.insertAdjacentHTML('beforeend',markup);
  if(hallDialog==='profile'){
   hydrateProfileAccess();
   if(!ONLINE_ENABLED)bindLocalTransfer(document.querySelector('.profile-screen'),{storage:localStorage,base:location.href,incoming:incomingTransfer,onCancelled:()=>{incomingTransfer=null;},onImported:()=>{incomingTransfer=null;notify('Copia recuperada. Tus partidas están en Mis partidas.');void openMyGames();}});
  }
  if(hallDialog==='games'){
   const dialog=document.querySelector('.hall-dialog .dialog');dialog.classList.add('saved-games-dialog');
   dialog.querySelector('.closed-games').open=closedOpen;dialog.scrollTop=scroll;bindOnlineThumbnails();
  }
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
  dialog.addEventListener('click',e=>{if(e.target===dialog&&!busy&&!pendingDelete)closeHallDialog();});
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
 if(!token)throw Error('Pega un enlace de perfil válido de #33. Comprueba que está completo.');
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
function clearGameView(){clearTimeout(inverseBeeTimer);inverseBeeEffect=null;inverseClaimSelection=null;inverseFocus=null;inverseFocusStep=0;contourFocusStep=0;inverseFocusGame=null;clearTimeout(impactFocusTimer);impactFocus=null;refillPlayer=null;targetMarking=false;clearTornadoEffect();disposeMap?.();disposeMap=null;cancelAnimationFrame(boardFrame);boardFrame=0;refreshBoard=()=>{};disposeInspection?.();disposeInspection=null;pauseMapOpen=false;pauseMapState={};stopMachine();resetInventoryFeedback();superHelpPlan=null;room=null;eventsOpen=false;inventoryOpen=false;inventorySelection=null;rankOpen=false;worldMapOpen=false;finishOpen=false;leaveOpen=false;selectedExpansion=null;activeKey=null;mapInteracting=false;mapDeferred=false;history.replaceState(null,'',location.pathname);}
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
 gameSelection=null;const request=++gamesRequest;myGames={online:[],loading:ONLINE_ENABLED&&navigator.onLine,error:''};
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
 const own=ownPlayer();
 const mode=isLocal()?((isInverse(room)?'Inverso · ':'')+(room.mode==='solo'?'VS máquina':'Sin conexión')):room.kind==='duel'?'Duelo':'Sala libre';
 const list=gameRank();
 const ranking=`<section class="paused-ranking" aria-label="Ranking de la partida pausada"><h2 class="heading">Marcador</h2><ol>${list.map((p,i)=>`<li class="${p.id===uid?'me '+own.symbol.toLowerCase():''}"><b class="rank-position ${['gold','silver','bronze'][i]||''}">${i+1}</b><div><strong>${escape(p.name)}${p.id===uid?' · tú':''}</strong><span>${p.score.toLocaleString('es-ES')} puntos · #MAX ${maxLabel(p)}</span><div class="rank-detail-line"><small>Combo máx. ${comboLabel(p)} · ${escape(rodentLabel(room,p.id))}</small>${playerGameSettingsMarkup(room,p.id)}</div></div></li>`).join('')}</ol></section>`;
 const inspection=savedMapModel(room,own);
 const inspectButton=(action,kind,label)=>`<button data-inspect-action="${action}" aria-label="${label}" title="${label}">${navIcon(kind)}</button>`;
 const mapControls=inspection?`<nav class="inspection-controls inspection-toolbar" aria-label="Controles del mapa guardado"><span class="inspection-metadata">${inspection.terrain.length.toLocaleString('es-ES')} casillas · ${inspection.bounds.width-4} × ${inspection.bounds.height-4}</span><div class="inspection-tools">${pausedInventorySummaryMarkup(room,uid,{interactive:true,open:inventoryOpen&&inventorySection==='player'})}<div class="inspection-map-actions">${inspectButton('fit','fit','Ver mapa completo')}${targetNavigation(room,{inspection:true,playerId:uid})}${pauseMapOpen?iconButton('close-pause-map','restore','Salir de pantalla completa'):iconButton('expand-pause-map','fullscreen','Ampliar mapa a pantalla completa')}</div></div></nav>`:'';
 const preferences=inventoryPreferences(room,uid,localStorage),mapStatus=inventoryBandMarkup(inventoryStatusMarkup(room,{paused:true,playerId:uid,preferences,includeCapacity:false}),room,uid,preferences),mapEcology=isInverse(room)?'':territoryBandMarkup(`<nav class="inspection-controls ecology-controls" aria-label="Fauna y fenómenos del territorio">${ecologyNavigationMarkup(room,uid,{inspection:true})}</nav>`,preferences);
 const canvas='<svg class="inspection-canvas" tabindex="0" role="img" aria-label="Tablero guardado: arrastra o pellizca para inspeccionar. Con teclado, flechas para moverte y más o menos para acercar."></svg>';
 const minimap=inspection?`<section class="paused-minimap inspection-panel" aria-label="Mapa de la partida pausada">${mapControls}${mapStatus}${canvas}${mapEcology}${floatingInventoryMarkup(room,uid,preferences)}</section>`:'';
 disposeInspection?.();disposeInspection=null;
 app.innerHTML=`<section class="lobby paused-game ${isInverse(room)?'inverse-game':''}"><header class="row spread lobby-header"><span class="brand heading">${brandMark}</span><span class="tag">${VERSION_LABEL} · ${mode}</span></header><div class="paused-heading"><h1 class="heading">Partida pausada</h1><nav class="paused-actions" aria-label="Acciones de partida pausada">${iconButton('resume','play',isLocal()?'Retomar partida':'Solicitar reanudación','class="primary"')}${iconButton('go-games','games','Mis partidas')}${isLocal()||room.host===uid?iconButton('finish','finish','Finalizar partida','class="danger"'):''}${iconButton('go-hall','home','Volver al hall')}</nav></div>${voteMarkup(room.vote,uid)}${pausedScoreMarkup(room,{ranking})}${inverseBeeClocks(room,uid,{paused:true})}${inverseBeeNotices(room,{paused:true})}<div class="paused-details">${minimap}</div></section>`;
 if(inspection){
   if(pauseMapOpen){document.querySelector('.paused-game').inert=true;app.insertAdjacentHTML('beforeend',`<div class="inspection-overlay"><section class="inspection-panel inspection-fullscreen" role="dialog" aria-modal="true" aria-label="Mapa de la partida pausada">${mapControls}${mapStatus}${canvas}${mapEcology}${floatingInventoryMarkup(room,uid,preferences)}</section></div>`);}
   const panel=document.querySelector(pauseMapOpen?'.inspection-fullscreen':'.paused-minimap');
   const inspectionCleanup=bindInspection(panel,inspection,pauseMapState,value=>{mapInteracting=value;if(!value&&mapDeferred){mapDeferred=false;render();}}),favoritesCleanup=bindFavoriteSurfaces([pauseMapOpen?'.inspection-fullscreen':'.paused-minimap'],preferences);disposeInspection=()=>{inspectionCleanup?.();favoritesCleanup();};
 }
 renderFinish();renderLeave();renderInventory();renderEvents();renderInventoryEditor();
}
function suspendLocal(){
 if(!isLocal()||room.status!=='playing'||busy)return;
 try{stopMachine();accept(localCommand(room,'pause'));}catch{}
}
function timeModeSelector(id,value='timed'){
 return `<label for="${id}">Ritmo de la partida</label><select id="${id}"><option value="timed" ${value==='timed'?'selected':''}>◷ Con reloj · 33 segundos por turno</option><option value="untimed" ${value==='untimed'?'selected':''}>Por turnos · sin reloj</option></select>`;
}

function playHallMode() {
  if(!modeAvailable(hallMode)){notify(ONLINE_NOTICE);return;}
  if(hallMode==='solo'){localSetup='solo';setupVariant='original';startingSelections=[[...RECOMMENDED_CARDS],[...RECOMMENDED_CARDS]];renderLocalSetup();}
  else openHallDialog(hallMode==='offline'?'offline':'online');
}
function renderLobby() {
  const finished=room.status==='finished',host=room.host===uid,list=rankedPlayers(humans()),winner=list[0];
  const players=humans().filter(p=>p.active!==false),duel=room.kind==='duel',teams=room.format==='teams';
  const scores={X:0,O:0};room.players.forEach(p=>{if(p.symbol)scores[p.symbol]+=p.score;});
  const teamResult=scores.X===scores.O?'Empate':scores.X>scores.O?(teams?'Gana el equipo X':'Gana X'):(teams?'Gana el equipo O':'Gana O');
  const count=players.length,canStart=duel?(teams?count>=4&&count%2===0:count===2):count>=1;
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">${brandMark}</span><span class="tag">${VERSION_LABEL}</span></header><div class="row spread"><h1 class="heading">${finished?(isInverse(room)?'Inverso · resultado final':'Resultado final'):'La sala está abierta'}</h1>${host?'<span class="host">ERES ANFITRIÓN</span>':''}</div>
    ${finished?`<div class="finished"><h2 class="heading">${duel?teamResult:escape(winner?.name||'Sin jugadores')} · ${duel?`X ${scores.X} / O ${scores.O}`:winner?.score||0} puntos</h2><p>${room.finishReason==='inverse-empty'?'Dibujo vaciado. Gana la mayor puntuación. ':''}${duel?'Resultado por suma de puntos de X y O; incluye las sustituciones por máquina.':list.filter(p=>p.score===winner?.score).length>1?'Hay empate en la primera posición.':'Primero en el ranking individual.'}</p></div>`:`<div class="code-panel"><label>Código de la sala</label><div class="code mono">${escape(room.code)}</div><div class="row" style="margin-top:16px"><button class="small" data-action="copy-room-code">Copiar código</button><button class="small" data-action="share">Copiar enlace</button></div></div>`}
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
  try{await operation();connected=true;}catch(error){const inventoryFeedback=!!(inventoryCardChoice||inventorySelection||refillPlayer||superHelpPlan);if(inventoryCardChoice&&!inventoryCardChoice.applied&&!inventorySelection&&!superHelpPlan&&!ownPair()?.strategicExpansion)inventoryCardChoice=null;notify(error.message||'No se ha podido conectar. Inténtalo de nuevo.',{inventory:inventoryFeedback});}
  finally{busy=false;if(room){render();scheduleMachine();}else buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}
}
bindRefillHold(app,playerId=>{
 if(busy||!isLocal()||playerId!==uid||!canOpenRefill(room,playerId))return;
 refillPlayer=playerId;refillPurchases=0;refillExchange=false;refillReplace=null;inventoryOpen=false;eventsOpen=false;renderInventory();renderEvents();document.querySelector('[data-action="inventory"]')?.setAttribute('aria-expanded','false');renderRefill();
 document.querySelector('[data-action="close-refill"]')?.focus({preventScroll:true});
});
function renderRefill(){
 document.querySelector('.refill-backdrop')?.remove();
 if(refillPlayer&&canOpenRefill(room,refillPlayer)){
  if(refillReplace&&!(room.players.find(p=>p.id===refillPlayer)?.inventory.cards[refillReplace]>0))refillReplace=null;
  app.insertAdjacentHTML('beforeend',refillSelectorMarkup(room,refillPlayer,{remaining:3-refillPurchases,exchange:refillExchange,replace:refillReplace}));
 }
 else refillPlayer=null;
}
function bindFavoriteSurfaces(selectors,preferences){
 const actor=uid,cleanups=selectors.map(selector=>bindFloatingInventory(document.querySelector(selector),preferences,(tool,point)=>{if(uid===actor)updatePreferences({...inventoryPreferences(room,actor,localStorage),positions:{...inventoryPreferences(room,actor,localStorage).positions,[tool]:point}},{paint:false,actor});}));
 return ()=>cleanups.forEach(fn=>fn());
}
function updatePreferences(preferences,{paint=true,actor=uid}={}){
 if(!isLocal()||!room.players.some(p=>p.id===actor&&!p.bot))return;
 const next=storeInventoryPreferences(room,actor,preferences,localStorage);
 try{saveLocalGame(localStorage,next,Date.parse(room.updatedAt)||room.clockNow||Date.now());room=next;if(paint)render();}
 catch{notifyInventory('No se ha podido guardar la personalización.');}
}
function focusInventoryControl(action){
 const surface=document.querySelector('.inspection-fullscreen')||document.querySelector('.world-map')||document;
 surface.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});
}
function renderInventoryEditor(){
 const scroll=document.querySelector('.inventory-editor-grid')?.scrollTop||0;
 disposeInventoryEditor?.();disposeInventoryEditor=null;document.querySelector('.inventory-editor-backdrop')?.remove();
 // A live turn change closes editing so a shared device cannot accidentally
 // write the other colonist's preferences. Paused customization is independent.
 if(!inventoryEditorOpen)return;
 if(!isLocal()||inventoryEditorActor!==uid||!['playing','paused'].includes(room.status)){inventoryEditorOpen=false;return;}
 const preferences=inventoryPreferences(room,uid,localStorage);
 inventoryEditorSelected=manualInverse(room)&&(!inventoryEnabled(room,uid)||inventoryEditorSelected==='inverse-claim')?'inverse-claim':preferences.order.includes(inventoryEditorSelected)?inventoryEditorSelected:preferences.order[0];
 app.insertAdjacentHTML('beforeend',inventoryEditorMarkup(preferences,inventoryEditorSelected,room));
 document.querySelector('.inventory-editor-grid').scrollTop=scroll;
 disposeInventoryEditor=bindInventoryEditor(document.querySelector('.inventory-editor'),(from,to)=>{inventoryEditorSelected=from;updatePreferences({...inventoryPreferences(room,uid,localStorage),order:reorderInventory(inventoryPreferences(room,uid,localStorage).order,from,to)});document.querySelector(`[data-edit-tool="${from}"] .inventory-order-handle`)?.focus({preventScroll:true});});
}
app.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  let action=b.dataset.action;
  if(action==='move'&&inverseClaimTapGuard?.id===room?.id&&performance.now()<inverseClaimTapGuard.until&&Number(b.dataset.x)===inverseClaimTapGuard.x&&Number(b.dataset.y)===inverseClaimTapGuard.y)return;
  if(['practice-tool','practice-hint','mark-target'].includes(action)&&b.closest('.world-map'))worldMapOpen=false;
  if(['toggle-inventory-bar','toggle-territory-bar','toggle-inventory-drawer','toggle-territory-drawer'].includes(action)){
   const preferences=inventoryPreferences(room,uid,localStorage),flag={'toggle-inventory-bar':'inventoryCollapsed','toggle-territory-bar':'territoryCollapsed','toggle-inventory-drawer':'inventoryDrawerCollapsed','toggle-territory-drawer':'territoryDrawerCollapsed'}[action];
   updatePreferences({...preferences,[flag]:!preferences[flag]});focusInventoryControl(action);return;
  }
  if(action==='edit-inventory-layout'){
   inventoryEditorActor=uid;inventoryEditorOpen=true;inventoryEditorSelected=null;refillPlayer=null;inventoryOpen=false;eventsOpen=false;renderRefill();renderInventory();renderEvents();renderInventoryEditor();document.querySelector('[data-action="close-inventory-layout"]')?.focus({preventScroll:true});return;
  }
  if(action==='close-inventory-layout'){inventoryEditorOpen=false;renderInventoryEditor();focusInventoryControl('edit-inventory-layout');return;}
  if(action==='inventory-edit-select'){inventoryEditorSelected=b.dataset.tool;renderInventoryEditor();document.querySelector(`[data-edit-tool="${inventoryEditorSelected}"] button`)?.focus({preventScroll:true});return;}
  if(['inventory-order-step','inventory-float-toggle','reset-inventory-layout'].includes(action)){
   if(!inventoryEditorOpen||inventoryEditorActor!==uid)return;
   const preferences=inventoryPreferences(room,uid,localStorage),id=inventoryEditorSelected;
   if(action==='inventory-order-step'){if(id==='inverse-claim')return;const destination=preferences.order[preferences.order.indexOf(id)+Number(b.dataset.direction)];preferences.order=reorderInventory(preferences.order,id,destination);}
   if(action==='inventory-float-toggle'){preferences.floating=preferences.floating.includes(id)?preferences.floating.filter(t=>t!==id):[...preferences.floating,id];if(id==='inverse-claim')preferences.inverseClaimDocked=!preferences.floating.includes(id);}
   if(action==='reset-inventory-layout'){preferences.order=[];preferences.floating=manualInverse(room)?['inverse-claim']:[];preferences.positions={};delete preferences.inverseClaimDocked;}
   updatePreferences(preferences);document.querySelector(`[data-edit-tool="${id}"] button`)?.focus({preventScroll:true});return;
  }
  if(action==='inventory-description'){
    const id=b.dataset.tool,panel=document.getElementById(b.getAttribute('aria-controls'));if(!panel)return;
    panel.hidden=!panel.hidden;b.setAttribute('aria-expanded',String(!panel.hidden));b.classList.toggle('is-open',!panel.hidden);
    b.setAttribute('aria-label',`${panel.querySelector('h3').textContent}: ${panel.hidden?'ver':'ocultar'} descripción`);
    const openSet=b.closest('.inventory-sheet')?inventoryDescriptionsOpen:hallDescriptionsOpen;if(panel.hidden)openSet.delete(id);else openSet.add(id);
    if(!panel.hidden)panel.scrollIntoView({block:'nearest',inline:'nearest'});
    return;
  }
  if(action==='territory-inventory'){
   if(!room||!['playing','paused'].includes(room.status))return;
   inventorySection='territory';inventoryDescriptionsOpen.clear();inventoryOpen=true;eventsOpen=false;renderEvents();renderInventory();
   document.getElementById('territory-guide')?.scrollIntoView({block:'start'});return;
  }
  if(action==='expand-pause-map'||action==='close-pause-map'){
    pauseMapOpen=action==='expand-pause-map';renderPaused();document.querySelector(pauseMapOpen?'[data-action="close-pause-map"]':'[data-action="expand-pause-map"]')?.focus({preventScroll:true});return;
  }
  if(action==='toggle-game-menu'){
    const menu=b.parentElement.querySelector('.saved-game-menu'),open=menu.hidden;
    document.querySelectorAll('.saved-game-menu').forEach(m=>m.hidden=true);document.querySelectorAll('[data-action="toggle-game-menu"]').forEach(t=>t.setAttribute('aria-expanded','false'));
    menu.hidden=!open;b.setAttribute('aria-expanded',String(open));return;
  }
  if(action==='pin-game'){pinSavedGame(b.closest('.saved-game'));return;}
  if(action==='locate-inverse-fill'||action==='locate-inverse-contour'){
    if(!filledInverse(room)||room.status!=='playing')return;
    if(worldMapOpen){worldMapOpen=false;render();}
    const viewport=document.querySelector('.viewport');if(!viewport)return;
    const tile=Math.max(1,Math.min(9,Math.floor((viewport.clientHeight-40)/28)));
    const groups=snapshotMemo(room,'inverse-focus:'+tile,()=>inverseFocusGroups(room,tile));
    if(inverseFocusGame!==room.id){inverseFocusStep=0;contourFocusStep=0;inverseFocusGame=room.id;}
    let points;
    if(action==='locate-inverse-contour'){
     const fill=new Set(room.inverseFill),keys=room.inverseContour?.targets.length?room.inverseContour.targets.filter(k=>fill.has(k)):room.inverseContourEvent?.cleared||[];
     const threatened=snapshotMemo(room,'inverse-contour-focus:'+tile,()=>inverseFocusGroups({inverseFill:keys},tile));
     points=threatened.length?threatened[contourFocusStep++%threatened.length]:[];
    }
    else points=groups.length?groups[inverseFocusStep++%groups.length]:[];
    if(!points.length)return;
    inverseFocus={game:room.id,points,impact:action==='locate-inverse-contour'&&!room.inverseContour?.targets.length};const fit=extensionView(points,{width:viewport.clientWidth,height:viewport.clientHeight},innerWidth<=760?48:56);
    worldMapOpen=false;rankOpen=false;zoom=fit?.zoom||1;render();center(fit.x,fit.y);document.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});return;
  }
  if(action==='invalid-cell'){if(!busy&&room?.status==='playing'&&ownPair()?.turn===ownPlayer()?.symbol&&!ownPair()?.pending){b.classList.remove('invalid-flash');void b.offsetWidth;b.classList.add('invalid-flash');setTimeout(()=>b.classList.remove('invalid-flash'),360);}return;}
  if(action==='start-game-selection'){gameSelection=new Set();renderHallDialog();document.querySelector('[data-action="select-all-games"]')?.focus({preventScroll:true});return;}
  if(action==='cancel-game-selection'){gameSelection=null;renderHallDialog();document.querySelector('[data-action="start-game-selection"]')?.focus({preventScroll:true});return;}
  if(action==='select-game'){selectSavedGame(b.closest('.saved-game'));return;}
  if(action==='select-all-games'){
    if(busy)return;
    gameSelection=new Set();
    const games=[...localGames().map(g=>({...g,local:true})),...(myGames.online||[]).map(g=>({...g,local:false}))];
    for(const game of games){
      try{assertGameDeletionAllowed(localStorage,game,uid);gameSelection.add(gamePinKey(game,uid));}catch{/* Protected saves stay unselected. */}
    }
    renderHallDialog();document.querySelector('[data-action="delete-selected-games"]')?.focus({preventScroll:true});return;
  }
  if(action==='delete-game'||action==='delete-selected-games'){
    if(busy)return;
    const targets=action==='delete-game'?[savedGameFromRow(b.closest('.saved-game'))].filter(Boolean):selectedSavedGames();
    if(!targets.length)return;
    try{for(const game of targets)assertGameDeletionAllowed(localStorage,game,uid);}catch(error){notify(error.message);return;}
    pendingDelete={targets};renderDeleteGame();return;
  }
  if(action==='cancel-delete'){if(!busy)cancelGameDeletion();return;}
  if(action==='confirm-delete'){
    if(busy||!pendingDelete)return;e.preventDefault();e.stopPropagation();
    const targets=pendingDelete.targets,removed=new Set();let failure=null;busy=true;
    const buttons=[...app.querySelectorAll('button')].map(button=>[button,button.disabled]);buttons.forEach(([button])=>button.disabled=true);
    try{
      for(const target of targets)assertGameDeletionAllowed(localStorage,target,uid);
      const locals=targets.filter(g=>g.local);
      if(locals.length){deleteLocalGames(localStorage,locals.map(g=>g.id));for(const g of locals)removed.add(gamePinKey(g,uid));}
      for(const target of targets.filter(g=>!g.local)){
        uid=await ensurePlayer();await previewRequests.get(`${uid}:${target.id}`)?.catch(()=>{});
        assertGameDeletionAllowed(localStorage,target,uid);await command('remove_game',{code:target.code});
        myGames.online=myGames.online?.filter(g=>g.id!==target.id)||[];removed.add(gamePinKey(target,uid));
      }
    }catch(error){failure=error;}
    finally{
      busy=false;for(const [button,disabled]of buttons)if(button.isConnected)button.disabled=disabled;
      if(gameSelection)for(const key of removed)gameSelection.delete(key);
      pendingDelete=null;document.querySelector('.delete-dialog')?.remove();
      if(room&&targets.some(g=>removed.has(gamePinKey(g,uid))&&g.id===room.id)){clearGameView();hallDialog='games';renderHome();}
      else renderHallDialog();
      document.querySelector(gameSelection?'[data-action="select-all-games"]':'[data-action="start-game-selection"]')?.focus({preventScroll:true});
    }
    notify(failure?`${removed.size?removed.size+' partidas eliminadas. ':''}${failure.message||'No se ha podido completar el borrado. Las restantes se conservan.'}`:removed.size===1?'Partida eliminada.':`${removed.size} partidas eliminadas.`);return;
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
    try{await navigator.share({title:'#33 · Acceso a mi perfil',url:link});}
    catch(error){if(error?.name!=='AbortError')profileStatus('profile-copy-status','No se pudo compartir. Prueba Copiar enlace.','error');}
   }else await copySavedProfileLink();
   return;
  }
  if(action==='close-refill'){refillPlayer=null;renderRefill();document.querySelector('[data-action="refill-hold"]')?.focus({preventScroll:true});return;}
  if(action==='refill-mode'){
   if(!refillPlayer||!canOpenRefill(room,refillPlayer))return;refillExchange=b.dataset.mode==='exchange';refillReplace=null;renderRefill();return;
  }
  if(action==='refill-replace'||action==='refill-replace-clear'){
   if(!refillExchange||!refillPlayer||!canOpenRefill(room,refillPlayer))return;
   refillReplace=action==='refill-replace-clear'?null:b.dataset.tool;renderRefill();return;
  }
  if(action==='refill-buy'){
    const playerId=b.dataset.player;if(playerId!==refillPlayer||playerId!==uid||refillPurchases>=3||!canOpenRefill(room,playerId))return;
    const tool=b.dataset.tool,replace=refillExchange?refillReplace:null;if(refillExchange&&!replace)return;
    await run(async()=>{const before=room.players.find(p=>p.id===playerId).score,next=localCommand(room,'trade',{tool,playerId,replace}),spent=before-next.players.find(p=>p.id===playerId).score;refillPurchases++;refillReplace=null;if(refillPurchases>=3)refillPlayer=null;accept(next);notifyInventory(`${replace?'Cambio · −1 '+practiceTools.find(t=>t.id===replace).label:'Recarga'} · +1 ${(tool==='immunity'?'Inmunidad total':practiceTools.find(t=>t.id===tool).label)} · −${spent} puntos`);});
    (document.querySelector(`.refill-selector [data-tool="${tool}"]:not(:disabled)`)||document.querySelector('[data-action="close-refill"]')||document.querySelector('[data-action="refill-hold"]'))?.focus({preventScroll:true});return;
  }
  if(action==='remove-target'){if(!isLocal())return;await run(async()=>accept(localCommand(room,'remove-target',{id:b.dataset.id})));return;}
  if(action==='inverse-claim-toggle'){
    if(!canClaimInverse(room,uid))return;
    inverseClaimSelection=inverseClaimSelection?null:{};inventorySelection=null;inventoryOpen=false;worldMapOpen=false;render();return;
  }
  if(action==='inverse-claim-cancel'){inverseClaimSelection=null;render();return;}
  if(action==='inverse-claim-cell'){
    if(!canClaimInverse(room,uid))return;
    const point={x:Number(b.dataset.x),y:Number(b.dataset.y)},figures=inverseClaimsAt(room,uid,point);
    if(!figures.length){inverseClaimSelection={...point};render();return;}
    inverseClaimSelection=null;inverseClaimTapGuard={id:room.id,...point,until:performance.now()+333};await run(async()=>accept(localCommand(room,'claim',{...point,figureId:figures[0].id})));return;
  }
  if(action==='inverse-claim-choice'){
    if(!inverseClaimSelection)return;
    const f=inverseClaimsAt(room,uid,inverseClaimSelection)[Number(b.dataset.index)];if(f){inverseClaimSelection.figureId=f.id;render();}return;
  }
  if(action==='inverse-claim-confirm'){
    if(!inverseClaimSelection?.figureId)return;
    await run(async()=>accept(localCommand(room,'claim',{x:inverseClaimSelection.x,y:inverseClaimSelection.y,figureId:inverseClaimSelection.figureId})));return;
  }
  if(action==='mark-target'){if(!targetMarking&&(room.playerInventory===false||room.status!=='playing'))return;targetMarking=!targetMarking;inventorySelection=null;inventoryOpen=false;render();return;}
  if(action==='watch-target-cell'){await run(async()=>accept(localCommand(room,'watch-target',{x:Number(b.dataset.x),y:Number(b.dataset.y)})));return;}
  if(action==='locate-target'){
    const p=room.watchTargets?.find(p=>p.id===b.dataset.id);if(!p)return;
    if(targetMarking){await run(async()=>accept(localCommand(room,'watch-target',p)));return;}
    b.closest('details')?.removeAttribute('open');const map=b.closest('.world-map');if(map){map.dispatchEvent(new CustomEvent('map-focus',{detail:{x:p.x+.5,y:p.y+.5}}));return;}
    targetMarking=false;zoom=1;render();center(p.x,p.y);return;
  }
  if(action==='locate-destination'){
    const p=targetDestinations(room,uid).find(p=>p.id===b.dataset.destination)?.point;if(!p)return;
    b.closest('details')?.removeAttribute('open');const map=b.closest('.world-map');if(map){map.dispatchEvent(new CustomEvent('map-focus',{detail:{x:p.x+.5,y:p.y+.5}}));return;}
    targetMarking=false;rankOpen=false;worldMapOpen=false;zoom=1;render();center(p.x,p.y);return;
  }
  if(action==='open-event-warning'){eventsOpen=true;inventoryOpen=false;render();return;}
  if(action==='focus-event-warning'){
    const kind=b.dataset.kind,e=turnWarnings(room).find(e=>e.id===b.dataset.id&&e.kind===kind);
    const item=e?.region?.[0]||(kind==='destroy'?e?.destroy?.[e.done||0]:e?.build?.[e.done||0])||e?.members?.[0]||e;
    if(!item||!Number.isFinite(item.x))return;
    eventsOpen=false;worldMapOpen=false;zoom=1;render();center(item.x,item.y);return;
  }
  if(action==='events'||action==='map-events'){eventsOpen=!eventsOpen;inventoryOpen=false;render();return;}
  if(action==='close-events'){eventsOpen=false;renderEvents();document.querySelector('[data-action="events"]')?.focus();return;}
  if(action==='inventory'||action==='map-inventory'){inverseClaimSelection=null;worldMapOpen=false;eventsOpen=false;inventoryOpen=!(inventoryOpen&&inventorySection==='player');inventorySection='player';inventoryDescriptionsOpen.clear();if(inventorySelection)inventoryCardChoice=null;inventorySelection=null;render();return;}
  if(action==='close-inventory'){inventoryOpen=false;render();document.querySelector('[data-action="inventory"]')?.focus({preventScroll:true});return;}
  if(action==='practice-hint'){
    const kind=b.dataset.tool||b.dataset.useTool||'hint';
    if(!canUsePracticeTool(room,uid,kind)){notifyInventory('Herramienta no disponible en este turno.');return;}
    inventoryCardChoice={player:uid,tool:kind,at:performance.now(),applied:false};inventorySelection=null;inventoryOpen=false;render();
    if(kind==='hint-expand'){await run(async()=>{const id=room.id,version=room.version,point=await analyzeHelp('expand');if(room.id!==id||room.version!==version)throw new Error('La partida ha cambiado.');const next=useExpansionHint(room,uid,Date.now(),point);selectedExpansion={x:point.x,y:point.y};inventoryOpen=false;accept(next);center(point.x+1,point.y+1);notifyInventory('Ampliación sugerida. Puedes colocarla o elegir otra.');});return;}
    if(kind==='super-hint'){await run(async()=>{superHelpPlan=await analyzeHelp('super');inventoryOpen=false;render();});return;}
    await run(async()=>{const next=usePracticeHint(room,uid);inventoryOpen=false;accept(next);center(next.practiceHint.x,next.practiceHint.y);});return;
  }
  if(action==='cancel-super-help'){inventoryCardChoice=null;superHelpPlan=null;render();return;}
  if(action==='confirm-super-help'){await run(async()=>{const plan=superHelpPlan,score=room.players.find(p=>p.id===uid).score,next=executeSuperHelp(room,plan),gained=next.players.find(p=>p.id===uid).score-score;superHelpPlan=null;accept(next);notifyInventory(`Súper Ayuda completada · +${gained} puntos.`);});return;}
  if(action==='practice-tool'){inverseClaimSelection=null;
    const tool=b.dataset.tool||b.dataset.useTool,toolPlayer=b.dataset.player||uid;
    if(!canUsePracticeTool(room,toolPlayer,tool)){notifyInventory('Herramienta no disponible en este turno.');return;}
    inventoryCardChoice={player:toolPlayer,tool,at:performance.now(),applied:false};inventorySelection=null;
    if(!['double','rival','combo','immunity'].includes(tool)){inventorySelection={player:uid,tool};inventoryOpen=false;render();return;}
    await run(async()=>{const next=localCommand(room,'inventory',{tool,playerId:toolPlayer});inventoryOpen=false;accept(next);});return;
  }
  if(action==='cancel-tool-selection'){inventoryCardChoice=null;inventorySelection=null;render();return;}
  if(action==='inventory-target'&&microLength(inventorySelection?.tool)>1){
    const selection=inventorySelection,point={x:Number(b.dataset.x),y:Number(b.dataset.y)},chosen=selection.cells||[],length=microLength(selection.tool);
    const index=chosen.findIndex(c=>c.x===point.x&&c.y===point.y);
    if(index>=0)selection.cells=chosen.slice(0,index);
    else if(microSelectionOptions(room,length,chosen).some(c=>c.x===point.x&&c.y===point.y))selection.cells=[...chosen,point];
    selection.point=selection.cells?.[0];
    if(selection.cells?.length===length)action='confirm-area-tool';else{render();return;}
  }
  if(action==='inventory-target'&&inventorySelection?.tool==='border'){
    const selection=inventorySelection,point={x:Number(b.dataset.x),y:Number(b.dataset.y)},chosen=selection.cells||[];
    const index=chosen.findIndex(c=>c.x===point.x&&c.y===point.y);
    if(index>=0)selection.cells=chosen.slice(0,index);
    else if(borderOptions(room,chosen).some(c=>c.x===point.x&&c.y===point.y))selection.cells=[...chosen,point];
    selection.point=selection.cells?.[0];
    if(selection.cells?.length===3)action='confirm-area-tool';else{render();return;}
  }
  if(action==='inventory-target'&&inventorySelection?.tool==='frontier'){
    const choice=selectFrontier(inventorySelection,{x:Number(b.dataset.x),y:Number(b.dataset.y)},frontierAnchors(room,uid));
    inventorySelection=choice.selected;
    if(choice.confirm)action='confirm-area-tool';else{render();return;}
  }
  if(action==='inventory-target'&&['bomb','nuclear'].includes(inventorySelection?.tool)){
    const selection=inventorySelection,point={x:Number(b.dataset.x),y:Number(b.dataset.y)};
    if(selection.player!==uid)return;
    if(selection.point?.x===point.x&&selection.point?.y===point.y)action='confirm-area-tool';
    else{selection.point=point;render();return;}
  }
  if(action==='confirm-area-tool'){
    const selection=inventorySelection;if(!selection?.point)return;
    await run(async()=>{const next=localCommand(room,'inventory',{tool:selection.tool,playerId:uid,...selection.point,cells:selection.cells,side:selection.side||'north'});inventorySelection=null;accept(next);if(!next.lastEvent.landing?.length)notifyInventory(selection.tool==='nuclear'?`Bomba atómica · ${next.lastEvent.demolished} celdas demolidas · puntos conservados. ${next.pairs[0].pending?'Sitúa tu ampliación.':'Coloca tu ficha.'}`:selection.tool==='tornado'?'Tornado: mezcla las fichas y los huecos del 3×3.':selection.tool==='frontier'?(next.pairs[0].pending?'Muro colocado. Ahora sitúa tu ampliación 3×3.':'Muro colocado. Coloca tu ficha.'):`${practiceTools.find(t=>t.id===selection.tool).label} aplicada. Coloca tu ficha.`);});return;
  }
  if(action==='inventory-target'){
    const selection=inventorySelection;
    if(!selection||selection.player!==uid)return;
    if(['tornado','bomb','nuclear'].includes(selection.tool)){selection.point={x:Number(b.dataset.x),y:Number(b.dataset.y)};render();return;}
    if(['shift','swap'].includes(selection.tool)&&!selection.source){
      const bomb=b.dataset.bombId&&pendingInvasionBombs(room).find(c=>c.id===b.dataset.bombId);
      const cell=bomb||room.cells.find(c=>c.x===Number(b.dataset.x)&&c.y===Number(b.dataset.y));if(!cell)return;
      selection.source={...cell,...(bomb?{bombId:bomb.id}:{} )};render();return;
    }
    await run(async()=>{
      const destination={x:Number(b.dataset.x),y:Number(b.dataset.y)},payload=selection.source?{x:selection.source.x,y:selection.source.y,toX:destination.x,toY:destination.y,bombId:selection.source.bombId}:destination;
      const next=localCommand(room,'inventory',{tool:selection.tool,playerId:uid,...payload});
      inventorySelection=null;accept(next);if(!next.lastEvent.points&&!next.lastEvent.landing?.length)notifyInventory(selection.tool==='sapper'?`Artificieros · ${next.lastEvent.disarmed} ${next.lastEvent.disarmed===1?'bomba desactivada':'bombas desactivadas'}. Coloca tu ficha.`:`${practiceTools.find(t=>t.id===selection.tool).label} aplicada. Los puntos se conservan; coloca tu ficha.`);
    });return;
  }
  if(action==='hall-games'){await openMyGames();return;}
  if(action==='go-games'){await goToGames();return;}
  if(action==='go-hall'){await run(async()=>{if(isLocal()&&room.status==='playing')accept(localCommand(room,'pause'));goToHall();});return;}
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
  if(action==='map'||action==='close-map'){worldMapOpen=action==='map';if(worldMapOpen)rankOpen=false;render();if(worldMapOpen)document.querySelector('.world-map').dispatchEvent(new Event('map-open'));document.querySelector(worldMapOpen?'.world-map [data-action="close-map"]':'.game-minimap')?.focus({preventScroll:true});return;}
  if(action==='pair-start'){await run(async()=>{acceptPair(await command('pair_start',{code:pairLobby.code}));});return;}
  if(action==='pair-leave'){await run(async()=>{await command('pair_leave',{code:pairLobby.code});pairLobby=null;save('hash3_pair',null);renderHome();});return;}
  if(action==='pair-copy-code'){await copyGameCode(pairLobby.code,'Código de pareja');return;}
  if(action==='copy-room-code'){await copyGameCode(room.code,'Código de sala');return;}
  if(action==='pair-share'){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('pareja',pairLobby.code);await copyGameCode(url.href,'Invitación de pareja');return;}

  if(action==='hall-mode'){
    if(!hallModes.some(m=>m.id===b.dataset.mode)||!modeAvailable(b.dataset.mode))return;hallMode=b.dataset.mode;hallModeSelected=true;renderHome();playHallMode();return;
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
  if(action==='locate-impact'){
    const impact=impactNotices.find(n=>n.id===b.dataset.id)||room.territoryImpacts?.find(n=>n.id===b.dataset.id);if(!impact?.affected?.length)return;
    clearTimeout(impactFocusTimer);impactFocus=prepareImpactFocus(impact);rankOpen=false;worldMapOpen=false;inventoryOpen=false;eventsOpen=false;
    const v=document.querySelector('.viewport'),fit=extensionView(impactFocus.points,{width:v.clientWidth,height:v.clientHeight},innerWidth<=760?48:56);zoom=fit?.zoom||1;render();center(fit?.x??impactFocus.points[0].x,fit?.y??impactFocus.points[0].y);
    impactFocusTimer=setTimeout(()=>{if(impactFocus){impactFocus.until=0;refreshBoard();}},4500);return;
  }
  if(action==='locate-ecology'){
    const kind=b.dataset.ecologyKind,item=nextEcologyTarget(ecologyTargets(room,kind,uid),ecologyFocus[kind]);if(!item)return;
    ecologyFocus[kind]=item.id;
    const map=b.closest('.world-map');if(map){map.dispatchEvent(new CustomEvent('map-focus',{detail:{x:item.x+.5,y:item.y+.5}}));return;}
    rankOpen=false;worldMapOpen=false;zoom=1;render();center(item.x,item.y);return;
  }
  if(action==='locate-territory'){const event=room.territoryEvents?.find(e=>e.id===b.dataset.id);if(event){zoom=1;render();center(event.x+.5,event.y+.5);}return;}
  if(action==='center'){const p=lastNavigationMove(ownPlayer());if(!p)return;b.closest('details')?.removeAttribute('open');const map=b.closest('.world-map');if(map){map.dispatchEvent(new CustomEvent('map-focus',{detail:{x:p.x+.5,y:p.y+.5}}));return;}rankOpen=false;worldMapOpen=false;zoom=1;render();center(p.x,p.y);document.querySelector('.game-minimap')?.focus({preventScroll:true});return;}
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
      stopMachine();room=null;leaveOpen=false;finishOpen=false;selectedExpansion=null;activeKey=null;
      inventoryOpen=false;history.replaceState(null,'',location.pathname);render();notify('Has salido. Conservas tus puntos y puedes volver desde Mis partidas.');
    });return;
  }
  if(action==='home'){if(room?.status!=='finished'&&ownPlayer()?.active!==false){leaveOpen=true;renderLeave();return;}stopMachine();room=null;finishOpen=false;selectedExpansion=null;activeKey=null;history.replaceState(null,'',location.pathname);render();return;}
  if(action==='finish'){setRankingOpen(false);finishOpen=true;renderFinish();return;}
  if(action==='cancel-finish'){finishOpen=false;document.querySelector('.finish-dialog')?.remove();return;}
  if(action==='confirm-finish'){finishOpen=false;}
  if(action==='select-expansion'){const choice=selectExpansion(selectedExpansion,{x:Number(b.dataset.x),y:Number(b.dataset.y)});selectedExpansion=choice.selected;if(choice.confirm)action='confirm-expansion';else{const controls=document.querySelector('.expansion-controls');if(controls){controls.querySelector('span').textContent=expansionSummary();controls.querySelector('[data-action="confirm-expansion"]').disabled=false;}refreshBoard();return;}}
  if(action==='setup-solo'||action==='setup-local'){localReturnDialog=hallDialog;hallHistory=[];closeHallDialog(false);localSetup=action==='setup-solo'?'solo':'local';setupVariant='original';startingSelections=[[...RECOMMENDED_CARDS],[...RECOMMENDED_CARDS]];renderLocalSetup();return;}
  if(action==='setup-variant'){
    setupVariant=b.dataset.variant;
    startingSelections=setupVariant==='inverse'?[[...inverseRecommended],[...inverseRecommended]]:[[...RECOMMENDED_CARDS],[...RECOMMENDED_CARDS]];
    document.querySelectorAll('[data-action="setup-variant"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.variant===setupVariant)));
    document.querySelector('.local-dialog section').dataset.variant=setupVariant;
    document.querySelector('#original-goals').hidden=setupVariant==='inverse';document.querySelector('#inverse-options').hidden=setupVariant!=='inverse';
    document.querySelectorAll('.ecology-choice[for="fauna-enabled"],.ecology-choice[for="territory-enabled"],.phenomena-picker,.fauna-picker').forEach(el=>el.hidden=setupVariant==='inverse');
    document.querySelector('#starter-options').innerHTML=startingInventoryMarkup(localSetup,toolIcon,startingSelections,id=>inverseToolAllowed({variant:setupVariant},id));
    return;
  }
  if(action==='inverse-drawing-choice'||action==='inverse-scale'){if(action==='inverse-scale')setupScale=b.dataset.scale;else setupDrawing=b.dataset.drawing;refreshInverseDrawing();return;}
  if(action==='inverse-edit'||action==='inverse-create'){
    const select=document.querySelector('#inverse-drawing');setupDrawing=select.value;
    let boards;try{boards=loadInverseBoards(localStorage);}catch(error){notify(error.message);return;}
    const board=action==='inverse-edit'?selectedInverseDrawing():null;
    // Editing a supplied preset creates a personal copy.
    openInverseEditor({storage:localStorage,board:board?{...board,id:boards.some(item=>item.id===board.id)?board.id:undefined,name:boards.some(item=>item.id===board.id)?board.name:board.name+' · mi versión'}:null,onSave:saved=>{setupDrawing=saved.id;setupScale='s';refreshInverseDrawing();document.querySelector('#inverse-drawing').focus();},onClose:()=>document.querySelector('#inverse-drawing').focus()});return;
  }
  if(action==='starter-card'||action==='starter-recommended'){
    const player=Number(b.dataset.starterPlayer),selected=startingSelections[player];
    if(action==='starter-recommended')startingSelections[player]=[...(setupVariant==='inverse'?inverseRecommended:RECOMMENDED_CARDS)];
    else if(!inverseToolAllowed({variant:setupVariant},b.dataset.tool))return;
    else if(selected.includes(b.dataset.tool))startingSelections[player]=selected.filter(id=>id!==b.dataset.tool);
    else if(selected.length<3)selected.push(b.dataset.tool);else{notify('Quita una carta antes de elegir otra: máximo tres distintas.');return;}
    const picker=b.closest('.starting-inventory-picker');picker.querySelectorAll('[data-action="starter-card"]').forEach(el=>el.setAttribute('aria-pressed',String(startingSelections[player].includes(el.dataset.tool))));picker.querySelector('output').textContent=startingSelections[player].length+'/3';return;
  }
  if(action==='cancel-local'){localSetup=null;document.querySelector('.local-dialog')?.remove();if(localReturnDialog){openHallDialog(localReturnDialog);localReturnDialog=null;}return;}
  if(action==='start-local'){
    const name=document.querySelector('#local-name').value.trim(),second=document.querySelector('#second-name')?.value.trim()||'Jugador 2';
    if(name.length<2||name.length>18){notify('El apodo debe tener entre 2 y 18 caracteres.');document.querySelector('#local-name').focus();return;}
    const level=document.querySelector('#local-level').value,timeMode=document.querySelector('#local-time-mode').value,difficulty=document.querySelector('[name="machine-difficulty"]:checked')?.value||'medium',playerSymbol=document.querySelector('[name="local-symbol"]:checked').value;save('hash3_name',name);save('hash3_symbol',playerSymbol);
    if(document.querySelector('#player-inventory').checked){try{validateStartingCards(startingSelections[0]);if(localSetup==='local')validateStartingCards(startingSelections[1]);}catch(e){notify(e.message);return;}}
    const machineInventory=document.querySelector('#machine-inventory')?.checked===true,ecology={initialCards:startingSelections[0].length===3?startingSelections[0]:undefined,secondInitialCards:startingSelections[1].length===3?startingSelections[1]:undefined,playerInventory:document.querySelector('#player-inventory').checked,cellTarget:document.querySelector('#local-goal-type').value==='cells'?Number(document.querySelector('#local-goal-target').value):undefined,matchGoal:['time','moves'].includes(document.querySelector('#local-goal-type').value)?{type:document.querySelector('#local-goal-type').value,target:Number(document.querySelector('#local-goal-target').value)}:undefined,faunaEnabled:document.querySelector('#fauna-enabled').checked,territoryEnabled:document.querySelector('#territory-enabled').checked};if(setupVariant==='inverse'){try{ecology.board=selectedInverseDrawing();}catch(error){notify(error.message);return;}if(!ecology.board){notify('Elige un dibujo guardado.');return;}ecology.variant='inverse';ecology.faunaEnabled=false;ecology.territoryEnabled=false;delete ecology.cellTarget;delete ecology.matchGoal;}if(setupVariant!=='inverse'){ecology.fauna=readFaunaPicker(document.querySelector('.local-dialog'));save('hash3_fauna',JSON.stringify(ecology.fauna));ecology.phenomena=readPhenomenaPicker(document.querySelector('.local-dialog'));save('hash3_phenomena',JSON.stringify(ecology.phenomena));save('hash3_player_inventory',String(ecology.playerInventory));save('hash3_goal_type',document.querySelector('#local-goal-type').value);save('hash3_goal_target',document.querySelector('#local-goal-target').value);save('hash3_fauna_enabled',String(ecology.faunaEnabled));save('hash3_territory_enabled',String(ecology.territoryEnabled));}save('hash3_local_time_mode',timeMode);
    if(localSetup==='solo'){save('hash3_difficulty',difficulty);save('hash3_machine_inventory',machineInventory?'true':'false');}
    localSetup=null;selectedExpansion=null;accept(createLocal(document.querySelector('.local-dialog [data-mode]').dataset.mode,name,second,Date.now(),level,timeMode,difficulty,playerSymbol,machineInventory,ecology));if(filledInverse(room)){const viewport=document.querySelector('.viewport'),fit=extensionView(terrainOf(room),{width:viewport.clientWidth,height:viewport.clientHeight},innerWidth<=760?48:56);if(fit){zoom=fit.zoom;render();requestAnimationFrame(()=>center(fit.x,fit.y));}}return;
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
  if(e.key==='Escape'&&inverseClaimSelection){e.preventDefault();inverseClaimSelection=null;render();return;}
  if(inventoryEditorOpen){
    if(e.key==='Escape'){e.preventDefault();inventoryEditorOpen=false;renderInventoryEditor();document.querySelector('[data-action="edit-inventory-layout"]')?.focus({preventScroll:true});return;}
    if(e.key==='Tab'){const nodes=[...document.querySelectorAll('.inventory-editor button:not(:disabled),.inventory-editor [tabindex="0"]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(superHelpPlan){
   if(e.key==='Escape'){e.preventDefault();inventoryCardChoice=null;superHelpPlan=null;render();return;}
   if(e.key==='Tab'){const buttons=[...document.querySelectorAll('.super-help-dialog button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
   return;
  }
  if(refillPlayer){
    if(e.key==='Escape'){e.preventDefault();refillPlayer=null;renderRefill();document.querySelector('[data-action="refill-hold"]')?.focus({preventScroll:true});return;}
    if(e.key==='Tab'){const nodes=[...document.querySelectorAll('.refill-selector button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(rankOpen&&e.key==='Escape'){e.preventDefault();setRankingOpen(false);return;}
  if(e.key==='Escape'&&targetMarking){e.preventDefault();targetMarking=false;render();return;}
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
    if(e.key==='Escape'){e.preventDefault();if(pendingDelete){if(!busy)cancelGameDeletion();}else{inventoryOpen=false;document.querySelector('.inventory-dialog')?.remove();}return;}
    if(e.key==='Tab'){const selector=pendingDelete?'.delete-dialog':'.inventory-dialog',nodes=[...document.querySelectorAll(selector+' button:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(e.key==='Escape'&&rankOpen){e.preventDefault();setRankingOpen(false);return;}
  if(!hallDialog)return;
  if(e.key==='Escape'&&hallDialog==='games'&&gameSelection){e.preventDefault();gameSelection=null;renderHallDialog();return;}
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
function openIncomingTransfer(input){
 if(!new URLSearchParams(new URL(input).hash.slice(1)).has('traslado'))return false;
 if(isLocal())persistLocal(room.status==='playing'?localCommand(room,'pause'):room);
 clearGameView();incomingTransfer=input;hallDialog='profile';hallHistory=[];renderHome();return true;
}
window.addEventListener('hashchange',()=>{
 try{openIncomingTransfer(location.href);}catch(error){notify(error.message||'No se pudo abrir la copia. Tu partida se conserva.');}
});
const machineRunner=createMachineRunner({getRoom:()=>room,isHidden:()=>document.hidden,isBusy:()=>busy,
 createWorker:()=>new Worker(new URL('./machine-worker.js',import.meta.url),{type:'module'}),
 apply:choice=>accept(localCommand(room,choice.action,choice.payload)),tradeHoldMs:REFILL_HOLD_MS,
 onError:()=>notify('La máquina no ha podido completar su turno. Pausa y retoma para reintentar; la partida sigue guardada.')});
async function init(){
 if(openIncomingTransfer(location.href))return;
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
      name:'read_hash3_game',title:'Consultar partida #33',
      description:'Consulta la sala visible, el ranking, el turno y el territorio activo del jugador actual. No modifica la partida.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute(input){
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('La consulta no acepta parámetros.');
        if(!room)return {status:'home'};
        return {code:room.code,status:room.status,level:room.level||'normal',ranking:rankedPlayers(room.players).map(p=>({name:p.name,symbol:p.symbol,score:p.score,figures:p.figures})),you:ownPlayer()?.name,pair:ownPair(),cells:perceivedRoom(room).cells.map(({x,y,symbol})=>({x,y,symbol}))};
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
 app.innerHTML=`<section class="pair-wait"><header><span class="brand heading">${brandMark}</span><span class="tag">MUNDO · EN PAREJA</span></header><h1 class="heading">${l.ready?'Pareja preparada':'Esperando duelista'}</h1><p class="instructions">Reuníos aquí antes de entrar en el Mundo común. El turno empieza cuando entréis juntos.</p><div class="pair-code mono">${escape(l.code)}</div><div class="pair-share-actions"><button data-action="pair-copy-code">Copiar código</button><button data-action="pair-share">Copiar enlace</button></div><div class="pair-person"><strong>${escape(l.hostName)}</strong><small>${host?'Tú · preparas la pareja':'Creador de la pareja'}</small></div><div class="pair-person"><strong>${escape(l.guestName||'Esperando duelista…')}</strong><small>${l.guestName?l.ready?'En la antesala':'Esperando conexión':''}</small></div><p class="pair-status" role="status">${l.ready?(host?'Ya estáis los dos. Podéis entrar juntos.':'Tu compañero puede pulsar Entrar al Mundo.'):'Comparte el código o la invitación con tu duelista.'}</p><button class="primary" data-action="pair-start" ${host&&l.ready?'':'disabled'}>Entrar al Mundo</button><button class="ghost pair-back" data-action="pair-leave">${host?'Cancelar pareja':'Salir de la antesala'}</button></section>`;
}
function renderReturn() {
  const own=ownPlayer();
  app.innerHTML=`<section class="lobby"><header class="row spread lobby-header"><span class="brand heading">${brandMark}</span><span class="tag">${VERSION_LABEL}</span></header><h1 class="heading">${room.status==='lobby'?'La sala te espera':'El mundo sigue'}</h1><p class="instructions">Has abandonado ${escape(room.code)}. Conservas tus ${own.score} puntos y ${own.figures} figuras. Tu antiguo rival puede seguir contra una máquina o contra alguien que haya entrado.</p><button class="primary return-button" data-action="return-room">Volver a la partida</button><p class="instructions">Recuperas tu hueco si sigue libre. Si está ocupado, se te busca otro rival; mientras tanto jugarás contra la máquina.</p><button class="ghost" data-action="go-games">Mis partidas</button>${room.host===uid&&!room.commonWorld?'<button class="ghost danger" data-action="finish">Cerrar sala para todos</button>':''}</section>`;
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
function inverseDrawingChoices(){
 let own=[];try{own=loadInverseBoards(localStorage);}catch(error){notify(error.message);}
 return {own,boards:[...INVERSE_PRESETS,...INVERSE_DRAWINGS.filter(d=>!INVERSE_PRESETS.some(p=>p.id===d.id)),...own]};
}
function selectedInverseDrawing(){const {boards}=inverseDrawingChoices();const board=boards.find(b=>b.id===setupDrawing)||boards[0];return scaledInverseBoard(board,setupScale);}
function refreshInverseDrawing(){
 const select=document.querySelector('#inverse-drawing');if(!select)return;
 const {boards,own}=inverseDrawingChoices();if(!boards.some(b=>b.id===setupDrawing))setupDrawing=boards[0].id;
 select.innerHTML=boards.map(b=>`<option value="${escape(b.id)}" ${b.id===setupDrawing?'selected':''}>${escape(b.name)}${b.terrain?' · '+b.terrain.length+' celdas':''}${own.includes(b)?' · mío':''}</option>`).join('');
 document.querySelector('#inverse-drawing-gallery').innerHTML=boards.map(b=>{const thumb=scaledInverseBoard(b,'s');return `<button type="button" data-action="inverse-drawing-choice" data-drawing="${escape(b.id)}" aria-pressed="${b.id===setupDrawing}">${inverseBoardPreview(thumb)}<span>${escape(b.name)}</span></button>`;}).join('');
 const base=boards.find(b=>b.id===setupDrawing);let chosen;
 document.querySelector('#inverse-size-choices').innerHTML=INVERSE_SCALES.map(scale=>{let board;try{board=scaledInverseBoard(base,scale.id);}catch{}if(board&&scale.id===setupScale)chosen=board;return `<button type="button" data-action="inverse-scale" data-scale="${scale.id}" aria-pressed="${scale.id===setupScale}" ${board?'':'disabled'}><strong>${scale.label}</strong><small>${board?board.terrain.length.toLocaleString('es-ES')+' celdas':'No cabe'}</small></button>`;}).join('');
 if(!chosen){setupScale='s';refreshInverseDrawing();return;}
 document.querySelector('#inverse-drawing-preview').innerHTML=inverseBoardPreview(chosen)+`<p class="inverse-drawing-count">${chosen.terrain.length.toLocaleString('es-ES')} celdas por vaciar</p>`;
}
function readFaunaSetting(){try{return JSON.parse(read('hash3_fauna')||'null');}catch{return null;}}
function readPhenomenaSetting(){try{return JSON.parse(read('hash3_phenomena')||'null');}catch{return null;}}
function renderLocalSetup() {
  document.querySelector('.local-dialog')?.remove();
  app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop local-dialog"><section class="dialog game-mode-dialog ${hallModeClass(hallMode==='offline'?'offline':'solo')}" role="dialog" aria-modal="true" aria-labelledby="local-title" data-mode="${localSetup}" data-variant="${setupVariant}"><h2 class="heading" id="local-title">${localSetup==='solo'?'Contra la máquina':'Dos en este dispositivo'}</h2><nav class="local-variant-picker" aria-label="Modalidad de partida"><button type="button" data-action="setup-variant" data-variant="original" aria-pressed="${setupVariant==='original'}">Original</button><button type="button" data-action="setup-variant" data-variant="inverse" aria-pressed="${setupVariant==='inverse'}">Inverso</button></nav>${hallNameField(read('hash3_name'),{id:'local-name',label:localSetup==='solo'?'Tu apodo':'Tu nombre',placeholder:localSetup==='solo'?'Tú':'Jugador 1'})}${localSetup==='solo'?machineDifficultySelector(read('hash3_difficulty')):''}${localSetup==='local'?'<label for="second-name">Otro jugador</label><input id="second-name" placeholder="Jugador 2" maxlength="18">':''}${levelSelector('local-level')}${ecologyChoicesMarkup({machine:localSetup==='solo',playerInventory:read('hash3_player_inventory')!=='false',machineInventory:read('hash3_machine_inventory')==='true',faunaEnabled:read('hash3_fauna_enabled')!=='false',territoryEnabled:read('hash3_territory_enabled')!=='false'},navIcon('inventory'))}${faunaPickerMarkup(readFaunaSetting())}${phenomenaPickerMarkup(readPhenomenaSetting())}<section id="inverse-options" hidden><label for="inverse-drawing">Dibujo del tablero</label><select id="inverse-drawing" hidden></select><div id="inverse-drawing-gallery" class="inverse-drawing-gallery" role="group" aria-label="Dibujos del tablero"></div><span class="setup-size-label">Tamaño</span><div id="inverse-size-choices" class="inverse-size-choices" role="group" aria-label="Tamaño del dibujo"></div><div id="inverse-drawing-preview"></div><div class="inverse-drawing-actions"><button type="button" data-action="inverse-create">Crear dibujo</button><button type="button" data-action="inverse-edit">Editar una copia</button></div><p class="inverse-rules-summary">Tablero fijo. Sin fauna ni fenómenos de Original. Elige colocar o pulsa Cobrar y toca un conjunto para cobrarlo directamente, sin confirmación adicional; cobrar termina tu turno. Un # compartido sobre relleno pendiente cada nueve colocaciones, máximo tres. Toca el contador por vaciar para localizar restos. Contorno: ciclo de 33 a 99 turnos compartidos con aviso de tres; vacía relleno sin puntos, conserva fichas y los últimos tres restos. Abejas tras un plazo aleatorio de 3 a 33 turnos propios sin cobrar con puntos; ambas cuentas visibles y últimos tres resaltados. Redistribuyen tus fichas dentro del dibujo. Termina al vaciar el dibujo: gana quien más puntos consiga. Empiezas sin X/O. Solo puntúan figuras que quitan relleno; las zonas vaciadas siguen siendo utilizables.</p></section><details class="setup-starters"><summary>Cartas iniciales · elegir tres</summary><div id="starter-options">${startingInventoryMarkup(localSetup,toolIcon,startingSelections)}</div></details><div id="original-goals">${matchGoalsMarkup(read('hash3_goal_type')||'cells',Number(read('hash3_goal_target'))||33333)}</div>${timeModeSelector('local-time-mode',read('hash3_local_time_mode')==='untimed'?'untimed':'timed')}${symbolSelector(read('hash3_symbol'),'local-symbol')}<p>X siempre empieza. ${localSetup==='solo'?'La máquina juega con el símbolo contrario al tuyo.':'El otro jugador usa el símbolo contrario. Pasad el dispositivo después de cada turno.'} <span id="local-time-hint"></span> Puedes pausar y volver al hall sin perder la partida.</p><div class="row">${hallReturnButton('cancel-local',{previous:!!localReturnDialog})}<button class="primary" data-action="start-local">Jugar</button></div></section></div>`);
  bindPhenomenaPicker(document.querySelector('.local-dialog'));bindFaunaPicker(document.querySelector('.local-dialog'));
  refreshInverseDrawing();
  document.querySelector('#inverse-drawing').addEventListener('change',e=>{setupDrawing=e.target.value;refreshInverseDrawing();});
  document.querySelectorAll('[name="machine-difficulty"]').forEach(input=>input.addEventListener('change',()=>{document.querySelector('#machine-level-hint').textContent=machineLevelHints[input.value];}));
  document.querySelector('#local-goal-type').addEventListener('change',e=>{const temporary=document.createElement('div');temporary.innerHTML=matchGoalsMarkup(e.target.value);document.querySelector('#local-goal-target-row').replaceWith(temporary.querySelector('#local-goal-target-row'));});
  const localClock=document.querySelector('#local-time-mode'),refreshClock=()=>{document.querySelector('#local-time-hint').textContent=localClock.value==='untimed'?'Sin límite por turno ni jugadas automáticas. Cada jugador espera a que juegue su rival.':'33 segundos por turno. Al agotarse se coloca una ficha automática; la pausa conserva el tiempo restante.';};
  localClock.addEventListener('change',refreshClock);refreshClock();
  enhanceSetupChoices(document.querySelector('.local-dialog'));
  (document.querySelector('#local-name:not([type="hidden"])')||document.querySelector('#second-name')||document.querySelector('[name="machine-difficulty"]:checked')||document.querySelector('#local-level')).focus();
}
function updateTimer() {
  if(!room||room.status!=='playing')return;
  for(const node of document.querySelectorAll('.territory-countdown:not([data-turn-countdown])')){const event=room.territoryEvents?.find(e=>e.id===node.dataset.territoryId);if(event){const seconds=Math.max(0,Math.ceil((event.remainingMs??event.nextAt-Date.now())/1000));node.textContent=seconds;node.setAttribute('aria-label',`${seconds} segundos`);}}
  const clockNow=Date.now(),clocks=new Map();
  for(const node of document.querySelectorAll('.ecology-clock')){
    if(room.turnEcologyVersion===1)continue;
    const kind=node.dataset.ecologyKind;if(!clocks.has(kind))clocks.set(kind,ecologyClockEvents(room,kind));
    const events=clocks.get(kind).filter(e=>!node.dataset.ecologySource||e.id===node.dataset.ecologySource);
    if(events.length){const seconds=Math.min(...events.map(e=>ecologySeconds(e,clockNow)));node.textContent=seconds;node.setAttribute('aria-label',`${seconds} segundos`);}
  }
  for(const node of document.querySelectorAll('[data-immunity-clock]')){const seconds=immunityCountdown(room,node.dataset.immunityClock,clockNow);node.textContent=seconds;node.setAttribute('aria-label',`${seconds} ${immunityUnit(room,node.dataset.immunityClock)} de inmunidad`);}
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
function stopMachine(){machineRunner.stop();}
function scheduleMachine(){machineRunner.schedule();}
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
  canReload:()=>(!room||room.status!=='playing')&&!pairLobby&&!worldMapOpen&&!pauseMapOpen&&!rankOpen&&!mapInteracting&&!busy&&!pendingDelete&&!inventoryOpen&&!refillPlayer&&!hallDialog&&!localSetup&&!roomSetup&&!finishOpen&&!leaveOpen&&(!figureEffect||figureEffect.floatUntil<=performance.now())&&(!landingEffect||landingEffect.floatUntil<=performance.now())&&!document.activeElement?.matches('input,textarea'),
  beforeReload:()=>{
    if(isLocal()){save('hash3_local',JSON.stringify({id:room.id}));try{sessionStorage.setItem('hash3_restore_local','1');}catch{/* The saved game remains available from the start screen. */}}
  },
  onReady:updateOfflineStatus
});

function clearExpiredFigureGlows(){
 const now=performance.now();
 document.querySelectorAll('.figure-glow').forEach(c=>{
  const position=key(Number(c.dataset.x),Number(c.dataset.y));
  if(!(figureEffect?.until>now&&figureEffect.cells.has(position))&&!(landingEffect?.until>now&&landingEffect.cells.has(position)))c.classList.remove('figure-glow');
 });
}
function startFigureEffect(feedback) {
  clearTimeout(figureTimer);clearTimeout(scoreFloatTimer);
  const now=performance.now();
  figureEffect={...feedback,cells:new Set(feedback.cells.map(c=>key(c.x,c.y))),until:now+500,floatUntil:now+1400};
  figureTimer=setTimeout(clearExpiredFigureGlows,500);
  scoreFloatTimer=setTimeout(()=>{
    document.querySelectorAll('.score-float:not(.landing-score-float)').forEach(c=>c.remove());figureEffect=null;
  },1400);
}
function startLandingEffect(feedback){
 clearTimeout(landingGlowTimer);clearTimeout(landingFloatTimer);
 const now=performance.now(),cells=new Map();
 for(const score of feedback.scores)for(const f of score.paidFigures||[])for(const [x,y] of f.points)cells.set(key(x,y),score.symbol);
 landingEffect={...feedback,cells,until:now+500,floatUntil:now+1400};
 landingGlowTimer=setTimeout(clearExpiredFigureGlows,500);
 landingFloatTimer=setTimeout(()=>{document.querySelectorAll('.landing-score-float').forEach(c=>c.remove());landingEffect=null;},1400);
}
function showLandingScore(feedback,manual=null){
 const n=document.querySelector('#notice');n.classList.remove('inventory-notice');n.innerHTML=landingScoreMarkup(feedback.scores,manual);
 n.classList.add('visible','score-notice','landing-score-notice');clearTimeout(noticeTimer);
 noticeTimer=setTimeout(()=>n.classList.remove('visible'),4500);
}
function showScore(feedback,comboNotice=null) {
  const n=document.querySelector('#notice'),roomId=room.id;
  n.classList.remove('landing-score-notice','inventory-notice');
  n.innerHTML=scoreNoticeMarkup(feedback,comboNotice);
  n.querySelector('.score-details').addEventListener('toggle',event=>{
    clearTimeout(noticeTimer);
    if(!event.currentTarget.open)noticeTimer=setTimeout(()=>n.classList.remove('visible'),4500);
  });
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
 document.querySelectorAll('[data-action="events"],[data-action="map-events"]').forEach(b=>b.setAttribute('aria-expanded',String(eventsOpen)));
 document.querySelector('.events-sheet')?.remove();if(!eventsOpen||!['playing','paused'].includes(room?.status))return;
 (document.querySelector('.game-dock')||app).insertAdjacentHTML('beforeend',`<section class="events-sheet" id="events-panel" role="region" aria-labelledby="events-title"><div class="inventory-sheet-heading"><h2 class="heading" id="events-title">Próximos eventos</h2><button data-action="close-events" aria-label="Cerrar próximos eventos">×</button></div><div class="event-outlook-body">${eventOutlookMarkup(room,uid)}</div></section>`);
}
function renderInventory(){
 document.querySelector('.inventory-sheet')?.remove();if(!inventoryOpen||!['playing','paused'].includes(room?.status))return;
 const dock=document.querySelector('.game-dock');
 (dock||app).insertAdjacentHTML(dock?'beforebegin':'beforeend',`<section class="inventory-sheet" id="inventory-panel" role="region" aria-labelledby="inventory-title"><div class="inventory-sheet-heading"><h2 class="heading" id="inventory-title">${inventorySection==='territory'?'Territorio':'Inventario del jugador'}</h2><button data-action="close-inventory" aria-label="Cerrar inventario">×</button></div><div class="inventory-sheet-body">${inventoryMarkup(room,uid,{openTools:inventoryDescriptionsOpen,section:inventorySection})}</div></section>`);
 document.querySelector('[data-action="close-inventory"]')?.focus({preventScroll:true});
}
function renderDeleteGame(){
 document.querySelector('.delete-dialog')?.remove();if(!pendingDelete)return;
 const targets=pendingDelete.targets,g=targets[0],multiple=targets.length>1,allLocal=targets.every(t=>t.local),active=!g.local&&g.status!=='finished'&&g.active!==false;
 app.insertAdjacentHTML('beforeend',`<div class="dialog-backdrop delete-dialog"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 class="heading" id="delete-title">${multiple?`¿Eliminar ${targets.length} partidas?`:g.local?'¿Borrar esta partida?':'¿Quitar esta sala de Mis partidas?'}</h2><p>${multiple&&allLocal?'Se borrarán los guardados seleccionados de este navegador. Los resultados completados se conservan en Logros. Esta acción no se puede deshacer.':multiple?'Se borrarán los guardados locales seleccionados. Sus resultados completados se conservan en Logros. Las salas compartidas solo se quitan de tu lista y sales de las que sigan activas; los demás podrán seguir jugando. Esta acción no se puede deshacer.':g.local?'Se borrará el guardado de este navegador, con su tablero y puntuación. Esta acción no se puede deshacer.':active?'También saldrás de la sala. Los demás podrán seguir jugando. Tus puntos de Mundo se conservan.':'La sala deja de aparecer en tu lista. El tablero y el resultado compartidos se conservan.'}</p>${!g.local?'<p class="muted">Si vuelves a abrirla con su código, aparecerá de nuevo en Mis partidas.</p>':''}<div class="row"><button data-action="cancel-delete">Cancelar</button><button class="danger" data-action="confirm-delete">${multiple?`Eliminar ${targets.length}`:g.local?'Borrar partida':active?'Salir y quitar':'Quitar de mi lista'}</button></div></section></div>`);
 document.querySelector('[data-action="cancel-delete"]')?.focus();
}
