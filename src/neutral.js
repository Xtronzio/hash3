import {protectedTerritoryKeys} from './immunity.js';
import {key,shapeTemplates} from './game.js';
import {habitatBlocked} from './habitat-tools.js';

export const NEUTRAL_FREQUENCY=33;
export const neutralIcon='<path d="M25 12 19 52M45 12 39 52M12 25h40M10 40h40"/>';

// Evaluate local patterns against one index, rather than rescanning all pieces
// for every possible sabotage destination on a growing board.
export function neutralThreat(point,cells){
 let value=0;
 for(const symbol of ['X','O']){
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]])for(let offset=0;offset<3;offset++){
   if([0,1,2].filter(i=>i!==offset).every(i=>cells.get(key(point.x+(i-offset)*dx,point.y+(i-offset)*dy))?.symbol===symbol))value++;
  }
  for(const {points} of shapeTemplates)for(const [ax,ay] of points){
   if(points.every(([x,y])=>x===ax&&y===ay||cells.get(key(point.x+x-ax,point.y+y-ay))?.symbol===symbol))value++;
  }
 }
 return value;
}

export function placeNeutral(room,area,now=Date.now(),random=Math.random,focus=null){
 const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
 const blocks=new Set((room.inventoryEffects?.blocks||[]).filter(e=>e.remaining>0).map(e=>key(e.x,e.y)));
 const protectedKeys=protectedTerritoryKeys(room,now);
 const options=area.filter(c=>!protectedKeys.has(key(c.x,c.y))&&!cells.has(key(c.x,c.y))&&!blocks.has(key(c.x,c.y))&&!habitatBlocked(room,c.x,c.y));
 if(options.length<2)return null; // Keep a legal place for the next player.
 let best=-1,candidates=[];
 const nearby=focus?options.filter(c=>Math.max(Math.abs(c.x-focus.x),Math.abs(c.y-focus.y))<=3):options;
 const sampled=nearby.length?nearby:Array.from({length:Math.min(3,options.length)},()=>options[Math.min(options.length-1,Math.floor(Math.max(0,random())*options.length))]);
 for(const point of sampled){const value=neutralThreat(point,cells);if(value>best){best=value;candidates=[point];}else if(value===best)candidates.push(point);}
 const point=candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,random())*candidates.length))];
 const cell={...point,id:crypto.randomUUID(),symbol:'#',owner:null,neutral:true};
 room.cells.push(cell);room.eatenCells=(room.eatenCells||[]).filter(c=>c.x!==point.x||c.y!==point.y);
 room.neutralEvent={id:cell.id,kind:'neutral',at:now,x:point.x,y:point.y};
 return cell;
}
