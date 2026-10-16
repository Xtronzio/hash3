import {key,shapeTemplates} from './game.js';

const sides=[[1,0],[-1,0],[0,1],[0,-1]],touches=[...sides,[1,1],[1,-1],[-1,1],[-1,-1]];
const canonical=points=>points.map(([x,y])=>key(x,y)).sort().join(';');
const contexts=new WeakMap();
export const comboInverse=room=>room?.variant==='inverse'&&room.inverseVersion===3&&room.inverseClaimVersion!==1;
function context(room,symbol){
 let saved=contexts.get(room);if(!saved||saved.version!==room.version){saved={version:room.version,signs:new Map()};contexts.set(room,saved);}
 if(!saved.signs.has(symbol)){
  const own=new Set(room.cells.filter(c=>c.symbol===symbol).map(c=>key(c.x,c.y))),cells=room.cells.filter(c=>c.symbol===symbol||c.symbol==='#');
  saved.signs.set(symbol,{own,cells,occupied:new Map(cells.map(c=>[key(c.x,c.y),c])),fill:new Set(room.inverseFill),components:new Map()});
 }
 return saved.signs.get(symbol);
}
function componentAt(ctx,point,symbol,level,figureCount){
 const origin=key(point.x,point.y);if(!ctx.occupied.has(origin))return null;
 if(ctx.components.has(origin))return ctx.components.get(origin);
 const cells=[ctx.occupied.get(origin)],seen=new Set([origin]);
 for(let i=0;i<cells.length;i++)for(const [dx,dy]of touches){const k=key(cells[i].x+dx,cells[i].y+dy);if(ctx.occupied.has(k)&&!seen.has(k)){seen.add(k);cells.push(ctx.occupied.get(k));}}
 cells.sort((a,b)=>a.x-b.x||a.y-b.y);
 const figures=[],union=new Map(),groups=new Map();let figureTotal=0,payingCount=0,basePoints=0,primary=null,hash=2166136261,hash2=5381;
 const add=(kind,points)=>{
  if(!points.some(([x,y])=>ctx.own.has(key(x,y))))return;
  const id=symbol+':'+kind+':'+canonical(points),f={id,kind,size:points.length,points};figureTotal++;
  // Enumerate each normalized template/line start once. Retain a bounded report,
  // rather than hundreds of thousands of temporary subfigures on a large board.
  if(figures.length<2048)figures.push(f);
  if(!primary||f.size>primary.size||f.size===primary.size&&f.kind.localeCompare(primary.kind)<0)primary={kind:f.kind,size:f.size};
  for(const [x,y]of points){const k=key(x,y);if(!union.has(k))union.set(k,[x,y]);}
  for(let i=0;i<id.length;i++){hash=Math.imul(hash^id.charCodeAt(i),16777619);hash2=Math.imul(hash2,33)^id.charCodeAt(i);}
  if(points.some(([x,y])=>ctx.fill.has(key(x,y)))){payingCount++;basePoints+=points.length;const k=kind+':'+points.length;if(!groups.has(k))groups.set(k,{kind,size:points.length,count:0,points:0});const g=groups.get(k);g.count++;g.points+=points.length;}
 };
 for(const c of cells){
  for(const [dx,dy]of [[1,0],[0,1],[1,1],[1,-1]])if(!ctx.occupied.has(key(c.x-dx,c.y-dy))){
   const line=[];let x=c.x,y=c.y;while(ctx.occupied.has(key(x,y))){line.push([x,y]);x+=dx;y+=dy;}if(line.length>=3)add('línea',line);
  }
  for(const shape of shapeTemplates){const [ax,ay]=shape.points[0],points=shape.points.map(([x,y])=>[c.x+x-ax,c.y+y-ay]);if(points.every(([x,y])=>ctx.occupied.has(key(x,y))))add(shape.kind,points);}
 }
 if(level==='advanced'){
  const visited=new Set();
  for(const start of cells){const first=key(start.x,start.y);if(visited.has(first))continue;const group=[start];visited.add(first);
   for(let i=0;i<group.length;i++)for(const [dx,dy]of sides){const k=key(group[i].x+dx,group[i].y+dy);if(ctx.occupied.has(k)&&!visited.has(k)){visited.add(k);group.push(ctx.occupied.get(k));}}
   if(group.length>=4){
    const simpleLine=group.every(c=>c.x===start.x)||group.every(c=>c.y===start.y);
    let simpleShape=false;if(group.length<=5){const minX=Math.min(...group.map(c=>c.x)),minY=Math.min(...group.map(c=>c.y)),known=new Set(group.map(c=>key(c.x-minX,c.y-minY)));simpleShape=shapeTemplates.some(s=>s.points.length===group.length&&s.points.every(([x,y])=>known.has(key(x,y))));}
    if(!simpleLine&&!simpleShape)add('grupo',group.map(c=>[c.x,c.y]));
   }
  }
 }
 const points=[...union.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),filled=points.filter(([x,y])=>ctx.fill.has(key(x,y))).length;
 const bonus=3*(Math.floor((figureCount+payingCount)/3)-Math.floor(figureCount/3));
 const combo=figureTotal?{id:`combo:${symbol}:${hash>>>0}:${hash2>>>0}:${figureTotal}`,kind:primary.kind,size:points.length,primary:{kind:primary.kind,size:figures[0].size},points,filled,payingCount,figureCount:figureTotal,pointsValue:basePoints+bonus,basePoints,bonus,figures,reportTruncated:figureTotal>figures.length,scoreGroups:[...groups.values()]}:null;
 for(const c of cells)ctx.components.set(key(c.x,c.y),combo);
 return combo;
}
export function inverseComboAt(room,playerId,point){
 const player=room.players.find(p=>p.id===playerId);if(!player)return null;
 return componentAt(context(room,player.symbol),point,player.symbol,room.level,player.figures);
}
export function inverseCombos(room,playerId,limit=Infinity){
 const player=room.players.find(p=>p.id===playerId);if(!player)return [];
 const ctx=context(room,player.symbol),found=new Map();
 for(const c of ctx.cells)if(c.symbol===player.symbol){const combo=componentAt(ctx,c,player.symbol,room.level,player.figures);if(combo)found.set(combo.id,combo);if(found.size>=limit)break;}
 return [...found.values()].sort((a,b)=>b.pointsValue-a.pointsValue||b.filled-a.filled||b.size-a.size||a.id.localeCompare(b.id));
}
