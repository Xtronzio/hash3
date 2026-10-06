import {key,terrainOf,connectedTerrain,availableCells,expansionOptions,figureWindows,isBlockedCell} from './game.js';
import {recordMax} from './max.js';
import {recordCombo} from './records.js';
import {initializeRodents,stepRodent} from './rodents.js';
import {canUsePracticeTool,practiceTurn,toolCells,moveDestination,initializeInventory,spendCard,completeInventoryTurn,placementSymbol} from './practice-tools.js';
import {chooseMachineMove,machineLevels,machineLevelLabel} from './machine.js';
import {activateImmunity,recordImmunityCombo} from './immunity.js';
export const TURN_SECONDS=30;
const id=()=>crypto.randomUUID();
export const localHumanId=room=>room.humanId||room.pairs[0].x;
export const localMachineId=room=>{const p=room.pairs[0];return localHumanId(room)===p.x?p.o:p.x;};
export function createLocal(mode,name='Tú',secondName='Jugador 2',now=Date.now(),level='normal',timeMode='timed',difficulty='medium',playerSymbol='X',machineInventory=false) {
  if(!['normal','advanced'].includes(level))throw new Error('Elige nivel Normal o Avanzado.');
  if(!['timed','untimed'].includes(timeMode))throw new Error('Elige Con reloj o Sin reloj.');
  if(!machineLevels.some(l=>l.id===difficulty))throw new Error('Elige nivel Básico, Medio, Alto o Pro.');
  if(!['X','O'].includes(playerSymbol))throw new Error('Elige X u O.');
  const x='local-x',o='local-o';
  const humanId=playerSymbol==='X'?x:o,rivalName=mode==='solo'?`Máquina · ${machineLevelLabel(difficulty)}`:secondName;
  const room={id:id(),code:'LOCAL',host:humanId,status:'playing',version:1,ruleVersion:2,mode,level,timeMode,playerSymbol,...(mode==='solo'?{difficulty,humanId,machineInventory:machineInventory===true}:{}),createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),turnSeconds:timeMode==='untimed'?null:TURN_SECONDS,
    players:[{id:x,name:playerSymbol==='X'?name:rivalName,symbol:'X',pair:0,order:1,score:0,figures:0},{id:o,name:playerSymbol==='O'?name:rivalName,symbol:'O',pair:0,order:2,score:0,figures:0}],
    pairs:[{id:0,x,o,turn:'X',active:{x:0,y:0},credits:0,pending:0,expander:null,deadline:timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString()}],
    blocks:[{x:0,y:0}],terrain:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)})),cells:[],forms:[],lines:[]};
  initializeInventory(room);initializeRodents(room);return room;
}
function normalize(room,now) {
  for(const p of room.pairs) {
    const free=availableCells(room,p,{ignoreBlocks:true});
    if(free.length){p.pending=0;p.expander=null;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
    else{p.pending=1;p.credits=Math.max(1,p.credits||0);p.expander||=p.turn==='X'?p.x:p.o;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
  }
}
export function localCommand(original,action,payload={},now=Date.now(),random=Math.random) {
  const room=structuredClone(original),p=room.pairs[0];
  initializeInventory(room);initializeRodents(room);
  if(action==='finish'){delete room.practiceHint;delete room.practiceTurn;room.status='finished';room.finishedAt=new Date(now).toISOString();room.updatedAt=room.finishedAt;room.version++;return room;}
  if(action==='pause'){
    if(room.status==='paused')return original;
    if(room.status!=='playing')throw new Error('La partida no está en curso.');
    room.pauseRemainingMs=room.timeMode==='untimed'?null:Math.max(0,Date.parse(p.deadline)-now);
    room.status='paused';room.pausedAt=new Date(now).toISOString();p.deadline=null;room.updatedAt=room.pausedAt;room.version++;return room;
  }
  if(action==='resume'){
    if(room.status==='playing')return original;
    if(room.status!=='paused')throw new Error('La partida no está pausada.');
    room.status='playing';p.deadline=room.timeMode==='untimed'?null:new Date(now+(room.pauseRemainingMs??TURN_SECONDS*1000)).toISOString();
    delete room.pauseRemainingMs;delete room.pausedAt;room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  if(action==='tick'&&(room.status!=='playing'||room.timeMode==='untimed'))return original;
  if(room.status!=='playing')throw new Error('La partida no está activa.');
  if(action==='inventory'){
    const {tool,playerId}=payload;
    if(tool==='hint')throw new Error('Activa Ayuda desde el inventario.');
    if(!canUsePracticeTool(room,playerId,tool,now))throw new Error('Herramienta no disponible: una por turno, o dos activando Combo primero; úsala antes de agotar el reloj.');
    const actor=room.players.find(v=>v.id===playerId);
    if(['double','rival','combo','immunity'].includes(tool)){
      spendCard(room,playerId,tool);
      if(tool==='double')room.practiceTurn.remaining=2;else if(tool==='rival')room.inventoryEffects.forced.push({player:p[p.turn==='X'?'o':'x'],symbol:actor.symbol,by:playerId});
      else if(tool==='immunity')activateImmunity(room,playerId);
      room.lastEvent={id:id(),kind:'inventory',player:playerId,tool};
    }else{
      const {x,y}=payload;
      if(!toolCells(room,playerId,tool).some(c=>c.x===x&&c.y===y))throw new Error(tool==='activate'?'Elige un hueco sin ampliar que toque tu territorio conectado.':'Elige una ficha rival en tu territorio conectado, sin escudo; tus colocaciones no se pueden borrar.');
      const index=room.cells.findIndex(c=>c.x===x&&c.y===y);
      const old=index>=0?room.cells[index]:null;
      let changed=null;
      if(tool==='activate')room.terrain=[...terrainOf(room),{x,y}];
      if(tool==='erase')room.cells.splice(index,1);
      if(tool==='opposite'){changed={...old,id:id(),symbol:actor.symbol,owner:playerId};room.cells[index]=changed;}
      if(tool==='shift'){
        const destination={x:payload.toX,y:payload.toY};
        if(!moveDestination(room,playerId,destination)||isBlockedCell(room,old.owner,destination.x,destination.y))throw new Error('Elige un destino vacío, conectado y sin bloqueo para la ficha rival.');
        changed={...old,...destination,id:id()};room.cells[index]=changed;
      }
      if(tool==='block')room.inventoryEffects.blocks.push({x,y,by:playerId,remaining:2,fresh:true});
      if(tool==='shield')room.inventoryEffects.shields.push({cell:old.id,by:playerId,remaining:2});
      if(['erase','opposite','shift'].includes(tool))for(const player of room.players)if(player.lastMove?.id===old.id)delete player.lastMove;
      if(changed){
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
    delete room.practiceHint;room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  let automatic=false;
  if(action==='tick') {
    if(Date.parse(p.deadline)>now)return original;
    const choices=p.pending?expansionOptions(terrainOf(room),p.active):availableCells(room,p);
    if(!choices.length){if(!p.pending&&availableCells(room,p,{ignoreBlocks:true}).length){action='pass';automatic=true;}else return original;}
    else{payload=choices[Math.floor(random()*choices.length)];action=p.pending?'expand':'move';automatic=true;}
  }
  if(action==='pass'){
    if(p.pending||availableCells(room,p).length||!availableCells(room,p,{ignoreBlocks:true}).length)throw new Error('Solo se puede pasar cuando todas las celdas vacías están bloqueadas.');
    const actor=p[p.turn.toLowerCase()];stepRodent(room,actor,{placed:false});completeInventoryTurn(room,actor,{automatic,placed:false,random});delete room.practiceTurn;
    p.turn=p.turn==='X'?'O':'X';p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();
    room.lastEvent={id:id(),kind:'pass',player:actor,automatic};
    normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;
  }
  if(action==='move') {
    if(p.pending)throw new Error('Primero coloca la ampliación.');
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se jugará automáticamente.');
    const {x,y}=payload;
    if(!availableCells(room,p).some(c=>c.x===x&&c.y===y))throw new Error('Elige una celda vacía de tu territorio conectado.');
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
    stepRodent(room,player.id,{placed:true,completed,exclude:cell.id});
    full=!availableCells(room,p,{ignoreBlocks:true}).length;
    if(!completed&&state.remaining>1&&!full&&availableCells(room,p).length){room.practiceTurn={...state,remaining:state.remaining-1};delete room.practiceTurn.nextSymbol;}
    else{completeInventoryTurn(room,player.id,{automatic,random});delete room.practiceTurn;p.turn=p.turn==='X'?'O':'X';p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();}
    if(full)p.expander=player.id;
    room.lastEvent={id:cell.id,kind:'move',player:scorer.id,actor:player.id,figures,points,bonus,paidFigures,automatic,continuation:full};
  }else if(action==='expand') {
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se colocará una ampliación automáticamente.');
    if(!p.pending||availableCells(room,p,{ignoreBlocks:true}).length)throw new Error('Usa las celdas vacías antes de ampliar.');
    const {x,y}=payload;
    if(!expansionOptions(terrainOf(room),p.active).some(c=>c.x===x&&c.y===y))throw new Error('La ampliación debe tocar tu territorio y añadir alguna celda.');
    const known=new Set(room.terrain.map(c=>key(c.x,c.y)));
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(!known.has(key(x+dx,y+dy)))room.terrain.push({x:x+dx,y:y+dy});
    room.blocks.push({x,y});p.active={x,y};p.credits--;p.pending=0;p.expander=null;p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();
    room.lastEvent={id:id(),kind:'expand',player:original.pairs[0].expander,automatic};
  }else throw new Error('Acción desconocida.');
  delete room.practiceHint;normalize(room,now);room.updatedAt=new Date(now).toISOString();room.version++;return room;
}
export function machineChoice(room,random=Math.random,options={}) {
  return chooseMachineMove(room,random,options);
}
function scoreCell(room,cell,scorer){
  const figures=figureWindows(room.cells,cell.x,cell.y,cell.symbol,room.level).filter(f=>!room.forms.includes(f.id));
  room.forms.push(...figures.map(f=>f.id));
  const bonus=3*(Math.floor((scorer.figures+figures.length)/3)-Math.floor(scorer.figures/3)),points=figures.reduce((sum,f)=>sum+f.size,0)+bonus;
  scorer.score+=points;scorer.figures+=figures.length;room.pairs[0].credits+=figures.length;
  return {figures:figures.length,points,bonus,paidFigures:figures};
}
