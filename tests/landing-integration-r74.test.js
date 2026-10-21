import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {applyPlannedEvent} from '../src/territory-event-actions.js';
import {scoreLandings} from '../src/landing-score.js';
import {figureWindows,key} from '../src/game.js';
const now=1700000000000;
function room(side=9){
 const r=createLocal('local','A','B',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});
 r.terrain=Array.from({length:side*side},(_,i)=>({x:i%side,y:Math.floor(i/side)}));r.pairs[0].active={x:0,y:0};r.cells=[];
 r.players.forEach(p=>{p.score=p.symbol==='X'?100:200;p.figures=0;p.inventory.cards={swap:1,shift:1,tornado:1};});
 return r;
}
function piece(x,y,symbol,id=`${x},${y}`){return {x,y,symbol,id,owner:symbol==='X'?'local-x':'local-o'};}
function noRepayment(r,before,affected){
 const scores=r.players.map(p=>p.score),stocks=r.players.map(p=>structuredClone(p.inventory));
 assert.deepEqual(scoreLandings(r,before,affected),[]);assert.deepEqual(r.players.map(p=>p.score),scores);assert.deepEqual(r.players.map(p=>p.inventory),stocks);
}
test('Black hole clears its core and pays new X/O halo figures once without passive inventory recharge',()=>{
 const r=room();delete r.territoryDirector;const core=Array.from({length:9},(_,i)=>({x:3+i%3,y:3+Math.floor(i/3)}));
 const event={id:'blackhole-r74',kind:'blackhole',region:core,groups:[core],turnsRemaining:0,announcedTurn:0};
 // Label pieces to build a fixed input whose final halo has exactly two trios.
 r.cells=r.terrain.map(c=>piece(c.x,c.y,'*'));const probe=structuredClone(r);applyPlannedEvent(probe,event,now);
 const destinations=new Map(probe.cells.map(c=>[c.id,c])),target=c=>c.y===0&&c.x<3?'X':c.y===8&&c.x>=6?'O':'*';
 r.cells=r.cells.map(c=>({...c,symbol:destinations.has(c.id)?target(destinations.get(c.id)):'*'}));
 assert.ok(r.cells.every(c=>!['X','O'].includes(c.symbol)||figureWindows(r.cells,c.x,c.y,c.symbol,r.level).length===0));
 r.territoryEvents=[event];const before=structuredClone(r.cells),inventory=r.players.map(p=>structuredClone(p.inventory));
 const affected=advanceTerritory(r,now);assert.deepEqual(r.players.map(p=>p.score),[103,203]);assert.deepEqual(r.players.map(p=>p.figures),[1,1]);
 assert.equal(r.cells.length,72);assert.ok(core.every(c=>!r.cells.some(p=>key(p.x,p.y)===key(c.x,c.y))));assert.equal(r.terrain.length,81);
 assert.deepEqual(r.landingEvent.scores.map(s=>[s.symbol,s.points]),[['X',3],['O',3]]);assert.deepEqual(r.players.map(p=>p.inventory),inventory);
 noRepayment(r,before,affected);const restored=JSON.parse(JSON.stringify(r));assert.deepEqual(advanceTerritory(restored,now+1),[]);assert.deepEqual(restored.players.map(p=>p.score),[103,203]);
});
test('Swap pays simultaneous new figures for both signs and preserves the turn and historical points',()=>{
 const r=room(5);r.cells=[piece(0,0,'X'),piece(1,0,'X'),piece(2,0,'O'),piece(0,2,'O'),piece(1,2,'O'),piece(2,2,'X')];
 const next=localCommand(r,'inventory',{tool:'swap',playerId:'local-x',x:2,y:0,toX:2,toY:2},now);
 assert.deepEqual(next.players.map(p=>p.score),[103,203]);assert.equal(next.pairs[0].turn,'X');assert.equal(next.players[0].inventory.cards.swap,0);assert.equal(next.players[1].inventory.cards.swap,1);
 noRepayment(next,r.cells,next.lastEvent.cells);
});
test('Shift pays the rival on landing and reports that payout once, without completing a turn',()=>{
 const r=room(5);r.cells=[piece(0,0,'O'),piece(1,0,'O'),piece(4,3,'O')];
 const next=localCommand(r,'inventory',{tool:'shift',playerId:'local-x',x:4,y:3,toX:2,toY:0},now);
 assert.deepEqual(next.players.map(p=>p.score),[100,203]);assert.equal(next.landingEvent.kind,'shift');assert.equal(next.landingEvent.scores[0].player,'local-o');
 assert.equal(next.pairs[0].turn,'X');assert.equal(next.players[0].inventory.cards.shift,0);assert.equal(next.players[0].inventory.draws||0,0);
 noRepayment(next,r.cells,next.lastEvent.cells);
});
test('Shift does not repay an existing unpaid figure sharing the landing wildcard',()=>{
 const r=room(5);r.cells=[piece(0,0,'O'),piece(1,0,'O'),piece(2,0,'#'),piece(4,3,'O')];
 const next=localCommand(r,'inventory',{tool:'shift',playerId:'local-x',x:4,y:3,toX:3,toY:0},now);
 // The new four-cell line pays four; the old trio is not paid again.
 assert.deepEqual(next.players.map(p=>p.score),[100,204]);assert.equal(next.players[1].figures,1);
});
test('Manual Tornado pays new X/O trios at the final positions once',()=>{
 const r=room(5);r.cells=[piece(0,0,'O'),piece(1,0,'X'),piece(2,0,'X'),piece(0,1,'X'),piece(1,1,'*'),piece(2,1,'*'),piece(0,2,'*'),piece(1,2,'O'),piece(2,2,'O')];
 const next=localCommand(r,'inventory',{tool:'tornado',playerId:'local-x',x:0,y:0},now,()=>0);
 assert.deepEqual(next.players.map(p=>p.score),[103,203]);assert.equal(next.players[0].inventory.cards.tornado,0);assert.equal(next.pairs[0].turn,'X');
 noRepayment(next,r.cells,next.lastEvent.affected);
});
