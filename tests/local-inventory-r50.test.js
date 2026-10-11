import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {inventoryStatusMarkup,inventoryDockMarkup,toolIcon} from '../src/inventory.js';
import {spendCard,recordInventoryCombo} from '../src/practice-tools.js';
import {ecologyColors} from '../src/ecology-navigation.js';
import {floatingRefillMarkup,REFILL_HOLD_MS} from '../src/floating-refill.js';
import {savedMapModel} from '../src/saved-map.js';

test('Recharge opens after one second while retaining three purchases per opening',()=>{
 const r=createLocal('local','X','O',0);r.players[0].score=999;
 assert.equal(REFILL_HOLD_MS,1000);const html=floatingRefillMarkup(r,'local-x');
 assert.match(html,/mantén 1 segundo para elegir hasta tres cartas/);assert.match(html,/>1s<\/small>/);assert.doesNotMatch(html,/>3s</);
});
test('Capacity stays visible in pause without a duplicate strip in live play',()=>{
 const r=createLocal('local','X','O',0),before=structuredClone(r);
 for(const paused of [false,true]){
  const html=inventoryStatusMarkup(r,{paused,playerId:'local-x'});
  if(!paused){assert.doesNotMatch(html,/inventory-capacity-strip|inventory-capacity-value/);continue;}
  assert.match(html,/inventory-capacity-value ">3\/18/);assert.ok(html.indexOf('inventory-capacity-strip')<html.indexOf('inventory-shortcuts'));
  assert.match(html,/Inventario X: 3 de 18 cartas guardadas/);
 }
 assert.deepEqual(r,before);
 r.players[0].inventory.cards.double=24;r.players[0].inventory.comboPending=true;
 assert.match(inventoryStatusMarkup(r,{paused:true,playerId:'local-x'}),/is-full">26\/18/);
 assert.match(inventoryStatusMarkup(r,{paused:true,playerId:'local-x'}),/\+1 pendiente/);
 assert.match(inventoryStatusMarkup(r,{paused:true,playerId:'local-o'}),/">3\/18/);
 r.playerInventory=false;assert.equal(inventoryStatusMarkup(r,{playerId:'local-x'}),'');
});
test('Saved maps expose the single barrier pile with one destination per placed object',()=>{
 const r=createLocal('local','X','O',0);
 r.frontiers=[{id:'wall',cells:[{x:0,y:0}]},{id:'border',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]}];
 const before=structuredClone(r),model=savedMapModel(r,r.players[0]);assert.equal(model.ecologyTargets.barriers.length,2);assert.deepEqual(r,before);
});
test('Bag counter precedes its icon and inventory glyphs inherit cyan; territory controls inherit yellow',()=>{
 const r=createLocal('local','X','O',0),before=structuredClone(r),html=inventoryDockMarkup(r,'local-x',{icon:'<svg data-bag="true"></svg>'});
 assert.ok(html.indexOf('inventory-dock-counter')<html.indexOf('inventory-dock-icon'));
 assert.match(html,/<\/span><span class="inventory-dock-icon/);
 for(const kind of ['frontier','border'])assert.doesNotMatch(toolIcon(kind),/style=|var\(--frontier\)/);
 for(const kind of ['frontier','border','barriers','neutral'])assert.equal(ecologyColors[kind],'var(--yellow)');
 assert.deepEqual(r,before);
});
test('One earned pending combo refills the first spent card, never the second without a new combo',()=>{
 const r=createLocal('local','X','O',0),inv=r.players[0].inventory;
 for(const kind of Object.keys(inv.cards))inv.cards[kind]=0;
 for(const kind of ['double','opposite','rival','erase','frontier','border'])inv.cards[kind]=3;
 const total=()=>Object.values(inv.cards).reduce((a,b)=>a+b,0);
 for(let i=0;i<10;i++)recordInventoryCombo(r,'local-x',33);
 assert.equal(total(),18);assert.equal(inv.comboPending,1);
 spendCard(r,'local-x','erase');assert.equal(total(),18);assert.equal(inv.comboPending,0);
 spendCard(r,'local-x','double');assert.equal(total(),17);assert.equal(inv.comboPending,0);
});
