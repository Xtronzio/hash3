import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyLocal as createLocal} from './helpers/legacy-balance.js';
import {inventoryStatusMarkup} from '../src/inventory.js';
import {INVENTORY_ROWS} from '../src/inventory-layout.js';
import {practiceTools} from '../src/practice-tools.js';
import {pausedInventorySummaryMarkup} from '../src/paused-inventory.js';
import {inventoryBandMarkup} from '../src/inventory-personalization.js';
import {normalizeInventoryPreferences} from '../src/inventory-layout.js';

test('Single participant counters and the restored sliders remove duplicate player backpacks without writing stock',()=>{
 const r=createLocal('solo','Jorge','Máquina',0,'normal','untimed','medium','O',true,{faunaEnabled:false,territoryEnabled:false}),before=structuredClone(r);
 for(const side of ['own','rival']){
  const html=pausedInventorySummaryMarkup(r,r.humanId,{participants:side});
  assert.equal((html.match(/data-icon="backpack"/g)||[]).length,1);
  assert.match(html,new RegExp(`data-paused-inventory="${side}"`));
  assert.doesNotMatch(html,new RegExp(`data-paused-inventory="${side==='own'?'rival':'own'}"`));
 }
 const html=inventoryBandMarkup('',r,r.humanId,normalizeInventoryPreferences({inventoryDrawerCollapsed:false}));
 assert.match(html,/data-icon="inventory-sliders"/);assert.doesNotMatch(html,/data-icon="backpack"/);assert.doesNotMatch(html,/data-action="player-inventory"/);
 assert.deepEqual(r,before);
});

test('Both card rows stay balanced with the whole catalogue and one Diana',()=>{
 assert.deepEqual(INVENTORY_ROWS.map(row=>row.length),[13,14]);
 assert.equal(new Set(INVENTORY_ROWS.flat()).size,practiceTools.length+1);
 assert.deepEqual(new Set(INVENTORY_ROWS.flat()),new Set([...practiceTools.map(t=>t.id),'target']));
});
test('Paused summaries place the viewer left, rival right, with independent capacities, pending reward and no mutations',()=>{
 const r=createLocal('solo','Jorge','Máquina',0,'normal','untimed','medium','O',true,{faunaEnabled:false,territoryEnabled:false});
 const own=r.players.find(p=>p.id===r.humanId),rival=r.players.find(p=>p.id!==r.humanId);
 own.inventory.cards.frontier=96;own.inventory.comboPending=1;own.inventory.immunity.cards['immunity-1']=333;
 rival.inventory.cards.bomb=2;
 const before=structuredClone(r),html=inventoryStatusMarkup(r,{paused:true,playerId:own.id});
 assert.match(html,/paused-inventory-player o" data-paused-inventory="own"/);
 assert.match(html,/paused-inventory-player x" data-paused-inventory="rival"/);
 assert.ok(html.indexOf('data-paused-inventory="own"')<html.indexOf('data-paused-inventory="rival"'));
 assert.match(html,/Mi inventario O: 99 de 18 cartas guardadas/);assert.match(html,/Inventario del rival X: 5 de 18 cartas guardadas/);
 assert.match(html,/is-full">99\/18/);assert.match(html,/paused-inventory-pending/);assert.doesNotMatch(html,/>Inventario <b/);
 assert.deepEqual(r,before);
});
test('Disabled inventory shows -/- even when stored reserves exist; both-disabled and own-disabled pause remain informative',()=>{
 const r=createLocal('solo','Jorge','Máquina',0,'normal','untimed','medium','X',false,{playerInventory:false,faunaEnabled:false,territoryEnabled:false});
 r.players[0].inventory.cards.frontier=96;
 const before=structuredClone(r),html=inventoryStatusMarkup(r,{paused:true,playerId:r.humanId});
 assert.equal((html.match(/>-\/-</g)||[]).length,2);assert.doesNotMatch(html,/inventory-shortcuts/);
 assert.equal(inventoryStatusMarkup(r,{playerId:r.humanId}),'');assert.deepEqual(r,before);
 r.machineInventory=true;
 const mixed=pausedInventorySummaryMarkup(r,r.humanId);assert.equal((mixed.match(/>-\/-</g)||[]).length,1);assert.match(mixed,/data-paused-inventory="rival"/);
});
