import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {newTerritoryImpacts,territoryImpactText} from '../src/territory-impact.js';
import {targetNavigation,lastNavigationMove,toggleWatchTarget} from '../src/watch-targets.js';
import {inventoryMarkup,inventoryStatusMarkup} from '../src/inventory.js';
import {mapFrameMarkup} from '../src/map-render.js';
const now=Date.now(),fresh=()=>createLocal('local','X','O',now,'normal','untimed');
const piece=(id,x,y)=>({id,x,y,symbol:'X',owner:'local-x'});
test('Diana is in hall, bag and quick inventory without using normal stock, turns or allowances',()=>{
 const r=fresh(),before=structuredClone(r.players[0].inventory.cards);
 for(const html of [inventoryMarkup(null,null),inventoryMarkup(r,'local-x'),inventoryStatusMarkup(r,{playerId:'local-x'})])assert.equal((html.match(/data-tool="target"/g)||[]).length,1);
 const next=localCommand(r,'watch-target',{x:1,y:1},now);assert.deepEqual(next.players[0].inventory.cards,before);assert.equal(next.pairs[0].turn,'X');assert.equal(next.ecologyTurns,0);
});
test('Jump menu has red, green, blue targets and white last-move, also in saved maps; absent targets are disabled',()=>{
 const r=fresh();for(const [x,y]of [[0,0],[1,0],[2,0]])toggleWatchTarget(r,{x,y});
 r.players[0].navigationLastMove={x:2,y:2};
 for(const inspection of [false,true]){const html=targetNavigation(r,{inspection,playerId:'local-x'});for(const color of ['roja','verde','azul','blanca'])assert.match(html,new RegExp(`data-target-color="${color}"`));assert.match(html,/Mi último movimiento/);assert.doesNotMatch(html,/data-action="mark-target"/);}
 const map=mapFrameMarkup({watchTargets:r.watchTargets});for(const color of ['red','green','blue'])assert.match(map,new RegExp(`stroke="var\\(--${color}\\)"`));
 assert.match(targetNavigation(fresh()),/data-target-color="roja"[^>]*disabled/);
});
test('White reference retains the last placed coordinates even after the piece is removed',()=>{
 let r=localCommand(fresh(),'move',{x:2,y:2},now);const reference=lastNavigationMove(r.players[0]);assert.deepEqual({x:reference.x,y:reference.y},{x:2,y:2});
 r.cells=[];delete r.players[0].lastMove;assert.deepEqual(lastNavigationMove(r.players[0]),reference);
 const old=fresh();old.players[0].lastMove=piece('old',1,1);assert.equal(lastNavigationMove(old.players[0]).id,'old');
});
test('UFO impact reports actual liberated occupied cells, respects shields and does not replay after save/load',()=>{
 const r=fresh();r.cells=[piece('a',0,0),piece('b',1,0),piece('c',2,0)];r.inventoryEffects.shields=[{cell:'c',by:'local-x',remaining:2}];
 r.territoryEvents=[{id:'ufo-impact',kind:'ufo',turnsRemaining:0,region:[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1}]}];const previous=structuredClone(r);
 advanceTerritory(r,now);assert.equal(r.cells.length,1);assert.equal(r.terrain.length,9);assert.equal(territoryImpactText(r.territoryImpacts[0]),'OVNI ha liberado 2 celdas');assert.equal(newTerritoryImpacts(previous,r).length,1);
 const saved=JSON.parse(JSON.stringify(r));assert.deepEqual(newTerritoryImpacts(null,saved),[]);assert.deepEqual(newTerritoryImpacts(r,saved),[]);advanceTerritory(saved,now+1);assert.equal(saved.territoryImpacts.length,1);
});
test('Demolition reports actual built terrain once, not the proposed region or piece count',()=>{
 const r=fresh();r.terrain=Array.from({length:16},(_,i)=>({x:i%4,y:Math.floor(i/4)}));
 r.territoryEvents=[{id:'demolition',kind:'cataclysm',turnsRemaining:0,region:[{x:1,y:1},{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:99,y:99}]}];
 advanceTerritory(r,now);assert.equal(r.terrain.length,12);assert.equal(territoryImpactText(r.territoryImpacts[0]),'Cataclismo ha destruido 4 celdas');
});
test('Contagion reports converted pieces; protected and empty cells never inflate the result',()=>{
 const r=fresh();r.cells=[piece('a',0,0),piece('b',1,0)];r.inventoryEffects.shields=[{cell:'b',by:'local-x',remaining:2}];r.territoryEvents=[{id:'conversion',kind:'contagion',turnsRemaining:0,region:[{x:0,y:0},{x:1,y:0},{x:2,y:0}]}];
 advanceTerritory(r,now);assert.equal(territoryImpactText(r.territoryImpacts[0]),'Contagio ha convertido 1 ficha');
});
