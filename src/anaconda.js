import {faunaKindEnabled} from './fauna-selection.js';
import {key,terrainOf,availableCells,isBlockedCell} from './game.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {habitatBlocked} from './habitat-tools.js';
import {faunaProtection,clearBriefCells} from './brief-ecology.js';
import {initializeRouteHistory,routeHistoryIndex,routeNovelty,rememberRoute,compactRoute} from './fauna-routes.js';
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
 if(!faunaKindEnabled(room,'anaconda')||room.anacondas?.length)return false;
 initializeRouteHistory(room);const route=anacondaRoute(room,random);if(!route.length)return false;
 room.anacondas||=[];room.anacondas.push({id:crypto.randomUUID(),kind:'anaconda',...route[0],route,cursor:0,body:[],warningTurns:3,announcedTurn:room.ecologyTurns||0,at:now,historyIndex:(room.faunaRouteHistory||[]).length});rememberRoute(room,'anaconda',route);return true;
}
export function advanceAnacondas(room,now,ids,latest=null,random=Math.random){
 const actions=[],terrain=terrainOf(room),known=new Map(terrain.map(c=>[key(c.x,c.y),c])),safe=faunaProtection(room),edges=new Set(frontierSegments(room).map(edgeKey));
 room.anacondas=(room.anacondas||[]).filter(w=>{
  if(!ids.has(w.id)||w.warningTurns!=null)return true;
  let done=false;const visited=new Set(w.route.slice(0,w.cursor).map(c=>key(c.x,c.y))),probe={...room,anacondas:room.anacondas.filter(e=>e.id!==w.id)},free=new Set(availableCells(probe,room.pairs[0]).map(c=>key(c.x,c.y))),actor=room.pairs[0][room.pairs[0].turn.toLowerCase()];
  const legal=(c,prev)=>c&&known.has(key(c.x,c.y))&&!visited.has(key(c.x,c.y))&&!safe.has(key(c.x,c.y))&&!habitatBlocked(probe,c.x,c.y)&&!(latest&&latest.x===c.x&&latest.y===c.y)&&(!prev||Math.abs(prev.x-c.x)+Math.abs(prev.y-c.y)===1&&!edges.has(edgeKey({a:prev,b:c})));
  const options=()=>{const prev=w.cursor?w.route[w.cursor-1]:null,next=w.route[w.cursor],choices=[];if(legal(next,prev))choices.push(next);if(prev){const adjacent=four.map(([dx,dy])=>known.get(key(prev.x+dx,prev.y+dy))).filter(c=>legal(c,prev)&&(!next||c.x!==next.x||c.y!==next.y));while(adjacent.length){const c=pick(adjacent,random);choices.push(c);adjacent.splice(adjacent.indexOf(c),1);}}return choices;};
  for(let i=0;i<3;i++){
   let chosen=null,body=null;
   for(const c of options()){
    const tail=[...w.body,c].slice(-ANACONDA_BODY);
    // The body only reserves built cells: it cannot change expansion geometry.
    // Count free holes against its nine-cell footprint without rescanning N.
    if(free.size&&tail.filter(p=>free.has(key(p.x,p.y))).length===free.size)continue;
    chosen=c;body=tail;break;
   }
   if(!chosen){done=true;break;}
   const expected=w.route[w.cursor];
   if(!expected||expected.x!==chosen.x||expected.y!==chosen.y){w.route=[...w.route.slice(0,w.cursor),{x:chosen.x,y:chosen.y}];const trace=room.faunaRouteHistory?.[w.historyIndex];if(trace?.kind==='anaconda')trace.runs=compactRoute(w.route);}
   clearBriefCells(room,[chosen]);if(!isBlockedCell(probe,actor,chosen.x,chosen.y))free.add(key(chosen.x,chosen.y));visited.add(key(chosen.x,chosen.y));w.cursor++;w.x=chosen.x;w.y=chosen.y;w.body=body.map(p=>({x:p.x,y:p.y}));actions.push({x:chosen.x,y:chosen.y,kind:'anaconda'});
  }
  return !done&&options().length>0;
 });
 if(actions.length)room.habitatEvent={id:crypto.randomUUID(),kind:'habitat',at:now,actions:[...(room.habitatEvent?.at===now?room.habitatEvent.actions:[]),...actions]};
}
