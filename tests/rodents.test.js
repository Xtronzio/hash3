import {livingInterval} from '../src/living-balance.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeHabitats,countHabitatPlacement,advanceHabitats,visitWorms,freezeHabitats,resumeHabitats,habitatLabel,clearHabitatCell} from '../src/inhabitants.js';
import {availableCells,expansionOptions,key,figureWindows} from '../src/game.js';
import {toolCells} from '../src/practice-tools.js';
import {frontierEdges} from '../src/frontiers.js';
import {habitatBlocked,habitatReservations} from '../src/habitat-tools.js';
import {recordCombo} from '../src/records.js';
function fixture(size=333){const r=createLocal('local','A','B',1000,'advanced','untimed');r.terrain=Array.from({length:size},(_,i)=>({x:i%15,y:Math.floor(i/15)}));r.cells=r.terrain.slice(0,60).map(c=>({...c,id:`food-${c.x},${c.y}`,symbol:'X',owner:'local-x'}));return r;}
function animal(kind='rodent',point={x:0,y:0}){return {id:kind,player:'local-x',kind,...point,eaten:0,phase:0,nextAt:34000,...(kind==='worm'?{body:[point]}:{})};}
function birth(r,count){r.players[0].placements=count-1;r.players[0].habitatNext={rodent:Math.ceil(count/33)*33,bomb:Math.ceil(count/66)*66,worm:Math.ceil(count/99)*99,work:Math.ceil(count/198)*198};countHabitatPlacement(r,'local-x',{x:0,y:0},1000,()=>0);}
test('Visible roedores scale 3/6/9; three meals occupy nine completed turns with separate locations',()=>{
 for(const [size,group] of [[333,3],[999,6],[3333,9]]){
  const r=fixture(size);r.territoryEnabled=false;birth(r,livingInterval(66,r.terrain.length));r.worms=[];r.habitatZones[0].next.worm=1000000;r.habitatZones[0].clockNext.worm=1000000;
  assert.equal(r.rodentRaids[0].count,group);assert.equal(r.rodentRaids[0].members.length,group);assert.equal(r.cells.length,60);
  const visits=[];let oldId;
  for(let turn=1;turn<=9;turn++){
   countHabitatPlacement(r,turn%2?'local-o':'local-x',{x:14,y:3},1000+turn,()=>0);
   if(r.rodentVisit?.id!==oldId&&r.rodentVisit){visits.push(...r.rodentVisit.visits);oldId=r.rodentVisit.id;}
   if(turn<9){assert.equal(r.rodentRaids[0].phase,turn%3===1?'arriving':turn%3===2?'eating':'hidden');assert.equal(r.rodentRaids[0].members.length,turn%3===0?0:group);}
   assert.equal(r.cells.length,60-group*Math.floor((turn+1)/3));
  }
  assert.equal(r.rodentRaids.length,0);assert.equal(visits.length,3*group);assert.equal(new Set(visits.map(c=>key(c.x,c.y))).size,3*group);
 }
 const r=fixture();birth(r,198);assert.equal(r.bombs.length,0);assert.equal(r.worms.length,1);assert.equal(r.works.length,3);assert.equal(habitatReservations(r).length,18);
});
test('Loading historic saves preserves placements and never replays overdue milestones',()=>{
 const r=fixture();delete r.habitatVersion;r.players[0].placements=400;initializeHabitats(r,1000);assert.equal(r.players[0].habitatNext.rodent,429);assert.equal(r.rodents.length,0);const before=structuredClone(r);initializeHabitats(r,2000);assert.deepEqual(r,before);
});
test('Rodents ignore time; move visits preserve score and never eat the newly placed ficha',()=>{
 const r=fixture();birth(r,livingInterval(66,r.terrain.length));r.worms=[];r.works=[];r.players[0].score=70;const before=structuredClone(r);
 assert.equal(advanceHabitats(r,1000000,()=>0),false);assert.equal(r.cells.length,before.cells.length);assert.deepEqual(r.rodentRaids,before.rodentRaids);
 const fresh={id:'fresh',x:14,y:9,symbol:'O',owner:'local-o'};r.cells.push(fresh);
 r.habitatZones[0].clockNext.rodent=2000000;countHabitatPlacement(r,'local-o',fresh,1000001,()=>0);assert.ok(r.cells.some(c=>c.id==='fresh'));assert.equal(r.players[0].score,70);assert.equal(r.rodentRaids[0].turn,1);
});
test('Doble advances one completed turn; clocks and cards never advance the visible cycle',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].placements=32;r.rodentRaids=[{id:'existing',player:'local-x',x:0,y:0,count:1,remaining:3,visited:[]}];r.cells=[{id:'a',x:2,y:0,symbol:'O',owner:'local-o'},{id:'b',x:2,y:1,symbol:'O',owner:'local-o'},{id:'c',x:2,y:2,symbol:'O',owner:'local-o'}];
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},1100);r=localCommand(r,'move',{x:0,y:0},1200);assert.equal(r.rodentRaids[0].turn??0,0);
 const nextPoint=availableCells(r,r.pairs[0])[0];r=localCommand(r,'move',nextPoint,1300);assert.equal(r.rodentRaids[0].turn,1);assert.equal(r.players[0].placements,34);
 const before=structuredClone(r.rodentRaids);r=localCommand(r,'tick',{},34000,()=>0);assert.deepEqual(r.rodentRaids,before);
});
test('Worm walks adjacent cells including diagonals, blocks body and disappears with its third meal after nine turns',()=>{
 const r=fixture();r.cells=[{id:'a',x:0,y:0,symbol:'X',owner:'local-x'},{id:'b',x:1,y:1,symbol:'O',owner:'local-o'},{id:'c',x:2,y:2,symbol:'X',owner:'local-x'},{id:'far',x:14,y:8,symbol:'X',owner:'local-x'}];r.worms=[animal('worm')];
 initializeHabitats(r,1000);for(let i=0;i<6;i++)visitWorms(r,null,1000+i,()=>0);
 assert.equal(r.worms[0].eaten,2);assert.equal(r.worms[0].body.length,2);assert.ok(habitatBlocked(r,1,1));assert.ok(!availableCells(r,r.pairs[0]).some(c=>c.x===1&&c.y===1));
 for(let i=0;i<3;i++)visitWorms(r,null,1010+i,()=>0);assert.equal(r.worms.length,0);assert.equal(r.cells.length,1);assert.equal(r.cells[0].id,'far');assert.ok(!habitatBlocked(r,1,1));
});
test('Frontier blocks roedor migration and worm diagonal crossing; automatic bomb breaks the complete barrier',()=>{
 const r=createLocal('local','A','B',1000,'normal','untimed');r.terrain=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));r.frontiers=[{id:'f',edges:frontierEdges({x:0,y:0,side:'east'})}];
 r.terrain.push({x:3,y:0},{x:3,y:1},{x:3,y:2});r.cells=[{id:'own',x:2,y:0,symbol:'X',owner:'local-x'},{id:'outside',x:3,y:1,symbol:'O',owner:'local-o'}];r.worms=[animal('worm',{x:2,y:0})];initializeHabitats(r,1000);for(let i=0;i<6;i++)visitWorms(r,null,1000+i,()=>0);assert.equal(r.worms[0].eaten,1);assert.ok(r.cells.some(c=>c.id==='outside'));
 r.bombs=[{id:'b',kind:'bomb',x:2,y:0,blast:[{x:2,y:0},{x:2,y:1},{x:2,y:2}],nextAt:100000}];advanceHabitats(r,100000);assert.equal(r.frontiers.length,0);assert.equal(r.terrain.length,12);
});
test('Work reserves the full 18 positions, rejects occupation/expansion/cards and balances each of nine changes',()=>{
 const r=fixture();birth(r,198);r.rodents=[];r.worms=[];r.bombs=[];const before=r.terrain.length,pieces=r.cells.length;const reserved=habitatReservations(r),empty=r.works[0].destroy[0],build=r.works[0].build[0];
 assert.ok(!availableCells(r,r.pairs[0]).some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(!toolCells(r,'local-x','destroy').some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(!toolCells(r,'local-x','activate').some(c=>c.x===build.x&&c.y===build.y));
 assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).every(p=>!reserved.some(c=>c.x>=p.x&&c.x<p.x+3&&c.y>=p.y&&c.y<p.y+3)));
 for(const t of [34000,67000,100000]){advanceHabitats(r,t,()=>0);assert.equal(r.terrain.length,before);}
 assert.equal(r.works.length,0);assert.ok(!r.terrain.some(c=>c.x===empty.x&&c.y===empty.y));assert.ok(r.terrain.some(c=>c.x===build.x&&c.y===build.y));assert.equal(r.cells.length,pieces);
});
test('Conflicting work cancels remaining reservations without unilateral destruction or construction',()=>{
 const r=fixture();birth(r,198);r.rodents=[];r.worms=[];r.bombs=[];const w=r.works[0],size=r.terrain.length;r.cells.push({id:'conflict',...w.destroy[0],symbol:'X',owner:'local-x'});advanceHabitats(r,34000,()=>0);assert.equal(r.terrain.length,size);assert.ok(!r.works.some(v=>v.id===w.id));
});
test('Local pause/reload/resume preserves the exact turn counter and never performs accumulated meals',()=>{
 let r=fixture();r.worms=[animal('worm')];initializeHabitats(r,1000);visitWorms(r,null,1001,()=>0);r=localCommand(r,'pause',{},11000);assert.equal(r.worms[0].turnsSinceMeal,1);assert.equal(r.worms[0].remainingMs,undefined);
 const paused=structuredClone(r);assert.equal(localCommand(r,'tick',{},1000000),r);assert.deepEqual(r,paused);
 r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1000000);assert.equal(r.worms[0].nextAt,undefined);r=localCommand(r,'tick',{},1022999);assert.equal(r.worms[0].eaten,0);visitWorms(r,null,1023000,()=>0);visitWorms(r,null,1023001,()=>0);assert.equal(r.worms[0].eaten,1);
});
test('Mundo activity belongs to connected inhabited territory and preserves emigrant origin/capacity',()=>{
 const r=fixture();r.mode='world';r.players.forEach(p=>p.active=false);r.worms=[animal('worm')];advanceHabitats(r,11000);assert.equal(r.worms[0].remainingMs,33000);
 advanceHabitats(r,1000000);assert.equal(r.worms[0].eaten,0);r.players[1].active=true;advanceHabitats(r,1000001);assert.equal(r.worms[0].nextAt,1033001);advanceHabitats(r,1033001,()=>0);assert.equal(r.worms[0].eaten,1);assert.equal(r.worms[0].player,'local-x');
});
test('Absent food retries the next three-turn meal attempt; finished games never advance',()=>{
 const r=fixture();r.cells=[];r.worms=[animal('worm')];initializeHabitats(r,1000);for(let i=0;i<3;i++)visitWorms(r,null,1000+i);assert.equal(r.worms[0].eaten,0);assert.equal(r.worms[0].failedMeals,1);assert.equal(r.worms[0].nextAt,undefined);r.status='finished';r.cells.push({id:'food',x:0,y:0,symbol:'X',owner:'local-x'});advanceHabitats(r,67000);assert.equal(r.cells.length,1);
});
test('Clearing preserves earned points and releases broken paid figures for reconstruction',()=>{
 const r=fixture();r.cells=r.cells.slice(0,3);r.forms=figureWindows(r.cells,1,0,'X').map(f=>f.id);r.forms.push('O:línea:30,0;31,0;32,0');r.players[0].score=70;clearHabitatCell(r,{x:1,y:0});assert.equal(r.players[0].score,70);assert.deepEqual(r.forms,['O:línea:30,0;31,0;32,0']);
});
test('Status describes shared proportional fauna and combo records exclude timeout scoring',()=>{
 const r=fixture();assert.match(habitatLabel(r,'local-x'),/fauna proporcional por zona/);const p={};recordCombo(p,{points:70,figures:9,moveId:'a'});recordCombo(p,{points:13,figures:2});recordCombo(p,{points:100,automatic:true});assert.equal(p.bestCombo.points,70);
});
