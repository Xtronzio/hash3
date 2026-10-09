import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {availableCells,key} from '../src/game.js';
import {initializeHabitats,countHabitatPlacement,advanceHabitats} from '../src/inhabitants.js';
import {localLiving,livingFactor,livingInterval,livingClock,LIVING_FREQUENCIES} from '../src/living-balance.js';
import {impactCount,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,pickEventKind,confirmEventKind} from '../src/territory-event-rules.js';
import {recordTerritoryPlacement,territoryIcons} from '../src/territory-tools.js';
import {plannedEventRegion,applyPlannedEvent} from '../src/territory-event-actions.js';
import {borderOptions} from '../src/area-tools.js';
import {frontierEdges,frontierSegments,frontierMarkup} from '../src/frontiers.js';
import {planInvasion,defendedInvasionCells} from '../src/invasion-paths.js';
import {migrateLegacyWalls} from '../src/wall-migration.js';
import {canUsePracticeTool} from '../src/practice-tools.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {wormTrailParts,wormTrailMarkup} from '../src/worm-trails.js';
import {overviewModel} from '../src/map-overview.js';
import {savedMapModel} from '../src/saved-map.js';
import {prepareMapRendering,mapWindowMarkup} from '../src/map-render.js';
import {ecologyChoicesMarkup} from '../src/ecology-ui.js';
import {needsLocalTick} from '../src/local-clock.js';

const board=(size=333,mode='local')=>{
 const r=createLocal(mode,'X','O',1000,'normal','untimed');
 r.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));
 r.territoryEnabled=false;return r;
};
const worm=(point={x:2,y:0})=>({id:'worm',kind:'worm',...point,body:[point],eaten:1,nextAt:34000});
test('Every AI level completes a legal turn when the scoring target is occupied by a worm or reserved by works',()=>{
 for(const difficulty of ['basic','medium','high','pro'])for(const obstacle of ['worm','work']){
  let r=createLocal('solo','X','',1000,'normal','untimed',difficulty);r.pairs[0].turn='O';
  r.cells=[{id:'a',x:0,y:0,symbol:'O',owner:'local-o'},{id:'b',x:1,y:0,symbol:'O',owner:'local-o'}];
  if(obstacle==='worm')r.worms=[worm()];
  else r.works=[{id:'work',kind:'work',done:0,destroy:[{x:2,y:0}],build:[{x:3,y:0}],nextAt:34000}];
  const choice=machineChoice(r,()=>0,{maxTimeMs:50,maxNodes:400});
  assert.equal(choice.action,'move');assert.ok(availableCells(r,r.pairs[0]).some(p=>key(p.x,p.y)===key(choice.payload.x,choice.payload.y)));
  r=localCommand(r,choice.action,choice.payload,1000,()=>0);assert.equal(r.pairs[0].turn,'X');
 }
});
test('A newly blocked worker destination is rejected without spending a turn; a fresh AI choice succeeds',()=>{
 const r=createLocal('solo','X','',1000,'normal','untimed','medium');r.pairs[0].turn='O';
 r.cells=[{id:'a',x:0,y:0,symbol:'O',owner:'local-o'},{id:'b',x:1,y:0,symbol:'O',owner:'local-o'}];
 const old=machineChoice(r,()=>0);r.worms=[worm(old.payload)];const snapshot=structuredClone(r);
 assert.throws(()=>localCommand(r,old.action,old.payload,1000),/celda vacía/);assert.deepEqual(r,snapshot);
 const next=machineChoice(r,()=>0);assert.notDeepEqual(next.payload,old.payload);assert.equal(localCommand(r,next.action,next.payload,1000).pairs[0].turn,'X');
});
test('Three consecutive foodless cycles retire the whole worm, including after pause and reload',()=>{
 let r=board();r.worms=[worm()];
 r=localCommand(r,'tick',{},34000);r=localCommand(r,'tick',{},67000);assert.equal(r.worms[0].failedMeals,2);
 r=localCommand(r,'pause',{},77000);assert.equal(r.worms[0].remainingMs,23000);
 r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1000000);
 r=localCommand(r,'tick',{},1023000);assert.equal(r.worms.length,0);assert.ok(availableCells(r,r.pairs[0]).some(p=>p.x===2&&p.y===0));
});
test('A successful meal breaks the foodless streak, and the third actual meal still removes the body',()=>{
 const r=board();r.worms=[{...worm(),eaten:0,failedMeals:2}];
 r.cells=[{id:'a',x:2,y:0,symbol:'O',owner:'local-o'},{id:'b',x:3,y:1,symbol:'X',owner:'local-x'},{id:'c',x:4,y:1,symbol:'O',owner:'local-o'}];
 advanceHabitats(r,34000,()=>0);assert.equal(r.worms[0].failedMeals,0);
 advanceHabitats(r,67000,()=>0);assert.equal(r.worms[0].eaten,2);
 advanceHabitats(r,100000,()=>0);assert.equal(r.worms.length,0);
});
test('Worm nodes and continuous links share exact geometry across active and paused maps',()=>{
 const r=board();r.worms=[{...worm({x:3,y:1}),body:[{x:1,y:0},{x:2,y:0},{x:3,y:1}]}];
 const parts=wormTrailParts(r),markup=wormTrailMarkup(parts,{svg:true});
 assert.equal(parts.filter(p=>p.head).length,1);assert.equal((markup.match(/<path/g)||[]).length,2);assert.equal((markup.match(/<circle/g)||[]).length,2);
 const active=overviewModel(r,r.players[0],null),paused=savedMapModel(r,r.players[0]);active.frontierCells=paused.frontierCells;
 const box={x:0,y:0,width:10,height:5};assert.equal(mapWindowMarkup(active,prepareMapRendering(active),box,20),mapWindowMarkup(paused,prepareMapRendering(paused),box,20));
 r.worms=[];assert.equal(wormTrailParts(r).length,0);
});
test('Sqrt population scaling and every effect budget remain bounded and tied to three',()=>{
 for(const [size,factor] of [[333,1],[999,2],[3333,3],[9999,5],[33333,10]]){
  assert.equal(livingFactor(size),factor);
  for(const [kind,n] of Object.entries(LIVING_FREQUENCIES)){assert.equal(livingInterval(n,size)%3,0);if(kind!=='bomb')assert.equal(livingClock(kind,size)%33000,0);}
  const r=board(size);r.cells=r.terrain;
  for(const kind of NATURAL_EVENT_ROTATION){const count=impactCount(r,kind);assert.equal(count%3,0);assert.ok(count<=99*factor);}
  assert.equal(impactCount(r,'invader-colony'),9*factor);assert.equal(impactCount(r,'invader-rain'),3*factor);
 }
 assert.equal(localLiving({mode:'world'}),false);const legacy={mode:'world',terrain:Array(999),cells:Array(999)};assert.equal(impactCount(legacy,'meteorites'),99);
});
test('Birth attempts can be due by clock, stay dormant without placement, and preserve time across pause',()=>{
 let r=board();r.cells=[{id:'food',x:10,y:2,symbol:'O',owner:'local-o'}];
 r=localCommand(r,'move',{x:0,y:0},1000,()=>0);const zone=r.habitatZones[0];
 assert.equal(zone.clockNext.rodent,133000);assert.equal(needsLocalTick(r,133000),false);
 r=localCommand(r,'pause',{},34000);assert.equal(r.habitatZones[0].clockRemaining.rodent,99000);
 r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},1000000);assert.equal(r.habitatZones[0].clockNext.rodent,1099000);
 r=localCommand(r,'move',{x:1,y:0},1099000,()=>0);assert.ok(r.rodentRaids.length);assert.equal(r.habitatZones[0].placements,2);
});
test('Adopting historic active or paused counters cannot produce retrospective births or attacks',()=>{
 for(const status of ['playing','paused']){
  const r=board();r.status=status;r.players[0].placements=3000;
  r.habitatZones=[{id:'old',x:0,y:0,placements:3000,next:{rodent:33,worm:33,work:66},credit:{}}];
  delete r.livingTerritoryVersion;delete r.livingHabitatVersion;initializeHabitats(r,1000);
  assert.equal(r.territoryNextPlacement,3099);assert.equal(r.territoryNextInvasion,3033);
  assert.equal(r.habitatZones[0].next.rodent,3066);assert.equal(r.rodentRaids.length,0);assert.equal(r.territoryEvents.length,0);
  const saved=structuredClone(r);initializeHabitats(r,999999);assert.deepEqual(r,saved);
 }
});
test('Each event bag survives save/reload without repeating a viable kind before the family is exhausted',()=>{
 let r=board();const seen=[];
 for(let i=0;i<7;i++){const choice=pickEventKind(r,'natural',()=>.3),kind=choice.order[0];seen.push(kind);confirmEventKind(r,choice,kind);r=JSON.parse(JSON.stringify(r));}
 assert.equal(new Set(seen).size,7);assert.deepEqual([...seen].sort(),[...NATURAL_EVENT_ROTATION].sort());
});
test('A short match cannot announce an effect that would land after its final second',()=>{
 const r=board();r.territoryEnabled=true;r.players[0].figures=33;r.territoryNextInvasion=0;r.endsAt=new Date(33000).toISOString();
 assert.equal(recordTerritoryPlacement(r,1001,()=>0),false);
 r.endsAt=new Date(34001).toISOString();assert.equal(recordTerritoryPlacement(r,1001,()=>0),true);
});
test('Frontera is a separate refundable-safe card: rotating/previewing is free, placing spends once and leaves cells playable',()=>{
 let r=board(99);r.players[0].inventory.cards.border=1;
 for(const side of ['north','east','south','west'])assert.ok(borderOptions(r,side).length);
 const point=borderOptions(r,'north')[0],before=structuredClone(r);assert.deepEqual(r,before);
 r=localCommand(r,'inventory',{tool:'border',playerId:'local-x',...point},1000);
 assert.equal(r.players[0].inventory.cards.border,0);assert.equal(r.players[0].inventory.cards.frontier,0);
 assert.equal(r.frontiers[0].edges.length,3);assert.equal(r.frontiers[0].type,'border');assert.equal(r.cells.length,0);assert.equal(r.pairs[0].turn,'X');
 assert.equal(availableCells(r,r.pairs[0]).length,99);assert.equal(canUsePracticeTool(r,'local-x','border',1000),false);
 assert.match(frontierMarkup(r),/Frontera/);delete r.wallMigrationVersion;migrateLegacyWalls(r);assert.equal(r.frontiers.length,1);assert.equal(r.players[0].inventory.cards.frontier,0);
});
for(const side of ['north','east','south','west'])test('An invasion from '+side+' is stopped at the warned entrance, without bypassing the three-cell border',()=>{
 const r=board(99);r.territoryEnabled=true;const plan=planInvasion(r,r.terrain,9,true,()=>0);
 // Fix an actual boundary plot and direction, then preserve each lane's path.
 const origins={north:{x:10,y:0},south:{x:10,y:2},west:{x:0,y:0},east:{x:32,y:0}},origin=origins[side];
 const eligible=r.terrain.filter(c=>side==='north'||side==='south'?c.x>=10&&c.x<13:side==='west'?c.x<3:c.x>=30);
 let candidate;
 for(let seed=0;seed<100&&!candidate;seed++){const p=planInvasion(r,eligible,9,true,()=>seed/100);if(p.approaches[0]?.side===side)candidate=p;}
 assert.ok(candidate?.paths.length===9);assert.equal(plan.paths.length,9);
 const entry=candidate.approaches[0],point={x:entry.x-(side==='east'?2:0),y:entry.y-(side==='south'?2:0),side};
 r.territoryEvents=[{id:'attack',kind:'invader-colony',...candidate,nextAt:34000}];r.players[0].inventory.cards.border=1;
 const protectedRoom=localCommand(r,'inventory',{tool:'border',playerId:'local-x',...point},1000);
 assert.equal(defendedInvasionCells(protectedRoom,protectedRoom.territoryEvents[0]).size,9);
 const result=applyPlannedEvent(protectedRoom,protectedRoom.territoryEvents[0],34000);assert.equal(result.actions.length,0);assert.equal(protectedRoom.cells.length,0);
 assert.equal(frontierSegments(protectedRoom).length,3);
});
test('A partial or interior border blocks only crossed lanes; natural effects still act through it',()=>{
 const r=board(99);r.territoryEnabled=true;const plan=planInvasion(r,r.terrain,9,true,()=>0),entry=plan.approaches[0];
 const side=entry.side,point={x:entry.x-(side==='east'?2:0),y:entry.y-(side==='south'?2:0),side};
 r.frontiers=[{type:'border',edges:frontierEdges(point).slice(0,1)}];
 const event={id:'one',kind:'invader-colony',...plan};const defended=defendedInvasionCells(r,event);assert.equal(defended.size,3);
 assert.equal(applyPlannedEvent(r,event,1000).actions.length,6);
 const meteor={id:'natural',kind:'meteorites',region:plan.region};assert.equal(applyPlannedEvent(r,meteor,1000).actions.length,8);
});
test('The machine can spend its own border card to contain a warned attack',()=>{
 const r=board(99,'solo');r.machineInventory=true;r.pairs[0].turn='O';
 for(const p of r.players)for(const kind of Object.keys(p.inventory.cards))p.inventory.cards[kind]=0;
 r.players[1].inventory.cards.border=1;r.territoryEnabled=true;r.territoryEvents=[{id:'attack',kind:'invader-colony',...planInvasion(r,r.terrain,9,true,()=>0),nextAt:34000}];
 const choice=chooseMachineCard(r,1000);assert.equal(choice?.payload.tool,'border');
 const next=localCommand(r,choice.action,choice.payload,1000);assert.ok(defendedInvasionCells(next,next.territoryEvents[0]).size>=3);
});
test('Bomba breaks an entire border, while owner immunity keeps all its segments',()=>{
 for(const immune of [false,true]){
  let r=board(99);r.frontiers=[{id:'f',type:'border',by:'local-o',edges:frontierEdges({x:3,y:0,side:'north'})}];
  r.players[0].inventory.cards.bomb=1;
  r.cells=[{id:'a',x:3,y:0,symbol:'O',owner:'local-o'},{id:'b',x:4,y:0,symbol:'X',owner:'local-x'},{id:'c',x:5,y:0,symbol:'X',owner:'local-x'}];
  if(immune){r.inventoryEffects.immunities=[{player:'local-o',expiresAt:34000}];r.cells[0].owner='local-x';}
  r=localCommand(r,'inventory',{tool:'bomb',playerId:'local-x',x:3,y:0},1000,()=>0);
  assert.equal(r.frontiers.length,immune?1:0);assert.equal(r.terrain.length,99);
 }
});
test('One border can be placed in a pending expansion without consuming the expansion or resetting its clock',()=>{
 let r=board(99);r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));
 r.pairs[0].pending=1;r.pairs[0].expander='local-x';r.pairs[0].credits=1;r.players[0].inventory.cards.border=2;
 r=localCommand(r,'inventory',{tool:'border',playerId:'local-x',x:3,y:0,side:'north'},1000);
 assert.equal(r.pairs[0].pending,1);assert.equal(r.pairs[0].credits,1);assert.equal(r.pairs[0].deadline,null);
 assert.equal(r.players[0].inventory.cards.border,1);assert.equal(canUsePracticeTool(r,'local-x','border',1000),false);
});
test('Separated black-hole cores have bounded individual halos rather than one enormous intervening rectangle',()=>{
 const r=board(3333);r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));
 const plan=plannedEventRegion(r,'blackhole',()=>.3,1000);assert.equal(plan.groups.length,3);assert.equal(plan.region.length,27);
 const result=applyPlannedEvent(r,{id:'holes',kind:'blackhole',...plan},1000);
 assert.ok(result.hit.size<=3*81);assert.equal(r.cells.length,3333-27);assert.equal(r.terrain.length,3333);
});
test('Pandemic, black hole, tornado rain and hurricane have distinct icons and all thirteen ecology glyphs appear in setup',()=>{
 assert.equal(new Set([...NATURAL_EVENT_ROTATION,...INVADER_EVENT_ROTATION].map(k=>territoryIcons[k])).size,9);
 const markup=ecologyChoicesMarkup({faunaEnabled:true,territoryEnabled:true,machine:true,machineInventory:true},'');
 assert.equal((markup.match(/<svg/g)||[]).length,13);
 for(const kind of NATURAL_EVENT_ROTATION)assert.ok(markup.includes('data-ecology-kind="'+kind+'"'));
});
