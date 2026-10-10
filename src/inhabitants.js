import {turnEcology,initializeTurnEcology,ecologyTurnIds,eventTurns} from './turn-ecology.js';
import {boardCellLimit} from './board-limits.js';
import {rodentIcon} from './rodent-icon.js';
import {ecologySeconds} from './ecology-clock.js';
import {protectedTerritoryKeys,isImmune} from './immunity.js';
import {faunaEnabled,territoryEnabled,faunaSuspended} from './ecology.js';
import {terrainOf,connectedTerrain,key} from './game.js';
import {frontierReachable,frontierSegments,nearbyFrontierCells,frontierHit,edgeKey} from './frontiers.js';
import {habitatBlocked,habitatReservations} from './habitat-tools.js';
import {placeNeutral,neutralFrequency} from './neutral.js';
import {habitatZone,habitatInterval,proportionalBudget,HABITAT_REFERENCE,HABITAT_WEIGHTS,HABITAT_FREQUENCIES} from './habitat-budget.js';
import {initializeTerritory,advanceTerritory,recordTerritoryPlacement} from './territory-tools.js';
import {localLiving,LIVING_FREQUENCIES,livingFactor,livingInterval,livingClock,livingBirthBudget,freezeLiving,resumeLiving} from './living-balance.js';
import {initializeTurnWorms,isTurnWorm,WORM_TAIL_LIMIT} from './worm-turns.js';
import {advanceInvasions,removeDefeatedInvasions} from './invasion-paths.js';
export const HABITAT_INTERVAL=33000;
export {HABITAT_FREQUENCIES} from './habitat-budget.js';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const fourNeighbors=p=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:p.x+dx,y:p.y+dy}));
const choose=(all,random)=>all.length?all[Math.min(all.length-1,Math.floor(Math.max(0,random())*all.length))]:null;
const uuid=()=>crypto.randomUUID();
export function initializeHabitats(room,now=Date.now()){
 initializeTerritory(room);room.habitatZones||=[];
 room.rodents||=[];room.worms||=[];room.works||=[];room.bombs||=[];room.eatenCells||=[];room.rodentRaids||=[];
 initializeTurnWorms(room);
 if(localLiving(room)&&room.status!=='finished'&&room.inhabitantReclaimVersion!==1){
  for(const w of room.works)w.reconquer=true;
  room.inhabitantReclaimVersion=1;
 }
 if(!faunaEnabled(room)){room.rodents=[];room.rodentRaids=[];room.worms=[];room.works=[];}
 if(!territoryEnabled(room)){room.territoryEvents=[];room.bombs=[];}
 if(localLiving(room)&&room.livingHabitatVersion!==1){
  for(const z of room.habitatZones){
   const size=frontierReachable(terrainOf(room),z,room).length;
   z.next=Object.fromEntries(Object.entries(LIVING_FREQUENCIES).map(([kind,n])=>[kind,z.placements+livingInterval(n,size)]));
   z.clockNext=Object.fromEntries(['rodent','worm','work'].map(kind=>[kind,now+livingClock(kind,size)]));z.credit={};
   if(room.status==='paused')z.clockRemaining=Object.fromEntries(['rodent','worm','work'].map(kind=>[kind,livingClock(kind,size)]));
  }
  room.livingHabitatVersion=1;room.habitatFrequencyVersion=3;
 }
 if(room.habitatFrequencyVersion!==3){
  // Rescale remaining attempts once, without adding animals or replaying births.
  const previous=room.habitatFrequencyVersion===2?{rodent:33,bomb:66,worm:66,work:99}:{rodent:33,bomb:66,worm:99,work:198};
  for(const zone of room.habitatZones){
   const size=frontierReachable(terrainOf(room),zone,room).length;
   for(const [kind,frequency]of Object.entries(previous))if(Number.isFinite(zone.next?.[kind])){
    const oldInterval=Math.ceil(frequency*Math.max(1,size/333)),interval=habitatInterval(HABITAT_FREQUENCIES[kind],size);
    zone.next[kind]=zone.placements+Math.max(1,Math.ceil((zone.next[kind]-zone.placements)*interval/oldInterval));
   }
  }
  room.habitatFrequencyVersion=3;
 }
 if(room.rodentLifecycleVersion!==1){
  for(const raid of room.rodentRaids){raid.turn=0;raid.mealsLeft=raid.remaining??3;raid.phase='arriving';raid.members=[];}
  room.rodentLifecycleVersion=1;
 }
 initializeTurnEcology(room);
 if(room.habitatVersion===3)return;
 if(room.habitatVersion===2){let remaining=Math.ceil(terrainOf(room).length*3/333);room.rodentRaids=room.rodentRaids.flatMap(r=>{const count=Math.min(r.count,remaining);remaining-=count;return count?[{...r,count}]:[];});room.habitatVersion=3;return;}
 if(room.habitatVersion===1){
  room.rodentRaids.push(...room.rodents.map(r=>({id:r.id,player:r.player,x:r.x,y:r.y,count:1,remaining:Math.max(0,3-(r.eaten||0)),visited:[]})).filter(r=>r.remaining>0));
  room.rodents=[];room.worms=room.worms.filter(w=>(w.eaten||0)<3);room.habitatVersion=3;return;
 }
 for(const p of room.players){
  p.placements??=room.cells.filter(c=>c.owner===p.id).length;
  p.habitatNext=Object.fromEntries(Object.entries(HABITAT_FREQUENCIES).map(([kind,n])=>[kind,(Math.floor(p.placements/n)+1)*n]));
  p.rodentNextSpawn=p.habitatNext.rodent;
 }
 // Adopt remaining visits without replaying historic milestones.
 room.rodentRaids.push(...room.rodents.map(r=>({id:r.id,player:r.player,x:r.x,y:r.y,count:1,remaining:3-Math.min(2,r.eaten||0),visited:[]})));
 room.rodents=[];room.habitatVersion=3;room.habitatLastCheck=now;
}
function areaAt(room,point){return frontierReachable(terrainOf(room),point,room);}
function occupiedByOther(room,point,id){return room.rodentRaids.some(r=>r.id!==id&&r.phase!=='hidden'&&(r.members||[]).some(c=>same(c,point)))||room.rodents.some(r=>r.id!==id&&same(r,point))||room.worms.some(w=>w.id!==id&&(w.body||[]).some(c=>same(c,point)))||habitatReservations(room).some(c=>same(c,point));}
function foodFor(room,r,random,{adjacent=false,exclude=null}={}){
 const area=new Set(areaAt(room,r).map(c=>key(c.x,c.y)));
 const candidates=room.cells.filter(c=>c.id!==exclude&&area.has(key(c.x,c.y))&&!isImmune(room,c.owner)&&!occupiedByOther(room,c,r.id)&&(!adjacent||(Math.max(Math.abs(c.x-r.x),Math.abs(c.y-r.y))===1&&diagonalAllowed(room,r,c))));
 return choose(candidates,random);
}
function diagonalAllowed(room,a,b){
 const blocked=new Set(frontierSegments(room).map(edgeKey));
 if(a.x===b.x||a.y===b.y)return !blocked.has(edgeKey({a,b}));
 const mid1={x:a.x,y:b.y},mid2={x:b.x,y:a.y};
 return ![edgeKey({a,b:mid1}),edgeKey({a:mid1,b}),edgeKey({a,b:mid2}),edgeKey({a:mid2,b})].some(e=>blocked.has(e));
}
export function clearHabitatCells(room,points){
 const protectedKeys=protectedTerritoryKeys(room);points=points.filter(c=>!protectedKeys.has(key(c.x,c.y)));
 const hit=new Set(points.map(c=>key(c.x,c.y))),removed=room.cells.filter(c=>hit.has(key(c.x,c.y)));
 room.cells=room.cells.filter(c=>!hit.has(key(c.x,c.y)));removeDefeatedInvasions(room);
 const ids=new Set(removed.map(c=>c.id));
 room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').some(k=>hit.has(k)));
 room.eatenCells=(room.eatenCells||[]).filter(c=>!hit.has(key(c.x,c.y)));room.eatenCells.push(...points.map(c=>({x:c.x,y:c.y})));
 for(const p of room.players)if(ids.has(p.lastMove?.id))delete p.lastMove;
 if(room.inventoryEffects){room.inventoryEffects.shields=(room.inventoryEffects.shields||[]).filter(e=>!ids.has(e.cell));room.inventoryEffects.blocks=(room.inventoryEffects.blocks||[]).filter(e=>!hit.has(key(e.x,e.y)));}
 return removed.length;
}
export const clearHabitatCell=(room,point)=>clearHabitatCells(room,[point]);
const patterns=[[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,1],[2,2]],[[0,0],[1,-1],[2,-2]],[[0,0],[1,0],[0,1]],[[0,0],[-1,0],[0,1]],[[0,0],[1,0],[0,-1]],[[0,0],[-1,0],[0,-1]]];
function automaticBlast(room,point,random){
 const terrain=connectedTerrain(terrainOf(room),point),area=[...terrain,...nearbyFrontierCells(room,terrain)],known=new Set(area.map(c=>key(c.x,c.y))),options=[];
 for(const c of area)for(const shape of patterns){const blast=shape.map(([dx,dy])=>({x:c.x+dx,y:c.y+dy}));if(blast.every(c=>known.has(key(c.x,c.y))))options.push(blast);}
 return choose(options,random);
}
function reclaimProject(room,area,player,random,now){
 const terrain=terrainOf(room),known=new Set(terrain.map(c=>key(c.x,c.y))),reserved=new Set(habitatReservations(room).map(c=>key(c.x,c.y))),protectedKeys=protectedTerritoryKeys(room,now);
 const shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell)),edges=new Set(frontierSegments(room).map(edgeKey));
 const pool=room.cells.filter(c=>c.symbol==='*'&&known.has(key(c.x,c.y))&&!reserved.has(key(c.x,c.y))&&!protectedKeys.has(key(c.x,c.y))&&!shields.has(c.id)&&!habitatBlocked(room,c.x,c.y));
 const destroy=[];
 while(pool.length&&destroy.length<9){const c=pool.splice(Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length)),1)[0];destroy.push({x:c.x,y:c.y});}
 const build=[],boundary=new Map();
 const offer=c=>{for(const p of fourNeighbors(c)){const k=key(p.x,p.y);if(!known.has(k)&&!reserved.has(k)&&!habitatBlocked(room,p.x,p.y)&&!edges.has(edgeKey({a:c,b:p})))boundary.set(k,p);}};
 for(const c of area)offer(c);
 const capacity=Math.max(0,Math.min(9,boardCellLimit(room)-terrain.length));
 while(boundary.size&&build.length<capacity){const c=choose([...boundary.values()],random),k=key(c.x,c.y);boundary.delete(k);known.add(k);build.push(c);}
 if(!build.length&&!destroy.length)return false;
 for(let i=0;i<3;i++){
  const b=build.slice(i*3,i*3+3),d=destroy.slice(i*3,i*3+3);
  if(b.length||d.length)room.works.push({id:uuid(),player,kind:'work',reconquer:true,build:b,destroy:d,done:0,...(turnEcology(room)?{turnsRemaining:3,announcedTurn:room.ecologyTurns||0}:{nextAt:now+HABITAT_INTERVAL})});
 }
 return true;
}
function project(room,point,player,random,now){
 const area=areaAt(room,point),known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),taken=new Set(room.cells.map(c=>key(c.x,c.y))),reserved=new Set(habitatReservations(room).map(c=>key(c.x,c.y))),barriers=new Set(frontierSegments(room).flatMap(e=>[key(e.a.x,e.a.y),key(e.b.x,e.b.y)]));
 if(localLiving(room))return reclaimProject(room,area,player,random,now);

 const empty=area.filter(c=>!taken.has(key(c.x,c.y))&&!reserved.has(key(c.x,c.y))&&!barriers.has(key(c.x,c.y))&&!occupiedByOther(room,c));
 // Prefer non-anchor cells, but allow cutting bridges. Never erase the last local anchor.
 const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y)));
 const eligible=empty.filter(c=>!anchors.has(key(c.x,c.y)));
 if(eligible.length<9)return false;
 // Una obra equivale a una promoción: varios proyectos aparecen dispersos,
 // pero cada intervención se concentra en una misma manzana de 3×3.
 const eligibleKeys=new Set(eligible.map(c=>key(c.x,c.y)));
 const plot=origin=>Array.from({length:9},(_,i)=>({x:origin.x+i%3,y:origin.y+Math.floor(i/3)}));
 const demolitionSites=eligible.map(plot).filter(block=>block.every(c=>eligibleKeys.has(key(c.x,c.y))));
 const destroy=demolitionSites.length?choose(demolitionSites,random):[];
 if(!destroy.length){
  const remaining=[...eligible];
  while(remaining.length&&!destroy.length){
   const seed=choose(remaining,random),queue=[seed],seen=new Set([key(seed.x,seed.y)]);
   for(let i=0;i<queue.length&&queue.length<9;i++)for(const c of fourNeighbors(queue[i])){
    const k=key(c.x,c.y);if(eligibleKeys.has(k)&&!seen.has(k)){seen.add(k);queue.push(c);if(queue.length===9)break;}
   }
   if(queue.length===9)destroy.push(...queue);else for(let i=remaining.length-1;i>=0;i--)if(seen.has(key(remaining[i].x,remaining[i].y)))remaining.splice(i,1);
  }
  if(!destroy.length)return false;
 }
 const territory=new Set(area.map(c=>key(c.x,c.y)));
 const blocked=new Set(frontierSegments(room).map(edgeKey));
 const boundary=new Map();
 for(const c of area)for(const p of fourNeighbors(c)){
  const k=key(p.x,p.y);
  if(!known.has(k)&&!reserved.has(k)&&!blocked.has(edgeKey({a:c,b:p})))boundary.set(k,p);
 }
 const buildSites=new Map();
 for(const edge of boundary.values())for(let xOffset=0;xOffset<3;xOffset++)for(let yOffset=0;yOffset<3;yOffset++){
  const origin={x:edge.x-xOffset,y:edge.y-yOffset},k=key(origin.x,origin.y);
  if(buildSites.has(k))continue;
  const group=plot(origin);
  if(group.some(p=>known.has(key(p.x,p.y))||reserved.has(key(p.x,p.y))))continue;
  const joins=group.some(p=>fourNeighbors(p).some(n=>territory.has(key(n.x,n.y))&&!blocked.has(edgeKey({a:p,b:n}))));
  if(joins)buildSites.set(k,group);
 }
 const build=buildSites.size?choose([...buildSites.values()],random):[];
 if(!build.length){
  let edge=area;
  while(build.length<9){
   const options=new Map();
   for(const c of edge)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:c.x+dx,y:c.y+dy},k=key(p.x,p.y);
    if(!known.has(k)&&!reserved.has(k)&&!blocked.has(edgeKey({a:c,b:p})))options.set(k,p);
   }
   const chosen=choose([...options.values()],random);if(!chosen)return false;
   build.push(chosen);known.add(key(chosen.x,chosen.y));edge=[...edge,chosen];
  }
 }
 for(let i=0;i<3;i++)room.works.push({id:uuid(),player,kind:'work',destroy:destroy.slice(i*3,i*3+3),build:build.slice(i*3,i*3+3),done:0,...(turnEcology(room)?{turnsRemaining:3,announcedTurn:room.ecologyTurns||0}:{nextAt:now+HABITAT_INTERVAL})});
 return true;
}
export function countHabitatPlacement(room,playerId,point,now=Date.now(),random=Math.random,{completed=true}={}){
 initializeHabitats(room,now);const turnIds=ecologyTurnIds(room);const p=room.players.find(p=>p.id===playerId);if(!p)return;
 const frequencies=localLiving(room)?LIVING_FREQUENCIES:HABITAT_FREQUENCIES;
 const area=areaAt(room,point),zone=habitatZone(room,area,frequencies),areaSet=new Set(area.map(c=>key(c.x,c.y)));
 if(localLiving(room)&&!(turnEcology(room)?zone.livingInitialized:zone.clockNext)){zone.next=Object.fromEntries(Object.entries(frequencies).map(([kind,n])=>[kind,(Math.floor(zone.placements/livingInterval(n,area.length))+1)*livingInterval(n,area.length)]));zone.clockNext=Object.fromEntries(['rodent','worm','work'].map(kind=>[kind,now+livingClock(kind,area.length)]));}
 if(turnEcology(room)){zone.livingInitialized=true;delete zone.clockNext;delete zone.clockRemaining;}
 const previouslySuspended=faunaSuspended(room,now);if(room.ecologyRecovery?.moves>0&&(!turnEcology(room)||completed))room.ecologyRecovery.moves--;
 p.placements++;zone.placements++;recordTerritoryPlacement(room,now,random);
 const suspended=previouslySuspended||faunaSuspended(room,now);room.eatenCells=room.eatenCells.filter(c=>!same(c,point));
 if(completed){
  const actions=advanceInvasions(room,now,random,room.cells.find(c=>same(c,point))?.id);
  if(actions.length)room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};
 }
 if(faunaEnabled(room)&&!suspended&&completed)visitRodents(room,point,now,random);
 if(faunaEnabled(room)&&!suspended&&completed)visitWorms(room,point,now,random);
 for(const [kind,frequency]of Object.entries(frequencies)){
  p.habitatNext[kind]=(Math.floor(p.placements/frequency)+1)*frequency;
  if(!faunaEnabled(room)||suspended)continue;
  if(kind==='bomb')continue; // Automatic rain is now a territory card, not repeated small blasts.
  if(zone.placements<zone.next[kind]&&(turnEcology(room)||!localLiving(room)||now<zone.clockNext[kind]))continue;
  zone.next[kind]=zone.placements+(localLiving(room)?livingInterval(frequency,area.length):habitatInterval(frequency,area.length));
  if(localLiving(room)&&!turnEcology(room))zone.clockNext[kind]=now+livingClock(kind,area.length);
  let count=localLiving(room)?livingBirthBudget(zone,kind,area.length,HABITAT_WEIGHTS):proportionalBudget(zone,kind,area.length);
  // A bounded shared population: waiting for food never piles up generations.
  const cap=localLiving(room)?livingFactor(area.length)*HABITAT_WEIGHTS[kind]*(turnEcology(room)&&kind==='worm'?3:1):Math.ceil(area.length/HABITAT_REFERENCE*HABITAT_WEIGHTS[kind]);
  const residents=kind==='rodent'?room.rodentRaids.filter(r=>areaSet.has(key(r.x,r.y))).reduce((n,r)=>n+r.count,0):kind==='work'&&localLiving(room)?room.works.length/3:kind==='work'?room.works.filter(w=>{const c=w.destroy[w.done]||w.build[w.done];return c&&areaSet.has(key(c.x,c.y));}).length/3:(kind==='bomb'?room.bombs:room.worms).filter(e=>areaSet.has(key(e.x,e.y))).length;
  zone.birthScale||={};const large=turnEcology(room)&&(zone.birthScale[kind]||0)%2===1;
  if(turnEcology(room)&&['rodent','worm'].includes(kind))count=large?3*livingFactor(area.length):Math.min(count,1);
  count=Math.max(0,Math.min(count,Math.floor(cap-residents)));
  if(kind==='rodent'){if(count){const raid={id:uuid(),player:playerId,...point,count,remaining:3,mealsLeft:3,turn:0,phase:'arriving',phaseAt:now,visited:[],members:[],...(turnEcology(room)?{warningTurns:3,announcedTurn:room.ecologyTurns||0,scale:large?'large':'local'}:{})};room.rodentRaids.push(raid);positionRodents(room,raid,point,random);zone.birthScale.rodent=(zone.birthScale.rodent||0)+1;}continue;}
  let bornWorms=0;const batch=uuid();
  for(let i=0;i<count;i++){
   if(kind==='work'){if(!project(room,point,playerId,random,now))break;continue;}
   if(kind==='bomb'){const blast=automaticBlast(room,point,random);if(blast)room.bombs.push({id:uuid(),player:playerId,...blast[0],blast,nextAt:now+HABITAT_INTERVAL});continue;}
   const r={id:uuid(),player:playerId,kind,x:point.x,y:point.y,eaten:0,phase:0,nextAt:now+HABITAT_INTERVAL};
   const food=foodFor(room,r,random,{exclude:room.cells.find(c=>same(c,point))?.id});
   if(food){r.x=food.x;r.y=food.y;r.body=[{x:r.x,y:r.y}];if(localLiving(room)){r.turnDriven=true;r.mealLimit=3*Math.min(3,(room.wormAppearances||0)+1);r.turnsSinceMeal=0;delete r.nextAt;}if(turnEcology(room)){r.warningTurns=3;r.announcedTurn=room.ecologyTurns||0;r.birthBatch=batch;r.scale=large?'large':'local';r.body=[];}room.worms.push(r);bornWorms++;}
  }
  if(bornWorms&&turnEcology(room))zone.birthScale.worm=(zone.birthScale.worm||0)+1;
  else if(bornWorms&&localLiving(room))room.wormAppearances=(room.wormAppearances||0)+1;
 }
 if(territoryEnabled(room)&&!suspended&&p.placements%neutralFrequency(room)===0)placeNeutral(room,areaAt(room,point),now,random,point);
 p.rodentNextSpawn=p.habitatNext.rodent;
 if(completed&&turnEcology(room))advanceEcologyTurn(room,now,random,turnIds);
}
export function advanceEcologyTurn(room,now=Date.now(),random=Math.random,ids=ecologyTurnIds(room)){
 if(!turnEcology(room)||room.status!=='playing')return;
 room.ecologyTurns=(room.ecologyTurns||0)+1;
 const suspended=faunaSuspended(room,now);
 for(const e of room.territoryEvents||[])if(ids.has(e.id))e.turnsRemaining=Math.max(0,(e.turnsRemaining??3)-1);
 if(!suspended){
  for(const e of [...room.works||[],...room.bombs||[]])if(ids.has(e.id))e.turnsRemaining=Math.max(0,(e.turnsRemaining??3)-1);
  const batches=new Set();
  for(const e of [...room.rodentRaids||[],...room.worms||[]])if(ids.has(e.id)&&e.warningTurns!=null){
   e.warningTurns--;
   if(e.warningTurns<=0){delete e.warningTurns;e.phaseAt=now;if(e.turnDriven){e.body=[{x:e.x,y:e.y}];batches.add(e.birthBatch||e.id);}}
  }
  for(const batch of batches){
   room.wormAppearances=(room.wormAppearances||0)+1;
   for(const w of room.worms.filter(w=>w.birthBatch===batch||w.id===batch))w.mealLimit=3*Math.min(3,room.wormAppearances);
  }
 }
 advanceHabitats(room,now,random,{completedTurn:true});
}
function positionRodents(room,raid,point,random){
 const area=areaAt(room,raid),known=new Set(area.map(c=>key(c.x,c.y))),seen=new Set((raid.visited||[]).map(c=>key(c.x,c.y)));
 const taken=new Set([...room.worms.flatMap(w=>w.body||[]),...habitatReservations(room),...room.rodentRaids.filter(r=>r.id!==raid.id&&r.phase!=='hidden').flatMap(r=>r.members||[])].map(c=>key(c.x,c.y)));
 const candidates=room.cells.filter(c=>known.has(key(c.x,c.y))&&!same(c,point)&&['X','O'].includes(c.symbol)&&!isImmune(room,c.owner)&&!taken.has(key(c.x,c.y))&&!seen.has(key(c.x,c.y)));
 raid.members=[];
 for(let i=0;i<raid.count;i++){
  let c=choose(candidates,random);
  if(c)candidates.splice(candidates.indexOf(c),1);
  else c=choose(area.filter(c=>!same(c,point)&&!room.cells.some(p=>same(c,p))&&!taken.has(key(c.x,c.y))&&!seen.has(key(c.x,c.y))),random);
  if(!c)break;
  taken.add(key(c.x,c.y));raid.members.push({id:raid.id+':'+i,x:c.x,y:c.y,cellId:c.id||null});
 }
}
export function visitRodents(room,point,now=Date.now(),random=Math.random){
 if(!faunaEnabled(room)||faunaSuspended(room,now)||!room.rodentRaids.length)return;
 const area=new Set(areaAt(room,point).map(c=>key(c.x,c.y))),visits=[];
 for(const raid of room.rodentRaids){
  if(raid.warningTurns!=null)continue;
  if(!area.has(key(raid.x,raid.y)))continue;
  raid.mealsLeft??=raid.remaining??3;raid.turn??=0;raid.members||=[];raid.visited||=[];
  // Arrival, eating and absence each occupy a full completed turn. Doble
  // counts once, and neither clock ticks nor cards fast-forward the cycle.
  const previousPhase=raid.phase;raid.turn++;
  const stage=(raid.turn-1)%3;
  if(stage===0){raid.phase='arriving';if(!raid.members.length)positionRodents(room,raid,point,random);}
  else if(stage===1){
   raid.phase='eating';
   for(const member of raid.members){
    const food=room.cells.find(c=>c.id===member.cellId&&same(c,member)&&!same(c,point)&&['X','O'].includes(c.symbol)&&!isImmune(room,c.owner)&&!occupiedByOther(room,c,raid.id));
    if(food)visits.push({x:food.x,y:food.y,cellId:food.id,symbol:food.symbol,owner:food.owner});
    raid.visited.push({x:member.x,y:member.y});
   }
  }else{raid.phase='hidden';raid.members=[];raid.mealsLeft--;}
  if(raid.phase!==previousPhase)raid.phaseAt=now;
  raid.remaining=Math.max(0,raid.mealsLeft);
 }
 room.rodentRaids=room.rodentRaids.filter(r=>r.mealsLeft>0);
 if(visits.length){clearHabitatCells(room,visits);room.rodentVisit={id:uuid(),kind:'rodent',at:now,visits};}
}
export function visitWorms(room,point,now=Date.now(),random=Math.random){
 if(room.status!=='playing'||!faunaEnabled(room)||faunaSuspended(room,now))return;
 room.clockNow=now;
 const exclude=point?room.cells.find(c=>same(c,point))?.id:null,actions=[];
 for(const w of room.worms.filter(w=>isTurnWorm(w)&&w.warningTurns==null)){
  w.turnsSinceMeal=(w.turnsSinceMeal||0)+1;if(w.turnsSinceMeal<3)continue;w.turnsSinceMeal=0;
  let food=w.eaten?foodFor(room,w,random,{adjacent:true,exclude}):room.cells.find(c=>same(c,w)&&c.id!==exclude&&!isImmune(room,c.owner)&&!occupiedByOther(room,c,w.id));
  if(!food&&!w.eaten)food=foodFor(room,w,random,{exclude});
  if(!food){w.failedMeals=(w.failedMeals||0)+1;continue;}
  clearHabitatCell(room,food);w.x=food.x;w.y=food.y;w.eaten++;w.failedMeals=0;w.phaseAt=now;
  w.body=[...new Map([...(w.body||[]),{x:w.x,y:w.y}].map(c=>[key(c.x,c.y),c])).values()].slice(-WORM_TAIL_LIMIT);
  actions.push({x:w.x,y:w.y,kind:'worm'});
 }
 room.worms=room.worms.filter(w=>!isTurnWorm(w)||w.eaten<w.mealLimit&&(w.failedMeals||0)<3);
 if(actions.length)room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};
}
function activeAt(room,point){
 if(['solo','local'].includes(room.mode))return true;
 const area=new Set(connectedTerrain(terrainOf(room),point).map(c=>key(c.x,c.y)));
 return room.pairs.some(pair=>area.has(key((pair.terrainAnchor||pair.active).x,(pair.terrainAnchor||pair.active).y))&&room.players.some(p=>(p.id===pair.x||p.id===pair.o)&&p.active!==false&&!p.bot));
}
export function freezeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);if(turnEcology(room))return;freezeLiving(room,now);
 for(const e of [...room.worms.filter(w=>!isTurnWorm(w)),...room.works,...room.bombs,...room.territoryEvents])e.remainingMs=e.remainingMs??Math.max(0,(e.nextAt||now+HABITAT_INTERVAL)-now);
 if(room.ecologyRecovery)room.ecologyRecovery.remainingMs=room.ecologyRecovery.remainingMs??Math.max(0,room.ecologyRecovery.until-now);
 room.habitatLastCheck=now;
}
export function resumeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);if(turnEcology(room))return;resumeLiving(room,now);
 if(room.ecologyRecovery?.remainingMs!=null){room.ecologyRecovery.until=now+room.ecologyRecovery.remainingMs;delete room.ecologyRecovery.remainingMs;}for(const e of [...room.worms.filter(w=>!isTurnWorm(w)),...room.works,...room.bombs,...room.territoryEvents]){e.nextAt=now+(e.remainingMs??HABITAT_INTERVAL);delete e.remainingMs;}room.habitatLastCheck=now;
}
export function advanceHabitats(room,now=Date.now(),random=Math.random,{suppressFauna=false,completedTurn=false}={}){
 initializeHabitats(room,now);if(room.status!=='playing'||turnEcology(room)&&!completedTurn)return false;room.clockNow=now;
 const eventCount=room.territoryEvents.length,actions=advanceTerritory(room,now);let changed=actions.length>0||eventCount!==room.territoryEvents.length;
 if(actions.length||suppressFauna||!faunaEnabled(room)||faunaSuspended(room,now)){if(actions.length)room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions};return changed;}
 if(room.ecologyRecovery){delete room.ecologyRecovery;changed=true;}
 for(const e of [...room.worms.filter(w=>!isTurnWorm(w)),...room.works,...room.bombs]){
  const point=e.kind==='work'?e.destroy[e.done]||e.build[e.done]:e;
  if(!point)continue;
  if(!activeAt(room,point)){if(e.remainingMs==null)e.remainingMs=Math.max(0,e.nextAt-Math.min(now,room.habitatLastCheck??now));continue;}
  if(e.remainingMs!=null){e.nextAt=now+e.remainingMs;delete e.remainingMs;changed=true;continue;}
  // No catch-up after an unobserved interval; at most one action per current cycle.
  if(turnEcology(room)?e.turnsRemaining>0:e.nextAt>now)continue;
  if(turnEcology(room)){e.turnsRemaining=3;e.announcedTurn=room.ecologyTurns;}else e.nextAt=now+HABITAT_INTERVAL;changed=true;
  if(e.kind==='work'){
   if(e.role){
    const target=e[e.role==='build'?'build':'destroy'][e.done],piece=room.cells.find(c=>same(c,target));
    if(protectedTerritoryKeys(room).has(key(target.x,target.y)))continue;
    const anchor=!localLiving(room)&&e.role==='destroy'&&room.pairs.some(p=>same(p.terrainAnchor||p.active,target));
    if(piece?.symbol==='*'&&!anchor&&!(room.inventoryEffects?.shields||[]).some(s=>s.cell===piece.id&&s.remaining>0)&&!room.worms.some(w=>(w.body||[]).some(c=>same(c,target)))){
     clearHabitatCell(room,target);if(e.role==='destroy'&&!localLiving(room))room.terrain=terrainOf(room).filter(c=>!same(c,target));
     actions.push({...target,kind:e.role});
    }
    e.done++;continue;
   }
   if(e.reconquer&&localLiving(room)){
    const remove=e.destroy[e.done],add=e.build[e.done];
    if(remove&&protectedTerritoryKeys(room,now).has(key(remove.x,remove.y)))continue;
    const piece=remove&&room.cells.find(c=>same(c,remove)),shielded=piece&&(room.inventoryEffects?.shields||[]).some(s=>s.cell===piece.id&&s.remaining>0);
    if(piece?.symbol==='*'&&!shielded&&!room.worms.some(w=>(w.body||[]).some(c=>same(c,remove)))){clearHabitatCell(room,remove);actions.push({...remove,kind:'destroy'});}
    const terrain=terrainOf(room);
    if(add&&terrain.length<boardCellLimit(room)&&!terrain.some(c=>same(c,add))&&!room.frontiers?.some(f=>(f.cells||[]).some(c=>same(c,add)))&&fourNeighbors(add).some(c=>terrain.some(t=>same(t,c))&&!frontierSegments(room).some(e=>edgeKey(e)===edgeKey({a:c,b:add})))){
     room.terrain=[...terrain,{...add,owner:e.player}];actions.push({...add,kind:'build'});
    }
    e.done++;continue;
   }
   const remove=e.destroy[e.done],add=e.build[e.done];
   if(protectedTerritoryKeys(room).has(key(remove.x,remove.y)))continue;
   const valid=terrainOf(room).some(c=>same(c,remove))&&!room.cells.some(c=>same(c,remove))&&!terrainOf(room).some(c=>same(c,add));
   if(valid){room.terrain=terrainOf(room).filter(c=>!same(c,remove));room.terrain.push({...add});actions.push({...remove,kind:'destroy'},{...add,kind:'build'});e.done++;changed=true;}
   else{room.works=room.works.filter(w=>w.id!==e.id);changed=true;}
  }else if(e.blast){
   const protectedKeys=protectedTerritoryKeys(room);for(const c of e.blast)if(!protectedKeys.has(key(c.x,c.y))){clearHabitatCell(room,c);actions.push({...c,kind:'bomb'});}
   const hit=new Set(e.blast.map(c=>key(c.x,c.y)));room.frontiers=(room.frontiers||[]).filter(f=>isImmune(room,f.by)||!frontierHit(f,hit));
   room.bombs=room.bombs.filter(b=>b.id!==e.id);changed=true;
  }else{
   if(e.kind==='worm'&&e.eaten>=3){room.worms=room.worms.filter(w=>w.id!==e.id);changed=true;continue;}
   let food=room.cells.find(c=>same(c,e)&&!isImmune(room,c.owner)&&!occupiedByOther(room,c,e.id));
   if(e.kind==='worm'&&e.eaten>0)food=foodFor(room,e,random,{adjacent:true});
   else food||=foodFor(room,e,random);
   if(!food){if(e.kind==='worm'&&localLiving(room)){e.failedMeals=(e.failedMeals||0)+1;if(e.failedMeals>=3)room.worms=room.worms.filter(w=>w.id!==e.id);}continue;}
   e.failedMeals=0;
   clearHabitatCell(room,food);actions.push({x:food.x,y:food.y,kind:'worm'});e.x=food.x;e.y=food.y;e.eaten++;changed=true;
   if(e.kind==='worm'){e.body.push({x:e.x,y:e.y});e.body=[...new Map(e.body.map(c=>[key(c.x,c.y),c])).values()].slice(-3);if(e.eaten>=3)room.worms=room.worms.filter(w=>w.id!==e.id);}
   else if(e.eaten>=3)room.rodents=room.rodents.filter(r=>r.id!==e.id);
   else{const target=foodFor(room,e,random);if(target){e.x=target.x;e.y=target.y;}}
  }
 }
 room.works=room.works.filter(w=>w.done<Math.max(w.destroy.length,w.build.length));
 room.habitatLastCheck=now;
 if(actions.length){room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions};}
 return changed;
}
export function habitatLabel(room,playerId){
 const p=room.players.find(p=>p.id===playerId),count=p?.placements||0;
 const rats=room.habitatVersion<2?(room.rodents||[]).filter(e=>e.player===playerId).length:(room.rodentRaids||[]).filter(e=>e.player===playerId).reduce((n,r)=>n+r.count,0),worms=(room.worms||[]).filter(e=>e.player===playerId).length;
 return `Fichas ${count} · fauna proporcional por zona${rats||worms?` · activos R${rats}/G${worms}`:''}`;

}
export const workerHelmet='<path data-worker="helmet" d="M4 14h24M6 14v-3a10 10 0 0 1 20 0v3M12 3v11m8-11v11"/>';
export const habitatIcons={rodent:rodentIcon,worm:'<path d="M3 25c1-7 7-9 12-5 4 3 7 2 7-2v-6c-3-2-2-7 2-8s7 3 4 7l-1 2v5c0 8-7 11-13 8l-5-3c-2-1-4 0-6 2Z"/><path d="m9 18-2 4m8-2-2 5m7-3 1 5m1-8 5 2m-5-6h5"/><circle cx="25.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>',build:'<path data-worker-sign="plus" d="M5 16h22M16 5v22"/>',destroy:'<path data-worker="soldier" d="m5 3 8 5 14 17-3 3L7 11 5 3Zm22 0-8 5L5 25l3 3L25 11l2-8ZM3 20l9 9m8-9 9 9M4 28l3-3m18 0 3 3"/>',bomb:'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/>'};
export function habitatAnimationDelay(event,kind,now=Date.now()){
 const duration=kind==='rodent'?(event?.phase==='eating'?450:1600):kind==='worm'?1300:800;
 const current=event?.frozen?(event?.clockNow??now):now;
 const elapsed=event?.remainingMs!=null?HABITAT_INTERVAL-event.remainingMs:current-(event?.phaseAt??((event?.nextAt??current)-HABITAT_INTERVAL));
 return -Math.max(0,elapsed)%duration;
}
export function habitatMark(kind,label='',event=null){
 const timed=event&&['build','destroy','bomb'].includes(kind);
 const turns=event&&(event.warningTurns!=null||event.turnsRemaining!=null);
 const badge=turns?`<b>${eventTurns(event)}↷</b>`:kind==='worm'?'':timed?`<b><span class="ecology-clock" data-ecology-kind="${kind}" data-ecology-source="${event.id}" aria-label="${ecologySeconds(event)} segundos">${ecologySeconds(event)}</span>s</b>`:label!==''?`<b>${label}</b>`:'';
 return `<span class="habitat-mark habitat-${kind} visible-inhabitant phase-${event?.phase||'working'} ${event?.frozen||event?.remainingMs!=null?'is-frozen':''}" style="--inhabitant-delay:${habitatAnimationDelay(event,kind)}ms"><svg viewBox="0 0 32 32" aria-hidden="true">${habitatIcons[kind]||''}</svg>${badge}</span>`;
}

export function habitatMapPins(room){
 const items=[...(room.rodents||[]).map(r=>({...r,kind:'rodent'})),...(room.worms||[]).map(w=>({...w,kind:'worm'})),...(room.works||[]).flatMap(w=>[{...w,...w.destroy[w.done],kind:'destroy'},{...w,...w.build[w.done],kind:'build'}]),...(room.bombs||[]).map(b=>({...b,kind:'bomb'}))];
 return items.filter(e=>Number.isFinite(e.x)).map(e=>`<g class="map-rodent-pin" data-x="${e.x+.5}" data-y="${e.y+.5}"><title>${e.kind==='rodent'?'Roedor':e.kind==='worm'?'Gusano':e.kind==='bomb'?'Bomba automática':e.kind==='build'?'Ampliador':'Soldado'} · ${e.eaten??e.done??0}/3</title><circle r="13" fill="#151109" stroke="${'var(--yellow)'}" stroke-width="2"/><svg x="-10" y="-10" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="${'var(--yellow)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${habitatIcons[e.kind]||'<path d="M7 14c0-8 18-8 18 0v7c0 7-18 7-18 0ZM10 11a4 4 0 1 0-4 4m16-4a4 4 0 1 1 4 4M12 17h.01M20 17h.01m-6 4 2 2 2-2"/>'}</svg></g>`).join('');
}
