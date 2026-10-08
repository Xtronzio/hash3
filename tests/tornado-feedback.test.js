import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {tornadoFeedback} from '../src/tornado-feedback.js';

const now=1700000000000;
test('Tornado animation follows actual shuffled IDs, including pieces moving into holes',()=>{
 const before=createLocal('local','A','B',now,'normal','untimed');
 before.players[0].inventory.cards.tornado=1;
 before.cells=[{id:'x',symbol:'X',owner:'local-x',x:0,y:0},{id:'o',symbol:'O',owner:'local-o',x:1,y:0}];
 const after=localCommand(before,'inventory',{playerId:'local-x',tool:'tornado',x:0,y:0},now,()=>0);
 const feedback=tornadoFeedback(before,after);
 assert.equal(feedback.affected.length,9);assert.ok(feedback.moves.length>0);
 for(const move of feedback.moves){
  const source=before.cells.find(c=>c.id===move.id),destination=after.cells.find(c=>c.id===move.id);
  assert.deepEqual(move.from,{x:source.x,y:source.y});assert.deepEqual(move.to,{x:destination.x,y:destination.y});
  assert.equal(move.symbol,source.symbol);assert.equal(move.owner,source.owner);
 }
 assert.ok(feedback.moves.some(m=>!before.cells.some(c=>c.x===m.to.x&&c.y===m.to.y)));
 assert.equal(tornadoFeedback(after,after),null);
 assert.equal(tornadoFeedback(null,after),null);
 assert.equal(tornadoFeedback({...before,id:'another-room'},after),null);
 assert.equal(tornadoFeedback(before,{...after,lastEvent:{...after.lastEvent,tool:'bomb'}}),null);
});

test('A shielded or stationary piece never gets a moving animation',()=>{
 const before=createLocal('local','A','B',now,'normal','untimed');
 before.players[0].inventory.cards.tornado=1;
 before.cells=[{id:'shield',symbol:'X',owner:'local-x',x:0,y:0},{id:'o',symbol:'O',owner:'local-o',x:1,y:0}];
 before.inventoryEffects.shields=[{cell:'shield',by:'local-x',remaining:2}];
 const after=localCommand(before,'inventory',{playerId:'local-x',tool:'tornado',x:0,y:0},now,()=>0);
 assert.ok(tornadoFeedback(before,after).moves.every(m=>m.id!=='shield'));
});
