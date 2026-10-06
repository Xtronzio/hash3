import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {completeInventoryTurn} from '../src/practice-tools.js';
import {inventoryTotal,inventoryRefill,inventoryDockMarkup} from '../src/inventory.js';
const now=1700000000000;
const start=()=>createLocal('local','A','B',now,'normal','untimed');

test('El contador suma unidades, baja al gastar y muestra cero aunque sea el turno rival',()=>{
 const original=start(),spent=localCommand(original,'inventory',{tool:'double',playerId:'local-x'},now);
 assert.equal(inventoryTotal(original,'local-x'),8);assert.equal(inventoryTotal(spent,'local-x'),7);
 spent.players[0].inventory.cards.double=2;
 assert.equal(inventoryTotal(spent,'local-x'),9);
 for(const id in spent.players[0].inventory.cards)spent.players[0].inventory.cards[id]=0;
 spent.pairs[0].turn='O';
 const html=inventoryDockMarkup(spent,'local-x');
 assert.match(html,/Inventario · 0 cartas/);assert.match(html,/inventory-badge is-empty[^>]*>0</);
});
test('Una recarga se detecta por el sorteo, incluso si el total coincide tras consumir',()=>{
 const previous=start(),next=localCommand(previous,'inventory',{tool:'rival',playerId:'local-x'},now);
 for(let i=0;i<4;i++)completeInventoryTurn(next,'local-x',{random:()=>0});
 assert.equal(inventoryTotal(previous,'local-x'),inventoryTotal(next,'local-x'));
 assert.deepEqual(inventoryRefill(previous,next,'local-x'),{player:'local-x',added:1,tool:'Doble',total:8});
 assert.equal(inventoryRefill(previous,next,'local-o'),null);
 assert.equal(inventoryRefill(next,structuredClone(next),'local-x'),null);
});
test('Abrir otro guardado, pausar o reanudar no anuncia recargas antiguas',()=>{
 let game=start();game.players[0].inventory.cards.double=0;
 for(let i=0;i<4;i++)completeInventoryTurn(game,'local-x',{random:()=>0});
 assert.equal(inventoryRefill(null,game,'local-x'),null);
 assert.equal(inventoryRefill(start(),game,'local-x'),null);
 const paused=localCommand(game,'pause',{},now),resumed=localCommand(paused,'resume',{},now+1000);
 assert.equal(inventoryRefill(game,paused,'local-x'),null);assert.equal(inventoryRefill(paused,resumed,'local-x'),null);
});
test('La recarga del rival no resalta tu contador; el aviso describe la carta propia',()=>{
 const game=start(),refill={player:'local-o',added:1,tool:'Ayuda'};
 assert.doesNotMatch(inventoryDockMarkup(game,'local-x',{refill}),/is-refilled|role="status"/);
 const html=inventoryDockMarkup(game,'local-o',{refill,open:true});
 assert.match(html,/is-refilled/);assert.match(html,/aria-expanded="true"/);
 assert.match(html,/role="status"/);assert.match(html,/Inventario recargado · \+1 Ayuda/);
});
test('Mochila llena y turnos automáticos no crean un aviso de recarga',()=>{
 const previous=start(),next=structuredClone(previous);
 for(let i=0;i<4;i++)completeInventoryTurn(next,'local-x',{random:()=>0});
 assert.equal(inventoryRefill(previous,next,'local-x'),null);
 assert.match(inventoryDockMarkup(next,'local-x'),/Recarga lista cuando haya hueco/);
 next.players[0].inventory.cards.double=0;completeInventoryTurn(next,'local-x',{automatic:true});
 assert.equal(inventoryRefill(previous,next,'local-x'),null);
});
