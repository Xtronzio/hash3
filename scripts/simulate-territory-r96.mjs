import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {markTerritoryGrowth,territoryPressure} from '../src/territory-director.js';
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const results=[];
for(const [size,density]of [[9,0],[99,.4],[450,.98],[999,.4],[33333,.65]])for(const seed of size===33333?[94]:[33,94,333]){
 const random=rng(seed);let now=1800000000000,g=createLocal('local','X','O',now,'normal','untimed','medium','X',false,{random});
 if(size>9){g.terrain=Array.from({length:size},(_,i)=>({x:i%183,y:Math.floor(i/183)}));g.cells=g.terrain.filter(()=>random()<density).map((c,i)=>({...c,id:'initial:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));markTerritoryGrowth(g);}
 let active=0,overlap=0,quiet=0,maxQuiet=0,expansions=0,actions=0;const announcements=[],gaps=[];
 const count=size===33333?33:180;
 for(let step=0;step<count&&g.status==='playing';step++){
  const choices=g.territoryDirector.choices,p=g.pairs[0],scores=g.players.map(p=>p.score);now+=1000;
  if(p.pending){const opts=expansionOptions(g.terrain,p.terrainAnchor||p.active,g);assert.ok(opts.length);const cells=g.cells;g=localCommand(g,'expand',opts[Math.floor(random()*opts.length)],now,random);assert.deepEqual(g.cells,cells);expansions++;}
  else{const free=availableCells(g,p);assert.ok(free.length);g=localCommand(g,'move',free[Math.floor(random()*free.length)],now,random);}
  actions++;if(g.territoryDirector.choices>choices){if(announcements.length)gaps.push(step+1-announcements.at(-1));announcements.push(step+1);}
  const p2=territoryPressure(g);assert.ok(p2.fauna.length<=1&&p2.weather.length<=1);assert.ok(!(p2.fauna.includes('large')&&p2.weather.includes('large')));
  if(p2.fauna.length||p2.weather.length){active++;quiet=0;}else{quiet++;maxQuiet=Math.max(maxQuiet,quiet);}if(p2.fauna.length&&p2.weather.length)overlap++;
  g.players.forEach((p,i)=>assert.ok(p.score>=scores[i]));assert.ok(JSON.stringify(g.territoryDirector).length<4000);
  if(step===30){const paused=localCommand(g,'pause',{},now,random),resumed=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},now+999999,random);assert.deepEqual(resumed.territoryDirector,paused.territoryDirector);g=resumed;now+=999999;}
 }
 results.push({size,density,seed,actions,announcements:announcements.length,active,overlap,maxQuiet,expansions,meanGap:gaps.length?Number((gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(2)):null});
}
for(const r of results){
 assert.ok(r.active/r.actions>=.3&&r.active/r.actions<=.8,'Neither silence nor continuous pressure: '+JSON.stringify(r));
 assert.ok(r.overlap/r.actions<=.25,'Coexistence must remain occasional');
 assert.ok(r.maxQuiet>=3&&r.maxQuiet<=33,'There is room to react, without prolonged silence');
 assert.ok(r.announcements>0&&r.announcements<r.actions/3,'No announcement treadmill');
}
assert.ok(results.some(r=>r.overlap>0));
console.log(JSON.stringify({scenario:'Seeded accepted play; attention, quiet and overlap measured, not human/device playtests',results},null,2));
