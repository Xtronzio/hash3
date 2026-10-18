import {inverseContourInterval} from './inverse-contour.js';
import {inverseRenewalLimit} from './inverse-renewal.js';
export const inverseContourIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6M8 8h8v8H8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export function inverseContourClock(room){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const c=room.inverseContour,n=c?c.next-c.turns:inverseContourInterval(room),warning=!!c?.targets.some(k=>room.inverseFill.includes(k));
 const r=c?.renewal,remaining=inverseRenewalLimit(room)-(r?.restored||0),show=!!r&&remaining>0&&room.inverseFill.length>9;
 return `<button class="inverse-contour-clock ${warning?'is-warning':''}" data-action="locate-inverse-contour" aria-label="Contorno: ${n} turnos compartidos${warning?', localizar celdas amenazadas':''}" title="Contorno · ${n} turnos entre ambos jugadores · ${c?.lost||0} celdas vaciadas sin puntos" ${warning&&room.status==='playing'?'':'disabled'}>${inverseContourIcon}<small>−</small><strong>${n}</strong></button>${show?`<button class="inverse-contour-clock inverse-renewal-clock ${r.targets.length?'is-warning':''}" data-action="locate-inverse-restore" aria-label="Sumas del contorno: ${r.next-c.turns} turnos compartidos, reserva ${remaining} celdas" title="Reposición dentro de la silueta · reserva ${remaining}" ${r.targets.length&&room.status==='playing'?'':'disabled'}><small>+</small><strong>${r.next-c.turns}</strong></button>`:''}`;
}
export function inverseContourNotice(room){
 const c=room.inverseContour;if(!c)return '';
 const fill=new Set(room.inverseFill),n=c.targets.filter(k=>fill.has(k)).length,e=room.inverseContourEvent,recent=e&&c.turns-e.turn<=1;
 const r=c.renewal,re=room.inverseRenewalEvent,rRecent=re&&c.turns-re.turn<=1;
 const renewal=r?.targets.length?`Contorno + · ${r.targets.length} celdas recuperarán relleno en ${r.next-c.turns} turnos compartidos`:rRecent?`Contorno + · ${re.restored.length} celdas recuperadas`:'';
 const plus=renewal?`<div class="practice-banner inverse-contour-notice inverse-renewal-notice" role="status"><span>${renewal}</span><button class="small" data-action="locate-inverse-restore" aria-label="${renewal}. Localizar sumas del contorno" title="${renewal}">${inverseContourIcon}<b aria-hidden="true">+${r?.targets.length||re.restored.length}</b></button></div>`:'';
 if(!n&&!recent)return plus;
 const text=n?`Contorno · ${n} celdas sin puntos en ${c.next-c.turns} turnos compartidos`:`Contorno · ${e.cleared.length} celdas vaciadas sin puntos`;
 return `<div class="practice-banner inverse-contour-notice" role="status"><span>${text}</span><button class="small" data-action="locate-inverse-contour" aria-label="${text}. ${n?'Localizar celdas amenazadas por el contorno':'Localizar última zona vaciada por el contorno'}" title="${text}">${inverseContourIcon}<b aria-hidden="true">−${n||e.cleared.length}</b></button></div>${plus}`;
}
