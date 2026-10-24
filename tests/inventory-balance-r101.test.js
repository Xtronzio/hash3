import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {completeInventoryTurn,recordInventoryCombo,inventoryCapacity,spendCard,initializeInventory,relocationDestinations} from '../src/practice-tools.js';
import {adoptInventoryBalance} from '../src/inventory-balance.js';
import {boardActionFeedback} from '../src/rodent-feedback.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {recordImmunityCombo,immunityStock,spendImmunity} from '../src/immunity.js';
import {tradeAvailability} from '../src/inventory-economy.js';
import {activateFog,advanceFog,fogKeys} from '../src/fog.js';
import {advanceInverseFog,visibleInverseClaimsAt} from '../src/inverse-fog.js';
import {inverseClaimsAt} from '../src/inverse-claims.js';
import {inverseMachineChoice} from '../src/inverse.js';
import {legalMachineFallback} from '../src/machine-runner.js';
import {relocationSources} from '../src/relocate-cell.js';
import {rhinoRoutes} from '../src/brief-ecology.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
import {captureTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
const fresh=(extra={})=>createLocal('local','Jorge','Rival',NOW,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false,random:()=>0,...extra});
const inv=g=>g.players[0].inventory;
const total=g=>Object.values(inv(g).cards).reduce((a,b)=>a+b,0);
const cycle=(g,card,base)=>{inv(g).refillCycle={card,base,elapsed:0,bonus:0,comboTurn:-1,pending:false};};
const turn=(g,combo=0)=>{if(combo)recordInventoryCombo(g,'local-x',combo);completeInventoryTurn(g,'local-x',{random:()=>0});};
test('New games begin with their three selected favourites and announce a six/nine-turn card in a nine-card bag',()=>{
 const g=fresh({initialCards:['relocate','hint','erase']});assert.equal(total(g),3);assert.equal(inventoryCapacity(g),9);for(const id of ['relocate','hint','erase'])assert.equal(inv(g).cards[id],1);assert.ok(inv(g).refillCycle.card);assert.ok([6,9].includes(inv(g).refillCycle.base));
});
test('Basic cards take six own completed turns, while the rival, pause and tools give no progress',()=>{
 let g=fresh();cycle(g,'activate',6);const before=total(g);completeInventoryTurn(g,'local-o');assert.equal(inv(g).refillCycle.elapsed,0);
 g=localCommand(g,'pause',{},NOW);g=localCommand(g,'resume',{},NOW+100);assert.equal(inv(g).refillCycle.elapsed,0);
 for(let i=0;i<5;i++)turn(g);assert.equal(total(g),before);turn(g);assert.equal(total(g),before+1);assert.equal(inv(g).lastDraw,'activate');assert.equal(inv(g).refillCycle.elapsed,0);
});
test('Combos accelerate six to three and nine to five turns; a huge combo or repeated report does not bypass the minimum',()=>{
 for(const [base,turns]of [[6,3],[9,5]]){const g=fresh();cycle(g,'erase',base);const before=total(g);for(let i=0;i<turns;i++){recordInventoryCombo(g,'local-x',999999);recordInventoryCombo(g,'local-x',999999);completeInventoryTurn(g,'local-x');if(i<turns-1)assert.equal(total(g),before);}assert.equal(total(g),before+1);}
 const g=fresh();cycle(g,'erase',6);recordInventoryCombo(g,'local-x',999,{automatic:true});recordInventoryCombo(g,'local-x',999,{scorer:'local-o'});assert.equal(inv(g).refillCycle.bonus,0);
});
test('A full bag preserves one announced pending reward without accumulating future draws',()=>{
 const g=fresh();for(const k in inv(g).cards)inv(g).cards[k]=0;Object.assign(inv(g).cards,{double:3,hint:3,erase:3});cycle(g,'activate',6);
 for(let i=0;i<30;i++)turn(g,333);assert.equal(total(g),9);assert.equal(inv(g).draws,undefined);assert.ok(inv(g).refillCycle.pending);assert.equal(inv(g).refillCycle.card,'activate');
 spendCard(g,'local-x','double');assert.equal(total(g),9);assert.equal(inv(g).cards.activate,1);assert.equal(inv(g).draws,1);assert.equal(inv(g).refillCycle.elapsed,0);
});
test('Doble counts one completed turn and only one combo discount across its placements',()=>{
 let g=fresh();cycle(g,'activate',6);g=localCommand(g,'inventory',{tool:'double',playerId:'local-x'},NOW);g=localCommand(g,'move',{x:1,y:0},NOW);assert.equal(inv(g).refillCycle.elapsed,0);recordInventoryCombo(g,'local-x',33);recordInventoryCombo(g,'local-x',66);g=localCommand(g,'move',{x:2,y:0},NOW);assert.equal(inv(g).refillCycle.elapsed,1);assert.equal(inv(g).refillCycle.bonus,1);
});
test('Immunity requires successive individual combos33/66/99, cannot be bought or traded, and caps at three',()=>{
 const g=fresh();assert.equal(tradeAvailability(g,'local-x','immunity',NOW).allowed,false);
 for(const points of [32,1,20])recordImmunityCombo(g,'local-x',points);assert.equal(immunityStock(g,'local-x'),0);
 recordImmunityCombo(g,'local-x',99);assert.equal(immunityStock(g,'local-x'),1);assert.equal(inv(g).immunity.earned,1);
 recordImmunityCombo(g,'local-x',65);assert.equal(immunityStock(g,'local-x'),1);recordImmunityCombo(g,'local-x',66);recordImmunityCombo(g,'local-x',99);assert.equal(immunityStock(g,'local-x'),3);
 for(let i=0;i<5;i++)recordImmunityCombo(g,'local-x',9999);assert.equal(inv(g).immunity.earned,3);
 spendImmunity(g,'local-x');recordImmunityCombo(g,'local-x',98);assert.equal(immunityStock(g,'local-x'),2);recordImmunityCombo(g,'local-x',99);assert.equal(immunityStock(g,'local-x'),3);
});
test('Adoption keeps normal historical surplus, archives excess immunity and never rewards old completed turns',()=>{
 const g=fresh();delete g.inventoryBalanceVersion;inv(g).cards.double=18;inv(g).completedTurns=900;inv(g).immunity.cards['immunity-1']=90;delete inv(g).refillCycle;
 adoptInventoryBalance(g);initializeInventory(g);assert.equal(inv(g).cards.double,18);assert.equal(immunityStock(g,'local-x'),3);assert.equal(inv(g).immunity.legacyCards['immunity-1'],90);assert.equal(inv(g).refillCycle.elapsed,0);const before=JSON.stringify(g);adoptInventoryBalance(g);initializeInventory(g);assert.equal(JSON.stringify(g),before);
 const finished={...g,status:'finished'};delete finished.inventoryBalanceVersion;adoptInventoryBalance(finished);assert.equal(finished.inventoryBalanceVersion,undefined);
});
test('Clouds last nine and fog eighteen total completed turns without changing pieces or scores',()=>{
 for(const [kind,duration]of [['clouds',9],['fog',18]]){const g=fresh(),before=structuredClone(g.players);activateFog(g,{id:kind,kind},g.terrain.slice(0,3));assert.equal(g.fogEffects[0].turnsRemaining,duration);for(let i=1;i<duration;i++){g.ecologyTurns=i;advanceFog(g);assert.equal(g.fogEffects.length,1);}g.ecologyTurns=duration;advanceFog(g);assert.equal(g.fogEffects.length,0);assert.deepEqual(g.players,before);}
});
test('Relocate consumes one card, keeps total terrain, scores and turn, and rejects anchors and occupied sources',()=>{
 let g=fresh({initialCards:['relocate','double','hint']});const before=structuredClone(g),source={x:2,y:2},to=relocationDestinations(g,'local-x',source)[0];assert.ok(to);
 g=localCommand(g,'inventory',{tool:'relocate',playerId:'local-x',...source,toX:to.x,toY:to.y},NOW);assert.equal(g.terrain.length,9);assert.ok(!g.terrain.some(c=>c.x===2&&c.y===2));assert.ok(g.terrain.some(c=>c.x===to.x&&c.y===to.y));assert.equal(g.pairs[0].turn,'X');assert.equal(inv(g).cards.relocate,0);assert.deepEqual(g.players.map(p=>p.score),before.players.map(p=>p.score));
 assert.throws(()=>localCommand(before,'inventory',{tool:'relocate',playerId:'local-x',x:0,y:0,toX:3,toY:0},NOW));
});
test('Relocate protects bridges and works on large snapshots without recursive stack overflow',()=>{
 const g=fresh();g.terrain=[{x:0,y:0},{x:1,y:0},{x:2,y:0}];assert.ok(!relocationSources(g).some(c=>c.x===1));
 const big=fresh();big.terrain=Array.from({length:33333},(_,i)=>({x:i%333,y:Math.floor(i/333)}));assert.ok(relocationSources(big).length>30000);assert.equal(relocationSources(big),relocationSources(big));
});
test('Rhinos have a short lateral jog when the terrain permits it and retain legal unique announced paths',()=>{
 const g=fresh();g.terrain=Array.from({length:99},(_,i)=>({x:i%33,y:Math.floor(i/33)}));const paths=rhinoRoutes(g,1,()=>.1);assert.equal(paths.length,1);const path=paths[0];assert.equal(new Set(path.map(c=>`${c.x},${c.y}`)).size,path.length);assert.ok(new Set(path.map(c=>c.y)).size>1);assert.ok(path.length>=20);
});
test('Inverse fog has three warning turns, one region, eighteen-turn duration and no changes to fill, cells or score',()=>{
 const g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.cells=g.terrain.slice(0,3).map((c,i)=>({...c,id:'fog'+i,symbol:'X',owner:'local-x'}));const before=structuredClone({players:g.players,fill:g.inverseFill,cells:g.cells});
 for(let i=0;i<33;i++)advanceInverseFog(g,()=>0);assert.ok(g.inverseFog.targets.length);assert.equal(g.inverseFog.next-g.inverseFog.turns,3);
 for(let i=0;i<3;i++)advanceInverseFog(g,()=>0);assert.equal(g.fogEffects.length,1);assert.equal(g.fogEffects[0].turnsRemaining,18);assert.ok(fogKeys(g).size<=33);
 const s={getItem:k=>k==='hash3_locals'?JSON.stringify([g]):null,setItem(){}};assert.equal(captureTransfer(s,{now:NOW}).games[0].fogEffects[0].turnsRemaining,18);
 for(let i=0;i<18;i++)advanceInverseFog(g,()=>0);assert.equal(g.fogEffects.length,0);assert.deepEqual({players:g.players,fill:g.inverseFill,cells:g.cells},before);
});
test('Fog hides full claim previews while an intentional blind claim still uses the authoritative figures',()=>{
 let g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.terrain=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));g.inverseFill=g.terrain.map(c=>`${c.x},${c.y}`);g.cells=[0,1,2].map(x=>({x,y:0,id:'x'+x,symbol:'X',owner:'local-x'}));
 activateFog(g,{id:'hidden',kind:'fog'},g.terrain);assert.ok(inverseClaimsAt(g,'local-x',{x:0,y:0}).length);assert.deepEqual(visibleInverseClaimsAt(g,'local-x',{x:0,y:0},inverseClaimsAt),[]);
 const next=localCommand(g,'claim',{x:0,y:0},NOW);assert.ok(next.players[0].score>g.players[0].score);assert.equal(next.fogEffects[0].turnsRemaining,17);
});
test('Rhino feedback follows the bent corridor rather than interpolating a false straight diagonal',()=>{
 const before=fresh(),next=structuredClone(before);next.terrain=Array.from({length:20},(_,i)=>({x:i%5,y:Math.floor(i/5)}));next.habitatEvent={id:'jog',visualRoutes:[{from:{x:0,y:0},to:{x:4,y:1},waypoints:[{x:0,y:0},{x:2,y:0},{x:2,y:1},{x:4,y:1}]}]};const visits=boardActionFeedback(before,next).visits;assert.ok(visits.some(c=>c.x===2&&c.y===0));assert.ok(visits.some(c=>c.x===2&&c.y===1));assert.ok(!visits.some(c=>c.x===1&&c.y===1));
});
test('The machine can relocate a vacant tile to prepare a figure using the same referee',()=>{
 const g=createLocal('solo','Jorge','Rival',NOW,'normal','untimed','medium','X',true,{faunaEnabled:false,territoryEnabled:false,random:()=>0});g.pairs[0].turn='O';g.terrain=g.terrain.filter(c=>c.x!==1||c.y!==1);g.terrain.push({x:3,y:0});g.cells=[{x:1,y:0,id:'a',symbol:'O',owner:'local-o'},{x:1,y:2,id:'b',symbol:'O',owner:'local-o'}];for(const k in g.players[1].inventory.cards)g.players[1].inventory.cards[k]=0;g.players[1].inventory.cards.relocate=1;
 const choice=chooseMachineCard(g,NOW);assert.equal(choice.payload.tool,'relocate');assert.equal(choice.payload.toX,1);assert.equal(choice.payload.toY,1);const next=localCommand(g,choice.action,choice.payload,NOW);assert.equal(next.terrain.length,g.terrain.length);
});
test('Every Inverse machine entry, including the worker and timeout fallback, uses remembered fog signs',()=>{
 const g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.difficulty='basic';g.cells=[0,1,2].map(x=>({x,y:0,id:'hidden-'+x,symbol:'X',owner:'local-x'}));activateFog(g,{id:'fair',kind:'fog'},g.terrain);
 const altered=structuredClone(g);for(const c of altered.cells){c.symbol='O';c.owner='local-o';}
 const choose=r=>inverseMachineChoice(r,()=>0,{automatic:true,maxTimeMs:50,maxNodes:20,cards:false});assert.deepEqual(choose(g),choose(altered));
});
test('Inverse fog announcements stay at copied coordinates when a piece moves before impact',()=>{
 const g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.cells=g.terrain.slice(0,3).map((c,i)=>({...c,id:'p'+i,symbol:'X',owner:'local-x'}));for(let i=0;i<33;i++)advanceInverseFog(g,()=>0);const targets=structuredClone(g.inverseFog.targets);g.cells[0].x+=999;assert.deepEqual(g.inverseFog.targets,targets);
});
test('Old active duration protections are converted before applying the three-immunity usable limit',()=>{
 const g=fresh();delete g.inventoryBalanceVersion;g.immunityVersion=1;g.inventoryEffects.immunities=[{player:'local-x',remaining:33}];adoptInventoryBalance(g);initializeInventory(g);assert.equal(immunityStock(g,'local-x'),3);assert.ok(inv(g).immunity.legacyCards);assert.equal(inv(g).immunity.earned,3);
});
test('A failed remembered claim recovers without repeating it or reading the real hidden signs',()=>{
 const g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.cells=[0,1,2].map(x=>({x,y:0,id:'p'+x,symbol:'X',owner:'local-x'}));activateFog(g,{id:'memory',kind:'fog'},g.terrain);g.cells[1].symbol='O';g.cells[1].owner='local-o';const choice=legalMachineFallback(g,{action:'claim'});assert.equal(choice.action,'move');assert.doesNotThrow(()=>localCommand(g,choice.action,choice.payload,NOW));
});
test('A full foggy drawing lets the machine buy and use a blind area tool through the ordinary referee',()=>{
 let g=fresh({variant:'inverse',board:INVERSE_PRESETS[3]});g.cells=g.terrain.map((c,i)=>({...c,id:'p'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));activateFog(g,{id:'full',kind:'fog'},g.terrain);g.fogEffects[0].memory={};for(const k in inv(g).cards)inv(g).cards[k]=0;g.players[0].score=999;
 const buy=inverseMachineChoice(g,()=>0,{automatic:true,cards:false});assert.equal(buy.action,'trade');assert.equal(buy.payload.tool,'bomb');g=localCommand(g,buy.action,buy.payload,NOW);const use=inverseMachineChoice(g,()=>0,{automatic:true,cards:false});assert.equal(use.action,'inventory');assert.equal(use.payload.tool,'bomb');assert.ok(localCommand(g,use.action,use.payload,NOW).cells.length<g.cells.length);
});
