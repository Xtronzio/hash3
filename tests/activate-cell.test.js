import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {toolCells,canUsePracticeTool,initializeInventory,completeInventoryTurn,practiceTools,inventoryDrawWeight} from '../src/practice-tools.js';
import {terrainOf,availableCells,connectedTerrain} from '../src/game.js';
import {toolIcon,inventoryMarkup,inventoryTotal} from '../src/inventory.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
const now=1700000000000;
function start(){const r=createLocal('local','A','B',now,'normal','untimed');r.terrain=r.terrain.filter(c=>c.x!==1||c.y!==1);r.players[0].inventory.cards.activate=1;return r;}
const card=(r,x=1,y=1)=>localCommand(r,'inventory',{tool:'activate',playerId:'local-x',x,y},now);
test('Activate adds exactly one missing cell, preserves the turn and scores only on the subsequent normal placement',()=>{
 const r=start();r.cells=[{x:0,y:1,id:'a',symbol:'X',owner:'local-x'},{x:2,y:1,id:'b',symbol:'X',owner:'local-x'}];
 const before=structuredClone(r),next=card(r);assert.deepEqual(r,before);assert.equal(terrainOf(next).length,9);assert.equal(next.blocks.length,r.blocks.length);
 assert.equal(next.pairs[0].turn,'X');assert.deepEqual(next.cells,r.cells);assert.equal(next.players[0].score,0);assert.equal(next.players[0].placements,0);
 assert.equal(next.players[0].inventory.cards.activate,0);assert.equal(next.players[0].inventory.turns,0);
 assert.ok(availableCells(next,next.pairs[0]).some(c=>c.x===1&&c.y===1));
 const played=localCommand(next,'move',{x:1,y:1},now);assert.equal(played.cells.at(-1).symbol,'X');assert.ok(played.lastEvent.points>=3);assert.equal(played.players[0].placements,1);assert.equal(played.pairs[0].turn,'O');
});
test('Activation targets include holes and borders of every built island, never existing terrain',()=>{
 const r=start(),targets=toolCells(r,'local-x','activate');assert.ok(targets.some(c=>c.x===1&&c.y===1));assert.ok(targets.some(c=>c.x===-1&&c.y===0));
 assert.equal(new Set(targets.map(c=>`${c.x},${c.y}`)).size,targets.length);
 for(const pos of [{x:0,y:0},{x:1000,y:1000},{x:1.5,y:1}]){const before=structuredClone(r);assert.throws(()=>card(r,pos.x,pos.y));assert.deepEqual(r,before);}
 const isolated=structuredClone(r);isolated.terrain.push({x:100,y:100});assert.ok(toolCells(isolated,'local-x','activate').some(c=>c.x>50));
});
test('Card obeys stock, clock, expansion, pause and one tool per turn; Combo allows activation plus another tool',()=>{
 const r=start();assert.ok(canUsePracticeTool(r,'local-x','activate',now));assert.equal(canUsePracticeTool({...r,status:'paused'},'local-x','activate',now),false);
 const pending=structuredClone(r);pending.pairs[0].pending=1;assert.equal(canUsePracticeTool(pending,'local-x','activate',now),false);
 const timed=structuredClone(r);timed.timeMode='timed';timed.pairs[0].deadline=new Date(now).toISOString();assert.throws(()=>card(timed));
 const empty=structuredClone(r);empty.players[0].inventory.cards.activate=0;assert.throws(()=>card(empty));
 const used=card(r);assert.equal(canUsePracticeTool(used,'local-x','double',now),false);
 const combo=structuredClone(r);combo.players[0].inventory.cards.combo=1;
 const armed=localCommand(combo,'inventory',{tool:'combo',playerId:'local-x'},now),active=card(armed);
 assert.ok(canUsePracticeTool(active,'local-x','double',now));
 const doubled=localCommand(active,'inventory',{tool:'double',playerId:'local-x'},now);assert.equal(doubled.practiceTurn.remaining,2);
});
test('Activated terrain is permanent and available to both players after saving, reload and pause',()=>{
 let r=card(start());r=localCommand(r,'move',{x:0,y:0},now);r=localCommand(r,'pause',{},now);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+86400000);
 assert.ok(connectedTerrain(terrainOf(r),r.pairs[0].active).some(c=>c.x===1&&c.y===1));r=localCommand(r,'move',{x:1,y:1},now+86400000);assert.equal(r.cells.at(-1).symbol,'O');
});
test('New card has a proper icon, appears in the inventory and enters refill without changing the initial eight cards',()=>{
 const r=createLocal('local','A','B',now,'normal','untimed');assert.equal(inventoryTotal(r,'local-x'),8);assert.equal(r.players[0].inventory.cards.activate,0);
 for(const t of practiceTools)r.players[0].inventory.received[t.id]=0; // Equal exposure: the draw is random among all eligible cards.
 r.players[0].inventory.cards.hint=0;const tickets=practiceTools.flatMap(t=>Array(inventoryDrawWeight(t.id)).fill(t));const index=tickets.findIndex(t=>t.id==='activate');for(let i=0;i<1;i++)completeInventoryTurn(r,'local-x',{random:()=>index/tickets.length+.001});
 assert.equal(r.players[0].inventory.cards.activate,1);assert.match(toolIcon('activate'),/stroke-dasharray/);assert.doesNotMatch(toolIcon('activate'),/undefined/);assert.match(inventoryMarkup(r,'local-x'),/data-tool="activate"/);
 delete r.players[0].inventory.cards.activate;initializeInventory(r);assert.equal(r.players[0].inventory.cards.activate,0);
});
test('Machine with inventory can activate a scoring hole using the same referee',()=>{
 const r=start();r.mode='solo';r.humanId='local-o';r.machineInventory=true;r.difficulty='medium';
 for(const key of Object.keys(r.players[0].inventory.cards))r.players[0].inventory.cards[key]=0;r.players[0].inventory.cards.activate=1;
 r.cells=[{x:0,y:1,id:'a',symbol:'X',owner:'local-x'},{x:2,y:1,id:'b',symbol:'X',owner:'local-x'}];
 const choice=chooseMachineCard(r,now);assert.equal(choice.payload.tool,'activate');const applied=localCommand(r,choice.action,choice.payload,now);assert.equal(applied.terrain.length,r.terrain.length+1);
 r.machineInventory=false;assert.equal(chooseMachineCard(r,now),null);
});

test('A missing terrain entry containing a saved token is never an activation target',()=>{
 const r=start();r.cells=[{id:'legacy-occupied',x:1,y:1,symbol:'O',owner:'local-o'}];
 const before=structuredClone(r);assert.ok(!toolCells(r,'local-x','activate').some(c=>c.x===1&&c.y===1));
 assert.throws(()=>card(r,1,1));assert.deepEqual(r,before);
 assert.ok(toolCells(r,'local-x','activate').some(c=>c.x===-1&&c.y===0));
});
