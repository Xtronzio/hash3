import {eventLabel} from './territory-event-rules.js';
// Local setup contract. Absence means the complete historical catalogue.
export const SELECTABLE_PHENOMENA=Object.freeze(['meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','ufo','clouds','fog','invader-rain','death','neutral']);
export function normalizePhenomena(value){
 if(value==null)return [...SELECTABLE_PHENOMENA];
 if(!Array.isArray(value)||value.some(k=>!SELECTABLE_PHENOMENA.includes(k)))throw Error('La selección de fenómenos no es válida.');
 return SELECTABLE_PHENOMENA.filter(k=>value.includes(k));
}
export function phenomenonEnabled(room,kind){
 if(room.territoryEnabled===false)return false;
 if(!['solo','local'].includes(room.mode)||!Array.isArray(room.phenomena))return true;
 const alias={'invader-colony':'invader-rain','tornado-rain':'tornado'};
 return room.phenomena.includes(alias[kind]||kind);
}
export const phenomenonFamilyEnabled=(room,family)=>family==='invaders'?phenomenonEnabled(room,'invader-rain'):SELECTABLE_PHENOMENA.slice(0,10).some(k=>phenomenonEnabled(room,k));
export function phenomenaComparison(room){
 if(room.territoryEnabled===false||room.phenomena==null)return null;
 const selected=normalizePhenomena(room.phenomena);return selected.length===SELECTABLE_PHENOMENA.length?null:selected.join(',');
}

export const phenomenaDescription=room=>normalizePhenomena(room.phenomena).map(k=>k==='neutral'?'Comodín #':eventLabel(k)).join(', ');
