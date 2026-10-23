import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,reconcileLocalBoard} from '../src/local.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {considerTerritory} from '../src/inhabitants.js';
import {markTerritoryGrowth,territoryCandidates,initializeTerritoryRhythm,advanceTerritoryRhythm,validTerritoryDirector} from '../src/territory-director.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
function board(density=.65){
 const g=createLocal('local','Jorge','Rival',NOW,'normal','untimed','medium','X',false,{fauna:['rodent'],phenomena:['ufo']});
 g.terrain=Array.from({length:450},(_,i)=>({x:i%30,y:Math.floor(i/30)}));g.cells=g.terrain.slice(0,Math.floor(450*density)).map((p,i)=>({...p,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));markTerritoryGrowth(g);return g;
}
const move=g=>localCommand(g,'move',availableCells(g,g.pairs[0])[0],NOW,()=>0);
test('Waiting is a real decision and multiple cards cannot keep rerolling it during the same turn',()=>{
 const g=board();assert.equal(considerTerritory(g,NOW,()=>.99),false);assert.equal(g.territoryDirector.choices,0);
 g.cells[0].symbol='X';assert.equal(considerTerritory(g,NOW,()=>0),false);
 const n=move(g);assert.equal(n.territoryDirector.choices,1);assert.equal(n.rodentRaids[0]?.warningTurns??n.territoryEvents[0]?.turnsRemaining,3);
});
test('Real affected cells add recovery load in proportion to the impact, only once',()=>{
 const small=board(),large=structuredClone(small);
 for(const [g,count]of [[small,3],[large,33]]){g.ecologyTurns++;g.habitatEvent={id:'fresh-impact',actions:g.terrain.slice(0,count)};advanceTerritoryRhythm(g);}
 assert.ok(large.territoryDirector.rhythm.load>small.territoryDirector.rhythm.load);
 const r=structuredClone(large.territoryDirector.rhythm);advanceTerritoryRhythm(large);assert.deepEqual(large.territoryDirector.rhythm,r);
 large.ecologyTurns++;advanceTerritoryRhythm(large);assert.ok(large.territoryDirector.rhythm.load<r.load,'A stored report is not charged again');
});
test('Doble, cards, pause and expansion cannot spend recovery without a completed response',()=>{
 let g=board();g.territoryDirector.rhythm.load=5;g.players[0].inventory.cards.double=1;
 g=localCommand(g,'inventory',{tool:'double',playerId:'local-x'},NOW,()=>0);assert.equal(g.territoryDirector.rhythm.load,5);
 g=move(g);assert.equal(g.ecologyTurns,0);assert.equal(g.territoryDirector.rhythm.load,5);
 g=move(g);assert.equal(g.ecologyTurns,1);assert.ok(g.territoryDirector.rhythm.load<5);
 const p=localCommand(g,'pause',{},NOW,()=>0),r=structuredClone(p.territoryDirector.rhythm);g=localCommand(p,'resume',{},NOW+999999,()=>0);assert.deepEqual(g.territoryDirector.rhythm,r);
 let full=board(1);full.territoryDirector.rhythm.load=5;full=reconcileLocalBoard(full,NOW);const before=structuredClone(full.territoryDirector.rhythm),cells=structuredClone(full.cells);
 full=localCommand(full,'expand',expansionOptions(full.terrain,full.pairs[0].active,full)[0],NOW,()=>0);
 assert.equal(full.territoryDirector.rhythm.load,before.load);assert.equal(full.territoryDirector.rhythm.lastTurn,before.lastTurn);assert.deepEqual(full.cells,cells);assert.equal(full.territoryDirector.choices,0);
});
test('An episode may have a partner but cannot immediately replace an ended member',()=>{
 const g=board();g.faunaEvents=[{id:'survivor',kind:'rodent',directorTier:'small'}];g.territoryDirector.rhythm.episode=2;
 assert.deepEqual(territoryCandidates(g,()=>0),[]);
 g.faunaEvents=[];g.cells.pop();g.ecologyTurns++;advanceTerritoryRhythm(g);assert.equal(g.territoryDirector.rhythm.episode,0);assert.ok(territoryCandidates(g,()=>0).length>0);
});
test('Existing announcements migrate intact while old reports do not create historical recovery charges',()=>{
 const g=board();delete g.territoryDirector.rhythm;g.habitatEvent={id:'old-impact',actions:g.terrain.slice(0,33)};
 g.territoryEvents=[{id:'committed',kind:'ufo',region:g.terrain.slice(0,3),turnsRemaining:2,directorTier:'small'}];const events=structuredClone(g.territoryEvents);
 initializeTerritoryRhythm(g);assert.deepEqual(g.territoryEvents,events);assert.equal(g.territoryDirector.rhythm.episode,2);
 const load=g.territoryDirector.rhythm.load;g.ecologyTurns++;advanceTerritoryRhythm(g);assert.ok(g.territoryDirector.rhythm.load<load);
});
test('Dense territory recovers more slowly than a board with room to rebuild',()=>{
 const dense=board(.98),open=board(.3);for(const g of [dense,open]){g.territoryDirector.rhythm.load=5;g.ecologyTurns++;advanceTerritoryRhythm(g);}
 assert.ok(dense.territoryDirector.rhythm.load>open.territoryDirector.rhythm.load);
});
test('Transfer preserves rhythm and rejects forged load, future turns and oversized report history',()=>{
 const g=localCommand(board(),'pause',{},NOW,()=>0),storage={getItem:k=>k==='hash3_locals'?JSON.stringify([g]):null,setItem(){}};
 const data=captureTransfer(storage,{now:NOW,id:'rhythm'});validateTransfer(data);assert.deepEqual(data.games[0].territoryDirector.rhythm,g.territoryDirector.rhythm);
 for(const fields of [{load:-1},{load:34},{decisionTurn:999},{lastTurn:999},{seen:Array(13).fill('x')}]){const bad=structuredClone(data);Object.assign(bad.games[0].territoryDirector.rhythm,fields);assert.equal(validTerritoryDirector(bad.games[0]),false);assert.throws(()=>validateTransfer(bad));}
});
