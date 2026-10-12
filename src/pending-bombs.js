import {terrainOf,key} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {protectedTerritoryKeys} from './immunity.js';
import {invasionGrowthCells,removeDefeatedInvasions} from './invasion-paths.js';
import {pruneBrokenForms} from './landing-score.js';
export function activeInvasionBombs(room,growthCells=invasionGrowthCells(room)){
 if(room.status==='finished')return [];
 const ids=new Set((room.invasions||[]).filter(c=>c.kind==='invader-rain'&&c.grown<9&&c.failed<3).map(c=>c.id)),fronts=new Set(growthCells.map(c=>key(c.x,c.y)));
 return room.cells.filter(c=>c.symbol==='*'&&ids.has(c.invasionId)&&fronts.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)).map(c=>({...c,phase:'active',kind:'invader-rain'}));
}
export function disarmInvasionBombs(room,point){
 if(pendingInvasionBombs(room).some(b=>b.x===point.x&&b.y===point.y))return disarmPendingBombs(room,point);
 const bombs=activeInvasionBombs(room),anchor=bombs.find(b=>b.x===point.x&&b.y===point.y);
 if(!anchor)throw new Error('Elige una bomba anunciada o un frente activo de Bombardeo.');
 const targets=bombs.filter(b=>b.invasionId===anchor.invasionId).sort((a,b)=>Math.abs(a.x-point.x)+Math.abs(a.y-point.y)-Math.abs(b.x-point.x)-Math.abs(b.y-point.y)||a.y-b.y||a.x-b.x).slice(0,3),removed=new Set(targets.map(c=>c.id));
 room.cells=room.cells.filter(c=>!removed.has(c.id));
 for(const p of room.players)if(removed.has(p.lastMove?.id))delete p.lastMove;
 if(room.inventoryEffects?.shields)room.inventoryEffects.shields=room.inventoryEffects.shields.filter(e=>!removed.has(e.cell));
 removeDefeatedInvasions(room);pruneBrokenForms(room);
 return {disarmed:targets.length,invasionId:anchor.invasionId,phase:'active',cells:targets.map(({x,y})=>({x,y}))};
}
export function pendingInvasionBombs(room){
 return (room.territoryEvents||[]).filter(e=>e.kind==='invader-rain'&&e.turnsRemaining>0).flatMap(e=>e.region.map((p,index)=>({...p,id:e.id+':'+index,eventId:e.id,index,turnsRemaining:e.turnsRemaining,kind:'invader-rain'})));
}
export function bombDestinations(room,bomb,now=room.clockNow??Date.now()){
 const protectedKeys=protectedTerritoryKeys(room,now),others=new Set(pendingInvasionBombs(room).filter(b=>b.id!==bomb.id).map(p=>key(p.x,p.y)));
 return terrainOf(room).filter(p=>!others.has(key(p.x,p.y))&&!protectedKeys.has(key(p.x,p.y))&&!habitatBlocked(room,p.x,p.y)&&!room.cells.some(c=>c.x===p.x&&c.y===p.y&&c.symbol==='*'));
}
export function movePendingBomb(room,bombId,point,now){
 const bomb=pendingInvasionBombs(room).find(b=>b.id===bombId);
 if(!bomb||!bombDestinations(room,bomb,now).some(p=>p.x===point.x&&p.y===point.y))throw new Error('Elige una bomba pendiente y un destino válido.');
 const event=room.territoryEvents.find(e=>e.id===bomb.eventId),old=event.region[bomb.index];
 event.region[bomb.index]={...point};
 if(event.groups)for(const g of event.groups)for(let i=0;i<g.length;i++)if(g[i].x===old.x&&g[i].y===old.y)g[i]={...point};
 // A transported bomb is already inside the territory; retain all other lanes.
 event.paths=(event.paths||[]).map(p=>p.target.x===old.x&&p.target.y===old.y?{target:{...point},path:[{...point}]}:p);
 if(event.approaches)event.approaches[bomb.index]={...point,side:event.approaches[bomb.index]?.side||'north'};
 event.x=event.region[0].x;event.y=event.region[0].y;
}
export function disarmPendingBombs(room,point){
 const bombs=pendingInvasionBombs(room),anchor=bombs.find(b=>b.x===point.x&&b.y===point.y);
 if(!anchor)throw new Error('Elige una bomba de bombardeo todavía anunciada.');
 // The selected announcement alone: never cancel another warning or its clock.
 const event=room.territoryEvents.find(e=>e.id===anchor.eventId);
 const targets=bombs.filter(b=>b.eventId===anchor.eventId).sort((a,b)=>Math.abs(a.x-point.x)+Math.abs(a.y-point.y)-Math.abs(b.x-point.x)-Math.abs(b.y-point.y)||a.index-b.index).slice(0,3);
 const removed=new Set(targets.map(b=>key(b.x,b.y))),indices=new Set(targets.map(b=>b.index));
 event.region=event.region.filter((_,index)=>!indices.has(index));
 if(event.groups)event.groups=event.groups.map(g=>g.filter(p=>!removed.has(key(p.x,p.y)))).filter(g=>g.length);
 if(event.paths)event.paths=event.paths.filter(p=>!removed.has(key(p.target.x,p.target.y)));
 if(event.approaches)event.approaches=event.approaches.filter((_,index)=>!indices.has(index));
 if(!event.region.length)room.territoryEvents=room.territoryEvents.filter(e=>e.id!==event.id);
 else {event.x=event.region[0].x;event.y=event.region[0].y;}
 return {disarmed:targets.length,eventId:event.id,cells:targets.map(({x,y})=>({x,y}))};
}
