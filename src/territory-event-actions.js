// #3_11: geometría y efectos de eventos. Ninguna de estas funciones se
// ejecuta durante pan, zoom ni pintado de la ventana visible.
import {terrainOf,key} from './game.js';
import {protectedTerritoryKeys,isImmune} from './immunity.js';
import {habitatBlocked} from './habitat-tools.js';
import {EVENT_BALANCE,eventRule,impactCount} from './territory-event-rules.js';

const choose=(list,random)=>list[Math.min(list.length-1,Math.floor(Math.max(0,random())*list.length))];
const four=[[1,0],[-1,0],[0,1],[0,-1]];
const randomSubset=(items,count,random)=>{
 const pool=[...items],result=[];
 while(pool.length&&result.length<count){
  const i=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));
  result.push(pool[i]);pool[i]=pool[pool.length-1];pool.pop();
 }
 return result;
};
const immutable=(room,now)=>{
 const result=protectedTerritoryKeys(room,now);
 for(const c of room.cells)if(isImmune(room,c.owner,now))result.add(key(c.x,c.y));
 return result;
};
const allowed=(room,now)=>{const blocked=immutable(room,now);return terrainOf(room).filter(c=>!blocked.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y));};
const localCluster=(room,count,random,now)=>{
 const pool=allowed(room,now),indices=new Map(pool.map(c=>[key(c.x,c.y),c]));
 const seeds=randomSubset(pool,Math.min(8,pool.length),random);
 let best=[];
 for(const seed of seeds){
  const queue=[seed],seen=new Set([key(seed.x,seed.y)]),region=[];
  for(let j=0;j<queue.length&&region.length<count;j++){
   const p=queue[j];region.push(p);
   for(const [dx,dy]of four){
    const k=key(p.x+dx,p.y+dy);
    if(!seen.has(k)&&indices.has(k)){seen.add(k);queue.push(indices.get(k));}
   }
  }
  if(region.length>=count)return region;
  if(region.length>best.length)best=region;
 }
 return best.length===count?best:[];
};
const wholeSquare=(room,side,random,now)=>{
 const candidates=allowed(room,now),eligible=new Set(candidates.map(c=>key(c.x,c.y))),squares=[];
 for(const p of candidates){
  const block=Array.from({length:side*side},(_,i)=>({x:p.x+i%side,y:p.y+Math.floor(i/side)}));
  if(block.every(c=>eligible.has(key(c.x,c.y))))squares.push(block);
 }
 return squares.length?choose(squares,random):[];
};
export function plannedEventRegion(room,kind,random=Math.random,now=Date.now()){
 const r=eventRule(kind);if(!r)return [];
 const count=impactCount(room,kind);
 if(!count)return [];
 if(kind==='blackhole'||kind==='invader-colony')return wholeSquare(room,3,random,now);
 if(kind==='invader-rain')return randomSubset(allowed(room,now),count,random);
 if(kind==='pandemic'){
  const protectedKeys=immutable(room,now),available=new Set(terrainOf(room).map(c=>key(c.x,c.y)));
  return randomSubset(room.cells.filter(c=>available.has(key(c.x,c.y))&&!protectedKeys.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)),count,random).map(c=>({x:c.x,y:c.y}));
 }
 if(kind==='tornado-rain'){
  // Independently placed 3×3 storms, small and scattered across the map.
  const pool=new Map(allowed(room,now).map(c=>[key(c.x,c.y),c]));
  const groups=[],used=new Set(),seeds=randomSubset([...pool.values()],pool.size,random);
  for(const seed of seeds){
   if(groups.flat().length>=count)break;
   const group=[];
   for(let y=seed.y;y<seed.y+EVENT_BALANCE.dispersedTornadoSide;y++)
    for(let x=seed.x;x<seed.x+EVENT_BALANCE.dispersedTornadoSide;x++){
     const k=key(x,y);if(pool.has(k)&&!used.has(k)&&groups.flat().length+group.length<count)group.push(pool.get(k));
    }
   if(group.length<2)continue;
   groups.push(group);for(const p of group)used.add(key(p.x,p.y));
  }
  return {region:groups.flat(),groups};
 }
 if(kind==='hurricane')return localCluster(room,count,random,now);
 if(kind==='meteorites'||kind==='rain'){
  const anchors=new Set(room.pairs.map(p=>key((p.terrainAnchor||p.active).x,(p.terrainAnchor||p.active).y)));
  return randomSubset(allowed(room,now).filter(c=>!anchors.has(key(c.x,c.y))),count,random);
 }
 // This also preserves the UFO's existing compact targeted nature.
 if(kind==='ufo')return localCluster(room,count,random,now).filter(c=>room.cells.some(p=>p.x===c.x&&p.y===c.y));
 if(kind==='earthquake'||kind==='cataclysm')return localCluster(room,count,random,now).filter(c=>!room.pairs.some(p=>{const a=p.terrainAnchor||p.active;return a.x===c.x&&a.y===c.y;}));
 return [];
}
function randomGenerator(id){
 let state=2166136261;for(const c of String(id))state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function shuffle(room,region,random,blocked){
 const set=new Set(region.map(c=>key(c.x,c.y)));
 const slots=region.filter(c=>!blocked.has(key(c.x,c.y)));
 if(slots.length<2)return [];
 const current=new Map(room.cells.filter(c=>set.has(key(c.x,c.y))).map(c=>[key(c.x,c.y),c]));
 const before=slots.map(p=>current.get(key(p.x,p.y))||null),after=[...before];
 for(let i=after.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[after[j],after[i]]=[after[i],after[j]];}
 if(after.every((p,i)=>p===before[i])){
  const other=after.findIndex((p,i)=>p!==after[0]);if(other>=0)[after[0],after[other]]=[after[other],after[0]];
 }
 const affected=new Set(slots.map(c=>key(c.x,c.y)));
 room.cells=room.cells.filter(c=>!affected.has(key(c.x,c.y)));
 for(let i=0;i<slots.length;i++)if(after[i])room.cells.push({...after[i],x:slots[i].x,y:slots[i].y});
 return slots;
}
// Mutates pieces only, not terrain. Demolition/removal of works/walls is still
// handled by the calling territory engine, keeping its historical protections.
export function applyPlannedEvent(room,event,now=Date.now()){
 const rule=eventRule(event.kind);if(!rule)return {hit:new Set(),actions:[],demolish:false};
 const blocked=immutable(room,now),known=new Set(terrainOf(room).map(c=>key(c.x,c.y)));
 const region=(event.region||[]).filter(c=>known.has(key(c.x,c.y))&&!blocked.has(key(c.x,c.y)));
 const actions=[],hit=new Set(region.map(c=>key(c.x,c.y)));
 const random=randomGenerator(event.id);
 if(rule.effect==='shuffle'){
  const groups=event.kind==='tornado-rain'?event.groups||[region]:[region];
  for(const group of groups)actions.push(...shuffle(room,group,random,blocked).map(c=>({...c,kind:event.kind})));
 }else if(rule.effect==='blackhole'){
  // Clear the 3×3 core; only shuffle existing surrounding terrain within
  // three Chebyshev steps of the core, never inventing/removing cells.
  room.cells=room.cells.filter(c=>!hit.has(key(c.x,c.y)));
  actions.push(...region.map(c=>({...c,kind:'blackhole'})));
  const x0=Math.min(...region.map(c=>c.x)),x1=Math.max(...region.map(c=>c.x));
  const y0=Math.min(...region.map(c=>c.y)),y1=Math.max(...region.map(c=>c.y));
  const halo=terrainOf(room).filter(c=>!hit.has(key(c.x,c.y))&&!blocked.has(key(c.x,c.y))&&
   c.x>=x0-EVENT_BALANCE.blackholeHalo&&c.x<=x1+EVENT_BALANCE.blackholeHalo&&
   c.y>=y0-EVENT_BALANCE.blackholeHalo&&c.y<=y1+EVENT_BALANCE.blackholeHalo);
  actions.push(...shuffle(room,halo,random,blocked).map(c=>({...c,kind:'blackhole'})));
  for(const p of halo)hit.add(key(p.x,p.y));
 }else{
  room.cells=room.cells.filter(c=>!hit.has(key(c.x,c.y)));
  if(rule.effect==='colonize'){
   for(const c of region)room.cells.push({...c,id:crypto.randomUUID(),symbol:'*',owner:null,invader:true});
  }
  actions.push(...region.map((c,i)=>({...c,kind:event.kind,...(rule.distribution==='dispersed'?{group:Math.floor(i/3)}:{})})));
 }
 return {hit,actions,demolish:rule.effect==='demolish'};
}
