import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
  assert.ok(!g.faunaEvents.some(e=>e.kind.startsWith('beaver'))&&!g.frontiers.some(f=>f.type==='beaver'),'Retired fauna cannot return');
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
let comparison;
if(process.argv.includes('--compare-r97')){
 const previous=JSON.parse(readFileSync(new URL('../benchmarks/territory-no-beavers-r97.json',import.meta.url),'utf8')).results.filter(r=>r.actions===180),current=results.filter(r=>r.actions===180);
 assert.deepEqual(current.map(r=>[r.size,r.density,r.seed,r.actions]),previous.map(r=>[r.size,r.density,r.seed,r.actions]),'Compare the same accepted-play scenarios');
 const totals=rows=>Object.fromEntries(['actions','announcements','active','overlap','expansions'].map(k=>[k,rows.reduce((n,r)=>n+r[k],0)]));
 const before=totals(previous),after=totals(current);
 assert.ok(after.announcements<=before.announcements*.9&&after.announcements>=before.announcements*.65,'Modestly fewer announcements without silence');
 assert.ok(after.active<=before.active*.93&&after.active>=before.active*.65,'More playable quiet, not a dormant territory');
 assert.ok(after.overlap<before.overlap,'Fewer simultaneous interventions');
 assert.ok(current.filter(r=>r.size===9).every(r=>r.expansions>0),'New games still grow');
 comparison={baseline:'R0.21.97',samples:current.length,before,after,announcementReduction:1-after.announcements/before.announcements,activityBefore:before.active/before.actions,activityAfter:after.active/after.actions};
}
console.log(JSON.stringify({scenario:'Seeded accepted play; attention, quiet and overlap measured, not human/device playtests',results,...(comparison?{comparison}:{})},null,2));
