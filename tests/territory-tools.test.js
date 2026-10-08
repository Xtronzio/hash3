import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {proportionalBudget,habitatZone,habitatInterval,HABITAT_FREQUENCIES} from '../src/habitat-budget.js';
import {recordTerritoryGrowth,territoryRegion,advanceTerritory} from '../src/territory-tools.js';
import {countHabitatPlacement} from '../src/inhabitants.js';
import {key} from '../src/game.js';
const board=(size=999)=>{const r=createLocal('local','A','B',1000,'normal','untimed');r.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.cells=r.terrain.map((c,i)=>({...c,id:'f'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));return r;};
test('100 and 1000 cells receive exactly the same budget density over repeated activations, including fractional animals',()=>{
 for(const kind of ['rodent','worm','bomb','work']){
  const a={},b={};let small=0,large=0;
  for(let i=0;i<333;i++){small+=proportionalBudget(a,kind,100);large+=proportionalBudget(b,kind,1000);}
  assert.equal(large,small*10);assert.equal(small,kind==='rodent'?300:100);
  assert.ok(a.credit[kind]<1&&b.credit[kind]<1);
 }
});
test('Two players share zone cadence, and no-food generations stay bounded',()=>{
 const r=board(333);r.cells=[];r.players[0].placements=32;
 countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);assert.equal(r.habitatZones.length,1);assert.equal(r.habitatZones[0].placements,33);assert.equal(r.rodentRaids[0].count,3);
 countHabitatPlacement(r,'local-o',{x:1,y:0},2001,()=>0);assert.equal(r.habitatZones.length,1);assert.equal(r.habitatZones[0].placements,34);
 countHabitatPlacement(r,'local-x',{x:1,y:0},2002,()=>0);assert.equal(r.rodentRaids.length,0);
});
test('Merged zones combine one fractional budget without replaying old milestones',()=>{
 const r=board(333);r.habitatZones=[{id:'a',x:0,y:0,placements:20,credit:{rodent:.3}},{id:'b',x:2,y:0,placements:10,credit:{rodent:.4}}];
 const z=habitatZone(r,r.terrain,{rodent:33});assert.equal(z.placements,30);assert.equal(z.next.rodent,33);assert.ok(Math.abs(z.credit.rodent-.7)<1e-9);assert.equal(r.habitatZones.length,1);
});
test('Regions scale 33/333; compact demolition has two side-neighbors and rain selects dispersed unique cells',()=>{
 for(const size of [333,999,3330])for(const kind of ['rain','cataclysm']){
  const r=board(size),region=territoryRegion(r,kind,()=>.45),set=new Set(region.map(c=>key(c.x,c.y)));
  assert.equal(region.length,Math.floor(size/333)*33);assert.equal(set.size,region.length);assert.ok(!set.has('0,0'));
  if(kind==='cataclysm')for(const c of region)assert.ok([[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>set.has(key(c.x+dx,c.y+dy))).length>=2);
 }
});
test('UFO scales with occupied pieces rather than terrain; demolition removes cells and pieces and keeps scores',()=>{
 for(const kind of ['ufo','cataclysm','rain']){
  const r=board(999),count=kind==='ufo'?Math.floor(r.cells.length*33/333):99,region=territoryRegion(r,kind,()=>.4,count),first=region[0];r.players[0].score=333;r.forms=[`X:test:${key(first.x,first.y)}`];
  r.worms=[{id:'w',body:[first],...first}];r.works=[{id:'w',done:0,build:[first],destroy:[first]}];r.bombs=[{id:'b',blast:[first]}];
  r.territoryEvents=[{id:'t',kind,region,nextAt:34000}];assert.equal(advanceTerritory(r,33999).length,0);
  const actions=advanceTerritory(r,34000);assert.equal(actions.length,99);assert.equal(r.cells.length,900);assert.equal(r.players[0].score,333);assert.equal(r.forms.length,0);
  assert.equal(r.terrain.length,kind==='ufo'?999:900);assert.equal(r.worms.length,kind==='ufo'?1:0);assert.equal(r.works.length,kind==='ufo'?1:0);assert.equal(advanceTerritory(r,1000000).length,0);
 }
 const r=board(999);r.cells=r.cells.slice(0,100);assert.equal(territoryRegion(r,'ufo',()=>0,Math.floor(100*33/333)).length,9);
});
test('One card per new 333-cell milestone; no replay after demolition and recrossing, and pauses freeze the warning',()=>{
 let r=board(332);r.cells=[];assert.equal(recordTerritoryGrowth(r,1,1000),false);r.terrain.push({x:2,y:10});
 assert.equal(recordTerritoryGrowth(r,1,1000,()=>0),true);assert.equal(r.territoryEvents.length,1);assert.equal(r.territoryEvents[0].kind,'rain');assert.equal(r.territoryEvents[0].region.length,33);
 recordTerritoryGrowth(r,999,2000,()=>0);assert.equal(r.territoryEvents.length,1);
 r=localCommand(r,'pause',{},11000);assert.equal(r.territoryEvents[0].remainingMs,23000);
 const paused=JSON.stringify(r);assert.equal(localCommand(r,'tick',{},1000000),r);assert.equal(JSON.stringify(r),paused);
 r=localCommand(JSON.parse(paused),'resume',{},1000000);assert.equal(r.territoryEvents[0].nextAt,1023000);
 r=localCommand(r,'tick',{},1022999);assert.equal(r.terrain.length,333);
 r=localCommand(r,'tick',{},1023000);assert.equal(r.territoryEvents.length,0);assert.equal(r.terrain.length,300);assert.equal(r.habitatEvent.actions.length,33);
 r.terrain=board(333).terrain;assert.equal(recordTerritoryGrowth(r,33,1024000),false);
 r.terrain=board(666).terrain;assert.equal(recordTerritoryGrowth(r,333,1025000,()=>0),true);assert.equal(r.territoryEvents[0].region.length,66);
});
test('Scaling birth intervals and population limits potential meals to 31.82 percent across large boards',()=>{
 for(const n of [333,666,999,3330]){
  const factor=n/333,rats=3*factor,worms=factor;
  assert.ok(Math.abs((rats*3)/(HABITAT_FREQUENCIES.rodent*factor)+(worms*3)/(HABITAT_FREQUENCIES.worm*factor)-7/22)<1e-9);
 }
});
test('The three complexity settings persist independently and disabled ecology never acts',()=>{
 for(const faunaEnabled of [false,true])for(const territoryEnabled of [false,true]){
  let r=createLocal('solo','A','B',1000,'normal','untimed','medium','X',true,{faunaEnabled,territoryEnabled});
  r.terrain=board(333).terrain;r.cells=board(333).cells.slice(0,60);r.players[0].placements=32;
  countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);assert.equal(r.rodentRaids.length,faunaEnabled?1:0);assert.equal(r.cells.some(c=>c.symbol==='#'),territoryEnabled);
  assert.equal(recordTerritoryGrowth(r,1,3000,()=>0),territoryEnabled);
  r=localCommand(r,'pause',{},3100);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},10000);
  assert.equal(r.machineInventory,true);assert.equal(r.faunaEnabled,faunaEnabled);assert.equal(r.territoryEnabled,territoryEnabled);
 }
});
test('Warning, impact and recovery suppress fauna; populations and future interventions are recalibrated after the event',()=>{
 const r=board(333);r.players[0].placements=32;countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);
 r.worms=[{id:'worm',kind:'worm',player:'local-x',x:10,y:5,body:[{x:10,y:5}],eaten:0,nextAt:34000}];
 recordTerritoryGrowth(r,1,1000,()=>0);const before=r.cells.length,raids=JSON.stringify(r.rodentRaids);
 countHabitatPlacement(r,'local-o',{x:1,y:0},2001,()=>0);assert.equal(r.cells.length,before);assert.equal(JSON.stringify(r.rodentRaids),raids);
 const impacted=localCommand(r,'tick',{},34000,()=>0);assert.ok(impacted.habitatEvent.actions.every(a=>a.kind==='rain'));assert.equal(impacted.worms[0]?.eaten||0,0);
 assert.equal(impacted.ecologyRecalibration.size,300);assert.equal(impacted.ecologyRecovery.moves,3);
 countHabitatPlacement(impacted,'local-x',{x:0,y:0},34001,()=>0);assert.equal(impacted.ecologyRecovery.moves,2);
});

test('Expansion that announces a territory event cannot also execute a due worm meal in the same command',()=>{
 const r=board(332);r.worms=[{id:'due',kind:'worm',x:0,y:0,player:'local-x',body:[{x:0,y:0}],eaten:0,nextAt:34000}];
 r.pairs[0].pending=1;r.pairs[0].credits=1;r.pairs[0].expander='local-x';
 const next=localCommand(r,'expand',{x:32,y:9},34000,()=>0);
 assert.equal(next.territoryEvents.length,1);assert.equal(next.worms[0].eaten,0);assert.equal(next.habitatEvent,undefined);
});

test('Shorter worm/work cadence scales at 333 and 999 cells and survives territory recovery without replay',()=>{
 assert.equal(habitatInterval(HABITAT_FREQUENCIES.worm,333),66);assert.equal(habitatInterval(HABITAT_FREQUENCIES.work,333),99);
 assert.equal(habitatInterval(HABITAT_FREQUENCIES.worm,999),198);assert.equal(habitatInterval(HABITAT_FREQUENCIES.work,999),297);
 const r=board(333);r.players[0].placements=65;countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);
 assert.equal(r.worms.length,1);assert.equal(r.worms[0].nextAt,35000);
 r.territoryEvents=[{id:'u',kind:'ufo',region:[r.cells[0]],nextAt:2100}];advanceTerritory(r,2100);
 const zone=r.habitatZones[0];assert.equal(zone.next.worm-zone.placements,66);assert.equal(zone.next.work-zone.placements,99);assert.equal(r.ecologyRecovery.moves,3);
});
