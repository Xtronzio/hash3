import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeRodents,stepRodent,rodentSleeping,rodentLabel,rodentStatus} from '../src/rodents.js';
import {figureWindows} from '../src/game.js';
import {recordCombo} from '../src/records.js';
function fixture(){const r=createLocal('local','A','B',1000,'advanced','untimed');r.terrain=Array.from({length:120},(_,x)=>({x,y:0}));r.cells=r.terrain.map(c=>({...c,id:`food-${c.x}`,symbol:'X',owner:'local-x'}));return r;}
test('Legacy saves recover surviving own placements once and spawn after crossing an overdue milestone',()=>{
 const r=fixture();r.terrain=Array.from({length:703},(_,x)=>({x,y:0}));r.cells=r.terrain.map((c,i)=>({...c,id:`food-${i}`,symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));
 for(const p of r.players){delete p.rodentNextSpawn;p.placements=12;}
 initializeRodents(r);assert.equal(r.players[0].placements,352);assert.equal(r.players[1].placements,351);assert.equal(r.rodents.length,0);
 stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);assert.equal(r.players[0].rodentNextSpawn,666);assert.equal(r.rodents[0].eaten,0);
 const saved=JSON.parse(JSON.stringify(r));initializeRodents(saved);assert.equal(saved.players[0].placements,353);stepRodent(saved,'local-o',{placed:true});assert.equal(saved.rodents.length,2);
});
test('Terrain size does not trigger births; existing counters never regress or repeat past milestones',()=>{
 const r=fixture();r.terrain=Array.from({length:703},(_,x)=>({x,y:0}));stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,0);
 delete r.players[0].rodentNextSpawn;r.players[0].placements=400;initializeRodents(r);assert.equal(r.players[0].placements,400);assert.equal(r.players[0].rodentNextSpawn,666);
 stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,0);
 r.players[0].placements=665;stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);
});
test('Birth at each 333 actual placements, one per player, first meal announced before consumption',()=>{
 const r=fixture();r.players[0].placements=332;stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);assert.equal(r.rodents[0].eaten,0);assert.equal(r.cells.length,120);
 r.players[0].placements=665;stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);assert.equal(r.rodents[0].eaten,1);
 r.players[1].placements=332;stepRodent(r,'local-o',{placed:true});assert.equal(r.rodents.length,2);assert.notEqual(r.rodents[0].x,r.rodents[1].x);
});
test('A birth with no available food is retried, not lost until the next 333 milestone',()=>{
 const r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].placements=332;
 stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,0);assert.equal(r.players[0].rodentNextSpawn,333);
 r.cells.push({id:'food',x:0,y:0,symbol:'X',owner:'local-x'});
 stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);assert.equal(r.rodents[0].eaten,0);assert.equal(r.players[0].rodentNextSpawn,666);
});
test('Rodents find their pair by membership, including old saves with a string pair identifier',()=>{
 const r=fixture();r.players[0].pair='0';r.players[0].placements=332;stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents.length,1);
 stepRodent(r,'local-x');assert.equal(r.rodents[0].eaten,1);
});
test('Progress distinguishes map size, own placements, active animals and the next 666 milestone',()=>{
 const r=fixture();r.players[0].placements=410;r.players[0].rodentNextSpawn=666;
 assert.match(rodentLabel(r,'local-x'),/410\/666 fichas propias/);assert.equal(rodentStatus(r,'local-x').remaining,256);
 r.rodents=[{id:'rat',player:'local-x',x:0,y:0,phase:3,eaten:12}];assert.match(rodentLabel(r,'local-x'),/12\/33 comidas · dormido/);
});
test('1+1+1 then three sleeps: 18 meals after 33 steps, 33 meals and retirement after 63',()=>{
 const r=fixture();r.rodents=[{id:'rat',player:'local-x',x:0,y:0,phase:0,eaten:0,age:0}];
 for(let i=1;i<=63;i++){stepRodent(r,'local-x');if(i===3){assert.equal(r.rodents[0].eaten,3);assert.equal(rodentSleeping(r.rodents[0]),true);}if(i===6)assert.equal(r.rodents[0].eaten,3);if(i===33)assert.equal(r.rodents[0].eaten,18);}
 assert.equal(r.rodents.length,0);assert.equal(r.eatenCells.length,33);assert.equal(r.cells.length,87);
});
test('Only its own completed turn advances it; Doble counts placements independently',()=>{
 const r=fixture();r.rodents=[{id:'rat',player:'local-x',x:0,y:0,phase:0,eaten:0,age:0}];
 stepRodent(r,'local-o');assert.equal(r.rodents[0].age,0);stepRodent(r,'local-x',{placed:true,completed:false});assert.equal(r.rodents[0].age,0);assert.equal(r.players[0].placements,1);
 stepRodent(r,'local-x',{placed:true});assert.equal(r.rodents[0].age,1);assert.equal(r.players[0].placements,2);
});
test('No empty-cell meals: jumps to food, excludes current placement and other announced animals',()=>{
 const r=fixture();r.cells=r.cells.filter(c=>c.x>=8);r.rodents=[{id:'rat',player:'local-x',x:0,y:0,phase:0,eaten:0,age:0}];stepRodent(r,'local-x',{exclude:'food-8'});
 assert.equal(r.rodents[0].eaten,1);assert.ok(r.cells.some(c=>c.id==='food-8'));assert.ok(!r.cells.some(c=>c.id==='food-9'));
 r.cells=[];stepRodent(r,'local-x');assert.equal(r.rodents[0].eaten,1);
});
test('Eating preserves earned points and releases only broken paid geometries for reconstruction',()=>{
 const r=fixture();r.cells=r.cells.slice(0,3);r.forms=figureWindows(r.cells,1,0,'X').map(f=>f.id);r.forms.push('O:línea:30,0;31,0;32,0');r.players[0].score=70;r.rodents=[{id:'rat',player:'local-x',x:1,y:0,phase:0,eaten:0,age:0}];
 stepRodent(r,'local-x');assert.equal(r.players[0].score,70);assert.deepEqual(r.forms,['O:línea:30,0;31,0;32,0']);r.cells.push({id:'rebuilt',x:1,y:0,symbol:'X',owner:'local-x'});assert.ok(figureWindows(r.cells,1,0,'X').some(f=>!r.forms.includes(f.id)));
});
test('Pause, reload and expansion never advance the animal; yellow history clears on placement',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.rodents=[{id:'rat',player:'local-x',x:1,y:0,phase:3,eaten:3,age:3}];r.eatenCells=[{x:0,y:0}];
 r=localCommand(r,'pause',{},1001);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1002);assert.equal(r.rodents[0].age,3);
 r=localCommand(r,'move',{x:0,y:0},1003);assert.equal(r.rodents[0].age,4);assert.equal(r.eatenCells.length,0);assert.equal(r.players[0].placements,1);
 const before=structuredClone(r);assert.throws(()=>localCommand(r,'move',{x:0,y:0},1004));assert.deepEqual(r,before);
});
test('Rodent on a sleep cell permits placement; food ignores shield and immunity as neutral map rule',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.rodents=[{id:'rat',player:'local-x',x:0,y:0,phase:3,eaten:3,age:3}];r=localCommand(r,'move',{x:0,y:0},1001);assert.equal(r.cells[0].x,0);
 r.rodents[0].phase=0;r.cells.push({x:1,y:0,id:'shielded',symbol:'O',owner:'local-o'});r.rodents[0].x=1;r.inventoryEffects.shields.push({cell:'shielded',remaining:2});stepRodent(r,'local-x');assert.ok(!r.cells.some(c=>c.id==='shielded'));assert.equal(r.inventoryEffects.shields.length,0);
});
test('Combo record includes bonus, never decreases, and excludes timeout scoring',()=>{
 const p={};recordCombo(p,{points:70,figures:9,moveId:'a'});recordCombo(p,{points:13,figures:2});recordCombo(p,{points:100,automatic:true});assert.deepEqual(p.bestCombo,{points:70,figures:9,moveId:'a'});
 let r=createLocal('local','A','B',1000,'normal','untimed');r.cells=[{x:0,y:0,id:'a',symbol:'X',owner:'local-x'},{x:1,y:0,id:'b',symbol:'X',owner:'local-x'}];r.players[0].figures=2;r=localCommand(r,'move',{x:2,y:0});assert.equal(r.players[0].bestCombo.points,6);assert.equal(r.lastEvent.paidFigures.length,1);
});
