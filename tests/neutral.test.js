import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {placeNeutral} from '../src/neutral.js';
import {availableCells,figureWindows} from '../src/game.js';
import {toolCells} from '../src/practice-tools.js';
import {machineMoveScore} from '../src/machine.js';
import {initializeHabitats,countHabitatPlacement,advanceHabitats} from '../src/inhabitants.js';
import {rodentVisitFeedback,boardActionFeedback} from '../src/rodent-feedback.js';

test('# appears without awarding points, has no owner and cannot be played over',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.cells=[{id:'a',x:0,y:0,symbol:'X',owner:'local-x'},{id:'b',x:1,y:0,symbol:'X',owner:'local-x'}];
 const cell=placeNeutral(room,[{x:2,y:0},{x:2,y:2}],1000,()=>0);
 assert.equal(cell.x,2);assert.equal(cell.y,0);assert.equal(cell.symbol,'#');assert.equal(cell.owner,null);
 assert.deepEqual(figureWindows(room.cells,2,0,'#'),[]);assert.ok(!availableCells(room,room.pairs[0]).some(c=>c.x===2&&c.y===0));
 assert.throws(()=>localCommand(room,'move',{x:2,y:0},2000),/vacía/);
});
test('# respects reservations, leaves a legal move and can be erased but never converted or shifted',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.inventoryEffects.blocks=[{x:2,y:0,remaining:3}];
 assert.equal(placeNeutral(room,[{x:2,y:0},{x:1,y:0}],1000,()=>0),null);
 const cell=placeNeutral(room,room.terrain,1000,()=>0);assert.ok(cell);
 assert.ok(toolCells(room,'local-x','erase').some(c=>c.id===cell.id));
 assert.ok(!toolCells(room,'local-x','opposite').some(c=>c.id===cell.id));assert.ok(!toolCells(room,'local-x','shift').some(c=>c.id===cell.id));
 const next=localCommand(room,'inventory',{tool:'erase',playerId:'local-x',x:cell.x,y:cell.y},2000);assert.ok(!next.cells.some(c=>c.id===cell.id));assert.equal(next.players[0].score,0);
});
test('Machine uses # as the placing symbol, while invasion * remains an obstacle',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.pairs[0].turn='O';room.cells=[{id:'n',x:0,y:0,symbol:'#',owner:null},{id:'o',x:1,y:0,symbol:'O',owner:'local-o'}];
 const score=machineMoveScore(room,{x:2,y:0},'O');assert.equal(score.figures,1);assert.equal(score.points,3);room.cells[0].symbol='*';assert.equal(machineMoveScore(room,{x:2,y:0},'O').points,0);
});
test('Legacy rats migrate to move visits once; completed worms release their body at load',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.habitatVersion=1;room.rodents=[{id:'old',x:0,y:0,player:'local-x',eaten:1,nextAt:33000}];room.worms=[{id:'old-worm',eaten:3,body:[{x:1,y:0}]}];
 initializeHabitats(room,40000);assert.equal(room.habitatVersion,3);assert.equal(room.rodents.length,0);assert.equal(room.rodentRaids[0].remaining,2);assert.equal(room.worms.length,0);
 initializeHabitats(room,90000);assert.equal(room.rodentRaids.length,1);advanceHabitats(room,1000000);assert.equal(room.rodentRaids[0].remaining,2);
});
test('An idle legacy save persists its upgrade once without permanent polling work',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.habitatVersion=1;
 const next=localCommand(room,'tick',{},2000);assert.equal(next.habitatVersion,3);assert.notEqual(next,room);assert.equal(localCommand(next,'tick',{},3000),next);
});
test('No-food visits expire after three moves and never build an overdue backlog',()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');room.players[0].placements=35;
 for(let i=0;i<3;i++)countHabitatPlacement(room,'local-x',{x:0,y:0},1000+i,()=>0);
 assert.equal(room.rodentRaids.length,0);assert.equal(room.rodentVisit,undefined);assert.equal(room.cells.filter(c=>c.symbol==='#').length,1);
});
test('Rodent feedback only animates a new visit of the same running game',()=>{
 const previous={id:'a',rodentVisit:{id:'old'}},next={id:'a',rodentVisit:{id:'new',visits:[{x:1,y:2}]}};
 assert.equal(rodentVisitFeedback(previous,next).visits.length,1);assert.equal(rodentVisitFeedback(next,next),null);assert.equal(rodentVisitFeedback(null,next),null);assert.equal(rodentVisitFeedback(previous,{...next,id:'b'}),null);
});

test('Automatic territory cards and workers publish minimal animation coordinates once',()=>{
 const previous={id:'a',status:'playing'},next={id:'a',status:'playing',neutralEvent:{id:'n',x:0,y:1},habitatEvent:{id:'h',actions:[{x:2,y:2,kind:'bomb'},{x:3,y:2,kind:'build'}]}};
 const feedback=boardActionFeedback(previous,next);assert.deepEqual(feedback.visits.map(v=>v.kind),['bomb','build','neutral']);assert.equal(boardActionFeedback(next,next),null);assert.equal(boardActionFeedback(null,next),null);
});

test('Neutral arrival replaces a mouse animation when its cell was eaten in the same move',()=>{
 const previous={id:'r',status:'playing'},next={id:'r',status:'playing',rodentVisit:{id:'meal',visits:[{x:1,y:1}]},neutralEvent:{id:'n',x:1,y:1}};
 assert.deepEqual(boardActionFeedback(previous,next).visits,[{x:1,y:1,kind:'neutral'}]);
});
