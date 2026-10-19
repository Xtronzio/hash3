import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {nuclearBlast,nuclearOptions,applyNuclearTool} from '../src/nuclear-tool.js';
import {canUsePracticeTool,toolCells,initializeInventory} from '../src/practice-tools.js';
import {CARD_PRICES,tradeAvailability} from '../src/inventory-economy.js';
import {invasionBombIcon,bombDisarmCross} from '../src/invader-mark.js';
const now=100000;
const fixture=()=>{const r=createLocal('local','Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:false});r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.players[0].inventory.cards.nuclear=1;r.players[0].score=25912;r.players[1].score=777;r.players[0].freeExpansions=5;return r;};
const piece=(x,y,symbol)=>({x,y,id:`${x}:${y}`,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
test('Nuclear preview is deterministic, connected, capped at 33 and demolishes terrain and all symbols without score loss',()=>{
 const r=fixture(),point={x:4,y:4},blast=nuclearBlast(r,point);assert.equal(blast.length,33);assert.deepEqual(nuclearBlast(r,point),blast);assert.equal(new Set(blast.map(c=>`${c.x},${c.y}`)).size,33);
 blast.forEach((c,i)=>{if(i)assert.ok(blast.slice(0,i).some(p=>Math.abs(p.x-c.x)+Math.abs(p.y-c.y)===1));});
 r.cells=blast.map((c,i)=>piece(c.x,c.y,['X','O','*','#'][i%4]));r.players[0].lastMove=r.cells[0];r.watchTargets=[{id:'keep-coordinate',x:4,y:4,number:1}];r.forms=['X:line:4,4;5,4;6,4'];
 const before=structuredClone(r),next=localCommand(r,'inventory',{tool:'nuclear',playerId:'local-x',...point},now);
 assert.deepEqual(r,before);assert.equal(next.terrain.length,48);assert.equal(next.cells.length,0);assert.equal(next.lastEvent.demolished,33);assert.equal(next.lastEvent.removed,33);assert.deepEqual(next.lastEvent.affected,blast);
 assert.equal(next.players[0].score,25912);assert.equal(next.players[1].score,777);assert.equal(next.players[0].freeExpansions,5);assert.equal(next.players[0].inventory.cards.nuclear,0);assert.deepEqual(next.watchTargets,before.watchTargets);assert.deepEqual(next.forms,[]);assert.equal(next.pairs[0].turn,'X');assert.equal(next.players[0].placements,before.players[0].placements);assert.ok(next.terrain.some(c=>c.x===0&&c.y===0));
});
test('Nuclear excludes immune terrain, shielded pieces, inhabitants, reservations and anchors',()=>{
 const r=fixture();r.cells=[piece(4,4,'O'),piece(4,5,'X'),piece(5,4,'*')];r.terrain.find(c=>c.x===6&&c.y===4).owner='local-o';
 r.inventoryEffects.immunities=[{player:'local-o',expiresAt:now+33000}];r.inventoryEffects.shields=[{cell:'4:5',remaining:2}];
 r.rodents=[{id:'mouse',x:3,y:4}];r.worms=[{id:'worm',x:4,y:3,body:[{x:3,y:3}]}];r.works=[{id:'works',done:0,build:[{x:5,y:5}],destroy:[]}];
 const blocked=['0,0','4,4','4,5','6,4','3,4','4,3','3,3','5,5'],options=nuclearOptions(r),blast=nuclearBlast(r,{x:5,y:4});
 for(const k of blocked){assert.ok(!options.some(p=>`${p.x},${p.y}`===k));assert.ok(!blast.some(p=>`${p.x},${p.y}`===k));}
 const before=structuredClone(r),result=applyNuclearTool(r,{x:5,y:4});assert.ok(result.demolished<=33);for(const p of before.cells.filter(c=>['4:4','4:5'].includes(c.id)))assert.ok(r.cells.some(c=>c.id===p.id));assert.deepEqual(r.rodents,before.rodents);assert.deepEqual(r.worms,before.worms);assert.deepEqual(r.works,before.works);
});
test('Nuclear handles small/saturated territories and denied actions spend nothing',()=>{
 const r=fixture();r.terrain=r.terrain.filter(c=>c.x<3&&c.y<3);assert.equal(nuclearBlast(r,{x:1,y:1}).length,8);
 r.cells=r.terrain.map(c=>piece(c.x,c.y,'O'));r.pairs[0].pending=1;r.pairs[0].expander='local-x';assert.equal(canUsePracticeTool(r,'local-x','nuclear',now),true);
 const next=localCommand(r,'inventory',{tool:'nuclear',playerId:'local-x',x:1,y:1},now);assert.equal(next.terrain.length,1);assert.equal(next.cells.length,1);assert.equal(next.pairs[0].pending,1);assert.equal(next.pairs[0].expander,'local-x');assert.equal(next.players[0].inventory.cards.nuclear,0);
 for(const change of [v=>v.status='paused',v=>v.pairs[0].turn='O',v=>v.players[0].inventory.cards.nuclear=0]){const game=fixture();change(game);const before=structuredClone(game);assert.throws(()=>localCommand(game,'inventory',{tool:'nuclear',playerId:'local-x',x:4,y:4},now));assert.deepEqual(game,before);}
 const game=fixture(),before=structuredClone(game);assert.throws(()=>localCommand(game,'inventory',{tool:'nuclear',playerId:'local-x',x:0,y:0},now));assert.deepEqual(game,before);
});
test('Nuclear uses price 333, normal caps and exchange value; saves start with zero without historical rewards',()=>{
 const r=fixture();assert.equal(CARD_PRICES.nuclear,333);r.players[0].inventory.cards.nuclear=0;r.players[0].score=1000;
 const next=localCommand(r,'trade',{tool:'nuclear',playerId:'local-x'},now);assert.equal(next.players[0].score,667);assert.equal(next.players[0].inventory.cards.nuclear,1);assert.equal(next.players[0].tradeSpent,333);
 assert.equal(tradeAvailability(r,'local-x','nuclear',now,{replace:'double'}).allowed,false);r.players[0].inventory.cards.nuclear=3;assert.equal(tradeAvailability(r,'local-x','nuclear',now).allowed,false);
 delete r.players[0].inventory.cards.nuclear;const before=structuredClone(r.players[0]);initializeInventory(r);assert.equal(r.players[0].inventory.cards.nuclear,0);delete r.players[0].inventory.cards.nuclear;delete r.players[0].inventory.received.nuclear;delete before.inventory.received.nuclear;assert.deepEqual(r.players[0],before);
});
test('Nuclear retires defeated invasion focus, breaks hit unprotected barriers and keeps protected barriers',()=>{
 const r=fixture();r.invasions=[{id:'inv',kind:'invader-rain',grown:1,failed:0,visited:[{x:4,y:4}]}];r.cells=[{...piece(4,4,'*'),invasionId:'inv'}];r.frontiers=[{id:'hit',by:'local-x',cells:[{x:4,y:4},{x:5,y:4},{x:6,y:4}]},{id:'protected',by:'local-o',cells:[{x:3,y:4}]},{id:'far',by:'local-x',cells:[{x:99,y:99}]}];r.inventoryEffects.immunities=[{player:'local-o',expiresAt:now+33000}];
 applyNuclearTool(r,{x:4,y:4});assert.deepEqual(r.invasions,[]);assert.deepEqual(r.frontiers.map(f=>f.id),['protected','far']);assert.ok(r.terrain.some(c=>c.x===3&&c.y===4));
});
test('Bomb outline has no filled silhouette or black cutout and the small red cross leaves its perimeter readable',()=>{
 assert.match(invasionBombIcon,/fill="none"/);assert.doesNotMatch(invasionBombIcon,/fill="currentColor"|#08090b/);assert.match(invasionBombIcon,/stroke-width="3.6"/);assert.doesNotMatch(bombDisarmCross,/#08090b/);assert.match(bombDisarmCross,/var\(--red\)/);
});
test('Nuclear selection stays bounded with 33,333 cells',()=>{
 const r=fixture();r.terrain=Array.from({length:33333},(_,i)=>({x:i%183,y:Math.floor(i/183)}));const blast=nuclearBlast(r,{x:91,y:91});assert.equal(blast.length,33);assert.ok(blast.every(c=>Math.abs(c.x-91)<7&&Math.abs(c.y-91)<7));assert.equal(toolCells(r,'local-x','nuclear').length,33332);
});
