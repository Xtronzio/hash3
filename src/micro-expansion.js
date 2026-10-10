import {terrainOf,playableTerrain,key} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {frontierSegments,edgeKey} from './frontiers.js';
import {boardCellLimit} from './board-limits.js';
export const microLength=tool=>tool==='activate'?1:tool==='expand-2'?2:tool==='expand-3'?3:0;
const neighbors=c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy}));
function chainContext(room,length){
 const terrain=terrainOf(room),linked=playableTerrain(room,room.pairs[0]);
 const known=new Set([...terrain,...room.cells].map(c=>key(c.x,c.y))),joins=new Set(linked.map(c=>key(c.x,c.y))),edges=new Set(frontierSegments(room).map(edgeKey));
 const allowed=c=>Number.isSafeInteger(c?.x)&&Number.isSafeInteger(c?.y)&&!known.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y);
 const touch=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1&&!edges.has(edgeKey({a,b}));
 const starts=new Map();
 if(terrain.length+length<=boardCellLimit(room))for(const c of linked)for(const p of neighbors(c))if(allowed(p)&&touch(c,p))starts.set(key(p.x,p.y),p);
 return {starts,allowed,touch,joins};
}
function nextPoints(ctx,cells){
 const used=new Set(cells.map(c=>key(c.x,c.y)));
 return cells.length?neighbors(cells.at(-1)).filter(c=>ctx.allowed(c)&&!used.has(key(c.x,c.y))&&ctx.touch(cells.at(-1),c)):[...ctx.starts.values()];
}
function completable(ctx,cells,length){
 return cells.length===length||nextPoints(ctx,cells).some(c=>completable(ctx,[...cells,c],length));
}
function validPrefix(ctx,cells,length){
 return Array.isArray(cells)&&cells.length<=length&&cells.every((c,i)=>ctx.allowed(c)&&(i?ctx.touch(cells[i-1],c):ctx.starts.has(key(c.x,c.y))))&&new Set(cells.map(c=>key(c.x,c.y))).size===cells.length;
}
export function microSelectionOptions(room,length,selected=[]){
 if(![2,3].includes(length))return [];
 const ctx=chainContext(room,length);
 if(!validPrefix(ctx,selected,length)||!ctx.starts.size||selected.length===length)return [];
 return nextPoints(ctx,selected).filter(c=>completable(ctx,[...selected,c],length));
}
export function validMicroExpansion(room,length,cells){
 if(![2,3].includes(length)||!Array.isArray(cells)||cells.length!==length)return false;
 const ctx=chainContext(room,length);return ctx.starts.size>0&&validPrefix(ctx,cells,length);
}
export function microExpansionChains(room,length,limit=3){
 const ctx=chainContext(room,length),result=[];
 const visit=cells=>{if(result.length>=limit)return;if(cells.length===length){result.push(cells);return;}for(const c of nextPoints(ctx,cells))visit([...cells,c]);};
 if([2,3].includes(length)&&ctx.starts.size)visit([]);return result;
}
