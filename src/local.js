import {toggleWatchTarget} from './watch-targets.js';
import {microLength,microExpansionOptions} from './micro-expansion.js';
import {movePendingBomb} from './pending-bombs.js';
import {removeDefeatedInvasions} from './invasion-paths.js';
import {localLiving} from './living-balance.js';
import {boardCellLimit,finishAtMatchGoal,CELL_TARGETS} from './board-limits.js';
import {MATCH_TIME_TARGETS} from './match-durations.js';
import {initializeFreeExpansions,earnFreeExpansion,canRequestFreeExpansion} from './free-expansion.js';
import {territoryEnabled} from './ecology.js';
import {recordTerritoryGrowth,territoryPlacementDue,territoryReady} from './territory-tools.js';
import {advanceHabitats,freezeHabitats,resumeHabitats} from './inhabitants.js';
import {key,terrainOf,connectedTerrain,availableCells,expansionOptions,figureWindows,isBlockedCell} from './game.js';
import {recordMax} from './max.js';
import {recordCombo} from './records.js';
import {initializeRodents,stepRodent} from './rodents.js';
import {canUsePracticeTool,practiceTurn,toolCells,moveDestination,initializeInventory,spendCard,completeInventoryTurn,placementSymbol} from './practice-tools.js';
import {chooseMachineMove,machineLevels,machineLevelLabel} from './machine.js';
import {activateImmunity,recordImmunityCombo,expireImmunities,freezeImmunities,resumeImmunities} from './immunity.js';
import {applyAreaTool} from './area-tools.js';
import {awardFigures,scoreLandings} from './landing-score.js';
export const TURN_SECONDS=33;
const id=()=>crypto.randomUUID();
export const localHumanId=room=>room.humanId||room.pairs[0].x;
export const localMachineId=room=>{const p=room.pairs[0];return localHumanId(room)===p.x?p.o:p.x;};
export function createLocal(mode,name='Tú',secondName='Jugador 2',now=Date.now(),level='normal',timeMode='timed',difficulty='medium',playerSymbol='X',machineInventory=false,ecology={}) {
  if(!['normal','advanced'].includes(level))throw new Error('Elige nivel Normal o Avanzado.');
  if(!['timed','untimed'].includes(timeMode))throw new Error('Elige Con reloj o Sin reloj.');
  if(!machineLevels.some(l=>l.id===difficulty))throw new Error('Elige nivel Básico, Medio, Alto o Pro.');
  if(!['X','O'].includes(playerSymbol))throw new Error('Elige X u O.');
  const x='local-x',o='local-o';
  const humanId=playerSymbol==='X'?x:o,rivalName=mode==='solo'?`Máquina · ${machineLevelLabel(difficulty)}`:secondName;
  const room={id:id(),code:'LOCAL',host:humanId,status:'playing',clockNow:now,version:1,ruleVersion:13,mode,level,timeMode,playerSymbol,...(mode==='solo'?{difficulty,humanId,machineInventory:machineInventory===true}:{}),createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),turnSeconds:timeMode==='untimed'?null:TURN_SECONDS,faunaEnabled:ecology.faunaEnabled!==false,territoryEnabled:ecology.territoryEnabled!==false,
    players:[{id:x,name:playerSymbol==='X'?name:rivalName,symbol:'X',pair:0,order:1,score:0,figures:0},{id:o,name:playerSymbol==='O'?name:rivalName,symbol:'O',pair:0,order:2,score:0,figures:0}],
    pairs:[{id:0,x,o,turn:'X',active:{x:0,y:0},credits:0,pending:0,expander:null,deadline:timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString()}],
    blocks:[{x:0,y:0}],terrain:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)})),cells:[],forms:[],lines:[]};
  if(CELL_TARGETS.includes(ecology.cellTarget))room.cellTarget=ecology.cellTarget;
  if(ecology.matchGoal?.type==='moves'&&CELL_TARGETS.includes(ecology.matchGoal.target))room.matchGoal={type:'moves',target:ecology.matchGoal.target};
  if(ecology.matchGoal?.type==='time'&&MATCH_TIME_TARGETS.includes(ecology.matchGoal.target)){room.matchGoal={type:'time',target:ecology.matchGoal.target};room.endsAt=new Date(now+ecology.matchGoal.target*1000).toISOString();}
  initializeInventory(room);initializeRodents(room,now);initializeFreeExpansions(room);return room;
}
function normalize(room,now) {
  if(finishAtMatchGoal(room,now))return;
  for(const p of room.pairs) {
    const free=availableCells(room,p,{ignoreBlocks:true});
    if(!free.length&&Number.isFinite(boardCellLimit(room))&&!expansionOptions(terrainOf(room),p.terrainAnchor||p.active,room).length){room.status='finished';room.finishReason='board-limit';room.finishedAt=new Date(now).toISOString();p.pending=0;p.expander=null;delete p.optionalExpansion;return;}
    if(free.length&&p.optionalExpansion&&p.strategicExpansion&&(room.players.find(v=>v.id===p.expander)?.inventory?.cards['hint-expand']||0)>0)continue;
    if(free.length){delete p.strategicExpansion;delete p.optionalExpansion;delete p.strategicExpansion;delete room.practiceHint;p.pending=0;p.expander=null;delete p.frontierUsed;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
    else{p.pending=1;p.credits=Math.max(1,p.credits||0);p.expander||=p.turn==='X'?p.x:p.o;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
  }
}
// Recover older saves that entered expansion while another built island had holes.
export function reconcileLocalBoard(original,now=Date.now()) {
  if(!['solo','local'].includes(original.mode)||original.status!=='playing')return original;
  const room={...original,pairs:original.pairs.map(p=>({...p}))};
  normalize(room,now);
  if(room.status===original.status&&JSON.stringify(room.pairs)===JSON.stringify(original.pairs))return original;
  return {...room,version:room.version+1,updatedAt:new Date(now).toISOString()};
}
export function localCommand(original,action,payload={},now=Date.now(),random=Math.random) {
  const wasPlaying=original.status==='playing';original=reconcileLocalBoard(original,now);
  if(wasPlaying&&original.status==='finished')return original;
  const room=structuredClone(original),p=room.pairs[0];
  room.clockNow=now;if(room.status!=='finished')room.ruleVersion=13;initializeInventory(room);const immunityChanged=expireImmunities(room,now);initializeRodents(room,now);initializeFreeExpansions(room);room.turnSeconds=room.timeMode==='untimed'?null:TURN_SECONDS;
  if(action==='finish'){delete room.practiceHint;delete room.practiceTurn;room.status='finished';room.finishedAt=new Date(now).toISOString();room.updatedAt=room.finishedAt;room.version++;return room;}
  if(action==='pause'){
    if(room.status==='paused')return original;
    if(room.status!=='playing')throw new Error('La partida no está en curso.');
    advanceHabitats(room,now,random);freezeHabitats(room,now);freezeImmunities(room,now);
    if(room.matchGoal?.type==='time')room.matchRemainingMs=Math.max(0,Date.parse(room.endsAt)-now);
    room.pauseRemainingMs=room.timeMode==='untimed'?null:Math.max(0,Date.parse(p.deadline)-now);
    room.status='paused';room.pausedAt=new Date(now).toISOString();p.deadline=null;room.updatedAt=room.pausedAt;room.version++;return room;
  }
  if(action==='resume'){
    if(room.status==='playing')return original;
    if(room.status!=='paused')throw new Error('La partida no está pausada.');
    resumeHabitats(room,now);resumeImmunities(room,now);if(room.matchGoal?.type==='time'){room.endsAt=new Date(now+(room.matchRemainingMs??room.matchGoal.target*1000)).toISOString();delete room.matchRemainingMs;}room.status='playing';normalize(room,now);p.deadline=room.timeMode==='untimed'?null:new Date(now+(room.pauseRemainingMs??TURN_SECONDS*1000)).toISOString();
    delete room.pauseRemainingMs;delete room.pausedAt;room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  if(action==='watch-target'){if(!['playing','paused'].includes(room.status))throw new Error('La partida no está disponible.');toggleWatchTarget(room,payload);room.updatedAt=new Date(now).toISOString();room.version++;return room;}
  if(action==='tick'&&room.status!=='playing')return original;
  if(room.status!=='playing')throw new Error('La partida no está activa.');
  const grows=action==='expand'||action==='inventory'&&payload.tool==='activate'||action==='tick'&&p.pending&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now;
  const places=action==='move'||action==='tick'&&!p.pending&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now;
  // On the opening threshold, predict only this placement's figures before
  // advancing timed fauna. The accepted scoring still happens below.
  let territoryPreview=room;
  if(action==='move'&&!territoryReady(room)&&territoryEnabled(room)){
    const symbol=placementSymbol(room,p[p.turn.toLowerCase()]),candidate={...payload,symbol};
    const earned=figureWindows([...room.cells,candidate],candidate.x,candidate.y,symbol,room.level,null,localLiving(room)).filter(f=>!room.forms.includes(f.id)).length;
    if(earned)territoryPreview={...room,players:room.players.map(player=>player.symbol===symbol?{...player,figures:player.figures+earned}:player)};
  }
  const mayAnnounce=places&&territoryPlacementDue(territoryPreview,now,1,{naturalOnly:true})||grows&&territoryPlacementDue(room,now,0,{naturalOnly:true});
  const advanced=advanceHabitats(room,now,random,{suppressFauna:mayAnnounce}),habitatChanged=immunityChanged||advanced||original.turnEcologyVersion!==room.turnEcologyVersion||original.inhabitantReclaimVersion!==room.inhabitantReclaimVersion||original.habitatVersion!==room.habitatVersion||original.wormLifecycleVersion!==room.wormLifecycleVersion||original.invasionVersion!==room.invasionVersion||original.worms?.some(w=>!w.turnDriven)&&['local','solo'].includes(room.mode);
  const habitatTick=()=>{if(!habitatChanged)return original;normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;};
  if(action==='request-free-expansion'){
    throw new Error('La ampliación voluntaria se solicita con Ampliación inteligente desde 333 figuras.');
  }
  if(action==='request-strategic-expansion'){
    const actor=p.turn==='X'?p.x:p.o;
    if(!canRequestFreeExpansion(room,actor)||room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Necesitas Ampliación inteligente, 333 figuras en la partida y estar en tu turno.');
    p.pending=1;p.optionalExpansion=true;p.strategicExpansion=true;p.expander=actor;delete room.practiceHint;
    room.lastEvent={id:id(),kind:'free-expansion-request',player:actor};room.version++;room.updatedAt=new Date(now).toISOString();return room;
  }
  if(action==='cancel-free-expansion'){
    if(!p.optionalExpansion)throw new Error('No hay ampliación libre seleccionada.');
    delete p.optionalExpansion;delete p.strategicExpansion;delete room.practiceHint;p.pending=0;p.expander=null;room.version++;room.updatedAt=new Date(now).toISOString();return room;
  }
  if(action==='inventory'){
    const {tool,playerId}=payload;
    if(['hint','hint-expand','super-hint'].includes(tool))throw new Error('Activa Ayuda desde el inventario.');
    if(!canUsePracticeTool(room,playerId,tool,now))throw new Error('Herramienta no disponible: una por turno, o dos activando Combo primero; úsala antes de agotar el reloj.');
    const actor=room.players.find(v=>v.id===playerId);
    if(['expand-2','expand-3'].includes(tool)){
      const choice=microExpansionOptions(room,microLength(tool),payload.orientation||'horizontal').find(c=>c.x===payload.x&&c.y===payload.y);
      if(!choice)throw new Error('La ampliación debe añadir todas sus celdas, tocar el territorio y respetar los bloqueos.');
      room.terrain.push(...choice.cells.map(c=>({...c,owner:playerId})));recordTerritoryGrowth(room,choice.cells.length,now,random);spendCard(room,playerId,tool);
      room.lastEvent={id:id(),kind:'inventory',player:playerId,tool,cells:choice.cells};
    }else if(tool==='swap'){
      const eligible=toolCells(room,playerId,tool),first=eligible.find(c=>c.x===payload.x&&c.y===payload.y),second=eligible.find(c=>c.x===payload.toX&&c.y===payload.toY);
      if(!first||!second||first.id===second.id)throw new Error('Elige dos fichas distintas, sin protecciones ni habitantes.');
      if(isBlockedCell(room,first.owner,second.x,second.y)||isBlockedCell(room,second.owner,first.x,first.y))throw new Error('Las fichas no pueden aterrizar en una celda bloqueada.');
      const before=structuredClone(room.cells),a={x:first.x,y:first.y},b={x:second.x,y:second.y};
      Object.assign(first,b);Object.assign(second,a);
      for(const player of room.players){const moved=[first,second].find(c=>c.id===player.lastMove?.id);if(moved)player.lastMove={...moved};}
      const landing=scoreLandings(room,before,[a,b],{kind:'swap',actor:playerId}),own=landing.find(s=>s.player===playerId);
      recordMax(actor,own?own.points-own.bonus:0,own?.figures||0);spendCard(room,playerId,tool);
      room.lastEvent={id:id(),kind:'inventory',player:playerId,tool,landing,cells:[a,b]};
    }else if(tool==='shift'&&payload.bombId){
      movePendingBomb(room,payload.bombId,{x:payload.toX,y:payload.toY},now);spendCard(room,playerId,tool);
      room.lastEvent={id:id(),kind:'inventory',player:playerId,tool,bombId:payload.bombId};
    }else if(['tornado','bomb','frontier','border'].includes(tool)){
      const result=applyAreaTool(room,playerId,tool,payload,random);
      if(tool==='tornado'){const own=result.landing.find(s=>s.player===playerId);recordMax(actor,own?own.points-own.bonus:0,own?.figures||0);}
      spendCard(room,playerId,tool);room.lastEvent={id:id(),kind:'inventory',player:playerId,tool,...result};
    }else if(['double','rival','combo','immunity'].includes(tool)){
      spendCard(room,playerId,tool);
      if(tool==='double')room.practiceTurn.remaining=2;else if(tool==='rival')room.inventoryEffects.forced.push({player:p[p.turn==='X'?'o':'x'],symbol:actor.symbol,by:playerId});
      else if(tool==='immunity')activateImmunity(room,playerId,now);
      room.lastEvent={id:id(),kind:'inventory',player:playerId,tool};
    }else{
      const {x,y}=payload;
      if(!toolCells(room,playerId,tool).some(c=>c.x===x&&c.y===y))throw new Error(tool==='destroy'?'Elige una celda vacía, sin ficha, del tablero construido.':tool==='activate'?'Elige un hueco sin ampliar que toque el tablero construido.':'Elige una ficha rival del tablero, sin escudo; tus colocaciones no se pueden borrar.');
      const index=room.cells.findIndex(c=>c.x===x&&c.y===y);
      const old=index>=0?room.cells[index]:null;
      let changed=null;
      if(tool==='activate'){room.terrain=[...terrainOf(room),{x,y,owner:playerId}];recordTerritoryGrowth(room,1,now,random);}
      if(tool==='destroy'){
        const anchor=p.terrainAnchor||p.active;
        const remaining=connectedTerrain(terrainOf(room),anchor).filter(c=>c.x!==x||c.y!==y);
        room.terrain=terrainOf(room).filter(c=>c.x!==x||c.y!==y);
        if(anchor.x===x&&anchor.y===y&&remaining.length){
          const closest=remaining.reduce((a,b)=>Math.abs(b.x-x)+Math.abs(b.y-y)<Math.abs(a.x-x)+Math.abs(a.y-y)?b:a);
          p.terrainAnchor={x:closest.x,y:closest.y};
        }
        room.inventoryEffects.blocks=room.inventoryEffects.blocks.filter(e=>e.x!==x||e.y!==y);
      }
      if(tool==='erase'){room.cells.splice(index,1);removeDefeatedInvasions(room);}
      if(tool==='opposite'){changed={...old,id:id(),symbol:actor.symbol,owner:playerId};room.cells[index]=changed;}
      if(tool==='shift'){
        const destination={x:payload.toX,y:payload.toY};
        if(!moveDestination(room,playerId,destination)||isBlockedCell(room,old.owner,destination.x,destination.y))throw new Error('Elige un destino vacío, conectado y sin bloqueo para la ficha rival.');
        changed={...old,...destination,id:id()};room.cells[index]=changed;
      }
      if(tool==='block')room.inventoryEffects.blocks.push({x,y,by:playerId,remaining:2,fresh:true});
      if(tool==='shield')room.inventoryEffects.shields.push({cell:old.id,by:playerId,remaining:2});
      if(['erase','opposite','shift'].includes(tool))for(const player of room.players)if(player.lastMove?.id===old.id)delete player.lastMove;
      if(changed&&['X','O'].includes(changed.symbol)){
        const scorer=room.players.find(v=>v.symbol===changed.symbol),result=scoreCell(room,changed,scorer);
        room.players.find(v=>v.id===changed.owner).lastMove=changed;
        recordMax(actor,scorer.id===actor.id?result.points-result.bonus:0,scorer.id===actor.id?result.figures:0);
        recordCombo(scorer,{...result,moveId:changed.id});
        room.lastEvent={id:changed.id,kind:'move',tool,player:scorer.id,actor:playerId,...result};
      }else{
        recordMax(actor,0,0);room.lastEvent={id:id(),kind:'inventory',tool,player:playerId,x,y};
      }
      spendCard(room,playerId,tool);
    }
    if(tool!=='immunity')delete room.practiceHint;if(tool==='destroy'||microLength(tool))normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  let automatic=false;
  if(action==='tick') {
    if(room.timeMode==='untimed'||Date.parse(p.deadline)>now)return habitatTick();
    const choices=p.pending?expansionOptions(terrainOf(room),p.terrainAnchor||p.active,room):availableCells(room,p);
    if(!choices.length){if(!p.pending&&availableCells(room,p,{ignoreBlocks:true}).length){action='pass';automatic=true;}else return habitatTick();}
    else{payload=choices[Math.floor(random()*choices.length)];action=p.pending?'expand':'move';automatic=true;}
  }
  if(action==='pass'){
    if(p.pending||availableCells(room,p).length||!availableCells(room,p,{ignoreBlocks:true}).length)throw new Error('Solo se puede pasar cuando todas las celdas vacías están bloqueadas.');
    const actor=p[p.turn.toLowerCase()];stepRodent(room,actor,{placed:false,now,random});completeInventoryTurn(room,actor,{automatic,placed:false,random});delete room.practiceTurn;
    p.turn=p.turn==='X'?'O':'X';p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();
    room.lastEvent={id:id(),kind:'pass',player:actor,automatic};
    normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  if(action==='move') {
    if(p.pending)throw new Error('Primero coloca la ampliación.');
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se jugará automáticamente.');
    const {x,y}=payload;
    if(!availableCells(room,p).some(c=>c.x===x&&c.y===y))throw new Error('Elige una celda vacía del tablero construido.');
    const player=room.players.find(v=>v.symbol===p.turn),state=practiceTurn(room,player.id);
    const symbol=placementSymbol(room,player.id),scorer=room.players.find(v=>v.symbol===symbol);
    const cell={id:id(),requestId:payload.requestId||id(),x,y,symbol,owner:player.id};
    room.cells.push(cell);room.inventoryEffects.forced=room.inventoryEffects.forced.filter(e=>e.player!==player.id);
    const {points,bonus,figures,paidFigures}=scoreCell(room,cell,scorer);player.lastMove=cell;
    recordCombo(scorer,{points,figures,automatic,moveId:cell.id});
    recordImmunityCombo(room,player.id,points,{automatic,scorer:scorer.id});
    recordMax(player,scorer===player?points-bonus:0,scorer===player?figures:0,automatic);
    let full=!availableCells(room,p,{ignoreBlocks:true}).length;
    const completed=automatic||state.remaining<=1||full||!availableCells(room,p).length;
    stepRodent(room,player.id,{placed:true,completed,exclude:cell.id,now,random});
    full=!availableCells(room,p,{ignoreBlocks:true}).length;
    if(!completed&&state.remaining>1&&!full&&availableCells(room,p).length){room.practiceTurn={...state,remaining:state.remaining-1};delete room.practiceTurn.nextSymbol;}
    else{completeInventoryTurn(room,player.id,{automatic,random});delete room.practiceTurn;p.turn=p.turn==='X'?'O':'X';p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();}
    if(full)p.expander=player.id;
    room.lastEvent={id:cell.id,kind:'move',player:scorer.id,actor:player.id,figures,points,bonus,paidFigures,automatic,continuation:full};
  }else if(action==='expand') {
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se colocará una ampliación automáticamente.');
    if(!p.pending||!p.optionalExpansion&&availableCells(room,p,{ignoreBlocks:true}).length)throw new Error('Usa las celdas vacías antes de ampliar.');
    const {x,y}=payload;
    if(!expansionOptions(terrainOf(room),p.terrainAnchor||p.active,room).some(c=>c.x===x&&c.y===y))throw new Error('La ampliación debe tocar tu territorio, añadir celdas y respetar los muros.');
    const known=new Set(room.terrain.map(c=>key(c.x,c.y)));
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(!known.has(key(x+dx,y+dy)))room.terrain.push({x:x+dx,y:y+dy,owner:p.expander});
    recordTerritoryGrowth(room,room.terrain.length-known.size,now,random);
    const strategic=p.optionalExpansion;
    if(strategic){if(!p.strategicExpansion)throw new Error('Usa Ampliación inteligente.');spendCard(room,p.expander,'hint-expand');room.practiceTurn={...practiceTurn(room,p.expander),freeExpanded:true};delete p.optionalExpansion;delete p.strategicExpansion;}else p.credits--;
    room.blocks.push({x,y});p.active={x,y};delete p.terrainAnchor;delete p.frontierUsed;p.pending=0;p.expander=null;if(!strategic)p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();
    room.lastEvent={id:id(),kind:'expand',player:original.pairs[0].expander,automatic};
  }else throw new Error('Acción desconocida.');
  delete room.practiceHint;normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;
}
export function machineChoice(room,random=Math.random,options={}) {
  return chooseMachineMove(room,random,options);
}
function scoreCell(room,cell,scorer){
  const figures=figureWindows(room.cells,cell.x,cell.y,cell.symbol,room.level,null,localLiving(room)).filter(f=>!room.forms.includes(f.id));
  return awardFigures(room,scorer,figures);
}
