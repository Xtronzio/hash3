import {key,terrainOf,availableCells,expansionOptions,figureWindows} from './game.js';
export const TURN_SECONDS=30;
const id=()=>crypto.randomUUID();
export function createLocal(mode,name='Tú',secondName='Jugador 2',now=Date.now()) {
  const x='local-x',o='local-o';
  return {id:id(),code:'LOCAL',host:x,status:'playing',version:1,ruleVersion:2,mode,turnSeconds:TURN_SECONDS,
    players:[{id:x,name,symbol:'X',pair:0,order:1,score:0,figures:0},{id:o,name:mode==='solo'?'Máquina':secondName,symbol:'O',pair:0,order:2,score:0,figures:0}],
    pairs:[{id:0,x,o,turn:'X',active:{x:0,y:0},credits:0,pending:0,expander:null,deadline:new Date(now+TURN_SECONDS*1000).toISOString()}],
    blocks:[{x:0,y:0}],terrain:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)})),cells:[],forms:[],lines:[]};
}
function normalize(room,now) {
  for(const p of room.pairs) {
    const free=availableCells(room,p);
    if(free.length){p.pending=0;p.expander=null;p.deadline||=new Date(now+TURN_SECONDS*1000).toISOString();}
    else{p.pending=1;p.credits=Math.max(1,p.credits||0);p.expander||=p.turn==='X'?p.x:p.o;p.deadline=null;}
  }
}
export function localCommand(original,action,payload={},now=Date.now(),random=Math.random) {
  const room=structuredClone(original),p=room.pairs[0];
  if(action==='finish'){room.status='finished';room.version++;return room;}
  if(room.status!=='playing')throw new Error('La partida no está activa.');
  let automatic=false;
  if(action==='tick') {
    if(p.pending||Date.parse(p.deadline)>now)return original;
    const choices=availableCells(room,p);if(!choices.length)return original;
    payload=choices[Math.floor(random()*choices.length)];action='move';automatic=true;
  }
  if(action==='move') {
    if(p.pending)throw new Error('Primero coloca la ampliación.');
    if(!automatic&&Date.parse(p.deadline)<=now)throw new Error('Tiempo agotado: se jugará automáticamente.');
    const {x,y}=payload;
    if(!availableCells(room,p).some(c=>c.x===x&&c.y===y))throw new Error('Elige una celda vacía de tu territorio conectado.');
    const player=room.players.find(v=>v.symbol===p.turn),cell={id:id(),requestId:payload.requestId||id(),x,y,symbol:p.turn,owner:player.id};
    room.cells.push(cell);
    const figures=figureWindows(room.cells,x,y,p.turn).filter(f=>!room.forms.includes(f.id));
    room.forms.push(...figures.map(f=>f.id));
    const bonus=3*(Math.floor((player.figures+figures.length)/3)-Math.floor(player.figures/3));
    const points=figures.reduce((sum,f)=>sum+f.size,0)+bonus;
    player.score+=points;player.figures+=figures.length;player.lastMove=cell;
    p.credits+=figures.length;p.turn=p.turn==='X'?'O':'X';p.deadline=new Date(now+TURN_SECONDS*1000).toISOString();
    if(!availableCells(room,p).length)p.expander=player.id;
    room.lastEvent={id:cell.id,kind:'move',player:player.id,figures:figures.length,points,bonus,automatic,continuation:!availableCells(room,p).length};
  }else if(action==='expand') {
    if(!p.pending||availableCells(room,p).length)throw new Error('Usa las celdas vacías antes de ampliar.');
    const {x,y}=payload;
    if(!expansionOptions(terrainOf(room),p.active).some(c=>c.x===x&&c.y===y))throw new Error('La ampliación debe tocar tu territorio y añadir alguna celda.');
    const known=new Set(room.terrain.map(c=>key(c.x,c.y)));
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(!known.has(key(x+dx,y+dy)))room.terrain.push({x:x+dx,y:y+dy});
    room.blocks.push({x,y});p.active={x,y};p.credits--;p.pending=0;p.expander=null;p.deadline=new Date(now+TURN_SECONDS*1000).toISOString();
  }else throw new Error('Acción desconocida.');
  normalize(room,now);room.version++;return room;
}
export function machineChoice(room,random=Math.random) {
  const p=room.pairs[0];
  if(p.pending) {
    const choices=expansionOptions(room.terrain,p.active),known=new Set(room.terrain.map(c=>key(c.x,c.y)));
    const scored=choices.map(c=>({c,n:Array.from({length:9},(_,i)=>key(c.x+i%3,c.y+Math.floor(i/3))).filter(k=>!known.has(k)).length}));
    const best=Math.max(...scored.map(v=>v.n));const preferred=scored.filter(v=>v.n===best);
    return {action:'expand',payload:preferred[Math.floor(random()*preferred.length)].c};
  }
  const free=availableCells(room,p),symbol=p.turn,other=symbol==='X'?'O':'X';
  const gain=(c,s)=>figureWindows([...room.cells,{...c,symbol:s}],c.x,c.y,s).filter(f=>!room.forms.includes(f.id)).reduce((sum,f)=>sum+f.size,0);
  const scored=free.map(c=>({c,value:gain(c,symbol)*2+gain(c,other)})),best=Math.max(...scored.map(v=>v.value));
  const preferred=scored.filter(v=>v.value===best);
  return {action:'move',payload:preferred[Math.floor(random()*preferred.length)].c};
}
