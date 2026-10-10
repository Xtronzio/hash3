import {terrainOf,key} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {protectedTerritoryKeys} from './immunity.js';
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
