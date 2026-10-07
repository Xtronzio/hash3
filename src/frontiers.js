const key=(x,y)=>`${x},${y}`;
export const frontierDirections=['north','east','south','west'];
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
export function frontierSegments(room){return (room.frontiers||[]).flatMap(f=>f.edges.map(edge=>({...edge,id:f.id,by:f.by})));}
export function frontierCells(room){
 const points=new Map();for(const {a,b}of frontierSegments(room)){points.set(key(a.x,a.y),a);points.set(key(b.x,b.y),b);}return [...points.values()];
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
 return {known:new Set(terrain.map(c=>key(c.x,c.y))),reached:new Set(frontierReachable(terrain,start,room).map(c=>key(c.x,c.y))),blocked:new Set(frontierSegments(room).map(edgeKey))};
}
export function expansionCrossesFrontier(terrain,start,point,room,context){
 if(!room?.frontiers?.length)return false;
 const {known,reached,blocked}=context||expansionFrontierContext(terrain,start,room),tiles=Array.from({length:9},(_,i)=>({x:point.x+i%3,y:point.y+Math.floor(i/3)})),inside=new Set(tiles.map(c=>key(c.x,c.y))),queue=[],seen=new Set();
 for(const a of tiles)if(reached.has(key(a.x,a.y))||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const b={x:a.x+dx,y:a.y+dy};return reached.has(key(b.x,b.y))&&!blocked.has(edgeKey({a,b}));}))queue.push(a);
 for(let i=0;i<queue.length;i++){const a=queue[i],k=key(a.x,a.y);if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:a.x+dx,y:a.y+dy};if(inside.has(key(b.x,b.y))&&!blocked.has(edgeKey({a,b})))queue.push(b);}}
 return tiles.some(c=>!known.has(key(c.x,c.y))&&!seen.has(key(c.x,c.y)));
}
export function frontierLine({a,b}){
 return a.x===b.x?{x1:a.x,y1:Math.max(a.y,b.y),x2:a.x+1,y2:Math.max(a.y,b.y)}:{x1:Math.max(a.x,b.x),y1:a.y,x2:Math.max(a.x,b.x),y2:a.y+1};
}
export function frontierMarkup(room){
 return `<g class="map-frontiers" stroke="var(--yellow)" stroke-width="3" stroke-linecap="square">${frontierSegments(room).map(edge=>{const p=frontierLine(edge);return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" vector-effect="non-scaling-stroke"><title>Frontera · solo se rompe con Bomba</title></line>`;}).join('')}</g>`;
}

// Preserve the selected pivot across exact 90-degree clockwise rotations.
export function rotateFrontier(selection){const i=frontierDirections.indexOf(selection.side||'north');return {...selection,side:frontierDirections[(i+1)%4]};}
