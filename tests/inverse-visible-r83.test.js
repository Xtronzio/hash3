import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
import {initializeInversePrison as initializeInverseBees,completePrisonTurn as completeInverseBeeTurn,prisonRemaining as inverseBeeRemaining,validInversePrison as validInverseBees} from '../src/inverse-prison.js';
import {inverseBeeClocks} from '../src/inverse-bee-ui.js';
import {inventoryPreferences,storeInventoryPreferences,floatingInventoryMarkup} from '../src/inventory-personalization.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
const fresh=()=>createLocal('local','A','B',NOW,'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>.5});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('Independent 3/33 draws persist, and only a paying claim redraws its owner',()=>{
 const g=fresh();delete g.inversePrison;const draws=[0,1];initializeInverseBees(g,()=>draws.shift());assert.equal(inverseBeeRemaining(g,'local-x'),3);assert.equal(inverseBeeRemaining(g,'local-o'),33);
 completeInverseBeeTurn(g,'local-x',0,()=>.5);assert.equal(inverseBeeRemaining(g,'local-x'),2);assert.equal(inverseBeeRemaining(g,'local-o'),33);
 completeInverseBeeTurn(g,'local-x',3,()=>.5);assert.equal(inverseBeeRemaining(g,'local-x'),18);assert.equal(inverseBeeRemaining(g,'local-o'),33);assert.equal(validInverseBees(g),true);
});
test('Legacy bee clocks migrate without redraw or historical misconduct; finished results stay historical',()=>{
 const g=fresh();delete g.inversePrison;g.inverseBees={version:1,players:{X:{turns:40,since:8,limit:9,cycles:2},O:{turns:20,since:4,limit:15,cycles:1}}};const before=structuredClone(g);let draws=0;
 initializeInverseBees(g,()=>{draws++;return 0;});assert.equal(draws,0);assert.equal(g.inversePrison.version,1);assert.equal(g.inversePrison.players.X.since,8);assert.equal(g.inversePrison.players.O.limit,15);assert.equal(g.inversePrison.players.X.opportunity,false);assert.equal(g.inverseBees,undefined);assert.deepEqual(g.cells,before.cells);assert.deepEqual(g.players,before.players);
 initializeInverseBees(g,()=>{throw Error('redraw');});assert.equal(inverseBeeRemaining(g,'local-x'),1);
 const old=structuredClone(before);old.status='finished';old.finalResult={inverseBeeVersion:1};const raw=JSON.stringify(old);initializeInverseBees(old);assert.equal(JSON.stringify(old),raw);
});
test('Both complete public clocks remain identified when O is the viewer; reads never migrate',()=>{
 const g=fresh();g.inversePrison.players.X.limit=33;g.inversePrison.players.O.limit=10;const before=JSON.stringify(g),html=inverseBeeClocks(g,'local-o',{paused:true});assert.match(html,/Tú<\/small><span[^>]+data-bee-symbol="O"/);assert.match(html,/Rival<\/small><span[^>]+data-bee-symbol="X"/);assert.match(html,/data-inverse-bee-count>33/);assert.match(html,/data-inverse-bee-count>10/);assert.match(html,/Pausa: cuenta detenida/);assert.equal(JSON.stringify(g),before);
 for(const version of [1,2])assert.equal(inverseBeeClocks({...g,inverseVersion:version},'local-x'),'');assert.equal(inverseBeeClocks({...g,variant:undefined},'local-x'),'');
});
test('Default floating claim applies to old and new preferences, while an explicit dock survives reload and transfer',()=>{
 const g=fresh(),storage=memory();g.inventoryPreferences={'local-x':{floating:['double'],positions:{double:{x:.4,y:.2}},inventoryCollapsed:true}};const before=JSON.stringify(g),p=inventoryPreferences(g,'local-x',storage);assert.deepEqual(p.floating,['double','inverse-claim']);assert.deepEqual(p.positions.double,{x:.4,y:.2});assert.equal(p.inventoryCollapsed,true);assert.equal(JSON.stringify(g),before);
 assert.match(floatingInventoryMarkup(g,'local-x',p),/floating-inverse-claim/);p.floating=p.floating.filter(id=>id!=='inverse-claim');p.inverseClaimDocked=true;const n=storeInventoryPreferences(g,'local-x',p,storage);assert.equal(inventoryPreferences(n,'local-x',storage).floating.includes('inverse-claim'),false);assert.equal(inventoryPreferences(n,'local-o',storage).floating.includes('inverse-claim'),true);
 const next=fresh();assert.equal(inventoryPreferences(next,'local-x',storage).inverseClaimDocked,true);assert.equal(inventoryPreferences(next,'local-x',storage).floating.includes('inverse-claim'),false);
 const paused=localCommand(n,'pause',{},NOW);storage.setItem('hash3_locals',JSON.stringify([paused]));storage.setItem('hash3_local',JSON.stringify({id:n.id}));storage.setItem('hash3_name','A');const data=captureTransfer(storage,{now:NOW,id:'r83'});validateTransfer(data);assert.equal(inventoryPreferences(data.games[0],'local-x').floating.includes('inverse-claim'),false);assert.deepEqual(data.games[0].inversePrison,paused.inversePrison);
 const original={...fresh(),variant:undefined};assert.equal(inventoryPreferences(original,'local-x').floating.includes('inverse-claim'),false);
});
test('Transferred v2 ranges validate endpoints and reject invalid limits or versions without weakening v1',()=>{
 const g=fresh();g.status='paused';g.inversePrison.players.X.limit=3;g.inversePrison.players.O.limit=33;assert.equal(validInverseBees(g),true);
 for(const limit of [2,34,3.5,NaN]){const n=structuredClone(g);n.inversePrison.players.X.limit=limit;assert.equal(validInverseBees(n),false);}
 const old=structuredClone(g);old.inversePrison.version=2;assert.equal(validInverseBees(old),false);old.inversePrison.version=1;assert.equal(validInverseBees(old),true);
});
