import {completeEventTurns} from './helpers/turn-ecology.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {recordImmunityCombo,immunitySeconds,protectedTerritoryKeys} from '../src/immunity.js';
import {advanceHabitats,countHabitatPlacement,visitWorms} from '../src/inhabitants.js';
import {needsLocalTick} from '../src/local-clock.js';
import {canUsePracticeTool,toolAllowance} from '../src/practice-tools.js';
const now=1700000000000;
function start(){const r=createLocal('local','A','B',now,'normal','untimed');for(const id of ['local-x','local-o'])for(let i=0;i<3;i++)recordImmunityCombo(r,id,33);return r;}
const activate=(r,id='local-x',at=now)=>localCommand(r,'inventory',{tool:'immunity',playerId:id},at,()=>0);
const cell=(id,x,owner='local-x')=>({id,x,y:1,owner,symbol:owner==='local-x'?'X':'O'});
test('OVNI sigue su cuenta atrás y solo abduce fichas sin protección; el rival puede protegerse también',()=>{
 let r=start();r.cells=[cell('x',0),cell('o',1,'local-o')];r.territoryEvents=[{id:'u',kind:'ufo',region:r.cells.map(({x,y})=>({x,y})),turnsRemaining:3}];
 r=activate(r,'local-x',now+10000);assert.equal(r.territoryEvents[0].turnsRemaining,3);assert.equal(r.pairs[0].turn,'X');assert.equal(toolAllowance(r,'local-x').remaining,1);
 let impacted=completeEventTurns(structuredClone(r),now+33000);assert.deepEqual(impacted.cells.map(c=>c.id),['x']);assert.equal(impacted.terrain.length,9);assert.equal(impacted.territoryEvents.length,0);
 r=activate(r,'local-o',now+20000);impacted=completeEventTurns(structuredClone(r),now+33000);assert.equal(impacted.cells.length,2);assert.equal(impacted.territoryEvents.length,0);assert.equal(impacted.ecologyRecovery.moves,3);
 assert.equal(canUsePracticeTool(r,'local-x','immunity',now+42999),false);assert.equal(canUsePracticeTool(r,'local-x','immunity',now+43000),false); // Stock exhausted, independent of turn.
});
test('Lluvia respeta fichas y sus celdas, celdas propias vacías y fronteras protegidas',()=>{
 let r=start();r.cells=[cell('x',0),cell('o',1,'local-o')];r.terrain.find(c=>c.x===2&&c.y===1).owner='local-x';r.frontiers=[{id:'f',by:'local-x',cells:[{x:3,y:1},{x:4,y:1},{x:5,y:1}]}];
 r.territoryEvents=[{id:'rain',kind:'rain',nextAt:now+20000,region:[{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1}]}];r=activate(r);
 const keys=protectedTerritoryKeys(r);assert.ok(keys.has('0,1'));assert.ok(keys.has('2,1'));assert.ok(keys.has('3,1'));assert.ok(!keys.has('1,1'));
 r=completeEventTurns(r,now+20000);assert.deepEqual(r.cells.map(c=>c.id),['x']);assert.ok(r.terrain.some(c=>c.x===0&&c.y===1));assert.ok(r.terrain.some(c=>c.x===2&&c.y===1));assert.ok(!r.terrain.some(c=>c.x===1&&c.y===1));assert.equal(r.frontiers.length,1);
});
test('Gusano permanece vivo sin alimento desprotegido y vuelve a comer después de caducar',()=>{
 let r=start();r.cells=[cell('x',1)];r.worms=[{id:'w',kind:'worm',x:1,y:1,body:[{x:1,y:1}],eaten:0,nextAt:now+20000}];r=activate(r);advanceHabitats(r,now+20000,()=>0);
 assert.equal(r.cells.length,1);assert.equal(r.worms[0].eaten,0);for(let i=0;i<3;i++)visitWorms(r,null,now+20000,()=>0);assert.equal(r.worms[0].eaten,0);assert.equal(r.worms[0].failedMeals,1);
 for(let i=0;i<3;i++)visitWorms(r,null,now+53000,()=>0);assert.equal(r.cells.length,0);assert.equal(r.worms[0].eaten,1);
});
test('Roedores siguen por turnos y omiten las fichas protegidas sin acumular comidas',()=>{
 let r=start();r.cells=[cell('x',0),cell('o',1,'local-o')];r.rodentRaids=[{id:'r',x:0,y:0,count:1,remaining:3,visited:[]}];r=activate(r);
 countHabitatPlacement(r,'local-x',{x:2,y:2},now,()=>0);assert.deepEqual(r.cells.map(c=>c.id),['x','o']);assert.equal(r.rodentRaids[0].phase,'arriving');
 countHabitatPlacement(r,'local-o',{x:2,y:1},now,()=>0);assert.equal(r.cells.length,1);assert.equal(r.rodentRaids[0].phase,'eating');
});
test('Obra protegida pospone el par construir/destruir, conservando el equilibrio',()=>{
 let r=start();r.terrain.find(c=>c.x===1&&c.y===1).owner='local-x';r.works=[{id:'w',kind:'work',done:0,destroy:[{x:1,y:1}],build:[{x:3,y:1}],nextAt:now+20000}];r=activate(r);r.mode='world';advanceHabitats(r,now+20000,()=>0);
 assert.equal(r.terrain.length,9);assert.equal(r.works[0].done,0);advanceHabitats(r,now+53000,()=>0);assert.equal(r.terrain.length,9);assert.ok(r.terrain.some(c=>c.x===3&&c.y===1));assert.equal(r.works.length,0);
});
test('Pausa conserva exactamente el tiempo restante y el reloj de vencimiento no recorre el tablero',()=>{
 let r=activate(start());r=localCommand(r,'pause',{},now+7000);assert.equal(immunitySeconds(r,'local-x'),26);r=localCommand(r,'resume',{},now+86400000);assert.equal(immunitySeconds(r,'local-x'),26);
 const tickRoom={...r,terrain:null,cells:null};assert.equal(needsLocalTick(tickRoom,now+86426000),true);r=localCommand(r,'tick',{},now+86426000);assert.equal(immunitySeconds(r,'local-x'),0);
});

test('Frontera admite ampliación libre con huecos; la inmunidad rival se activa durante esa fase',()=>{
 let r=start();r.players[0].figures=333;r.players[0].inventory.cards['hint-expand']=1;r.players[0].inventory.cards.frontier=2;
 r=localCommand(r,'request-strategic-expansion',{},now);assert.equal(r.pairs[0].optionalExpansion,true);
 assert.equal(canUsePracticeTool(r,'local-x','frontier',now),true);r=localCommand(r,'inventory',{tool:'frontier',playerId:'local-x',x:3,y:0,side:'south'},now);
 assert.equal(r.frontiers.length,1);assert.equal(canUsePracticeTool(r,'local-x','frontier',now),false);
 const before=structuredClone(r.pairs);r=activate(r,'local-o');assert.deepEqual(r.pairs,before);assert.equal(immunitySeconds(r,'local-o'),33);
});
