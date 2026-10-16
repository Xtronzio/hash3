import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
import {inverseClaimControl} from '../src/inverse-claim-ui.js';
import {inverseBeeBadge} from '../src/inverse-bee-ui.js';
import {INVENTORY_ORDER,normalizeInventoryPreferences} from '../src/inventory-layout.js';
import {inventoryEditorMarkup,inventoryBandMarkup,floatingInventoryMarkup,storeInventoryPreferences,inventoryPreferences} from '../src/inventory-personalization.js';
import {captureTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
const fresh=(options={})=>createLocal('local','A','B',NOW,'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>0,...options});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const prefs=()=>normalizeInventoryPreferences({floating:['inverse-claim'],positions:{'inverse-claim':{x:.4,y:.6}}});
test('Floating claim preferences retain position without changing the card catalogue or legacy order',()=>{
 const p=prefs();assert.deepEqual(p.order,INVENTORY_ORDER);assert.ok(!p.order.includes('inverse-claim'));assert.deepEqual(p.floating,['inverse-claim']);assert.deepEqual(p.positions['inverse-claim'],{x:.4,y:.6});assert.equal(normalizeInventoryPreferences().floating.length,0);
});
test('Cobrar is a separate configurable control, with the same collection icon in the editor and game',()=>{
 const g=fresh(),html=inventoryEditorMarkup(prefs(),'inverse-claim',g);assert.match(html,/Controles/);assert.match(html,/Devolver Cobrar a la barra/);assert.match(html,/data-edit-tool="inverse-claim"/);assert.match(html,/data-icon="claim-trophy"/);assert.match(html,/No consume cartas/);
 assert.ok([...html.matchAll(/<button[^>]+data-action="inventory-order-step"[^>]*>/g)].every(m=>m[0].includes('disabled')));
 assert.match(inverseClaimControl(g,'local-x'),/data-icon="claim-trophy"/);assert.doesNotMatch(inverseClaimControl(g,'local-x'),/M5 8h22v17/);
 for(const version of [1,2]){const old={...g,inverseVersion:version};assert.doesNotMatch(inventoryEditorMarkup(prefs(),'inverse-claim',old),/data-edit-tool="inverse-claim"/);assert.equal(inverseClaimControl(old,'local-x'),'');assert.equal(floatingInventoryMarkup(old,'local-x',prefs()),'');}
 const original={...g,variant:undefined};assert.doesNotMatch(inventoryEditorMarkup(prefs(),'inverse-claim',original),/data-edit-tool="inverse-claim"/);assert.equal(floatingInventoryMarkup(original,'local-x',prefs()),'');
});
test('Floating Cobrar respects turn, pause and Doble, independent of inventory stock',()=>{
 const g=fresh({playerInventory:false});let html=floatingInventoryMarkup(g,'local-x',prefs());assert.match(html,/data-floating-tool="inverse-claim"/);assert.match(html,/data-action="inverse-claim-toggle"/);assert.doesNotMatch(html,/<button[^>]*disabled/);assert.doesNotMatch(html,/data-tool="inverse-claim"|×[0-9]/);
 assert.match(inventoryBandMarkup('',g,'local-x',prefs()),/Personalizar controles/);const editor=inventoryEditorMarkup(prefs(),'inverse-claim',g);assert.match(editor,/Devolver Cobrar/);assert.doesNotMatch(editor,/data-edit-tool="double"/);
 g.pairs[0].turn='O';assert.match(floatingInventoryMarkup(g,'local-x',prefs()),/<button[^>]*disabled/);g.pairs[0].turn='X';g.status='paused';assert.match(floatingInventoryMarkup(g,'local-x',prefs()),/<button[^>]*disabled/);g.status='playing';g.practiceTurn={player:'local-x',used:['double'],remaining:1};assert.match(floatingInventoryMarkup(g,'local-x',prefs()),/<button[^>]*disabled/);
 assert.throws(()=>localCommand(fresh(),'inventory',{playerId:'local-x',tool:'inverse-claim'},NOW));
});
test('Customization preserves the entire referee state and travels with a paused save per player',()=>{
 const s=memory(),g=localCommand(fresh(),'pause',{},NOW),before=structuredClone(g),n=storeInventoryPreferences(g,'local-x',prefs(),s),copy=structuredClone(n);delete copy.inventoryPreferences;assert.deepEqual(copy,before);assert.deepEqual(g,before);assert.deepEqual(inventoryPreferences(n,'local-x',s),prefs());assert.equal(inventoryPreferences(n,'local-o',s).floating.length,1);
 s.setItem('hash3_locals',JSON.stringify([n]));s.setItem('hash3_local',JSON.stringify({id:n.id}));s.setItem('hash3_name','A');const data=captureTransfer(s,{now:NOW,id:'claim-layout'});assert.deepEqual(data.games[0].inventoryPreferences['local-x'],prefs());assert.deepEqual(data.games[0].inverseBees,before.inverseBees);assert.deepEqual(data.games[0].players,before.players);
});
test('Bee count exposes a distinct large-count element and reveals the full saved deadline',()=>{
 const g=fresh(),raw=JSON.stringify(g);assert.match(inverseBeeBadge(g,'local-x'),/quedan 3 turnos propios/);assert.match(inverseBeeBadge(g,'local-x'),/data-inverse-bee-count>3/);assert.equal(JSON.stringify(g),raw);
 Object.assign(g.inverseBees.players.X,{since:6,turns:6,limit:9});const before=JSON.stringify(g),html=inverseBeeBadge(g,'local-x');assert.match(html,/data-inverse-bee-count>3<\/strong>/);assert.match(html,/quedan 3 turnos propios/);assert.equal(JSON.stringify(g),before);
});
