import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells,expansionOptions,key} from '../src/game.js';
import {markTerritoryGrowth,territoryPressure} from '../src/territory-director.js';

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const results=[];
for(const size of [9,99,333,999,33333])for(const seed of size===33333?[94]:[33,94,333]){
 const random=rng(seed),start=performance.now();let now=1800000000000;
 let g=createLocal('local','X','O',now,'normal','untimed','medium','X',false,{random});
 if(size>9){g.terrain=Array.from({length:size},(_,i)=>({x:i%183,y:Math.floor(i/183)}));g.cells=g.terrain.filter(()=>random()<.4).map((c,i)=>({...c,id:'initial:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));markTerritoryGrowth(g);}
 let expansions=0,coexistence=0;const kinds=new Set();
 for(let turn=0;turn<(size===33333?9:180)&&g.status==='playing';turn++){
  now+=1000;const before=g,scores=g.players.map(p=>p.score),pair=g.pairs[0];
  if(pair.pending){const options=expansionOptions(g.terrain,pair.terrainAnchor||pair.active,g);assert.ok(options.length);g=localCommand(g,'expand',options[Math.floor(random()*options.length)],now,random);expansions++;
   assert.deepEqual(g.cells,before.cells,'Compulsory expansion precedes clearing');
   for(const e of before.territoryEvents)assert.deepEqual(g.territoryEvents.find(x=>x.id===e.id)?.region,e.region,'A promised zone is immutable');
  }else{const free=availableCells(g,pair);assert.ok(free.length);g=localCommand(g,'move',free[Math.floor(random()*free.length)],now,random);}
  const pressure=territoryPressure(g);assert.ok(pressure.fauna.length<=1,'No fauna stacks');assert.ok(pressure.weather.length<=1,'No weather stacks');assert.ok(!(pressure.fauna.includes('large')&&pressure.weather.includes('large')),'No large/large overlap');
  if(pressure.fauna.length&&pressure.weather.length)coexistence++;
  if(g.territoryDirector.last)kinds.add(g.territoryDirector.last.kind);
  for(let i=0;i<2;i++)assert.ok(g.players[i].score>=scores[i],'Historical points are conserved');
  const terrain=new Set(g.terrain.map(c=>key(c.x,c.y)));assert.equal(terrain.size,g.terrain.length);assert.equal(new Set(g.cells.map(c=>key(c.x,c.y))).size,g.cells.length);assert.ok(g.cells.every(c=>terrain.has(key(c.x,c.y))));
  assert.ok(JSON.stringify(g.territoryDirector).length<2000);
  if(turn===30){const paused=localCommand(g,'pause',{},now,random),restored=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},now+999999,random);assert.deepEqual(restored.territoryDirector,g.territoryDirector);g=restored;now+=999999;}
 }
 assert.ok(g.territoryDirector.choices>0,'The territory creates tension');if(size===9)assert.ok(expansions>0,'A fresh game reaches compulsory growth');
 results.push({size,seed,choices:g.territoryDirector.choices,kinds:[...kinds],expansions,coexistence,finalSize:g.terrain.length,finalPieces:g.cells.length,ms:Math.round(performance.now()-start)});
}
assert.ok(results.some(r=>r.coexistence>0));
console.log(JSON.stringify({scenario:'Calculated territory, real accepted commands, no fixed appearance counters; synthetic play, not human/device measurements',results},null,2));
