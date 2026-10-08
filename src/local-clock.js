// Rendering/navigation does not require cloning or scanning the board every
// 500 ms. The command engine runs only when a clock or inhabitant is due.
export function needsLocalTick(room,now=Date.now()){
 if(room.status!=='playing')return false;
 if(room.habitatVersion!==1)return true;
 if(room.timeMode!=='untimed'&&!(Date.parse(room.pairs[0].deadline)>now))return true;
 return ['rodents','worms','works','bombs'].some(kind=>(room[kind]||[]).some(e=>e.remainingMs!=null||e.nextAt<=now));
}
