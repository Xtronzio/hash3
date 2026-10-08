import {isFrontierCell} from './frontiers.js';
const same=(a,x,y)=>a.x===x&&a.y===y;
export function habitatReservations(room){return (room.works||[]).flatMap(w=>[...w.destroy.slice(w.done||0),...w.build.slice(w.done||0)]);}
export function habitatBlocked(room,x,y){return isFrontierCell(room,x,y)||(room.worms||[]).some(w=>(w.body||[]).some(c=>same(c,x,y)))||habitatReservations(room).some(c=>same(c,x,y));}
export function habitatLocations(room){return [...(room.rodentRaids||[]).filter(r=>r.phase!=='hidden').flatMap(r=>r.members?r.members.map(m=>({...r,...m,sourceId:r.id,kind:'rodent'})):[{...r,kind:'rodent'}]),...(room.rodents||[]).map(r=>({...r,kind:'rodent'})),...(room.worms||[]).map(w=>({...w,kind:'worm'})),...(room.works||[]).flatMap(w=>[{...w,...w.destroy[w.done||0],kind:'destroy'},{...w,...w.build[w.done||0],kind:'build'}]).filter(w=>Number.isFinite(w.x)),...(room.bombs||[]).map(b=>({...b,kind:'bomb'}))].map(e=>({...e,clockNow:room.status!=='playing'?room.clockNow:undefined,frozen:room.status!=='playing'}));}
export function habitatTargets(room,kind,playerId){return habitatLocations(room).filter(e=>kind==='work'?['build','destroy'].includes(e.kind):e.kind===kind).sort((a,b)=>(b.player===playerId)-(a.player===playerId));}

export const rodentTurnsRemaining=r=>Math.max(0,3*(r.mealsLeft??r.remaining??3)-(r.turn||0)%3);
