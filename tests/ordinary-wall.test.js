import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canUsePracticeTool,toolAllowance,practiceTools} from '../src/practice-tools.js';
import {compactInventoryMarkup,inventoryStatusMarkup} from '../src/inventory.js';
const now=1700000000000;
const fresh=(timeMode='untimed')=>{const g=createLocal('local','A','B',now,'normal',timeMode);g.players[0].inventory.cards.frontier=3;g.players[1].inventory.cards.frontier=3;return g;};
const wall=(g,playerId='local-x',x=3,y=0)=>localCommand(g,'inventory',{tool:'frontier',playerId,x,y},now+1000);

test('Muro works in a normal own turn with empty cells, spending one card and allowance while preserving the turn and clock',()=>{
 for(const timeMode of ['timed','untimed']){
  const g=fresh(timeMode),before=structuredClone(g),next=wall(g);
  assert.deepEqual(g,before);assert.deepEqual(next.terrain,g.terrain);assert.deepEqual(next.cells,g.cells);assert.deepEqual(next.pairs,g.pairs);
  assert.deepEqual(next.frontiers[0].cells,[{x:3,y:0}]);assert.equal(next.frontiers[0].by,'local-x');
  assert.equal(next.players[0].inventory.cards.frontier,2);assert.equal(toolAllowance(next,'local-x').remaining,0);
  assert.equal(next.pairs[0].pending,0);assert.equal(next.pairs[0].frontierUsed,undefined);
  assert.deepEqual(next.players.map(p=>[p.score,p.placements,p.inventory.draws,p.inventory.turns]),g.players.map(p=>[p.score,p.placements,p.inventory.draws,p.inventory.turns]));
  assert.equal(canUsePracticeTool(next,'local-x','double',now+1000),false);
  assert.throws(()=>wall(next,'local-x',-1,0));
  const placed=localCommand(next,'move',{x:0,y:0},now+1000);assert.equal(placed.pairs[0].turn,'O');assert.equal(placed.frontiers.length,1);
  assert.equal(canUsePracticeTool(placed,'local-o','frontier',now+1000),true);
 }
});
test('Muro obeys opponent turn, pause, deadline, stock, occupied terrain and saved allowance',()=>{
 const g=fresh('timed');assert.equal(canUsePracticeTool(g,'local-o','frontier',now),false);assert.throws(()=>wall(g,'local-o'));
 const original=structuredClone(g);for(const [x,y] of [[0,0],[20,20]])assert.throws(()=>wall(g,'local-x',x,y));assert.deepEqual(g,original);
 assert.equal(canUsePracticeTool(g,'local-x','frontier',now+33000),false);
 const next=wall(g),paused=localCommand(next,'pause',{},now+2000);
 assert.equal(canUsePracticeTool(paused,'local-x','frontier',now+2000),false);
 const saved=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},now+4000);
 assert.deepEqual(saved.frontiers,next.frontiers);assert.deepEqual(saved.practiceTurn,next.practiceTurn);
 assert.equal(canUsePracticeTool(saved,'local-x','double',now+4000),false);
 const empty=fresh();empty.players[0].inventory.cards.frontier=0;assert.equal(canUsePracticeTool(empty,'local-x','frontier',now),false);
});
test('Combo counts Muro as an ordinary tool, combines it with another type and disallows a second wall',()=>{
 const g=fresh();for(const t of practiceTools)g.players[0].inventory.cards[t.id]=0;
 Object.assign(g.players[0].inventory.cards,{frontier:2,double:1,combo:1});
 assert.equal(canUsePracticeTool(g,'local-x','combo',now),true);
 const combo=localCommand(g,'inventory',{playerId:'local-x',tool:'combo'},now),next=wall(combo);
 assert.equal(toolAllowance(next,'local-x').remaining,1);assert.equal(canUsePracticeTool(next,'local-x','frontier',now+1000),false);
 const doubled=localCommand(next,'inventory',{playerId:'local-x',tool:'double'},now+1000);
 assert.equal(toolAllowance(doubled,'local-x').remaining,0);assert.equal(doubled.practiceTurn.remaining,2);
 const one=localCommand(doubled,'move',{x:0,y:0},now+1000);assert.equal(one.pairs[0].turn,'X');
 assert.equal(localCommand(one,'move',{x:1,y:0},now+1000).pairs[0].turn,'O');
});
test('Inventory labels offer Muro during a normal turn and show spent state after placement',()=>{
 const g=fresh();assert.match(inventoryStatusMarkup(g,{playerId:'local-x'}),/Muro · 3 cartas · usar ahora/);
 assert.match(compactInventoryMarkup(g,'local-x'),/Muro, 3 cartas, Usar/);
 const next=wall(g);assert.match(compactInventoryMarkup(next,'local-x'),/Muro, 2 cartas, Usada este turno/);
 assert.doesNotMatch(compactInventoryMarkup(next,'local-x'),/Solo al ampliar|Usada en esta ampliación/);
});
