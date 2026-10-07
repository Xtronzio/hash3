import {terrainOf,connectedTerrain,key} from './game.js';
import {frontierReachable,frontierSegments,nearbyFrontierCells,frontierHit,edgeKey} from './frontiers.js';
import {habitatBlocked,habitatReservations} from './habitat-tools.js';
export const HABITAT_INTERVAL=33000;
export const HABITAT_FREQUENCIES={rodent:33,bomb:66,worm:99,work:198};
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const choose=(all,random)=>all.length?all[Math.min(all.length-1,Math.floor(Math.max(0,random())*all.length))]:null;
const uuid=()=>crypto.randomUUID();
export function initializeHabitats(room,now=Date.now()){
 room.rodents||=[];room.worms||=[];room.works||=[];room.bombs||=[];room.eatenCells||=[];
 if(room.habitatVersion===1)return;
 for(const p of room.players){
  p.placements??=room.cells.filter(c=>c.owner===p.id).length;
  p.habitatNext=Object.fromEntries(Object.entries(HABITAT_FREQUENCIES).map(([kind,n])=>[kind,(Math.floor(p.placements/n)+1)*n]));
  p.rodentNextSpawn=p.habitatNext.rodent;
 }
 // Adopt surviving animals without replaying historic milestones or old 33-meal cycles.
 room.rodents=room.rodents.map(r=>({...r,eaten:Math.min(2,r.eaten||0),phase:0,nextAt:now+HABITAT_INTERVAL}));
 room.habitatVersion=1;room.habitatLastCheck=now;
}
function areaAt(room,point){return frontierReachable(terrainOf(room),point,room);}
function occupiedByOther(room,point,id){return room.rodents.some(r=>r.id!==id&&same(r,point))||room.worms.some(w=>w.id!==id&&(w.body||[]).some(c=>same(c,point)))||habitatReservations(room).some(c=>same(c,point));}
function foodFor(room,r,random,{adjacent=false,exclude=null}={}){
 const area=new Set(areaAt(room,r).map(c=>key(c.x,c.y)));
 const candidates=room.cells.filter(c=>c.id!==exclude&&area.has(key(c.x,c.y))&&!occupiedByOther(room,c,r.id)&&(!adjacent||(Math.max(Math.abs(c.x-r.x),Math.abs(c.y-r.y))===1&&diagonalAllowed(room,r,c))));
 return choose(candidates,random);
}
function diagonalAllowed(room,a,b){
 const blocked=new Set(frontierSegments(room).map(edgeKey));
 if(a.x===b.x||a.y===b.y)return !blocked.has(edgeKey({a,b}));
 const mid1={x:a.x,y:b.y},mid2={x:b.x,y:a.y};
 return ![edgeKey({a,b:mid1}),edgeKey({a:mid1,b}),edgeKey({a,b:mid2}),edgeKey({a:mid2,b})].some(e=>blocked.has(e));
}
export function clearHabitatCell(room,point){
 const removed=room.cells.filter(c=>same(c,point));room.cells=room.cells.filter(c=>!same(c,point));
 const ids=new Set(removed.map(c=>c.id)),coordinate=key(point.x,point.y);
 room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').includes(coordinate));
 room.eatenCells=room.eatenCells.filter(c=>!same(c,point));room.eatenCells.push({x:point.x,y:point.y});
 for(const p of room.players)if(ids.has(p.lastMove?.id))delete p.lastMove;
 if(room.inventoryEffects){room.inventoryEffects.shields=(room.inventoryEffects.shields||[]).filter(e=>!ids.has(e.cell));room.inventoryEffects.blocks=(room.inventoryEffects.blocks||[]).filter(e=>!same(e,point));}
 return removed.length;
}
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
 p.placements++;room.eatenCells=room.eatenCells.filter(c=>!same(c,point));
 for(const r of room.rodents.filter(r=>same(r,point))){const target=foodFor(room,r,random,{exclude:room.cells.find(c=>same(c,point))?.id});if(target){r.x=target.x;r.y=target.y;}else{const free=areaAt(room,r).filter(c=>!same(c,point)&&!occupiedByOther(room,c,r.id));const c=choose(free,random);if(c){r.x=c.x;r.y=c.y;}}}
 for(const [kind,frequency]of Object.entries(HABITAT_FREQUENCIES)){
  if(p.placements<p.habitatNext[kind])continue;
  // A milestone is consumed once even when no legal spawn exists; no deferred floods.
  p.habitatNext[kind]=(Math.floor(p.placements/frequency)+1)*frequency;
  if(kind==='work'){project(room,point,playerId,random,now);continue;}
  if(kind==='bomb'){const blast=automaticBlast(room,point,random);if(blast)room.bombs.push({id:uuid(),player:playerId,...blast[0],blast,nextAt:now+HABITAT_INTERVAL});continue;}
  const r={id:uuid(),player:playerId,kind,x:point.x,y:point.y,eaten:0,phase:0,nextAt:now+HABITAT_INTERVAL};
  const food=foodFor(room,r,random,{exclude:room.cells.find(c=>same(c,point))?.id});
  if(food){r.x=food.x;r.y=food.y;if(kind==='worm'){r.body=[{x:r.x,y:r.y}];room.worms.push(r);}else room.rodents.push(r);}
 }
 p.rodentNextSpawn=p.habitatNext.rodent;
}
function activeAt(room,point){
 if(['solo','local'].includes(room.mode))return true;
 const area=new Set(connectedTerrain(terrainOf(room),point).map(c=>key(c.x,c.y)));
 return room.pairs.some(pair=>area.has(key((pair.terrainAnchor||pair.active).x,(pair.terrainAnchor||pair.active).y))&&room.players.some(p=>(p.id===pair.x||p.id===pair.o)&&p.active!==false&&!p.bot));
}
export function freezeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);for(const e of [...room.rodents,...room.worms,...room.works,...room.bombs])e.remainingMs=Math.max(0,(e.nextAt||now+HABITAT_INTERVAL)-now);
 room.habitatLastCheck=now;
}
export function resumeHabitats(room,now=Date.now()){
 initializeHabitats(room,now);for(const e of [...room.rodents,...room.worms,...room.works,...room.bombs]){e.nextAt=now+(e.remainingMs??HABITAT_INTERVAL);delete e.remainingMs;}room.habitatLastCheck=now;
}
export function advanceHabitats(room,now=Date.now(),random=Math.random){
 initializeHabitats(room,now);if(room.status!=='playing')return false;
 let changed=false;
 for(const e of [...room.rodents,...room.worms,...room.works,...room.bombs]){
  const point=e.kind==='work'?e.destroy[e.done]:e;
  if(!point)continue;
  if(!activeAt(room,point)){if(e.remainingMs==null)e.remainingMs=Math.max(0,e.nextAt-Math.min(now,room.habitatLastCheck??now));continue;}
  if(e.remainingMs!=null){e.nextAt=now+e.remainingMs;delete e.remainingMs;continue;}
  // No catch-up after an unobserved interval; at most one action per current cycle.
  if(e.nextAt>now)continue;
  e.nextAt=now+HABITAT_INTERVAL;
  if(e.kind==='work'){
   const remove=e.destroy[e.done],add=e.build[e.done];
   const valid=terrainOf(room).some(c=>same(c,remove))&&!room.cells.some(c=>same(c,remove))&&!terrainOf(room).some(c=>same(c,add));
   if(valid){room.terrain=terrainOf(room).filter(c=>!same(c,remove));room.terrain.push({...add});e.done++;changed=true;}
   else{room.works=room.works.filter(w=>w.id!==e.id);changed=true;}
  }else if(e.blast){
   for(const c of e.blast)clearHabitatCell(room,c);
   const hit=new Set(e.blast.map(c=>key(c.x,c.y)));room.frontiers=(room.frontiers||[]).filter(f=>!frontierHit(f,hit));
   room.bombs=room.bombs.filter(b=>b.id!==e.id);changed=true;
  }else{
   if(e.kind==='worm'&&e.eaten>=3){room.worms=room.worms.filter(w=>w.id!==e.id);changed=true;continue;}
   let food=room.cells.find(c=>same(c,e)&&!occupiedByOther(room,c,e.id));
   if(e.kind==='worm'&&e.eaten>0)food=foodFor(room,e,random,{adjacent:true});
   else food||=foodFor(room,e,random);
   if(!food)continue;
   clearHabitatCell(room,food);e.x=food.x;e.y=food.y;e.eaten++;changed=true;
   if(e.kind==='worm'){e.body.push({x:e.x,y:e.y});e.body=[...new Map(e.body.map(c=>[key(c.x,c.y),c])).values()].slice(-3);}
   else if(e.eaten>=3)room.rodents=room.rodents.filter(r=>r.id!==e.id);
   else{const target=foodFor(room,e,random);if(target){e.x=target.x;e.y=target.y;}}
  }
 }
 room.works=room.works.filter(w=>w.done<3);
 room.habitatLastCheck=now;
 if(changed){room.habitatEvent={id:uuid(),kind:'habitat',at:now};}
 return changed;
}
export function habitatLabel(room,playerId){
 const p=room.players.find(p=>p.id===playerId),count=p?.placements||0;
 const rats=(room.rodents||[]).filter(e=>e.player===playerId).length,worms=(room.worms||[]).filter(e=>e.player===playerId).length;
 return `Fichas ${count} · Roedor ${33-count%33} · Bomba ${66-count%66} · Gusano ${99-count%99} · Obra ${198-count%198}${rats||worms?` · activos R${rats}/G${worms}`:''}`;
}
export const habitatIcons={worm:'<path d="M6 23c-5-6 0-8 5-7s8-2 8-7c0-4 8-5 8 0s-3 7-7 6-5 4-4 8-6 7-10 0Z"/><path d="m8 17 3 5m4-8 4 4m4-12h.01m-3 14 4 3"/>',build:'<path d="M5 25V13m22 12V13M3 13h26M7 13V9a9 9 0 0 1 18 0v4M12 3v10m8-10v10M10 23h12m-6-6v12"/>',destroy:'<path d="m6 4 22 24M4 11l8-8 5 5-8 8ZM6 27h7m4 0h9m-11-5 3-4m-8 4-2-3"/>',bomb:'<circle cx="15" cy="19" r="10"/><path d="m19 10 3-4 4 1m-2-5 2 1m4 0-2 2M9 16l3-3"/>'};
export function habitatMark(kind,label=''){return `<span class="habitat-mark habitat-${kind}"><svg viewBox="0 0 32 32" aria-hidden="true">${habitatIcons[kind]||habitatIcons.worm}</svg>${label?`<b>${label}</b>`:''}</span>`;}
export function habitatMapPins(room){
 const items=[...(room.rodents||[]).map(r=>({...r,kind:'rodent'})),...(room.worms||[]).map(w=>({...w,kind:'worm'})),...(room.works||[]).flatMap(w=>[{...w,...w.destroy[w.done],kind:'destroy'},{...w,...w.build[w.done],kind:'build'}]),...(room.bombs||[]).map(b=>({...b,kind:'bomb'}))];
 return items.filter(e=>Number.isFinite(e.x)).map(e=>`<g class="map-rodent-pin" data-x="${e.x+.5}" data-y="${e.y+.5}"><title>${e.kind==='rodent'?'Roedor':e.kind==='worm'?'Gusano':e.kind==='bomb'?'Bomba automática':e.kind==='build'?'Constructor':'Destructor'} · ${e.eaten??e.done??0}/3</title><circle r="13" fill="#151109" stroke="${e.kind==='build'?'var(--green)':e.kind==='destroy'?'var(--red)':'var(--yellow)'}" stroke-width="2"/><svg x="-10" y="-10" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="var(--yellow)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${habitatIcons[e.kind]||'<path d="M7 14c0-8 18-8 18 0v7c0 7-18 7-18 0ZM10 11a4 4 0 1 0-4 4m16-4a4 4 0 1 1 4 4M12 17h.01M20 17h.01m-6 4 2 2 2-2"/>'}</svg></g>`).join('');
}
