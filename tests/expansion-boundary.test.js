import test from 'node:test';import assert from 'node:assert/strict';
import {expansionOptions,key,connectedTerrain} from '../src/game.js';
import {expansionFitsLimit} from '../src/board-limits.js';
import {habitatReservations} from '../src/habitat-tools.js';
import {expansionFrontierContext,expansionCrossesFrontier} from '../src/frontiers.js';
function reference(terrain,active,room){
 const connected=['solo','local'].includes(room?.mode)?terrain:connectedTerrain(terrain,active),known=new Set(terrain.map(c=>key(c.x,c.y))),candidates=new Map(),linked=new Set(connected.map(c=>key(c.x,c.y))),context=expansionFrontierContext(terrain,active,room);
 for(const c of connected)for(let ox=-3;ox<=1;ox++)for(let oy=-3;oy<=1;oy++){const p={x:c.x+ox,y:c.y+oy};candidates.set(key(p.x,p.y),p);}
 return [...candidates.values()].filter(p=>{
  let adds=false,touches=false;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const x=p.x+dx,y=p.y+dy;if(!known.has(key(x,y)))adds=true;if(linked.has(key(x,y))||[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>linked.has(key(x+a,y+b))))touches=true;}
  return adds&&touches&&expansionFitsLimit(room,known,p)&&!habitatReservations(room||{}).some(c=>c.x>=p.x&&c.x<p.x+3&&c.y>=p.y&&c.y<p.y+3)&&!expansionCrossesFrontier(terrain,active,p,room,context);
 });
}
test('Boundary expansion search retains every legal option in irregular terrain, islands, holes and frontiers',()=>{
 let seed=31;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let i=0;i<40;i++){
  const terrain=[];for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++)if(random()>.25||x===0&&y===0)terrain.push({x,y});
  for(const mode of ['local','duel']){
   const room={mode,terrain,cells:[],pairs:[{active:{x:0,y:0}}],faunaEnabled:false,territoryEnabled:false,frontiers:i%2?[{cells:[{x:2,y:0},{x:2,y:1},{x:2,y:2}]}]:[]};
   const ids=list=>list.map(c=>key(c.x,c.y)).sort();assert.deepEqual(ids(expansionOptions(terrain,{x:0,y:0},room)),ids(reference(terrain,{x:0,y:0},room)));
  }
 }
});
