import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {boardCellLimit} from '../src/board-limits.js';
import {needsLocalTick} from '../src/local-clock.js';
import {saveLocalGame,deleteLocalGame,loadLocalGames} from '../src/sessions.js';
import {loadTerritoryResults,territoryComparisonKey,achievementsMarkup} from '../src/achievements.js';
import {matchGoalsMarkup} from '../src/match-goals-ui.js';
import {MATCH_TIME_TARGETS} from '../src/match-durations.js';
const game=options=>createLocal('solo','A','B',1000,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false,...options});
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
test('Each cell objective finishes at constructed terrain, even with holes and ecology on; Mundo stays continuous',()=>{
 for(const target of [33,333,3333,33333]){
  const r=game({cellTarget:target,faunaEnabled:true});assert.equal(boardCellLimit(r),target);assert.equal(boardCellLimit({...r,mode:'world'}),Infinity);
 }
 let r=game({cellTarget:33});r.terrain=Array.from({length:32},(_,i)=>({x:i%3,y:Math.floor(i/3)}));r.players[0].inventory.cards.activate=1;
 r=localCommand(r,'inventory',{tool:'activate',playerId:'local-x',x:2,y:10},2000);assert.equal(r.status,'finished');assert.equal(r.cells.length,0);assert.equal(r.finalResult.limit,33);assert.equal(r.finalResult.kind,'board-limit');assert.equal(r.pairs[0].deadline,null);
});
test('Move limit counts accepted placements of both players, finishes after scoring, and excludes cards/expansions',()=>{
 let r=game({matchGoal:{type:'moves',target:33}});r.players[0].placements=16;r.players[1].placements=16;
 r.cells=[{id:'a',x:1,y:0,owner:'local-x',symbol:'X'},{id:'b',x:2,y:0,owner:'local-x',symbol:'X'}];
 r=localCommand(r,'move',{x:0,y:0},2000);assert.equal(r.status,'finished');assert.equal(r.finalResult.kind,'move-limit');assert.equal(r.finalResult.target,33);assert.ok(r.finalResult.players[0].score>0);assert.equal(r.finalResult.players.reduce((s,p)=>s+p.placements,0),33);
 assert.equal(localCommand(r,'tick',{},999999),r);
});
test('Total match time works without a turn clock, freezes through pause and closes before playing an overdue move',()=>{
 let r=game({matchGoal:{type:'time',target:180}});assert.equal(needsLocalTick(r,181000),true);
 r=localCommand(r,'pause',{},11000);assert.equal(r.matchRemainingMs,170000);
 r=localCommand(r,'resume',{},1000000);assert.equal(Date.parse(r.endsAt),1170000);assert.equal(needsLocalTick(r,1169999),false);
 r=localCommand(r,'move',{x:0,y:0},1170000);assert.equal(r.status,'finished');assert.equal(r.cells.length,0);assert.equal(r.finalResult.kind,'time-limit');assert.equal(r.finalResult.target,180);
});
test('Completed result is deduplicated, retained after deleting the board and grouped by objective and settings',()=>{
 let r=game({matchGoal:{type:'moves',target:33}});r.players[0].placements=32;r=localCommand(r,'move',{x:0,y:0},2000);
 const storage=memory();saveLocalGame(storage,r);saveLocalGame(storage,r);assert.equal(loadTerritoryResults(storage,loadLocalGames(storage)).length,1);
 deleteLocalGame(storage,r.id);assert.equal(loadLocalGames(storage).length,0);const [result]=loadTerritoryResults(storage);assert.equal(result.players[0].placements,33);
 assert.notEqual(territoryComparisonKey(result),territoryComparisonKey({...result,target:333}));assert.notEqual(territoryComparisonKey(result),territoryComparisonKey({...result,machineInventory:true}));
 assert.match(achievementsMarkup([result]),/Movimientos · 33/);assert.doesNotMatch(achievementsMarkup([result]),/undefined/);
 const options=matchGoalsMarkup('time',33);assert.match(options,/Relámpago · 33 segundos/);assert.match(options,/6 minutos/);assert.match(options,/9 minutos/);assert.doesNotMatch(options,/5 minutos|10 minutos/);
});
test('33 seconds and 3/6/9 minutes expire before an overdue action in both local modes and preserve pause time',()=>{
 for(const mode of ['solo','local'])for(const timeMode of ['timed','untimed'])for(const target of MATCH_TIME_TARGETS){
  let r=createLocal(mode,'A','B',1000,'normal',timeMode,'medium','X',false,{faunaEnabled:false,territoryEnabled:false,matchGoal:{type:'time',target}});
  assert.equal(Date.parse(r.endsAt),1000+target*1000);
  r=localCommand(r,'pause',{},11000);assert.equal(r.matchRemainingMs,target*1000-10000);
  r=localCommand(r,'resume',{},1000000);const end=1000000+target*1000-10000;assert.equal(Date.parse(r.endsAt),end);
  r=localCommand(r,'move',{x:0,y:0},end);assert.equal(r.status,'finished');assert.equal(r.cells.length,0);assert.equal(r.finalResult.target,target);assert.equal(r.finalResult.kind,'time-limit');
 }
});
test('Saved five and ten minute games retain their duration when loaded and resumed',()=>{
 for(const target of [300,600]){
  const r=game({matchGoal:{type:'time',target:180}});r.matchGoal.target=target;r.endsAt=new Date(1000+target*1000).toISOString();
  const paused=localCommand(r,'pause',{},11000),storage=memory();saveLocalGame(storage,paused);
  const [saved]=loadLocalGames(storage);assert.equal(saved.matchGoal.target,target);
  const resumed=localCommand(saved,'resume',{},1000000);assert.equal(Date.parse(resumed.endsAt),1000000+target*1000-10000);
 }
});
