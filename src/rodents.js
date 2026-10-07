import {initializeHabitats,countHabitatPlacement,habitatLabel} from './inhabitants.js';
export const RODENT_SPAWN=33,RODENT_MEALS=3;
export const initializeRodents=initializeHabitats;
export const rodentSleeping=r=>r.remainingMs!=null;
export function stepRodent(room,playerId,{placed=false,now=Date.now(),random=Math.random}={}){
 if(placed){const p=room.players.find(p=>p.id===playerId),point=p?.lastMove||room.lastEvent?.move||room.pairs.find(p=>p.x===playerId||p.o===playerId)?.active;if(point)countHabitatPlacement(room,playerId,point,now,random);}
}
export function rodentStatus(room,playerId){const p=room.players.find(p=>p.id===playerId),next=p?.habitatNext?.rodent??(Math.floor((p?.placements||0)/33)+1)*33;return {placements:p?.placements||0,next,remaining:next-(p?.placements||0),animal:room.rodents?.find(r=>r.player===playerId)||null};}
export const rodentLabel=habitatLabel;
export function forgetBrokenFigures(room,cell){const k=`${cell.x},${cell.y}`;room.forms=room.forms.filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').includes(k));}
// One compact line icon, distinct from cards; SVG numbers stay legible on the board.
export const rodentIcon='<path d="M8 13a4 4 0 1 1 5-5m6 0a4 4 0 1 1 5 5M8 13c0-6 16-6 16 0v6c0 6-16 6-16 0Zm4 2h.01M20 15h.01m-6 5 2 2 2-2M8 19H3m21 0h5"/>';
export function rodentMark(r){return `<span class="rodent-mark ${rodentSleeping(r)?'sleeping':''}"><svg viewBox="0 0 32 32" aria-hidden="true">${rodentIcon}</svg><b>${r.eaten}</b>${rodentSleeping(r)?'<small>z</small>':''}</span>`;}
