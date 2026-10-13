import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {activeInvasionBombs,pendingInvasionBombs,disarmInvasionBombs} from '../src/pending-bombs.js';
import {canUsePracticeTool,toolCells} from '../src/practice-tools.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {overviewModel} from '../src/map-overview.js';
import {mapCellSymbols} from '../src/map-render.js';
import {toolIcon} from '../src/inventory.js';
const now=100000;
function fixture(mode='local'){
 const r=createLocal(mode,'Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false});r.terrain=Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)}));const groups=Array.from({length:4},(_,i)=>[{x:i+1,y:1},{x:i+1,y:2},{x:i+1,y:3}]);r.territoryEvents=[{id:'bombs',kind:'invader-rain',bombPhase:'bomb',groups,region:groups.flat(),turnsRemaining:3}];r.players[0].score=14241;r.players[0].freeExpansions=58;r.players[0].inventory.cards.sapper=1;return r;
}
test('Pending bombs share a bold glyph and disarm cross; stable invaders remain stars',()=>{
 const r=fixture();assert.equal(pendingInvasionBombs(r).length,4);assert.equal(toolCells(r,'local-x','sapper').length,4);assert.ok(canUsePracticeTool(r,'local-x','sapper',now));r.cells=[{id:'star',x:5,y:5,symbol:'*',owner:null}];const model=overviewModel(r,r.players[0],r.players[1]);assert.deepEqual(activeInvasionBombs(r),[]);assert.equal(model.terrain.filter(c=>c.invasionBomb).length,0);assert.doesNotMatch(mapCellSymbols(model.terrain),/data-invasion-bomb="active"/);for(const id of ['bomb','sapper'])assert.match(toolIcon(id),/data-icon="invasion-bomb"/);assert.match(toolIcon('sapper'),/data-icon="disarm-cross"/);
});
test('Artificieros disarms three whole bombs and preserves pieces, terrain, turn, reserves and remaining warning',()=>{
 const r=fixture(),before=structuredClone(r),next=localCommand(r,'inventory',{playerId:'local-x',tool:'sapper',x:1,y:1},now);assert.equal(next.lastEvent.disarmed,3);assert.equal(next.territoryEvents[0].groups.length,1);assert.equal(next.territoryEvents[0].region.length,3);assert.equal(next.territoryEvents[0].turnsRemaining,3);assert.deepEqual(next.cells,before.cells);assert.deepEqual(next.terrain,before.terrain);assert.deepEqual(next.pairs,before.pairs);assert.equal(next.players[0].score,14241);assert.equal(next.players[0].freeExpansions,58);assert.equal(next.players[0].inventory.cards.sapper,0);assert.deepEqual(next.players[1],before.players[1]);
});
test('Disarming the last bomb cancels its future entry and stable or entry targets reject atomically',()=>{
 const r=fixture();r.territoryEvents[0].groups=r.territoryEvents[0].groups.slice(0,1);r.territoryEvents[0].region=r.territoryEvents[0].groups.flat();assert.equal(disarmInvasionBombs(r,{x:1,y:1}).disarmed,1);assert.equal(r.territoryEvents.length,0);r.cells=[{id:'star',x:2,y:2,symbol:'*',owner:null}];for(const point of [{x:2,y:2},{x:99,y:99}]){const before=structuredClone(r);assert.throws(()=>disarmInvasionBombs(r,point));assert.deepEqual(r,before);}
});
test('Machine disarms warned bombs through the same referee and pause/out-of-turn cannot spend',()=>{
 const r=fixture('solo');r.pairs[0].turn='O';r.players[1].inventory.cards.sapper=1;r.players[1].inventory.machineTradeTurn=r.players[1].inventory.completedTurns||0;r.cells=[{id:'own',x:1,y:1,symbol:'O',owner:'local-o'}];const command=chooseMachineCard(r,now);assert.equal(command.payload.tool,'sapper');assert.equal(localCommand(r,command.action,command.payload,now).lastEvent.disarmed,3);const paused=fixture();paused.status='paused';assert.equal(canUsePracticeTool(paused,'local-x','sapper',now),false);paused.status='playing';paused.pairs[0].turn='O';assert.equal(canUsePracticeTool(paused,'local-x','sapper',now),false);
});
