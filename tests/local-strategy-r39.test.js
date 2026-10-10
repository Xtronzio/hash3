import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells} from '../src/game.js';
import {advanceEcologyTurn,countHabitatPlacement,initializeHabitats} from '../src/inhabitants.js';
import {pendingInvasionBombs} from '../src/pending-bombs.js';
import {microExpansionChains,microSelectionOptions} from '../src/micro-expansion.js';
import {ecologyNavigationMarkup} from '../src/ecology-navigation.js';
import {ecologyWarningsMarkup,eventOutlook,eventOutlookMarkup} from '../src/event-outlook.js';
import {inventoryStatusMarkup} from '../src/inventory.js';
import {LOCAL_NATURAL_ROTATION,NATURAL_EVENT_ROTATION,pickEventKind,confirmEventKind} from '../src/territory-event-rules.js';
import {savedMapModel} from '../src/saved-map.js';
import {loadLocalGames} from '../src/sessions.js';
const now=100000;
const fresh=()=>createLocal('local','X','O',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});
const move=(r,at=now)=>localCommand(r,'move',availableCells(r,r.pairs[0])[0],at,()=>.7);

test('Warnings wait for three complete turns, survive pause, and ignore cards, Doble first placement and wall-clock ticks',()=>{
 let r=fresh();r.territoryEvents=[{id:'bombs',kind:'invader-rain',region:[{x:2,y:2}],groups:[[{x:2,y:2}]],turnsRemaining:3}];
 r=localCommand(r,'inventory',{playerId:'local-x',tool:'double'},now);assert.equal(r.territoryEvents[0].turnsRemaining,3);
 r=move(r);assert.equal(r.territoryEvents[0].turnsRemaining,3);assert.equal(r.ecologyTurns,0);
 r=localCommand(r,'tick',{},now+999999);assert.equal(r.territoryEvents[0].turnsRemaining,3);
 r=localCommand(r,'pause',{},now);r=localCommand(r,'resume',{},now+999999);assert.equal(r.territoryEvents[0].turnsRemaining,3);
 r=move(r);assert.equal(r.territoryEvents[0].turnsRemaining,2);r=move(r);assert.equal(r.territoryEvents[0].turnsRemaining,1);
 r=move(r);assert.equal(r.territoryEvents.length,0);assert.equal(r.cells.filter(c=>c.symbol==='*').length,1);assert.equal(r.invasions[0].grown,1);
});

test('A due appearance gives a fresh three-turn warning and displays its planned territory before eating',()=>{
 let r=fresh();r.faunaEnabled=true;r.players[0].placements=65;
 countHabitatPlacement(r,'local-x',{x:0,y:0},now,()=>0,{completed:true});
 const rat=r.rodentRaids[0];assert.ok(rat);assert.equal(rat.warningTurns,3);assert.equal(rat.count,1);
 const cells=structuredClone(r.cells);localCommand(r,'tick',{},now+999999);assert.deepEqual(r.cells,cells);
 for(let i=0;i<3;i++)advanceEcologyTurn(r,now,()=>0);
 assert.equal(r.rodentRaids[0].warningTurns,undefined);
 assert.equal(r.rodentRaids[0].turn,0);
});

test('Desplazar transports only a pending bomb, spending one card and preserving its countdown, other bombs and pieces',()=>{
 let r=fresh();r.territoryEvents=[{id:'bombs',kind:'invader-rain',region:[{x:2,y:2},{x:2,y:1}],groups:[[{x:2,y:2}],[{x:2,y:1}]],turnsRemaining:2}];
 r.cells=[{id:'rival',x:1,y:1,symbol:'O',owner:'local-o'}];const before=structuredClone(r.cells);
 const bomb=pendingInvasionBombs(r)[0];
 r=localCommand(r,'inventory',{tool:'shift',playerId:'local-x',bombId:bomb.id,toX:1,toY:1},now);
 assert.deepEqual(r.cells,before);assert.equal(r.territoryEvents[0].turnsRemaining,2);assert.deepEqual(r.territoryEvents[0].region,[{x:1,y:1},{x:2,y:1}]);assert.equal(r.players[0].inventory.cards.shift,0);
 assert.throws(()=>localCommand(r,'inventory',{tool:'shift',playerId:'local-x',bombId:'meteorite',toX:0,toY:0},now));
});

test('+2 and +3 cards add exact adjacent cells by taps without advancing turn, scoring, or overwriting terrain',()=>{
 for(const length of [2,3]){
  let r=fresh();const tool='expand-'+length;r.players[0].inventory.cards[tool]=1;
  const cells=microExpansionChains(r,length)[0];assert.ok(cells);
  r=localCommand(r,'inventory',{playerId:'local-x',tool,cells},now);
  assert.equal(r.terrain.length,9+length);assert.equal(r.pairs[0].turn,'X');assert.equal(r.players[0].score,0);assert.equal(r.ecologyTurns,0);assert.equal(r.players[0].inventory.cards[tool],0);
  assert.equal(new Set(r.terrain.map(c=>c.x+','+c.y)).size,r.terrain.length);
 }
 const capped=fresh();capped.cellTarget=33;capped.terrain=Array.from({length:32},(_,i)=>({x:i%8,y:Math.floor(i/8)}));assert.equal(microSelectionOptions(capped,2).length,0);
});

test('Three dianas follow positions across piece changes, terrain loss, pause and reload, and can be removed without spending a turn',()=>{
 let r=fresh();for(const p of [{x:0,y:0},{x:1,y:0},{x:2,y:0}])r=localCommand(r,'watch-target',p,now);
 assert.throws(()=>localCommand(r,'watch-target',{x:0,y:1},now),/tres/);assert.equal(r.ecologyTurns,0);
 r.terrain=r.terrain.filter(p=>p.x!==0||p.y!==0);const p=r.watchTargets[0];
 assert.equal(savedMapModel(r,r.players[0]).watchTargets[0].id,p.id);
 r=localCommand(r,'pause',{},now);r=localCommand(r,'watch-target',p,now);assert.equal(r.watchTargets.length,2);
 const store=new Map([['hash3_locals',JSON.stringify([r])]]),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 assert.deepEqual(loadLocalGames(storage,now)[0].watchTargets,r.watchTargets);
});

test('Player and territory inventories stay separate; appearance counters differ from announced turn countdowns',()=>{
 const r=fresh();r.players[0].figures=33;r.territoryNextInvasion=27;r.territoryEvents=[{id:'warning',kind:'invader-rain',region:[{x:2,y:2}],turnsRemaining:2}];
 const player=inventoryStatusMarkup(r,{playerId:'local-x'}),territory=ecologyNavigationMarkup(r,'local-x'),warnings=ecologyWarningsMarkup(r);
 assert.doesNotMatch(player,/data-ecology-kind/);assert.doesNotMatch(territory,/data-tool/);
 assert.match(territory,/Próximo intento en 27 colocaciones/);assert.doesNotMatch(territory,/ecology-turn-badge|ecology-clock/);
 assert.match(warnings,/Bombardeo invasor en 2 turnos/);assert.doesNotMatch(warnings,/segundos/);assert.equal(eventOutlook(r,'local-x').timed[0].turns,2);
});

test('Migration replaces old event clocks once without changing scores, stocks, geometry, pins or finished records',()=>{
 const active=fresh();delete active.turnEcologyVersion;active.ruleVersion=12;active.players[0].score=25912;
 active.territoryEvents=[{id:'old',kind:'hurricane',region:[{x:1,y:1}],nextAt:1,remainingMs:12000}];
 const finished=structuredClone(active);finished.id='finished';finished.status='finished';
 const store=new Map([['hash3_locals',JSON.stringify([active,finished])],['hash3_game_pins','["local:'+active.id+'"]']]);const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const games=loadLocalGames(storage,now),first=store.get('hash3_locals');loadLocalGames(storage,now+999999);
 assert.equal(store.get('hash3_locals'),first);assert.equal(games.find(g=>g.id===active.id).territoryEvents[0].turnsRemaining,3);assert.equal(games.find(g=>g.id===active.id).players[0].score,25912);
 assert.deepEqual(games.find(g=>g.id==='finished'),finished);assert.equal(store.get('hash3_game_pins'),'["local:'+active.id+'"]');
});

test('Local small/large event catalogue draws every version; authoritative online catalogue stays unchanged',()=>{
 const r=fresh(),draws=[];for(let i=0;i<LOCAL_NATURAL_ROTATION.length;i++){const choice=pickEventKind(r,'natural',()=>0);draws.push(choice.order[0]);confirmEventKind(r,choice,choice.order[0]);}
 assert.equal(new Set(draws).size,8);assert.ok(draws.includes('contagion'));assert.ok(draws.includes('tornado'));assert.equal(NATURAL_EVENT_ROTATION.length,7);
});


test('Announcement panel distinguishes soldiers, builders, remaining worm meals and invasion growth from upcoming births',()=>{
 const r=fresh();r.works=[{id:'work',done:1,turnsRemaining:2,build:[{x:3,y:0},{x:3,y:1}],destroy:[{x:1,y:0},{x:1,y:1}]}];
 r.worms=[{id:'worm',turnDriven:true,mealLimit:9,eaten:3,turnsSinceMeal:1}];r.invasions=[{id:'colony',kind:'invader-colony',grown:4}];
 const html=eventOutlookMarkup(r,'local-x');assert.match(html,/Soldados/);assert.match(html,/Ampliadores/);assert.match(html,/6 comidas restantes/);assert.match(html,/5<small>casillas hasta el límite/);assert.match(html,/2<small>turnos hasta comer/);
 assert.doesNotMatch(html,/segundos|ecology-clock/);
});


test('An appearance announced on the first Doble placement retains all three warning turns when that same turn finishes',()=>{
 for(const fauna of [false,true]){
  let r=fresh();r.faunaEnabled=fauna;r.territoryEnabled=!fauna;r.players[0].figures=33;r.players[0].placements=fauna?65:0;r.territoryNextInvasion=1;
  r=localCommand(r,'inventory',{playerId:'local-x',tool:'double'},now);r=move(r);
  const pending=game=>fauna?game.rodentRaids[0]:game.territoryEvents[0];assert.ok(pending(r));assert.equal(pending(r).warningTurns??pending(r).turnsRemaining,3);
  r=move(r);assert.equal(pending(r).warningTurns??pending(r).turnsRemaining,3);assert.equal(r.ecologyTurns,1);
  r=move(r);assert.equal(pending(r).warningTurns??pending(r).turnsRemaining,2);
 }
});
