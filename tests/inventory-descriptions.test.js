import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryMarkup} from '../src/inventory.js';
import {practiceTools,immunityTools} from '../src/practice-tools.js';
import {createLocal} from '../src/local.js';
const ids=[...practiceTools,...immunityTools].map(t=>t.id).concat('target','immunity-1','immunity-3','immunity-33');
test('Every hall and backpack item has a collapsed, accessible description, even when empty',()=>{
 const game=createLocal('local','X','O',Date.now(),'normal','untimed');
 const before=structuredClone(game);
 for(const html of [inventoryMarkup(null,null),inventoryMarkup(game,'local-x')]){
  for(const id of ids){
   assert.match(html,new RegExp(`data-tool="${id}"[^>]*aria-expanded="false"`));
   assert.match(html,new RegExp(`data-description-panel="${id}"[^>]*hidden`));
  }
  for(const t of [...practiceTools,...immunityTools])assert.ok(html.includes(t.description));
  assert.equal((html.match(/class="inventory-icon-row"/g)||[]).length,2);
 }
 assert.deepEqual(game,before);
 const hall=inventoryMarkup(null,null);assert.doesNotMatch(hall,/data-use-tool/);
 const bag=inventoryMarkup(game,'local-x');assert.match(bag,/data-use-tool="double"/);assert.match(bag,/data-use-tool="swap" disabled/);
});
test('Descriptions retain independent open state without changing saved stock or turn',()=>{
 const game=createLocal('local','X','O',Date.now(),'normal','untimed'),before=structuredClone(game);
 const html=inventoryMarkup(game,'local-x',{openTools:new Set(['double','swap'])});
 assert.match(html,/data-tool="double"[^>]*aria-expanded="true"/);
 assert.match(html,/data-tool="swap"[^>]*aria-expanded="true"/);
 assert.match(html,/data-tool="target"[^>]*aria-expanded="false"/);
 assert.deepEqual(game,before);
});
