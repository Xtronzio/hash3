import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {key} from '../src/game.js';
import {plannedEventRegion,applyPlannedEvent} from '../src/territory-event-actions.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {impactCount} from '../src/territory-event-rules.js';
import {phenomenonTargets} from '../src/ecology-navigation.js';
import {loadLocalGames} from '../src/sessions.js';
import {backpackIcon,backpackPath} from '../src/backpack-icon.js';
import {hallIcon} from '../src/hall.js';
import {territoryBandMarkup} from '../src/inventory-personalization.js';
import {pausedInventorySummaryMarkup} from '../src/paused-inventory.js';
import {savedGameSettings} from '../src/saved-game-settings.js';
import {gamesMarkup} from '../src/session-ui.js';

const now=1000;
const fresh=()=>createLocal('local','Jorge','Rival',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});
const square=(x,y)=>Array.from({length:9},(_,i)=>({x:x+i%3,y:y+Math.floor(i/3)}));
test('The territorial Tornado reserves exactly three complete disjoint squares, including a tight 3×9 strip',()=>{
 for(const terrain of [Array.from({length:27},(_,i)=>({x:i%9,y:Math.floor(i/9)})),[...square(-10,-10),...square(2,0),...square(15,7)]]){
  const r=fresh();r.terrain=terrain;const before=structuredClone(r);
  for(const rng of [()=>0,()=>.5,()=>.999]){
   const plan=plannedEventRegion(r,'tornado',rng,now);assert.equal(plan.groups.length,3);assert.deepEqual(plan.groups.map(g=>g.length),[9,9,9]);
   assert.equal(new Set(plan.region.map(c=>key(c.x,c.y))).size,27);assert.equal(impactCount(r,'tornado'),27);
   assert.ok(plan.region.every(c=>terrain.some(t=>t.x===c.x&&t.y===c.y)));r.territoryEvents=[{id:'triple',kind:'tornado',...plan,turnsRemaining:3}];assert.equal(phenomenonTargets(r,'tornado').length,3);r.territoryEvents=[];
  }
  assert.deepEqual(r,before);
 }
 const tooSmall=fresh();tooSmall.terrain=[...square(0,0),...square(9,0)];assert.deepEqual(plannedEventRegion(tooSmall,'tornado',()=>.5,now),[]);
});
test('Each of the three tornados only moves its own pieces and preserves protected cells, terrain and stock',()=>{
 const r=fresh();r.terrain=[...square(0,0),...square(6,0),...square(12,0)];const plan=plannedEventRegion(r,'tornado',()=>.5,now);
 r.cells=plan.groups.flatMap((group,g)=>group.filter((_,i)=>i<7).map((p,i)=>({...p,id:g+':'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'})));
 const protectedPiece=r.cells[0];r.inventoryEffects.shields=[{cell:protectedPiece.id,by:protectedPiece.owner,remaining:3}];const before=structuredClone(r);
 applyPlannedEvent(r,{id:'three-squares',kind:'tornado',...plan},now);
 for(const c of r.cells){const group=plan.groups[Number(c.id.split(':')[0])];assert.ok(group.some(p=>p.x===c.x&&p.y===c.y));}
 assert.deepEqual(r.cells.find(c=>c.id===protectedPiece.id),protectedPiece);assert.deepEqual(r.terrain,before.terrain);assert.deepEqual(r.players,before.players);assert.equal(new Set(r.cells.map(c=>c.id)).size,before.cells.length);
});
test('Three simultaneous landings pay both signs and bonuses once, without passive inventory refill',()=>{
 const r=fresh(),groups=[square(0,0),square(6,0),square(12,0)];r.terrain=groups.flat();r.players.forEach((p,i)=>{p.score=100*(i+1);p.figures=2;});
 r.cells=groups.flatMap((g,j)=>[['X',0,0],['X',1,0],['O',2,0],['O',0,2],['O',1,2],['X',2,2]].map(([symbol,x,y],i)=>({id:j+':'+i,x:g[0].x+x,y,symbol,owner:'local-'+symbol.toLowerCase()})));
 const inventories=structuredClone(r.players.map(p=>p.inventory)),terrain=structuredClone(r.terrain);
 r.territoryEvents=[{id:'triple-r68-4',kind:'tornado',region:groups.flat(),groups,turnsRemaining:0}];advanceTerritory(r,now);
 assert.deepEqual(r.players.map(p=>p.score),[109,206]);assert.deepEqual(r.players.map(p=>p.figures),[4,3]);assert.deepEqual(r.players.map(p=>p.inventory),inventories);assert.deepEqual(r.terrain,terrain);
 const saved=JSON.parse(JSON.stringify(r));advanceTerritory(saved,now+999999);assert.deepEqual(saved.players.map(p=>p.score),[109,206]);assert.deepEqual(saved.players.map(p=>p.inventory),inventories);
});
test('Historical single-square warnings and finished records survive the rules upgrade without replay',()=>{
 const r=fresh();r.status='paused';r.ruleVersion=22;r.players[0].score=25912;r.players[0].inventory.cards.frontier=96;r.inventoryPreferences={'local-x':{inventoryCollapsed:true}};
 r.territoryEvents=[{id:'already-announced',kind:'tornado',region:square(0,0),turnsRemaining:2}];const done=structuredClone(r);done.id='done';done.status='finished';
 const data=new Map([['hash3_locals',JSON.stringify([r,done])]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},loaded=loadLocalGames(storage,now)[0];
 assert.equal(loaded.ruleVersion,28);assert.deepEqual(loaded.players,r.players);assert.deepEqual(loaded.territoryEvents,r.territoryEvents);assert.deepEqual(loaded.inventoryPreferences,r.inventoryPreferences);
 assert.deepEqual(JSON.parse(data.get('hash3_locals')).find(g=>g.id==='done'),done);const stored=data.get('hash3_locals');loadLocalGames(storage,now+999999);assert.equal(data.get('hash3_locals'),stored);
 const legacy=fresh();legacy.ruleVersion=22;assert.equal(plannedEventRegion(legacy,'tornado',()=>.5,now).length,9);
});
test('Every backpack uses the unmarked counter master, while owner capacities remain independent',()=>{
 const r=fresh(),before=structuredClone(r);r.players[0].inventory.cards.double=3;
 assert.equal(hallIcon('inventory'),backpackIcon());assert.match(territoryBandMarkup('',{}),/data-icon="backpack"/);
 const bags=pausedInventorySummaryMarkup(r,'local-x');assert.equal((bags.match(/data-icon="backpack"/g)||[]).length,2);assert.ok(bags.includes(backpackPath));assert.doesNotMatch(bags,/cx="16" cy="20"|m12 16 8 8/);
 assert.deepEqual(r.terrain,before.terrain);
});
test('Saved settings show actual independent inventories and disabled ecology without changing saves',()=>{
 const r=createLocal('solo','Jorge','',now,'advanced','untimed','pro','O',true,{playerInventory:false,faunaEnabled:false,territoryEnabled:true}),before=structuredClone(r);
 const settings=savedGameSettings(r),by=Object.fromEntries(settings.map(s=>[s.id,s]));
 assert.equal(by['player-inventory'].enabled,false);assert.equal(by['machine-inventory'].enabled,true);assert.equal(by.fauna.enabled,false);assert.equal(by.territory.enabled,true);assert.equal(by.figures.value,'advanced');assert.equal(by.difficulty.value,'pro');assert.deepEqual(r,before);
 const markup=gamesMarkup({local:[r],pins:['local:'+r.id]});assert.match(markup,/data-setting="player-inventory" data-enabled="false"/);assert.match(markup,/data-setting="machine-inventory" data-enabled="true"/);assert.match(markup,/saved-game-setting-off/);assert.match(markup,/Desancla la partida para borrarla/);assert.deepEqual(r,before);
 delete r.playerInventory;delete r.faunaEnabled;delete r.territoryEnabled;assert.equal(savedGameSettings(r).find(s=>s.id==='player-inventory').enabled,true);assert.equal(savedGameSettings(r).find(s=>s.id==='fauna').enabled,true);
});
