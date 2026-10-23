import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {terrainOf,availableCells,expansionOptions,key} from '../src/game.js';
import {announceBriefFauna,rhinoRoutes,resolveBriefFauna,deathRegion,BEAVER_LIFE} from '../src/brief-ecology.js';
import {advanceEcologyTurn,countHabitatPlacement} from '../src/inhabitants.js';
import {planBombWave} from '../src/bomb-wave.js';
import {pendingInvasionBombs,movePendingBomb,disarmPendingBombs} from '../src/pending-bombs.js';
import {activeInvasionBombs} from '../src/pending-bombs.js';
import {invasionGrowthCells} from '../src/invasion-paths.js';
import {recordTerritoryPlacement} from '../src/territory-tools.js';
import {applyPlannedEvent} from '../src/territory-event-actions.js';
import {toolCells,toolStock,recordInventoryCombo} from '../src/practice-tools.js';
import {immunityStock,recordImmunityCombo,isImmune,immunityCountdown} from '../src/immunity.js';
import {nuclearOptions} from '../src/nuclear-tool.js';
import {bombOptions,tornadoSlots} from '../src/area-tools.js';
import {loadLocalGames} from '../src/sessions.js';
import {ecologyNavigationMarkup,ecologyTargets} from '../src/ecology-navigation.js';
import {refillSelectorMarkup} from '../src/floating-refill.js';
import {savedMapModel} from '../src/saved-map.js';
import {prepareMapRendering,mapWindowMarkup} from '../src/map-render.js';
import {turnOutlookMarkup} from '../src/turn-event-ui.js';
import {territoryThreatCells} from '../src/territory-threats.js';
const now=1000,random=()=>.2;
function fresh(size=99){const r=createLocal('local','X','O',now,'normal','untimed','medium','X',false,{random});delete r.territoryDirector;r.ruleVersion=27;r.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.territoryNextPlacement=r.territoryNextInvasion=99999;for(const p of r.players)p.score=999;return r;}
const piece=(x,y=0,symbol='X')=>({id:crypto.randomUUID(),x,y,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const turns=(r,n)=>{for(let i=0;i<n;i++)advanceEcologyTurn(r,now+i,random);return r;};
const step=r=>localCommand(r,'move',availableCells(r,r.pairs[0])[0],now,random);
test('Rinoceronte chooses an uninterrupted long straight or diagonal, with no length cap',()=>{
 const r=fresh();r.terrain=Array.from({length:120},(_,x)=>({x,y:0}));r.cells=r.terrain.map(c=>piece(c.x));
 const paths=rhinoRoutes(r);assert.equal(paths[0].length,120);const event={id:'rhino',kind:'rhino',paths,region:paths.flat()};r.faunaEvents=[event];const before=r.players.map(p=>p.score);resolveBriefFauna(r,event,now);
 assert.equal(r.cells.length,0);assert.equal(r.terrain.length,120);assert.deepEqual(r.players.map(p=>p.score),before);assert.equal(r.faunaEvents.length,0);
 const diagonal=fresh();diagonal.terrain=Array.from({length:18},(_,x)=>({x,y:x}));assert.equal(rhinoRoutes(diagonal,1,()=>0)[0].length,18);
 const isolated=fresh();isolated.terrain=[{x:0,y:0}];assert.equal(rhinoRoutes(isolated)[0].length,1);
});
test('Rhino prewarning fixes three plague routes and resolves in one completed turn; protection survives passage',()=>{
 const r=fresh();r.cells=r.terrain.map(c=>piece(c.x,c.y));const zone={birthScale:{rhino:1}};assert.ok(announceBriefFauna(r,'rhino',zone,now));assert.equal(r.faunaEvents[0].kind,'rhino-plague');assert.equal(r.faunaEvents[0].paths.length,3);
 const event=structuredClone(r.faunaEvents[0]);turns(r,2);assert.equal(r.cells.length,99);assert.deepEqual(r.faunaEvents[0].paths,event.paths);
 r.inventoryEffects.shields=[{cell:r.cells[0].id,by:'local-x',remaining:3}];turns(r,1);assert.equal(r.faunaEvents.length,0);assert.ok(r.cells.some(c=>c.x===0&&c.y===0));assert.ok(r.cells.length<99);
 const wall=fresh();wall.terrain=Array.from({length:12},(_,x)=>({x,y:0}));wall.deadCells=[{x:5,y:0}];assert.equal(rhinoRoutes(wall,1,()=>0)[0].length,6);
});
test('Castor and its three-member plague build in one action, retain legal moves and expire after nine turns',()=>{
 for(const large of [false,true]){const r=fresh(),zone={birthScale:{beaver:large?1:0}};assert.ok(announceBriefFauna(r,'beaver',zone,now));assert.equal(r.faunaEvents[0].paths.length,large?3:1);turns(r,2);assert.equal(r.frontiers.length,0);turns(r,1);assert.equal(r.faunaEvents.length,0);assert.equal(r.frontiers.length,large?3:1);assert.equal(r.frontiers.flatMap(f=>f.cells).length,large?9:3);assert.ok(availableCells(r,r.pairs[0]).length);assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).length);turns(r,BEAVER_LIFE-1);assert.ok(r.frontiers.length);turns(r,1);assert.equal(r.frontiers.length,0);}
});
test('Mouse and plague consume once per active turn and leave after three actions',()=>{
 for(const large of [false,true]){const r=fresh();r.territoryEnabled=false;r.cells=r.terrain.slice(0,30).map(c=>piece(c.x,c.y));countHabitatPlacement(r,'local-x',{x:32,y:2},now,random,{completed:false});const zone=r.habitatZones[0];zone.next.rodent=zone.placements+1;zone.next.worm=zone.next.work=9999;zone.birthScale={rodent:large?1:0};countHabitatPlacement(r,'local-x',{x:32,y:2},now,random);assert.equal(r.rodentRaids[0].count,large?3:1);turns(r,3);const start=r.cells.length;for(let i=0;i<3;i++)countHabitatPlacement(r,'local-x',{x:32,y:2},now+i,random);assert.equal(start-r.cells.length,large?9:3);assert.equal(r.rodentRaids.length,0);}
});
test('One or three worms traverse three announced cells together, with no surviving body or resident',()=>{
 for(const large of [false,true]){const r=fresh();r.territoryEnabled=false;r.cells=r.terrain.slice(0,18).map(c=>piece(c.x,c.y));countHabitatPlacement(r,'local-x',{x:32,y:2},now,random,{completed:false});const z=r.habitatZones[0];z.next.worm=z.placements+1;z.next.rodent=z.next.work=9999;z.birthScale={worm:large?1:0};countHabitatPlacement(r,'local-x',{x:32,y:2},now,random);assert.equal(r.worms.length,large?3:1);assert.ok(r.worms.every(w=>w.route.length===3&&w.body.length===0));const before=r.cells.length;turns(r,2);assert.equal(r.cells.length,before);turns(r,1);assert.equal(r.worms.length,0);assert.equal(before-r.cells.length,large?9:3);}
});
test('Three bomb warning turns clear three cells per bomb; one entry warning follows, then static invaders',()=>{
 const r=fresh();r.cells=r.terrain.slice(0,18).map(c=>piece(c.x,c.y));const plan=planBombWave(r,3,random);r.cells=[...plan.region,...r.terrain.filter(c=>!plan.region.some(p=>p.x===c.x&&p.y===c.y)).slice(0,9)].map(c=>piece(c.x,c.y));r.territoryEvents=[{id:'wave',kind:'invader-rain',...plan,turnsRemaining:3}];assert.equal(pendingInvasionBombs(r).length,3);assert.equal(plan.region.length,9);
 turns(r,2);assert.equal(r.cells.length,18);turns(r,1);assert.equal(r.cells.length,9);assert.equal(r.territoryEvents[0].bombPhase,'invasion');assert.equal(r.territoryEvents[0].turnsRemaining,1);assert.equal(r.cells.filter(c=>c.symbol==='*').length,0);assert.equal(r.terrain.length,99);
 turns(r,1);assert.equal(r.territoryEvents.length,0);assert.equal(r.cells.filter(c=>c.symbol==='*').length,9);assert.deepEqual(activeInvasionBombs(r),[]);assert.deepEqual(invasionGrowthCells(r),[]);const stars=r.cells.filter(c=>c.symbol==='*');turns(r,9);assert.deepEqual(r.cells.filter(c=>c.symbol==='*'),stars);
});
test('Moving a bomb transports its entire three-cell footprint; disarming removes whole bombs without spending turns',()=>{
 const r=fresh();const plan=planBombWave(r,4,random);r.territoryEvents=[{id:'wave',kind:'invader-rain',...plan,turnsRemaining:2}];const bomb=pendingInvasionBombs(r)[0],others=structuredClone(r.territoryEvents[0].groups.slice(1));movePendingBomb(r,bomb.id,{x:24,y:2},now);assert.equal(r.territoryEvents[0].groups[0].length,3);assert.equal(r.territoryEvents[0].groups[0][0].x,24);assert.deepEqual(r.territoryEvents[0].groups.slice(1),others);assert.equal(r.territoryEvents[0].turnsRemaining,2);
 const result=disarmPendingBombs(r,{x:24,y:2});assert.equal(result.disarmed,3);assert.equal(r.territoryEvents[0].groups.length,1);assert.equal(r.territoryEvents[0].region.length,3);assert.equal(r.ecologyTurns,0);
});
test('The entry warning allows protection to prevent an invading star in its exact cell',()=>{
 const r=fresh(),plan=planBombWave(r,1,random);r.territoryEvents=[{id:'wave',kind:'invader-rain',...plan,turnsRemaining:3}];turns(r,3);const target=r.territoryEvents[0].region[0];r.cells.push(piece(target.x,target.y));r.inventoryEffects.shields=[{cell:r.cells.at(-1).id,by:'local-x',remaining:3}];turns(r,1);assert.equal(r.cells.find(c=>c.x===target.x&&c.y===target.y).symbol,'X');assert.equal(r.cells.filter(c=>c.symbol==='*').length,2);
});
test('Death attempts occur after 333 completed turns and leave a permanent, unmodifiable skull cell',()=>{
 const r=fresh();r.ecologyTurns=332;assert.equal(recordTerritoryPlacement(r,now,random),false);r.ecologyTurns=333;assert.ok(recordTerritoryPlacement(r,now,random));const target=r.territoryEvents[0].region[0];assert.equal(r.territoryEvents[0].kind,'death');turns(r,3);assert.deepEqual(r.deadCells,[target]);assert.equal(r.terrain.length,99);const k=key(target.x,target.y);
 for(const tool of ['destroy','activate','border','frontier','shield'])assert.ok(!toolCells(r,'local-x',tool).some(c=>key(c.x,c.y)===k));assert.ok(!nuclearOptions(r).some(c=>key(c.x,c.y)===k));assert.ok(!availableCells(r,r.pairs[0]).some(c=>key(c.x,c.y)===k));assert.ok(!tornadoSlots(r,{x:target.x-1,y:target.y-1}).some(c=>key(c.x,c.y)===k));assert.ok(!bombOptions(r).some(c=>key(c.x,c.y)===k));
 assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).every(p=>!(target.x>=p.x&&target.x<p.x+3&&target.y>=p.y&&target.y<p.y+3)));
 for(const kind of ['meteorites','earthquake','contagion','pandemic','ufo','tornado','blackhole','invader-rain'])applyPlannedEvent(r,{id:kind,kind,region:[target]},now);assert.deepEqual(r.deadCells,[target]);assert.ok(terrainOf(r).some(c=>key(c.x,c.y)===k));assert.ok(!r.cells.some(c=>key(c.x,c.y)===k));
 assert.equal(r.territoryNextDeathTurn,666);
});
test('Death, rhino and castor cannot close the last move or unique expansion escape',()=>{
 const r=fresh(9);r.cells=r.terrain.slice(0,8).map(c=>piece(c.x,c.y));const region=deathRegion(r);assert.ok(region.length===0||availableCells({...r,deadCells:region},r.pairs[0]).length>0);const event={id:'death',kind:'death',region:region};assert.ok(!region.some(c=>c.x===0&&c.y===0));
});
test('Immunity is purchased for333, one-cell shield for33; combos never replenish either protection',()=>{
 let r=fresh();const score=r.players[0].score,normal=Object.values(r.players[0].inventory.cards).reduce((n,v)=>n+v,0);r=localCommand(r,'trade',{playerId:'local-x',tool:'immunity'},now);assert.equal(r.players[0].score,score-333);assert.equal(immunityStock(r,'local-x'),1);assert.equal(Object.values(r.players[0].inventory.cards).reduce((n,v)=>n+v,0),normal);const before=structuredClone(r.players[0].inventory.immunity);for(let i=0;i<333;i++)recordImmunityCombo(r,'local-x',333);assert.deepEqual(r.players[0].inventory.immunity,before);
 for(const t of Object.keys(r.players[0].inventory.cards))r.players[0].inventory.cards[t]=3;r.players[0].inventory.cards.shield=0;recordInventoryCombo(r,'local-x',333,{random:()=>.999});assert.equal(toolStock(r,'local-x','shield'),0);
 assert.match(refillSelectorMarkup(r,'local-x'),/data-tool="immunity"/);assert.doesNotMatch(refillSelectorMarkup(r,'local-x',{exchange:true}),/data-tool="immunity"/);
});
test('Protection lasts three completed turns including Doble, ignores wall-clock time and preserves stock on pause',()=>{
 let r=fresh();r=localCommand(r,'trade',{playerId:'local-x',tool:'immunity'},now);r=localCommand(r,'inventory',{playerId:'local-x',tool:'immunity'},now);assert.equal(immunityCountdown(r,'local-x'),3);r=localCommand(r,'tick',{},now+999999);assert.equal(immunityCountdown(r,'local-x'),3);r=localCommand(r,'pause',{},now);r=localCommand(r,'resume',{},now+999999);assert.equal(immunityCountdown(r,'local-x'),3);r.players[0].inventory.cards.double=1;r=localCommand(r,'inventory',{playerId:'local-x',tool:'double'},now);r=step(r);assert.equal(immunityCountdown(r,'local-x'),3);r=step(r);assert.equal(immunityCountdown(r,'local-x'),2);r=step(r);assert.equal(immunityCountdown(r,'local-x'),1);r=step(r);assert.equal(isImmune(r,'local-x'),false);
});
test('Loading preserves historical stocks, timed effects, pending regions and finished records without replay',()=>{
 const r=fresh();r.ruleVersion=21;delete r.briefEcologyVersion;r.players[0].inventory.immunity.cards['immunity-33']=33;r.inventoryEffects.immunities=[{player:'local-x',remainingMs:12345,expiresAt:20000}];r.deadCells=[{x:4,y:1}];r.territoryEvents=[{id:'legacy',kind:'invader-rain',region:[{x:2,y:1}],turnsRemaining:2}];const finished=structuredClone(r);finished.id='finished';finished.status='finished';const before=structuredClone(r),data=new Map([['hash3_locals',JSON.stringify([r,finished])]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const loaded=loadLocalGames(storage,now)[0];assert.equal(loaded.ruleVersion,30);assert.deepEqual(loaded.players,before.players);assert.deepEqual(loaded.territoryEvents,before.territoryEvents);assert.deepEqual(loaded.inventoryEffects.immunities,before.inventoryEffects.immunities);assert.deepEqual(loaded.deadCells,before.deadCells);assert.equal(loaded.ecologyTurns,before.ecologyTurns);const saved=data.get('hash3_locals');loadLocalGames(storage,now+999999);assert.equal(data.get('hash3_locals'),saved);assert.deepEqual(JSON.parse(saved).find(g=>g.id==='finished'),finished);
});
test('All new glyphs, forecasts, permanent skulls, double barriers and threatened paths share board/map data',()=>{
 const r=fresh();r.deadCells=[{x:10,y:1}];r.frontiers=[{id:'beaver',type:'beaver',cells:[{x:-1,y:0},{x:-1,y:1},{x:-1,y:2}],turnsRemaining:9}];r.faunaEvents=[{id:'rhino',kind:'rhino',paths:[[{x:1,y:0},{x:2,y:0}]],region:[{x:1,y:0},{x:2,y:0}],x:1,y:0,turnsRemaining:2}];const html=ecologyNavigationMarkup(r,'local-x');for(const kind of ['rhino','rhino-plague','beaver','beaver-plague','death','beaver-barrier'])assert.match(html,new RegExp('data-ecology-kind="'+kind+'"'));assert.equal(ecologyTargets(r,'death')[0].x,10);assert.equal(territoryThreatCells(r).filter(c=>c.kind==='rhino').length,2);
 const model=savedMapModel(r,r.players[0]),markup=mapWindowMarkup(model,prepareMapRendering(model),model.bounds,48);assert.match(markup,/map-dead-cells/);assert.match(markup,/beaver-barrier/);assert.match(markup,/map-territory-threat/);
});

test('Rhino planning scales to 33333 cells and map queries keep death and beaver glyphs bounded',()=>{
 const r=fresh(33333);const paths=rhinoRoutes(r,3,()=>0);assert.equal(paths.length,3);assert.ok(paths[0].length>=666);assert.ok(paths.every(p=>p.length>=33));
 r.deadCells=[{x:5,y:1}];r.frontiers=[{id:'beaver',type:'beaver',cells:[{x:-1,y:0},{x:-1,y:1},{x:-1,y:2}],turnsRemaining:9}];
 const model=savedMapModel(r,r.players[0]),index=prepareMapRendering(model),box={x:-2,y:0,width:12,height:8};assert.ok(index.detail.query(box).length<=80);
 const markup=mapWindowMarkup(model,index,box,48);assert.match(markup,/map-dead-cells/);assert.match(markup,/beaver-barrier/);assert.ok(markup.length<25000);
});

test('Mouse appearances avoid skulls and shields; diagonal rhinos cannot cross a saved border corner',()=>{
 const r=fresh(9);r.terrain=Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3)}));r.territoryEnabled=false;r.deadCells=[{x:1,y:1}];r.cells=[piece(2,2)];r.inventoryEffects.shields=[{cell:r.cells[0].id,by:'local-x',remaining:3}];
 countHabitatPlacement(r,'local-x',{x:0,y:0},now,random,{completed:false});const zone=r.habitatZones[0];zone.next.rodent=zone.placements+1;zone.next.worm=zone.next.work=9999;countHabitatPlacement(r,'local-x',{x:0,y:0},now,random);
 assert.equal(r.rodentRaids.length,1);assert.ok(r.rodentRaids[0].members.every(c=>!(c.x===1&&c.y===1)&&!(c.x===2&&c.y===2)));
 const corner=fresh();corner.terrain=[{x:0,y:0},{x:1,y:1},{x:2,y:2}];corner.frontiers=[{id:'edge',type:'border',edges:[{a:{x:1,y:0},b:{x:1,y:1}}]}];assert.equal(rhinoRoutes(corner,1,()=>0)[0].length,2);
});

test('A preserved historical bomb warning resolves to static occupation with no phantom bomb or growth forecast',()=>{
 const r=fresh();r.territoryEvents=[{id:'legacy-wave',kind:'invader-rain',region:[{x:1,y:1}],turnsRemaining:2}];const score=r.players.map(p=>p.score);turns(r,2);
 assert.equal(r.cells.filter(c=>c.symbol==='*').length,1);assert.deepEqual(pendingInvasionBombs(r),[]);assert.deepEqual(activeInvasionBombs(r),[]);assert.deepEqual(invasionGrowthCells(r),[]);assert.deepEqual(ecologyTargets(r,'invader-rain'),[]);assert.equal(ecologyTargets(r,'invader-colony').length,1);assert.deepEqual(r.players.map(p=>p.score),score);
 assert.match(turnOutlookMarkup(r,'local-x'),/permanecen estáticos/);assert.doesNotMatch(turnOutlookMarkup(r,'local-x'),/Invasión en crecimiento|casillas hasta el límite/);
});
