import {invaderIcon} from './invader-mark.js';
import {turnEcology,eventTurns} from './turn-ecology.js';
import {protectedTerritoryKeys,isImmune} from './immunity.js';
import {terrainOf,key} from './game.js';
import {territoryEnabled,faunaSuspended} from './ecology.js';
import {habitatInterval,HABITAT_FREQUENCIES} from './habitat-budget.js';
import {frontierHit} from './frontiers.js';
import {eventRule,eventLabel,pickEventKind,confirmEventKind,EVENT_BALANCE,territoryAttemptInterval,impactCount} from './territory-event-rules.js';
import {plannedEventRegion,applyPlannedEvent} from './territory-event-actions.js';
import {localLiving,livingFactor,livingMinimum,livingAttempt,livingEventClock,livingFirstClock} from './living-balance.js';
import {initializeInvasions} from './invasion-paths.js';
import {scoreLandings,pruneBrokenForms} from './landing-score.js';
import {isTurnWorm} from './worm-turns.js';

export const TERRITORY_MIN_SIZE=333,TERRITORY_WARNING_MS=EVENT_BALANCE.warningMs,TERRITORY_PLACEMENTS=EVENT_BALANCE.placementsPerAttempt;
export const TERRITORY_MIN_FIGURES=99;
export const territoryFigures=room=>room.players.reduce((n,p)=>n+(p.figures||0),0);
export const territoryReady=room=>territoryFigures(room)>=livingMinimum(room);
export const territoryPlacements=room=>room.players.reduce((n,p)=>n+(p.placements??room.cells.filter(c=>c.owner===p.id).length),0);
export const territoryIcons={
 rain:'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/>',
 meteorites:'<path d="M4 6 12 14m-6-9 9 9M19 4l9 9M14 23l7-7 8 7-4 7H15l-5-4Z"/><path d="m8 18 4 4m-8 0 3 3"/>',
 cataclysm:'<path d="m18 2-8 12 9 2-7 14M2 21l6-3m16 5 6-2M3 8l5 2m16-1 5-3"/>',
 earthquake:'<path d="M2 24h8l3-7 5 7 5-10 7 10M10 4l4 8-6 6m13-14-3 9 5 4"/>',
 pandemic:'<path d="M10 7c-4 2-6 7-4 12s7 8 12 6 9-7 7-12-10-9-15-6ZM16 6V2m-3 0h6M8 9 5 6m-2 2 4-4M6 16H2m0-3v6m7 4-3 4m-2-2 4 4m9-4v5m-3 0h6m4-9 4 3m-2 2 4-4m-5-12 4-3m-2-2 4 4"/><circle cx="12" cy="14" r="1.5"/><circle cx="19" cy="18" r="2"/><circle cx="18" cy="11" r="1"/>',
 ufo:'<ellipse cx="16" cy="15" rx="13" ry="4"/><path d="M9 12a7 7 0 0 1 14 0M10 22l-4 7m10-7v8m6-8 4 7"/>',
 'tornado-rain':'<path d="M2 5h12M4 10h9M6 15h6M8 20h4l-3 5M18 8h12m-10 5h8m-6 5h5m-4 5h4l-3 5"/><path d="m2 25 1 3m14-25 1 3"/>',
 hurricane:'<path d="M25 3C10 0 1 13 8 24c5 8 18 5 20-4M7 29C22 32 31 19 24 8c-5-8-18-5-20 4"/><circle cx="16" cy="16" r="4"/>',
 blackhole:'<circle cx="16" cy="16" r="6" fill="#08090b"/><ellipse cx="16" cy="16" rx="14" ry="5" transform="rotate(-25 16 16)"/><path d="M6 10C8 0 26 1 28 12M4 20c2 11 20 12 23 2"/>',
 'invader-rain':'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/><path d="m9 19 12 0m-6-6v12"/>',
 'invader-colony':'<rect x="3" y="3" width="26" height="26" rx="2"/><path d="M12 3v26M20 3v26M3 12h26M3 20h26m3-14 3 3m0-3-3 3m12 13 4 4m0-4-4 4"/>'
};
territoryIcons['invader-colony']=`<g transform="scale(.5)">${invaderIcon}</g>`;
territoryIcons.contagion='<circle cx="9" cy="12" r="5"/><path d="M9 4v3m0 10v3M1 12h3m10 0h3M3 6l3 3m6 6 3 3M3 18l3-3m6-6 3-3M20 12h9m-4-4 4 4-4 4"/><circle cx="24" cy="24" r="3"/>';territoryIcons.tornado='<path d="M3 5h26M6 10h20M9 15h14M12 20h9M15 25h7l-4 4"/>';
export function initializeTerritory(room){
 room.territoryEvents||=[];
 initializeInvasions(room);
 if(localLiving(room)&&room.livingTerritoryVersion!==1){
  const now=room.clockNow??Date.now();
  room.territoryNextPlacement=territoryPlacements(room)+livingAttempt(room,'natural');
  room.territoryNextInvasion=territoryPlacements(room)+livingAttempt(room,'invaders');
  if(!turnEcology(room)){room.territoryNextNaturalAt=now+livingFirstClock(room,'natural');room.territoryNextInvaderAt=now+livingFirstClock(room,'invaders');}
  room.livingTerritoryVersion=1;room.territoryActivityVersion=4;
  if(room.status==='paused'&&!turnEcology(room)){room.territoryNextNaturalAtRemaining=livingFirstClock(room,'natural');room.territoryNextInvaderAtRemaining=livingFirstClock(room,'invaders');}
 }
 // Adopt current terrain without firing historical growth again.
 room.territoryMilestone??=Math.floor(terrainOf(room).length/333);
 if(room.territoryActivityVersion!==4){
  room.territoryNextPlacement=territoryPlacements(room)+territoryAttemptInterval(terrainOf(room).length);
  room.territoryNextInvasion=territoryPlacements(room)+territoryAttemptInterval(terrainOf(room).length,'invaders');
  room.territoryActivityVersion=4;
 }
}
// Connected patch chosen from a boundary, with every pair's anchor preserved.
// O(N) command work; never called from pan/pinch or board-window queries.
export function territoryRegion(room,kind,random=Math.random,count=Math.floor(terrainOf(room).length*EVENT_BALANCE.incidenceNumerator/EVENT_BALANCE.incidenceDenominator)){
 const terrain=terrainOf(room),known=new Map(terrain.map(c=>[key(c.x,c.y),c]));
 const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y)));
 const eligible=terrain.filter(c=>kind==='ufo'||!anchors.has(key(c.x,c.y)));
 const neighbors=c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy}));
 if(localLiving(room)&&kind==='cataclysm'&&count>=6){
  const allowed=new Set(eligible.map(c=>key(c.x,c.y))),dimensions=[];
  for(let w=2;w<=Math.sqrt(count);w++)if(count%w===0)dimensions.push([w,count/w],[count/w,w]);
  dimensions.sort((a,b)=>Math.abs(a[0]-a[1])-Math.abs(b[0]-b[1]));
  const offset=Math.min(eligible.length-1,Math.floor(Math.max(0,random())*eligible.length));
  for(const [width,height] of dimensions)for(let i=0;i<eligible.length;i++){
   const seed=eligible[(i+offset)%eligible.length],region=[];let valid=true;
   for(let dy=0;dy<height&&valid;dy++)for(let dx=0;dx<width;dx++){const c={x:seed.x+dx,y:seed.y+dy};if(!allowed.has(key(c.x,c.y))){valid=false;break;}region.push(c);}
   if(valid)return region;
  }
 }
 if(kind==='rain'){
  const pool=[...eligible],region=[];
  while(region.length<count&&pool.length){const i=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));region.push(pool[i]);pool[i]=pool.at(-1);pool.pop();}
  return region.length===count?region:[];
 }
 const boundary=eligible.filter(c=>neighbors(c).some(p=>!known.has(key(p.x,p.y))));
 const choices=boundary.length?boundary:eligible;if(!choices.length)return [];
 for(let attempt=0;attempt<3;attempt++){
  const seed=choices[(Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length))+attempt*Math.floor(choices.length/3))%choices.length];
  const queue=[seed],seen=new Set([key(seed.x,seed.y)]),region=[];
  const food=new Set(room.cells.map(c=>key(c.x,c.y)));
  for(let i=0;i<queue.length&&region.length<count;i++){
   const c=queue[i];if(kind!=='ufo'||food.has(key(c.x,c.y)))region.push({x:c.x,y:c.y});
   for(const p of neighbors(c)){const k=key(p.x,p.y);if(!seen.has(k)&&known.has(k)&&(kind!=='cataclysm'||!anchors.has(k))){seen.add(k);queue.push(known.get(k));}}
  }
  if(kind==='ufo')return region;
  // Prune tips, then grow only cells with two side-neighbors. Every selected
  // cell keeps two faces in common with two other selected cells.
  const selected=new Map(region.map(c=>[key(c.x,c.y),c]));
  const tips=region.filter(c=>neighbors(c).filter(p=>selected.has(key(p.x,p.y))).length<2);
  for(let i=0;i<tips.length;i++){
   const c=tips[i],k=key(c.x,c.y);if(!selected.has(k))continue;selected.delete(k);
   for(const p of neighbors(c))if(selected.has(key(p.x,p.y))&&neighbors(p).filter(q=>selected.has(key(q.x,q.y))).length<2)tips.push(p);
  }
  const candidates=new Map();
  const offer=c=>{for(const p of neighbors(c)){const k=key(p.x,p.y);if(known.has(k)&&!anchors.has(k)&&!selected.has(k)&&neighbors(p).filter(q=>selected.has(key(q.x,q.y))).length>=2)candidates.set(k,p);}};
  for(const c of selected.values())offer(c);
  while(selected.size<count&&candidates.size){const [k,c]=candidates.entries().next().value;candidates.delete(k);if(selected.has(k))continue;selected.set(k,c);offer(c);}
  if(selected.size===count)return [...selected.values()];
 }
 return []; // A narrow/fragmented map has no legal compact demolition region.
}
function announceTerritory(room,now,random,trigger,family){
 const size=terrainOf(room).length,milestone=Math.floor(size/333);
 room.territoryMilestone=Math.max(room.territoryMilestone,milestone);
 room[family==='invaders'?'territoryNextInvasion':'territoryNextPlacement']=territoryPlacements(room)+(livingAttempt(room,family)??territoryAttemptInterval(size,family));
 if(localLiving(room)&&!turnEcology(room))room[family==='invaders'?'territoryNextInvaderAt':'territoryNextNaturalAt']=now+livingEventClock(room,family);
 const choice=pickEventKind(room,family,random);
 for(const kind of choice.order){
  const planned=kind==='ufo'?territoryRegion(room,'ufo',random,impactCount(room,kind)):
   kind==='earthquake'?territoryRegion(room,'cataclysm',random,impactCount(room,kind)):
   plannedEventRegion(room,kind,random,now);
  const region=Array.isArray(planned)?planned:planned.region;
  if(!region?.length)continue;
  // All event parameters live in territory-event-rules.js. No work here
  // depends on rendering, navigation or the size of the visible window.
  if(family!=='invaders'&&!turnEcology(room))for(const e of [...(room.worms||[]).filter(w=>!isTurnWorm(w)),...(room.works||[]),...(room.bombs||[])])
   if(e.remainingMs==null)e.remainingMs=Math.max(0,(e.nextAt||now+33000)-now);
  confirmEventKind(room,choice,kind);
  room.territoryEvents.push({id:crypto.randomUUID(),kind,milestone,trigger,region,
   ...(planned.groups?{groups:planned.groups}:{}),...(planned.paths?{paths:planned.paths}:{}),...(planned.approaches?{approaches:planned.approaches}:{}),...(planned.seeded?{seeded:true}:{}),x:region[0].x,y:region[0].y,
   ...(turnEcology(room)?{turnsRemaining:3,announcedTurn:room.ecologyTurns||0}:{nextAt:now+EVENT_BALANCE.warningMs})});return true;
 }
 // An impossible attack is skipped, never queued up for a later burst.
 confirmEventKind(room,choice);
 return false;
}
export function recordTerritoryGrowth(room,added,now=Date.now(),random=Math.random){
 initializeTerritory(room);
 // Growth updates geometry, never bypasses the frequency limit.
 room.territoryMilestone=Math.max(room.territoryMilestone,Math.floor(terrainOf(room).length/333));
 return added>0?recordTerritoryPlacement(room,now,random):false;
}
export function territoryPlacementDue(room,now=Date.now(),increment=0,{naturalOnly=false}={}){
 return territoryEnabled(room)&&territoryReady(room)&&!room.territoryEvents?.length&&!faunaSuspended(room,now)&&
  (turnEcology(room)||!localLiving(room)||!room.endsAt||Date.parse(room.endsAt)-now>=EVENT_BALANCE.warningMs)&&
  (territoryPlacements(room)+increment>=room.territoryNextPlacement||localLiving(room)&&!turnEcology(room)&&now>=room.territoryNextNaturalAt||!naturalOnly&&(territoryPlacements(room)+increment>=room.territoryNextInvasion||localLiving(room)&&!turnEcology(room)&&now>=room.territoryNextInvaderAt));
}
export function recordTerritoryPlacement(room,now=Date.now(),random=Math.random){
 initializeTerritory(room);if(!territoryPlacementDue(room,now))return false;
 const family=territoryPlacements(room)>=room.territoryNextPlacement||localLiving(room)&&!turnEcology(room)&&now>=room.territoryNextNaturalAt?'natural':'invaders';
 return announceTerritory(room,now,random,'placements',family);
}
export function advanceTerritory(room,now=Date.now()){
 initializeTerritory(room);if(room.status!=='playing'||!territoryEnabled(room))return [];
 const actions=[];
 for(const event of [...room.territoryEvents]){
  if(turnEcology(room)?event.turnsRemaining>0:event.remainingMs!=null||event.nextAt>now)continue;
  const before=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
  const {hit,actions:changes,demolish}=applyPlannedEvent(room,event,now);
  const removed=new Set([...hit].map(k=>before.get(k)?.id).filter(Boolean));
  const survivors=new Map(room.cells.map(c=>[c.id,c]));
  const mixes=['shuffle','blackhole'].includes(eventRule(event.kind)?.effect);
  if(mixes)pruneBrokenForms(room);
  else room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').some(k=>hit.has(k)));
  for(const p of room.players)if(p.lastMove){const moved=survivors.get(p.lastMove.id);if(moved&&moved.owner===p.id)p.lastMove={...moved};else delete p.lastMove;}
  room.eatenCells=(room.eatenCells||[]).filter(c=>!hit.has(key(c.x,c.y)));
  if(['vacate','blackhole'].includes(eventRule(event.kind)?.effect)){
   const cleared=event.kind==='blackhole'?event.region:changes;
   const remaining=new Set(room.cells.map(c=>key(c.x,c.y)));
   room.eatenCells.push(...cleared.filter(c=>!remaining.has(key(c.x,c.y))).map(c=>({x:c.x,y:c.y})));
  }
  if(demolish){
   room.terrain=terrainOf(room).filter(c=>!hit.has(key(c.x,c.y)));
   room.frontiers=(room.frontiers||[]).filter(f=>isImmune(room,f.by,now)||!frontierHit(f,hit));
   room.worms=(room.worms||[]).filter(w=>!(w.body||[]).some(c=>hit.has(key(c.x,c.y))));
   room.works=(room.works||[]).filter(w=>![...w.destroy.slice(w.done),...w.build.slice(w.done)].some(c=>hit.has(key(c.x,c.y))));
   room.bombs=(room.bombs||[]).filter(b=>!(b.blast||[]).some(c=>hit.has(key(c.x,c.y))));
   room.rodentRaids=(room.rodentRaids||[]).filter(r=>!hit.has(key(r.x,r.y)));
  }
  if(room.inventoryEffects){
   room.inventoryEffects.shields=(room.inventoryEffects.shields||[]).filter(s=>!removed.has(s.cell));
   room.inventoryEffects.blocks=(room.inventoryEffects.blocks||[]).filter(c=>!hit.has(key(c.x,c.y)));
  }
  actions.push(...changes);
  if(mixes&&localLiving(room))scoreLandings(room,[...before.values()],changes,{kind:event.kind});
  room.territoryEvents=room.territoryEvents.filter(e=>e.id!==event.id);
  if(eventRule(event.kind)?.family!=='invaders')rebalanceAfterTerritory(room,now);
 }
 return actions;
}
export function territoryNotice(room,now=Date.now()){
 return (room.territoryEvents||[]).map(e=>eventLabel(e.kind)+': '+e.region.length+
  ' celdas afectadas · en '+(turnEcology(room)?eventTurns(e)+' turnos':Math.max(0,Math.ceil((e.remainingMs??e.nextAt-now)/1000))+' s')).join(' · ');
}

export function rebalanceAfterTerritory(room,now=Date.now()){
 const terrain=terrainOf(room),size=terrain.length,known=new Set(terrain.map(c=>key(c.x,c.y))),unit=localLiving(room)?livingFactor(size):Math.ceil(size/333);
 const before={rodents:(room.rodentRaids||[]).reduce((n,r)=>n+r.count,0),worms:(room.worms||[]).length,workers:(room.works||[]).length};
 room.worms=(room.worms||[]).filter(w=>(w.body||[]).every(c=>known.has(key(c.x,c.y)))).slice(0,unit);
 room.works=(room.works||[]).filter(w=>w.reconquer?(!w.destroy.slice(w.done).length||w.destroy.slice(w.done).some(c=>known.has(key(c.x,c.y)))||w.build.slice(w.done).some(c=>!known.has(key(c.x,c.y)))):(w.role==='build'?w.build:w.destroy).slice(w.done).every(c=>known.has(key(c.x,c.y)))).slice(0,unit*3);
 let rats=localLiving(room)?unit*3:Math.ceil(size*3/333);
 room.rodentRaids=(room.rodentRaids||[]).filter(r=>known.has(key(r.x,r.y))).flatMap(r=>{const count=Math.min(r.count,rats);rats-=count;return count?[{...r,count}]:[];});
 if(!localLiving(room))for(const zone of room.habitatZones||[]){zone.credit={};for(const [kind,n]of Object.entries(HABITAT_FREQUENCIES))zone.next[kind]=zone.placements+habitatInterval(n,size);}
 room.ecologyRecovery=turnEcology(room)?{moves:3}:{until:now+EVENT_BALANCE.recoveryMs,moves:EVENT_BALANCE.recoveryMoves};
 room.ecologyRecalibration={at:now,size,pieces:room.cells.length,before,after:{rodents:room.rodentRaids.reduce((n,r)=>n+r.count,0),worms:room.worms.length,workers:room.works.length}};
 if(!turnEcology(room))for(const e of [...room.worms.filter(w=>!isTurnWorm(w)),...room.works,...(room.bombs||[])])e.remainingMs=EVENT_BALANCE.recoveryMs;
}
