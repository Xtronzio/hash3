import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,reconcileLocalBoard,machineChoice} from '../src/local.js';
import {availableCells,playableTerrain,connectedTerrain,expansionOptions} from '../src/game.js';
import {toolCells,moveDestination} from '../src/practice-tools.js';
import {frontierOptions,tornadoOptions,bombOptions} from '../src/area-tools.js';
const now=1700000000000;
const start=(mode='local')=>{
 const r=createLocal(mode,'A','B',now,'normal','untimed');
 r.terrain=[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:3,y:1},{x:4,y:1}];
 r.cells=[{id:'origin',x:0,y:0,symbol:'X',owner:'local-x'},{id:'remote',x:3,y:0,symbol:'O',owner:'local-o'}];
 r.players[0].inventory.cards.destroy=1;
 return localCommand(r,'inventory',{tool:'destroy',playerId:'local-x',x:1,y:0},now);
};
test('Removing a bridge leaves every built island available to both players, without restoring the removed cell',()=>{
 const r=start(),p=r.pairs[0];
 assert.equal(connectedTerrain(r.terrain,p.active).length,1);
 assert.equal(playableTerrain(r,p).length,5);
 assert.deepEqual(availableCells(r,p),[{x:2,y:0},{x:3,y:1},{x:4,y:1}]);
 assert.equal(p.pending,0);
 const next=localCommand(r,'move',{x:4,y:1},now);
 assert.equal(next.pairs[0].turn,'O');assert.equal(next.pairs[0].pending,0);
 assert.ok(availableCells(next,next.pairs[0]).some(c=>c.x===2&&c.y===0));
 assert.throws(()=>localCommand(next,'move',{x:1,y:0},now));
});
test('Tools and all AI levels see the detached island instead of expanding from the full origin',()=>{
 const r=start('solo');delete r.practiceTurn;
 for(const kind of ['erase','opposite','shift'])assert.ok(toolCells(r,'local-x',kind).some(c=>c.x===3&&c.y===0));
 assert.ok(toolCells(r,'local-x','destroy').some(c=>c.x===4&&c.y===1));
 assert.ok(toolCells(r,'local-x','activate').some(c=>c.x===5&&c.y===1));
 assert.ok(moveDestination(r,'local-x',{x:4,y:1}));
 const candidates=new Set(availableCells(r,r.pairs[0]).map(c=>`${c.x},${c.y}`));
 for(const difficulty of ['basic','medium','high','pro']){
  const choice=machineChoice({...r,difficulty},()=>0,{timeMs:20,nodeLimit:500});
  assert.equal(choice.action,'move');assert.ok(candidates.has(`${choice.payload.x},${choice.payload.y}`));
 }
 assert.ok(tornadoOptions(r).some(c=>c.x>=1));
 r.cells.push({id:'third',x:3,y:1,symbol:'X',owner:'local-x'},{id:'fourth',x:4,y:1,symbol:'O',owner:'local-o'});
 assert.ok(bombOptions(r).some(c=>c.x>=2));
});
test('Expansion and Frontier can be placed at any built island while a cell wall still blocks its own footprint',()=>{
 const r=start();r.frontiers=[{id:'wall',cells:[{x:-1,y:0},{x:-1,y:1},{x:-1,y:2}]}];
 const options=expansionOptions(r.terrain,r.pairs[0].active,r);
 assert.ok(options.some(p=>p.x===4&&p.y===1));
 assert.ok(!options.some(p=>p.x===-1&&p.y===0));
 assert.ok(frontierOptions(r,'south','local-x').some(p=>p.x===5&&p.y===1));
});
test('Old saves with false pending expansion recover without changing pieces, scores, turn or time',()=>{
 const old=start();old.timeMode='timed';old.pairs[0].pending=1;old.pairs[0].expander='local-x';old.pairs[0].deadline=new Date(now+12000).toISOString();old.players[0].score=7157;
 const before=structuredClone(old),fixed=reconcileLocalBoard(old,now);
 assert.deepEqual(old,before);assert.equal(fixed.pairs[0].pending,0);assert.equal(fixed.pairs[0].expander,null);
 assert.equal(fixed.pairs[0].deadline,old.pairs[0].deadline);assert.equal(fixed.pairs[0].turn,old.pairs[0].turn);
 assert.deepEqual(fixed.terrain,old.terrain);assert.deepEqual(fixed.cells,old.cells);assert.equal(fixed.players[0].score,7157);
 assert.equal(reconcileLocalBoard(fixed,now),fixed);
 const tick=localCommand(old,'tick',{},now);assert.equal(tick.pairs[0].pending,0);
 const paused=localCommand(old,'pause',{},now),resumed=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},now+1000);
 assert.equal(resumed.pairs[0].pending,0);assert.equal(Date.parse(resumed.pairs[0].deadline),now+13000);
});
test('Unbuilt gaps, worm bodies and construction reservations remain unavailable; online territory remains connected',()=>{
 const r=start();r.worms=[{id:'w',x:3,y:1,body:[{x:3,y:1}],eaten:0,nextAt:now+33000}];
 r.works=[{id:'b',done:0,destroy:[{x:4,y:1}],build:[{x:5,y:1}]}];
 assert.deepEqual(availableCells(r,r.pairs[0]),[{x:2,y:0}]);
 const online={...r};delete online.mode;
 assert.deepEqual(playableTerrain(online,r.pairs[0]),[{x:0,y:0}]);assert.deepEqual(availableCells(online,r.pairs[0]),[]);
});
