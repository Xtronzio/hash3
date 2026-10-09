import {key,terrainOf} from './game.js';
import {frontierSegments,edgeKey} from './frontiers.js';

const directions=[['north',0,1],['east',-1,0],['south',0,-1],['west',1,0]];
// Each lane starts outside the real territory and advances at most three cells.
// Saved paths are immutable: a defensive wall cannot cause a reroute behind it.
export function planInvasion(room,eligible,count,colony,random){
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
 const edges=new Set(frontierSegments(room).map(edgeKey)),defended=new Set();
 for(const {target,path} of event.paths||[])if(path.some((p,i)=>i>0&&edges.has(edgeKey({a:path[i-1],b:p}))))defended.add(key(target.x,target.y));
 return defended;
}
