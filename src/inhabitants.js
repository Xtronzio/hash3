import {rodentIcon} from './rodent-icon.js';
import {ecologySeconds} from './ecology-clock.js';
import {protectedTerritoryKeys,isImmune} from './immunity.js';
import {faunaEnabled,territoryEnabled,faunaSuspended} from './ecology.js';
import {terrainOf,connectedTerrain,key} from './game.js';
import {frontierReachable,frontierSegments,nearbyFrontierCells,frontierHit,edgeKey} from './frontiers.js';
import {habitatBlocked,habitatReservations} from './habitat-tools.js';
import {placeNeutral,NEUTRAL_FREQUENCY} from './neutral.js';
import {habitatZone,habitatInterval,proportionalBudget,HABITAT_REFERENCE,HABITAT_WEIGHTS,HABITAT_FREQUENCIES} from './habitat-budget.js';
import {initializeTerritory,advanceTerritory,recordTerritoryPlacement} from './territory-tools.js';
export const HABITAT_INTERVAL=33000;
export {HABITAT_FREQUENCIES} from './habitat-budget.js';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const choose=(all,random)=>all.length?all[Math.min(all.length-1,Math.floor(Math.max(0,random())*all.length))]:null;
const uuid=()=>crypto.randomUUID();
export function initializeHabitats(room,now=Date.now()){
 initializeTerritory(room);room.habitatZones||=[];
 room.rodents||=[];room.worms||=[];room.works||=[];room.bombs||=[];room.eatenCells||=[];room.rodentRaids||=[];
 if(!faunaEnabled(room)){room.rodents=[];room.rodentRaids=[];room.worms=[];room.works=[];}
 if(!territoryEnabled(room)){room.territoryEvents=[];room.bombs=[];}
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
function occupiedByOther(room,point,id){return room.rodents.some(r=>r.id!==id&&same(r,point))||room.worms.some(w=>w.id!==id&&(w.body||[]).some(c=>same(c,point)))||habitatReservations(room).some(c=>same(c,point));}
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
 room.cells=room.cells.filter(c=>!hit.has(key(c.x,c.y)));
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
function project(room,point,player,random,now){
 const area=areaAt(room,point),known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),taken=new Set(room.cells.map(c=>key(c.x,c.y))),reserved=new Set(habitatReservations(room).map(c=>key(c.x,c.y))),barriers=new Set(frontierSegments(room).flatMap(e=>[key(e.a.x,e.a.y),key(e.b.x,e.b.y)]));
 const empty=area.filter(c=>!taken.has(key(c.x,c.y))&&!reserved.has(key(c.x,c.y))&&!barriers.has(key(c.x,c.y))&&!occupiedByOther(room,c));
 // Prefer non-anchor cells, but allow cutting bridges. Never erase the last local anchor.
 const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y)));
 const eligible=empty.filter(c=>!anchors.has(key(c.x,c.y)));
 if(eligible.length<9)return false;
 const destroy=[];while(destroy.length<9){const c=choose(eligible,random);destroy.push({x:c.x,y:c.y});eligible.splice(eligible.indexOf(c),1);}
 const build=[],blocked=new Set(frontierSegments(room).map(edgeKey));
 let edge=area;
 while(build.length<9){
  const options=new Map();for(const c of edge)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const p={x:c.x+dx,y:c.y+dy},k=key(p.x,p.y);if(!known.has(k)&&!reserved.has(k)&&!blocked.has(edgeKey({a:c,b:p})))options.set(k,p);}
  const c=choose([...options.values()],random);if(!c)return false;build.push(c);known.add(key(c.x,c.y));edge=[...edge,c];
 }
 for(let i=0;i<3;i++)room.works.push({id:uuid(),player,kind:'work',destroy:destroy.slice(i*3,i*3+3),build:build.slice(i*3,i*3+3),done:0,nextAt:now+HABITAT_INTERVAL});
 return true;
}
export function countHabitatPlacement(room,playerId,point,now=Date.now(),random=Math.random){
 initializeHabitats(room,now);const p=room.players.find(p=>p.id===playerId);if(!p)return;
 const area=areaAt(room,point),zone=habitatZone(room,area,HABITAT_FREQUENCIES),areaSet=new Set(area.map(c=>key(c.x,c.y)));
 const previouslySuspended=faunaSuspended(room,now);if(room.ecologyRecovery?.moves>0)room.ecologyRecovery.moves--;
 p.placements++;zone.placements++;recordTerritoryPlacement(room,now,random);
 const suspended=previouslySuspended||faunaSuspended(room,now);room.eatenCells=room.eatenCells.filter(c=>!same(c,point));
 for(const [kind,frequency]of Object.entries(HABITAT_FREQUENCIES)){
  p.habitatNext[kind]=(Math.floor(p.placements/frequency)+1)*frequency;
  if(!faunaEnabled(room)||suspended)continue;
  if(kind==='bomb')continue; // Automatic rain is now a territory card, not repeated small blasts.
  if(zone.placements<zone.next[kind])continue;
  zone.next[kind]=zone.placements+habitatInterval(frequency,area.length);
  let count=proportionalBudget(zone,kind,area.length);
  // A bounded shared population: waiting for food never piles up generations.
  const cap=Math.ceil(area.length/HABITAT_REFERENCE*HABITAT_WEIGHTS[kind]);
  const residents=kind==='rodent'?room.rodentRaids.filter(r=>areaSet.has(key(r.x,r.y))).reduce((n,r)=>n+r.count,0):kind==='work'?room.works.filter(w=>areaSet.has(key(w.destroy[w.done].x,w.destroy[w.done].y))).length/3:(kind==='bomb'?room.bombs:room.worms).filter(e=>areaSet.has(key(e.x,e.y))).length;
  count=Math.max(0,Math.min(count,Math.floor(cap-residents)));
  if(kind==='rodent'){if(count)room.rodentRaids.push({id:uuid(),player:playerId,...point,count,remaining:3,visited:[]});continue;}
  for(let i=0;i<count;i++){
   if(kind==='work'){if(!project(room,point,playerId,random,now))break;continue;}
   if(kind==='bomb'){const blast=automaticBlast(room,point,random);if(blast)room.bombs.push({id:uuid(),player:playerId,...blast[0],blast,nextAt:now+HABITAT_INTERVAL});continue;}
   const r={id:uuid(),player:playerId,kind,x:point.x,y:point.y,eaten:0,phase:0,nextAt:now+HABITAT_INTERVAL};
   const food=foodFor(room,r,random,{exclude:room.cells.find(c=>same(c,point))?.id});
   if(food){r.x=food.x;r.y=food.y;r.body=[{x:r.x,y:r.y}];room.worms.push(r);}
  }
 }
 if(faunaEnabled(room)&&!suspended)visitRodents(room,point,now,random);
 if(territoryEnabled(room)&&!suspended&&p.placements%NEUTRAL_FREQUENCY===0)placeNeutral(room,areaAt(room,point),now,random,point);
 p.rodentNextSpawn=p.habitatNext.rodent;
}
function visitRodents(room,point,now,random){
 if(!room.rodentRaids.length)return;
 const area=new Set(areaAt(room,point).map(c=>key(c.x,c.y))),visits=[];
 const occupied=new Set([...room.rodents,...room.worms.flatMap(w=>w.body||[]),...habitatReservations(room)].map(c=>key(c.x,c.y))),removed=new Set();
 const food=room.cells.filter(c=>area.has(key(c.x,c.y))&&!same(c,point)&&['X','O'].includes(c.symbol)&&!isImmune(room,c.owner)&&!occupied.has(key(c.x,c.y)));
 for(const raid of room.rodentRaids){
  if(!area.has(key(raid.x,raid.y)))continue;
  const seen=new Set(raid.visited.map(c=>key(c.x,c.y)));
  const candidates=food.filter(c=>!removed.has(c.id)&&!seen.has(key(c.x,c.y)));
  for(let i=0,n=Math.min(raid.count,candidates.length);i<n;i++){
   const c=choose(candidates,random),index=candidates.indexOf(c);candidates[index]=candidates.at(-1);candidates.pop();
   removed.add(c.id);visits.push({x:c.x,y:c.y,cellId:c.id,symbol:c.symbol,owner:c.owner});raid.visited.push({x:c.x,y:c.y});
  }
  raid.remaining--;
 }
 room.rodentRaids=room.rodentRaids.filter(r=>r.remaining>0);
 if(visits.length)clearHabitatCells(room,visits);
 if(visits.length)room.rodentVisit={id:uuid(),kind:'rodent',at:now,visits};
}
function activeAt(room,point){
 if(['solo','local'].includes(room.mode))return true;
 const area=new Set(connectedTerrain(terrainOf(room),point).map(c=>key(c.x,c.y)));
 return room.pairs.some(pair=>area.has(key((pair.terrainAnchor||pair.active).x,(pair.terrainAnchor||pair.active).y))&&room.players.some(p=>(p.id===pair.x||p.id===pair.o)&&p.active!==false&&!p.bot));
}
export function freezeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);for(const e of [...room.worms,...room.works,...room.bombs,...room.territoryEvents])e.remainingMs=e.remainingMs??Math.max(0,(e.nextAt||now+HABITAT_INTERVAL)-now);
 if(room.ecologyRecovery)room.ecologyRecovery.remainingMs=room.ecologyRecovery.remainingMs??Math.max(0,room.ecologyRecovery.until-now);
 room.habitatLastCheck=now;
}
export function resumeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);if(room.ecologyRecovery?.remainingMs!=null){room.ecologyRecovery.until=now+room.ecologyRecovery.remainingMs;delete room.ecologyRecovery.remainingMs;}for(const e of [...room.worms,...room.works,...room.bombs,...room.territoryEvents]){e.nextAt=now+(e.remainingMs??HABITAT_INTERVAL);delete e.remainingMs;}room.habitatLastCheck=now;
}
export function advanceHabitats(room,now=Date.now(),random=Math.random,{suppressFauna=false}={}){
 initializeHabitats(room,now);if(room.status!=='playing')return false;room.clockNow=now;
 const eventCount=room.territoryEvents.length,actions=advanceTerritory(room,now);let changed=actions.length>0||eventCount!==room.territoryEvents.length;
 if(actions.length||suppressFauna||!faunaEnabled(room)||faunaSuspended(room,now)){if(actions.length)room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions};return changed;}
 if(room.ecologyRecovery){delete room.ecologyRecovery;changed=true;}
 for(const e of [...room.worms,...room.works,...room.bombs]){
  const point=e.kind==='work'?e.destroy[e.done]:e;
  if(!point)continue;
  if(!activeAt(room,point)){if(e.remainingMs==null)e.remainingMs=Math.max(0,e.nextAt-Math.min(now,room.habitatLastCheck??now));continue;}
  if(e.remainingMs!=null){e.nextAt=now+e.remainingMs;delete e.remainingMs;changed=true;continue;}
  // No catch-up after an unobserved interval; at most one action per current cycle.
  if(e.nextAt>now)continue;
  e.nextAt=now+HABITAT_INTERVAL;
  if(e.kind==='work'){
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
   if(!food)continue;
   clearHabitatCell(room,food);actions.push({x:food.x,y:food.y,kind:'worm'});e.x=food.x;e.y=food.y;e.eaten++;changed=true;
   if(e.kind==='worm'){e.body.push({x:e.x,y:e.y});e.body=[...new Map(e.body.map(c=>[key(c.x,c.y),c])).values()].slice(-3);if(e.eaten>=3)room.worms=room.worms.filter(w=>w.id!==e.id);}
   else if(e.eaten>=3)room.rodents=room.rodents.filter(r=>r.id!==e.id);
   else{const target=foodFor(room,e,random);if(target){e.x=target.x;e.y=target.y;}}
  }
 }
 room.works=room.works.filter(w=>w.done<3);
 room.habitatLastCheck=now;
 if(changed){room.habitatEvent={id:uuid(),kind:'habitat',at:now,actions};}
 return changed;
}
export function habitatLabel(room,playerId){
 const p=room.players.find(p=>p.id===playerId),count=p?.placements||0;
 const rats=room.habitatVersion<2?(room.rodents||[]).filter(e=>e.player===playerId).length:(room.rodentRaids||[]).filter(e=>e.player===playerId).reduce((n,r)=>n+r.count,0),worms=(room.worms||[]).filter(e=>e.player===playerId).length;
 return `Fichas ${count} · fauna proporcional por zona${rats||worms?` · activos R${rats}/G${worms}`:''}`;

}
export const workerHelmet='<path data-worker="helmet" d="M4 14h24M6 14v-3a10 10 0 0 1 20 0v3M12 3v11m8-11v11"/>';
export const habitatIcons={rodent:rodentIcon,worm:'<path d="M3 25c1-7 7-9 12-5 4 3 7 2 7-2v-6c-3-2-2-7 2-8s7 3 4 7l-1 2v5c0 8-7 11-13 8l-5-3c-2-1-4 0-6 2Z"/><path d="m9 18-2 4m8-2-2 5m7-3 1 5m1-8 5 2m-5-6h5"/><circle cx="25.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>',build:workerHelmet+'<path data-worker-sign="plus" d="M10 24h12m-6-6v12"/>',destroy:workerHelmet+'<path data-worker-sign="minus" d="M10 24h12"/>',bomb:'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/>'};
export function habitatMark(kind,label='',event=null){
 const timed=event&&['worm','build','destroy','bomb'].includes(kind);
 const badge=timed?`<b><span class="ecology-clock" data-ecology-kind="${kind}" data-ecology-source="${event.id}" aria-label="${ecologySeconds(event)} segundos">${ecologySeconds(event)}</span>s</b>`:label!==''?`<b>${label}</b>`:'';
 return `<span class="habitat-mark habitat-${kind}"><svg viewBox="0 0 32 32" aria-hidden="true">${habitatIcons[kind]||''}</svg>${badge}</span>`;
}

export function habitatMapPins(room){
 const items=[...(room.rodents||[]).map(r=>({...r,kind:'rodent'})),...(room.worms||[]).map(w=>({...w,kind:'worm'})),...(room.works||[]).flatMap(w=>[{...w,...w.destroy[w.done],kind:'destroy'},{...w,...w.build[w.done],kind:'build'}]),...(room.bombs||[]).map(b=>({...b,kind:'bomb'}))];
 return items.filter(e=>Number.isFinite(e.x)).map(e=>`<g class="map-rodent-pin" data-x="${e.x+.5}" data-y="${e.y+.5}"><title>${e.kind==='rodent'?'Roedor':e.kind==='worm'?'Gusano':e.kind==='bomb'?'Bomba automática':e.kind==='build'?'Constructor':'Destructor'} · ${e.eaten??e.done??0}/3</title><circle r="13" fill="#151109" stroke="${e.kind==='build'?'var(--green)':e.kind==='destroy'?'var(--red)':'var(--yellow)'}" stroke-width="2"/><svg x="-10" y="-10" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="${e.kind==='build'?'var(--green)':e.kind==='destroy'?'var(--red)':'var(--yellow)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${habitatIcons[e.kind]||'<path d="M7 14c0-8 18-8 18 0v7c0 7-18 7-18 0ZM10 11a4 4 0 1 0-4 4m16-4a4 4 0 1 1 4 4M12 17h.01M20 17h.01m-6 4 2 2 2-2"/>'}</svg></g>`).join('');
}
