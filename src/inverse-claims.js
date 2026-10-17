import {comboInverse,inverseComboAt,inverseCombos} from './inverse-combos.js';
import {key,figureWindows,prepareFigureIndex,availableCells} from './game.js';
import {practiceTurn} from './practice-tools.js';
export const manualInverse=room=>room?.variant==='inverse'&&room.inverseVersion===3;
export const INVERSE_WILD_INTERVAL=9;
export const INVERSE_WILD_CAP=3;
export function canClaimInverse(room,playerId){
 const p=room?.pairs?.[0],state=practiceTurn(room,playerId);
 return manualInverse(room)&&room.status==='playing'&&p[p.turn.toLowerCase()]===playerId&&state.remaining===1&&!state.used.includes('double');
}
export function inverseClaimsAt(room,playerId,point,index=null){
 if(comboInverse(room)){const combo=inverseComboAt(room,playerId,point);return combo?[combo]:[];}
 index||=prepareFigureIndex(room.cells,true);
 const player=room.players.find(p=>p.id===playerId);if(!player)return [];
 index.inverseCells||=new Map(room.cells.map(c=>[key(c.x,c.y),c]));const c=index.inverseCells.get(key(point.x,point.y));if(!c||![player.symbol,'#'].includes(c.symbol))return [];
 index.inverseOwn||=new Map();if(!index.inverseOwn.has(player.symbol))index.inverseOwn.set(player.symbol,new Set(room.cells.filter(c=>c.symbol===player.symbol).map(c=>key(c.x,c.y))));
 const own=index.inverseOwn.get(player.symbol),fill=index.inverseFill||=new Set(room.inverseFill);
 return figureWindows(room.cells,point.x,point.y,player.symbol,room.level,index,true).filter(f=>f.points.some(([x,y])=>own.has(key(x,y)))).map(f=>{
  const filled=f.points.filter(([x,y])=>fill.has(key(x,y))).length,bonus=filled&&player.figures%3===2?3:0;
  return {...f,filled,pointsValue:filled?f.size+bonus:0};
 }).sort((a,b)=>b.pointsValue-a.pointsValue||b.size-a.size||a.id.localeCompare(b.id));
}
export function inverseClaims(room,playerId,limit=Infinity){
 if(comboInverse(room))return inverseCombos(room,playerId,limit);
 const player=room.players.find(p=>p.id===playerId),index=prepareFigureIndex(room.cells,true),found=new Map();if(!player)return [];
 for(const c of room.cells)if(c.symbol===player.symbol){for(const f of inverseClaimsAt(room,playerId,c,index))found.set(f.id,f);if(found.size>=limit)break;}
 return [...found.values()].sort((a,b)=>b.pointsValue-a.pointsValue||b.filled-a.filled||a.id.localeCompare(b.id));
}
export function advanceInverseWild(room,random=Math.random){
 room.inverseMoves=(room.inverseMoves||0)+1;room.inverseWildNext??=INVERSE_WILD_INTERVAL;
 if(room.inverseMoves<room.inverseWildNext)return;
 room.inverseWildNext=room.inverseMoves+INVERSE_WILD_INTERVAL;
 if(room.cells.filter(c=>c.symbol==='#').length>=INVERSE_WILD_CAP)return;
 const free=availableCells(room,room.pairs[0]);
 // Leave a legal placement when a second Doble placement is still pending.
 if(free.length<=1)return;
 const fill=new Set(room.inverseFill),pending=free.filter(p=>fill.has(key(p.x,p.y)));if(!pending.length)return;
 const point=pending[Math.min(pending.length-1,Math.floor(Math.max(0,random())*pending.length))];
 room.cells.push({...point,id:crypto.randomUUID(),symbol:'#',owner:null});
 room.inverseWildEvent={id:crypto.randomUUID(),x:point.x,y:point.y,move:room.inverseMoves};
}
