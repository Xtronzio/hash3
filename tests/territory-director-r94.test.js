import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,reconcileLocalBoard} from '../src/local.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {rapidMatch} from '../src/turn-clock.js';
import {considerTerritory,advanceEcologyTurn} from '../src/inhabitants.js';
import {directedTerritory,territoryPressure,territoryCandidates,canTerritoryCombine,territoryAwaitingExpansion,markTerritoryGrowth,validTerritoryDirector} from '../src/territory-director.js';
import {announceDirectedTerritory,recordTerritoryPlacement} from '../src/territory-tools.js';
import {ecologyCardStatus} from '../src/ecology-navigation.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
const NOW=1800000000000,random=()=>.4;
const fresh=(options={})=>createLocal('local','Jorge','Rival',NOW,'normal','untimed','medium','X',true,{random,...options});
const cell=(p,i)=>({...p,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'});
function board(options={},n=297){const g=fresh(options);g.terrain=Array.from({length:n},(_,i)=>({x:i%33,y:Math.floor(i/33)}));g.cells=g.terrain.slice(0,Math.floor(n*.65)).map(cell);markTerritoryGrowth(g);return g;}
const command=(g,a,p={},now=NOW)=>localCommand(g,a,p,now,random);
const move=g=>command(g,'move',availableCells(g,g.pairs[0])[0]);
test('Rapid matches force three-second turns even when untimed was requested; other goals retain 33 or no clock',()=>{
 const r=fresh({matchGoal:{type:'time',target:33}});assert.ok(rapidMatch(r));assert.equal(r.timeMode,'timed');assert.equal(r.turnSeconds,3);assert.equal(Date.parse(r.pairs[0].deadline)-NOW,3000);assert.equal(Date.parse(r.endsAt)-NOW,33000);
 const n=command(r,'tick',{},NOW+3000);assert.ok(n.lastEvent.automatic);assert.equal(n.cells.length,1);assert.equal(Date.parse(n.pairs[0].deadline),NOW+6000);
 const end=command(n,'tick',{},NOW+33000);assert.equal(end.status,'finished');assert.equal(end.finishReason,'time-limit');
 assert.equal(fresh({matchGoal:{type:'time',target:180}}).turnSeconds,null);
 const normal=createLocal('local','A','B',NOW);assert.equal(normal.turnSeconds,33);
});
test('Rapid pause and legacy adoption cap the remaining turn without extending a shorter deadline or replaying moves',()=>{
 const r=fresh({matchGoal:{type:'time',target:33}}),p=command(r,'pause',{},NOW+1000);assert.equal(p.pauseRemainingMs,2000);assert.equal(p.matchRemainingMs,32000);
 const n=command(p,'resume',{},NOW+999999);assert.equal(Date.parse(n.pairs[0].deadline),NOW+1001999);assert.equal(Date.parse(n.endsAt),NOW+1031999);
 const old=structuredClone(r);old.turnSeconds=33;old.timeMode='untimed';old.pairs[0].deadline=null;const before=structuredClone(old),adopted=reconcileLocalBoard(old,NOW+1000);assert.deepEqual(old,before);assert.equal(adopted.turnSeconds,3);assert.equal(Date.parse(adopted.pairs[0].deadline),NOW+4000);
 old.timeMode='timed';old.pairs[0].deadline=new Date(NOW+2000).toISOString();assert.equal(reconcileLocalBoard(old,NOW+1000).pairs[0].deadline,old.pairs[0].deadline);
});
test('The territory ignores old due counters and makes contextual decisions without elapsed time or a fixed turn interval',()=>{
 const g=board({fauna:['rodent'],phenomena:[]});g.territoryNextPlacement=0;g.territoryNextInvasion=0;g.habitatZones.forEach(z=>Object.keys(z.next).forEach(k=>z.next[k]=0));assert.equal(recordTerritoryPlacement(g,NOW,random),false);
 assert.equal(considerTerritory(g,NOW,random),true);assert.equal(g.rodentRaids.length,1);assert.equal(g.rodentRaids[0].warningTurns,3);assert.equal(g.ecologyTurns,0);
 const snapshot=structuredClone(g);assert.equal(considerTerritory(g,NOW+9999999,random),false);assert.deepEqual(g,snapshot);
 assert.equal(ecologyCardStatus(g,'rhino','local-x').state,'disabled');
 const empty=fresh();empty.territoryNextPlacement=0;assert.equal(considerTerritory(empty,NOW,random),false);
});
test('An unchanged elapsed clock or camera read never creates territory decisions',()=>{
 const g=board(),before=structuredClone(g.territoryDirector);assert.equal(command(g,'tick',{},NOW+9999999),g);assert.deepEqual(g.territoryDirector,before);
 const copy=structuredClone(g);ecologyCardStatus(g,'ufo','local-x');assert.deepEqual(g,copy);assert.equal(ecologyCardStatus(g,'ufo','local-x').badge,'…');
});
test('Small fauna and a large phenomenon coexist and advance together; large fauna rejects a second large phenomenon',()=>{
 const g=board({fauna:['rodent'],phenomena:['tornado']});assert.ok(considerTerritory(g,NOW,random));assert.equal(g.rodentRaids.length,1);
 assert.ok(announceDirectedTerritory(g,{kind:'tornado',tier:'large'},NOW,random));assert.deepEqual(territoryPressure(g),{fauna:['small'],weather:['large']});
 advanceEcologyTurn(g,NOW,random);assert.equal(g.rodentRaids[0].warningTurns,2);assert.equal(g.territoryEvents[0].turnsRemaining,2);
 const big=board({fauna:['anaconda'],phenomena:['tornado','clouds']});assert.ok(considerTerritory(big,NOW,random));
 // An explicit existing large animal is also recognised after old saves load.
 big.anacondas=[{id:'snake',kind:'anaconda',x:0,y:0,route:[{x:0,y:0}],body:[],cursor:0,warningTurns:3}];big.territoryEvents=[];
 assert.equal(canTerritoryCombine(big,'weather','large'),false);assert.equal(announceDirectedTerritory(big,{kind:'tornado',tier:'large'},NOW,random),false);
 assert.equal(announceDirectedTerritory(big,{kind:'clouds',tier:'small'},NOW,random),true);assert.deepEqual(territoryPressure(big),{fauna:['large'],weather:['small']});
});
test('The full-board growth phase preserves warnings and pieces until a legal expansion has completed',()=>{
 let g=board({},99);g.fauna=[];g.phenomena=[];g.cells=g.terrain.map(cell);g.territoryEvents=[{id:'saved-ufo',kind:'ufo',region:[{x:1,y:0},{x:2,y:0},{x:3,y:0}],turnsRemaining:1,announcedTurn:0}];
 const pieces=structuredClone(g.cells),region=structuredClone(g.territoryEvents[0].region);assert.equal(territoryAwaitingExpansion(g),true);advanceEcologyTurn(g,NOW,random);assert.equal(g.territoryEvents[0].turnsRemaining,1);assert.deepEqual(g.cells,pieces);
 g=reconcileLocalBoard(g,NOW);assert.equal(g.pairs[0].pending,1);const point=expansionOptions(g.terrain,g.pairs[0].active,g)[0];g=command(g,'expand',point);assert.ok(g.terrain.length>99);assert.deepEqual(g.cells,pieces);assert.deepEqual(g.territoryEvents[0].region,region);assert.equal(g.territoryEvents[0].turnsRemaining,1);
 g=move(g);assert.equal(g.territoryEvents.some(e=>e.id==='saved-ufo'),false);assert.equal(g.cells.length,pieces.length+1-3);
});
test('Decisions are neutral to points, difficulty and the human symbol, preserve disabled choices and have bounded state',()=>{
 const g=board(),other=structuredClone(g);other.players[0].score=999999;other.players[1].score=1;other.difficulty='pro';other.humanId='local-o';
 assert.deepEqual(territoryCandidates(g,random),territoryCandidates(other,random));assert.ok(validTerritoryDirector(g));
 const selected=board({fauna:['beaver'],phenomena:['clouds']});assert.ok(territoryCandidates(selected,random).every(c=>['beaver','clouds'].includes(c.kind)));assert.ok(JSON.stringify(selected.territoryDirector).length<2000);
});
test('Territory state and protected announcements survive pause, resume and transfer; forged state is rejected',()=>{
 const g=board({fauna:['rodent'],phenomena:[]});considerTerritory(g,NOW,random);const p=command(g,'pause'),d=structuredClone(p.territoryDirector);assert.deepEqual(command(p,'resume',{},NOW+999999).territoryDirector,d);
 const storage={getItem:k=>k==='hash3_locals'?JSON.stringify([p]):null,setItem(){}};const data=captureTransfer(storage,{now:NOW+1,id:'director'});validateTransfer(data);assert.deepEqual(data.games[0].territoryDirector,p.territoryDirector);
 const bad=structuredClone(data);bad.games[0].territoryDirector.recent=['invented'];assert.throws(()=>validateTransfer(bad));
});
test('Original ecology is isolated from Inverso and finished historical games',()=>{
 const old=fresh();old.status='finished';delete old.territoryDirector;const n=command(old,'finish');assert.equal(n.territoryDirector,undefined);
 const inverse=fresh({variant:'inverse'});assert.equal(directedTerritory(inverse),false);assert.equal(inverse.territoryDirector,undefined);
});
test('The rapid clock automatically completes mandatory expansion within the same three-second limit',()=>{
 let g=fresh({matchGoal:{type:'time',target:33}});g.cells=g.terrain.map(cell);g=reconcileLocalBoard(g,NOW);
 assert.equal(g.pairs[0].pending,1);const before=structuredClone(g.cells);g=command(g,'tick',{},NOW+3000);
 assert.ok(g.terrain.length>9);assert.deepEqual(g.cells,before);assert.equal(g.pairs[0].pending,0);assert.equal(Date.parse(g.pairs[0].deadline),NOW+6000);
});
test('Existing simultaneous warnings migrate intact and suppress additional pressure until they finish',()=>{
 const g=board();delete g.territoryDirector;g.faunaEvents=[{id:'rhino-old',kind:'rhino',paths:[[{x:1,y:0}]],region:[{x:1,y:0}],turnsRemaining:3}];g.territoryEvents=[{id:'tornado-old',kind:'tornado',region:[{x:3,y:0}],turnsRemaining:3}];
 const fauna=structuredClone(g.faunaEvents),weather=structuredClone(g.territoryEvents),p=command(g,'pause');assert.deepEqual(p.faunaEvents,fauna);assert.deepEqual(p.territoryEvents,weather);
 const resumed=command(p,'resume');assert.equal(considerTerritory(resumed,NOW,random),false);assert.deepEqual(resumed.faunaEvents,fauna);assert.deepEqual(resumed.territoryEvents,weather);
});
test('Territory status rendering uses snapshot fields without scanning board geometry',()=>{
 const g=board();for(const field of ['terrain','cells','frontiers'])Object.defineProperty(g,field,{get(){throw Error('Rendered policy scanned '+field);}});
 // The renderer receives its cached targets and events from the snapshot.
 assert.equal(ecologyCardStatus(g,'ufo','local-x',{targets:[],events:[]}).badge,'…');
});
