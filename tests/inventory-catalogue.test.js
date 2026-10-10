import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {practiceTools,MAX_CARDS,MAX_PER_CARD,MAX_CARD_TYPES,REFILL_TURNS,canUsePracticeTool,completeInventoryTurn,initializeInventory} from '../src/practice-tools.js';
import {availableCells,isBlockedCell} from '../src/game.js';
import {usePracticeHint,canUsePracticeHint} from '../src/inventory.js';
import {chooseMachineMove,machineMoveScore} from '../src/machine.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
const now=1700000000000;
const start=()=>createLocal('local','A','B',now);
const move=(r,x,y,t=now)=>localCommand(r,'move',{x,y},t,()=>0);
const card=(r,tool,point={})=>localCommand(r,'inventory',{tool,playerId:r.pairs[0][r.pairs[0].turn.toLowerCase()],...point},now);

test('Ambos jugadores empiezan con ocho cartas iguales; gastar no recarga inmediatamente',()=>{
 let r=start();assert.ok(practiceTools.some(t=>t.id==='double'));assert.deepEqual(r.players[0].inventory,r.players[1].inventory);
 assert.equal(Object.values(r.players[0].inventory.cards).reduce((a,b)=>a+b),8);
 r=card(r,'double');assert.equal(r.players[0].inventory.cards.double,0);r=move(r,0,0);assert.equal(r.players[0].inventory.turns,0);
 r=move(r,1,0);assert.equal(r.players[0].inventory.turns,0);assert.equal(r.players[0].inventory.cards.double,1);
 assert.throws(()=>localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now));assert.equal(r.players[1].inventory.cards.double,1);
});
test('Recarga por turno pagado; tres de cada carta, sin premiar esperas ni automáticos',()=>{
 const r=start(),id='local-x',inv=r.players[0].inventory;
 completeInventoryTurn(r,id,{automatic:true});completeInventoryTurn(r,id,{placed:false});assert.equal(inv.draws,undefined);
 for(let n=0;n<MAX_CARDS-8;n++)completeInventoryTurn(r,id,{random:()=>0});
 assert.equal(Object.values(inv.cards).reduce((a,b)=>a+b),MAX_CARDS);assert.equal(MAX_CARDS,18);
 assert.ok(practiceTools.some(t=>inv.cards[t.id]===0));assert.equal(inv.draws,10);
 completeInventoryTurn(r,id,{random:()=>0});assert.equal(inv.draws,10);assert.equal(inv.turns,1);
 inv.cards.erase=0;completeInventoryTurn(r,id,{automatic:true});assert.equal(inv.draws,10);
 completeInventoryTurn(r,id,{random:()=>0});assert.equal(inv.draws,11);assert.equal(inv.turns,0);
});
test('Bloqueo impide la colocación propia inmediata, permite la siguiente y dura dos turnos rivales',()=>{
 let r=card(start(),'block',{x:1,y:1});assert(isBlockedCell(r,'local-x',1,1));assert.throws(()=>move(r,1,1));
 r=move(r,0,0);assert(isBlockedCell(r,'local-o',1,1));assert.throws(()=>move(r,1,1));r=move(r,2,2);
 assert.equal(r.inventoryEffects.blocks[0].remaining,1);assert.equal(isBlockedCell(r,'local-x',1,1),false);
 const occupied=move(r,1,1);assert.equal(occupied.inventoryEffects.blocks.length,0);
 r=move(r,0,1);r=move(r,2,1);assert.equal(r.inventoryEffects.blocks.length,0);
});
test('Escudo protege contra borrar, convertir y desplazar durante dos turnos del rival',()=>{
 let r=move(move(start(),0,0),2,2);r=card(r,'shield',{x:0,y:0});r=move(r,0,1);
 for(const tool of ['erase','opposite','shift'])assert.throws(()=>card(r,tool,{x:0,y:0,toX:1,toY:0}));
 r=move(r,2,1);assert.equal(r.inventoryEffects.shields[0].remaining,1);r=move(r,1,0);r=move(r,1,2);assert.equal(r.inventoryEffects.shields.length,0);
});
test('Desplazar conserva símbolo y dueño, no reduce puntos y valida destino antes de consumir',()=>{
 let r=move(move(start(),0,0),1,1),original=structuredClone(r);
 assert.throws(()=>card(r,'shift',{x:1,y:1,toX:0,toY:0}));assert.deepEqual(r,original);
 const next=card(r,'shift',{x:1,y:1,toX:2,toY:2});assert(!next.cells.some(c=>c.x===1&&c.y===1));
 assert.equal(next.cells[1].symbol,'O');assert.equal(next.cells[1].owner,'local-o');assert.equal(next.pairs[0].turn,'X');assert.equal(next.players[0].inventory.cards.shift,0);
 assert(next.players.every((p,i)=>p.score>=r.players[i].score));
});
test('Ficha rival sobrevive a pausa y afecta al rival incluso si su reloj vence; cobra el dueño del símbolo',()=>{
 let r=move(move(start(),0,0),0,1);r=move(r,1,0);r=card(r,'rival'); // O obliga a X a poner O.
 r=move(r,2,2);r=localCommand(r,'pause',{},now+1000);const effects=structuredClone(r.inventoryEffects);
 r=localCommand(r,'resume',{},now+86400000);assert.deepEqual(r.inventoryEffects,effects);
 r=localCommand(r,'tick',{},Date.parse(r.pairs[0].deadline),()=>0);
 assert.equal(r.cells.at(-1).symbol,'O');assert.equal(r.cells.at(-1).owner,'local-x');assert.equal(r.inventoryEffects.forced.length,0);assert.equal(r.lastEvent.automatic,true);
});
test('La ayuda respeta el símbolo impuesto y consume la herramienta de ese turno',()=>{
 let r=card(start(),'rival');r=move(r,0,0);r=move(r,1,0);r=move(r,0,1);
 r=card(r,'rival');r=move(r,2,2); // X juega ahora con O por orden de O.
 const h=usePracticeHint(r,'local-x',now);assert(availableCells(r,r.pairs[0]).some(c=>c.x===h.practiceHint.x&&c.y===h.practiceHint.y));
 assert.equal(h.players[0].inventory.cards.hint,0);assert.equal(canUsePracticeHint(h,'local-x',now),false);
 assert.deepEqual(h.inventoryEffects,r.inventoryEffects);
});
test('Las partidas antiguas reciben el catálogo y no conservan la antigua interpretación armada',()=>{
 let r=start();delete r.inventoryVersion;delete r.inventoryEffects;for(const p of r.players)delete p.inventory;
 r.practiceTurn={player:'local-x',used:['opposite'],remaining:1,nextSymbol:'O'};initializeInventory(r);
 assert.equal(r.practiceTurn.nextSymbol,undefined);assert.equal(r.players[0].inventory.cards.rival,1);
 assert.equal(r.players[0].inventory.cards.combo,0);assert.throws(()=>card(r,'rival'));r=move(r,0,0);r=card(r,'rival');const copy=structuredClone(r);initializeInventory(copy);assert.deepEqual(copy.inventoryEffects.forced,r.inventoryEffects.forced);
});
test('La máquina usa el mismo stock y respeta bloqueos e imposiciones en Alto y Pro',()=>{
 let r=createLocal('solo','A','',now,'normal','timed','pro','X',true);r.players[0].inventory.cards.combo=1;r.players[0].inventory.cards.hint=0;r=card(r,'combo');r=card(r,'rival');r=card(r,'block',{x:1,y:1});r=move(r,0,0);
 const action=chooseMachineCard(r,now);assert(action);r=localCommand(r,action.action,action.payload,now);assert.equal(r.players[1].inventory.cards.double,0);
 for(const difficulty of ['high','pro']){
   const room={...r,difficulty},choice=chooseMachineMove(room,()=>0,{maxTimeMs:50,maxNodes:3000});
   assert.equal(choice.action,'move');assert.notDeepEqual(choice.payload,{x:1,y:1});
   const predicted=machineMoveScore(room,choice.payload),actual=localCommand(room,'move',choice.payload,now);assert.equal(actual.cells.at(-1).symbol,'X');assert.equal(predicted.points,actual.lastEvent.points);
 }
 assert.throws(()=>machineMoveScore(r,{x:1,y:1}),/legales/);
});


test('Inventario de máquina desactivado por defecto y validado también por el árbitro',()=>{
 let r=createLocal('solo','A','',now,'advanced','timed','pro','O');assert.equal(r.machineInventory,false);assert.equal(r.level,'advanced');assert.equal(r.difficulty,'pro');
 assert.equal(chooseMachineCard(r,now),null);assert.equal(canUsePracticeTool(r,'local-x','double',now),false);assert.equal(r.players[0].inventory.cards.double,1);
 assert.throws(()=>localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now));
 const action=chooseMachineMove(r,()=>0,{maxTimeMs:20,maxNodes:1000});assert.equal(action.action,'move');r=localCommand(r,action.action,action.payload,now,()=>0);
 assert.equal(canUsePracticeTool(r,'local-o','double',now),true);
 r=localCommand(r,'pause',{},now+1000);r=localCommand(r,'resume',{},now+86400000);assert.equal(r.machineInventory,false);
 const enabled=createLocal('solo','A','',now,'normal','timed','medium','O',true);assert.equal(canUsePracticeTool(enabled,'local-x','double',now),true);
 const legacy=structuredClone(enabled);delete legacy.machineInventory;assert.equal(chooseMachineCard(legacy,now),null);
});


test('Dificultad, figuras, reloj e inventario son independientes y sobreviven a la pausa',()=>{
 for(const difficulty of ['basic','medium','high','pro'])for(const level of ['normal','advanced'])for(const timeMode of ['timed','untimed'])for(const enabled of [false,true]){
  let r=createLocal('solo','A','',now,level,timeMode,difficulty,'O',enabled);
  assert.equal(r.difficulty,difficulty);assert.equal(r.level,level);assert.equal(r.timeMode,timeMode);assert.equal(!!chooseMachineCard(r,now),enabled);
  if(timeMode==='untimed'){assert.equal(r.pairs[0].deadline,null);assert.equal(localCommand(r,'tick',{},now+86400000),r);}
  r=localCommand(r,'pause',{},now+1000);r=localCommand(r,'resume',{},now+86400000);
  assert.equal(r.machineInventory,enabled);assert.equal(r.timeMode,timeMode);assert.equal(r.difficulty,difficulty);assert.equal(r.level,level);
  if(timeMode==='untimed')assert.equal(r.pairs[0].deadline,null);else assert.equal(Date.parse(r.pairs[0].deadline),now+86400000+32000);
 }
});

test('Recargas aleatorias permiten duplicados antes de completar el catálogo',()=>{
 const r=start(),inv=r.players[0].inventory;
 completeInventoryTurn(r,'local-x',{random:()=>0});assert.equal(inv.cards.double,2);
 completeInventoryTurn(r,'local-x',{random:()=>0});assert.equal(inv.cards.double,3);
 assert.equal(inv.cards.bomb,0);assert.equal(inv.cards.tornado,0);
 completeInventoryTurn(r,'local-x',{random:()=>.72});assert.ok(['bomb','frontier','hint-expand','super-hint','combo'].includes(inv.lastDraw));
});
test('Fair refill survives saves, never exceeds stock caps and cannot draw a fourth copy',()=>{
 let r=start(),inv=r.players[0].inventory;inv.cards.hint=0;
 for(let turn=0;turn<REFILL_TURNS;turn++)completeInventoryTurn(r,'local-x',{random:()=>0});
 const history=structuredClone(inv.received);r=localCommand(r,'pause',{},now);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+1000);inv=r.players[0].inventory;assert.deepEqual(inv.received,history);
 for(const t of practiceTools){inv.cards[t.id]=0;inv.received[t.id]=10;}inv.cards.double=MAX_PER_CARD;inv.received.double=0;
 for(let turn=0;turn<REFILL_TURNS;turn++)completeInventoryTurn(r,'local-x',{random:()=>0});assert.equal(inv.cards.double,MAX_PER_CARD);assert.notEqual(inv.lastDraw,'double');assert.ok(Object.values(inv.cards).reduce((a,b)=>a+b,0)<=MAX_CARDS);
 delete inv.received;initializeInventory(r);assert.ok(practiceTools.every(t=>Number.isInteger(inv.received[t.id])));assert.equal(inv.cards.double,MAX_PER_CARD);
});

test('Mochila de 18 y hasta 12 tipos permite ceros; protecciones aparte y sin recargas históricas',()=>{
 let r=start(),inv=r.players[0].inventory;inv.immunity.cards['immunity-1']=333;
 const before=structuredClone(inv.cards);initializeInventory(r);assert.deepEqual(inv.cards,before);
 for(let turn=0;turn<100;turn++)completeInventoryTurn(r,'local-x',{random:()=>0});
 assert.equal(Object.values(inv.cards).reduce((a,b)=>a+b),18);assert.ok(practiceTools.some(t=>inv.cards[t.id]===0));
 assert.ok(practiceTools.every(t=>inv.cards[t.id]<=3));assert.equal(inv.draws,10);assert.equal(inv.immunity.cards['immunity-1'],333);
 r=JSON.parse(JSON.stringify(r));initializeInventory(r);assert.deepEqual(r.players[0].inventory,inv);
});
test('No entra un tipo 13; agotar una carta abre sitio para otro tipo sin reponerla a la fuerza',()=>{
 const r=start(),inv=r.players[0].inventory;
 for(const t of practiceTools)inv.cards[t.id]=0;
 for(const t of practiceTools.slice(0,MAX_CARD_TYPES))inv.cards[t.id]=1;
 completeInventoryTurn(r,'local-x',{random:()=>.999});assert.equal(inv.lastDraw,practiceTools[MAX_CARD_TYPES-1].id);assert.equal(inv.cards.frontier,0);
 inv.cards.double=0;completeInventoryTurn(r,'local-x',{random:()=>.999});assert.equal(inv.lastDraw,'combo');assert.equal(inv.cards.combo,1);assert.equal(inv.cards.double,0);
 assert.equal(practiceTools.filter(t=>inv.cards[t.id]>0).length,MAX_CARD_TYPES);
});
test('Reservas anteriores excesivas se conservan y no recargan hasta cumplir ambos límites',()=>{
 const r=start(),inv=r.players[0].inventory;
 for(const t of practiceTools)inv.cards[t.id]=3;
 const before=structuredClone(inv.cards);
 for(let turn=0;turn<20;turn++)completeInventoryTurn(r,'local-x',{random:()=>0});assert.deepEqual(inv.cards,before);assert.equal(inv.draws,undefined);
 for(const t of practiceTools)inv.cards[t.id]=1; // 16 tipos: todavía no hay hueco de variedad.
 completeInventoryTurn(r,'local-x',{random:()=>0});assert.equal(inv.draws,undefined);
 for(const t of practiceTools.slice(MAX_CARD_TYPES))inv.cards[t.id]=0;
 completeInventoryTurn(r,'local-x',{random:()=>0});assert.equal(inv.draws,1);
});
test('Sorteo sostenido rota todo el catálogo y mantiene stocks 0/1/2/3 sin llenar un arsenal',()=>{
 const r=start(),inv=r.players[0].inventory,seen=new Set(),stocks=new Set();let seed=333;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let turn=0;turn<3000;turn++){
   const held=practiceTools.filter(t=>inv.cards[t.id]>0);
   if(held.length&&random()<.85)inv.cards[held[Math.floor(random()*held.length)].id]--;
   completeInventoryTurn(r,'local-x',{random});seen.add(inv.lastDraw);
   const counts=practiceTools.map(t=>inv.cards[t.id]);counts.forEach(n=>stocks.add(n));
   assert.ok(counts.reduce((a,b)=>a+b)<=18);assert.ok(counts.filter(n=>n>0).length<=12);assert.ok(counts.every(n=>n<=3));assert.ok(counts.some(n=>n===0));
 }
 assert.equal(seen.size,practiceTools.length);assert.deepEqual([...stocks].sort(),[0,1,2,3]);
});
