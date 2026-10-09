import {NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,impactCount} from '../src/territory-event-rules.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {proportionalBudget,habitatZone,habitatInterval,HABITAT_FREQUENCIES} from '../src/habitat-budget.js';
import {recordTerritoryGrowth,territoryRegion,advanceTerritory,initializeTerritory,recordTerritoryPlacement} from '../src/territory-tools.js';
import {countHabitatPlacement} from '../src/inhabitants.js';
import {key} from '../src/game.js';
const board=(size=999)=>{const r=createLocal('local','A','B',1000,'normal','untimed');r.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.cells=r.terrain.map((c,i)=>({...c,id:'f'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));r.players[0].figures=99;r.territoryNextPlacement=1000000;r.territoryNextInvasion=1000000;r.livingBags={natural:[...NATURAL_EVENT_ROTATION],invaders:[...INVADER_EVENT_ROTATION]};return r;};
test('100 and 1000 cells receive exactly the same budget density over repeated activations, including fractional animals',()=>{
 for(const kind of ['rodent','worm','bomb','work']){
  const a={},b={};let small=0,large=0;
  for(let i=0;i<333;i++){small+=proportionalBudget(a,kind,100);large+=proportionalBudget(b,kind,1000);}
  assert.equal(large,small*10);assert.equal(small,kind==='rodent'?300:100);
  assert.ok(a.credit[kind]<1&&b.credit[kind]<1);
 }
});
test('Two players share zone cadence, and no-food generations stay bounded',()=>{
 const r=board(333);r.cells=[];r.players[0].placements=65;
 countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);assert.equal(r.habitatZones.length,1);assert.equal(r.habitatZones[0].placements,66);assert.equal(r.rodentRaids[0].count,3);
 countHabitatPlacement(r,'local-o',{x:1,y:0},2001,()=>0);assert.equal(r.habitatZones.length,1);assert.equal(r.habitatZones[0].placements,67);
 for(let turn=2;turn<=9;turn++)countHabitatPlacement(r,turn%2?'local-o':'local-x',{x:1,y:0},2000+turn,()=>0);assert.equal(r.rodentRaids.length,0);
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
  r.territoryEvents=[{id:'t',kind,region,nextAt:34000}];assert.equal(advanceTerritory(r,33999).length,0);
  const actions=advanceTerritory(r,34000);assert.equal(actions.length,99);assert.equal(r.cells.length,900);assert.equal(r.players[0].score,333);assert.equal(r.forms.length,0);
  assert.equal(r.terrain.length,kind==='ufo'?999:900);assert.equal(advanceTerritory(r,1000000).length,0);
 }
 const r=board(999);r.cells=r.cells.slice(0,100);assert.equal(territoryRegion(r,'ufo',()=>0,Math.floor(100*33/333)).length,9);
});
test('Growth does not bypass independent clocks; invasion warnings pause exactly without fauna recovery',()=>{
 let r=board(332);r.cells=[];r.terrain.push({x:2,y:10});
 assert.equal(recordTerritoryGrowth(r,1,1000,()=>0),false);assert.equal(r.territoryMilestone,1);
 r.territoryNextInvasion=0;assert.equal(recordTerritoryGrowth(r,1,1000,()=>0),true);
 assert.equal(r.territoryEvents[0].kind,'invader-rain');assert.equal(r.territoryEvents[0].region.length,3);
 r=localCommand(r,'pause',{},11000);assert.equal(r.territoryEvents[0].remainingMs,23000);
 const paused=JSON.stringify(r);assert.equal(localCommand(r,'tick',{},1000000),r);
 r=localCommand(JSON.parse(paused),'resume',{},1000000);assert.equal(r.territoryEvents[0].nextAt,1023000);
 r=localCommand(r,'tick',{},1023000);assert.equal(r.cells.filter(c=>c.symbol==='*').length,3);assert.equal(r.ecologyRecovery,undefined);
 r.terrain=board(666).terrain;assert.equal(recordTerritoryGrowth(r,333,1056000,()=>0),false);
});
test('Scaling birth intervals and population limits potential meals below one meal per placement across large boards',()=>{
 for(const n of [333,666,999,3330]){
  const factor=n/333,rats=3*factor,worms=factor;
  const incidence=rats*3/habitatInterval(HABITAT_FREQUENCIES.rodent,n)+worms*3/habitatInterval(HABITAT_FREQUENCIES.worm,n);
  assert.ok(incidence<=8/11+1e-9);assert.ok(incidence<1);
 }
});
test('The three complexity settings persist independently and disabled ecology never acts',()=>{
 for(const faunaEnabled of [false,true])for(const territoryEnabled of [false,true]){
  let r=createLocal('solo','A','B',1000,'normal','untimed','medium','X',true,{faunaEnabled,territoryEnabled});
  r.players[0].figures=99;r.territoryNextPlacement=1000000;r.territoryNextInvasion=1000000;r.terrain=board(333).terrain;r.cells=board(333).cells.slice(0,60);r.players[0].placements=65;
  countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);assert.equal(r.rodentRaids.length,faunaEnabled?1:0);r.players[0].placements=71;countHabitatPlacement(r,'local-x',{x:0,y:0},2001,()=>0);assert.equal(r.cells.some(c=>c.symbol==='#'),territoryEnabled);
  r.territoryNextInvasion=0;assert.equal(recordTerritoryGrowth(r,1,3000,()=>0),territoryEnabled);
  r=localCommand(r,'pause',{},3100);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},10000);
  assert.equal(r.machineInventory,true);assert.equal(r.faunaEnabled,faunaEnabled);assert.equal(r.territoryEnabled,territoryEnabled);
 }
});
test('Warning, impact and recovery suppress fauna; populations and future interventions are recalibrated after the event',()=>{
 const r=board(333);r.players[0].placements=32;countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);
 r.worms=[{id:'worm',kind:'worm',player:'local-x',x:10,y:5,body:[{x:10,y:5}],eaten:0,nextAt:34000}];
 r.territoryNextPlacement=0;recordTerritoryGrowth(r,1,1000,()=>0);const before=r.cells.length,raids=JSON.stringify(r.rodentRaids);
 countHabitatPlacement(r,'local-o',{x:1,y:0},2001,()=>0);assert.equal(r.cells.length,before);assert.equal(JSON.stringify(r.rodentRaids),raids);
 const impacted=localCommand(r,'tick',{},34000,()=>0);assert.ok(impacted.habitatEvent.actions.every(a=>a.kind==='meteorites'));assert.equal(impacted.worms[0]?.eaten||0,0);
 assert.equal(impacted.ecologyRecalibration.size,324);assert.equal(impacted.ecologyRecovery.moves,3);
 countHabitatPlacement(impacted,'local-x',{x:0,y:0},34001,()=>0);assert.equal(impacted.ecologyRecovery.moves,2);
});

test('Expansion that announces a territory event cannot also execute a due worm meal in the same command',()=>{
 const r=board(332);r.territoryNextPlacement=0;r.worms=[{id:'due',kind:'worm',x:0,y:0,player:'local-x',body:[{x:0,y:0}],eaten:0,nextAt:34000}];
 r.pairs[0].pending=1;r.pairs[0].credits=1;r.pairs[0].expander='local-x';
 const next=localCommand(r,'expand',{x:32,y:9},34000,()=>0);
 assert.equal(next.territoryEvents.length,1);assert.equal(next.worms[0].eaten,0);assert.equal(next.habitatEvent,undefined);
});

test('Shorter worm/work cadence scales at 333 and 999 cells and survives territory recovery without replay',()=>{
 assert.equal(habitatInterval(HABITAT_FREQUENCIES.worm,333),33);assert.equal(habitatInterval(HABITAT_FREQUENCIES.work,333),66);
 assert.equal(habitatInterval(HABITAT_FREQUENCIES.worm,999),50);assert.equal(habitatInterval(HABITAT_FREQUENCIES.work,999),99);
 const r=board(333);r.players[0].placements=65;countHabitatPlacement(r,'local-x',{x:0,y:0},2000,()=>0);
 assert.equal(r.worms.length,1);assert.equal(r.worms[0].turnDriven,true);assert.equal(r.worms[0].mealLimit,3);assert.equal(r.worms[0].nextAt,undefined);
 r.territoryEvents=[{id:'u',kind:'ufo',region:[r.cells[0]],nextAt:2100}];advanceTerritory(r,2100);
 const zone=r.habitatZones[0];assert.equal(zone.next.worm-zone.placements,33);assert.equal(zone.next.work-zone.placements,66);assert.equal(r.ecologyRecovery.moves,3);
});

 test('A stationary large board announces through accepted placements, freezes fauna and restarts a single cycle',()=>{
 let r=board(999);r.cells=r.cells.slice(0,500);r.territoryMilestone=3;r.territoryNextPlacement=1;
 r.worms=[{id:'due',kind:'worm',x:0,y:0,player:'local-x',body:[{x:0,y:0}],eaten:0,nextAt:34000}];
 r=localCommand(r,'move',{x:8,y:30},34000,()=>0);
 assert.equal(r.terrain.length,999);assert.equal(r.territoryEvents.length,1);assert.equal(r.territoryEvents[0].trigger,'placements');assert.equal(r.territoryEvents[0].region.length,27);assert.equal(r.worms[0].eaten,0);assert.equal(r.habitatEvent,undefined);assert.equal(r.territoryNextPlacement,100);
 r=localCommand(r,'pause',{},44000);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1000000);assert.equal(r.territoryEvents[0].nextAt,1023000);
 r=localCommand(r,'tick',{},1023000);assert.equal(r.territoryEvents.length,0);assert.equal(r.ecologyRecovery.moves,3);assert.equal(r.terrain.length,972);
 r.territoryNextPlacement=1;assert.equal(recordTerritoryPlacement(r,1023001,()=>0),false);assert.equal(r.territoryEvents.length,0);
 r.ecologyRecovery.moves=0;assert.ok(recordTerritoryPlacement(r,1056000,()=>0));assert.equal(r.territoryEvents.length,1);assert.equal(r.territoryEvents[0].kind,'earthquake');assert.equal(r.territoryEvents[0].region.length,impactCount(r,'earthquake'));
 });
 test('Old large saves receive future local attempts, without historical events or lost residents',()=>{
 const r=board(3333);r.players[0].placements=3000;r.players[1].placements=2900;delete r.territoryActivityVersion;delete r.livingTerritoryVersion;
 initializeTerritory(r);assert.equal(r.territoryNextPlacement,5999);assert.equal(r.territoryEvents.length,0);const saved=structuredClone(r);
 initializeTerritory(r);assert.deepEqual(r,saved);r.players[0].placements+=32;assert.equal(recordTerritoryPlacement(r,10000,()=>0),false);
 r.players[0].placements++;assert.ok(recordTerritoryPlacement(r,10001,()=>0));assert.equal(r.territoryNextInvasion,5966);assert.equal(r.territoryNextPlacement,5999);
 });
test('Phenomena require 33 shared figures, respect the switch and work below 333 cells',()=>{
 for(const size of [99,332,333]){const r=board(size);r.territoryNextInvasion=0;r.territoryEnabled=false;assert.equal(recordTerritoryPlacement(r,1000,()=>0),false);r.territoryEnabled=true;r.players[0].figures=32;assert.equal(recordTerritoryPlacement(r,1000,()=>0),false);r.players[0].figures=16;r.players[1].figures=17;assert.ok(recordTerritoryPlacement(r,1000,()=>0));assert.equal(r.territoryEvents[0].region.length,3);}
});
test('Invasions do not stop fauna, change natural deadlines or reset birth budgets',()=>{
 const r=board(333);r.territoryNextPlacement=333;r.territoryNextInvasion=0;
 r.players[0].placements=65;
 countHabitatPlacement(r,'local-x',{x:0,y:0},1000,()=>.3);
 assert.equal(r.territoryEvents[0].kind,'invader-rain');assert.equal(r.territoryNextPlacement,333);
 assert.ok(r.rodentRaids.length);assert.ok(r.worms.length);
 const nexts=structuredClone(r.habitatZones[0].next);
 advanceTerritory(r,34000);assert.equal(r.ecologyRecovery,undefined);assert.deepEqual(r.habitatZones[0].next,nexts);
 r.territoryNextInvasion=0;recordTerritoryPlacement(r,35000,()=>.3);assert.equal(r.territoryEvents[0].kind,'invader-colony');
});
test('The placement that reaches 99 figures announces without executing a due worm meal',()=>{
 const r=board(99);r.players[0].figures=98;r.players[0].placements=32;r.territoryNextPlacement=33;
 r.cells=[{id:'a',x:0,y:0,symbol:'X',owner:'local-x'},{id:'b',x:1,y:0,symbol:'X',owner:'local-x'},{id:'food',x:10,y:2,symbol:'O',owner:'local-o'}];
 r.worms=[{id:'due',kind:'worm',x:10,y:2,player:'local-x',body:[{x:10,y:2}],eaten:0,nextAt:34000}];
 const next=localCommand(r,'move',{x:2,y:0},34000,()=>0);
 assert.equal(next.players[0].figures,99);assert.equal(next.territoryEvents.length,1);assert.equal(next.worms[0].eaten,0);
 assert.equal(next.territoryNextPlacement,132);
});
