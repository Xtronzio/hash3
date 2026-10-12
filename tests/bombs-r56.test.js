import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {activeInvasionBombs,disarmInvasionBombs} from '../src/pending-bombs.js';
import {advanceInvasions} from '../src/invasion-paths.js';
import {canUsePracticeTool,toolCells} from '../src/practice-tools.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {overviewModel} from '../src/map-overview.js';
import {mapCellSymbols} from '../src/map-render.js';
import {toolIcon} from '../src/inventory.js';
const now=100000;
export function bombFixture(mode='local'){
 const room=createLocal(mode,'Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:true});
 room.terrain=Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)}));
 room.invasions=[{id:'bombs',kind:'invader-rain',grown:4,failed:0,visited:[{x:2,y:2},{x:3,y:2},{x:2,y:3},{x:3,y:3}]},{id:'colony',kind:'invader-colony',grown:1,failed:0,visited:[{x:5,y:5}]}];room.invasionVersion=1;
 room.cells=[...room.invasions.flatMap(inv=>inv.visited.map(p=>({...p,id:inv.id+':'+p.x+':'+p.y,symbol:'*',owner:null,invader:true,invasionId:inv.id}))),{x:6,y:6,id:'stable',symbol:'*',owner:null},{x:1,y:2,id:'own',symbol:'X',owner:room.players[0].id}];
 room.players[0].score=14241;room.players[0].freeExpansions=58;room.players[0].inventory.cards.sapper=1;
 return room;
}
test('Active Bombardeo fronts are bombs in tools and shared maps; colonies/static/completed stars remain distinct',()=>{
 const r=bombFixture();assert.equal(activeInvasionBombs(r).length,4);assert.equal(toolCells(r,r.players[0].id,'sapper').length,4);assert.ok(canUsePracticeTool(r,r.players[0].id,'sapper',now));
 const model=overviewModel(r,r.players[0],r.players[1]);assert.equal(model.terrain.filter(p=>p.invasionBomb).length,4);assert.equal((mapCellSymbols(model.terrain).match(/data-invasion-bomb="active"/g)||[]).length,4);
 r.invasions[0].grown=9;assert.equal(activeInvasionBombs(r).length,0);assert.equal(canUsePracticeTool(r,r.players[0].id,'sapper',now),false);assert.equal(toolCells(r,r.players[0].id,'ambush').length,6);
 assert.match(toolIcon('sapper'),/data-icon="invasion-bomb"/);assert.match(toolIcon('sapper'),/data-icon="disarm-cross"/);assert.match(toolIcon('bomb'),/data-icon="invasion-bomb"/);
});
test('Disarming up to three fronts preserves terrain, earned points, reserves, turn and other focuses; remaining focus keeps its growth history',()=>{
 const r=bombFixture(),original=structuredClone(r),next=localCommand(r,'inventory',{playerId:r.players[0].id,tool:'sapper',x:2,y:2},now);
 assert.equal(next.lastEvent.disarmed,3);assert.equal(next.lastEvent.phase,'active');assert.equal(next.cells.filter(c=>c.invasionId==='bombs').length,1);assert.equal(next.players[0].inventory.cards.sapper,0);
 assert.deepEqual(next.terrain,original.terrain);assert.deepEqual(next.pairs,original.pairs);assert.equal(next.players[0].score,14241);assert.equal(next.players[0].freeExpansions,58);assert.deepEqual(next.players[1],original.players[1]);assert.deepEqual(next.invasions,original.invasions);
 advanceInvasions(next,now,()=>0);assert.equal(next.invasions[0].grown,5);assert.equal(next.cells.filter(c=>c.invasionId==='bombs').length,2);
});
test('One remaining active bomb retires its focus; invalid, stable and colony targets reject atomically',()=>{
 const r=bombFixture();r.cells=r.cells.filter(c=>c.invasionId!=='bombs'||c.x===2&&c.y===2);r.invasions[0].visited=[{x:2,y:2}];r.invasions[0].grown=1;
 assert.equal(disarmInvasionBombs(r,{x:2,y:2}).disarmed,1);assert.deepEqual(r.invasions.map(c=>c.id),['colony']);
 for(const point of [{x:5,y:5},{x:6,y:6},{x:99,y:99}]){const original=structuredClone(r);assert.throws(()=>disarmInvasionBombs(r,point));assert.deepEqual(r,original);}
});
test('Machine uses active bombs through the same referee and paused/out-of-turn games cannot spend',()=>{
 const r=bombFixture('solo'),actor=r.players[1].id;r.pairs[0].turn='O';r.players[1].inventory.cards.sapper=1;r.players[1].inventory.machineTradeTurn=r.players[1].inventory.completedTurns||0;r.cells.push({x:1,y:3,id:'rival',symbol:'O',owner:actor});
 const command=chooseMachineCard(r,now);assert.equal(command.payload.tool,'sapper');assert.equal(localCommand(r,command.action,command.payload,now).lastEvent.disarmed,3);
 const paused=bombFixture();paused.status='paused';assert.equal(canUsePracticeTool(paused,paused.players[0].id,'sapper',now),false);paused.status='playing';paused.pairs[0].turn='O';assert.equal(canUsePracticeTool(paused,paused.players[0].id,'sapper',now),false);
});
