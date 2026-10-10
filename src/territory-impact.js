import {key} from './game.js';
import {eventLabel,eventRule} from './territory-event-rules.js';
export function recordTerritoryImpact(room,event,before,hit,now){
 const after=new Map(room.cells.map(c=>[key(c.x,c.y),c])),effect=eventRule(event.kind)?.effect;
 const changed=[...new Set([...before.keys(),...after.keys()])].filter(k=>before.get(k)?.id!==after.get(k)?.id||before.get(k)?.symbol!==after.get(k)?.symbol);
 const survivingIds=new Set(room.cells.map(c=>c.id)),removed=[...before.values()].filter(c=>!survivingIds.has(c.id)).length;
 const flipped=[...before].filter(([k,c])=>after.get(k)?.id===c.id&&after.get(k)?.symbol!==c.symbol).length;
 const colonized=[...after].filter(([k,c])=>c.symbol==='*'&&before.get(k)?.symbol!=='*').length;
 const impact={id:event.id,kind:event.kind,at:now,destroyed:effect==='demolish'?hit.size:0,freed:removed,converted:flipped,reordered:changed.length,occupied:colonized};
 room.territoryImpacts=[...(room.territoryImpacts||[]).filter(e=>e.id!==event.id),impact].slice(-6);return impact;
}
export function territoryImpactText(event){
 const label=event.kind==='cataclysm'?'Cataclismo':eventLabel(event.kind),effect=eventRule(event.kind)?.effect;
 if(effect==='demolish')return `${label} ha destruido ${event.destroyed} ${event.destroyed===1?'celda':'celdas'}`;
 if(['pandemic','contagion'].includes(event.kind))return `${label} ha convertido ${event.converted} ${event.converted===1?'ficha':'fichas'}`;
 if(effect==='shuffle')return `${label} ha reordenado ${event.reordered} ${event.reordered===1?'celda':'celdas'}`;
 if(effect==='colonize')return `${label} ha ocupado ${event.occupied} ${event.occupied===1?'celda':'celdas'}`;
 return `${label} ha liberado ${event.freed} ${event.freed===1?'celda':'celdas'}${effect==='blackhole'?` y reordenado ${Math.max(0,event.reordered-event.freed)}`:''}`;
}
export function newTerritoryImpacts(previous,next){
 if(!previous||previous.id!==next.id||next.status!=='playing')return [];
 const seen=new Set((previous.territoryImpacts||[]).map(e=>e.id));return (next.territoryImpacts||[]).filter(e=>!seen.has(e.id));
}
