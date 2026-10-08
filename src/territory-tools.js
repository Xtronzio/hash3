import {terrainOf,key} from './game.js';
import {territoryEnabled} from './ecology.js';
import {habitatInterval} from './habitat-budget.js';
import {frontierHit} from './frontiers.js';

export const TERRITORY_MIN_SIZE=333,TERRITORY_WARNING_MS=33000;
export const territoryIcons={rain:'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/>',ufo:'<ellipse cx="16" cy="15" rx="13" ry="4"/><path d="M9 12a7 7 0 0 1 14 0M10 22l-4 7m10-7v8m6-8 4 7"/>',cataclysm:'<path d="m18 2-8 12 9 2-7 14M2 21l6-3m16 5 6-2M3 8l5 2m16-1 5-3"/>'};
export function initializeTerritory(room){
 room.territoryEvents||=[];
 // Adopt current terrain without firing historical growth again.
 room.territoryMilestone??=Math.floor(terrainOf(room).length/333);
}
// Connected patch chosen from a boundary, with every pair's anchor preserved.
// O(N) command work; never called from pan/pinch or board-window queries.
export function territoryRegion(room,kind,random=Math.random,count=Math.floor(terrainOf(room).length/333)*33){
 const terrain=terrainOf(room),known=new Map(terrain.map(c=>[key(c.x,c.y),c]));
 const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y)));
 const eligible=terrain.filter(c=>kind==='ufo'||!anchors.has(key(c.x,c.y)));
 const neighbors=c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy}));
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
export function recordTerritoryGrowth(room,added,now=Date.now(),random=Math.random){
 initializeTerritory(room);if(!territoryEnabled(room)||added<=0||room.territoryEvents.length)return false;
 const milestone=Math.floor(terrainOf(room).length/333);
 if(milestone<=room.territoryMilestone)return false;
 const draw=['rain','cataclysm','ufo'],start=Math.min(2,Math.floor(Math.max(0,random())*3));
 for(let i=0;i<3;i++){
  const kind=draw[(start+i)%3],count=kind==='ufo'?Math.floor(room.cells.length*33/333):milestone*33;
  const region=territoryRegion(room,kind,random,count);
  if(!region.length)continue;
  room.territoryMilestone=milestone;
  for(const e of [...(room.worms||[]),...(room.works||[]),...(room.bombs||[])])if(e.remainingMs==null)e.remainingMs=Math.max(0,(e.nextAt||now+33000)-now);
  room.territoryEvents.push({id:crypto.randomUUID(),kind,milestone,region,x:region[0].x,y:region[0].y,nextAt:now+TERRITORY_WARNING_MS});return true;
 }
 // No food/region: consume the milestone without creating a delayed flood.
 room.territoryMilestone=milestone;return false;
}
export function advanceTerritory(room,now=Date.now()){
 initializeTerritory(room);if(room.status!=='playing'||!territoryEnabled(room))return [];
 const actions=[];
 for(const event of [...room.territoryEvents]){
  if(event.remainingMs!=null||event.nextAt>now)continue;
  const actual=new Set(terrainOf(room).map(c=>key(c.x,c.y)));
  const hit=new Set(event.region.filter(c=>actual.has(key(c.x,c.y))).map(c=>key(c.x,c.y)));
  if(event.kind!=='ufo')for(const p of room.pairs){const a=p.terrainAnchor||p.active;hit.delete(key(a.x,a.y));}
  if(event.kind==='cataclysm'){const neighbors=c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>key(c.x+dx,c.y+dy));let pruning=true;while(pruning){pruning=false;for(const c of event.region){const k=key(c.x,c.y);if(hit.has(k)&&neighbors(c).filter(n=>hit.has(n)).length<2){hit.delete(k);pruning=true;}}}}
  const removed=new Set(room.cells.filter(c=>hit.has(key(c.x,c.y))).map(c=>c.id));
  room.cells=room.cells.filter(c=>!hit.has(key(c.x,c.y)));
  room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').some(k=>hit.has(k)));
  for(const p of room.players)if(removed.has(p.lastMove?.id))delete p.lastMove;
  room.eatenCells=(room.eatenCells||[]).filter(c=>!hit.has(key(c.x,c.y)));
  if(event.kind!=='ufo'){
   // An anchor could have moved since the warning; protect it again at execution.
   room.terrain=terrainOf(room).filter(c=>!hit.has(key(c.x,c.y)));
   room.frontiers=(room.frontiers||[]).filter(f=>!frontierHit(f,hit));
   room.worms=(room.worms||[]).filter(w=>!w.body.some(c=>hit.has(key(c.x,c.y))));
   room.works=(room.works||[]).filter(w=>![...w.destroy.slice(w.done),...w.build.slice(w.done)].some(c=>hit.has(key(c.x,c.y))));
   room.bombs=(room.bombs||[]).filter(b=>!b.blast.some(c=>hit.has(key(c.x,c.y))));
   room.rodentRaids=(room.rodentRaids||[]).filter(r=>!hit.has(key(r.x,r.y)));
  }else room.eatenCells.push(...event.region.filter(c=>actual.has(key(c.x,c.y))));
  if(room.inventoryEffects){
   room.inventoryEffects.shields=(room.inventoryEffects.shields||[]).filter(s=>!removed.has(s.cell));
   room.inventoryEffects.blocks=(room.inventoryEffects.blocks||[]).filter(c=>!hit.has(key(c.x,c.y)));
  }
  actions.push(...event.region.filter(c=>hit.has(key(c.x,c.y))).map((c,i)=>({...c,kind:event.kind,...(event.kind==='rain'?{group:Math.floor(i/3)}:{})})));
  room.territoryEvents=room.territoryEvents.filter(e=>e.id!==event.id);
  rebalanceAfterTerritory(room,now);
 }
 return actions;
}
export function territoryNotice(room,now=Date.now()){
 return (room.territoryEvents||[]).map(e=>`${e.kind==='ufo'?'OVNI':e.kind==='rain'?'Lluvia de bombas':'Cataclismo'}: ${e.region.length} ${e.kind==='ufo'?'fichas':'celdas'} marcadas · en ${Math.max(0,Math.ceil((e.remainingMs??e.nextAt-now)/1000))} s`).join(' · ');
}

export function rebalanceAfterTerritory(room,now=Date.now()){
 const terrain=terrainOf(room),size=terrain.length,known=new Set(terrain.map(c=>key(c.x,c.y))),unit=Math.ceil(size/333);
 const before={rodents:(room.rodentRaids||[]).reduce((n,r)=>n+r.count,0),worms:(room.worms||[]).length,workers:(room.works||[]).length};
 room.worms=(room.worms||[]).filter(w=>(w.body||[]).every(c=>known.has(key(c.x,c.y)))).slice(0,unit);
 room.works=(room.works||[]).filter(w=>w.destroy.slice(w.done).every(c=>known.has(key(c.x,c.y)))).slice(0,unit*3);
 let rats=Math.ceil(size*3/333);
 room.rodentRaids=(room.rodentRaids||[]).filter(r=>known.has(key(r.x,r.y))).flatMap(r=>{const count=Math.min(r.count,rats);rats-=count;return count?[{...r,count}]:[];});
 for(const zone of room.habitatZones||[]){zone.credit={};for(const [kind,n]of Object.entries({rodent:33,worm:99,work:198,bomb:66}))zone.next[kind]=zone.placements+habitatInterval(n,size);}
 room.ecologyRecovery={until:now+33000,moves:3};
 room.ecologyRecalibration={at:now,size,pieces:room.cells.length,before,after:{rodents:room.rodentRaids.reduce((n,r)=>n+r.count,0),worms:room.worms.length,workers:room.works.length}};
 for(const e of [...room.worms,...room.works,...(room.bombs||[])])e.remainingMs=33000;
}
