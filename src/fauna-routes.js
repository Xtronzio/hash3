// Persistent, compact traces. Expanded only while planning an appearance.
const key=p=>`${p.x},${p.y}`;
const edge=(a,b)=>[key(a),key(b)].sort().join(';');
export function compactRoute(path){
 const runs=[];let from=path[0],last=from,dx=null,dy=null;
 for(const p of path.slice(1)){const x=p.x-last.x,y=p.y-last.y;if(dx!==null&&(x!==dx||y!==dy)){runs.push({from,to:last});from=last;}dx=x;dy=y;last=p;}
 if(from)runs.push({from:{x:from.x,y:from.y},to:{x:last.x,y:last.y}});return runs;
}
export function routePoints(runs){
 const result=[];for(const {from,to} of runs||[]){const dx=Math.sign(to.x-from.x),dy=Math.sign(to.y-from.y),n=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));for(let i=0;i<=n;i++){const p={x:from.x+i*dx,y:from.y+i*dy};if(!result.length||key(result.at(-1))!==key(p))result.push(p);}}return result;
}
export function initializeRouteHistory(room){
 if(room.faunaRouteVersion===1)return;
 room.faunaRouteHistory||=[];
 // Only traces actually retained in old saves can be recovered.
 for(const e of room.faunaEvents||[])if(e.kind.startsWith('rhino'))for(const path of e.paths||[])rememberRoute(room,'rhino',path);
 for(const r of room.habitatEvent?.visualRoutes||[])rememberRoute(room,'rhino',routePoints([r]));
 room.faunaRouteVersion=1;
}
export function rememberRoute(room,kind,path){
 if(!path.length)return;room.faunaRouteHistory||=[];
 room.faunaRouteHistory.push({kind,runs:compactRoute(path)});
}
export function routeHistoryIndex(room,kind){
 const edges=new Set(),visits=new Map(),orientations=new Map();
 const add=path=>{if(path.length>1){const d=routeOrientation(path);orientations.set(d,(orientations.get(d)||0)+1);}for(let i=0;i<path.length;i++){const k=key(path[i]);visits.set(k,(visits.get(k)||0)+1);if(i)edges.add(edge(path[i-1],path[i]));}};
 for(const r of room.faunaRouteHistory||[])if(r.kind===kind)add(routePoints(r.runs));
 return {edges,visits,orientations,add};
}
export function routeOrientation(path){const a=path[0],b=path.at(-1),dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);return `${Math.abs(dx)},${dx<0?-dy:dx===0?Math.abs(dy):dy}`;}
export function routeNovelty(path,index){
 if(!path.length)return -1;
 if(path.length===1)return index.visits.has(key(path[0]))?-1:1;
 let repeated=0,visits=0;
 for(let i=0;i<path.length;i++){visits+=index.visits.get(key(path[i]))||0;if(i&&index.edges.has(edge(path[i-1],path[i])))repeated++;}
 // Reject the same corridor, including reversed runs and trimmed endpoints.
 if(repeated/(path.length-1)>=.8)return -1;
 return (1-repeated/(path.length-1))/(1+visits/path.length);
}
