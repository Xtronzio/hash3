import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {figureWindows,prepareFigureIndex,key,availableCells} from '../src/game.js';
import {scoreLandings} from '../src/landing-score.js';
import {plannedEventRegion,applyPlannedEvent} from '../src/territory-event-actions.js';
import {initializeInvasions,advanceInvasions,seedInvasions} from '../src/invasion-paths.js';
import {initializeHabitats,countHabitatPlacement,visitWorms,advanceHabitats} from '../src/inhabitants.js';
import {initializeTurnWorms} from '../src/worm-turns.js';
import {ecologyClockEvents,ecologyNavigationMarkup,ecologyTargets} from '../src/ecology-navigation.js';
import {ecologyWarningsMarkup,eventOutlookMarkup} from '../src/event-outlook.js';
import {loadLocalGames,saveLocalGame} from '../src/sessions.js';
import {TACTICAL_CARDS,inventoryDrawWeight,practiceTools,completeInventoryTurn,MAX_CARDS,MAX_PER_CARD,MAX_CARD_TYPES} from '../src/practice-tools.js';
import {validBorder,borderOptions} from '../src/area-tools.js';
const now=1000;
const board=(size=333)=>{const r=createLocal('local','X','O',now,'normal','untimed');r.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));return r;};
const piece=(symbol,x,y,id=`${symbol}:${x},${y}`)=>({id,symbol,x,y,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};

test('Final landings award both symbols, once per geometry, with bonus and expansion credit',()=>{
 const r=board();r.players[0].figures=2;
 const before=[piece('X',0,0),piece('X',1,0),piece('X',2,1),piece('O',0,1),piece('O',1,1),piece('O',2,0)];
 r.cells=[piece('X',0,0),piece('X',1,0),piece('X',2,0),piece('O',0,1),piece('O',1,1),piece('O',2,1)];
 const scores=scoreLandings(r,before,r.cells,{actor:'local-x'});
 assert.deepEqual(scores.map(s=>[s.symbol,s.points,s.figures,s.bonus]),[['X',6,1,3],['O',3,1,0]]);
 assert.deepEqual(r.players.map(p=>p.score),[6,3]);assert.equal(r.pairs[0].credits,2);
 assert.equal(r.players[0].bestCombo.points,6);assert.equal(r.players[1].bestCombo,undefined);
 assert.deepEqual(scoreLandings(r,r.cells,r.cells),[]);assert.deepEqual(r.players.map(p=>p.score),[6,3]);
});
test('A shuffled piece scores across the chosen region boundary; pre-existing unpaid figures do not pay again',()=>{
 const r=board(),before=[piece('X',-2,0),piece('X',-1,0),piece('X',0,1),piece('O',4,0),piece('O',5,0),piece('O',6,0)];
 r.cells=[...before.slice(0,2),piece('X',0,0),...before.slice(3)];
 const result=scoreLandings(r,before,[{x:0,y:0},{x:0,y:1}]);assert.equal(result[0].points,3);assert.equal(result.length,1);
 const same=[piece('O',4,0,'new-id'),...r.cells.filter(c=>c.x!==4)];const old=r.cells;r.cells=same;
 assert.deepEqual(scoreLandings(r,old,[{x:4,y:0}]),[]);assert.equal(r.players[1].score,0);
});
test('Figure indexing gives identical Normal and Advanced results across connected and disconnected pieces',()=>{
 const cells=Array.from({length:100},(_,i)=>piece(i%3?'X':'O',i%10,Math.floor(i/10))),index=prepareFigureIndex(cells);
 for(const level of ['normal','advanced'])for(const c of cells)assert.deepEqual(figureWindows(cells,c.x,c.y,c.symbol,level,index),figureWindows(cells,c.x,c.y,c.symbol,level));
});
test('All three storms score their final arrangement and preserve stock, occupants, scores and save/load invariants',()=>{
 for(const kind of ['tornado','tornado-rain','hurricane']){
  let r=board(991);r.players[0].score=25912;r.players[0].placements=1422;r.players[0].figures=999;
  r.cells=r.terrain.slice(0,600).map((c,i)=>piece(i%2?'X':'O',c.x,c.y));const before=structuredClone(r);
  if(kind==='tornado'){r.players[0].inventory.cards.tornado=1;r=localCommand(r,'inventory',{tool:kind,playerId:'local-x',x:3,y:3},1000,()=>0);}
  else{const plan=plannedEventRegion(r,kind,random(12),1000);r.territoryEvents=[{id:'r37-storm:'+kind,kind,...(Array.isArray(plan)?{region:plan}:plan),nextAt:1001}];r=localCommand(r,'tick',{},1001);}
  assert.deepEqual(r.terrain,before.terrain);assert.equal(r.cells.length,before.cells.length);assert.ok(r.players[0].score>=25912);
  assert.deepEqual(r.players.map(p=>p.score),before.players.map(p=>p.score+(r.landingEvent?.scores.find(s=>s.player===p.id)?.points||0)));
  assert.equal(new Set(r.cells.map(c=>key(c.x,c.y))).size,r.cells.length);assert.equal(r.players[0].placements,1422);
  const store=memory();saveLocalGame(store,r,1002);const saved=loadLocalGames(store,1003)[0];assert.deepEqual(saved.cells,r.cells);assert.deepEqual(saved.players.map(p=>p.score),r.players.map(p=>p.score));
 }
});
test('Seed becomes nine invaded cells over eight completed turns, follows a narrow strip and never fills a 3×3 template',()=>{
 const r=board();r.terrain=Array.from({length:12},(_,x)=>({x,y:0}));r.cells=r.terrain.map(c=>piece('O',c.x,0));
 const plan=plannedEventRegion(r,'invader-colony',()=>0,now);assert.equal(plan.region.length,1);assert.ok(plan.seeded);
 applyPlannedEvent(r,{id:'seed',kind:'invader-colony',...plan},now);assert.equal(r.cells.filter(c=>c.symbol==='*').length,1);
 for(let i=0;i<8;i++){advanceInvasions(r,now+i,()=>0);assert.equal(r.cells.filter(c=>c.symbol==='*').length,i+2);}
 assert.equal(r.invasions.length,0);advanceInvasions(r,2000);assert.equal(r.cells.filter(c=>c.symbol==='*').length,9);assert.equal(r.cells.length,12);
});
test('Growth respects walls, shields, immunity, latest placed piece and surviving terrain',()=>{
 const r=board();r.terrain=Array.from({length:5},(_,x)=>({x,y:0}));seedInvasions(r,[{x:0,y:0}],'invader-colony');
 r.cells.push(piece('O',1,0));const id=r.cells[1].id;
 r.frontiers=[{id:'wall',type:'border',cells:[{x:1,y:0}]}];assert.deepEqual(advanceInvasions(r,1000),[]);r.frontiers=[];
 r.inventoryEffects.shields=[{cell:id,remaining:2}];assert.deepEqual(advanceInvasions(r,1000),[]);r.inventoryEffects.shields=[];
 assert.deepEqual(advanceInvasions(r,1000,()=>0,id),[]);assert.equal(r.cells.find(c=>c.id===id)?.symbol,'O');
 // After three blocked turns that seed retires instead of accumulating a hidden attack.
 assert.equal(r.invasions.length,0);assert.equal(r.cells.filter(c=>c.symbol==='*').length,1);
});
test('Invasion movement is shared by accepted turns, Doble completes once and ticks/cards do not advance growth',()=>{
 let r=board(99);seedInvasions(r,[{x:10,y:0}],'invader-colony');const x=()=>r.cells.filter(c=>c.symbol==='*').length;
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},1000);assert.equal(x(),1);
 r=localCommand(r,'tick',{},999999);assert.equal(x(),1);r=localCommand(r,'move',{x:0,y:0},999999);assert.equal(x(),1);
 r=localCommand(r,'move',{x:1,y:0},999999);assert.equal(x(),2);assert.equal(r.pairs[0].turn,'O');
 const markup=ecologyNavigationMarkup(r,'local-x');assert.match(markup,/2\/9/);assert.ok(ecologyTargets(r,'invader-colony','local-x').some(e=>e.invasion));
});
test('Legacy colony warning migration keeps its deadline, seeds once and never starts historical stars growing',()=>{
 const r=board();delete r.invasionVersion;delete r.invasions;r.cells=[piece('*',20,0)];
 const block=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));r.territoryEvents=[{id:'old',kind:'invader-colony',region:block,groups:[block],nextAt:33001}];
 initializeInvasions(r);assert.equal(r.territoryEvents[0].region.length,1);assert.equal(r.territoryEvents[0].nextAt,33001);assert.equal(r.invasions.length,0);
 const copy=structuredClone(r);initializeInvasions(r);assert.deepEqual(r,copy);
});
test('Builders clean invasion marks; destructors remove invaded terrain and protect the current anchor',()=>{
 for(const role of ['build','destroy']){
  const r=board(99);r.cells=[piece('*',1,0)];r.works=[{id:'defender',kind:'work',role,build:role==='build'?[{x:1,y:0}]:[],destroy:role==='destroy'?[{x:1,y:0}]:[],done:0,nextAt:34000}];
  advanceHabitats(r,34000,()=>0);assert.equal(r.cells.length,0);assert.equal(r.terrain.length,role==='build'?99:98);assert.equal(r.works.length,0);
 }
 const r=board();r.cells=[piece('*',0,0)];r.works=[{id:'anchor',kind:'work',role:'destroy',build:[],destroy:[{x:0,y:0}],done:0,nextAt:34000}];advanceHabitats(r,34000);assert.equal(r.cells.length,1);assert.equal(r.terrain.length,333);
});
test('Habitant births prioritise existing invaded cells and supply both cleaning and destruction projects',()=>{
 const r=board();r.cells=Array.from({length:6},(_,i)=>piece('*',i+1,0));
 countHabitatPlacement(r,'local-x',{x:20,y:5},1000,()=>0);const z=r.habitatZones[0];z.next.work=z.placements+1;z.next.rodent=z.next.worm=9999;
 countHabitatPlacement(r,'local-o',{x:20,y:5},1001,()=>0);assert.deepEqual(r.works.map(w=>w.role),['build','destroy']);
 advanceHabitats(r,34001,()=>0);assert.equal(r.cells.length,4);assert.equal(r.terrain.length,332);
});
test('Worm successful appearance batches progress 3,6,9,9 without counting failed births or individuals',()=>{
 const r=board(999);r.territoryEnabled=false;r.cells=Array.from({length:25},(_,i)=>piece('O',i,0));
 countHabitatPlacement(r,'local-x',{x:30,y:5},1000,()=>0);
 const z=r.habitatZones[0];z.next.rodent=z.next.work=1000000;z.clockNext.rodent=z.clockNext.work=1000000;
 for(const limit of [3,6,9,9]){
  r.worms=[];z.next.worm=z.placements+1;z.credit.worm=0;
  countHabitatPlacement(r,'local-x',{x:30,y:5},1001,()=>0);
  assert.equal(r.worms.length,2);assert.ok(r.worms.every(w=>w.mealLimit===limit));assert.ok(r.worms.every(w=>!('nextAt'in w)));
 }
 assert.equal(r.wormAppearances,4);r.worms=[];r.cells=[];z.next.worm=z.placements+1;countHabitatPlacement(r,'local-x',{x:30,y:5},1002,()=>0);assert.equal(r.wormAppearances,4);
});
test('Long worms consume nine meals in 27 turns and protect only the last three trail cells',()=>{
 const r=board();r.territoryEnabled=false;r.cells=Array.from({length:9},(_,i)=>piece('X',i,0));
 r.worms=[{id:'worm',kind:'worm',x:0,y:0,body:[{x:0,y:0}],turnDriven:true,mealLimit:9,eaten:0,turnsSinceMeal:0}];
 for(let i=1;i<=27;i++){
  visitWorms(r,null,1000+i,()=>0);assert.equal(r.cells.length,9-Math.floor(i/3));
  if(i<27){assert.ok(r.worms[0].body.length<=3);assert.equal(r.worms[0].eaten,Math.floor(i/3));}
  if(i===12){assert.ok(availableCells(r,r.pairs[0]).some(c=>c.x===0&&c.y===0));assert.equal(r.worms[0].body.length,3);}
 }
 assert.equal(r.worms.length,0);
});
test('Doble, inventory, expansion, pauses and ticks preserve turn-worm progress until the completed turn',()=>{
 let r=board();r.territoryEnabled=false;r.cells=[piece('O',10,0),piece('O',11,0)];r.worms=[{id:'w',kind:'worm',x:10,y:0,body:[{x:10,y:0}],turnDriven:true,mealLimit:6,eaten:0,turnsSinceMeal:2}];
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},1001);r=localCommand(r,'move',{x:0,y:0},1002);assert.equal(r.worms[0].eaten,0);
 r=localCommand(r,'pause',{},1003);const copy=structuredClone(r.worms);assert.equal(localCommand(r,'tick',{},999999),r);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},999999);assert.deepEqual(r.worms,copy);
 r=localCommand(r,'move',{x:1,y:0},999999);assert.equal(r.worms[0].eaten,1);assert.equal(r.worms[0].turnsSinceMeal,0);
 assert.equal(ecologyClockEvents(r,'worm').length,0);assert.match(ecologyWarningsMarkup(r),/Gusanos: próxima comida en 3 turnos/);assert.match(eventOutlookMarkup(r,'local-x'),/1\/6 comidas/);
});
test('R36 saves retain the entire board, scores, bag and pins when worms migrate; finished records stay unchanged',()=>{
 const r=board(991);r.players[0].score=25912;r.players[0].placements=1422;r.worms=[{id:'old',x:20,y:0,eaten:1,body:[{x:20,y:0}],nextAt:10000}];delete r.wormLifecycleVersion;delete r.wormAppearances;delete r.invasionVersion;
 const ended=structuredClone(r);ended.id='ended';ended.status='finished';const before=structuredClone(r),store=memory();store.setItem('hash3_locals',JSON.stringify([r,ended]));store.setItem('hash3_game_pins','["local:'+r.id+'"]');
 const games=loadLocalGames(store,999999),loaded=games.find(g=>g.id===r.id);assert.equal(loaded.worms[0].mealLimit,3);assert.equal(loaded.worms[0].eaten,1);assert.equal(loaded.wormAppearances,1);
 assert.deepEqual(loaded.terrain,before.terrain);assert.deepEqual(loaded.players,before.players);assert.deepEqual(games.find(g=>g.id==='ended'),ended);assert.equal(store.getItem('hash3_game_pins'),'["local:'+r.id+'"]');
 const first=store.getItem('hash3_locals');loadLocalGames(store,9999999);assert.equal(store.getItem('hash3_locals'),first);
});
test('Tactical refill weights increase piece inventory while keeping all bag and type caps',()=>{
 assert.ok(TACTICAL_CARDS.every(t=>inventoryDrawWeight(t)===3));assert.ok(practiceTools.filter(t=>!TACTICAL_CARDS.includes(t.id)).every(t=>inventoryDrawWeight(t.id)===1));
 const rng=random(21);let tactical=0,total=0;
 for(let i=0;i<3000;i++){const r=board(9);for(const t of practiceTools)r.players[0].inventory.cards[t.id]=0;completeInventoryTurn(r,'local-x',{random:rng});tactical+=TACTICAL_CARDS.includes(r.players[0].inventory.lastDraw);total++;}
 assert.ok(tactical/total>.58&&tactical/total<.68);
 const r=board(9);for(let i=0;i<300;i++)completeInventoryTurn(r,'local-x',{random:rng});const counts=Object.values(r.players[0].inventory.cards);assert.ok(counts.reduce((a,b)=>a+b,0)<=MAX_CARDS);assert.ok(counts.every(n=>n<=MAX_PER_CARD));assert.ok(counts.filter(Boolean).length<=MAX_CARD_TYPES);
});
test('Borders require exactly three unique empty orthogonally contiguous choices; illegal selection preserves the bag',()=>{
 const r=board(99);r.players[0].inventory.cards.border=1;
 for(const cells of [[{x:1,y:0},{x:2,y:0}],[{x:1,y:0},{x:1,y:0},{x:2,y:0}],[{x:1,y:0},{x:2,y:1},{x:3,y:2}],[{x:90,y:90},{x:91,y:90},{x:91,y:91}]]){
  assert.equal(validBorder(r,cells),false);const copy=structuredClone(r);assert.throws(()=>localCommand(r,'inventory',{tool:'border',playerId:'local-x',cells},1000));assert.deepEqual(r,copy);
 }
 assert.ok(borderOptions(r,[{x:1,y:0}]).some(c=>c.x===1&&c.y===1));r.cells=[piece('O',2,0)];assert.equal(validBorder(r,[{x:1,y:0},{x:2,y:0},{x:2,y:1}]),false);
});
test('Invaded pieces may be moved without a fictitious symbol owner or scoring crash',()=>{
 const r=board();r.cells=[piece('*',1,0)];const next=localCommand(r,'inventory',{tool:'shift',playerId:'local-x',x:1,y:0,toX:2,toY:0},1000);assert.equal(next.cells[0].symbol,'*');assert.equal(next.cells[0].x,2);assert.deepEqual(next.players.map(p=>p.score),[0,0]);
});
