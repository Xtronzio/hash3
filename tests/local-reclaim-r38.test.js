import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {figureWindows,prepareFigureIndex,key,availableCells} from '../src/game.js';
import {machineMoveScore,chooseMachineMove} from '../src/machine.js';
import {placeNeutral,neutralFrequency} from '../src/neutral.js';
import {countHabitatPlacement,advanceHabitats,habitatMark} from '../src/inhabitants.js';
import {advanceTerritory,rebalanceAfterTerritory} from '../src/territory-tools.js';
import {applyPlannedEvent} from '../src/territory-event-actions.js';
import {seedInvasions,advanceInvasions,invasionGrowthCells} from '../src/invasion-paths.js';
import {ecologyNavigationMarkup,ecologyMapPins,ecologyPinTargets} from '../src/ecology-navigation.js';
import {savedMapModel} from '../src/saved-map.js';
import {prepareMapRendering,mapWindowMarkup} from '../src/map-render.js';
import {loadLocalGames} from '../src/sessions.js';
import {activateImmunity} from '../src/immunity.js';
import {scoreFeedback} from '../src/feedback.js';
const now=1000;
const board=(n=99)=>{const r=createLocal('local','X','O',now,'normal','untimed');r.terrain=Array.from({length:n},(_,i)=>({x:i%11,y:Math.floor(i/11)}));return r;};
const piece=(symbol,x,y)=>({id:crypto.randomUUID(),symbol,x,y,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const random=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
const event=(r,points)=>{r.territoryEvents=[{id:'flip',kind:'pandemic',region:points,nextAt:now}];return advanceTerritory(r,now);};

test('A shared wildcard scores either placing symbol, stays # and is highlighted with the completed figure',()=>{
 for(const symbol of ['X','O']){
  const r=board();r.faunaEnabled=false;r.pairs[0].turn=symbol;r.cells=[piece('#',0,0),piece(symbol,1,0)];
  const n=localCommand(r,'move',{x:2,y:0},now,()=>0),p=n.players.find(p=>p.symbol===symbol);
  assert.equal(p.score,3);assert.equal(p.figures,1);assert.equal(n.cells.find(c=>c.x===0&&c.y===0).symbol,'#');
  assert.deepEqual(scoreFeedback(r,n).cells.map(c=>key(c.x,c.y)).sort(),['0,0','1,0','2,0']);
  assert.ok(!availableCells(n,n.pairs[0]).some(c=>c.x===0&&c.y===0));
 }
});
test('The same shared # can complete X and O figures independently without passive or repeated payouts',()=>{
 let r=board();r.faunaEnabled=false;r.cells=[piece('#',1,1),piece('X',0,1),piece('O',1,0)];
 r=localCommand(r,'move',{x:2,y:1},now,()=>0);r=localCommand(r,'move',{x:1,y:2},now,()=>0);
 assert.deepEqual(r.players.map(p=>p.score),[3,3]);assert.equal(r.forms.length,2);
 const previous=r.players.map(p=>p.score);r=localCommand(r,'tick',{},now+9999);assert.deepEqual(r.players.map(p=>p.score),previous);
});
test('# appearance completes no paid figure and a remote placement cannot collect a latent figure',()=>{
 const r=board();r.faunaEnabled=false;r.cells=[piece('X',0,0),piece('X',1,0)];
 placeNeutral(r,[{x:2,y:0},{x:4,y:4}],now,()=>0);assert.equal(r.players[0].score,0);assert.equal(r.forms.length,0);
 const n=localCommand(r,'move',{x:8,y:8},now,()=>0);assert.equal(n.players[0].score,0);assert.equal(n.forms.length,0);
});
test('Wildcards follow Ficha rival/contraria placed color and pay its player with normal bonus and credits',()=>{
 let r=board();r.faunaEnabled=false;r.cells=[piece('#',0,0),piece('O',1,0)];r.players[1].figures=2;
 // A rival effect forces the actual placement to O, independently of whose turn it is.
 r.inventoryEffects.forced=[{player:'local-x',symbol:'O',by:'local-o'}];
 r=localCommand(r,'move',{x:2,y:0},now,()=>0);assert.equal(r.players[0].score,0);assert.equal(r.players[1].score,6);assert.equal(r.players[1].figures,3);assert.ok(r.pairs[0].credits>=1);
 let converted=board();converted.faunaEnabled=false;converted.cells=[piece('#',0,0),piece('X',1,0),piece('O',2,0)];converted=localCommand(converted,'inventory',{tool:'opposite',playerId:'local-x',x:2,y:0},now,()=>0);assert.equal(converted.players[0].score,3);assert.equal(converted.players[1].score,0);
});
test('Indexed wildcard figures and AI speculation agree with the referee on mixed boards and paid forms',()=>{
 const rng=random(38);
 for(const level of ['normal','advanced'])for(let i=0;i<16;i++){
  const r=board(55);r.faunaEnabled=false;r.territoryEnabled=false;r.level=level;r.cells=r.terrain.slice(0,25).flatMap(c=>rng()<.25?[]:[piece(['X','O','#','*'][Math.floor(rng()*4)],c.x,c.y)]);
  r.players.forEach(p=>p.figures=2);
  const empty=r.terrain.filter(p=>!r.cells.some(c=>key(c.x,c.y)===key(p.x,p.y))).slice(0,4);
  for(const symbol of ['X','O'])for(const p of empty){
   r.pairs[0].turn=symbol;const cs=[...r.cells,piece(symbol,p.x,p.y)],fs=figureWindows(cs,p.x,p.y,symbol,level,null,true);
   assert.deepEqual(figureWindows(cs,p.x,p.y,symbol,level,prepareFigureIndex(cs,true)),fs);
   r.forms=fs.filter(()=>rng()<.3).map(f=>f.id);const figures=fs.filter(f=>!r.forms.includes(f.id));
   const expected={figures:figures.length,points:figures.reduce((n,f)=>n+f.size,0)+3*Math.floor((2+figures.length)/3)};
   assert.deepEqual(machineMoveScore(r,p,symbol),expected);
  }
 }
});
test('More frequent local # attempts never pay historical milestones and preserve online frequency',()=>{
 const r=board();r.faunaEnabled=false;
 for(let i=1;i<=27;i++){countHabitatPlacement(r,'local-x',{x:5,y:5},now,()=>0);assert.equal(r.cells.length,Math.floor(i/9));}
 assert.equal(r.players[0].score,0);assert.equal(r.forms.length,0);assert.equal(neutralFrequency(r),9);assert.equal(neutralFrequency({...r,mode:'world'}),33);
 const old=board();old.players[0].placements=1422;const n=localCommand(old,'tick',{},now,()=>0);assert.equal(n.cells.length,0);
});
test('Pandemic flips all four symbols, preserves terrain and points, and removes colony identity from recovered #',()=>{
 const r=board();seedInvasions(r,[{x:2,y:0}],'invader-colony');r.cells.push(piece('X',0,0),piece('O',1,0),piece('#',3,0));
 const ids=r.cells.map(c=>c.id).sort(),terrain=structuredClone(r.terrain);r.players[0].score=25912;
 event(r,Array.from({length:4},(_,x)=>({x,y:0})));
 assert.deepEqual(r.cells.slice().sort((a,b)=>a.x-b.x).map(c=>c.symbol),['O','X','#','*']);assert.deepEqual(r.cells.map(c=>c.id).sort(),ids);
 assert.equal(r.cells.find(c=>c.x===0).owner,'local-o');assert.equal(r.cells.find(c=>c.x===1).owner,'local-x');
 assert.equal(r.cells.find(c=>c.x===2).invasionId,undefined);assert.equal(r.invasions.length,0);assert.deepEqual(r.terrain,terrain);assert.equal(r.players[0].score,25912);assert.equal(r.landingEvent,undefined);
 assert.deepEqual(advanceInvasions(r,now,()=>0),[]);
});
test('Repeated pandemic does not revive a recovered colony and clears stale last-move ownership',()=>{
 const r=board();seedInvasions(r,[{x:2,y:0}],'invader-colony');const x=piece('X',0,0);r.cells.push(x);r.players[0].lastMove={...x};
 event(r,[{x:0,y:0},{x:2,y:0}]);assert.equal(r.players[0].lastMove,undefined);
 delete r.ecologyRecovery;event(r,[{x:0,y:0},{x:2,y:0}]);assert.equal(r.cells.find(c=>c.x===2).symbol,'*');assert.equal(r.cells.find(c=>c.x===2).invasionId,undefined);assert.deepEqual(invasionGrowthCells(r),[]);
});
test('Pandemic respects immunity, shields, work reservations and worm trails; legacy online pandemic still vacates',()=>{
 const r=board();r.cells=[piece('X',0,0),piece('O',1,0),piece('*',2,0),piece('#',3,0),piece('O',4,0)];
 activateImmunity(r,'local-x',now);r.inventoryEffects.shields=[{cell:r.cells[1].id,remaining:3}];r.worms=[{id:'w',body:[{x:2,y:0}]}];r.works=[{build:[],destroy:[{x:3,y:0}],done:0}];
 applyPlannedEvent(r,{id:'p',kind:'pandemic',region:r.cells.map(c=>({x:c.x,y:c.y}))},now);
 assert.deepEqual(r.cells.map(c=>c.symbol),['X','O','*','#','X']);
 const online=board();online.mode='world';online.cells=[piece('*',1,0),piece('#',2,0)];applyPlannedEvent(online,{id:'p',kind:'pandemic',region:[{x:1,y:0},{x:2,y:0}]},now);assert.equal(online.cells.length,0);
});
test('Habitants can fully reconquer nine occupied cells while builders add nine playable cells',()=>{
 const r=board(333);seedInvasions(r,[{x:1,y:0}],'invader-colony');const cid=r.invasions[0].id;r.cells.push(...Array.from({length:8},(_,i)=>({...piece('*',i+2,0),invasionId:cid})));
 countHabitatPlacement(r,'local-x',{x:10,y:5},now,()=>0,{completed:false});const z=r.habitatZones[0];z.next.work=z.placements+1;z.next.rodent=z.next.worm=9999;
 countHabitatPlacement(r,'local-x',{x:10,y:5},now+1,()=>0,{completed:false});assert.equal(r.works.length,3);assert.equal(r.works.flatMap(w=>w.destroy).length,9);const recovered=r.cells.map(c=>key(c.x,c.y));
 for(let i=1;i<=3;i++)advanceHabitats(r,now+1+i*33000,()=>0);
 assert.equal(r.cells.filter(c=>c.symbol==='*').length,0);assert.equal(r.terrain.length,342);assert.equal(r.works.length,0);assert.equal(r.invasions.length,0);
 assert.ok(recovered.every(k=>r.terrain.some(c=>key(c.x,c.y)===k)));assert.ok(recovered.every(k=>availableCells(r,r.pairs[0]).some(c=>key(c.x,c.y)===k)));
});
test('Reconquerers never erase X/O/# if a reserved invasive cell changes before their intervention',()=>{
 for(const symbol of ['X','O','#']){
  const r=board();r.cells=[piece(symbol,1,0)];r.works=[{id:'w',kind:'work',reconquer:true,destroy:[{x:1,y:0}],build:[{x:-1,y:0}],done:0,nextAt:now}];
  advanceHabitats(r,now);assert.equal(r.cells[0].symbol,symbol);assert.equal(r.terrain.length,100);
 }
});
test('Builders respect walls and the declared cell goal and stop at the actual cap',()=>{
 let r=board(32);r.cellTarget=33;r.works=[{id:'w',kind:'work',reconquer:true,destroy:[],build:[{x:-1,y:0},{x:-1,y:1}],done:0,nextAt:now}];
 r=localCommand(r,'tick',{},now,()=>0);assert.equal(r.terrain.length,33);assert.equal(r.status,'finished');assert.equal(r.finalResult.ruleVersion,12);
 const blocked=board();blocked.frontiers=[{id:'wall',cells:[{x:-1,y:0}],by:'local-x'}];blocked.works=[{id:'w',kind:'work',reconquer:true,destroy:[],build:[{x:-1,y:0}],done:0,nextAt:now}];advanceHabitats(blocked,now);assert.equal(blocked.terrain.length,99);
});
test('Migration of a paused R37 test save is atomic and idempotent, with pins and finished records preserved',()=>{
 const r=board(991);r.status='paused';r.ruleVersion=11;r.players[0].score=25912;r.players[0].placements=1422;delete r.inhabitantReclaimVersion;
 r.works=[{id:'old',kind:'work',done:0,destroy:[{x:0,y:0}],build:[{x:-1,y:0}],remainingMs:12345,nextAt:15000}];
 const finished=structuredClone(r);finished.id='finished';finished.status='finished';const values=new Map([['hash3_locals',JSON.stringify([r,finished])],['hash3_game_pins',JSON.stringify(['local:'+r.id])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const before=structuredClone(r),games=loadLocalGames(storage,999999),loaded=games.find(g=>g.id===r.id);assert.equal(loaded.works[0].reconquer,true);assert.equal(loaded.works[0].remainingMs,12345);
 assert.deepEqual(loaded.terrain,before.terrain);assert.deepEqual(loaded.players,before.players);assert.deepEqual(games.find(g=>g.id==='finished'),finished);assert.equal(storage.getItem('hash3_game_pins'),JSON.stringify(['local:'+r.id]));
 const saved=storage.getItem('hash3_locals');loadLocalGames(storage,9999999);assert.equal(storage.getItem('hash3_locals'),saved);
});
test('Only invasion cells with legal next territory have dashed frames; fully grown and static marks do not',()=>{
 const r=board();seedInvasions(r,[{x:2,y:2}],'invader-colony');r.cells.push(piece('*',8,8));
 assert.deepEqual(invasionGrowthCells(r),[{x:2,y:2}]);const paused={...r,status:'paused'};assert.deepEqual(invasionGrowthCells(paused),invasionGrowthCells(r));
 const model=savedMapModel(r,r.players[0]),markup=mapWindowMarkup(model,prepareMapRendering(model),model.bounds,48);assert.match(markup,/class="map-invasion-growth"/);assert.match(markup,/stroke-dasharray=".12 .08"/);assert.equal((markup.match(/puede expandirse/g)||[]).length,1);
 r.invasions[0].grown=9;assert.deepEqual(invasionGrowthCells(r),[]);r.invasions[0].grown=1;r.frontiers=[{cells:[[2,1],[2,3],[1,2],[3,2]].map(([x,y])=>({x,y}))}];assert.deepEqual(invasionGrowthCells(r),[]);
});
test('Worm heads and live invasion pins/navigation carry no numeric counters',()=>{
 const r=board();seedInvasions(r,[{x:2,y:2}],'invader-colony');const w={id:'w',kind:'worm',x:4,y:4,body:[{x:4,y:4}],turnDriven:true,mealLimit:9,eaten:4,turnsSinceMeal:1};r.worms=[w];
 assert.doesNotMatch(habitatMark('worm','',w),/<b>|4\/9|↷|ecology-clock/);
 const pins=ecologyMapPins(ecologyPinTargets(r));assert.doesNotMatch(pins,/<text|4\/9|1\/9/);
 assert.doesNotMatch(ecologyNavigationMarkup(r,'local-x'),/Casillas invadidas de nueve|Turnos hasta la próxima comida|1\/9/);
});

test('Automatic placement also uses #, while online default figures and AI keep # as a blocking mark',()=>{
 const r=board();r.faunaEnabled=false;r.timeMode='timed';r.pairs[0].deadline=new Date(now).toISOString();r.cells=[piece('#',0,0),piece('X',1,0)];
 const automatic=localCommand(r,'tick',{},now,()=>0);assert.equal(automatic.players[0].score,3);assert.equal(automatic.lastEvent.automatic,true);
 const online={...r,mode:'world'};assert.equal(machineMoveScore(online,{x:2,y:0},'X').points,0);assert.equal(figureWindows([...r.cells,piece('X',2,0)],2,0,'X').length,0);
});
test('Erase ends the last live seed immediately; empty recovered tiles remain playable',()=>{
 let r=board();r.faunaEnabled=false;seedInvasions(r,[{x:2,y:0}],'invader-colony');r=localCommand(r,'inventory',{tool:'erase',playerId:'local-x',x:2,y:0},now,()=>0);
 assert.equal(r.invasions.length,0);assert.ok(availableCells(r,r.pairs[0]).some(c=>c.x===2&&c.y===0));
});
