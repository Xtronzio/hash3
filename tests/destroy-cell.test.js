import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {toolCells,canUsePracticeTool,initializeInventory,completeInventoryTurn,practiceTools} from '../src/practice-tools.js';
import {terrainOf,availableCells,connectedTerrain} from '../src/game.js';
import {activateImmunity} from '../src/immunity.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
const now=1700000000000;
const start=()=>{const r=createLocal('local','A','B',now,'normal','untimed');r.players[0].inventory.cards.destroy=1;return r;};
const destroy=(r,x=1,y=1)=>localCommand(r,'inventory',{tool:'destroy',playerId:'local-x',x,y},now);
test('Destruction removes only terrain, preserving tokens, paid figures, score, turn and clock',()=>{
 const r=start();r.timeMode='timed';r.pairs[0].deadline=new Date(now+33000).toISOString();r.cells=[{id:'own',x:0,y:1,symbol:'X',owner:'local-x'},{id:'rival',x:2,y:1,symbol:'O',owner:'local-o'}];r.players[0].score=60;r.forms=['paid'];
 const before=structuredClone(r),next=destroy(r);assert.deepEqual(r,before);assert.equal(terrainOf(next).length,8);assert.deepEqual(next.cells,r.cells);assert.deepEqual(next.forms,r.forms);assert.equal(next.players[0].score,60);
 assert.equal(next.players[0].inventory.cards.destroy,0);assert.equal(next.players[0].inventory.turns,0);assert.equal(next.pairs[0].turn,'X');assert.equal(next.pairs[0].deadline,r.pairs[0].deadline);
 assert.ok(!availableCells(next,next.pairs[0]).some(c=>c.x===1&&c.y===1));
 assert.throws(()=>destroy(r,0,1));assert.throws(()=>destroy(r,2,1));assert.throws(()=>destroy(r,9,9));
 assert.throws(()=>localCommand(next,'move',{x:1,y:1},now));
 const placed=localCommand(next,'move',{x:1,y:0},now);assert.equal(placed.pairs[0].turn,'O');
});
test('Destroy follows stock, one-tool/Combo limits, clock, pause, expansion and immunity',()=>{
 const r=start();assert.ok(canUsePracticeTool(r,'local-x','destroy',now));
 for(const mutate of [g=>g.status='paused',g=>{g.pairs[0].pending=1;g.cells=g.terrain.map((c,i)=>({...c,id:'full'+i,owner:'local-o',symbol:'O'}));},g=>g.players[0].inventory.cards.destroy=0,g=>{g.timeMode='timed';g.pairs[0].deadline=new Date(now).toISOString();},g=>activateImmunity(g,'local-o')]){const g=structuredClone(r);mutate(g);assert.throws(()=>destroy(g));}
 const next=destroy(r);assert.equal(canUsePracticeTool(next,'local-x','double',now),false);
 r.players[0].inventory.cards.combo=1;r.players[0].inventory.cards.activate=1;
 const armed=localCommand(r,'inventory',{tool:'combo',playerId:'local-x'},now),removed=destroy(armed),restored=localCommand(removed,'inventory',{tool:'activate',playerId:'local-x',x:1,y:1},now);
 assert.equal(restored.terrain.length,9);assert.equal(restored.pairs[0].turn,'X');assert.ok(canUsePracticeTool(restored,'local-x','double',now)===false);
});
test('Removing the origin keeps the white frame in place and a usable saved navigation reference',()=>{
 const r=start(),next=destroy(r,0,0);assert.deepEqual(next.pairs[0].active,r.pairs[0].active);assert.ok(next.pairs[0].terrainAnchor);
 assert.equal(availableCells(next,next.pairs[0]).length,8);
 const loaded=localCommand(JSON.parse(JSON.stringify(localCommand(next,'pause',{},now))),'resume',{},now+1000);assert.equal(availableCells(loaded,loaded.pairs[0]).length,8);
 const restored=structuredClone(loaded);restored.players[0].inventory.cards.activate=1;delete restored.practiceTurn;
 const built=localCommand(restored,'inventory',{tool:'activate',playerId:'local-x',x:0,y:0},now+1000);assert.equal(availableCells(built,built.pairs[0]).length,9);
});
test('Destroying a bridge isolates terrain without deleting tokens, and building reconnects it',()=>{
 const r=start();r.terrain=[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1}];r.cells=[{id:'remote',x:2,y:0,symbol:'O',owner:'local-o'}];
 const next=destroy(r,1,0);assert.equal(next.cells.length,1);assert.deepEqual(availableCells(next,next.pairs[0]),[{x:0,y:0},{x:0,y:1}]);
 assert.ok(!toolCells(next,'local-x','destroy').some(c=>c.x===2&&c.y===0));next.players[0].inventory.cards.activate=1;delete next.practiceTurn;
 const restored=localCommand(next,'inventory',{tool:'activate',playerId:'local-x',x:1,y:0},now);assert.equal(connectedTerrain(restored.terrain,restored.pairs[0].terrainAnchor||restored.pairs[0].active).length,4);
});
test('Removing the last playable empty cell enters expansion, which can restore the hole',()=>{
 const r=start();r.cells=r.terrain.filter(c=>c.x!==1||c.y!==1).map((c,i)=>({...c,id:String(i),symbol:'O',owner:'local-o'}));
 const next=destroy(r);assert.equal(next.pairs[0].pending,1);assert.equal(next.pairs[0].expander,'local-x');
 const expanded=localCommand(next,'expand',{x:0,y:0},now);assert.ok(expanded.terrain.some(c=>c.x===1&&c.y===1));assert.equal(expanded.pairs[0].pending,0);assert.equal(expanded.pairs[0].terrainAnchor,undefined);
});
test('Destruction cleans an empty-cell reservation, draws through refill and normalizes old saves to zero stock',()=>{
 const r=start();r.inventoryEffects.blocks=[{x:1,y:1,by:'local-o',remaining:2}];const next=destroy(r);assert.equal(next.inventoryEffects.blocks.length,0);
 const fresh=createLocal('local','A','B',now,'normal','untimed');assert.equal(fresh.players[0].inventory.cards.destroy,0);delete fresh.players[0].inventory.cards.destroy;initializeInventory(fresh);assert.equal(fresh.players[0].inventory.cards.destroy,0);
 fresh.players[0].inventory.cards.hint=0;const index=practiceTools.findIndex(t=>t.id==='destroy');for(let i=0;i<4;i++)completeInventoryTurn(fresh,'local-x',{random:()=>index/practiceTools.length+.001});assert.equal(fresh.players[0].inventory.cards.destroy,1);
});
test('Inventory machine destroys an empty scoring threat through the same referee',()=>{
 const r=start();r.mode='solo';r.humanId='local-o';r.machineInventory=true;r.difficulty='medium';for(const key of Object.keys(r.players[0].inventory.cards))r.players[0].inventory.cards[key]=0;r.players[0].inventory.cards.destroy=1;
 r.cells=[{id:'a',x:0,y:1,symbol:'O',owner:'local-o'},{id:'b',x:2,y:1,symbol:'O',owner:'local-o'}];const choice=chooseMachineCard(r,now);assert.equal(choice.payload.tool,'destroy');const next=localCommand(r,choice.action,choice.payload,now);assert.equal(next.terrain.length,8);assert.deepEqual(next.cells,r.cells);
 r.machineInventory=false;assert.equal(chooseMachineCard(r,now),null);
});
