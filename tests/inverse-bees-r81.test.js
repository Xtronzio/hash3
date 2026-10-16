import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {inverseClaimsAt} from '../src/inverse-claims.js';
import {initializeInverseBees,completeInverseBeeTurn,inverseBeeWarning,validInverseBees} from '../src/inverse-bees.js';
import {inverseBeeBadge,inverseBeeNotices} from '../src/inverse-bee-ui.js';
import {territoryComparisonKey} from '../src/achievements.js';
import {captureTransfer,encodeTransfer,decodeTransfer,validateTransfer} from '../src/local-transfer.js';
import {availableCells} from '../src/game.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const NOW=1800000000000;
const fresh=(options={})=>createLocal('local','A','B',NOW,'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>0,...options});
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='#'?null:symbol==='X'?'local-x':'local-o'});
const state=(g,s='X')=>g.inverseBees.players[s];
const command=(g,action,payload={},now=NOW)=>localCommand(g,action,payload,now,()=>.41);
const move=g=>command(g,'move',availableCells(g,g.pairs[0])[0]);
const claim=g=>{const f=inverseClaimsAt(g,'local-x',g.cells.find(c=>c.symbol==='X'))[0];return command(g,'claim',{x:f.points[0][0],y:f.points[0][1],figureId:f.id});};
const due=(g,s='X',left=1)=>{Object.assign(state(g,s),{turns:9-left,since:9-left,limit:9});return g;};
test('Bee deadlines use 9/12/15 own turns and publish only the last three',()=>{
 for(const [random,limit]of [[0,9],[.45,12],[.99,15]]){const g=fresh({random:()=>random});assert.equal(state(g).limit,limit);assert.equal(inverseBeeWarning(g,'local-x'),null);Object.assign(state(g),{turns:limit-3,since:limit-3});assert.equal(inverseBeeWarning(g,'local-x'),3);}
 const g=fresh();Object.assign(state(g),{turns:5,since:5});let n=move(g);assert.equal(inverseBeeWarning(n,'local-x'),3);n=move(n);assert.equal(inverseBeeWarning(n,'local-x'),3);assert.equal(state(n,'O').since,1);
});
test('A full turn counts once; Doble, cards, preview and trade never accelerate it',()=>{
 const g=due(fresh(), 'X',2);g.players[0].inventory.cards.double=1;
 let n=command(g,'inventory',{playerId:'local-x',tool:'double'});assert.equal(state(n).since,7);n=move(n);assert.equal(state(n).since,7);assert.equal(n.pairs[0].turn,'X');n=move(n);assert.equal(state(n).since,8);assert.equal(n.pairs[0].turn,'O');assert.equal(inverseBeeWarning(n,'local-x'),1);
 const h=fresh();h.cells=[tile(1,1,'O')];h.players[0].score=333;
 n=command(h,'trade',{playerId:'local-x',tool:'erase'});assert.deepEqual(n.inverseBees,h.inverseBees);n=command(n,'inventory',{playerId:'local-x',tool:'erase',x:1,y:1});assert.deepEqual(n.inverseBees,h.inverseBees);const before=JSON.stringify(n);inverseBeeBadge(n,'local-x');inverseBeeNotices(n);assert.equal(JSON.stringify(n),before);n=move(n);assert.equal(state(n).since,1);
});
test('A paid claim cancels the claimant warning, leaves the opponent deadline and resets without historical points',()=>{
 const g=due(fresh());g.cells=[tile(0,0),tile(1,0),tile(0,1),tile(1,1)];g.players[0].score=33;due(g,'O',2);const opponent=structuredClone(state(g,'O'));
 const n=claim(g);assert.equal(n.players[0].score,52);assert.equal(state(n).since,0);assert.equal(state(n).turns,9);assert.ok([9,12,15].includes(state(n).limit));assert.deepEqual(state(n,'O'),opponent);assert.equal(n.inverseBeeEvent,undefined);assert.equal(n.inverseFill.length,32);
});
test('A zero-point claim does not evade bees or clear pending fill',()=>{
 const g=due(fresh());g.cells=[tile(0,0),tile(1,0),tile(2,0),tile(4,4)];g.inverseFill=['5,5'];g.players[0].score=99;
 const n=claim(g);assert.equal(n.players[0].score,99);assert.deepEqual(n.inverseFill,['5,5']);assert.equal(n.lastEvent.points,0);assert.equal(n.inverseBeeEvent.count,1);assert.equal(n.inverseBeeEvent.moved,1);assert.equal(state(n).cycles,1);assert.equal(n.cells[0].id,'X:4,4');assert.notDeepEqual([n.cells[0].x,n.cells[0].y],[4,4]);
});
test('Swarm redistributes every own sign without collisions, board changes, rival/# movement or automatic payments',()=>{
 const g=due(fresh());g.cells=[tile(0,0),tile(1,0),tile(2,0),tile(0,3,'O'),tile(1,3,'O'),tile(4,4,'#')];g.players[0].score=71;g.players[1].score=33;g.players[0].lastMove={...g.cells[0]};g.players[0].navigationLastMove={x:0,y:0,id:g.cells[0].id};
 const raw=JSON.stringify(g),n=command(g,'move',{x:3,y:0}),map=new Map(n.cells.map(c=>[c.id,c]));
 assert.equal(JSON.stringify(g),raw);assert.deepEqual(n.terrain,g.terrain);assert.deepEqual(n.inverseFill,g.inverseFill);assert.equal(n.inverseCleared,g.inverseCleared);assert.equal(n.players[0].score,71);assert.equal(n.players[1].score,33);assert.equal(n.lastEvent.points,0);assert.equal(n.inverseBeeEvent.count,4);assert.equal(n.inverseBeeEvent.moved,4);
 for(const c of g.cells){const other=map.get(c.id);assert.equal(other.symbol,c.symbol);assert.equal(other.owner,c.owner);if(c.symbol==='X')assert.notDeepEqual([other.x,other.y],[c.x,c.y]);else assert.deepEqual(other,c);}
 const positions=new Set(n.cells.map(c=>`${c.x},${c.y}`)),board=new Set(g.terrain.map(c=>`${c.x},${c.y}`));assert.equal(positions.size,n.cells.length);assert.ok([...positions].every(k=>board.has(k)));assert.equal(n.players[0].lastMove.id,n.cells.find(c=>c.id===n.players[0].lastMove.id).id);assert.equal(n.pairs[0].turn,'O');assert.equal(state(n).since,0);assert.equal(state(n,'O').since,0);
});
test('Relocation includes cleared positions while preserving holes and disconnected drawing geometry',()=>{
 const g=due(fresh());g.terrain=[{x:0,y:0},{x:1,y:0},{x:9,y:9},{x:10,y:9}];g.inverseFill=['0,0'];g.cells=[tile(0,0),tile(1,0)];completeInverseBeeTurn(g,'local-x',0,()=>0);assert.ok(g.cells.some(c=>c.x===9));assert.deepEqual(g.inverseFill,['0,0']);assert.equal(g.terrain.length,4);assert.ok(g.cells.every(c=>g.terrain.some(p=>p.x===c.x&&p.y===c.y)));
});
test('A trapped single sign and a player without signs resolve safely, keeping count and points',()=>{
 const g=due(fresh());g.terrain=[{x:0,y:0},{x:1,y:0}];g.cells=[tile(0,0),tile(1,0,'O')];completeInverseBeeTurn(g,'local-x',0,()=>0);assert.equal(g.inverseBeeEvent.moved,0);assert.equal(g.inverseBeeEvent.count,1);assert.deepEqual(g.cells,[tile(0,0),tile(1,0,'O')]);
 const h=due(fresh());h.cells=[];completeInverseBeeTurn(h,'local-x',0,()=>0);assert.equal(h.inverseBeeEvent.count,0);assert.equal(state(h).cycles,1);assert.equal(inverseBeeNotices(h),'');
});
test('Pause/resume, elapsed real time and read-only clocks preserve the exact warning and random deadline',()=>{
 const g=due(fresh(), 'X',2),before=structuredClone(g.inverseBees);let n=command(g,'pause');assert.deepEqual(n.inverseBees,before);assert.equal(command(n,'tick',{},NOW+999999),n);n=command(n,'resume',{},NOW+999999);assert.deepEqual(n.inverseBees,before);assert.equal(command(n,'tick',{},NOW+1999999),n);assert.equal(inverseBeeWarning(n,'local-x'),2);
});
test('Existing R80 saves initialize once on action with no retroactive pressure; finished and legacy saves stay untouched',()=>{
 const g=fresh();delete g.inverseBees;g.players[0].score=333;g.players[0].placements=999;g.cells=[tile(0,0)];const before=JSON.stringify(g);assert.equal(inverseBeeWarning(g,'local-x'),null);assert.equal(command(g,'tick'),g);assert.equal(JSON.stringify(g),before);
 const n=command(g,'pause');assert.equal(state(n).turns,0);assert.equal(state(n).since,0);assert.deepEqual(n.cells,g.cells);assert.equal(n.players[0].score,333);const resumed=command(n,'resume');assert.deepEqual(resumed.inverseBees,n.inverseBees);
 for(const version of [1,2]){const old=structuredClone(g);old.inverseVersion=version;const p=command(old,'pause');assert.equal(p.inverseBees,undefined);}
 const final=structuredClone(g);final.status='finished';final.finalResult={inverseVersion:3,inverseClaimVersion:2};initializeInverseBees(final,()=>0);assert.equal(final.inverseBees,undefined);
});
test('Alto/PRO and automatic turns collect a real paying combo before their imminent swarm',()=>{
 for(const difficulty of ['high','pro']){const g=due(fresh());g.difficulty=difficulty;g.cells=[tile(0,0),tile(1,0),tile(2,0)];const c=machineChoice(g,()=>.4,{cards:false,maxTimeMs:30});assert.equal(c.action,'claim');const n=command(g,c.action,c.payload);assert.equal(n.players[0].score,3);assert.equal(n.inverseBeeEvent,undefined);assert.equal(state(n).since,0);}
 const g=due(fresh());g.timeMode='timed';g.pairs[0].deadline=new Date(NOW-1).toISOString();g.cells=[tile(0,0),tile(1,0),tile(2,0)];const n=command(g,'tick');assert.equal(n.lastEvent.kind,'claim');assert.equal(n.players[0].score,3);assert.equal(state(n).since,0);
});
test('AI cannot distinguish hidden calm deadlines and visible warnings survive read-only UI renders',()=>{
 const a=fresh();a.difficulty='pro';a.cells=[tile(0,0),tile(1,0)];const b=structuredClone(a);state(a).limit=9;state(b).limit=15;
 assert.deepEqual(machineChoice(a,()=>.4,{cards:false,maxNodes:1,maxTimeMs:1000}),machineChoice(b,()=>.4,{cards:false,maxNodes:1,maxTimeMs:1000}));
 due(a,'X',3);const raw=JSON.stringify(a);assert.match(inverseBeeBadge(a,'local-x'),/quedan 3 turnos propios/);assert.match(inverseBeeNotices(a,{paused:true}),/Pausa: cuenta detenida/);assert.equal(JSON.stringify(a),raw);
});
test('A bee result compares separately from historical results without rewriting them',()=>{
 const g=fresh();g.cells=[tile(0,0),tile(1,0),tile(2,0)];g.inverseFill=['0,0'];const n=claim(g);assert.equal(n.status,'finished');assert.equal(n.finalResult.inverseBeeVersion,1);const old={...n.finalResult};delete old.inverseBeeVersion;assert.notEqual(territoryComparisonKey(old),territoryComparisonKey(n.finalResult));assert.equal(old.inverseBeeVersion,undefined);
});
test('Transfer preserves countdowns and swarm history exactly, and rejects malformed bee snapshots',async()=>{
 const source=command(due(fresh()),'move',{x:0,y:0});Object.assign(state(source),{turns:16,since:7,limit:9});const g=command(source,'pause'),values=new Map([['hash3_locals',JSON.stringify([g])],['hash3_local',JSON.stringify({id:g.id})],['hash3_name','A']]);const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const data=captureTransfer(storage,{now:NOW,id:'bees-copy'}),decoded=await decodeTransfer(await encodeTransfer(data));assert.deepEqual(decoded.data.games[0].inverseBees,g.inverseBees);assert.deepEqual(decoded.data.games[0].inverseBeeEvent,g.inverseBeeEvent);assert.equal(validInverseBees(g),true);
 for(const change of [p=>p.limit=10,p=>p.since=9,p=>p.turns=-1,p=>p.cycles=1.5]){const bad=structuredClone(data);change(state(bad.games[0]));assert.throws(()=>validateTransfer(bad),/no es válida/);}
 for(const patch of [{symbol:'<b>X</b>'},{moved:99999},{cycle:99},{player:'unknown'}]){const bad=structuredClone(data);Object.assign(bad.games[0].inverseBeeEvent,patch);assert.throws(()=>validateTransfer(bad),/no es válida/);}
});
test('A 33333-sign swarm moves every piece and persists only a compact event',()=>{
 const g=due(fresh());g.terrain=Array.from({length:33333},(_,i)=>({x:i%333,y:Math.floor(i/333)}));g.cells=g.terrain.map(c=>tile(c.x,c.y));const before=new Map(g.cells.map(c=>[c.id,`${c.x},${c.y}`]));completeInverseBeeTurn(g,'local-x',0,()=>.4);assert.equal(g.inverseBeeEvent.moved,33333);assert.equal(g.cells.length,33333);assert.equal(new Set(g.cells.map(c=>`${c.x},${c.y}`)).size,33333);assert.ok(g.cells.every(c=>before.get(c.id)!==`${c.x},${c.y}`));assert.ok(JSON.stringify(g.inverseBeeEvent).length<400);
});
