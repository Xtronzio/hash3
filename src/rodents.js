import {rodentIcon} from './rodent-icon.js';
import {initializeHabitats,countHabitatPlacement,habitatLabel,visitRodents,visitWorms} from './inhabitants.js';
import {advanceInvasions} from './invasion-paths.js';
export const RODENT_SPAWN=33,RODENT_MEALS=3;
export const initializeRodents=initializeHabitats;
export const rodentSleeping=r=>r.remainingMs!=null;
export function stepRodent(room,playerId,{placed=false,completed=true,now=Date.now(),random=Math.random}={}){
 if(placed){const p=room.players.find(p=>p.id===playerId),point=p?.lastMove||room.lastEvent?.move||room.pairs.find(p=>p.x===playerId||p.o===playerId)?.active;if(point)countHabitatPlacement(room,playerId,point,now,random,{completed});}
 else if(completed){const point=room.pairs.find(p=>p.x===playerId||p.o===playerId)?.active;if(point){visitRodents(room,point,now,random);visitWorms(room,null,now,random);const actions=advanceInvasions(room,now,random);if(actions.length)room.habitatEvent={id:crypto.randomUUID(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};}}
}
export function rodentStatus(room,playerId){const p=room.players.find(p=>p.id===playerId),next=p?.habitatNext?.rodent??(Math.floor((p?.placements||0)/33)+1)*33;return {placements:p?.placements||0,next,remaining:next-(p?.placements||0),animal:room.rodents?.find(r=>r.player===playerId)||null};}
export const rodentLabel=habitatLabel;
export function forgetBrokenFigures(room,cell){const k=`${cell.x},${cell.y}`;room.forms=room.forms.filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').includes(k));}
// One compact line icon, distinct from cards; SVG numbers stay legible on the board.
export {rodentIcon} from './rodent-icon.js';
export function rodentMark(r){return `<span class="rodent-mark ${rodentSleeping(r)?'sleeping':''}"><svg viewBox="0 0 32 32" aria-hidden="true">${rodentIcon}</svg><b>${r.eaten}</b>${rodentSleeping(r)?'<small>z</small>':''}</span>`;}
