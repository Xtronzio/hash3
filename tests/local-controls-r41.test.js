import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {microSelectionOptions,validMicroExpansion,microExpansionChains} from '../src/micro-expansion.js';
import {canUsePracticeTool,completeInventoryTurn,initializeInventory} from '../src/practice-tools.js';
import {recordImmunityCombo,immunityStock} from '../src/immunity.js';
import {inventoryStatusMarkup,inventoryDockMarkup} from '../src/inventory.js';
import {floatingImmunityMarkup,clampRatio} from '../src/floating-immunity.js';
import {territoryComparisonKey} from '../src/achievements.js';
const now=Date.now(),fresh=()=>createLocal('local','X','O',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
test('+3 uses three contiguous taps, including an L; prefixes never spend or change the board',()=>{
 const r=fresh(),cells=[{x:3,y:0},{x:4,y:0},{x:4,y:1}];r.players[0].inventory.cards['expand-3']=1;
 for(let i=0;i<3;i++){assert.ok(microSelectionOptions(r,3,cells.slice(0,i)).some(c=>c.x===cells[i].x&&c.y===cells[i].y));assert.equal(r.terrain.length,9);assert.equal(r.players[0].inventory.cards['expand-3'],1);}
 assert.ok(validMicroExpansion(r,3,cells));const next=localCommand(r,'inventory',{tool:'expand-3',playerId:'local-x',cells},now);
 assert.equal(next.terrain.length,12);assert.equal(next.players[0].inventory.cards['expand-3'],0);assert.equal(next.pairs[0].turn,'X');assert.equal(next.ecologyTurns,0);assert.equal(next.players[0].score,0);
});
test('Incomplete, remote, overlapping, diagonal, repeated or reserved chains are rejected atomically',()=>{
 const r=fresh();r.players[0].inventory.cards['expand-3']=1;
 for(const cells of [[{x:3,y:0}], [{x:4,y:0},{x:5,y:0},{x:6,y:0}], [{x:2,y:0},{x:3,y:0},{x:4,y:0}], [{x:3,y:0},{x:4,y:1},{x:5,y:1}], [{x:3,y:0},{x:4,y:0},{x:3,y:0}]]){
  assert.equal(validMicroExpansion(r,3,cells),false);assert.throws(()=>localCommand(r,'inventory',{tool:'expand-3',playerId:'local-x',cells},now));
 }
 r.frontiers=[{id:'wall',by:'local-o',cells:[{x:4,y:0}]}];assert.equal(validMicroExpansion(r,3,[{x:3,y:0},{x:4,y:0},{x:4,y:1}]),false);
 assert.equal(r.terrain.length,9);assert.equal(r.players[0].inventory.cards['expand-3'],1);
 const capped=fresh();capped.cellTarget=33;capped.terrain=Array.from({length:32},(_,i)=>({x:i%8,y:Math.floor(i/8)}));assert.deepEqual(microExpansionChains(capped,2),[]);
});
test('Own inventory can be off with either human symbol while machine stock remains independently enabled',()=>{
 for(const symbol of ['X','O']){
  const r=createLocal('solo','A','',now,'normal','untimed','medium',symbol,true,{playerInventory:false});
  const human=r.players.find(p=>p.id===r.humanId),bot=r.players.find(p=>p.id!==r.humanId);
  assert.equal(Object.values(human.inventory.cards).reduce((a,b)=>a+b,0),0);assert.equal(Object.values(bot.inventory.cards).reduce((a,b)=>a+b,0),8);
  human.inventory.cards.double=1;assert.equal(canUsePracticeTool(r,human.id,'double',now),false);assert.throws(()=>localCommand(r,'inventory',{tool:'double',playerId:human.id},now));
  completeInventoryTurn(r,human.id);assert.equal(human.inventory.draws||0,0);
  for(let i=0;i<3;i++)recordImmunityCombo(r,human.id,33);assert.equal(immunityStock(r,human.id),0);
  assert.equal(inventoryStatusMarkup(r,{playerId:human.id}), '');assert.equal(inventoryDockMarkup(r,human.id),'');assert.equal(floatingImmunityMarkup(r),'');
  r.pairs[0].turn=bot.symbol;assert.equal(canUsePracticeTool(r,bot.id,'double',now),true);
 }
});
test('Local two-human inventory switch affects both, persists through pause/resume and missing legacy flag stays enabled',()=>{
 let r=createLocal('local','A','B',now,'normal','untimed','medium','X',false,{playerInventory:false});
 for(const p of r.players){assert.equal(Object.values(p.inventory.cards).reduce((a,b)=>a+b,0),0);completeInventoryTurn(r,p.id);assert.equal(p.inventory.draws||0,0);}
 r=localCommand(r,'pause',{},now+1000);r=localCommand(r,'resume',{},now+2000);assert.equal(r.playerInventory,false);
 const old=fresh();delete old.playerInventory;const cards=structuredClone(old.players[0].inventory.cards);initializeInventory(old);assert.deepEqual(old.players[0].inventory.cards,cards);assert.equal(canUsePracticeTool(old,'local-x','double',now),true);
});
test('Floating immunity has a movable handle per human, outside the inventory strip, and finite clamped positions',()=>{
 const r=fresh();assert.equal((floatingImmunityMarkup(r).match(/data-floating-player/g)||[]).length,2);assert.match(floatingImmunityMarkup(r),/immunity-drag-handle/);assert.doesNotMatch(inventoryStatusMarkup(r),/immunity-quick/);
 for(const [value,expected] of [[-1,0],[2,1],[.5,.5],[NaN,0],[Infinity,0]])assert.equal(clampRatio(value),expected);
 r.status='paused';assert.equal(floatingImmunityMarkup(r),'');
});
test('Results distinguish own inventory on/off without splitting legacy enabled records',()=>{
 const result={mode:'solo',machineInventory:true};assert.equal(territoryComparisonKey(result),territoryComparisonKey({...result,playerInventory:true}));assert.notEqual(territoryComparisonKey(result),territoryComparisonKey({...result,playerInventory:false}));
});
