import {inverseBeeWarning} from './inverse-bees.js';
export const inverseBeeIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 12C2 10 5 1 12 7l4 7M19 12C29 10 27 1 20 7l-4 7"/><ellipse cx="16" cy="20" rx="9" ry="7"/><path d="M12 14v12M19 14v12M24 18l4-3M24 23l4 2M8 18l-4-3M8 23l-4 2"/></g></svg>';
export function inverseBeeBadge(room,playerId){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const warning=inverseBeeWarning(room,playerId),symbol=room.players.find(p=>p.id===playerId)?.symbol;
 const label=warning?`Abejas ${symbol}: quedan ${warning} turnos propios para cobrar con puntos`:`Abejas ${symbol}: en calma. Plazo variable de 9, 12 o 15 turnos propios; aviso de tres turnos`;
 return `<span class="inverse-bee-badge ${warning?'is-warning':''}" role="img" aria-label="${label}" title="${label}">${inverseBeeIcon}${warning?`<strong class="inverse-bee-count" data-inverse-bee-count>${warning}</strong>`:'<span class="inverse-bee-calm" aria-hidden="true">—</span>'}</span>`;
}
export function inverseBeeNotices(room,{paused=false}={}){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const warnings=room.players.map(p=>({symbol:p.symbol,remaining:inverseBeeWarning(room,p.id)})).filter(p=>p.remaining);
 const event=room.inverseBeeEvent,state=room.inverseBees?.players?.[event?.symbol],recent=event?.moved>0&&state&&state.turns-event.turn<=1;
 if(!warnings.length&&!recent)return '';
 const text=[...(warnings.length?['Abejas',warnings.map(p=>`<b class="inverse-bee-turns">${p.symbol}: <strong>${p.remaining}</strong></b>`).join(' / '),'turnos propios para cobrar con puntos']:[]),...(recent?[`Enjambre ${event.symbol} · ${event.moved} ficha${event.moved===1?'':'s'} movida${event.moved===1?'':'s'}`]:[])].join(' · ');
 return `<div class="practice-banner inverse-bee-notice ${warnings.length?'is-warning':''}" role="status" data-bee-warning="${warnings.length?'true':'false'}">${inverseBeeIcon}<span>${text}${paused?' · Pausa: cuenta detenida':''}</span></div>`;
}
