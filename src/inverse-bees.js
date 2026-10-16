// Inverso pressure advances only when a player's complete turn ends.
export const INVERSE_BEE_LIMITS=Object.freeze(Array.from({length:31},(_,i)=>i+3));
const LEGACY_LIMITS=[9,12,15];
export const INVERSE_BEE_WARNING=3;
const enabled=r=>r?.variant==='inverse'&&r.inverseVersion===3;
const key=c=>`${c.x},${c.y}`;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const draw=random=>{const n=Number(random());return Number.isFinite(n)?Math.max(0,Math.min(1-Number.EPSILON,n)):.5;};
const interval=random=>INVERSE_BEE_LIMITS[Math.floor(draw(random)*INVERSE_BEE_LIMITS.length)];
export function validInverseBees(room){
 const b=room?.inverseBees;if(b==null)return room?.inverseBeeEvent==null;
 if(!enabled(room)||![1,2].includes(b.version)||!b.players||!['X','O'].every(s=>{const p=b.players[s];return p&&integer(p.turns)&&integer(p.since)&&p.since<=p.turns&&(b.version===1?LEGACY_LIMITS:INVERSE_BEE_LIMITS).includes(p.limit)&&p.since<p.limit&&integer(p.cycles);}))return false;
 const e=room.inverseBeeEvent;if(e==null)return true;
 return typeof e.id==='string'&&e.id.length>0&&e.id.length<=100&&['X','O'].includes(e.symbol)&&room.players?.some(p=>p.symbol===e.symbol&&p.id===e.player)&&integer(e.turn)&&integer(e.cycle)&&e.cycle>0&&integer(e.count)&&e.count<=33333&&integer(e.moved)&&e.moved<=e.count&&e.turn<=b.players[e.symbol].turns&&e.cycle<=b.players[e.symbol].cycles;
}
export function initializeInverseBees(room,random=Math.random){
 if(!enabled(room)||!['playing','paused'].includes(room.status))return;
 if(!validInverseBees(room))throw Error('El estado de las abejas no es compatible. Se conserva el guardado.');
 if(!room.inverseBees)room.inverseBees={version:2,players:Object.fromEntries(['X','O'].map(s=>[s,{turns:0,since:0,limit:interval(random),cycles:0}]))};
 else room.inverseBees.version=2; // Preserve the current cycle; draw 3–33 only at its next reset.
}
// Both players see the saved deadline from the beginning of every cycle.
export function inverseBeeRemaining(room,playerId){
 const symbol=room?.players?.find(p=>p.id===playerId)?.symbol,p=enabled(room)&&room.inverseBees?.players?.[symbol];
 return p?Math.max(0,p.limit-p.since):null;
}
export function inverseBeeWarning(room,playerId){
 const remaining=inverseBeeRemaining(room,playerId);
 return remaining!==null&&remaining<=INVERSE_BEE_WARNING?remaining:null;
}
function relocate(room,symbol,random){
 const pieces=room.cells.filter(c=>c.symbol===symbol);if(!pieces.length)return {count:0,moved:0};
 const fixed=new Set(room.cells.filter(c=>c.symbol!==symbol).map(key));
 const pool=room.terrain.filter(c=>!fixed.has(key(c)));
 // Fisher-Yates plus fixed-point repair: every piece changes cell when possible.
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(draw(random)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const destinations=pool.slice(0,pieces.length);
 if(pieces.length===1&&key(destinations[0])===key(pieces[0])&&pool.length>1)destinations[0]=pool[1];
 else if(pieces.length>1)for(let i=0;i<pieces.length;i++)if(key(destinations[i])===key(pieces[i])){const j=(i+1)%pieces.length;[destinations[i],destinations[j]]=[destinations[j],destinations[i]];}
 let moved=0;for(let i=0;i<pieces.length;i++){if(key(pieces[i])!==key(destinations[i]))moved++;pieces[i].x=destinations[i].x;pieces[i].y=destinations[i].y;}
 const byId=new Map(pieces.map(c=>[c.id,c]));
 for(const player of room.players){if(byId.has(player.lastMove?.id))player.lastMove={...byId.get(player.lastMove.id)};if(byId.has(player.navigationLastMove?.id)){const c=byId.get(player.navigationLastMove.id);player.navigationLastMove={x:c.x,y:c.y,id:c.id};}}
 return {count:pieces.length,moved};
}
export function completeInverseBeeTurn(room,playerId,points=0,random=Math.random){
 if(!enabled(room)||!room.inverseBees)return;
 room.inverseBees.version=2;
 const player=room.players.find(p=>p.id===playerId),p=room.inverseBees.players[player.symbol];
 p.turns++;
 if(points>0){p.since=0;p.limit=interval(random);return;}
 p.since++;
 if(p.since<p.limit)return;
 const movement=relocate(room,player.symbol,random);p.cycles++;p.since=0;p.limit=interval(random);
 room.inverseBeeEvent={id:crypto.randomUUID(),player:playerId,symbol:player.symbol,turn:p.turns,cycle:p.cycles,...movement};
 delete room.practiceHint;
}
