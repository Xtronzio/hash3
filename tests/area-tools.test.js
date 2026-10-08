import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canUsePracticeTool,initializeInventory,completeInventoryTurn,toolCells,practiceTools} from '../src/practice-tools.js';
import {tornadoOptions,bombBlast,frontierOptions,frontierAnchors} from '../src/area-tools.js';
import {frontierReachable,frontierEdges,frontierMarkup,frontierTiles,frontierCells,rotateFrontier,selectFrontier} from '../src/frontiers.js';
import {expansionOptions,terrainOf,figureWindows} from '../src/game.js';
import {activateImmunity} from '../src/immunity.js';
import {savedMapModel,inspectionCells,thumbnailMarkup} from '../src/saved-map.js';
import {advanceHabitats} from '../src/inhabitants.js';
const now=1700000000000;
const start=()=>{const r=createLocal('local','A','B',now,'normal','untimed');for(const t of ['tornado','bomb','frontier'])r.players[0].inventory.cards[t]=1;return r;};
const card=(r,tool,point,random=()=>.4)=>localCommand(r,'inventory',{tool,playerId:'local-x',...point},now,random);
const expanding=(r=start())=>{r.cells=r.terrain.map((p,i)=>({...p,id:String(i),symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));Object.assign(r.pairs[0],{pending:1,expander:'local-x',credits:1});return r;};
const fill=r=>{r.cells=r.terrain.filter(p=>p.x!==2||p.y!==2).map((p,i)=>({...p,id:String(i),symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));return r;};
test('Tornado mixes a selected 3×3 and its empty slots without creating terrain, symbols, score or a turn',()=>{
 const r=fill(start());r.players[0].score=123;r.players[1].lastMove={...r.cells[1]};const before=structuredClone(r);
 const next=card(r,'tornado',{x:0,y:0},()=>0);
 assert.deepEqual(r,before);assert.deepEqual(next.terrain,r.terrain);assert.equal(next.cells.length,r.cells.length);
 assert.deepEqual(next.cells.map(c=>`${c.id}:${c.symbol}:${c.owner}`).sort(),r.cells.map(c=>`${c.id}:${c.symbol}:${c.owner}`).sort());
 assert.notDeepEqual(next.cells.map(c=>`${c.x},${c.y}:${c.symbol}`).sort(),r.cells.map(c=>`${c.x},${c.y}:${c.symbol}`).sort());
 assert.deepEqual(next.pairs,r.pairs);assert.equal(next.players[0].score,123);assert.equal(next.players[0].inventory.cards.tornado,0);
 assert.deepEqual(next.players[1].lastMove,next.cells.find(c=>c.id===r.cells[1].id));assert.equal(next.players[0].placements,r.players[0].placements);
 assert.equal(canUsePracticeTool(next,'local-x','double',now),false);
});
test('Tornado preserves shields, immunised pieces and reserved empty cells; uniform zones are not consumable',()=>{
 const r=fill(start()),protectedPiece={...r.cells[0]};r.inventoryEffects.shields=[{cell:protectedPiece.id,by:'local-x',remaining:2}];
 const next=card(r,'tornado',{x:0,y:0});assert.deepEqual(next.cells.find(c=>c.id===protectedPiece.id),protectedPiece);
 activateImmunity(r,'local-o');const own=card(r,'tornado',{x:0,y:0});assert.deepEqual(own.cells.filter(c=>c.owner==='local-o'),r.cells.filter(c=>c.owner==='local-o'));
 const uniform=start();uniform.cells=uniform.terrain.map((p,i)=>({...p,id:String(i),symbol:'X',owner:'local-x'}));assert.equal(tornadoOptions(uniform).length,0);assert.throws(()=>card(uniform,'tornado',{x:0,y:0}));
});
test('Bomb clears exactly three adjoining filled cells without a template or terrain deletion',()=>{
 const r=fill(start()),before=structuredClone(r),next=card(r,'bomb',{x:1,y:1});
 assert.deepEqual(r,before);assert.equal(next.cells.length,r.cells.length-3);assert.deepEqual(next.terrain,r.terrain);assert.deepEqual(next.players.map(p=>p.score),r.players.map(p=>p.score));
 assert.equal(next.lastEvent.affected.length,3);assert.equal(next.players[0].inventory.cards.bomb,0);assert.deepEqual(next.pairs,r.pairs);
 const shapes=new Set();for(let seed=0;seed<20;seed++){let n=seed;const blast=bombBlast(r,{x:1,y:1},()=>((n=n*1664525+1013904223)>>>0)/4294967296);shapes.add(blast.map(p=>`${p.x},${p.y}`).sort().join(';'));assert.equal(blast.length,3);for(const c of blast.slice(1))assert.ok(blast.some(p=>p!==c&&Math.max(Math.abs(p.x-c.x),Math.abs(p.y-c.y))===1));}
 assert.ok(shapes.size>3);
});
test('Bomb removes paid forms only when broken, respects protection and never spends on an invalid target',()=>{
 const r=fill(start());r.forms=figureWindows(r.cells,0,0,'X').map(f=>f.id);r.players[0].score=99;
 r.inventoryEffects.shields=[{cell:r.cells[0].id,by:'local-x',remaining:2}];assert.throws(()=>card(r,'bomb',{x:0,y:0}));
 activateImmunity(r,'local-o');const next=card(r,'bomb',{x:1,y:1});assert.deepEqual(next.cells.filter(c=>c.owner==='local-o'),r.cells.filter(c=>c.owner==='local-o'));assert.equal(next.players[0].score,99);
 assert.throws(()=>card(r,'bomb',{x:50,y:50}));assert.equal(r.players[0].inventory.cards.bomb,1);
});
test('Frontier occupies three unbuilt cells, survives pause and other tools, blocks expansion across its face and can be bombed',()=>{
 const r=expanding(),next=card(r,'frontier',{x:3,y:0,side:'south'});
 assert.deepEqual(next.frontiers[0].cells,[{x:3,y:0},{x:3,y:1},{x:3,y:2}]);assert.deepEqual(next.cells,r.cells);assert.deepEqual(next.terrain,r.terrain);
 assert.ok(!expansionOptions(next.terrain,next.pairs[0].active,next).some(p=>p.x===3&&p.y===0));
 assert.ok(expansionOptions(next.terrain,next.pairs[0].active,next).some(p=>p.y<0));
 let saved=localCommand(JSON.parse(JSON.stringify(localCommand(next,'pause',{},now))),'resume',{},now+1000);assert.deepEqual(saved.frontiers,next.frontiers);
 saved=localCommand(saved,'expand',{x:0,y:-1},now);delete saved.practiceTurn;saved.players[0].inventory.cards.destroy=1;
 saved=card(saved,'destroy',{x:1,y:-1});assert.equal(saved.frontiers.length,1);delete saved.practiceTurn;
 const bombed=card(saved,'bomb',{x:3,y:0});assert.equal(bombed.frontiers.length,0);assert.equal(bombed.terrain.length,saved.terrain.length);
 assert.match(inspectionCells(savedMapModel(next,r.players[0])),/map-frontiers/);assert.match(thumbnailMarkup(next),/Frontera/);
});
test('An internal frontier blocks animal passage both ways, but an alternative path can go around it',()=>{
 const terrain=Array.from({length:18},(_,i)=>({x:i%6,y:Math.floor(i/6)})),room={frontiers:[{id:'f',by:'local-x',edges:frontierEdges({x:0,y:0,side:'east'})}]};
 assert.equal(frontierReachable(terrain,{x:0,y:0},room).length,9);assert.equal(frontierReachable(terrain,{x:5,y:0},room).length,9);
 const detour=[...terrain,...Array.from({length:6},(_,x)=>({x,y:3}))];assert.equal(frontierReachable(detour,{x:0,y:0},room).length,24);
});
test('Bomb needs three connected tokens away from a frontier and cannot spend on a sparse cluster',()=>{
 const r=start();r.cells=[{x:0,y:0,id:'a',symbol:'X',owner:'local-x'},{x:1,y:1,id:'b',symbol:'O',owner:'local-o'}];
 assert.equal(canUsePracticeTool(r,'local-x','bomb',now),false);assert.throws(()=>card(r,'bomb',{x:0,y:0}));assert.equal(r.players[0].inventory.cards.bomb,1);
 r.cells.push({x:2,y:2,id:'c',symbol:'X',owner:'local-x'});assert.equal(card(r,'bomb',{x:0,y:0}).cells.length,0);
});
test('Frontier rejects existing terrain, overlap, remote placement and reserved work without charging a card',()=>{
 const r=expanding(),before=structuredClone(r);
 for(const point of [{x:0,y:0,side:'east'},{x:3,y:0,side:'invalid'},{x:30,y:0,side:'south'}])assert.throws(()=>card(r,'frontier',point));
 assert.deepEqual(r,before);
 const next=card(r,'frontier',{x:3,y:0,side:'south'});delete next.practiceTurn;next.players[0].inventory.cards.frontier=1;
 const saved=structuredClone(next);assert.throws(()=>card(next,'frontier',{x:3,y:2,side:'north'}));assert.deepEqual(next,saved);
 r.works=[{done:0,destroy:[{x:0,y:2}],build:[{x:3,y:1}]}];assert.throws(()=>card(r,'frontier',{x:3,y:0,side:'south'}));
});
test('New cards enter refill at zero stock in old saves, preserve eight starting cards and obey expiry, pause, stock and Combo',()=>{
 const r=createLocal('local','A','B',now,'normal','untimed');assert.equal(Object.values(r.players[0].inventory.cards).reduce((a,b)=>a+b,0),8);
 for(const t of ['tornado','bomb','frontier','hint-expand','super-hint']){assert.equal(r.players[0].inventory.cards[t],0);delete r.players[0].inventory.cards[t];}
 initializeInventory(r);assert.equal(r.players[0].inventory.cards['super-hint'],0);
 for(const t of practiceTools)r.players[0].inventory.received[t.id]=0;
 const index=practiceTools.findIndex(t=>t.id==='bomb');r.players[0].inventory.cards.hint=0;for(let i=0;i<4;i++)completeInventoryTurn(r,'local-x',{random:()=>index/practiceTools.length+.001});assert.equal(r.players[0].inventory.cards.bomb,1);
 const ready=fill(start());for(const t of ['tornado','bomb','frontier']){assert.equal(canUsePracticeTool(localCommand(ready,'pause',{},now),'local-x',t,now),false);assert.equal(canUsePracticeTool({...ready,timeMode:'timed',pairs:[{...ready.pairs[0],deadline:new Date(now).toISOString()}]},'local-x',t,now),false);}
});

test('A 3×1 frontier turns 90 degrees around its first cell through all four orientations',()=>{
 let selection={side:'north',point:{x:3,y:3},tool:'frontier'};
 const expected=[[[3,3],[3,2],[3,1]],[[3,3],[4,3],[5,3]],[[3,3],[3,4],[3,5]],[[3,3],[2,3],[1,3]]];
 for(let i=0;i<4;i++){
  assert.deepEqual(frontierTiles({...selection.point,side:selection.side}).map(c=>[c.x,c.y]),expected[i]);
  selection=rotateFrontier(selection);assert.deepEqual(selection.point,{x:3,y:3});
 }
 assert.equal(selection.side,'north');
});
test('A frontier is three purple diamond cells, adds no terrain, survives save and is removed as a whole by Bomb',()=>{
 const r=expanding(),next=card(r,'frontier',{x:3,y:0,side:'south'});
 assert.deepEqual(frontierCells(next),frontierTiles({x:3,y:0,side:'south'}));assert.deepEqual(next.terrain,r.terrain);assert.deepEqual(next.cells,r.cells);
 assert.equal(frontierCells(next).length,3);assert.ok(frontierCells(next).every(c=>!r.terrain.some(t=>t.x===c.x&&t.y===c.y)));
 const markup=frontierMarkup(next);assert.equal((markup.match(/<rect /g)||[]).length,3);assert.equal((markup.match(/<path /g)||[]).length,3);assert.doesNotMatch(markup,/<line|var\(--yellow\)/);assert.match(markup,/--frontier/);
 const restored=localCommand(JSON.parse(JSON.stringify(next)),'expand',{x:0,y:-1},now);delete restored.practiceTurn;
 const bombed=card(restored,'bomb',{x:3,y:1},()=>0);assert.equal(bombed.frontiers.length,0);assert.deepEqual(bombed.terrain,restored.terrain);
 assert.ok(expansionOptions(bombed.terrain,bombed.pairs[0].active,bombed).some(p=>p.x===3&&p.y===0));
});
test('All selectable + anchors have a valid 3×1 orientation and walls block building and expansions over their cells',()=>{
 const r=expanding(),anchors=frontierAnchors(r,'local-x');assert.ok(anchors.length>0);
 assert.ok(anchors.every(a=>!r.terrain.some(c=>c.x===a.x&&c.y===a.y)));
 assert.ok(anchors.every(a=>['north','east','south','west'].some(side=>frontierOptions(r,side,'local-x').some(p=>p.x===a.x&&p.y===a.y))));
 const next=card(r,'frontier',{x:3,y:0,side:'south'});delete next.practiceTurn;next.players[0].inventory.cards.activate=1;
 assert.ok(!toolCells(next,'local-x','activate').some(c=>c.x===3&&c.y===0));assert.throws(()=>card(next,'activate',{x:3,y:0}));
 assert.ok(expansionOptions(next.terrain,next.pairs[0].active,next).every(p=>!frontierCells(next).some(c=>c.x>=p.x&&c.x<p.x+3&&c.y>=p.y&&c.y<p.y+3)));
 const model=savedMapModel(next,r.players[0]);assert.ok(model.bounds.x+model.bounds.width>=4);assert.equal(model.terrain.length,r.terrain.length);
});
test('Saved old edge barriers remain readable and bombable',()=>{
 const r=fill(start());r.frontiers=[{id:'legacy',by:'local-x',edges:frontierEdges({x:0,y:0,side:'east'})}];
 assert.equal(frontierCells(r).length,3);assert.doesNotMatch(frontierMarkup(r),/<line/);
 assert.equal(card(r,'bomb',{x:2,y:0}).frontiers.length,0);
});
test('An automatic bomb breaks all three unbuilt frontier cells without building or deleting terrain',()=>{
 const r=card(expanding(),'frontier',{x:3,y:0,side:'south'}),terrain=structuredClone(r.terrain);
 r.bombs=[{id:'auto',player:'local-x',x:3,y:0,blast:frontierCells(r),nextAt:now+1000}];
 advanceHabitats(r,now+1000);assert.equal(r.frontiers.length,0);assert.equal(r.bombs.length,0);assert.deepEqual(r.terrain,terrain);
});
test('Only the expander can place Frontier before the 3×3; it preserves the phase, deadline and next-turn allowance',()=>{
 for(const timeMode of ['timed','untimed']){
  let r=createLocal('local','A','B',now,'normal',timeMode);r.players[0].inventory.cards.frontier=2;r.players[1].inventory.cards.frontier=1;
  assert.equal(canUsePracticeTool(r,'local-x','frontier',now),false);assert.throws(()=>card(r,'frontier',{x:3,y:0,side:'south'}),/quien está ampliando/);
  for(const cell of [...r.terrain])r=localCommand(r,'move',cell,now);
  assert.equal(r.pairs[0].pending,1);assert.equal(r.pairs[0].expander,'local-x');assert.equal(r.pairs[0].turn,'O');
  assert.equal(canUsePracticeTool(r,'local-x','frontier',now),true);assert.equal(canUsePracticeTool(r,'local-o','frontier',now),false);
  const before=structuredClone(r),wall=localCommand(r,'inventory',{tool:'frontier',playerId:'local-x',x:3,y:0,side:'south'},now+1000);
  assert.equal(wall.pairs[0].pending,1);assert.equal(wall.pairs[0].expander,'local-x');assert.equal(wall.pairs[0].turn,'O');assert.equal(wall.pairs[0].deadline,before.pairs[0].deadline);
  assert.deepEqual(wall.cells,before.cells);assert.deepEqual(wall.terrain,before.terrain);assert.deepEqual(wall.practiceTurn,before.practiceTurn);
  assert.deepEqual(wall.players.map(p=>[p.score,p.placements,p.inventory.turns]),before.players.map(p=>[p.score,p.placements,p.inventory.turns]));
  assert.equal(wall.players[0].inventory.cards.frontier,1);assert.equal(canUsePracticeTool(wall,'local-x','frontier',now+1000),false);
  assert.throws(()=>localCommand(wall,'inventory',{tool:'frontier',playerId:'local-x',x:-1,y:0,side:'south'},now+1000));
  const paused=localCommand(wall,'pause',{},now+1000),resumed=localCommand(JSON.parse(JSON.stringify(paused)),'resume',{},now+2000);
  assert.equal(resumed.pairs[0].frontierUsed,true);
  const enlarged=localCommand(resumed,'expand',{x:0,y:-1},now+2000);
  assert.equal(enlarged.pairs[0].pending,0);assert.equal(enlarged.pairs[0].frontierUsed,undefined);assert.equal(enlarged.pairs[0].turn,'O');assert.equal(enlarged.frontiers.length,1);
  assert.equal(canUsePracticeTool(enlarged,'local-o','double',now+2000),true);assert.equal(canUsePracticeTool(enlarged,'local-x','frontier',now+2000),false);
  if(timeMode==='timed'){assert.equal(canUsePracticeTool(before,'local-x','frontier',now+33000),false);assert.throws(()=>localCommand(before,'inventory',{tool:'frontier',playerId:'local-x',x:3,y:0,side:'south'},now+33000));}
 }
});


test('Frontier selection starts valid, keeps the rotated pivot on second tap and changes to another anchor',()=>{
 const r=expanding(),anchors=frontierAnchors(r,'local-x');
 const anchor=anchors.find(a=>!frontierOptions(r,'north','local-x').some(p=>p.x===a.x&&p.y===a.y));
 assert.ok(anchor);
 const first=selectFrontier({player:'local-x',tool:'frontier'},anchor,anchors);
 assert.equal(first.confirm,false);
 assert.ok(frontierOptions(r,first.selected.side,'local-x').some(p=>p.x===anchor.x&&p.y===anchor.y));
 assert.equal(frontierTiles({...first.selected.point,side:first.selected.side}).length,3);
 const rotated=rotateFrontier(first.selected),second=selectFrontier(rotated,anchor,anchors);
 assert.equal(second.confirm,true);assert.deepEqual(second.selected,rotated);
 const other=anchors.find(a=>a.x!==anchor.x||a.y!==anchor.y);
 const changed=selectFrontier(rotated,other,anchors);assert.equal(changed.confirm,false);assert.deepEqual(changed.selected.point,{x:other.x,y:other.y});
 const invalid=selectFrontier(rotated,{x:100000,y:100000},anchors);assert.equal(invalid.confirm,false);assert.deepEqual(invalid.selected,rotated);
});
