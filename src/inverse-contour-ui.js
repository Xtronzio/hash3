import {inverseContourInterval} from './inverse-contour.js';
export const inverseContourIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6M8 8h8v8H8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export function inverseContourClock(room){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const c=room.inverseContour,n=c?c.next-c.turns:inverseContourInterval(room),warning=!!c?.targets.some(k=>room.inverseFill.includes(k));
 return `<button class="inverse-contour-clock ${warning?'is-warning':''}" data-action="locate-inverse-contour" aria-label="Contorno: ${n} turnos compartidos${warning?', localizar celdas amenazadas':''}" title="Contorno · ${n} turnos entre ambos jugadores · ${c?.lost||0} celdas vaciadas sin puntos" ${warning&&room.status==='playing'?'':'disabled'}>${inverseContourIcon}<strong>${n}</strong></button>`;
}
export function inverseContourNotice(room){
 const c=room.inverseContour;if(!c)return '';
 const fill=new Set(room.inverseFill),n=c.targets.filter(k=>fill.has(k)).length,e=room.inverseContourEvent,recent=e&&c.turns-e.turn<=1;
 if(!n&&!recent)return '';
 const text=n?`Contorno · ${n} celdas sin puntos en ${c.next-c.turns} turnos compartidos`:`Contorno · ${e.cleared.length} celdas vaciadas sin puntos`;
 return `<div class="practice-banner inverse-contour-notice" role="status"><span>${text}</span><button class="small" data-action="locate-inverse-contour" aria-label="${n?'Localizar celdas amenazadas por el contorno':'Localizar última zona vaciada por el contorno'}">${inverseContourIcon}</button></div>`;
}
