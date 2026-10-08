import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canUsePracticeTool,completeInventoryTurn,initializeInventory,toolAllowance,practiceTools} from '../src/practice-tools.js';
import {usePracticeHint,inventoryTotal,inventoryMarkup} from '../src/inventory.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
const now=1700000000000;
const start=(mode='local',clock='untimed')=>createLocal(mode,'A','B',now,'normal',clock,'high','X',true);
const card=(r,tool,playerId='local-x',point={},t=now)=>localCommand(r,'inventory',{tool,playerId,...point},t);
const move=(r,x,y,t=now)=>localCommand(r,'move',{x,y},t,()=>0);
const earnCombo=r=>{r.players[0].inventory.cards.hint=0;for(let i=0;i<1;i++)completeInventoryTurn(r,'local-x',{random:()=>.999});return r;};

test('Combo entra en la recarga; mantiene ocho cartas iniciales y el contador suma la nueva carta',()=>{
 const r=start();assert.ok(practiceTools.some(t=>t.id==='combo'));assert.equal(inventoryTotal(r,'local-x'),8);
 assert.equal(r.players[0].inventory.cards.combo,0);assert.equal(canUsePracticeTool(r,'local-x','combo',now),false);
 earnCombo(r);assert.equal(r.players[0].inventory.cards.combo,1);assert.equal(inventoryTotal(r,'local-x'),8);
 assert.equal(r.players[0].inventory.lastDraw,'combo');assert.match(inventoryMarkup(r,'local-x'),/data-tool="combo"/);
});
test('El árbitro rechaza una segunda herramienta y Ayuda cuenta dentro del límite',()=>{
 let r=card(start(),'rival'),snapshot=structuredClone(r);
 assert.equal(canUsePracticeTool(r,'local-x','double',now),false);assert.throws(()=>card(r,'double'));
 assert.throws(()=>usePracticeHint(r,'local-x',now));assert.deepEqual(r,snapshot);
 r=usePracticeHint(start(),'local-x',now);assert.equal(canUsePracticeTool(r,'local-x','rival',now),false);
 assert.throws(()=>card(r,'rival'));assert.equal(toolAllowance(r,'local-x').remaining,0);
});
test('Combo se activa primero, consume stock y permite exactamente otras dos herramientas distintas',()=>{
 let r=earnCombo(start());r=card(r,'combo');assert.equal(inventoryTotal(r,'local-x'),7);
 assert.deepEqual(toolAllowance(r,'local-x'),{combo:true,limit:2,used:0,remaining:2});
 r=card(r,'double');assert.equal(toolAllowance(r,'local-x').remaining,1);
 r=card(r,'rival');assert.equal(toolAllowance(r,'local-x').remaining,0);
 assert.throws(()=>card(r,'block','local-x',{x:2,y:2}));
 r.players[0].inventory.cards.double=1;r.players[0].inventory.cards.combo=1;
 assert.equal(canUsePracticeTool(r,'local-x','double',now),false);assert.equal(canUsePracticeTool(r,'local-x','combo',now),false);
 const late=earnCombo(start());assert.equal(canUsePracticeTool(card(late,'double'),'local-x','combo',now),false);
});
test('Combo se conserva con pausa y Doble, no reinicia reloj y caduca al completar el turno',()=>{
 let r=earnCombo(start('local','timed')),deadline=r.pairs[0].deadline;
 r=card(r,'combo');r=card(r,'double');assert.equal(r.pairs[0].deadline,deadline);
 r=move(r,0,0,now+1000);assert.equal(toolAllowance(r,'local-x').remaining,1);
 r=localCommand(r,'pause',{},now+2000);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+86400000);
 assert.equal(toolAllowance(r,'local-x').remaining,1);assert.equal(r.practiceTurn.remaining,1);
 r=card(r,'rival','local-x',{},now+86400001);assert.equal(Date.parse(r.pairs[0].deadline),now+86400000+31000);
 r=move(r,1,0,now+86400002);assert.equal(r.practiceTurn,undefined);
 assert.equal(toolAllowance(r,'local-o').limit,1);r=move(r,1,1,now+86400003);
 assert.equal(toolAllowance(r,'local-x').combo,false);assert.equal(toolAllowance(r,'local-x').limit,1);
});
test('Tiempo agotado cancela Combo y no avanza la recarga',()=>{
 let r=earnCombo(start('local','timed'));r=card(r,'combo');r=card(r,'double');
 const turns=r.players[0].inventory.turns;r=localCommand(r,'tick',{},now+33000,()=>0);
 assert.equal(r.practiceTurn,undefined);assert.equal(r.pairs[0].turn,'O');assert.equal(r.cells.length,1);
 assert.equal(r.players[0].inventory.turns,turns);assert.equal(toolAllowance(r,'local-x').combo,false);
});
test('Las partidas anteriores conservan el inventario y efectos gastados sin ganar Combo ni borrar Doble',()=>{
 const r=card(start(),'double');r.inventoryVersion=1;for(const p of r.players)delete p.inventory.cards.combo;
 const before=structuredClone(r);initializeInventory(r);
 assert.equal(r.inventoryVersion,2);assert.equal(r.players[0].inventory.cards.combo,0);
 assert.deepEqual(r.practiceTurn,before.practiceTurn);assert.equal(r.practiceTurn.remaining,2);
 assert.equal(canUsePracticeTool(r,'local-x','rival',now),false);
 assert.equal(inventoryTotal(r,'local-x'),7);
});
test('La máquina necesita gastar Combo para usar dos herramientas y respeta el permiso de inventario',()=>{
 let r=move(start('solo'),0,0);r.players[1].inventory.cards.combo=1;r.players[1].inventory.cards.hint=0;
 const tools=[];
 for(let i=0;i<5;i++){
  const choice=chooseMachineCard(r,now);if(!choice)break;tools.push(choice.payload.tool);r=localCommand(r,choice.action,choice.payload,now);
 }
 assert.deepEqual(tools,['combo','double','rival']);assert.equal(r.players[1].inventory.cards.combo,0);
 assert.equal(toolAllowance(r,'local-o').remaining,0);
 const normal=move(start('solo'),0,0),first=chooseMachineCard(normal,now);
 const spent=localCommand(normal,first.action,first.payload,now);assert.equal(chooseMachineCard(spent,now),null);
 assert.equal(chooseMachineCard({...r,machineInventory:false},now),null);
});
