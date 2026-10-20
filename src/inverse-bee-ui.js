// Preserve layout hooks for existing controls; visible content now uses prison.
import {inverseContourClock} from './inverse-contour-ui.js';
import {prisonState,prisonRemaining,prisonBars} from './inverse-prison.js';
export const inverseBeeIcon=prisonBars;
export function inverseBeeBadge(room,playerId){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const p=prisonState(room,playerId),remaining=prisonRemaining(room,playerId),symbol=room.players.find(p=>p.id===playerId)?.symbol,count=p?.remaining||remaining;
 const label=p?.remaining?`Cárcel ${symbol}: quedan ${count} turnos del rival, fichas protegidas`:remaining===0?`Cárcel ${symbol}: plazo agotado, se espera una oportunidad de cobrar`:`Cárcel ${symbol}: quedan ${remaining??'—'} turnos propios para cobrar con puntos`;
 return `<span class="inverse-bee-badge ${p?.remaining?'is-prisoner':''} ${count!==null&&count<=3?'is-warning':''}" data-bee-symbol="${symbol}" role="img" aria-label="${label}" title="${label}"><b class="inverse-bee-symbol ${symbol.toLowerCase()}">${symbol}</b>${count!==null?`<strong class="inverse-bee-count" data-inverse-bee-count>${count}</strong>`:'<span aria-hidden="true">—</span>'}</span>`;
}
export function inverseBeeClocks(room,playerId,{paused=false}={}){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const own=room.players.find(p=>p.id===playerId),rival=room.players.find(p=>p.id!==playerId);
 return `<div class="inverse-bee-clocks" role="group" aria-label="Cárcel y contorno: cuentas de ambos jugadores${paused?' · Pausa: cuenta detenida':''}">${prisonBars}${[own,rival].filter(Boolean).map((p,i)=>`<span class="inverse-bee-player"><small>${i?'Rival':'Tú'}</small>${inverseBeeBadge(room,p.id)}</span>`).join('')}${inverseContourClock(room)}</div>`;
}
export function inverseBeeNotices(room,{paused=false}={}){
 if(room.variant!=='inverse'||room.inverseVersion!==3)return '';
 const messages=room.players.flatMap(player=>{const p=prisonState(room,player.id),n=prisonRemaining(room,player.id);return p?.remaining?[`${player.symbol} en la cárcel · ${p.remaining} turnos del rival`]:n!==null&&n<=3?[`${player.symbol}: ${n} turnos propios para cobrar${n===0?' · esperando una oportunidad real':''}`]:[];});
 if(!messages.length)return '';
 const brief=room.players.flatMap(player=>{const p=prisonState(room,player.id),n=prisonRemaining(room,player.id);return p?.remaining?[`${player.symbol} · ${p.remaining}`]:n!==null&&n<=3?[`${player.symbol}: ${n}`]:[];}).join(' / ');
 const label=`Cárcel · ${messages.join(' / ')}${paused?' · Pausa: cuenta detenida':''}`;
 return `<div class="practice-banner inverse-bee-notice is-warning" role="status" data-bee-warning="true" aria-label="${label}" title="${label}">${prisonBars}<span>Cárcel · ${brief}</span><span class="inverse-prison-description">${label}</span></div>`;
}
