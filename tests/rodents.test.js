import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeHabitats,countHabitatPlacement,advanceHabitats,freezeHabitats,resumeHabitats,habitatLabel,clearHabitatCell} from '../src/inhabitants.js';
import {availableCells,expansionOptions,key,figureWindows} from '../src/game.js';
import {toolCells} from '../src/practice-tools.js';
import {frontierEdges} from '../src/frontiers.js';
import {habitatBlocked,habitatReservations} from '../src/habitat-tools.js';
import {recordCombo} from '../src/records.js';
function fixture(){const r=createLocal('local','A','B',1000,'advanced','untimed');r.terrain=Array.from({length:150},(_,i)=>({x:i%15,y:Math.floor(i/15)}));r.cells=r.terrain.slice(0,60).map(c=>({...c,id:`food-${c.x},${c.y}`,symbol:'X',owner:'local-x'}));return r;}
function animal(kind='rodent',point={x:0,y:0}){return {id:kind,player:'local-x',kind,...point,eaten:0,phase:0,nextAt:34000,...(kind==='worm'?{body:[point]}:{})};}
function birth(r,count){r.players[0].placements=count-1;r.players[0].habitatNext={rodent:Math.ceil(count/33)*33,bomb:Math.ceil(count/66)*66,worm:Math.ceil(count/99)*99,work:Math.ceil(count/198)*198};countHabitatPlacement(r,'local-x',{x:0,y:0},1000,()=>0);}
test('Independent milestones 33/66/99/198 count accepted placements and allow overlapping generations',()=>{
 const r=fixture();birth(r,33);assert.equal(r.rodents.length,1);assert.equal(r.cells.length,60);assert.equal(r.rodents[0].eaten,0);
 birth(r,66);assert.equal(r.rodents.length,2);assert.equal(r.bombs.length,1);
 birth(r,99);assert.equal(r.rodents.length,3);assert.equal(r.worms.length,1);
 birth(r,198);assert.equal(r.rodents.length,4);assert.equal(r.bombs.length,2);assert.equal(r.worms.length,2);assert.equal(r.works.length,3);assert.equal(habitatReservations(r).length,18);
 countHabitatPlacement(r,'local-x',{x:0,y:0},1001,()=>0);assert.equal(r.works.length,3);assert.equal(r.players[0].placements,199);
});
test('Loading historic saves preserves placements and never replays overdue milestones',()=>{
 const r=fixture();delete r.habitatVersion;r.players[0].placements=400;initializeHabitats(r,1000);assert.equal(r.players[0].habitatNext.rodent,429);assert.equal(r.rodents.length,0);const before=structuredClone(r);initializeHabitats(r,2000);assert.deepEqual(r,before);
});
test('Rodent eats exactly three real fichas at 33 seconds independently of turns, points and immunity',()=>{
 const r=fixture();r.rodents=[animal()];r.players[0].score=70;r.inventoryEffects.shields=[{cell:'food-0,0',remaining:2}];
 assert.equal(advanceHabitats(r,33999,()=>0),false);assert.equal(r.cells.length,60);
 for(let t=34000;t<=100000;t+=33000)advanceHabitats(r,t,()=>0);
 assert.equal(r.rodents.length,0);assert.equal(r.cells.length,57);assert.equal(r.players[0].score,70);assert.equal(r.inventoryEffects.shields.length,0);
});
test('A normal placement scares a rodent without killing it or resetting capacity or deadline',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.rodents=[animal()];r.cells=[{id:'food',x:2,y:0,owner:'local-o',symbol:'O'}];
 r=localCommand(r,'move',{x:0,y:0},2000,()=>0);assert.equal(r.rodents.length,1);assert.equal(r.rodents[0].x,2);assert.equal(r.rodents[0].nextAt,34000);assert.equal(r.rodents[0].eaten,0);
});
test('Untimed local tick still runs inhabitants; Doble counts both accepted placements but never a meal',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.cells=[{id:'food',x:2,y:2,symbol:'O',owner:'local-o'}];r.rodents=[animal('rodent',{x:2,y:2})];
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},1100);r=localCommand(r,'move',{x:0,y:0},1200);r=localCommand(r,'move',{x:1,y:0},1300);assert.equal(r.players[0].placements,2);assert.equal(r.rodents[0].eaten,0);
 const next=localCommand(r,'tick',{},34000,()=>0);assert.equal(next.rodents[0].eaten,1);assert.equal(next.cells.length,2);assert.equal(next.players[0].placements,2);
});
test('Worm walks adjacent cells including diagonals, blocks body and frees it after the fourth interval',()=>{
 const r=fixture();r.cells=[{id:'a',x:0,y:0,symbol:'X',owner:'local-x'},{id:'b',x:1,y:1,symbol:'O',owner:'local-o'},{id:'c',x:2,y:2,symbol:'X',owner:'local-x'},{id:'far',x:14,y:8,symbol:'X',owner:'local-x'}];r.worms=[animal('worm')];
 for(const t of [34000,67000,100000])advanceHabitats(r,t,()=>0);
 assert.equal(r.worms[0].eaten,3);assert.equal(r.worms[0].body.length,3);assert.equal(r.cells.length,1);assert.equal(r.cells[0].id,'far');
 assert.ok(habitatBlocked(r,1,1));assert.ok(!availableCells(r,r.pairs[0]).some(c=>c.x===1&&c.y===1));
 advanceHabitats(r,133000,()=>0);assert.equal(r.worms.length,0);assert.ok(!habitatBlocked(r,1,1));
});
test('Frontier blocks roedor migration and worm diagonal crossing; automatic bomb breaks the complete barrier',()=>{
 const r=createLocal('local','A','B',1000,'normal','untimed');r.terrain=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));r.frontiers=[{id:'f',edges:frontierEdges({x:0,y:0,side:'east'})}];
 r.terrain.push({x:3,y:0},{x:3,y:1},{x:3,y:2});r.cells=[{id:'own',x:2,y:0,symbol:'X',owner:'local-x'},{id:'outside',x:3,y:1,symbol:'O',owner:'local-o'}];r.worms=[animal('worm',{x:2,y:0})];advanceHabitats(r,34000,()=>0);advanceHabitats(r,67000,()=>0);assert.equal(r.worms[0].eaten,1);assert.ok(r.cells.some(c=>c.id==='outside'));
 r.bombs=[{id:'b',kind:'bomb',x:2,y:0,blast:[{x:2,y:0},{x:2,y:1},{x:2,y:2}],nextAt:100000}];advanceHabitats(r,100000);assert.equal(r.frontiers.length,0);assert.equal(r.terrain.length,12);
});
test('Work reserves the full 18 positions, rejects occupation/expansion/cards and balances each of nine changes',()=>{
 const r=fixture();birth(r,198);r.rodents=[];r.worms=[];r.bombs=[];const before=r.terrain.length;const reserved=habitatReservations(r),empty=r.works[0].destroy[0],build=r.works[0].build[0];
 assert.ok(!availableCells(r,r.pairs[0]).some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(!toolCells(r,'local-x','destroy').some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(!toolCells(r,'local-x','activate').some(c=>c.x===build.x&&c.y===build.y));
 assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).every(p=>!reserved.some(c=>c.x>=p.x&&c.x<p.x+3&&c.y>=p.y&&c.y<p.y+3)));
 for(const t of [34000,67000,100000]){advanceHabitats(r,t,()=>0);assert.equal(r.terrain.length,before);}
 assert.equal(r.works.length,0);assert.ok(!r.terrain.some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(r.terrain.some(c=>c.x===build.x&&c.y===build.y));assert.equal(r.cells.length,60);
});
test('Conflicting work cancels remaining reservations without unilateral destruction or construction',()=>{
 const r=fixture();birth(r,198);r.rodents=[];r.worms=[];r.bombs=[];const w=r.works[0],size=r.terrain.length;r.cells.push({id:'conflict',...w.destroy[0],symbol:'X',owner:'local-x'});advanceHabitats(r,34000,()=>0);assert.equal(r.terrain.length,size);assert.ok(!r.works.some(v=>v.id===w.id));
});
test('Local pause/reload/resume preserves the exact remaining clock and never performs accumulated meals',()=>{
 let r=fixture();r.rodents=[animal()];r=localCommand(r,'pause',{},11000);assert.equal(r.rodents[0].remainingMs,23000);
 const paused=structuredClone(r);assert.equal(localCommand(r,'tick',{},1000000),r);assert.deepEqual(r,paused);
 r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1000000);assert.equal(r.rodents[0].nextAt,1023000);r=localCommand(r,'tick',{},1022999);assert.equal(r.rodents[0].eaten,0);r=localCommand(r,'tick',{},1023000);assert.equal(r.rodents[0].eaten,1);
});
test('Mundo activity belongs to connected inhabited territory and preserves emigrant origin/capacity',()=>{
 const r=fixture();r.mode='world';r.players.forEach(p=>p.active=false);r.rodents=[animal()];advanceHabitats(r,11000);assert.equal(r.rodents[0].remainingMs,33000);
 advanceHabitats(r,1000000);assert.equal(r.rodents[0].eaten,0);r.players[1].active=true;advanceHabitats(r,1000001);assert.equal(r.rodents[0].nextAt,1033001);advanceHabitats(r,1033001,()=>0);assert.equal(r.rodents[0].eaten,1);assert.equal(r.rodents[0].player,'local-x');
});
test('Absent food retries the next independent interval; finished games never advance',()=>{
 const r=fixture();r.cells=[];r.rodents=[animal()];advanceHabitats(r,34000);assert.equal(r.rodents[0].eaten,0);assert.equal(r.rodents[0].nextAt,67000);r.status='finished';r.cells.push({id:'food',x:0,y:0,symbol:'X',owner:'local-x'});advanceHabitats(r,67000);assert.equal(r.cells.length,1);
});
test('Clearing preserves earned points and releases broken paid figures for reconstruction',()=>{
 const r=fixture();r.cells=r.cells.slice(0,3);r.forms=figureWindows(r.cells,1,0,'X').map(f=>f.id);r.forms.push('O:línea:30,0;31,0;32,0');r.players[0].score=70;clearHabitatCell(r,{x:1,y:0});assert.equal(r.players[0].score,70);assert.deepEqual(r.forms,['O:línea:30,0;31,0;32,0']);
});
test('Status distinguishes per-player arrival counters and combo records exclude timeout scoring',()=>{
 const r=fixture();assert.match(habitatLabel(r,'local-x'),/Roedor 33 · Bomba 66 · Gusano 99 · Obra 198/);const p={};recordCombo(p,{points:70,figures:9,moveId:'a'});recordCombo(p,{points:13,figures:2});recordCombo(p,{points:100,automatic:true});assert.equal(p.bestCombo.points,70);
});
