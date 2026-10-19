import {terrainOf,key} from './game.js';
import {inverseCellChanges} from './inverse-cell-effects.js';

// Run once per accepted snapshot, never from a camera, map or clock callback.
// An initial load, resume, pause or repeated snapshot is deliberately silent.
export function cellChanges(previous,next){
 if(!previous||previous.id!==next.id||previous.status!=='playing'||!['playing','finished'].includes(next.status)||previous.version>=next.version)return [];
 const changes=new Map(),put=p=>changes.set(key(p.x,p.y),p);
 const before=new Map(previous.cells.map(c=>[c.id,c])),after=new Map(next.cells.map(c=>[c.id,c]));
 const filled=next.variant==='inverse'&&[2,3].includes(next.inverseVersion);
 if(next.variant!=='inverse'){
  const oldTerrain=new Map(terrainOf(previous).map(c=>[key(c.x,c.y),c])),newTerrain=new Map(terrainOf(next).map(c=>[key(c.x,c.y),c]));
  for(const [k,c]of oldTerrain)if(!newTerrain.has(k))put({x:c.x,y:c.y,kind:'erode'});
  for(const [k,c]of newTerrain)if(!oldTerrain.has(k))put({x:c.x,y:c.y,kind:'create'});
 }
 for(const c of before.values())if(!after.has(c.id)&&!changes.has(key(c.x,c.y)))put({x:c.x,y:c.y,kind:'clear'});
 for(const c of after.values())if(!before.has(c.id)&&['X','O'].includes(c.symbol)&&!changes.has(key(c.x,c.y)))put({x:c.x,y:c.y,kind:'place',symbol:c.symbol});
 if(filled)for(const p of inverseCellChanges(previous,next))if(p.kind!=='wild')put(p);
 // A converted or relocated # is not a spontaneous arrival. The event must
 // be new and its final cell must really contain the newly created wildcard.
 const event=next.variant==='inverse'?next.inverseWildEvent:next.neutralEvent,oldEvent=next.variant==='inverse'?previous.inverseWildEvent:previous.neutralEvent;
 if(event&&event.id!==oldEvent?.id&&next.cells.some(c=>c.symbol==='#'&&c.x===event.x&&c.y===event.y&&!before.has(c.id)))put({x:event.x,y:event.y,kind:'wild'});
 if(next.variant!=='inverse'){
  const oldImpacts=new Set((previous.territoryImpacts||[]).map(e=>e.id));
  const territoryPoints=(next.territoryImpacts||[]).filter(e=>!oldImpacts.has(e.id)).flatMap(e=>e.affected||[]);
  if(next.habitatEvent?.id!==previous.habitatEvent?.id)territoryPoints.push(...(next.habitatEvent?.actions||[]),...(next.habitatEvent?.visualActions||[]));
  for(const p of territoryPoints){const effect=changes.get(key(p.x,p.y));if(effect&&effect.kind!=='wild')effect.tone='territory';}
 }
 return [...changes.values()];
}

// Keep simultaneous effects from consecutive commands. New activity replaces
// only its own coordinates; rerenders resume each original start time.
export function mergeCellEffects(active,changes,now,duration){
 const byPosition=new Map((active||[]).filter(p=>p.until>now).map(p=>[key(p.x,p.y),p]));
 for(const p of changes)byPosition.set(key(p.x,p.y),{...p,started:now,until:now+duration});
 return [...byPosition.values()];
}
