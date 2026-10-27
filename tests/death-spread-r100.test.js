import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {deathRegion} from '../src/brief-ecology.js';
import {announceDirectedTerritory} from '../src/territory-tools.js';
import {advanceEcologyTurn} from '../src/inhabitants.js';
import {markTerritoryGrowth} from '../src/territory-director.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {loadLocalGames} from '../src/sessions.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
const near=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;
function board(size=289){
 const g=createLocal('local','Jorge','Rival',NOW,'normal','untimed','medium','X',false,{faunaEnabled:false,phenomena:['death'],random:()=>.5});
 const side=size===33333?333:17;g.terrain=Array.from({length:size},(_,i)=>({x:i%side,y:Math.floor(i/side)}));
 g.cells=g.terrain.slice(0,Math.floor(size*.5)).map((p,i)=>({...p,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
 g.players[0].score=1234;g.players[1].score=567;markTerritoryGrowth(g);return g;
}
test('Successive skulls stay separated on sides and diagonals, even with a constant random source',()=>{
 const g=board();
 for(let i=0;i<12;i++){
  const before=structuredClone(g),region=deathRegion(g,()=>0);assert.equal(region.length,1);assert.deepEqual(g,before,'Planning is read-only');
  assert.ok(g.deadCells.every(c=>!near(c,region[0])));g.deadCells.push(region[0]);
 }
 assert.equal(g.deadCells.length,12);
 const first=deathRegion(board(),()=>0)[0],last=deathRegion(board(),()=>.999999)[0];assert.notDeepEqual(first,last);assert.ok(last.y>first.y+3,'The draw can reach beyond the old nine-cell interior prefix');
});
test('Permanent clusters and committed warnings reserve their eight neighbours without moving them',()=>{
 const g=board();g.deadCells=[{x:4,y:4},{x:5,y:4},{x:4,y:5},{x:5,y:5},{x:4,y:6}];
 g.cells=g.cells.filter(p=>!g.deadCells.some(c=>c.x===p.x&&c.y===p.y));g.territoryEvents=[{id:'pending',kind:'death',region:[{x:8,y:8}],turnsRemaining:2}];
 const before=structuredClone(g);
 for(const value of [0,.1,.3,.5,.7,.999999]){const [c]=deathRegion(g,()=>value);assert.ok(c);assert.ok([...g.deadCells,...g.territoryEvents[0].region].every(p=>!near(c,p)));}
 assert.deepEqual(g,before);
});
test('No separated safe site skips death, and the last legal move is never consumed',()=>{
 const g=board(9);g.terrain=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));g.deadCells=[{x:1,y:1}];g.cells=[];assert.deepEqual(deathRegion(g,()=>0),[]);
 g.deadCells=[];g.cells=g.terrain.filter(p=>p.x!==2||p.y!==2).map((p,i)=>({...p,id:String(i),symbol:'X',owner:'local-x'}));
 const region=deathRegion(g,()=>.999999);assert.equal(region.length,1);assert.notDeepEqual(region[0],{x:2,y:2});
 const probe={...g,deadCells:region};assert.ok(availableCells(probe,probe.pairs[0]).length);assert.ok(expansionOptions(probe.terrain,probe.pairs[0].active,probe).length);
});
test('A real directed warning retains its separated target for three turns and keeps previous scores and skulls',()=>{
 const g=board();g.deadCells=[{x:4,y:4},{x:5,y:4},{x:4,y:5},{x:5,y:5},{x:4,y:6}];g.cells=g.cells.filter(p=>!g.deadCells.some(c=>c.x===p.x&&c.y===p.y));
 const before=structuredClone(g);assert.ok(announceDirectedTerritory(g,{kind:'death',tier:'small'},NOW,()=>.8));const event=structuredClone(g.territoryEvents[0]);assert.equal(event.region.length,1);assert.equal(event.turnsRemaining,3);assert.ok(g.deadCells.every(c=>!near(c,event.region[0])));
 for(let i=0;i<2;i++){advanceEcologyTurn(g,NOW+i,()=>.5);assert.deepEqual(g.deadCells,before.deadCells);assert.deepEqual(g.territoryEvents[0].region,event.region);assert.equal(g.territoryEvents[0].turnsRemaining,2-i);}
 advanceEcologyTurn(g,NOW+2,()=>.5);assert.deepEqual(g.deadCells,[...before.deadCells,...event.region]);assert.equal(g.territoryEvents.length,0);assert.deepEqual(g.terrain,before.terrain);assert.deepEqual(g.players,before.players);
 assert.deepEqual(g.cells,before.cells.filter(p=>!event.region.some(c=>c.x===p.x&&c.y===p.y)));
 const storage={getItem:k=>k==='hash3_locals'?JSON.stringify([g]):null,setItem(){}};
 const transferred=validateTransfer(captureTransfer(storage,{now:NOW+3}));assert.deepEqual(transferred.games[0].deadCells,g.deadCells);
});
test('Loading adopts rule30 while keeping old clustered skulls, warnings, inventory and finished history',()=>{
 const g=board();g.ruleVersion=29;g.status='paused';g.deadCells=[{x:4,y:4},{x:5,y:4}];g.territoryEvents=[{id:'old-warning',kind:'death',region:[{x:4,y:5}],turnsRemaining:2}];g.cells=g.cells.filter(p=>!g.deadCells.some(c=>c.x===p.x&&c.y===p.y));
 const done=structuredClone(g);done.id='finished';done.status='finished';const before=structuredClone(g),data=new Map([['hash3_locals',JSON.stringify([g,done])]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const games=loadLocalGames(storage,NOW),loaded=games.find(x=>x.id===g.id);assert.equal(loaded.ruleVersion,32);assert.deepEqual(loaded.deadCells,before.deadCells);assert.deepEqual(loaded.territoryEvents,before.territoryEvents);assert.deepEqual(loaded.players,before.players);assert.deepEqual(games.find(x=>x.id==='finished'),done);
});
test('The large-board draw stays bounded and avoids skulls, anchors, shields, walls and habitat reservations',()=>{
 const g=board(33333);g.deadCells=[{x:1,y:0},{x:2,y:0}];g.frontiers=[{id:'wall',cells:[{x:4,y:0}],by:'local-x'}];g.works=[{done:0,build:[{x:5,y:0}],destroy:[]}];g.worms=[{body:[{x:6,y:0}]}];g.anacondas=[{body:[{x:7,y:0}]}];g.inventoryEffects.shields=[{cell:'piece:8',remaining:3,by:'local-x'}];
 let draws=0;const before=structuredClone(g),[c]=deathRegion(g,()=>{draws++;return 0;});assert.ok(c);assert.ok(draws<=33);assert.ok(g.deadCells.every(p=>!near(c,p)));assert.ok(![0,4,5,6,7,8].some(x=>c.x===x&&c.y===0));assert.deepEqual(g,before);
});
