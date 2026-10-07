import {habitatBlocked} from './habitat-tools.js';
import {terrainOf,connectedTerrain,key,expansionOptions} from './game.js';
import {isImmune} from './immunity.js';
import {frontierEdges,frontierDirections,edgeKey,frontierSegments,frontierCells} from './frontiers.js';

const directions=Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1]).filter(([x,y])=>x||y);
const shielded=(r,c)=>r.inventoryEffects?.shields?.some(e=>e.cell===c?.id&&e.remaining>0);
const protectedCell=(r,c)=>c&&(shielded(r,c)||isImmune(r,c.owner));
const area=(r)=>connectedTerrain(terrainOf(r),r.pairs[0].terrainAnchor||r.pairs[0].active);
export function tornadoSlots(room,point){
 const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
 return area(room).filter(c=>c.x>=point.x&&c.x<point.x+3&&c.y>=point.y&&c.y<point.y+3&&!habitatBlocked(room,c.x,c.y)&&!protectedCell(room,cells.get(key(c.x,c.y)))&&!room.inventoryEffects?.blocks?.some(b=>b.x===c.x&&b.y===c.y&&b.remaining>0));
}
export function tornadoOptions(room){
 const points=new Map(),terrain=area(room),known=new Set(terrain.map(c=>key(c.x,c.y))),cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),reserved=new Set((room.inventoryEffects?.blocks||[]).filter(b=>b.remaining>0).map(b=>key(b.x,b.y)));
 for(const c of terrain)for(let dx=-2;dx<=0;dx++)for(let dy=-2;dy<=0;dy++){const p={x:c.x+dx,y:c.y+dy};points.set(key(p.x,p.y),p);}
 return [...points.values()].filter(p=>{
  const states=new Set();for(let dx=0;dx<3;dx++)for(let dy=0;dy<3;dy++){const k=key(p.x+dx,p.y+dy),c=cells.get(k);if(known.has(k)&&!habitatBlocked(room,p.x+dx,p.y+dy)&&!reserved.has(k)&&!protectedCell(room,c))states.add(c?.symbol||'empty');}return states.size>1;
 });
}
function bombContext(room){return {terrain:new Map(area(room).map(c=>[key(c.x,c.y),c])),cells:new Map(room.cells.map(c=>[key(c.x,c.y),c])),barriers:new Set(frontierCells(room).map(c=>key(c.x,c.y)))};}
export function bombTargets(room,context=bombContext(room)){
 const {terrain,cells,barriers}=context;
 return [...terrain.values()].filter(c=>!protectedCell(room,cells.get(key(c.x,c.y)))&&(cells.has(key(c.x,c.y))||barriers.has(key(c.x,c.y))));
}
export function bombOptions(room){const context=bombContext(room);return bombTargets(room,context).filter(c=>bombBlast(room,c,()=>0,context).length===3);}
export function bombBlast(room,point,random=Math.random,context=bombContext(room)){
 const {terrain,cells,barriers}=context,barrierTarget=barriers.has(key(point.x,point.y));
 if(!terrain.has(key(point.x,point.y))||protectedCell(room,cells.get(key(point.x,point.y))))return [];
 const blast=[{x:point.x,y:point.y}],used=new Set([key(point.x,point.y)]);
 while(blast.length<3){
  const candidates=new Map();for(const c of blast)for(const [dx,dy]of directions){const p={x:c.x+dx,y:c.y+dy},k=key(p.x,p.y);if(terrain.has(k)&&!used.has(k)&&!protectedCell(room,cells.get(k)))candidates.set(k,p);}
  if(!candidates.size)break;
  const all=[...candidates.values()],filled=all.filter(c=>cells.has(key(c.x,c.y))),pool=filled.length?filled:barrierTarget?all:[];
  if(!pool.length)break;
  const chosen=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];blast.push(chosen);used.add(key(chosen.x,chosen.y));
 }
 return blast;
}
export function frontierOptions(room,side='north',actor,{pivot=false}={}){
 if(!frontierDirections.includes(side))return [];
 if(room.players.some(p=>p.id!==actor&&isImmune(room,p.id)))return [];
 const terrain=area(room),known=new Set(terrain.map(c=>key(c.x,c.y))),existing=new Set(frontierSegments(room).map(edgeKey)),points=new Map();
 if(pivot){for(const c of terrain)for(const [dx,dy]of [[0,0],[1,0],[0,1],[1,1]]){const p={x:c.x+dx,y:c.y+dy,side,pivot:true};points.set(key(p.x,p.y),p);}}
 else for(const c of terrain)for(let i=0;i<3;i++){
  const p=side==='north'?{x:c.x-i,y:c.y,side}:side==='south'?{x:c.x-i,y:c.y-2,side}:side==='west'?{x:c.x,y:c.y-i,side}:{x:c.x-2,y:c.y-i,side};points.set(key(p.x,p.y),p);
 }
 return [...points.values()].filter(p=>frontierEdges(p).every(e=>(pivot?(known.has(key(e.a.x,e.a.y))||known.has(key(e.b.x,e.b.y))):known.has(key(e.a.x,e.a.y)))&&!existing.has(edgeKey(e))&&!habitatBlocked(room,e.a.x,e.a.y)&&!habitatBlocked(room,e.b.x,e.b.y)));
}
function pruneBrokenForms(room){
 const symbols=new Map(room.cells.map(c=>[key(c.x,c.y),c.symbol]));
 room.forms=(room.forms||[]).filter(f=>f.slice(f.lastIndexOf(':')+1).split(';').every(k=>symbols.get(k)===f[0]));
}
export function applyAreaTool(room,actor,tool,point,random=Math.random){
 const old=room.cells,changed=[];
 if(tool==='tornado'){
  if(!tornadoOptions(room).some(p=>p.x===point.x&&p.y===point.y))throw new Error('Elige una zona 3×3 con fichas o huecos que puedan mezclarse.');
  const slots=tornadoSlots(room,point),inside=new Set(slots.map(c=>key(c.x,c.y))),byPosition=new Map(old.map(c=>[key(c.x,c.y),c]));
  const original=slots.map(c=>byPosition.get(key(c.x,c.y))||null),pieces=[...original];
  for(let i=pieces.length-1;i>0;i--){const j=Math.min(i,Math.floor(Math.max(0,random())*(i+1)));[pieces[i],pieces[j]]=[pieces[j],pieces[i]];}
  if(pieces.every((c,i)=>(c?.symbol||'empty')===(original[i]?.symbol||'empty'))){
   const first=pieces.findIndex(c=>(c?.symbol||'empty')!==(pieces[0]?.symbol||'empty'));[pieces[0],pieces[first]]=[pieces[first],pieces[0]];
  }
  room.cells=[...old.filter(c=>!inside.has(key(c.x,c.y))),...pieces.flatMap((c,i)=>c?[{...c,x:slots[i].x,y:slots[i].y}]:[])];
  changed.push(...slots);
  for(const p of room.players)if(p.lastMove){const c=room.cells.find(c=>c.id===p.lastMove.id);if(c)p.lastMove={...c};}
 }else if(tool==='bomb'){
  if(!bombTargets(room).some(c=>c.x===point.x&&c.y===point.y))throw new Error('Elige una ficha o una celda junto a una frontera, sin protección.');
  const blast=bombBlast(room,point,random);if(blast.length!==3)throw new Error('La bomba necesita tres celdas adyacentes sin protección.');
  const hit=new Set(blast.map(c=>key(c.x,c.y)));room.cells=old.filter(c=>!hit.has(key(c.x,c.y)));changed.push(...blast);
  // One hit breaks the complete three-segment barrier; no other card removes it.
  room.frontiers=(room.frontiers||[]).filter(f=>isImmune(room,f.by)||!f.edges.some(e=>hit.has(key(e.a.x,e.a.y))||hit.has(key(e.b.x,e.b.y))));
  room.inventoryEffects.blocks=room.inventoryEffects.blocks.filter(e=>!hit.has(key(e.x,e.y)));
  for(const p of room.players)if(p.lastMove&&!room.cells.some(c=>c.id===p.lastMove.id))delete p.lastMove;
 }else if(tool==='frontier'){
  if(!frontierOptions(room,point.side,actor,{pivot:point.pivot===true}).some(p=>p.x===point.x&&p.y===point.y))throw new Error('La frontera debe cubrir tres celdas existentes y no solapar otra barrera.');
  room.frontiers||=[];room.frontiers.push({id:crypto.randomUUID(),by:actor,edges:frontierEdges(point)});
  if(!expansionOptions(terrainOf(room),room.pairs[0].terrainAnchor||room.pairs[0].active,room).length)throw new Error('Esta frontera cerraría todas las salidas de ampliación. Elige otra cara.');
 }else throw new Error('Herramienta de zona desconocida.');
 if(tool!=='frontier')pruneBrokenForms(room);
 room.inventoryEffects.shields=room.inventoryEffects.shields.filter(e=>room.cells.some(c=>c.id===e.cell));
 return {affected:changed,removed:old.length-room.cells.length};
}
