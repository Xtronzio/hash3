import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeInventory,canUsePracticeTool,toolAllowance,toolCells,recordInventoryCombo} from '../src/practice-tools.js';
import {immunityStock,immunityFor,immunityRemaining,immunityCountdown,immunitySeconds,recordImmunityCombo} from '../src/immunity.js';
import {inventoryMarkup,immunityComboNotice} from '../src/inventory.js';
import {tradeAvailability} from '../src/inventory-economy.js';
import {availableCells} from '../src/game.js';
import {loadLocalGames,saveLocalGame} from '../src/sessions.js';
const now=1700000000000;
const start=()=>createLocal('local','X','O',now,'normal','untimed');
const held=(r,n=3,id='local-x')=>{r.players.find(p=>p.id===id).inventory.immunity.cards['immunity-1']=n;return r;};
const activate=(r,id='local-x')=>localCommand(r,'inventory',{playerId:id,tool:'immunity'},now);
const move=r=>localCommand(r,'move',availableCells(r,r.pairs[0])[0],now,()=>0);
test('Combos of any size leave the protection stock and historical merit unchanged',()=>{
 const r=held(start(),17),before=structuredClone(r.players[0].inventory.immunity);
 for(const points of [0,32,33,333,3333])for(let i=0;i<333;i++)assert.deepEqual(recordImmunityCombo(r,'local-x',points),[]);
 assert.deepEqual(r.players[0].inventory.immunity,before);
});
test('Total immunity costs333, has separate storage and never enters normal refill draws',()=>{
 let r=start();r.players[0].score=999;for(const t of Object.keys(r.players[0].inventory.cards))r.players[0].inventory.cards[t]=3;const cards=structuredClone(r.players[0].inventory.cards);
 assert.ok(tradeAvailability(r,'local-x','immunity',now).allowed);r=localCommand(r,'trade',{playerId:'local-x',tool:'immunity'},now);assert.equal(r.players[0].score,666);assert.equal(r.players[0].tradeSpent,333);assert.equal(immunityStock(r,'local-x'),1);assert.deepEqual(r.players[0].inventory.cards,cards);
 assert.equal(tradeAvailability(r,'local-x','immunity',now,{replace:'nuclear'}).allowed,false);recordInventoryCombo(r,'local-x',333);assert.equal(immunityStock(r,'local-x'),1);
});
test('Purchases enforce turn, inventory, funds, clock and pause atomically',()=>{
 const r=start(),before=structuredClone(r);assert.throws(()=>localCommand(r,'trade',{playerId:'local-x',tool:'immunity'},now));assert.deepEqual(r,before);
 r.players[0].score=333;for(const g of [{...r,status:'paused'},{...r,playerInventory:false},{...r,timeMode:'timed',pairs:[{...r.pairs[0],deadline:new Date(now).toISOString()}]}])assert.equal(tradeAvailability(g,'local-x','immunity',now).allowed,false);
 assert.equal(tradeAvailability(r,'local-o','immunity',now).allowed,false);
});
test('Activation outside the turn spends exactly one protection and no tool allowance',()=>{
 let r=held(start(),174,'local-o'),before=structuredClone(r);assert.ok(canUsePracticeTool(r,'local-o','immunity',now));r=activate(r,'local-o');assert.equal(immunityStock(r,'local-o'),173);assert.equal(immunityCountdown(r,'local-o'),3);assert.equal(toolAllowance(r,'local-o').used,0);assert.deepEqual(r.pairs,before.pairs);assert.throws(()=>activate(r,'local-o'));assert.equal(r.players[0].score,before.players[0].score);
});
test('Protection expires after the third completed turn; Doble first placement, waits and cards do not age it',()=>{
 let r=activate(held(start()));r.players[0].inventory.cards.double=1;r=localCommand(r,'inventory',{playerId:'local-x',tool:'double'},now);r=move(r);assert.equal(immunityCountdown(r,'local-x'),3);r=move(r);assert.equal(immunityCountdown(r,'local-x'),2);r=localCommand(r,'tick',{},now+999999);assert.equal(immunityCountdown(r,'local-x'),2);r=move(r);assert.equal(immunityCountdown(r,'local-x'),1);r=move(r);assert.equal(immunityRemaining(r,'local-x'),0);assert.equal(immunityStock(r,'local-x'),2);
});
test('Enemy erase, conversion, shift, block and forced symbol reject without spending cards',()=>{
 const r=activate(held(start(),3,'local-o'),'local-o');r.cells=[{id:'o',x:0,y:0,symbol:'O',owner:'local-o'}];
 for(const tool of ['erase','opposite','shift','rival']){r.players[0].inventory.cards[tool]=1;const before=structuredClone(r);assert.throws(()=>localCommand(r,'inventory',{tool,playerId:'local-x',x:0,y:0,toX:1,toY:0},now));assert.deepEqual(r,before);}
});
test('Activation clears a pending forced symbol and preserves independent reserve',()=>{
 let r=held(start(),3);r.inventoryEffects.forced=[{player:'local-x',symbol:'O',by:'local-o'}];r=activate(r);assert.deepEqual(r.inventoryEffects.forced,[]);assert.equal(immunityStock(r,'local-x'),2);
});
test('Shield protects its exact occupied cell for three complete turns and costs33',()=>{
 let r=start();r.players[0].score=99;r=localCommand(r,'trade',{playerId:'local-x',tool:'shield'},now);assert.equal(r.players[0].score,66);r.cells=[{id:'x',x:1,y:1,symbol:'X',owner:'local-x'}];r=localCommand(r,'inventory',{playerId:'local-x',tool:'shield',x:1,y:1},now);assert.equal(r.inventoryEffects.shields[0].turnsRemaining,3);r=move(r);assert.equal(r.inventoryEffects.shields[0].remaining,2);r=move(r);assert.equal(r.inventoryEffects.shields[0].remaining,1);r=move(r);assert.equal(r.inventoryEffects.shields.length,0);
});
test('Saving, pausing, loading and transfer-ready state preserve all reserves and duration',()=>{
 let r=activate(held(start(),174));r=localCommand(r,'pause',{},now);const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};saveLocalGame(storage,r,now);const loaded=loadLocalGames(storage,now+86400000)[0],resumed=localCommand(loaded,'resume',{},now+86400000);assert.deepEqual(immunityFor(resumed,'local-x'),immunityFor(r,'local-x'));assert.equal(immunityCountdown(resumed,'local-x'),3);assert.equal(immunityStock(resumed,'local-x'),173);
});
test('Historical timed protection retains exact frozen seconds and expires normally after resuming',()=>{
 let r=held(start());r.inventoryEffects.immunities=[{player:'local-x',expiresAt:now+33000}];r=localCommand(r,'pause',{},now+5000);assert.equal(immunitySeconds(r,'local-x'),28);r=localCommand(r,'resume',{},now+86400000);assert.equal(immunitySeconds(r,'local-x',now+86400000),28);assert.equal(immunitySeconds(r,'local-x',now+86400000+28000),0);
});
test('Old duration cards convert into individual units once and preserve an active card',()=>{
 const r=start();delete r.immunityVersion;r.players[0].inventory.immunity={combos:334,cards:{'immunity-1':2,'immunity-3':3,'immunity-33':4},earned:7};r.inventoryEffects.immunities=[{player:'local-x',remaining:20}];initializeInventory(r);assert.deepEqual(immunityFor(r,'local-x').cards,{'immunity-1':21,'immunity-3':9,'immunity-33':132});assert.equal(immunityRemaining(r,'local-x'),1);const before=structuredClone(r);initializeInventory(r);assert.deepEqual(r,before);
});
test('Holding protection through many unused rounds consumes no reserve or automatic activation',()=>{
 let r=held(start(),174);for(let i=0;i<6;i++)r=move(r);assert.equal(immunityStock(r,'local-x'),174);assert.equal(immunityRemaining(r,'local-x'),0);
});
test('Current descriptions explain purchases and turns and omit obsolete combo goals',()=>{
 const r=held(start());const html=inventoryMarkup(r,'local-x');assert.match(html,/333 puntos/);assert.match(html,/tres turnos/);assert.doesNotMatch(html,/data-immunity-goal|data-tool="immunity-1"|Cada 3, 33/);assert.equal(immunityComboNotice(r,move(r),'local-x'),null);
});
