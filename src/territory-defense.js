import {key} from './game.js';
import {toolCells} from './practice-tools.js';
import {removeDefeatedInvasions} from './invasion-paths.js';
import {pruneBrokenForms} from './landing-score.js';
export function applyTerritoryDefense(room,playerId,tool,point){
 if(!toolCells(room,playerId,tool).some(c=>c.x===point.x&&c.y===point.y))throw new Error('Elige una celda afectada válida.');
 if(tool==='antidote'){
  // One pending event only; never shift its countdown or cancel its region.
  const event=room.territoryEvents.find(e=>['contagion','pandemic'].includes(e.kind)&&e.region.some(c=>c.x===point.x&&c.y===point.y)&&!(e.antidotes||[]).some(c=>c.x===point.x&&c.y===point.y)&&(e.turnsRemaining>0||e.nextAt>room.clockNow));
  if(!event)throw new Error('No hay conversión pendiente en esa celda.');
  (event.antidotes||=[]).push({x:point.x,y:point.y,by:playerId});
  return {cells:[{x:point.x,y:point.y}],eventId:event.id};
 }
 const limit=tool==='ambush'?3:33;
 const targets=toolCells(room,playerId,tool).sort((a,b)=>Math.abs(a.x-point.x)+Math.abs(a.y-point.y)-Math.abs(b.x-point.x)-Math.abs(b.y-point.y)||a.y-b.y||a.x-b.x).slice(0,limit);
 const cleared=new Set(targets.map(c=>key(c.x,c.y)));
 room.cells=room.cells.filter(c=>!cleared.has(key(c.x,c.y)));removeDefeatedInvasions(room);pruneBrokenForms(room);
 return {cells:targets.map(({x,y})=>({x,y})),cleared:targets.length};
}
