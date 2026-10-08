import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canRequestFreeExpansion,earnFreeExpansion,initializeFreeExpansions} from '../src/free-expansion.js';
import {expansionOptions,availableCells} from '../src/game.js';
test('Every three paid figures earns one optional expansion, accumulates unused awards and skips historic replay',()=>{
 const room={players:[{figures:8}]};initializeFreeExpansions(room);assert.equal(room.players[0].freeExpansions,0);assert.equal(room.players[0].nextFreeExpansionFigure,9);
 const p=room.players[0];p.figures=9;assert.ok(earnFreeExpansion(p));p.figures=33;earnFreeExpansion(p);assert.equal(p.freeExpansions,9);assert.equal(p.nextFreeExpansionFigure,36);assert.equal(earnFreeExpansion(p),false);
});
test('Optional expansion can be previewed and cancelled with holes, then spent without losing normal credits or changing player',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].freeExpansions=1;r.pairs[0].credits=8;
 assert.ok(availableCells(r,r.pairs[0]).length);assert.ok(canRequestFreeExpansion(r,'local-x'));assert.ok(!canRequestFreeExpansion(r,'local-o'));
 r=localCommand(r,'request-free-expansion',{},2000);assert.equal(r.pairs[0].optionalExpansion,true);assert.equal(r.players[0].freeExpansions,1);
 const paused=localCommand(r,'pause',{},2100);r=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},99999);assert.equal(r.pairs[0].pending,1);
 r=localCommand(r,'cancel-free-expansion',{},100000);assert.equal(r.players[0].freeExpansions,1);r=localCommand(r,'request-free-expansion',{},100001);
 const pos=expansionOptions(r.terrain,r.pairs[0].active,r)[0],before=r.terrain.length;
 r=localCommand(r,'expand',pos,100002);assert.ok(r.terrain.length>before);assert.equal(r.players[0].freeExpansions,0);assert.equal(r.pairs[0].credits,8);assert.equal(r.pairs[0].turn,'X');assert.equal(r.pairs[0].pending,0);
 assert.throws(()=>localCommand(r,'request-free-expansion',{},100003),/ampliación libre/);
});
test('Normal expansion still requires filled terrain and consumes a normal credit',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');assert.throws(()=>localCommand(r,'expand',{x:2,y:0},2000),/celdas vacías/);
 r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));r.pairs[0].pending=1;r.pairs[0].credits=2;r.pairs[0].expander='local-x';
 r=localCommand(r,'expand',expansionOptions(r.terrain,r.pairs[0].active,r)[0],2000);assert.equal(r.pairs[0].credits,1);assert.equal(r.players[0].freeExpansions,0);
});

test('The scoring command actually grants the ticket when the third paid figure is completed',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].figures=2;r.cells=[{id:'a',x:1,y:0,symbol:'X',owner:'local-x'},{id:'b',x:2,y:0,symbol:'X',owner:'local-x'}];
 r=localCommand(r,'move',{x:0,y:0},2000);assert.equal(r.players[0].figures,3);assert.equal(r.players[0].freeExpansions,1);assert.equal(r.players[0].nextFreeExpansionFigure,6);
});

test('Unused expansions persist across pause and spending uses exactly one of the reserve',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');const p=r.players[0];
 p.figures=3;earnFreeExpansion(p);p.figures=6;earnFreeExpansion(p);assert.equal(p.freeExpansions,2);
 r=localCommand(r,'pause',{},1100);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},99999);assert.equal(r.players[0].freeExpansions,2);
 r=localCommand(r,'request-free-expansion',{},100000);r=localCommand(r,'cancel-free-expansion',{},100001);assert.equal(r.players[0].freeExpansions,2);
 r=localCommand(r,'request-free-expansion',{},100002);r=localCommand(r,'expand',expansionOptions(r.terrain,r.pairs[0].active,r)[0],100003);assert.equal(r.players[0].freeExpansions,1);
});
