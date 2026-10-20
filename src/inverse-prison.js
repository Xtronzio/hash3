// Small, dependency-free rules shared by the referee, tools and drawings.
import {validInverseBees} from './inverse-bees.js';
export const INVERSE_PRISON_TURNS=3;
const enabled=r=>r?.variant==='inverse'&&r.inverseVersion===3;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const interval=random=>3+Math.floor(Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0))*31);
export function prisonState(room,player){
 const symbol=['X','O'].includes(player)?player:room?.players?.find(p=>p.id===player)?.symbol;
 return enabled(room)?room.inversePrison?.players?.[symbol]:null;
}
export const isPrisoner=(room,player)=>(prisonState(room,player)?.remaining||0)>0;
export const imprisonedCell=(room,cell)=>!!cell&&isPrisoner(room,cell.symbol);
const lockCache=new WeakMap();
export function prisonKeys(room){
 const stamp=`${room.version}:${prisonState(room,'X')?.remaining||0}:${prisonState(room,'O')?.remaining||0}`,old=lockCache.get(room);
 if(old?.stamp===stamp&&old.cells===room.cells)return old.keys;
 const keys=new Set((room.cells||[]).filter(c=>imprisonedCell(room,c)).map(c=>`${c.x},${c.y}`));
 lockCache.set(room,{stamp,cells:room.cells,keys});return keys;
}
export function prisonRemaining(room,player){const p=prisonState(room,player);return p?Math.max(0,p.limit-p.since):null;}
export function validInversePrison(room){
 const state=room?.inversePrison;if(state==null)return room?.inversePrisonEvent==null;
 if(!enabled(room)||state.version!==1||!state.players)return false;
 if(!['X','O'].every(s=>{const p=state.players[s];return p&&integer(p.turns)&&integer(p.since)&&p.since<=p.limit&&p.since<=p.turns&&Number.isInteger(p.limit)&&p.limit>=3&&p.limit<=33&&typeof p.opportunity==='boolean'&&(p.offered==null||typeof p.offered==='boolean')&&integer(p.remaining)&&p.remaining<=3&&integer(p.sentences);}))return false;
 if(['X','O'].every(s=>state.players[s].remaining>0))return false;
 const e=room.inversePrisonEvent;
 return !e||typeof e.id==='string'&&e.id.length>0&&e.id.length<=100&&['X','O'].includes(e.symbol)&&integer(e.turn)&&e.turn<=state.players[e.symbol].turns;
}
export function initializeInversePrison(room,random=Math.random){
 if(!enabled(room)||!['playing','paused'].includes(room.status))return;
 if(!validInversePrison(room))throw Error('El estado de la cárcel no es compatible. Se conserva el guardado.');
 if(room.inverseBees&&!validInverseBees(room))throw Error('La cuenta antigua no es compatible. Se conserva el guardado.');
 if(!room.inversePrison)room.inversePrison={version:1,players:Object.fromEntries(['X','O'].map(s=>{
  const old=room.inverseBees?.players?.[s];
  return [s,{turns:old?.turns||0,since:old?.since||0,limit:old?.limit||interval(random),opportunity:false,remaining:0,sentences:0}];
 }))};
 delete room.inverseBees;delete room.inverseBeeEvent;
}
function reset(p,random){p.since=0;p.limit=interval(random);p.opportunity=false;delete p.offered;}
export function compensatePrisons(room,random=Math.random){
 const x=prisonState(room,'X'),o=prisonState(room,'O');
 if(!x?.remaining||!o?.remaining)return 0;
 const common=Math.min(x.remaining,o.remaining);x.remaining-=common;o.remaining-=common;
 for(const q of [x,o])if(!q.remaining)reset(q,random);
 return common;
}
export function completePrisonTurn(room,playerId,points=0,random=Math.random){
 const actor=room.players.find(p=>p.id===playerId),p=prisonState(room,playerId);if(!p)return;
 // Only real completed turns age a sentence. Skips generate no turn/ecology/stock.
 for(const other of room.players)if(other.id!==playerId){const q=prisonState(room,other.id);if(q.remaining>0&&--q.remaining===0)reset(q,random);}
 p.turns++;
 if(points>0)reset(p,random);
 else{p.opportunity||=p.offered===true;delete p.offered;p.since=Math.min(p.limit,p.since+1);
 // An overdue clock waits if no scoring opportunity was declined.
 if(p.since===p.limit&&p.opportunity){
  p.remaining=INVERSE_PRISON_TURNS;p.sentences++;
  room.inversePrisonEvent={id:crypto.randomUUID(),symbol:actor.symbol,turn:p.turns};delete room.practiceHint;
 }
 }
 const common=compensatePrisons(room,random);if(common)room.inversePrisonEvent.compensated=common;
 const pair=room.pairs[0];if(isPrisoner(room,pair.turn))pair.turn=actor.symbol;
}
export const prisonBars='<svg class="inverse-prison-bars" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 3v26M11 3v26M21 3v26M28 3v26M4 5h24M4 27h24" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
