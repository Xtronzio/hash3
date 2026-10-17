import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {advanceInverseContour,planInverseContour,inverseContourBudget,inverseContourInterval,validInverseContour,contourThreatensClaim} from '../src/inverse-contour.js';
import {inverseFocusGroups} from '../src/inverse-focus.js';
import {inverseClaimsAt,advanceInverseWild} from '../src/inverse-claims.js';
import {chooseInverseAction} from '../src/inverse-ai.js';
import {availableCells} from '../src/game.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
import {territoryComparisonKey} from '../src/achievements.js';
const now=1800000000000;
const board=(n=81)=>({id:'test',name:'Prueba',terrain:Array.from({length:n},(_,i)=>({x:i%9,y:Math.floor(i/9)}))});
const fresh=()=>createLocal('local','A','B',now,'normal','untimed','pro','X',false,{variant:'inverse',board:board(),random:()=>.99,initialCards:['double','shift','erase'],secondInitialCards:['double','shift','erase']});
const command=(g,a,p={})=>localCommand(g,a,p,now,()=>.99);
const move=g=>command(g,'move',availableCells(g,g.pairs[0])[0]);
const line=()=>{const g=fresh();g.cells=[0,1,2].map(x=>({x,y:0,id:'x'+x,symbol:'X',owner:'local-x'}));g.inverseFill=['0,0','1,0','2,0','7,8','8,8','8,7'];Object.assign(g.inverseContour,{turns:32,next:33,targets:['0,0','1,0','2,0']});return g;};
test('Contour announces after 30 turns, impacts after 33, preserves pieces, scores, terrain and inventory',()=>{
 let g=fresh();for(let i=0;i<30;i++)g=move(g);assert.equal(g.inverseContour.turns,30);assert.equal(g.inverseContour.targets.length,3);const targets=[...g.inverseContour.targets];
 for(let i=0;i<2;i++)g=move(g);const before=structuredClone(g);g=move(g);
 assert.equal(g.inverseContour.turns,33);assert.equal(g.inverseContour.lost,3);assert.deepEqual(new Set(g.inverseContourEvent.cleared),new Set(targets));assert.equal(g.inverseFill.length,before.inverseFill.length-3);assert.equal(g.cells.length,before.cells.length+1);assert.deepEqual(g.terrain,before.terrain);assert.deepEqual(g.players.map(p=>[p.score,p.inventory.cards]),before.players.map(p=>[p.score,p.inventory.cards]));assert.equal(validInverseContour(g),true);
});
test('A timely claim saves threatened points; erosion leaves that figure playable but worth zero',()=>{
 const g=line(),f=inverseClaimsAt(g,'local-x',{x:0,y:0})[0];assert.equal(f.pointsValue,3);assert.equal(contourThreatensClaim(g,f),true);
 const paid=command(g,'claim',{x:0,y:0,figureId:f.id});assert.equal(paid.players[0].score,3);assert.equal(paid.inverseContour.lost,0);assert.equal(paid.inverseFill.length,3);
 const eroded=structuredClone(g),pieces=structuredClone(g.cells);advanceInverseContour(eroded);assert.deepEqual(eroded.cells,pieces);assert.equal(eroded.players[0].score,0);assert.equal(inverseClaimsAt(eroded,'local-x',{x:0,y:0})[0].pointsValue,0);assert.equal(eroded.status,'playing');
});
test('Pressure scales in threes, caps at 33 and preserves the last three without finishing',()=>{
 const g=fresh();for(const [n,want]of [[3,0],[5,0],[6,3],[333,3],[334,6],[3333,33],[33333,33]]){g.inverseFill=Array.from({length:n},(_,i)=>`${i},0`);assert.equal(inverseContourBudget(g),want);assert.ok(want/inverseContourInterval(g)<=1/3);}
 const a=line();a.inverseFill=['0,0','1,0','7,8','8,8'];advanceInverseContour(a);assert.equal(a.inverseFill.length,3);assert.equal(a.status,'playing');
});
test('The announced cells are not replaced after a claim and a bee impact defers only the deadline',()=>{
 const g=line();advanceInverseContour(g,{beeImpact:true});assert.equal(g.inverseContour.next,34);assert.equal(g.inverseFill.length,6);assert.deepEqual(g.inverseContour.targets,['0,0','1,0','2,0']);
 g.inverseFill=g.inverseFill.filter(k=>k!=='0,0');advanceInverseContour(g);assert.equal(g.inverseContourEvent.cleared.length,2);assert.equal(g.inverseFill.length,3);assert.equal(g.inverseContour.next,67);
});
test('Target strategy is deterministic and symmetric between X/O, and favours exposed occupied regions',()=>{
 const g=fresh();g.cells=[0,1,2].map(x=>({x,y:0,id:'c'+x,symbol:'X',owner:'local-x'}));const targets=planInverseContour(g),other=structuredClone(g);for(const c of other.cells){c.symbol='O';c.owner='local-o';}
 assert.deepEqual(planInverseContour(other),targets);assert.ok(targets.some(k=>['0,0','1,0','2,0'].includes(k)));assert.equal(new Set(targets).size,3);
});
test('Double advances once; cards, pause, elapsed time and restore never replay pressure',()=>{
 let g=fresh();g=command(g,'inventory',{tool:'double',playerId:'local-x'});assert.equal(g.inverseContour.turns,0);g=move(g);assert.equal(g.inverseContour.turns,0);g=move(g);assert.equal(g.inverseContour.turns,1);
 const paused=command(g,'pause'),state=structuredClone(paused.inverseContour);assert.deepEqual(command(paused,'tick').inverseContour,state);assert.deepEqual(command(paused,'resume').inverseContour,state);
 const old=fresh();delete old.inverseContour;const resumed=command(command(old,'pause'),'resume');assert.equal(resumed.inverseContour.turns,0);assert.equal(resumed.inverseContour.next,33);
});
test('Wildcards only land on pending free fill and leave a legal placement elsewhere',()=>{
 const g=fresh();g.inverseMoves=8;g.inverseFill=['8,8'];advanceInverseWild(g,()=>0);assert.equal(g.cells[0].symbol,'#');assert.equal(`${g.cells[0].x},${g.cells[0].y}`,'8,8');assert.ok(availableCells(g,g.pairs[0]).length>0);
 g.inverseMoves=17;advanceInverseWild(g,()=>0);assert.equal(g.cells.length,1);
});
test('Large sparse focus covers every pending cell once in bounded patches, including negative coordinates',()=>{
 const fill=Array.from({length:33333},(_,i)=>`${i%183-90},${Math.floor(i/183)-90}`),g={inverseFill:fill};for(const tile of [3,9]){const groups=inverseFocusGroups(g,tile),seen=groups.flat().map(p=>`${p.x},${p.y}`);assert.equal(seen.length,fill.length);assert.equal(new Set(seen).size,fill.length);for(const ps of groups){assert.ok(ps.length<=33);assert.ok(Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x))<tile);assert.ok(Math.max(...ps.map(p=>p.y))-Math.min(...ps.map(p=>p.y))<tile);}}
});
test('Transfer validates pressure, keeps its pending warning and distinguishes new results',()=>{
 const g=command(line(),'pause'),values=new Map([['hash3_locals',JSON.stringify([g])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const transfer=captureTransfer(storage,{now});assert.deepEqual(validateTransfer(transfer).games[0].inverseContour,g.inverseContour);
 const broken=structuredClone(transfer);broken.games[0].inverseContour.targets.push('9999,9999');assert.throws(()=>validateTransfer(broken));const bad=structuredClone(g);bad.inverseContour.next=bad.inverseContour.turns;assert.equal(validInverseContour(bad),false);
 assert.notEqual(territoryComparisonKey({}),territoryComparisonKey({inverseContourVersion:1}));
});
test('PRO uses the same published threat and claims before the final warning expires',()=>{
 const g=line(),choice=chooseInverseAction(g,()=>.5,{maxTimeMs:100,maxNodes:100});assert.equal(choice.action,'claim');assert.equal(command(g,choice.action,choice.payload).players[0].score,3);
});
