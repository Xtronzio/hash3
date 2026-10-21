import {terrainOf,key} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {faunaProtection,clearBriefCells} from './brief-ecology.js';
import {isDeadCell} from './dead-cells.js';

export function waveContext(room,exclude=new Set()){
 const safe=faunaProtection(room);
 return new Map(terrainOf(room).filter(c=>!safe.has(key(c.x,c.y))&&!exclude.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)).map(c=>[key(c.x,c.y),{x:c.x,y:c.y}]));
}
export function waveBlast(point,known){
 if(!known.has(key(point.x,point.y)))return [];
 const queue=[known.get(key(point.x,point.y))],seen=new Set([key(point.x,point.y)]);
 for(let i=0;i<queue.length&&queue.length<3;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
  const k=key(queue[i].x+dx,queue[i].y+dy);if(known.has(k)&&!seen.has(k)){seen.add(k);queue.push(known.get(k));if(queue.length===3)break;}
 }
 return queue.length===3?queue:[];
}
export function planBombWave(room,count,random=Math.random){
 const known=waveContext(room),pool=[...known.values()],groups=[];
 const offset=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));
 for(let i=0;i<pool.length&&groups.length<count;i++){
  const group=waveBlast(pool[(i+offset)%pool.length],known);if(group.length!==3)continue;
  groups.push(group);for(const c of group)known.delete(key(c.x,c.y));
 }
 return {region:groups.flat(),groups,bombPhase:'bomb'};
}
export function applyBombWave(room,event,now){
 const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),safe=faunaProtection(room);
 const region=event.region.filter(c=>known.has(key(c.x,c.y))&&!isDeadCell(room,c.x,c.y)&&!safe.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y));
 if(event.bombPhase==='bomb'){
  clearBriefCells(room,region);
  if(region.length)room.territoryEvents.push({id:event.id+':entry',kind:'invader-colony',bombPhase:'invasion',region,groups:event.groups?.map(g=>g.filter(c=>region.some(p=>p.x===c.x&&p.y===c.y))).filter(g=>g.length),x:region[0].x,y:region[0].y,turnsRemaining:1,announcedTurn:room.ecologyTurns||0,...(event.directorBatch?{directorBatch:event.directorBatch,directorTier:event.directorTier}:{})});
  return {hit:new Set(region.map(c=>key(c.x,c.y))),actions:region.map(c=>({...c,kind:'invader-rain'})),demolish:false};
 }
 clearBriefCells(room,region);
 for(const c of region)room.cells.push({...c,id:crypto.randomUUID(),symbol:'*',owner:null,invader:true});
 return {hit:new Set(region.map(c=>key(c.x,c.y))),actions:region.map(c=>({...c,kind:'invader-colony'})),demolish:false};
}
