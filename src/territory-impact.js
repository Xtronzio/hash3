import {key} from './game.js';
import {eventLabel,eventRule} from './territory-event-rules.js';
export function recordTerritoryImpact(room,event,before,hit,now,scores=[]){
 const after=new Map(room.cells.map(c=>[key(c.x,c.y),c])),effect=eventRule(event.kind)?.effect;
 const changed=[...new Set([...before.keys(),...after.keys()])].filter(k=>before.get(k)?.id!==after.get(k)?.id||before.get(k)?.symbol!==after.get(k)?.symbol);
 const survivingIds=new Set(room.cells.map(c=>c.id)),removed=[...before.values()].filter(c=>!survivingIds.has(c.id)).length;
 const flipped=[...before].filter(([k,c])=>after.get(k)?.id===c.id&&after.get(k)?.symbol!==c.symbol).length;
 const colonized=[...after].filter(([k,c])=>c.symbol==='*'&&before.get(k)?.symbol!=='*').length;
 const locations=effect==='demolish'||event.kind==='death'||event.bombPhase==='bomb'||effect==='conceal'?[...hit]:changed;
 const affected=locations.map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};});
 const impact={affected,scores:scores.map(({symbol,points,figures})=>({symbol,points,figures})),id:event.id,kind:event.kind,bombPhase:event.bombPhase,at:now,destroyed:effect==='demolish'?hit.size:0,freed:removed,converted:flipped,reordered:changed.length,occupied:colonized};
 room.territoryImpacts=[...(room.territoryImpacts||[]).filter(e=>e.id!==event.id),impact].slice(-6);return impact;
}
export function territoryImpactText(event){
 const label=event.kind==='cataclysm'?'Cataclismo':eventLabel(event.kind),effect=eventRule(event.kind)?.effect;
 if(['ants','ants-plague'].includes(event.kind))return `${label} ha trasladado ${event.transported} fichas a ${event.constructed} celdas nuevas${(event.scores||[]).map(s=>' · '+s.symbol+' +'+s.points).join('')}`;
 if(effect==='conceal')return `${label} oculta ${event.affected?.length||0} celdas durante tres turnos`;
 if(event.kind==='death')return 'Celda muerta · esta casilla queda inalterable';
 if(event.bombPhase==='bomb')return `Bombardeo ha liberado ${event.freed} fichas · invasores en un turno`;
 if(effect==='demolish')return `${label} ha destruido ${event.destroyed} ${event.destroyed===1?'celda':'celdas'}`;
 if(['pandemic','contagion'].includes(event.kind))return `${label} ha convertido ${event.converted} ${event.converted===1?'ficha':'fichas'}${(event.scores||[]).map(s=>' · '+s.symbol+' +'+s.points).join('')}`;
 if(effect==='shuffle')return `${label} ha reordenado ${event.reordered} ${event.reordered===1?'celda':'celdas'}`;
 if(effect==='colonize')return `${label} ha ocupado ${event.occupied} ${event.occupied===1?'celda':'celdas'}`;
 return `${label} ha liberado ${event.freed} ${event.freed===1?'celda':'celdas'}${effect==='blackhole'?` y reordenado ${Math.max(0,event.reordered-event.freed)}`:''}`;
}
export function newTerritoryImpacts(previous,next){
 if(!previous||previous.id!==next.id||next.status!=='playing')return [];
 const seen=new Set((previous.territoryImpacts||[]).map(e=>e.id));return (next.territoryImpacts||[]).filter(e=>!seen.has(e.id));
}
