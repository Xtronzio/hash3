import {isDeadCell} from './dead-cells.js';
import {terrainOf,key} from './game.js';
import {protectedTerritoryKeys,isImmune} from './immunity.js';
import {habitatReservations,habitatLocations} from './habitat-tools.js';
import {frontierCells,frontierHit} from './frontiers.js';
import {pruneBrokenForms} from './landing-score.js';
import {removeDefeatedInvasions} from './invasion-paths.js';

export const NUCLEAR_MAX=33;
export const nuclearIcon='<g data-icon="nuclear" data-symbol="radiation"><circle cx="16" cy="16" r="2"/><path d="m12.5 9.9-3-5.2a13 13 0 0 1 13 0l-3 5.2a7 7 0 0 0-7 0Z"/><path d="m12.5 9.9-3-5.2a13 13 0 0 1 13 0l-3 5.2a7 7 0 0 0-7 0Z" transform="rotate(120 16 16)"/><path d="m12.5 9.9-3-5.2a13 13 0 0 1 13 0l-3 5.2a7 7 0 0 0-7 0Z" transform="rotate(240 16 16)"/></g>';

// Prepare once for the selection snapshot; never read territory on pointer pan.
export function nuclearContext(room){
 const protectedKeys=protectedTerritoryKeys(room),blocked=new Set(protectedKeys);
 for(const p of room.pairs){const a=p.terrainAnchor||p.active;blocked.add(key(a.x,a.y));}
 for(const c of [...habitatReservations(room),...habitatLocations(room),...(room.worms||[]).flatMap(w=>w.body||[])])blocked.add(key(c.x,c.y));
 const shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));
 for(const c of room.cells)if(shields.has(c.id))blocked.add(key(c.x,c.y));
 // A normal bomb can break whole barriers. Nuclear uses the same convention,
 // except an immune barrier is excluded from both the blast and its footprint.
 for(const f of room.frontiers||[])if(isImmune(room,f.by))for(const c of frontierCells({...room,frontiers:[f]}))blocked.add(key(c.x,c.y));
 const terrain=terrainOf(room).filter(c=>!isDeadCell(room,c.x,c.y)&&!blocked.has(key(c.x,c.y)));
 return {terrain:new Map(terrain.map(c=>[key(c.x,c.y),c])),blocked};
}
export function nuclearOptions(room,context=nuclearContext(room)){return [...context.terrain.values()];}
export function nuclearBlast(room,point,context=nuclearContext(room)){
 if(!Number.isInteger(point?.x)||!Number.isInteger(point?.y)||!context.terrain.has(key(point.x,point.y)))return [];
 const selected=[],seen=new Set(),front=new Map();
 const add=c=>{const k=key(c.x,c.y);if(!seen.has(k)&&context.terrain.has(k)){seen.add(k);front.set(k,{x:c.x,y:c.y});}};
 add(point);
 while(front.size&&selected.length<NUCLEAR_MAX){
  const distance=p=>(p.x-point.x)**2+(p.y-point.y)**2;
  const next=[...front.values()].sort((a,b)=>distance(a)-distance(b)||a.y-b.y||a.x-b.x)[0];
  front.delete(key(next.x,next.y));selected.push(next);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])add({x:next.x+dx,y:next.y+dy});
 }
 return selected;
}
export function applyNuclearTool(room,point){
 const affected=nuclearBlast(room,point);if(!affected.length)throw Error('Elige una celda construida sin anclaje, protección ni habitantes.');
 const hit=new Set(affected.map(c=>key(c.x,c.y))),old=room.cells;
 room.terrain=terrainOf(room).filter(c=>!hit.has(key(c.x,c.y)));
 room.cells=old.filter(c=>!hit.has(key(c.x,c.y)));
 room.frontiers=(room.frontiers||[]).filter(f=>isImmune(room,f.by)||!frontierHit(f,hit));
 room.inventoryEffects.blocks=room.inventoryEffects.blocks.filter(e=>!hit.has(key(e.x,e.y)));
 const live=new Set(room.cells.map(c=>c.id));
 room.inventoryEffects.shields=room.inventoryEffects.shields.filter(e=>live.has(e.cell));
 for(const p of room.players)if(p.lastMove&&!live.has(p.lastMove.id))delete p.lastMove;
 room.eatenCells=(room.eatenCells||[]).filter(c=>!hit.has(key(c.x,c.y)));
 removeDefeatedInvasions(room);pruneBrokenForms(room);
 // Future announced events already validate their regions against terrain.
 // Dianas retain their saved coordinates so the player can return to rebuild.
 return {affected,removed:old.length-room.cells.length,demolished:affected.length,landing:[]};
}
