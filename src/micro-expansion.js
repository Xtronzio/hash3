import {terrainOf,playableTerrain,key} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {boardCellLimit} from './board-limits.js';
export const microLength=tool=>tool==='activate'?1:tool==='expand-2'?2:tool==='expand-3'?3:0;
export function microExpansionOptions(room,length,orientation='horizontal'){
 if(![1,2,3].includes(length)||!['horizontal','vertical'].includes(orientation))return [];
 const terrain=terrainOf(room),linked=playableTerrain(room,room.pairs[0]);
 if(terrain.length+length>boardCellLimit(room))return [];
 const known=new Set(terrain.map(c=>key(c.x,c.y))),joins=new Set(linked.map(c=>key(c.x,c.y))),edges=new Set(frontierSegments(room).map(edgeKey)),pool=new Map();
 const dx=orientation==='horizontal'?1:0,dy=1-dx;
 for(const c of linked)for(const [nx,ny]of [[1,0],[-1,0],[0,1],[0,-1]])for(let i=0;i<length;i++){
  const origin={x:c.x+nx-i*dx,y:c.y+ny-i*dy},k=key(origin.x,origin.y);if(pool.has(k))continue;
  const cells=Array.from({length},(_,j)=>({x:origin.x+j*dx,y:origin.y+j*dy}));
  if(cells.some(p=>known.has(key(p.x,p.y))||habitatBlocked(room,p.x,p.y)))continue;
  if(cells.some((p,j)=>j>0&&edges.has(edgeKey({a:cells[j-1],b:p}))))continue;
  const connected=cells.some(p=>[[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>{const q={x:p.x+x,y:p.y+y};return joins.has(key(q.x,q.y))&&!edges.has(edgeKey({a:p,b:q}));}));
  if(connected)pool.set(k,{...origin,length,orientation,cells});
 }
 return [...pool.values()];
}
