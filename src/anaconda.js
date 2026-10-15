import {key,terrainOf,availableCells,expansionOptions} from './game.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {habitatBlocked} from './habitat-tools.js';
import {faunaProtection,clearBriefCells} from './brief-ecology.js';
import {initializeRouteHistory,routeHistoryIndex,routeNovelty,rememberRoute} from './fauna-routes.js';
export const ANACONDA_BODY=9,ANACONDA_INTERVAL=165;
export const anacondaIcon='<path d="M4 27c-3-8 5-13 11-8s13 1 10-5c-2-4-10-1-10-6 0-6 13-7 14 0v5m-5-5h.01M3 27h7m7-8-3 5m10-8 3 4" stroke-width="2.6"/>';
const four=[[1,0],[-1,0],[0,1],[0,-1]];
const pick=(pool,random)=>pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];
export function anacondaRoute(room,random=Math.random){
 const safe=faunaProtection(room),pool=terrainOf(room).filter(c=>!safe.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y)),known=new Map(pool.map(c=>[key(c.x,c.y),c])),edges=new Set(frontierSegments(room).map(edgeKey)),history=routeHistoryIndex(room,'anaconda');
 let best=[],value=-1;
 // Twelve self-avoiding walks, O(12N), never exhaustive path search.
 for(let attempt=0;attempt<Math.min(12,pool.length);attempt++){
  const seed=pick(pool,random),path=[{x:seed.x,y:seed.y}],seen=new Set([key(seed.x,seed.y)]);
  while(path.length<=known.size){const a=path.at(-1),options=four.map(([dx,dy])=>known.get(key(a.x+dx,a.y+dy))).filter(b=>b&&!seen.has(key(b.x,b.y))&&!edges.has(edgeKey({a,b})));if(!options.length)break;
   const min=Math.min(...options.map(b=>history.visits.get(key(b.x,b.y))||0)),b=pick(options.filter(b=>(history.visits.get(key(b.x,b.y))||0)===min),random);path.push({x:b.x,y:b.y});seen.add(key(b.x,b.y));}
  const novelty=routeNovelty(path,history),rating=novelty*Math.sqrt(path.length);if(novelty>=0&&rating>value){value=rating;best=path;}
 }
 return best;
}
export function announceAnaconda(room,now,random=Math.random){
 if(room.anacondas?.length)return false;
 initializeRouteHistory(room);const route=anacondaRoute(room,random);if(!route.length)return false;
 room.anacondas||=[];room.anacondas.push({id:crypto.randomUUID(),kind:'anaconda',...route[0],route,cursor:0,body:[],warningTurns:3,announcedTurn:room.ecologyTurns||0,at:now});rememberRoute(room,'anaconda',route);return true;
}
export function advanceAnacondas(room,now,ids,latest=null){
 const actions=[],terrain=new Set(terrainOf(room).map(c=>key(c.x,c.y))),safe=faunaProtection(room),edges=new Set(frontierSegments(room).map(edgeKey));
 room.anacondas=(room.anacondas||[]).filter(w=>{
  if(!ids.has(w.id)||w.warningTurns!=null)return true;
  let done=false;
  for(let i=0;i<3;i++){
   const c=w.route[w.cursor],prev=w.cursor?w.route[w.cursor-1]:null;if(!c){done=true;break;}
   const probe={...room,anacondas:room.anacondas.filter(e=>e.id!==w.id)};
   if(latest&&latest.x===c.x&&latest.y===c.y){done=true;break;}
   if(!terrain.has(key(c.x,c.y))||safe.has(key(c.x,c.y))||habitatBlocked(probe,c.x,c.y)||prev&&edges.has(edgeKey({a:prev,b:c}))){done=true;break;}
   const body=[...w.body,c].slice(-ANACONDA_BODY),blockedProbe={...probe,anacondas:[...(probe.anacondas||[]),{...w,body}]};
   // Never block the last playable move or the only expansion exit.
   const remaining=availableCells(blockedProbe,room.pairs[0]);
   if(!remaining.length&&availableCells(probe,room.pairs[0]).length){done=true;break;}
   if(!expansionOptions(terrainOf(room),room.pairs[0].terrainAnchor||room.pairs[0].active,blockedProbe).length){done=true;break;}
   clearBriefCells(room,[c]);w.cursor++;w.x=c.x;w.y=c.y;w.body=body.map(p=>({...p}));actions.push({...c,kind:'anaconda'});
   if(w.cursor>=w.route.length){done=true;break;}
  }
  return !done;
 });
 if(actions.length)room.habitatEvent={id:crypto.randomUUID(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};
}
