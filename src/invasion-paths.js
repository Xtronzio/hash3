import {key,terrainOf} from './game.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {localLiving} from './living-balance.js';
import {habitatBlocked} from './habitat-tools.js';
import {protectedTerritoryKeys} from './immunity.js';

const directions=[['north',0,1],['east',-1,0],['south',0,-1],['west',1,0]];
// Each lane starts outside the real territory and advances at most three cells.
// Saved paths are immutable: a defensive wall cannot cause a reroute behind it.
export function planInvasion(room,eligible,count,colony,random){
 if(localLiving(room)){
  const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),invaded=new Set(room.cells.filter(c=>c.symbol==='*').map(c=>key(c.x,c.y))),choices=[];
  for(const origin of eligible)if(!invaded.has(key(origin.x,origin.y)))for(const [side,dx,dy] of directions){
   const outside={x:origin.x-dx,y:origin.y-dy};
   if(!known.has(key(outside.x,outside.y))){choices.push({group:[{x:origin.x,y:origin.y}],paths:[{target:origin,path:[outside,origin]}],approach:{...origin,side}});break;}
  }
  const groups=[],paths=[],approaches=[];
  while(choices.length&&groups.length<count){const i=Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length)),c=choices.splice(i,1)[0];groups.push(c.group);paths.push(...c.paths);approaches.push(c.approach);}
  return {region:groups.flat(),groups,paths,approaches,seeded:true};
 }
 const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),allowed=new Set(eligible.map(c=>key(c.x,c.y))),choices=[];
 for(const origin of eligible)for(const [side,dx,dy] of directions){
  const group=[],paths=[];
  for(let lane=0;lane<(colony?3:1);lane++){
   const entry={x:origin.x+(dy?lane:0),y:origin.y+(dx?lane:0)},outside={x:entry.x-dx,y:entry.y-dy};
   if(known.has(key(outside.x,outside.y)))break;
   const path=[outside];
   for(let depth=0;depth<(colony?3:1);depth++){
    const target={x:entry.x+depth*dx,y:entry.y+depth*dy};
    if(!allowed.has(key(target.x,target.y)))break;
    path.push(target);group.push(target);paths.push({target,path:[...path]});
   }
  }
  if(group.length===(colony?9:1))choices.push({group,paths,approach:{...origin,side}});
 }
 const used=new Set(),groups=[],paths=[],approaches=[];
 // Partial Fisher-Yates: bounded selection and no repeated chosen cells.
 while(choices.length&&groups.flat().length<count){
  const i=Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length)),choice=choices[i];choices[i]=choices.at(-1);choices.pop();
  if(choice.group.some(c=>used.has(key(c.x,c.y))))continue;
  groups.push(choice.group);paths.push(...choice.paths);approaches.push(choice.approach);for(const c of choice.group)used.add(key(c.x,c.y));
 }
 return {region:groups.flat(),groups,paths,approaches};
}
export function defendedInvasionCells(room,event){
 const edges=new Set(frontierSegments(room).map(edgeKey)),walls=new Set((room.frontiers||[]).flatMap(f=>f.cells||[]).map(c=>key(c.x,c.y))),defended=new Set();
 for(const {target,path} of event.paths||[])if(path.some((p,i)=>walls.has(key(p.x,p.y))||i>0&&edges.has(edgeKey({a:path[i-1],b:p}))))defended.add(key(target.x,target.y));
 return defended;
}
export function initializeInvasions(room){
 if(!localLiving(room)||room.status==='finished')return;
 room.invasions||=[];
 if(room.invasionVersion===1)return;
 // Existing * cells remain untouched. Pending old 3×3 warnings become seeds
 // without resetting their deadline or inventing past growth.
 for(const e of room.territoryEvents||[])if(e.kind==='invader-colony'&&!e.seeded){
  const groups=(e.groups?.length?e.groups:[e.region]).filter(g=>g.length).map(g=>[g[0]]),keys=new Set(groups.flat().map(c=>key(c.x,c.y)));
  e.groups=groups;e.region=groups.flat();e.paths=(e.paths||[]).filter(p=>keys.has(key(p.target.x,p.target.y)));e.seeded=true;
 }
 room.invasionVersion=1;
}
export function seedInvasions(room,region,kind){
 initializeInvasions(room);
 for(const c of region){
  const id=crypto.randomUUID();room.invasions.push({id,kind,grown:1,failed:0,visited:[{x:c.x,y:c.y}]});
  room.cells.push({x:c.x,y:c.y,id:crypto.randomUUID(),symbol:'*',owner:null,invader:true,invasionId:id});
 }
}
export function advanceInvasions(room,now=Date.now(),random=Math.random,exclude=null){
 initializeInvasions(room);if(!localLiving(room)||room.status!=='playing'||room.territoryEnabled===false)return [];
 const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),occupied=new Map(room.cells.map(c=>[key(c.x,c.y),c])),protectedKeys=protectedTerritoryKeys(room,now),edges=new Set(frontierSegments(room).map(edgeKey)),actions=[];
 const shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));
 for(const [k,c] of occupied)if(shields.has(c.id))protectedKeys.add(k);
 for(const colony of room.invasions){
  if(colony.grown>=9)continue;
  const alive=room.cells.filter(c=>c.invasionId===colony.id&&c.symbol==='*');
  if(!alive.length){colony.failed=3;continue;}
  const visited=new Set(colony.visited.map(c=>key(c.x,c.y))),candidates=new Map();
  for(const a of alive)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const b={x:a.x+dx,y:a.y+dy},k=key(b.x,b.y),piece=occupied.get(k);
   if(known.has(k)&&!visited.has(k)&&piece?.symbol!=='*'&&piece?.id!==exclude&&!protectedKeys.has(k)&&!habitatBlocked(room,b.x,b.y)&&!edges.has(edgeKey({a,b})))candidates.set(k,b);
  }
  const pool=[...candidates.values()];
  if(!pool.length){colony.failed++;continue;}
  const c=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))],k=key(c.x,c.y),old=occupied.get(k),piece={...c,id:crypto.randomUUID(),symbol:'*',owner:null,invader:true,invasionId:colony.id};
  room.cells=room.cells.filter(p=>key(p.x,p.y)!==k);room.cells.push(piece);occupied.set(k,piece);
  room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').includes(k));
  for(const p of room.players)if(p.lastMove?.id===old?.id)delete p.lastMove;
  if(room.inventoryEffects){room.inventoryEffects.shields=room.inventoryEffects.shields.filter(e=>e.cell!==old?.id);room.inventoryEffects.blocks=room.inventoryEffects.blocks.filter(e=>key(e.x,e.y)!==k);}
  colony.grown++;colony.failed=0;colony.visited.push(c);actions.push({...c,kind:colony.kind});
 }
 room.invasions=room.invasions.filter(c=>c.grown<9&&c.failed<3);
 return actions;
}
