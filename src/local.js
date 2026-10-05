import {key,terrainOf,availableCells,expansionOptions,figureWindows} from './game.js';
import {recordMax} from './max.js';
import {chooseMachineMove,machineLevels,machineLevelLabel} from './machine.js';
export const TURN_SECONDS=30;
const id=()=>crypto.randomUUID();
export const localHumanId=room=>room.humanId||room.pairs[0].x;
export const localMachineId=room=>{const p=room.pairs[0];return localHumanId(room)===p.x?p.o:p.x;};
export function createLocal(mode,name='Tú',secondName='Jugador 2',now=Date.now(),level='normal',timeMode='timed',difficulty='medium',playerSymbol='X') {
  if(!['normal','advanced'].includes(level))throw new Error('Elige nivel Normal o Avanzado.');
  if(!['timed','untimed'].includes(timeMode))throw new Error('Elige Con reloj o Sin reloj.');
  if(!machineLevels.some(l=>l.id===difficulty))throw new Error('Elige nivel Básico, Medio, Alto o Pro.');
  if(!['X','O'].includes(playerSymbol))throw new Error('Elige X u O.');
  const x='local-x',o='local-o';
  const humanId=playerSymbol==='X'?x:o,rivalName=mode==='solo'?`Máquina · ${machineLevelLabel(difficulty)}`:secondName;
  return {id:id(),code:'LOCAL',host:humanId,status:'playing',version:1,ruleVersion:2,mode,level,timeMode,playerSymbol,...(mode==='solo'?{difficulty,humanId}:{}),createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),turnSeconds:timeMode==='untimed'?null:TURN_SECONDS,
    players:[{id:x,name:playerSymbol==='X'?name:rivalName,symbol:'X',pair:0,order:1,score:0,figures:0},{id:o,name:playerSymbol==='O'?name:rivalName,symbol:'O',pair:0,order:2,score:0,figures:0}],
    pairs:[{id:0,x,o,turn:'X',active:{x:0,y:0},credits:0,pending:0,expander:null,deadline:timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString()}],
    blocks:[{x:0,y:0}],terrain:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)})),cells:[],forms:[],lines:[]};
}
function normalize(room,now) {
  for(const p of room.pairs) {
    const free=availableCells(room,p);
    if(free.length){p.pending=0;p.expander=null;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
    else{p.pending=1;p.credits=Math.max(1,p.credits||0);p.expander||=p.turn==='X'?p.x:p.o;if(room.timeMode!=='untimed')p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
  }
}
export function localCommand(original,action,payload={},now=Date.now(),random=Math.random) {
  const room=structuredClone(original),p=room.pairs[0];
  if(action==='finish'){delete room.practiceHint;room.status='finished';room.finishedAt=new Date(now).toISOString();room.updatedAt=room.finishedAt;room.version++;return room;}
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
  let automatic=false;
  if(action==='tick') {
    if(Date.parse(p.deadline)>now)return original;
    const choices=p.pending?expansionOptions(terrainOf(room),p.active):availableCells(room,p);if(!choices.length)return original;
    payload=choices[Math.floor(random()*choices.length)];action=p.pending?'expand':'move';automatic=true;
  }
  if(action==='move') {
    if(p.pending)throw new Error('Primero coloca la ampliación.');
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se jugará automáticamente.');
    const {x,y}=payload;
    if(!availableCells(room,p).some(c=>c.x===x&&c.y===y))throw new Error('Elige una celda vacía de tu territorio conectado.');
    const player=room.players.find(v=>v.symbol===p.turn),cell={id:id(),requestId:payload.requestId||id(),x,y,symbol:p.turn,owner:player.id};
    room.cells.push(cell);
    const figures=figureWindows(room.cells,x,y,p.turn,room.level).filter(f=>!room.forms.includes(f.id));
    room.forms.push(...figures.map(f=>f.id));
    const bonus=3*(Math.floor((player.figures+figures.length)/3)-Math.floor(player.figures/3));
    const points=figures.reduce((sum,f)=>sum+f.size,0)+bonus;
    player.score+=points;player.figures+=figures.length;player.lastMove=cell;
    recordMax(player,points-bonus,figures.length,automatic);
    p.credits+=figures.length;p.turn=p.turn==='X'?'O':'X';p.deadline=room.timeMode==='untimed'?null:new Date(now+TURN_SECONDS*1000).toISOString();
    if(!availableCells(room,p).length)p.expander=player.id;
    room.lastEvent={id:cell.id,kind:'move',player:player.id,figures:figures.length,points,bonus,automatic,continuation:!availableCells(room,p).length};
  }else if(action==='expand') {
    if(!automatic&&room.timeMode!=='untimed'&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se colocará una ampliación automáticamente.');
    if(!p.pending||availableCells(room,p).length)throw new Error('Usa las celdas vacías antes de ampliar.');
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
