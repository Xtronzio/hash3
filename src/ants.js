import {faunaKindEnabled} from './fauna-selection.js';
import {key,terrainOf} from './game.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {habitatBlocked} from './habitat-tools.js';
import {protectedTerritoryKeys} from './immunity.js';
import {boardCellLimit} from './board-limits.js';
import {scoreLandings} from './landing-score.js';
export const ANT_FREQUENCY=198;
export const antIcon='<g data-icon="ant"><ellipse cx="16" cy="6" rx="4" ry="4"/><ellipse cx="16" cy="15" rx="3" ry="4"/><ellipse cx="16" cy="25" rx="5" ry="5"/><path d="m13 3-3-2m9 2 3-2M13 12 6 8l-4 3m11 5H5l-3 4m11 0-6 7v4m12-19 7-4 4 3m-11 5h8l3 4m-11 0 6 7v4"/></g>';
const neighbors=c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy}));
const draw=random=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));
const shuffle=(items,random)=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(draw(random)*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};
const safeKeys=room=>{const keys=protectedTerritoryKeys(room),shields=new Set((room.inventoryEffects?.shields||[]).filter(e=>e.remaining>0).map(e=>e.cell));for(const c of room.cells)if(shields.has(c.id))keys.add(key(c.x,c.y));return keys;};
export function announceAnts(room,zone,now,random=Math.random,latest=null,area=terrainOf(room)){
 if(room.variant==='inverse'||room.faunaEnabled===false||!['solo','local'].includes(room.mode)||room.faunaEvents?.some(e=>e.kind==='ants'||e.kind==='ants-plague'))return false;
 if(!faunaKindEnabled(room,(zone.birthScale?.ants||0)%2?'ants-plague':'ants'))return false;
 const count=(zone.birthScale?.ants||0)%2?33:3,known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),safe=safeKeys(room);
 if(known.size+count>boardCellLimit(room))return false;
 const allowed=new Set(area.map(c=>key(c.x,c.y))),edges=new Set(frontierSegments(room).map(edgeKey));
 const sources=shuffle(room.cells.filter(c=>allowed.has(key(c.x,c.y))&&['X','O'].includes(c.symbol)&&!(latest&&c.x===latest.x&&c.y===latest.y)&&!safe.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)),random).slice(0,count);
 if(sources.length!==count)return false;
 const pool=new Map(),forbidden=new Set((room.inventoryEffects?.blocks||[]).filter(e=>e.remaining>0).map(c=>key(c.x,c.y)));
 const offer=c=>{for(const n of neighbors(c)){const k=key(n.x,n.y);if(!edges.has(edgeKey({a:c,b:n}))&&!known.has(k)&&!safe.has(k)&&!forbidden.has(k)&&Math.abs(n.x)<=1000000&&Math.abs(n.y)<=1000000&&!habitatBlocked(room,n.x,n.y))pool.set(k,n);}};
 for(const c of area)offer(c);
 const transports=[];
 for(const c of sources){if(!pool.size)return false;const choices=[...pool.values()],to=choices[Math.floor(draw(random)*choices.length)],k=key(to.x,to.y);pool.delete(k);known.add(k);offer(to);transports.push({from:{x:c.x,y:c.y,id:c.id},to});}
 const first=transports[0].from,event={x:first.x,y:first.y,id:crypto.randomUUID(),kind:count===33?'ants-plague':'ants',transports,region:transports.flatMap(t=>[{x:t.from.x,y:t.from.y},t.to]),turnsRemaining:3,announcedTurn:room.ecologyTurns||0,at:now};
 room.faunaEvents||=[];room.faunaEvents.push(event);zone.birthScale||={};zone.birthScale.ants=(zone.birthScale.ants||0)+1;return true;
}
export function resolveAnts(room,event,now,latest=null){
 if(room.variant==='inverse'||room.faunaEnabled===false||room.status!=='playing'||!['solo','local'].includes(room.mode)||!room.faunaEvents?.some(e=>e.id===event.id))return 0;
 const known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),safe=safeKeys(room),edges=new Set(frontierSegments(room).map(edgeKey)),byId=new Map(room.cells.map(c=>[c.id,c])),before=room.cells.map(c=>({...c})),affected=[],actions=[];
 for(const {from,to} of event.transports){const c=byId.get(from.id),k=key(to.x,to.y);
  if(!c||!['X','O'].includes(c.symbol)||c.x!==from.x||c.y!==from.y||latest&&c.x===latest.x&&c.y===latest.y||safe.has(key(c.x,c.y))||safe.has(k)||known.has(k)||known.size>=boardCellLimit(room)||habitatBlocked(room,c.x,c.y)||habitatBlocked(room,to.x,to.y)||!neighbors(to).some(n=>known.has(key(n.x,n.y))&&!edges.has(edgeKey({a:to,b:n}))))continue;
  known.add(k);room.terrain.push({...to});affected.push({x:c.x,y:c.y},to);actions.push({x:c.x,y:c.y,kind:event.kind},{...to,kind:event.kind});Object.assign(c,to);
 }
 room.faunaEvents=room.faunaEvents.filter(e=>e.id!==event.id);
 if(!actions.length)return 0;
 const scores=scoreLandings(room,before,affected,{kind:event.kind});
 for(const p of room.players){const last=byId.get(p.lastMove?.id);if(last)p.lastMove={...last};const nav=byId.get(p.navigationLastMove?.id);if(nav)p.navigationLastMove={x:nav.x,y:nav.y,id:nav.id};}
 room.territoryMilestone=Math.max(room.territoryMilestone||0,Math.floor(known.size/333));
 const occupied=new Set(room.cells.map(c=>key(c.x,c.y)));room.eatenCells=[...new Map([...(room.eatenCells||[]),...affected].filter(c=>!occupied.has(key(c.x,c.y))).map(c=>[key(c.x,c.y),c])).values()];
 room.habitatEvent={id:crypto.randomUUID(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};
 const moved=actions.length/2;room.territoryImpacts=[...(room.territoryImpacts||[]),{id:event.id,kind:event.kind,at:now,affected,transported:moved,constructed:moved,scores:scores.map(({symbol,points,figures})=>({symbol,points,figures}))}].slice(-6);return moved;
}
