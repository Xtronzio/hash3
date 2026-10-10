import {terrainOf,key} from './game.js';
export const targetIcon='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>';
export function toggleWatchTarget(room,point){
 if(!Number.isInteger(point.x)||!Number.isInteger(point.y))throw new Error('Elige una celda del territorio.');
 room.watchTargets||=[];
 const existing=room.watchTargets.findIndex(p=>p.x===point.x&&p.y===point.y);
 if(existing>=0){room.watchTargets.splice(existing,1);return;}
 if(!terrainOf(room).some(p=>p.x===point.x&&p.y===point.y))throw new Error('Elige una celda del territorio.');
 if(room.watchTargets.length>=3)throw new Error('Puedes seguir tres celdas. Quita una diana antes de añadir otra.');
 const number=[1,2,3].find(n=>!room.watchTargets.some(p=>p.number===n));
 room.watchTargets.push({id:crypto.randomUUID(),number,x:point.x,y:point.y});
}
export function targetNavigation(room,{inspection=false}={}){
 const targets=room.watchTargets||[];
 return `${inspection?'':`<button data-action="mark-target" aria-label="Marcar o quitar una diana" title="Marcar o quitar una diana"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button>`}${targets.map(p=>`<button ${inspection?'data-inspect-action="target"':'data-action="locate-target"'} data-id="${p.id}" class="watch-jump" aria-label="Ir a diana ${p.number}, celda ${p.x}, ${p.y}" title="Diana ${p.number}"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg><small>${p.number}</small></button>`).join('')}`;
}
export const watchedKeys=room=>new Map((room.watchTargets||[]).map(p=>[key(p.x,p.y),p]));
