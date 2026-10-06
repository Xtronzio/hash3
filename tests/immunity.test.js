import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {figureWindows,availableCells,isBlockedCell} from '../src/game.js';
import {initializeInventory,canUsePracticeTool,completeInventoryTurn,toolAllowance,toolCells} from '../src/practice-tools.js';
import {immunityFor,immunityProgress,recordImmunityCombo,immunityRemaining} from '../src/immunity.js';
import {inventoryTotal,inventoryMarkup,inventoryRefill,inventoryDockMarkup,immunityBoardMarkup} from '../src/inventory.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {saveLocalGame,loadLocalGames} from '../src/sessions.js';
const now=1700000000000;
const start=(mode='local',clock='untimed')=>createLocal(mode,'A','B',now,'normal',clock,'high','X',true);
const card=(r,tool,playerId='local-x',point={})=>localCommand(r,'inventory',{tool,playerId,...point},now);
const move=(r,x,y)=>localCommand(r,'move',{x,y},now,()=>0);
function scoringRoom({length=33,symbol='X',twice=false,clock='untimed'}={}){
 const r=start('local',clock),width=length+3;
 r.terrain=Array.from({length:width*3},(_,i)=>({x:i%width,y:Math.floor(i/width)}));
 r.cells=[0,...(twice?[2]:[])].flatMap(y=>Array.from({length},(_,i)=>({x:i+1,y}))).filter(c=>c.x!==16).map((c,i)=>({...c,id:'c'+i,symbol,owner:symbol==='X'?'local-x':'local-o'}));
 r.forms=[...new Set(r.cells.flatMap(c=>figureWindows(r.cells,c.x,c.y,symbol).map(f=>f.id)))];
 return r;
}
const earn=(r,n,player='local-x')=>{for(let i=0;i<n;i++)recordImmunityCombo(r,player,33);return r;};

test('Solo cada jugada de al menos 33 puntos cuenta; no se exige antigüedad ni se acumulan puntos menores',()=>{
 const r=start();recordImmunityCombo(r,'local-x',32);recordImmunityCombo(r,'local-x',32);
 assert.equal(immunityFor(r,'local-x').combos,0);
 recordImmunityCombo(r,'local-x',33);recordImmunityCombo(r,'local-x',333);
 assert.equal(immunityFor(r,'local-x').combos,2);
 assert.deepEqual(immunityProgress(r,'local-x').map(g=>g.missing),[1,31,331]);
 assert.equal(inventoryTotal(r,'local-x'),8);
});
test('Los hitos repetibles 3, 33 y 333 avanzan juntos y sus premios nunca se pierden por bolsa llena',()=>{
 const r=earn(start(),3);assert.deepEqual(immunityFor(r,'local-x').cards,{'immunity-1':1,'immunity-3':0,'immunity-33':0});
 earn(r,30);assert.deepEqual(immunityFor(r,'local-x').cards,{'immunity-1':11,'immunity-3':1,'immunity-33':0});
 assert.deepEqual(immunityProgress(r,'local-x').map(g=>g.missing),[3,33,300]);
 earn(r,300);assert.deepEqual(immunityFor(r,'local-x').cards,{'immunity-1':111,'immunity-3':10,'immunity-33':1});
 assert.equal(immunityFor(r,'local-x').earned,122);assert.equal(inventoryTotal(r,'local-x'),130);
 assert.equal(Object.values(r.players[0].inventory.cards).reduce((s,n)=>s+n),8);
 completeInventoryTurn(r,'local-x',{random:()=>.999});assert.equal(r.players[0].inventory.cards.combo,0);
});
test('El árbitro cuenta la colocación real, sus bonus y cada ficha de Doble por separado',()=>{
 let r=move(scoringRoom(),16,0);assert.equal(r.lastEvent.points,33);assert.equal(immunityFor(r,'local-x').combos,1);
 r=scoringRoom({length:30});r.players[0].figures=2;r=move(r,16,0);
 assert.equal(r.lastEvent.points,33);assert.equal(r.lastEvent.bonus,3);assert.equal(immunityFor(r,'local-x').combos,1);
 r=card(scoringRoom({twice:true}),'double');r=move(r,16,0);assert.equal(r.pairs[0].turn,'X');
 r=move(r,16,2);assert.equal(immunityFor(r,'local-x').combos,2);assert.equal(r.pairs[0].turn,'O');
 const low=move(scoringRoom({length:32}),16,0);assert.equal(low.lastEvent.points,32);assert.equal(immunityFor(low,'local-x').combos,0);
});
test('No premia las acciones de cartas, el tiempo agotado ni el símbolo impuesto por el rival',()=>{
 let r=scoringRoom();r.cells.push({x:16,y:0,id:'target',symbol:'O',owner:'local-o'});
 r=card(r,'opposite','local-x',{x:16,y:0});assert.equal(r.lastEvent.points,33);assert.equal(immunityFor(r,'local-x').combos,0);
 r=scoringRoom({clock:'timed'});const free=availableCells(r,r.pairs[0]),index=free.findIndex(c=>c.x===16&&c.y===0);
 r=localCommand(r,'tick',{},now+30000,()=>(index+.1)/free.length);
 assert.equal(r.lastEvent.points,33);assert.equal(r.lastEvent.automatic,true);assert.equal(immunityFor(r,'local-x').combos,0);
 r=scoringRoom({symbol:'O'});r.inventoryEffects.forced.push({player:'local-x',symbol:'O',by:'local-o'});r=move(r,16,0);
 assert.equal(r.lastEvent.points,33);assert.equal(r.lastEvent.player,'local-o');
 assert.equal(immunityFor(r,'local-x').combos,0);assert.equal(immunityFor(r,'local-o').combos,0);
});
test('Una jugada inválida no consume premios ni altera contadores; no vuelve a premiar una celda ocupada',()=>{
 const before=earn(scoringRoom(),2),r=move(before,16,0),snapshot=structuredClone(r);
 assert.equal(immunityFor(r,'local-x').cards['immunity-1'],1);
 assert.throws(()=>move(r,16,0));assert.deepEqual(r,snapshot);assert.equal(immunityFor(before,'local-x').combos,2);
});
test('Puedes elegir 1, 3 o 33 rondas; gastar conserva todas las demás cartas y el progreso',()=>{
 for(const rounds of [1,3,33]){
   const before=earn(start(),333),r=card(before,'immunity-'+rounds);
   assert.equal(immunityRemaining(r,'local-x'),rounds);assert.equal(immunityFor(r,'local-x').combos,333);
   for(const g of immunityProgress(r,'local-x'))assert.equal(g.count,immunityFor(before,'local-x').cards[g.id]-(g.rounds===rounds?1:0));
   assert.deepEqual(immunityProgress(r,'local-x').map(g=>g.missing),[3,30,333]);
   assert.equal(inventoryTotal(r,'local-x'),inventoryTotal(before,'local-x')-1);
 }
});
test('Inmunidad respeta una herramienta, Combo, reloj, pausa, turnos y no apila duraciones activas',()=>{
 let r=earn(start('local','timed'),33),deadline=r.pairs[0].deadline;
 assert.equal(canUsePracticeTool(r,'local-o','immunity-1',now),false);
 assert.equal(canUsePracticeTool(r,'local-x','immunity-1',now+30000),false);
 const paused=localCommand(r,'pause',{},now);assert.equal(canUsePracticeTool(paused,'local-x','immunity-1',now),false);
 assert.throws(()=>card(card(r,'double'),'immunity-1'));
 r.players[0].inventory.cards.combo=1;r=card(r,'combo');r=card(r,'immunity-1');assert.equal(r.pairs[0].deadline,deadline);
 assert.equal(toolAllowance(r,'local-x').remaining,1);assert.equal(canUsePracticeTool(r,'local-x','immunity-3',now),false);
 assert.throws(()=>card(r,'immunity-3'));r=card(r,'double');assert.equal(toolAllowance(r,'local-x').remaining,0);
 assert.throws(()=>card(r,'rival'));
});
test('Bloquea borrar, convertir, desplazar, bloqueo y ficha rival sin gastar cartas enemigas',()=>{
 let r=earn(start(),3);r.cells.push({id:'own',x:0,y:0,symbol:'X',owner:'local-x'});r=card(r,'immunity-1');r=move(r,1,0);
 const before=structuredClone(r);
 for(const tool of ['erase','opposite','shift','block','rival']){
   assert.equal(canUsePracticeTool(r,'local-o',tool,now),false);assert.equal(toolCells(r,'local-o',tool).length,0);
   assert.throws(()=>card(r,tool,'local-o',{x:0,y:0,toX:2,toY:2}));assert.deepEqual(r,before);
 }
 r=move(r,2,2);assert.equal(immunityRemaining(r,'local-x'),0);r=move(r,2,0);
 assert.equal(canUsePracticeTool(r,'local-o','erase',now),true);assert.equal(canUsePracticeTool(r,'local-o','rival',now),true);
});
test('Activarla cancela Ficha rival pendiente y permite colocar en celdas bloqueadas por el rival',()=>{
 const r=earn(start(),3);r.inventoryEffects.forced.push({player:'local-x',symbol:'O',by:'local-o'});
 r.inventoryEffects.blocks=r.terrain.map(c=>({...c,by:'local-o',remaining:2,fresh:false}));
 assert.equal(availableCells(r,r.pairs[0]).length,0);assert.equal(canUsePracticeTool(r,'local-x','immunity-1',now),true);
 const active=card(r,'immunity-1');assert.equal(active.inventoryEffects.forced.length,0);
 assert.equal(isBlockedCell(active,'local-x',0,0),false);assert.equal(availableCells(active,active.pairs[0]).length,9);
 const placed=move(active,0,0);assert.equal(placed.cells[0].symbol,'X');assert.equal(immunityRemaining(placed,'local-x'),1);
});
test('Cada turno rival descuenta una ronda, incluso automático; Doble, ampliación y turno propio no descuentan extra',()=>{
 let r=card(earn(start(),33),'immunity-3');r=move(r,0,0);assert.equal(immunityRemaining(r,'local-x'),3);
 r=card(r,'double','local-o');r=move(r,1,0);assert.equal(immunityRemaining(r,'local-x'),3);
 r=move(r,2,0);assert.equal(immunityRemaining(r,'local-x'),2);r=move(r,0,1);assert.equal(immunityRemaining(r,'local-x'),2);
 r.timeMode='timed';r.pairs[0].deadline=new Date(now+30000).toISOString();r=localCommand(r,'tick',{},now+30000,()=>0);
 assert.equal(immunityRemaining(r,'local-x'),1);
 r=start();r=card(earn(r,33),'immunity-3');r.cells=r.terrain.map((c,i)=>({...c,id:'full'+i,symbol:'X',owner:'local-x'}));
 r.pairs[0].pending=1;r.pairs[0].credits=1;r.pairs[0].expander='local-x';
 r=localCommand(r,'expand',{x:3,y:0},now);assert.equal(immunityRemaining(r,'local-x'),3);
 completeInventoryTurn(r,'local-o',{placed:false});assert.equal(immunityRemaining(r,'local-x'),2);
});
test('Guardar, pausar y recuperar conserva cartas, progreso y duración sin repetir avisos',()=>{
 let r=card(earn(start(),334),'immunity-33');r=localCommand(r,'pause',{},now);
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 saveLocalGame(storage,r,now);const restored=loadLocalGames(storage)[0],resumed=localCommand(restored,'resume',{},now+86400000);
 assert.deepEqual(immunityFor(resumed,'local-x'),immunityFor(r,'local-x'));assert.equal(immunityRemaining(resumed,'local-x'),33);
 assert.equal(inventoryRefill(r,restored,'local-x'),null);assert.equal(inventoryRefill(restored,resumed,'local-x'),null);
});
test('Los guardados antiguos empiezan sin inmunidad y conservan stock, puntaje y efectos de su turno',()=>{
 const r=card(start(),'double');for(const p of r.players){delete p.inventory.immunity;p.score=33333;}
 delete r.inventoryEffects.immunities;const before=structuredClone(r);initializeInventory(r);
 assert.equal(immunityFor(r,'local-x').combos,0);assert.equal(inventoryTotal(r,'local-x'),7);
 assert.deepEqual(r.practiceTurn,before.practiceTurn);assert.deepEqual(r.players.map(p=>p.score),before.players.map(p=>p.score));
 assert.deepEqual(immunityProgress(r,'local-x').map(g=>g.count),[0,0,0]);
});
test('El premio avisa aunque se haya gastado otra carta; la bolsa suma inmunidades y el inventario cuenta lo que falta',()=>{
 const before=earn(scoringRoom(),332),next=move(card(before,'rival'),16,0),refill=inventoryRefill(before,next,'local-x');
 assert.equal(refill.added,2);assert.equal(refill.message,'Inmunidad disponible · 1 ronda + 33 rondas');
 assert.match(inventoryDockMarkup(next,'local-x',{refill}),/is-refilled/);
 assert.match(inventoryDockMarkup(next,'local-x',{refill}),/Inmunidad disponible/);
 assert.match(inventoryMarkup(next,'local-x'),/Faltan 333 combos/);assert.match(inventoryMarkup(next,'local-x'),/×111/);
 assert.match(immunityBoardMarkup(next,'local-x'),/122 disponibles/);assert.match(immunityBoardMarkup(next,'local-x'),/33 rondas · ×1/);
 assert.throws(()=>card(next,'immunity-3','local-o')); // Cannot invent a reward for the other player.
});
test('La máquina recibe las mismas recompensas y solo las activa si el inventario está permitido',()=>{
 let r=move(start('solo'),0,0);earn(r,3,'local-o');const choice=chooseMachineCard(r,now);
 assert.equal(choice.payload.tool,'immunity-1');r=localCommand(r,choice.action,choice.payload,now);
 assert.equal(immunityRemaining(r,'local-o'),1);assert.equal(immunityFor(r,'local-o').cards['immunity-1'],0);
 const disabled=move(start('solo'),0,0);earn(disabled,333,'local-o');disabled.machineInventory=false;
 assert.equal(chooseMachineCard(disabled,now),null);assert.throws(()=>card(disabled,'immunity-33','local-o'));
});
test('Combo no promete combinar dos inmunidades que no se pueden apilar',()=>{
 const r=earn(start(),333);for(const t of Object.keys(r.players[0].inventory.cards))r.players[0].inventory.cards[t]=0;
 r.players[0].inventory.cards.combo=1;assert.equal(canUsePracticeTool(r,'local-x','combo',now),false);
 r.players[0].inventory.cards.double=1;assert.equal(canUsePracticeTool(r,'local-x','combo',now),true);
});
