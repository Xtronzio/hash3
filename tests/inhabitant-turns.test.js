import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {needsLocalTick} from '../src/local-clock.js';
import {machineTurnKey} from '../src/machine-turn.js';
import {countHabitatPlacement,habitatMark,advanceHabitats,initializeHabitats} from '../src/inhabitants.js';
import {habitatLocations,rodentTurnsRemaining} from '../src/habitat-tools.js';
import {ecologyPinTargets,ecologyMapPins} from '../src/ecology-navigation.js';
import {availableCells} from '../src/game.js';
const start=()=>createLocal('solo','A','',1000,'normal','untimed');
test('A worm without food persists its retry deadline; repeated ticks neither eat nor replace the rival turn',()=>{
 let r=start();r.pairs[0].turn='O';r.worms=[{id:'w',kind:'worm',x:0,y:0,body:[{x:0,y:0}],eaten:1,nextAt:2000}];
 const original=machineTurnKey(r);r=localCommand(r,'tick',{},2000,()=>0);assert.equal(r.worms[0].nextAt,35000);assert.equal(needsLocalTick(r,2500),false);assert.equal(machineTurnKey(r),original);
 const next=localCommand(r,'tick',{},2500,()=>0);assert.equal(next,r);assert.ok(availableCells(r,r.pairs[0]).length);r=localCommand(r,'move',{x:1,y:0},2501,()=>0);assert.equal(r.pairs[0].turn,'X');
});
test('A habitat action changes the board without restarting the same machine turn; referee validates against fresh state',()=>{
 let r=start();r=localCommand(r,'move',{x:1,y:1},1100,()=>0);r.worms=[{id:'w',kind:'worm',x:1,y:1,body:[{x:1,y:1}],eaten:0,nextAt:2000}];
 const key=machineTurnKey(r),version=r.version;r=localCommand(r,'tick',{},2000,()=>0);assert.ok(r.version>version);assert.equal(r.cells.length,0);assert.equal(machineTurnKey(r),key);
 r=localCommand(r,'move',{x:2,y:2},2001,()=>0);assert.equal(machineTurnKey(r),null);assert.equal(r.pairs[0].turn,'X');
});
test('Rodent positions and animation phases are shared by board, map and pause, with no phantom hidden positions',()=>{
 const r=start();r.mode='local';r.territoryEnabled=false;r.terrain=Array.from({length:111},(_,i)=>({x:i%15,y:Math.floor(i/15)}));r.cells=r.terrain.slice(0,50).map((c,i)=>({...c,id:'f'+i,symbol:'X',owner:'local-x'}));r.players[0].placements=65;
 countHabitatPlacement(r,'local-x',{x:14,y:3},1000,()=>0);r.worms=[];
 const birth=habitatLocations(r).filter(e=>e.kind==='rodent');assert.equal(birth.length,3);assert.equal(rodentTurnsRemaining(r.rodentRaids[0]),9);assert.deepEqual(ecologyPinTargets(r).filter(e=>e.kind==='rodent').map(e=>[e.x,e.y]),birth.map(e=>[e.x,e.y]));assert.match(habitatMark('rodent','',birth[0]),/phase-arriving/);
 countHabitatPlacement(r,'local-o',{x:14,y:3},1001,()=>0);countHabitatPlacement(r,'local-x',{x:14,y:3},1002,()=>0);assert.match(ecologyMapPins(ecologyPinTargets(r),1002),/phase-eating/);
 countHabitatPlacement(r,'local-o',{x:14,y:3},1003,()=>0);assert.equal(habitatLocations(r).filter(e=>e.kind==='rodent').length,0);assert.equal(ecologyPinTargets(r).filter(e=>e.kind==='rodent').length,0);
 countHabitatPlacement(r,'local-x',{x:14,y:3},1004,()=>0);assert.notDeepEqual(habitatLocations(r).filter(e=>e.kind==='rodent').map(e=>[e.x,e.y]),birth.map(e=>[e.x,e.y]));
 const saved=JSON.parse(JSON.stringify(r));saved.status='paused';assert.match(habitatMark('rodent','',habitatLocations(saved)[0]),/is-frozen/);assert.equal(saved.rodentRaids[0].turn,4);
});
test('Workers retain current worksite markers across the full timed cycle and advance both posts together',()=>{
 const r=start();r.works=[{id:'work',kind:'work',done:0,destroy:[{x:2,y:0},{x:2,y:1},{x:2,y:2}],build:[{x:3,y:0},{x:3,y:1},{x:3,y:2}],nextAt:34000}];
 const before=habitatLocations(r);assert.equal(before.filter(e=>e.id==='work').length,2);assert.match(habitatMark('build','',before.find(e=>e.kind==='build')),/visible-inhabitant/);assert.equal(advanceHabitats(r,33999,()=>0),false);assert.deepEqual(habitatLocations(r),before);
 advanceHabitats(r,34000,()=>0);assert.equal(r.terrain.length,9);assert.deepEqual(habitatLocations(r).filter(e=>e.id==='work').map(e=>[e.kind,e.x,e.y]),[['destroy',2,1],['build',3,1]]);
});
test('Adopting an old partial raid keeps only its remaining visits; reload migration is idempotent',()=>{
 const r=start();delete r.rodentLifecycleVersion;r.rodentRaids=[{id:'old',count:2,remaining:1,visited:[],x:0,y:0}];initializeHabitats(r,2000);assert.equal(rodentTurnsRemaining(r.rodentRaids[0]),3);
 const saved=structuredClone(r);initializeHabitats(r,3000);assert.deepEqual(r,saved);
});
