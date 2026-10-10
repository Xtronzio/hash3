import {localLiving} from './living-balance.js';
export const turnEcology=room=>localLiving(room)&&room.status!=='finished';
export const eventTurns=e=>Math.max(0,e.warningTurns??e.turnsRemaining??0);
export function initializeTurnEcology(room){
 if(!turnEcology(room))return;
 room.ecologyTurns??=0;
 if(room.turnEcologyVersion===1)return;
 for(const e of [...room.territoryEvents||[],...room.works||[],...room.bombs||[]]){
  e.turnsRemaining??=3;e.announcedTurn??=room.ecologyTurns;
  delete e.nextAt;delete e.remainingMs;
 }
 if(room.ecologyRecovery){room.ecologyRecovery={moves:Math.min(3,room.ecologyRecovery.moves??3)};}
 for(const z of room.habitatZones||[]){z.livingInitialized=true;delete z.clockNext;delete z.clockRemaining;}
 for(const k of ['territoryNextNaturalAt','territoryNextInvaderAt']){delete room[k];delete room[k+'Remaining'];}
 room.turnEcologyVersion=1;room.ruleVersion=13;
}
export const ecologyTurnIds=room=>new Set([...(room.territoryEvents||[]),...(room.works||[]),...(room.bombs||[]),...(room.rodentRaids||[]),...(room.worms||[])].map(e=>e.id));
