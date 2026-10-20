// Prepared only on snapshots/actions, never by the navigation drawing loop.
import {prisonKeys} from './inverse-prison.js';
export function inverseNavigationKeys(room,kind){
 if(room?.variant!=='inverse'||![2,3].includes(room.inverseVersion))return [];
 if(kind==='wild')return room.cells.filter(p=>p.symbol==='#').map(p=>`${p.x},${p.y}`);
 if(kind==='fill')return room.inverseFill||[];
 if(kind==='restore')return room.inverseContour?.renewal?.targets.length?room.inverseContour.renewal.targets:room.inverseRenewalEvent?.restored||[];
 if(kind==='disorder')return room.inverseDisorder?.targets.length?room.inverseDisorder.targets.filter(k=>!prisonKeys(room).has(k)):room.inverseDisorderEvent?.affected||[];
 const fill=new Set(room.inverseFill);
 return room.inverseContour?.targets.length?room.inverseContour.targets.filter(k=>fill.has(k)&&!prisonKeys(room).has(k)):room.inverseContourEvent?.cleared||[];
}
// Bounded patches ensure even a huge connected shape yields a readable close-up.
export function inverseFocusGroups(room,tileSize=9){
 const pending=new Set(room.inverseFill||[]),tiles=new Map(),groups=[];
 for(const k of pending){const [x,y]=k.split(',').map(Number),tile=`${Math.floor(x/tileSize)},${Math.floor(y/tileSize)}`;if(!tiles.has(tile))tiles.set(tile,[]);tiles.get(tile).push({x,y});}
 for(const points of tiles.values()){
  const unused=new Set(points.map(p=>`${p.x},${p.y}`));
  for(const seed of points){if(!unused.has(`${seed.x},${seed.y}`))continue;
   const queue=[seed],patch=[];let cursor=0;
   while(cursor<queue.length&&patch.length<33){const p=queue[cursor++],k=`${p.x},${p.y}`;if(!unused.delete(k))continue;patch.push(p);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&unused.has(`${p.x+dx},${p.y+dy}`))queue.push({x:p.x+dx,y:p.y+dy});
   }
   if(patch.length)groups.push(patch);
  }
 }
 return groups;
}
