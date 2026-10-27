import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {nuclearBlast,nuclearOptions,NUCLEAR_MAX} from '../src/nuclear-tool.js';
const now=100000;
const key=c=>`${c.x},${c.y}`;
const nearest=(cells,p)=>[...cells].sort((a,b)=>((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2)||a.y-b.y||a.x-b.x).slice(0,NUCLEAR_MAX).map(({x,y})=>({x,y}));
function fixture(){
 const r=createLocal('local','Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:false,initialCards:['nuclear','double','hint'],random:()=>0});
 r.terrain=Array.from({length:45},(_,i)=>({x:(i%9)*3,y:Math.floor(i/9)*3}));
 r.cells=r.terrain.map((c,i)=>({...c,id:key(c),symbol:['X','O','*','#'][i%4],owner:i%4===0?'local-x':i%4===1?'local-o':null}));
 r.players[0].score=25912;r.players[1].score=777;return r;
}
test('Nuclear reaches 33 across disconnected islands and preview matches the real saved command',()=>{
 const r=fixture(),point={x:3,y:3},before=structuredClone(r),blast=nuclearBlast(r,point);
 assert.equal(blast.length,NUCLEAR_MAX);assert.deepEqual(blast,nearest(nuclearOptions(r),point));
 assert.deepEqual(nuclearBlast({...r,terrain:[...r.terrain].reverse()},point),blast);
 const next=localCommand(JSON.parse(JSON.stringify(r)),'inventory',{tool:'nuclear',playerId:'local-x',...point},now,()=>0);
 assert.deepEqual(r,before);assert.deepEqual(next.lastEvent.affected,blast);assert.equal(next.lastEvent.demolished,33);assert.equal(next.lastEvent.removed,33);assert.equal(next.terrain.length,12);
 assert.deepEqual(next.players.map(p=>p.score),before.players.map(p=>p.score));assert.equal(next.players[0].inventory.cards.nuclear,0);assert.equal(next.pairs[0].turn,before.pairs[0].turn);assert.deepEqual(next.pairs[0].active,before.pairs[0].active);assert.equal(next.players[0].placements,before.players[0].placements);assert.equal(next.ecologyTurns,before.ecologyTurns);
 const hit=new Set(blast.map(key));assert.deepEqual(next.cells,before.cells.filter(c=>!hit.has(key(c))));
});
test('Nuclear crosses protected gaps without destroying protected cells or replacing them in the count',()=>{
 const r=fixture(),point={x:3,y:3};
 r.inventoryEffects.shields=[{cell:key(r.terrain[2]),remaining:3}];r.deadCells=[r.terrain[3]];r.rodents=[{id:'mouse',...r.terrain[4]}];
 r.frontiers=[{id:'border',by:'local-o',type:'border',cells:[r.terrain[5]]}];
 r.inventoryEffects.immunities=[{player:'local-o',turnsRemaining:3}];
 // Keep at least 33 eligible cells after protection and spread them over islands.
 r.cells=r.cells.map(c=>({...c,owner:'local-x'}));r.cells[6].owner='local-o';
 const blast=nuclearBlast(r,point),legal=nuclearOptions(r),blocked=[r.terrain[0],...r.terrain.slice(2,7)];
 assert.equal(blast.length,33);assert.deepEqual(blast,nearest(legal,point));for(const p of blocked)assert.ok(!blast.some(c=>key(c)===key(p)));
 assert.deepEqual(nuclearBlast(r,r.terrain[3]),[]);
});
test('Nuclear removes every eligible cell when fewer than 33 remain across islands',()=>{
 const r=fixture();r.terrain=r.terrain.slice(0,12);r.cells=r.cells.slice(0,12);const p={x:3,y:0};
 assert.equal(nuclearBlast(r,p).length,11);const next=localCommand(r,'inventory',{tool:'nuclear',playerId:'local-x',...p},now,()=>0);
 assert.equal(next.lastEvent.demolished,11);assert.deepEqual(next.terrain,[r.terrain[0]]);assert.equal(next.players[0].score,25912);
});
test('Nuclear nearest selection remains deterministic and bounded on 33,333 isolated cells',()=>{
 const r=fixture();r.terrain=Array.from({length:33333},(_,i)=>({x:(i%183)*3,y:Math.floor(i/183)*3}));r.cells=[];
 const p={x:273,y:273},blast=nuclearBlast(r,p);assert.equal(blast.length,33);assert.deepEqual(blast,nearest(nuclearOptions(r),p));
});
