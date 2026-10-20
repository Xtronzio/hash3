import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {inverseClaimsAt,canClaimInverse} from '../src/inverse-claims.js';
import {prisonState,prisonRemaining,isPrisoner,completePrisonTurn,initializeInversePrison,validInversePrison} from '../src/inverse-prison.js';
import {advanceInverseDisorder,validInverseDisorder} from '../src/inverse-disorder.js';
import {availableCells} from '../src/game.js';import {toolCells,canUsePracticeTool} from '../src/practice-tools.js';
import {tornadoSlots,bombBlast} from '../src/area-tools.js';import {advanceInverseContour,planInverseContour} from '../src/inverse-contour.js';
import {inverseBeeClocks,inverseBeeNotices} from '../src/inverse-bee-ui.js';
import {captureTransfer,encodeTransfer,decodeTransfer,validateTransfer} from '../src/local-transfer.js';
import {territoryComparisonKey} from '../src/achievements.js';import {savedMapModel,inspectionCells} from '../src/saved-map.js';
const NOW=1800000000000;
const fresh=(options={})=>createLocal('local','A','B',NOW,'normal','untimed','pro','X',true,{variant:'inverse',board:{id:'test',name:'Test',terrain:Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}))},random:()=>.5,...options});
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='#'?null:symbol==='X'?'local-x':'local-o'});
const state=(g,s='X')=>prisonState(g,s),command=(g,a,p={},now=NOW)=>localCommand(g,a,p,now,()=>.41);
const move=g=>command(g,'move',availableCells(g,g.pairs[0])[0]);
const line=g=>{g.cells=[tile(0,0),tile(1,0),tile(2,0)];return g;};
const due=g=>{Object.assign(state(g),{turns:8,since:8,limit:9});return g;};
const claim=g=>{const f=inverseClaimsAt(g,'local-x',{x:0,y:0})[0];return command(g,'claim',{x:0,y:0,figureId:f.id});};
test('Prison deadlines draw every integer 3..33 independently and show both public clocks',()=>{
 for(let n=3;n<=33;n++){const g=fresh({random:()=>(n-3+.1)/31});assert.equal(prisonRemaining(g,'X'),n);assert.equal(prisonRemaining(g,'O'),n);assert.equal(validInversePrison(g),true);}
 const g=fresh();state(g).limit=33;state(g,'O').limit=10;const before=JSON.stringify(g),ui=inverseBeeClocks(g,'local-o');assert.match(ui,/Cárcel/);assert.match(ui,/data-inverse-bee-count>33/);assert.match(ui,/data-inverse-bee-count>10/);assert.equal(JSON.stringify(g),before);
});
test('No sentence without a declined payable opportunity, including a figure first completed at the deadline',()=>{
 let g=due(fresh());g.cells=[tile(0,0),tile(1,0)];g=command(g,'move',{x:2,y:0});assert.equal(state(g).since,9);assert.equal(state(g).remaining,0);assert.equal(state(g).opportunity,false);
 g=move(g);g=command(g,'move',{x:8,y:8});assert.equal(state(g).remaining,3);assert.equal(state(g).opportunity,true);
});
test('A payable claim resets only its owner and preserves previously banked points',()=>{
 const g=due(line(fresh()));g.players[0].score=99;const rival=structuredClone(state(g,'O')),n=claim(g);assert.equal(n.players[0].score,102);assert.equal(state(n).since,0);assert.equal(state(n).remaining,0);assert.deepEqual(state(n,'O'),rival);assert.equal(n.inverseBeeEvent,undefined);
});
test('Zero-point claims do not reset an already established missed opportunity',()=>{
 const g=due(line(fresh()));g.inverseFill=['8,8'];state(g).opportunity=true;const n=claim(g);assert.equal(n.lastEvent.points,0);assert.equal(state(n).remaining,3);assert.equal(n.players[0].score,0);assert.deepEqual(n.inverseFill,['8,8']);
});
test('A sentence freezes pieces without relocation and lets the rival complete three turns before release',()=>{
 const g=due(line(fresh())),before=structuredClone(g),n=command(g,'move',{x:8,y:8});assert.equal(state(n).remaining,3);assert.equal(n.pairs[0].turn,'O');for(const c of g.cells)assert.deepEqual(n.cells.find(p=>p.id===c.id),c);assert.deepEqual(n.inverseFill,g.inverseFill);assert.deepEqual(g,before);
 let h=n;for(const count of [2,1,0]){const turns=h.inverseContour.turns;h=move(h);assert.equal(h.inverseContour.turns,turns+1);assert.equal(state(h).remaining,count);assert.equal(h.pairs[0].turn,count?'O':'X');}
 assert.equal(state(h).since,0);assert.equal(state(h).opportunity,false);assert.equal(state(h).turns,9);assert.equal(h.players[0].inventory.completedTurns,n.players[0].inventory.completedTurns);
});
test('Mutual sentences compensate their common remainder without synthetic contour turns or board edits',()=>{
 for(const left of [1,2,3]){const g=due(fresh());state(g).opportunity=true;state(g,'O').remaining=left;const before=structuredClone(g),turns=g.inverseContour.turns;completePrisonTurn(g,'local-x',0,()=>.5);
 assert.equal(state(g,'O').remaining,0);assert.equal(state(g).remaining,3-Math.max(0,left-1));assert.equal(g.inverseContour.turns,turns);assert.deepEqual(g.cells,before.cells);assert.deepEqual(g.players,before.players);assert.equal(validInversePrison(g),true);}
});
test('Jailed signs are ineligible for every positional tool, forced symbol, claim and destructive area',()=>{
 const g=line(fresh());state(g).remaining=3;g.pairs[0].turn='O';g.cells.push(tile(3,0,'O'),tile(4,0,'O'));for(const t of ['erase','opposite','shift','swap'])assert.ok(toolCells(g,'local-o',t).every(c=>c.symbol!=='X'));
 assert.ok(tornadoSlots(g,{x:0,y:0}).every(c=>!g.cells.some(p=>p.symbol==='X'&&p.x===c.x&&p.y===c.y)));assert.deepEqual(bombBlast(g,{x:0,y:0},()=>0),[]);assert.equal(canClaimInverse(g,'local-x'),false);assert.equal(canUsePracticeTool(g,'local-x','double'),false);assert.equal(canUsePracticeTool(g,'local-o','rival'),false);
 Object.assign(g.inverseContour,{turns:32,next:33,targets:['0,0','1,0','2,0']});assert.ok(planInverseContour(g).every(k=>!['0,0','1,0','2,0'].includes(k)));advanceInverseContour(g);assert.equal(g.inverseContour.lost,0);assert.equal(inspectionCells(savedMapModel(g,g.players[0])).includes('map-prison-bars'),true);
});
test('Doble counts once, while inventory, pause, reads and elapsed time do not age clocks',()=>{
 const g=due(line(fresh()));g.players[0].inventory.cards.double=1;let n=command(g,'inventory',{tool:'double',playerId:'local-x'});assert.equal(state(n).since,8);n=move(n);assert.equal(state(n).since,8);n=move(n);assert.equal(state(n).remaining,3);assert.equal(n.inverseContour.turns,1);
 const p=command(n,'pause'),before=structuredClone(p.inversePrison);assert.equal(command(p,'tick',{},NOW+999999),p);n=command(p,'resume',{},NOW+999999);assert.deepEqual(n.inversePrison,before);assert.match(inverseBeeNotices(p,{paused:true}),/Pausa: cuenta detenida/);
});
test('Legacy bee clocks migrate on accepted action without historical misconduct, movement or changed points',()=>{
 const g=fresh();delete g.inversePrison;g.inverseBees={version:2,players:{X:{turns:40,since:8,limit:9,cycles:3},O:{turns:20,since:4,limit:15,cycles:2}}};g.players[0].score=333;g.cells=[tile(0,0)];const raw=JSON.stringify(g);assert.equal(command(g,'tick'),g);assert.equal(JSON.stringify(g),raw);const n=command(g,'pause');assert.equal(state(n).since,8);assert.equal(state(n).remaining,0);assert.equal(state(n).opportunity,false);assert.equal(n.inverseBees,undefined);assert.deepEqual(n.cells,g.cells);assert.equal(n.players[0].score,333);
 const end={...g,status:'finished'};const before=JSON.stringify(end);initializeInversePrison(end);assert.equal(JSON.stringify(end),before);
});
test('High/PRO and the timed automatic move cash before an imminent sentence',()=>{
 for(const difficulty of ['high','pro']){const g=due(line(fresh()));g.difficulty=difficulty;const c=machineChoice(g,()=>.4,{cards:false,maxTimeMs:30});assert.equal(c.action,'claim');assert.equal(state(command(g,c.action,c.payload)).remaining,0);}
 const g=due(line(fresh()));g.timeMode='timed';g.pairs[0].deadline=new Date(NOW-1).toISOString();assert.equal(command(g,'tick').lastEvent.kind,'claim');
});
test('Disorder advertises its exact zone three turns ahead and mixes identities without fill, stock or score changes',()=>{
 const g=line(fresh());g.cells.push(tile(0,2,'O'),tile(1,2,'O'),tile(2,2,'#'));g.inverseContour.turns=63;advanceInverseDisorder(g,()=>.4);assert.ok(g.inverseDisorder.targets.length<=33);assert.ok(g.inverseDisorder.targets.length>3);const before=structuredClone(g);
 for(const n of [64,65,66]){g.inverseContour.turns=n;advanceInverseDisorder(g,()=>.4);}assert.ok(g.inverseDisorderEvent.moved>0);assert.deepEqual(g.inverseFill,before.inverseFill);assert.deepEqual(g.players,before.players);assert.deepEqual(g.terrain,before.terrain);assert.deepEqual(g.cells.map(c=>[c.id,c.symbol,c.owner]),before.cells.map(c=>[c.id,c.symbol,c.owner]));assert.equal(new Set(g.cells.map(c=>c.x+','+c.y)).size,g.cells.length);assert.equal(validInverseDisorder(g),true);
});
test('A newly jailed piece is excluded even if disorder had already announced its cell',()=>{
 const g=line(fresh());g.inverseDisorder.targets=['0,0','1,0','2,0','3,0'];g.inverseContour.turns=66;state(g).remaining=3;const pieces=structuredClone(g.cells);advanceInverseDisorder(g,()=>0);assert.deepEqual(g.cells,pieces);assert.equal(g.inverseDisorderEvent,undefined);
});
test('Transfer round trips prison/disorder and rejects forged counts, foreign cells and events',async()=>{
 const n=command(command(due(line(fresh())),'move',{x:8,y:8}),'pause'),values=new Map([['hash3_locals',JSON.stringify([n])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},data=captureTransfer(storage,{now:NOW});const decoded=await decodeTransfer(await encodeTransfer(data));assert.deepEqual(decoded.data.games[0].inversePrison,n.inversePrison);assert.deepEqual(decoded.data.games[0].inverseDisorder,n.inverseDisorder);
 for(const modify of [r=>state(r).remaining=4,r=>state(r).limit=34,r=>state(r).opportunity='yes',r=>r.inverseDisorder.targets.push('9999,9999'),r=>r.inverseDisorder.next=r.inverseContour.turns]){const bad=structuredClone(data);modify(bad.games[0]);assert.throws(()=>validateTransfer(bad));}
});
test('Completed prison/disorder results compare separately from bee-era results',()=>{
 const g=line(fresh());g.inverseFill=['0,0'];const n=claim(g);assert.equal(n.status,'finished');assert.equal(n.finalResult.inversePrisonVersion,1);assert.equal(n.finalResult.inverseDisorderVersion,1);assert.equal(n.finalResult.inverseBeeVersion,undefined);assert.notEqual(territoryComparisonKey(n.finalResult),territoryComparisonKey({...n.finalResult,inversePrisonVersion:undefined,inverseDisorderVersion:undefined,inverseBeeVersion:2}));
});
test('Maximum drawings preserve compact prison state and a bounded 33-cell disorder region',()=>{
 const g=fresh();g.terrain=Array.from({length:33333},(_,i)=>({x:i%183-91,y:Math.floor(i/183)-91}));g.inverseFill=g.terrain.map(c=>c.x+','+c.y);g.cells=g.terrain.slice(0,333).map(c=>tile(c.x,c.y));g.inverseContour.turns=63;advanceInverseDisorder(g,()=>.4);assert.equal(g.inverseDisorder.targets.length,33);assert.ok(JSON.stringify(g.inversePrison).length<700);g.inverseContour.turns=66;advanceInverseDisorder(g,()=>.4);assert.ok(g.inverseDisorderEvent.affected.length<=33);assert.equal(validInverseDisorder(g),true);
});
