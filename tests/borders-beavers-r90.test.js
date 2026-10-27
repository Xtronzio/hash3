import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {borderOptions,applyAreaTool,bombBlast} from '../src/area-tools.js';
import {canUsePracticeTool,toolAllowance} from '../src/practice-tools.js';
import {resolveBriefFauna,initializeBriefEcology} from '../src/brief-ecology.js';
import {advanceEcologyTurn} from '../src/inhabitants.js';
import {frontierCells} from '../src/frontiers.js';
import {nuclearBlast,applyNuclearTool} from '../src/nuclear-tool.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {captureTransfer,encodeTransfer,decodeTransfer} from '../src/local-transfer.js';
import {loadLocalGames} from '../src/sessions.js';
import {ecologyCardStatus} from '../src/ecology-navigation.js';
const now=1700000000000;
const fresh=()=>{const r=createLocal('local','A','B',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.players[0].inventory.cards.border=3;return r;};
const place=(r,x=4,y=4)=>localCommand(r,'inventory',{tool:'border',playerId:'local-x',x,y},now,()=>0);
const dam=r=>{r.ruleVersion=27;const cells=[{x:3,y:3},{x:4,y:3},{x:5,y:3}];resolveBriefFauna(r,{id:'dam-event',kind:'beaver',paths:[cells]},now,()=>0);return r;};
const turns=(r,n)=>{for(let i=0;i<n;i++)advanceEcologyTurn(r,now+i,()=>0);return r;};

test('Frontera targets one built legal dot, spends once and leaves a normal placement for both signs',()=>{
 const r=fresh(),before=structuredClone(r),next=place(r);
 assert.deepEqual(r,before);assert.deepEqual(next.terrain,r.terrain);assert.deepEqual(next.cells,r.cells);assert.deepEqual(next.pairs,r.pairs);
 assert.deepEqual(next.frontiers[0].cells,[{x:4,y:4}]);assert.equal(next.players[0].inventory.cards.border,2);assert.equal(toolAllowance(next,'local-x').remaining,0);
 for(const turn of ['X','O'])assert.ok(!availableCells({...next,pairs:[{...next.pairs[0],turn}]},{...next.pairs[0],turn}).some(c=>c.x===4&&c.y===4));
 for(const p of [{x:-1,y:0},{x:999,y:999}])assert.throws(()=>place(r,p.x,p.y));
 r.cells=[{id:'occupied',x:4,y:4,symbol:'O',owner:'local-o'}];assert.throws(()=>place(r));
 r.cells=r.terrain.slice(1).map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));assert.deepEqual(borderOptions(r),[]);
});
test('Only the owner can remove a border, free even outside their turn, preserving clock, stock, allowance and all event counters',()=>{
 let r=place(fresh());r.pairs[0].turn='O';const before=structuredClone(r),id=r.frontiers[0].id;
 assert.throws(()=>localCommand(r,'remove-border',{id,playerId:'local-o'},now));assert.deepEqual(r,before);
 const next=localCommand(r,'remove-border',{id,playerId:'local-x'},now+5000);
 assert.equal(next.frontiers.length,0);for(const field of ['players','practiceTurn','pairs','terrain','cells','ecologyTurns','territoryEvents','inventoryEffects'])assert.deepEqual(next[field],before[field],field);
 assert.ok(availableCells(next,next.pairs[0]).some(c=>c.x===4&&c.y===4));
 assert.throws(()=>localCommand(next,'remove-border',{id,playerId:'local-x'},now));
 assert.throws(()=>localCommand({...r,status:'paused'},'remove-border',{id,playerId:'local-x'},now));
});
test('Bombs, nuclear demolition and territorial demolition preserve Frontera and its underlying terrain',()=>{
 const r=place(fresh());r.cells=[{id:'a',x:3,y:4,symbol:'O',owner:'local-o'},{id:'b',x:3,y:3,symbol:'X',owner:'local-x'},{id:'c',x:4,y:3,symbol:'O',owner:'local-o'}];
 const point={x:4,y:4};assert.ok(!bombBlast(r,point).length);assert.ok(!nuclearBlast(r,point).length);
 const bomb=structuredClone(r);applyAreaTool(bomb,'local-o','bomb',{x:3,y:4},()=>0);assert.deepEqual(bomb.frontiers,r.frontiers);
 const nuclear=structuredClone(r);applyNuclearTool(nuclear,{x:5,y:4});assert.deepEqual(nuclear.frontiers,r.frontiers);assert.ok(nuclear.terrain.some(c=>c.x===4&&c.y===4));
 const meteor=structuredClone(r);meteor.territoryEnabled=true;meteor.territoryEvents=[{id:'strike',kind:'meteorites',region:[point],turnsRemaining:0}];advanceTerritory(meteor,now);assert.deepEqual(meteor.frontiers,r.frontiers);assert.ok(meteor.terrain.some(c=>c.x===4&&c.y===4));
});
test('Mandatory and strategic expansion reject both barriers without consuming them',()=>{
 for(const optional of [false,true]){const r=fresh();r.players[0].inventory.cards.frontier=1;
 if(optional){r.players[0].figures=333;r.players[0].inventory.cards['hint-expand']=1;Object.assign(r.pairs[0],{pending:1,optionalExpansion:true,strategicExpansion:true,expander:'local-x'});}
 else{r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));Object.assign(r.pairs[0],{pending:1,expander:'local-x'});}
 const before=structuredClone(r);for(const tool of ['frontier','border']){assert.equal(canUsePracticeTool(r,'local-x',tool,now),false);assert.throws(()=>localCommand(r,'inventory',{tool,playerId:'local-x',x:10,y:0},now));}assert.deepEqual(r,before);assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).length);
 }
});
test('Each castor shuffles distinct 3/6/9 deadlines and releases exactly one cell at each deadline',()=>{
 const seen=new Set();for(const value of [0,.4,.99]){const r=fresh();r.ruleVersion=27;const cells=[{x:3,y:3},{x:4,y:3},{x:5,y:3}];resolveBriefFauna(r,{id:'dam',kind:'beaver',paths:[cells]},now,()=>value);seen.add(r.frontiers[0].cells.map(c=>c.turnsRemaining).join(','));assert.deepEqual(r.frontiers[0].cells.map(c=>c.turnsRemaining).sort((a,b)=>a-b),[3,6,9]);}
 assert.ok(seen.size>1);const r=dam(fresh());assert.equal(ecologyCardStatus(r,'beaver-barrier','local-x').badge,'−3');turns(r,2);assert.equal(ecologyCardStatus(r,'beaver-barrier','local-x').badge,'−1');assert.equal(frontierCells(r).length,3);assert.deepEqual(frontierCells(r).map(c=>c.turnsRemaining).sort((a,b)=>a-b),[1,4,7]);turns(r,1);assert.equal(frontierCells(r).length,2);assert.equal(ecologyCardStatus(r,'beaver-barrier','local-x').badge,'−3');turns(r,3);assert.equal(frontierCells(r).length,1);turns(r,3);assert.equal(frontierCells(r).length,0);
});
test('Current commands retire legacy dams before Doble; pause and transfer preserve the retired state',async()=>{
 let r=dam(fresh());r.players[0].inventory.cards.double=1;const original=structuredClone(r.frontiers);
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now);assert.deepEqual(r.frontiers,[]);
 r=localCommand(r,'move',{x:0,y:1},now);assert.deepEqual(r.frontiers,[]);
 r=localCommand(r,'move',{x:1,y:1},now);assert.deepEqual(r.frontiers,[]);assert.equal(r.ecologyTurns,1);
 r=localCommand(r,'pause',{},now);const before=structuredClone(r.frontiers);assert.equal(localCommand(r,'tick',{},now+999999),r);
 const values=new Map([['hash3_locals',JSON.stringify([r])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const decoded=await decodeTransfer(await encodeTransfer(captureTransfer(storage,{now})));assert.deepEqual(decoded.data.games[0].frontiers,before);
 r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+999999);assert.deepEqual(r.frontiers,before);
});
test('Old live dams migrate once without extending remaining life; old borders retain owner and geometry, finished games are untouched',()=>{
 const r=fresh();r.ruleVersion=24;r.frontiers=[{id:'old-dam',type:'beaver',cells:[{x:3,y:3},{x:4,y:3},{x:5,y:3}],turnsRemaining:6,bornTurn:-1},{id:'old-border',type:'border',by:'local-x',cells:[{x:1,y:3},{x:1,y:4},{x:1,y:5}]}];const border=structuredClone(r.frontiers[1]);initializeBriefEcology(r);assert.deepEqual(r.frontiers[0].cells.map(c=>c.turnsRemaining),[2,4,6]);const migrated=structuredClone(r.frontiers);initializeBriefEcology(r);assert.deepEqual(r.frontiers,migrated);assert.deepEqual(r.frontiers[1],border);
 const done=structuredClone(r);done.id='finished';done.status='finished';done.ruleVersion=24;const values=new Map([['hash3_locals',JSON.stringify([r,done])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const games=loadLocalGames(storage,now);assert.deepEqual(games.find(g=>g.id==='finished'),done);assert.equal(games.find(g=>g.id===r.id).ruleVersion,32);
});
