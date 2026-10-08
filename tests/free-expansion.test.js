import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canRequestStrategicExpansion,earnFreeExpansion,initializeFreeExpansions} from '../src/free-expansion.js';
import {useExpansionHint,suggestExpansion} from '../src/assistance.js';
import {canUsePracticeTool} from '../src/practice-tools.js';
import {expansionOptions,availableCells} from '../src/game.js';
const start=()=>{const r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].figures=200;r.players[1].figures=133;r.players[0].inventory.cards['hint-expand']=2;return r;};
test('No paid figures award free expansions; historic reserves survive without authorizing growth',()=>{
 const room={players:[{figures:13,freeExpansions:4,nextFreeExpansionFigure:18}]};initializeFreeExpansions(room);const p=room.players[0];
 p.figures=999;assert.equal(earnFreeExpansion(p),false);assert.equal(p.freeExpansions,4);assert.equal(p.nextFreeExpansionFigure,undefined);
 const r=start();r.players[1].figures=132;r.players[0].freeExpansions=100;assert.equal(canRequestStrategicExpansion(r,'local-x'),false);
 assert.throws(()=>localCommand(r,'request-free-expansion',{},2000),/Ampliación inteligente/);
});
test('Strategic expansion unlocks at exactly 333 shared paid figures, requires stock and own turn',()=>{
 const r=start();assert.ok(availableCells(r,r.pairs[0]).length);assert.ok(canUsePracticeTool(r,'local-x','hint-expand',2000));assert.equal(canRequestStrategicExpansion(r,'local-o'),false);
 r.players[1].figures=132;assert.equal(canUsePracticeTool(r,'local-x','hint-expand',2000),false);r.players[1].figures=133;r.players[0].inventory.cards['hint-expand']=0;assert.equal(canRequestStrategicExpansion(r,'local-x'),false);
});
test('Smart preview, pause and cancellation preserve stock and credits; commit consumes exactly one card',()=>{
 let r=start();r.pairs[0].credits=8;const pos=suggestExpansion(r,'local-x');r=useExpansionHint(r,'local-x',2000,pos);
 assert.equal(r.pairs[0].strategicExpansion,true);assert.equal(r.players[0].inventory.cards['hint-expand'],2);
 r=localCommand(r,'pause',{},2100);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},100000);assert.equal(r.pairs[0].pending,1);
 r=localCommand(r,'cancel-free-expansion',{},100001);assert.equal(r.players[0].inventory.cards['hint-expand'],2);assert.equal(r.practiceHint,undefined);
 r=useExpansionHint(r,'local-x',100002,pos);const before=r.terrain.length;r=localCommand(r,'expand',pos,100003);
 assert.ok(r.terrain.length>before);assert.equal(r.players[0].inventory.cards['hint-expand'],1);assert.equal(r.pairs[0].credits,8);assert.equal(r.pairs[0].turn,'X');assert.equal(r.pairs[0].pending,0);assert.equal(canRequestStrategicExpansion(r,'local-x'),false);
});
test('Strategic expansion preserves the remaining turn clock and cannot fit between Doble placements',()=>{
 let r=start();r.timeMode='timed';r.pairs[0].deadline=new Date(34000).toISOString();const pos=expansionOptions(r.terrain,r.pairs[0].active,r)[0];
 r=useExpansionHint(r,'local-x',2000,pos);r=localCommand(r,'expand',pos,3000);assert.equal(Date.parse(r.pairs[0].deadline),34000);
 assert.equal(canUsePracticeTool(r,'local-x','double',3001),false); // one tool already used
 r=start();r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},2000);r=localCommand(r,'move',{x:0,y:0},2001);assert.equal(canRequestStrategicExpansion(r,'local-x'),false);
});
test('Normal full-board expansion needs no strategic unlock or card; intelligent advice remains available in opening',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');assert.throws(()=>localCommand(r,'expand',{x:2,y:0},2000),/celdas vacías/);
 r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));r.pairs[0].pending=1;r.pairs[0].credits=2;r.pairs[0].expander='local-x';r.players[0].inventory.cards['hint-expand']=1;
 assert.ok(canUsePracticeTool(r,'local-x','hint-expand',2000));const pos=expansionOptions(r.terrain,r.pairs[0].active,r)[0];r=localCommand(r,'expand',pos,2000);assert.equal(r.pairs[0].credits,1);assert.equal(r.players[0].inventory.cards['hint-expand'],1);
});
test('Scoring the ninth figure gives points and normal credits, but no free ticket',()=>{
 let r=createLocal('local','A','B',1000,'normal','untimed');r.players[0].figures=8;r.cells=[{id:'a',x:1,y:0,symbol:'X',owner:'local-x'},{id:'b',x:2,y:0,symbol:'X',owner:'local-x'}];
 r=localCommand(r,'move',{x:0,y:0},2000);assert.equal(r.players[0].figures,9);assert.equal(r.players[0].freeExpansions,0);assert.ok(r.pairs[0].credits>0);
});
