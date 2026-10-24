import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {inventoryPreferences,storeInventoryPreferences,floatingInventoryMarkup,inventoryEditorMarkup,inventoryBandMarkup,territoryBandMarkup} from '../src/inventory-personalization.js';
import {INVENTORY_ORDER,normalizeInventoryPreferences,reorderInventory,inventoryRows} from '../src/inventory-layout.js';
import {inventoryStatusMarkup} from '../src/inventory.js';
import {saveLocalGame,loadLocalGames} from '../src/sessions.js';
import {captureTransfer} from '../src/local-transfer.js';
const now=100000,storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const fresh=()=>createLocal('local','Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:false});
test('Preferences normalize a complete unique catalogue and balance visible rows after cards leave the bar',()=>{
 const preferences=normalizeInventoryPreferences({order:['bomb','bomb','unknown','hint'],floating:['bomb','hint','bomb','unknown'],positions:{bomb:{x:99,y:-2},hint:{x:NaN,y:1}},territoryCollapsed:true});
 assert.equal(preferences.order.length,INVENTORY_ORDER.length);assert.deepEqual(preferences.order.slice(0,2),['bomb','hint']);assert.equal(new Set(preferences.order).size,INVENTORY_ORDER.length);
 assert.deepEqual(preferences.floating,['bomb','hint']);assert.deepEqual(preferences.positions,{bomb:{x:1,y:0}});
 const html=inventoryRows(id=>`<i data-tool="${id}"></i>`,preferences),rows=[...html.matchAll(/class="inventory-icon-row">([\s\S]*?)<\/div>/g)].map(m=>(m[1].match(/data-tool/g)||[]).length);
 assert.deepEqual(rows,[13,13]);assert.doesNotMatch(html,/data-tool="bomb"|data-tool="hint"/);
 const reordered=reorderInventory(preferences.order,'sapper','bomb');assert.equal(reordered[0],'sapper');assert.deepEqual(new Set(reordered),new Set(INVENTORY_ORDER));assert.equal(preferences.order[0],'bomb');
});
test('Customization and fold state persist per colonist, preserve gameplay exactly and ride with transfers',()=>{
 const store=storage(),r=fresh(),before=structuredClone(r),preferences=normalizeInventoryPreferences({order:['nuclear','hint'],floating:['nuclear','hint'],positions:{hint:{x:.2,y:.7}},inventoryCollapsed:true,territoryCollapsed:true,inventoryDrawerCollapsed:false,territoryDrawerCollapsed:false});
 const updated=storeInventoryPreferences(r,'local-x',preferences,store);assert.deepEqual(r,before);
 const gameData=structuredClone(updated);delete gameData.inventoryPreferences;assert.deepEqual(gameData,before);
 assert.deepEqual(inventoryPreferences(updated,'local-x',store),preferences);assert.deepEqual(inventoryPreferences(updated,'local-o',store),normalizeInventoryPreferences());
 const another=fresh();assert.deepEqual(inventoryPreferences(another,'local-x',store),preferences);
 saveLocalGame(store,updated,now);const restored=loadLocalGames(store,now)[0];assert.deepEqual(restored.inventoryPreferences['local-x'],preferences);
 const transfer=captureTransfer(store,{now,id:'preferences-copy'});assert.deepEqual(transfer.games[0].inventoryPreferences['local-x'],preferences);assert.equal(transfer.games[0].players[0].score,before.players[0].score);assert.deepEqual(transfer.games[0].players[0].inventory,before.players[0].inventory);
});
test('Floating cards keep real stock and the shared referee; moving/ordering never means spending',()=>{
 const r=fresh(),preferences=normalizeInventoryPreferences({floating:['double','sapper','target'],inventoryCollapsed:true});
 r.players[0].inventory.cards.double=2;r.players[0].inventory.cards.sapper=0;
 const before=structuredClone(r),floats=floatingInventoryMarkup(r,'local-x',preferences),bar=inventoryStatusMarkup(r,{playerId:'local-x',preferences});
 assert.match(floats,/data-floating-tool="double"/);assert.match(floats,/×2/);assert.match(floats,/data-floating-tool="sapper"[\s\S]*?disabled/);assert.match(floats,/data-floating-tool="target"/);
 assert.doesNotMatch(bar,/data-tool="double"|data-tool="sapper"|data-action="mark-target"/);assert.deepEqual(r,before);
 r.status='paused';assert.match(floatingInventoryMarkup(r,'local-x',preferences),/data-tool="double"[^>]*disabled/);r.status='playing';r.pairs[0].turn='O';assert.match(floatingInventoryMarkup(r,'local-x',preferences),/data-tool="double"[^>]*disabled/);
 const folded=inventoryBandMarkup(bar,r,'local-x',preferences);assert.match(folded,/aria-expanded="false"/);assert.match(folded,/custom-band-content" hidden/);assert.match(territoryBandMarkup('<i>territory</i>',{territoryCollapsed:true}),/custom-band-content" hidden/);
});

test('Legacy preferences receive immunity in the bar and opt-in floating preserves reserves and out-of-turn activation',()=>{
 let r=fresh();r.players[0].inventory.immunity.cards['immunity-1']=3;r.pairs[0].turn='O';
 const legacy={order:INVENTORY_ORDER.filter(id=>id!=='immunity'),floating:['hint'],positions:{hint:{x:.2,y:.5}},inventoryCollapsed:false,territoryCollapsed:true};
 const preferences=normalizeInventoryPreferences(legacy),before=structuredClone(r);
 assert.equal(preferences.order.at(-1),'immunity');assert.deepEqual(preferences.floating,['hint']);assert.deepEqual(preferences.positions,legacy.positions);
 assert.match(inventoryStatusMarkup(r,{playerId:'local-x',preferences}),/data-tool="immunity"[^>]*>[^]*?<small>×3<\/small>/);
 assert.doesNotMatch(inventoryStatusMarkup(r,{playerId:'local-x',preferences}).match(/<button[^>]*data-tool="immunity"[^>]*>/)[0],/disabled/);
 assert.match(inventoryEditorMarkup(preferences,'immunity'),/Sacar Inmunidad total como flotante/);
 const floated=normalizeInventoryPreferences({...preferences,floating:[...preferences.floating,'immunity']});
 const updated=storeInventoryPreferences(r,'local-x',floated,storage());delete updated.inventoryPreferences;assert.deepEqual(updated,before);
 assert.doesNotMatch(inventoryStatusMarkup(r,{playerId:'local-x',preferences:floated}),/data-tool="immunity" data-player="local-x"/);
 assert.match(floatingInventoryMarkup(r,'local-x',floated),/data-floating-tool="immunity"/);assert.match(floatingInventoryMarkup(r,'local-x',floated),/×3/);
 r=localCommand(r,'inventory',{tool:'immunity',playerId:'local-x'},now);
 assert.equal(r.players[0].inventory.immunity.cards['immunity-1'],2);assert.equal(r.pairs[0].turn,'O');assert.match(inventoryStatusMarkup(r,{playerId:'local-o'}),/data-tool="immunity" data-player="local-x"/);assert.deepEqual(r.players[0].inventory.cards,before.players[0].inventory.cards);
 assert.match(floatingInventoryMarkup(r,'local-x',floated),/data-immunity-clock="local-x">3/);
 assert.match(inventoryStatusMarkup(r,{playerId:'local-x',preferences}),/data-immunity-clock="local-x">3/);
 r=localCommand(r,'pause',{},now+1000);const html=floatingInventoryMarkup(r,'local-x',floated);assert.match(html,/data-tool="immunity"[^>]*disabled/);assert.match(html,/data-immunity-clock="local-x">3/);
});
