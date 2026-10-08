const key=(x,y)=>`${x},${y}`;
export const frontierDirections=['north','east','south','west'];
// New walls occupy one unbuilt cell. Saved cell arrays and edge barriers retain
// their original footprint and blocking semantics.
export function frontierTiles({x,y,side='north'}){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!frontierDirections.includes(side))return [];
 return [{x,y}];
}
export function frontierFootprint(frontier,room){
 if(frontier.cells)return frontier.cells;
 // Display saved edge barriers as three diamonds without losing their old blocking rules.
 const known=new Set((room.terrain||[]).map(c=>key(c.x,c.y)));
 return (frontier.edges||[]).map(({a,b})=>known.has(key(b.x,b.y))?a:b);
}
export function frontierGroups(room){return (room.frontiers||[]).map(f=>({...f,cells:frontierFootprint(f,room)}));}
export function isFrontierCell(room,x,y){return (room.frontiers||[]).some(f=>f.cells?.some(c=>c.x===x&&c.y===y));}
export function frontierHit(frontier,hit){return frontier.cells?frontier.cells.some(c=>hit.has(key(c.x,c.y))):(frontier.edges||[]).some(({a,b})=>hit.has(key(a.x,a.y))||hit.has(key(b.x,b.y)));}
export function frontierEdges({x,y,side,pivot=false}){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!frontierDirections.includes(side))return [];
 if(pivot)return Array.from({length:3},(_,i)=>{
  if(side==='north')return {a:{x:x+i,y:y-1},b:{x:x+i,y}};
  if(side==='east')return {a:{x:x-1,y:y+i},b:{x,y:y+i}};
  if(side==='south')return {a:{x:x-i-1,y:y-1},b:{x:x-i-1,y}};
  return {a:{x:x-1,y:y-i-1},b:{x,y:y-i-1}};
 });
 return Array.from({length:3},(_,i)=>{
  const a=side==='north'?{x:x+i,y}:side==='south'?{x:x+i,y:y+2}:side==='west'?{x,y:y+i}:{x:x+2,y:y+i};
  const b={x:a.x+(side==='east'?1:side==='west'?-1:0),y:a.y+(side==='south'?1:side==='north'?-1:0)};
  return {a,b};
 });
}
export const edgeKey=({a,b})=>[key(a.x,a.y),key(b.x,b.y)].sort().join('|');
export function frontierSegments(room){return (room.frontiers||[]).flatMap(f=>{
 if(!f.cells)return (f.edges||[]).map(edge=>({...edge,id:f.id,by:f.by}));
 const inside=new Set(f.cells.map(c=>key(c.x,c.y)));
 return f.cells.flatMap(a=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({a,b:{x:a.x+dx,y:a.y+dy}})).filter(({b})=>!inside.has(key(b.x,b.y)))).map(edge=>({...edge,id:f.id,by:f.by}));
});}
export function frontierCells(room){
 const points=new Map();for(const c of frontierGroups(room).flatMap(f=>f.cells))points.set(key(c.x,c.y),c);return [...points.values()];
}
export function nearbyFrontierCells(room,terrain){
 const linked=new Set(terrain.map(c=>key(c.x,c.y)));
 return frontierGroups(room).filter(f=>f.cells.some(c=>linked.has(key(c.x,c.y))||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>linked.has(key(c.x+dx,c.y+dy))))).flatMap(f=>f.cells);
}
export function frontierReachable(terrain,start,room){
 const known=new Map(terrain.map(c=>[key(c.x,c.y),c])),blocked=new Set(frontierSegments(room).map(edgeKey)),seen=new Set(),queue=[start];
 for(let i=0;i<queue.length;i++){
  const a=queue[i],k=key(a.x,a.y);if(seen.has(k)||!known.has(k))continue;seen.add(k);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:a.x+dx,y:a.y+dy};if(!blocked.has(edgeKey({a,b})))queue.push(b);}
 }
 return terrain.filter(c=>seen.has(key(c.x,c.y)));
}
export function expansionFrontierContext(terrain,start,room){
 if(!room?.frontiers?.length)return null;
 // Cell walls cannot exclude another built island from local expansion. Preserve
 // the blocking semantics of old saved edge walls until they are removed.
 const reached=['solo','local'].includes(room.mode)&&!room.frontiers.some(f=>f.edges?.length)?terrain:frontierReachable(terrain,start,room);
 return {known:new Set(terrain.map(c=>key(c.x,c.y))),reached:new Set(reached.map(c=>key(c.x,c.y))),blocked:new Set(frontierSegments(room).map(edgeKey))};
}
export function expansionCrossesFrontier(terrain,start,point,room,context){
 if(!room?.frontiers?.length)return false;
 const {known,reached,blocked}=context||expansionFrontierContext(terrain,start,room),tiles=Array.from({length:9},(_,i)=>({x:point.x+i%3,y:point.y+Math.floor(i/3)})),inside=new Set(tiles.map(c=>key(c.x,c.y))),queue=[],seen=new Set();
 for(const a of tiles)if(reached.has(key(a.x,a.y))||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const b={x:a.x+dx,y:a.y+dy};return reached.has(key(b.x,b.y))&&!blocked.has(edgeKey({a,b}));}))queue.push(a);
 for(let i=0;i<queue.length;i++){const a=queue[i],k=key(a.x,a.y);if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:a.x+dx,y:a.y+dy};if(inside.has(key(b.x,b.y))&&!blocked.has(edgeKey({a,b})))queue.push(b);}}
 return tiles.some(c=>isFrontierCell(room,c.x,c.y)||!known.has(key(c.x,c.y))&&!seen.has(key(c.x,c.y)));
}
export function frontierLine({a,b}){
 return a.x===b.x?{x1:a.x,y1:Math.max(a.y,b.y),x2:a.x+1,y2:Math.max(a.y,b.y)}:{x1:Math.max(a.x,b.x),y1:a.y,x2:Math.max(a.x,b.x),y2:a.y+1};
}
export function frontierMarkup(room){
 return `<g class="map-frontiers" fill="#171020" stroke="var(--frontier,#c18aff)" stroke-width="1.5">${frontierCells(room).map(c=>`<g><rect x="${c.x+.05}" y="${c.y+.05}" width=".9" height=".9" vector-effect="non-scaling-stroke"/><path d="M${c.x+.5} ${c.y+.2}l.3 .3-.3 .3-.3-.3Z" fill="none" vector-effect="non-scaling-stroke"/><title>Muro · solo se rompe con Bomba</title></g>`).join('')}</g>`;
}
export const frontierDiamond='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 9-9 9-9-9Z"/></svg>';

// A second tap on the chosen expansion anchor places the chosen single cell.
export function selectFrontier(selection,point,anchors){
 if(selection.point?.x===point.x&&selection.point?.y===point.y)return {selected:selection,confirm:true};
 const anchor=anchors.find(a=>a.x===point.x&&a.y===point.y);
 if(!anchor)return {selected:selection,confirm:false};
 return {selected:{...selection,point:{x:point.x,y:point.y},side:anchor.side},confirm:false};
}
