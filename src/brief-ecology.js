import {initializeRouteHistory,routeHistoryIndex,routeNovelty,rememberRoute,routeOrientation} from './fauna-routes.js';
import {isDeadCell} from './dead-cells.js';
import {key,terrainOf,availableCells,expansionOptions} from './game.js';
import {habitatBlocked,habitatReservations} from './habitat-tools.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {protectedTerritoryKeys} from './immunity.js';

export const briefEcology=room=>['solo','local'].includes(room?.mode)&&room.status!=='finished'&&(room.ruleVersion||0)>=22;
export const BRIEF_FREQUENCIES=Object.freeze({rhino:99,beaver:132,anaconda:165,ants:198});
export const DEATH_INTERVAL=333,BEAVER_LIFE=9;

export const briefIcons={
 rhino:'<path d="M3 21v-7l4-5h13l6 5 3-6 1 9-5 4H5m1 0v7h4v-7m9 0v7h4v-7M8 9l2-5 4 5"/><circle cx="23" cy="14" r="1" fill="currentColor"/>',
 beaver:'<path d="M8 23C-1 29-1 15 7 16m1-3c0-7 17-7 17 0v7c0 8-17 8-17 0Zm2-1-2-5m14 5 2-5M14 23v5h5v-5m-7-7h.01m8 0h.01M2 18l4 5m-4 1 4-5"/>',
 death:'<path d="M7 22C-2 6 8 2 16 2s18 4 9 20l-3 1v7H10v-7Z"/><circle cx="11" cy="14" r="3"/><circle cx="21" cy="14" r="3"/><path d="m16 18-2 4h4ZM14 25v5m4-5v5"/>',
 'beaver-barrier':'<path d="M7 25 20 7M14 25 27 7" stroke-width="3.5"/>'
};
export function initializeBriefEcology(room){
 if(!briefEcology(room))return;
 if((room.ruleVersion||0)>=24){initializeRouteHistory(room);room.anacondas||=[];room.fogEffects||=[];}
 room.faunaEvents||=[];room.deadCells||=[];room.territoryNextDeathTurn??=(room.ecologyTurns||0)+DEATH_INTERVAL;
 if(room.briefEcologyVersion!==1){
  room.invasions=[]; // Keep occupied stars, retire their former automatic expansion.
  if(room.livingBags)room.livingBags.invaders=['invader-rain'];
  if(room.territoryPlans)room.territoryPlans.invaders='invader-rain';
  for(const r of room.rodentRaids||[])r.brief=true;
  room.briefEcologyVersion=1;
 }
 for(const w of room.worms||[])if(!w.brief){w.maxActiveTurns??=27;w.activeTurns??=0;}
}
export function faunaProtection(room){
 const safe=protectedTerritoryKeys(room),ids=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));
 for(const c of room.cells||[])if(ids.has(c.id))safe.add(key(c.x,c.y));
 return safe;
}
export function clearBriefCells(room,points){
 const safe=faunaProtection(room),hit=new Set(points.filter(c=>!isDeadCell(room,c.x,c.y)&&!safe.has(key(c.x,c.y))).map(c=>key(c.x,c.y))),removed=room.cells.filter(c=>hit.has(key(c.x,c.y))),ids=new Set(removed.map(c=>c.id));
 room.cells=room.cells.filter(c=>!ids.has(c.id));
 room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').some(k=>hit.has(k)));
 room.eatenCells=[...(room.eatenCells||[]).filter(c=>!hit.has(key(c.x,c.y))),...removed.map(({x,y})=>({x,y}))];
 for(const p of room.players)if(ids.has(p.lastMove?.id))delete p.lastMove;
 if(room.inventoryEffects){room.inventoryEffects.shields=(room.inventoryEffects.shields||[]).filter(e=>!ids.has(e.cell));room.inventoryEffects.blocks=(room.inventoryEffects.blocks||[]).filter(e=>!hit.has(key(e.x,e.y)));}
 return removed.map(({x,y})=>({x,y}));
}
const dirs=[[1,0],[0,1],[1,1],[1,-1]];
const crosses=(a,b,edges)=>{
 if(a.x===b.x||a.y===b.y)return edges.has(edgeKey({a,b}));
 const mid1={x:b.x,y:a.y},mid2={x:a.x,y:b.y};
 return [{a,b:mid1},{a:mid1,b},{a,b:mid2},{a:mid2,b}].some(e=>edges.has(edgeKey(e)));
};
// Enumerate maximal runs, not every suffix: O(4N) command work, independent of viewport.
export function rhinoRoutes(room,count=1,random=Math.random){
 const barriers=new Set((room.frontiers||[]).flatMap(f=>f.cells||[]).map(c=>key(c.x,c.y))),dead=new Set((room.deadCells||[]).map(c=>key(c.x,c.y)));
 const known=new Map(terrainOf(room).filter(c=>!dead.has(key(c.x,c.y))&&!barriers.has(key(c.x,c.y))).map(c=>[key(c.x,c.y),c])),edges=new Set(frontierSegments(room).map(edgeKey)),routes=[];
 for(const [dx,dy]of dirs)for(const a of known.values()){
  const prev={x:a.x-dx,y:a.y-dy};if(known.has(key(prev.x,prev.y))&&!crosses(prev,a,edges))continue;
  const path=[];let c=a;
  while(c){path.push({x:c.x,y:c.y});const next=known.get(key(c.x+dx,c.y+dy));if(!next||crosses(c,next,edges))break;c=next;}
  routes.push(path);
 }
 routes.sort((a,b)=>b.length-a.length||a[0].y-b[0].y||a[0].x-b[0].x);
 if(!routes.length)return [];
 if((room.ruleVersion||0)<24)return Array.from({length:count},(_,i)=>routes[i%routes.length]);
 const history=routeHistoryIndex(room,'rhino'),selected=[];
 for(let i=0;i<count;i++){
  const viable=routes.map(path=>({path,novelty:routeNovelty(path,history)})).filter(e=>e.novelty>=0);
  if(!viable.length)break;
  // Sample among longer careers, with novel terrain and different directions
  // winning over repeatedly traversed corridors. No deterministic prefix.
  const max=viable.reduce((n,e)=>Math.max(n,e.path.length),0),long=viable.filter(e=>e.path.length>=Math.max(1,max*.66));
  const minimum=long.reduce((n,e)=>Math.min(n,history.orientations.get(routeOrientation(e.path))||0),Infinity),pool=long.filter(e=>(history.orientations.get(routeOrientation(e.path))||0)===minimum);
  const weights=pool.map(e=>Math.max(.001,e.novelty*e.novelty)*e.path.length),total=weights.reduce((n,w)=>n+w,0);let ticket=Math.max(0,Math.min(.999999,random()))*total,index=0;
  while(index<pool.length-1&&ticket>=weights[index])ticket-=weights[index++];
  const path=random()<.5?[...pool[index].path].reverse():pool[index].path;
  selected.push(path);history.add(path);
 }
 return selected;
}
export function wormRoute(room,start,used=new Set()){
 const safe=faunaProtection(room),known=new Map(terrainOf(room).filter(c=>!safe.has(key(c.x,c.y))&&!used.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)).map(c=>[key(c.x,c.y),c])),occupied=new Set(room.cells.map(c=>key(c.x,c.y))),edges=new Set(frontierSegments(room).map(edgeKey));
 const seeds=[...known.values()].filter(c=>occupied.has(key(c.x,c.y))).sort((a,b)=>Math.abs(a.x-start.x)+Math.abs(a.y-start.y)-Math.abs(b.x-start.x)-Math.abs(b.y-start.y));
 for(const seed of seeds){
  const queue=[[seed]];
  for(let i=0;i<queue.length;i++){
   const path=queue[i];if(path.length===3)return path.map(({x,y})=>({x,y}));
   const a=path.at(-1),options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>known.get(key(a.x+dx,a.y+dy))).filter(b=>b&&!path.some(c=>c.x===b.x&&c.y===b.y)&&!crosses(a,b,edges));
   options.sort((a,b)=>Number(occupied.has(key(b.x,b.y)))-Number(occupied.has(key(a.x,a.y))));for(const b of options)queue.push([...path,b]);
  }
 }
 return [];
}
export function beaverSites(room,count=1){
 const terrain=terrainOf(room),occupied=new Set(room.cells.map(c=>key(c.x,c.y))),safe=faunaProtection(room),sites=[],used=new Set();
 if(!availableCells(room,room.pairs[0]).length||!expansionOptions(terrain,room.pairs[0].terrainAnchor||room.pairs[0].active,room).length)return [];
 let checks=0;
 const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y))),pool=new Map();
 for(const a of terrain)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const c={x:a.x+dx,y:a.y+dy},k=key(c.x,c.y);if(!occupied.has(k)&&!safe.has(k)&&!anchors.has(k)&&!habitatBlocked(room,c.x,c.y))pool.set(k,c);}
 for(const a of pool.values()){
  if(sites.length===count)break;
  for(const [dx,dy]of [[1,0],[0,1]]){
   const site=Array.from({length:3},(_,i)=>({x:a.x+i*dx,y:a.y+i*dy}));
   if(!site.every(c=>pool.has(key(c.x,c.y))&&!used.has(key(c.x,c.y))))continue;
   if(++checks>33)return [];
   const frontiers=[...(room.frontiers||[]),...sites.map(cells=>({type:'beaver',cells})),{type:'beaver',cells:site}],probe={...room,frontiers};
   if(!availableCells(probe,probe.pairs[0]).length||!expansionOptions(terrain,probe.pairs[0].terrainAnchor||probe.pairs[0].active,probe).length)continue;
   sites.push(site);for(const c of site)used.add(key(c.x,c.y));break;
  }
 }
 return sites.length===count?sites:[];
}
export function announceBriefFauna(room,kind,zone,now,random=Math.random){
 const large=(zone.birthScale?.[kind]||0)%2===1,count=large?3:1,paths=kind==='rhino'?rhinoRoutes(room,count,random):beaverSites(room,count);
 if(paths.length!==count)return false;
 if(kind==='rhino'&&(room.ruleVersion||0)>=24)for(const path of paths)rememberRoute(room,'rhino',path);
 const region=paths.flat(),id=crypto.randomUUID();room.faunaEvents.push({id,kind:large?kind+'-plague':kind,region,paths,x:region[0].x,y:region[0].y,turnsRemaining:3,announcedTurn:room.ecologyTurns||0,at:now});
 zone.birthScale||={};zone.birthScale[kind]=(zone.birthScale[kind]||0)+1;return true;
}
export function resolveBriefFauna(room,event,now){
 const base=event.kind.split('-')[0],actions=[],visualRoutes=[];
 if(base==='rhino'){
  const terrain=new Set(terrainOf(room).map(c=>key(c.x,c.y))),edges=new Set(frontierSegments(room).map(edgeKey)),hit=new Map();
  for(const path of event.paths){let prev=null,first=null;for(const c of path){if(!terrain.has(key(c.x,c.y))||isDeadCell(room,c.x,c.y)||(room.frontiers||[]).some(f=>f.cells?.some(p=>p.x===c.x&&p.y===c.y))||prev&&crosses(prev,c,edges))break;hit.set(key(c.x,c.y),c);first||=c;prev=c;}if(first&&prev)visualRoutes.push({from:{x:first.x,y:first.y},to:{x:prev.x,y:prev.y}});}
  actions.push(...clearBriefCells(room,[...hit.values()]).map(c=>({...c,kind:'rhino'})));
 }else{
  for(const cells of event.paths){const protectedKeys=faunaProtection(room),legal=cells.filter(c=>!isDeadCell(room,c.x,c.y)&&!protectedKeys.has(key(c.x,c.y))&&!room.cells.some(p=>p.x===c.x&&p.y===c.y)&&!habitatBlocked(room,c.x,c.y));
   if(legal.length!==3)continue;
   const barrier={id:crypto.randomUUID(),type:'beaver',cells:legal,turnsRemaining:BEAVER_LIFE,bornTurn:room.ecologyTurns||0},probe={...room,frontiers:[...(room.frontiers||[]),barrier]};
   if(!availableCells(probe,room.pairs[0]).length||!expansionOptions(terrainOf(room),room.pairs[0].terrainAnchor||room.pairs[0].active,probe).length)continue;
   room.frontiers=probe.frontiers;actions.push(...legal.map(c=>({...c,kind:'beaver'})));
  }
 }
 room.faunaEvents=room.faunaEvents.filter(e=>e.id!==event.id);
 if(actions.length||visualRoutes.length)room.habitatEvent={id:crypto.randomUUID(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions],visualRoutes:[...(room.habitatEvent?.at===now?room.habitatEvent.visualRoutes||[]:[]),...visualRoutes]};
}
export function deathRegion(room){
 const safe=faunaProtection(room),anchor=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y))),terrain=terrainOf(room),known=new Set(terrain.map(c=>key(c.x,c.y)));
 const candidates=terrain.filter(c=>!safe.has(key(c.x,c.y))&&!anchor.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y));
 candidates.sort((a,b)=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>known.has(key(b.x+dx,b.y+dy))).length-[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>known.has(key(a.x+dx,a.y+dy))).length);
 for(const c of candidates.slice(0,9)){
  const probe={...room,deadCells:[...(room.deadCells||[]),{x:c.x,y:c.y}]};
  if(availableCells(probe,probe.pairs[0]).length&&expansionOptions(terrain,probe.pairs[0].terrainAnchor||probe.pairs[0].active,probe).length)return [{x:c.x,y:c.y}];
 }
 return [];
}
