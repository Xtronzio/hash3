import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {inventoryStatusMarkup} from '../src/inventory.js';
import {floatingRefillMarkup,REFILL_HOLD_MS} from '../src/floating-refill.js';
import {savedMapModel} from '../src/saved-map.js';

test('Recharge opens after one second while retaining three purchases per opening',()=>{
 const r=createLocal('local','X','O',0);r.players[0].score=999;
 assert.equal(REFILL_HOLD_MS,1000);const html=floatingRefillMarkup(r,'local-x');
 assert.match(html,/mantén 1 segundo para elegir hasta tres cartas/);assert.match(html,/>1s<\/small>/);assert.doesNotMatch(html,/>3s</);
});
test('Capacity is outside the scrolling stock list, also in pause, independent of immunity and opponent',()=>{
 const r=createLocal('local','X','O',0),before=structuredClone(r);
 for(const paused of [false,true]){
  const html=inventoryStatusMarkup(r,{paused,playerId:'local-x'});
  assert.match(html,/inventory-capacity-value ">3\/18/);assert.ok(html.indexOf('inventory-capacity-strip')<html.indexOf('inventory-shortcuts'));
  assert.match(html,/Inventario X: 3 de 18 cartas guardadas/);
 }
 assert.deepEqual(r,before);
 r.players[0].inventory.cards.double=24;r.players[0].inventory.comboPending=true;
 assert.match(inventoryStatusMarkup(r,{playerId:'local-x'}),/is-full">26\/18/);
 assert.match(inventoryStatusMarkup(r,{playerId:'local-x'}),/\+1 pendiente/);
 assert.match(inventoryStatusMarkup(r,{playerId:'local-o'}),/">3\/18/);
 r.playerInventory=false;assert.equal(inventoryStatusMarkup(r,{playerId:'local-x'}),'');
});
test('Saved maps expose the single barrier pile with one destination per placed object',()=>{
 const r=createLocal('local','X','O',0);
 r.frontiers=[{id:'wall',cells:[{x:0,y:0}]},{id:'border',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]}];
 const before=structuredClone(r),model=savedMapModel(r,r.players[0]);assert.equal(model.ecologyTargets.barriers.length,2);assert.deepEqual(r,before);
});
