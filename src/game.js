import {isImmune} from './immunity.js';
export const key = (x, y) => `${x},${y}`;
export function rankedPlayers(players,byMax=false) { return [...players].sort((a,b)=>(byMax?((b.max?.value??-1)-(a.max?.value??-1)):b.score-a.score)||a.order-b.order); }
export function immediateAbove(players,uid,byMax=false) { const list=rankedPlayers(players,byMax),i=list.findIndex(p=>p.id===uid); return i>0?list[i-1]:null; }
export function terrainOf(room) {
  return room.terrain||room.blocks.flatMap(b=>Array.from({length:9},(_,i)=>({x:b.x*3+i%3,y:b.y*3+Math.floor(i/3)})));
}
export function connectedTerrain(terrain,active) {
  const known=new Map(terrain.map(c=>[key(c.x,c.y),c])),visited=new Set(),queue=[active];
  for(let i=0;i<queue.length;i++) {
    const c=queue[i],k=key(c.x,c.y);if(!known.has(k)||visited.has(k))continue;
    visited.add(k);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:c.x+dx,y:c.y+dy});
  }
  return terrain.filter(c=>visited.has(key(c.x,c.y)));
}
export function isBlockedCell(room,playerId,x,y){return !!room.inventoryEffects?.blocks?.some(e=>e.x===x&&e.y===y&&(e.by===playerId?e.fresh:!isImmune(room,playerId))&&e.remaining>0);}
export function availableCells(room,pair,{ignoreBlocks=false}={}) {
  const occupied=new Set(room.cells.map(c=>key(c.x,c.y)));
  const playerId=pair[pair.turn.toLowerCase()];
  return connectedTerrain(terrainOf(room),pair.active).filter(c=>!occupied.has(key(c.x,c.y))&&(ignoreBlocks||!isBlockedCell(room,playerId,c.x,c.y)));
}
export function expansionOptions(terrain,active) {
  const connected=connectedTerrain(terrain,active),known=new Set(terrain.map(c=>key(c.x,c.y))),candidates=new Map();
  for(const c of connected)for(let ox=-3;ox<=1;ox++)for(let oy=-3;oy<=1;oy++) {
    const p={x:c.x+ox,y:c.y+oy};candidates.set(key(p.x,p.y),p);
  }
  const linked=new Set(connected.map(c=>key(c.x,c.y)));
  return [...candidates.values()].filter(p=>{
    let adds=false,touches=false;
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++) {
      const x=p.x+dx,y=p.y+dy;if(!known.has(key(x,y)))adds=true;
      if(linked.has(key(x,y))||[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>linked.has(key(x+a,y+b))))touches=true;
    }
    return adds&&touches;
  });
}
const canonical=points=>points.map(([x,y])=>`${x},${y}`).sort().join(';');
const templates=new Map();
for(const [kind,shape] of [['L',[[0,0],[1,0],[0,1]]],['L',[[0,0],[1,0],[2,0],[0,1]]],['cuadrado',[[0,0],[1,0],[0,1],[1,1]]],['cruz',[[1,0],[0,1],[1,1],[2,1],[1,2]]]]) {
  for(let mirror=0;mirror<2;mirror++)for(let rotation=0;rotation<4;rotation++) {
    let points=shape.map(([x,y])=>[mirror?-x:x,y]);
    for(let i=0;i<rotation;i++)points=points.map(([x,y])=>[-y,x]);
    const minX=Math.min(...points.map(c=>c[0])),minY=Math.min(...points.map(c=>c[1]));
    points=points.map(([x,y])=>[x-minX,y-minY]);templates.set(kind+':'+canonical(points),{kind,points});
  }
}
export const shapeTemplates=[...templates.values()];
export function figureWindows(cells,x,y,symbol,level='normal') {
  const occupied=new Set(cells.filter(c=>c.symbol===symbol).map(c=>key(c.x,c.y))),found=new Map();
  const add=(kind,points)=>{const id=symbol+':'+kind+':'+canonical(points);found.set(id,{id,kind,size:points.length,points});};
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
    let sx=x,sy=y;while(occupied.has(key(sx-dx,sy-dy))){sx-=dx;sy-=dy;}
    const points=[];while(occupied.has(key(sx,sy))){points.push([sx,sy]);sx+=dx;sy+=dy;}
    if(points.length>=3)add('línea',points);
  }
  for(const {kind,points} of shapeTemplates)for(const [ax,ay] of points) {
    const translated=points.map(([dx,dy])=>[x+dx-ax,y+dy-ay]);
    if(translated.every(([cx,cy])=>occupied.has(key(cx,cy))))add(kind,translated);
  }
  if(level==='advanced') {
    const points=connectedTerrain(cells.filter(c=>c.symbol===symbol),{x,y}).map(c=>[c.x,c.y]);
    if(points.length>=4&&!Array.from(found.values()).some(f=>canonical(f.points)===canonical(points)))add('grupo',points);
  }
  return [...found.values()];
}
