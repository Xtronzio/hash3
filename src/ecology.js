import {eventRule} from './territory-event-rules.js';
export const faunaEnabled=room=>room.faunaEnabled!==false;
export const territoryEnabled=room=>room.territoryEnabled!==false;
export function faunaSuspended(room,now=Date.now()){
 return !!room.territoryEvents?.some(e=>eventRule(e.kind)?.family!=='invaders')||!!room.ecologyRecovery&&(room.ecologyRecovery.until>now||room.ecologyRecovery.moves>0);
}
