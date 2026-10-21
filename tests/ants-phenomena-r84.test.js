import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {announceAnts,resolveAnts} from '../src/ants.js';
import {countHabitatPlacement,advanceEcologyTurn,initializeHabitats} from '../src/inhabitants.js';
import {ecologyTurnIds} from '../src/turn-ecology.js';
import {recordTerritoryPlacement} from '../src/territory-tools.js';
import {SELECTABLE_PHENOMENA,normalizePhenomena,phenomenonEnabled,phenomenaComparison} from '../src/phenomena-selection.js';
import {phenomenaPickerMarkup} from '../src/phenomena-ui.js';
import {territoryComparisonKey} from '../src/achievements.js';
import {ecologyTargets,ecologyNavigationMarkup} from '../src/ecology-navigation.js';
import {territoryThreatCells} from '../src/territory-threats.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
import {availableCells,figureWindows} from '../src/game.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const NOW=1800000000000;
const fresh=(options={})=>createLocal('local','A','B',NOW,'normal','untimed','pro','X',true,options);
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const board=(n=100)=>{const g=fresh();g.terrain=Array.from({length:n},(_,i)=>({x:i%10,y:Math.floor(i/10)}));g.cells=g.terrain.slice(0,n-5).map((c,i)=>tile(c.x,c.y,i%2?'X':'O'));return g;};
const keys=a=>a.map(c=>`${c.x},${c.y}`);
const event=g=>{g.faunaEvents=[{id:'ants-test',kind:'ants',x:0,y:0,turnsRemaining:1,announcedTurn:0,transports:[0,1,2].map(x=>({from:{x,y:0,id:`X:${x},0`},to:{x,y:-1}})),region:[0,1,2].flatMap(x=>[{x,y:0},{x,y:-1}])}];return g.faunaEvents[0];};
test('Three ants announce unique sources and new terrain, without moving or building before impact',()=>{
 const g=board(),before=structuredClone(g),zone={birthScale:{}};assert.equal(announceAnts(g,zone,NOW,()=>.3,g.cells[0]),true);const e=g.faunaEvents[0];assert.equal(e.kind,'ants');assert.equal(e.transports.length,3);assert.equal(e.turnsRemaining,3);assert.deepEqual(g.cells,before.cells);assert.deepEqual(g.terrain,before.terrain);assert.equal(new Set(e.transports.map(t=>t.from.id)).size,3);assert.equal(new Set(keys(e.transports.map(t=>t.to))).size,3);assert.ok(e.transports.every(t=>!keys(g.terrain).includes(`${t.to.x},${t.to.y}`)&&t.from.id!==g.cells[0].id));assert.equal(announceAnts(g,zone,NOW,()=>.2),false);assert.equal(ecologyTargets(g,'ants','local-x').length,3);assert.equal(territoryThreatCells(g).filter(t=>t.kind==='ants').length,6);
});
test('Transport conserves identities, land, stock and old points; only new final figures pay once',()=>{
 const g=fresh();g.cells=[0,1,2].map(x=>tile(x,0));g.players[0].score=90;g.forms=figureWindows(g.cells,0,0,'X','normal').map(f=>f.id);g.players[0].lastMove={...g.cells[0]};g.players[0].navigationLastMove={...g.cells[0]};const before=structuredClone(g),e=event(g);
 assert.equal(resolveAnts(g,e,NOW),3);assert.equal(g.terrain.length,12);assert.ok(keys(before.terrain).every(k=>keys(g.terrain).includes(k)));assert.deepEqual(g.cells.map(c=>[c.id,c.owner,c.symbol]),before.cells.map(c=>[c.id,c.owner,c.symbol]));assert.ok(g.cells.every(c=>c.y===-1));assert.equal(g.players[0].score,93);assert.equal(g.players[0].lastMove.y,-1);assert.equal(g.players[0].navigationLastMove.y,-1);assert.deepEqual(g.players.map(p=>p.inventory),before.players.map(p=>p.inventory));assert.equal(g.territoryImpacts.at(-1).constructed,3);assert.equal(resolveAnts(g,e,NOW+1),0);assert.equal(g.players[0].score,93);assert.equal(g.terrain.length,12);assert.equal(g.faunaEvents.length,0);
});
test('Plague announces exactly 33; full requested budgets, bounds and no mixed-symbol loss',()=>{
 const g=board(33333),zone={birthScale:{ants:1}},before=new Map(g.cells.map(c=>[c.id,[c.symbol,c.owner]]));assert.equal(announceAnts(g,zone,NOW,()=>.4),true);const e=g.faunaEvents[0];assert.equal(e.kind,'ants-plague');assert.equal(e.transports.length,33);assert.equal(resolveAnts(g,e,NOW),33);assert.equal(g.cells.length,33328);assert.equal(g.terrain.length,33366);assert.equal(new Set(keys(g.cells)).size,g.cells.length);assert.ok(g.cells.every(c=>JSON.stringify(before.get(c.id))===JSON.stringify([c.symbol,c.owner])));assert.ok(JSON.stringify(g.territoryImpacts.at(-1)).length<12000);
 const small=fresh();small.cells=[0,1,2].map(x=>tile(x,0));assert.equal(announceAnts(small,{birthScale:{ants:1}},NOW),false);small.cellTarget=33;small.terrain=Array.from({length:31},(_,i)=>({x:i%6,y:Math.floor(i/6)}));assert.equal(announceAnts(small,{},NOW),false);
});
test('Changes during warning skip only invalid transports and never overwrite, bypass immunity or build outside the goal',()=>{
 const g=fresh();g.cells=[0,1,2].map(x=>tile(x,0));const e=event(g);g.terrain.push({x:0,y:-1});g.cells.push(tile(0,-1,'O'));g.inventoryEffects.shields=[{cell:g.cells[1].id,remaining:3}];g.cellTarget=12;
 assert.equal(resolveAnts(g,e,NOW),1);assert.deepEqual(g.cells.find(c=>c.id==='X:0,0'),tile(0,0));assert.deepEqual(g.cells.find(c=>c.id==='X:1,0'),tile(1,0));assert.deepEqual(g.cells.find(c=>c.id==='O:0,-1'),tile(0,-1,'O'));assert.equal(g.terrain.length,11);assert.equal(g.cells.find(c=>c.id==='X:2,0').y,-1);
 const h=fresh();h.cells=[0,1,2].map(x=>tile(x,0));const f=event(h);h.status='paused';assert.equal(resolveAnts(h,f,NOW),0);h.status='playing';h.faunaEnabled=false;assert.equal(resolveAnts(h,f,NOW),0);
});
test('Real complete turns resolve once; pause, time, Doble first placement and restored snapshots preserve warning',()=>{
 let g=fresh({territoryEnabled:false});g.terrain=Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5)}));g.cells=[0,1,2].map(x=>tile(x,0));event(g);g.faunaEvents[0].turnsRemaining=3;const original=structuredClone(g.faunaEvents);g=localCommand(g,'pause',{},NOW);assert.deepEqual(g.faunaEvents,original);g=localCommand(g,'resume',{},NOW+999999);assert.deepEqual(g.faunaEvents,original);assert.equal(localCommand(g,'tick',{},NOW+1999999),g);
 g.players[0].inventory.cards.double=1;g=localCommand(g,'inventory',{playerId:'local-x',tool:'double'},NOW);g=localCommand(g,'move',{x:3,y:0},NOW);assert.equal(g.faunaEvents[0].turnsRemaining,3);g=localCommand(g,'move',{x:4,y:0},NOW);assert.equal(g.faunaEvents[0].turnsRemaining,2);for(let i=0;i<2;i++)g=localCommand(g,'move',availableCells(g,g.pairs[0])[0],NOW);assert.equal(g.faunaEvents.some(e=>e.id==='ants-test'),false);assert.equal(g.terrain.length,28);const version=g.version;g=localCommand(g,'tick',{},NOW+999999);assert.equal(g.version,version);assert.equal(g.terrain.length,28);
});
test('Ant schedule joins the real zone cadence and old zones start in the future without historical births',()=>{
 const g=board();delete g.territoryDirector;g.territoryEnabled=false;countHabitatPlacement(g,'local-x',{x:9,y:9},NOW,()=>.2);const z=g.habitatZones[0];for(const k of Object.keys(z.next))z.next[k]=99999;z.next.ants=z.placements+1;countHabitatPlacement(g,'local-o',{x:8,y:9},NOW,()=>.2);assert.equal(g.faunaEvents.filter(e=>e.kind==='ants').length,1);assert.ok(z.next.ants>=z.placements+198);
 const old=board();delete old.territoryDirector;countHabitatPlacement(old,'local-x',{x:9,y:9},NOW,()=>.2);const zone=old.habitatZones[0];zone.placements=9999;delete zone.next.ants;old.faunaEvents=[];countHabitatPlacement(old,'local-o',{x:8,y:9},NOW,()=>.2);assert.ok(zone.next.ants>zone.placements);assert.equal(old.faunaEvents.some(e=>e.kind==='ants'),false);
});
test('Phenomena selection is canonical, preserves legacy all, supports none and never affects Inverso or online',()=>{
 assert.equal(normalizePhenomena().length,13);assert.deepEqual(normalizePhenomena(['fog','meteorites','fog']),['meteorites','fog']);assert.throws(()=>normalizePhenomena(['bad']));const g=fresh({phenomena:['clouds']});assert.deepEqual(g.phenomena,['clouds']);assert.equal(phenomenonEnabled(g,'fog'),false);assert.equal(phenomenonEnabled(g,'clouds'),true);assert.equal(fresh({phenomena:[]}).territoryEnabled,false);const original=fresh();assert.equal(phenomenaComparison(original),null);assert.ok(phenomenonEnabled(original,'death'));assert.ok(phenomenonEnabled({...g,mode:'world'},'fog'));const inverse=fresh({variant:'inverse',board:INVERSE_PRESETS[0],phenomena:['fog']});assert.equal(inverse.territoryEnabled,false);assert.equal(announceAnts(inverse,{},NOW),false);
 const ui=phenomenaPickerMarkup(['clouds']);assert.match(ui,/1\/13/);assert.equal((ui.match(/data-phenomenon=/g)||[]).length,13);assert.equal((ui.match(/ checked/g)||[]).length,1);
});
test('Disabled reserved natural consumes its original slot without advancing another phenomenon',()=>{
 const g=board(333);delete g.territoryDirector;g.phenomena=['clouds'];g.players[0].figures=33;g.territoryPlans.natural='meteorites';g.livingBags.natural=['meteorites','clouds'];g.territoryNextPlacement=g.ecologyTurns;g.territoryNextInvasion=9999;g.territoryNextDeathTurn=9999;const turn=g.ecologyTurns;assert.equal(recordTerritoryPlacement(g,NOW,()=>.3),false);assert.equal(g.territoryNextPlacement,turn+33);assert.equal(g.territoryEvents.length,0);assert.equal(g.territoryPlans.natural,'clouds');g.ecologyTurns+=33;assert.equal(recordTerritoryPlacement(g,NOW,()=>.3),true);assert.equal(g.territoryEvents[0].kind,'clouds');assert.equal(g.territoryEvents[0].turnsRemaining,3);assert.doesNotMatch(ecologyNavigationMarkup(g,'local-x'),/data-ecology-kind="meteorites"/);
});
test('Disabling death, invaders and # prevents independent channels, without disabling selected natural events',()=>{
 const g=board();g.phenomena=['clouds'];g.players[0].figures=33;g.territoryNextPlacement=9999;g.territoryNextInvasion=0;g.territoryNextDeathTurn=0;assert.equal(recordTerritoryPlacement(g,NOW,()=>.3),false);assert.equal(g.territoryEvents.length,0);g.players[0].ecologyPlacements=8;countHabitatPlacement(g,'local-x',{x:9,y:9},NOW,()=>.3);assert.equal(g.cells.some(c=>c.symbol==='#'),false);assert.equal(g.territoryEvents.length,0);
});
test('Selection, ant warnings and player preferences survive transfer; malformed plans and settings are rejected',()=>{
 let g=board();g.phenomena=['fog','neutral'];announceAnts(g,{},NOW,()=>.3);g=localCommand(g,'pause',{},NOW);const m=new Map([['hash3_locals',JSON.stringify([g])],['hash3_local',JSON.stringify({id:g.id})],['hash3_name','A']]),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},data=captureTransfer(storage,{now:NOW});assert.equal(validateTransfer(data),data);assert.deepEqual(data.games[0].faunaEvents,g.faunaEvents);assert.deepEqual(data.games[0].phenomena,g.phenomena);
 for(const patch of [r=>r.phenomena=['unknown'],r=>r.faunaEvents[0].transports[0].to.x=NaN,r=>r.faunaEvents[0].turnsRemaining=4,r=>r.faunaEvents[0].transports[1].to={...r.faunaEvents[0].transports[0].to}]){const n=structuredClone(data);patch(n.games[0]);assert.throws(()=>validateTransfer(n),/no es válida/);}
 const a={...g,ruleVersion:24,territoryEnabled:true},b={...a,phenomena:['clouds']},c={...a,antVersion:undefined};assert.notEqual(territoryComparisonKey(a),territoryComparisonKey(b));assert.notEqual(territoryComparisonKey(a),territoryComparisonKey(c));
});
