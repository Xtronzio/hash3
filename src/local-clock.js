import {faunaEnabled,faunaSuspended} from './ecology.js';
// Rendering/navigation does not require cloning or scanning the board every
// 500 ms. The command engine runs only when a clock or inhabitant is due.
export function needsLocalTick(room,now=Date.now()){
 if(room.status!=='playing')return false;
 if(room.matchGoal?.type==='time'&&Date.parse(room.endsAt)<=now)return true;
 if((room.inventoryEffects?.immunities||[]).some(e=>e.expiresAt<=now))return true;
 if(room.habitatVersion!==3)return true;
 if(room.timeMode!=='untimed'&&!(Date.parse(room.pairs[0].deadline)>now))return true;
 if((room.territoryEvents||[]).some(e=>e.remainingMs!=null||e.nextAt<=now))return true;
 if(!faunaEnabled(room)||faunaSuspended(room,now))return false;
 return ['worms','works','bombs'].some(kind=>(room[kind]||[]).some(e=>e.remainingMs!=null||e.nextAt<=now));
}
