import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells,key} from '../src/game.js';
import {initializeHabitats} from '../src/inhabitants.js';
import {ecologyNavigationMarkup,phenomenonTargets} from '../src/ecology-navigation.js';
import {territoryThreatCells} from '../src/territory-threats.js';
import {overviewModel} from '../src/map-overview.js';
import {prepareMapRendering,mapWindowMarkup} from '../src/map-render.js';
import {loadLocalGames} from '../src/sessions.js';
import {simulateTurns} from '../scripts/simulate-ecology-turns.mjs';
const now=1000,random=()=>.4;
const fresh=()=>createLocal('local','X','O',now,'normal','untimed','medium','X',false,{random,faunaEnabled:true});
const move=r=>localCommand(r,'move',availableCells(r,r.pairs[0])[0],now,random);
const badge=(r,kind)=>ecologyNavigationMarkup(r,'local-x').match(new RegExp('<button[^>]*data-ecology-kind="'+kind+'"[^>]*>[^]*?<\\/button>'))[0];
test('A committed tornado counts continuously through Doble and pause; future types have no fixed date',()=>{
 let r=fresh();r.terrain=Array.from({length:333},(_,i)=>({x:i%33,y:Math.floor(i/33)}));
 r.territoryPlans.natural='tornado';r.territoryNextPlacement=21;assert.match(badge(r,'tornado'),/>…</);
 r.territoryEvents=[{id:'committed',kind:'tornado',region:[{x:2,y:2}],turnsRemaining:3}];
 r=localCommand(r,'pause',{},now);r=localCommand(r,'resume',{},now+999999);assert.match(badge(r,'tornado'),/>−3</);
 r.players[0].inventory.cards.double=1;r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now,random);
 r=move(r);assert.equal(r.ecologyTurns,0);assert.match(badge(r,'tornado'),/>−3</);
 r=move(r);assert.equal(r.ecologyTurns,1);assert.match(badge(r,'tornado'),/>−2</);
 r=move(r);assert.match(badge(r,'tornado'),/>−1</);r=move(r);assert.equal(r.territoryEvents.some(e=>e.id==='committed'),false);
});

test('Loading an R60 save reserves future types once without replay or changing warning, score and stock',()=>{
 const r=fresh();r.ruleVersion=20;delete r.territoryPlanVersion;delete r.territoryPlans;r.ecologyTurns=100;r.players[0].placements=200;r.players[0].score=25912;r.territoryNextPlacement=290;r.territoryNextInvasion=220;
 r.territoryEvents=[{id:'c',kind:'contagion',region:[{x:1,y:1}],turnsRemaining:2}];
 const finished=structuredClone(r);finished.id='finished';finished.status='finished';const data=new Map([['hash3_locals',JSON.stringify([r,finished])]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const loaded=loadLocalGames(storage,now)[0];assert.equal(loaded.ruleVersion,26);assert.equal(loaded.territoryNextPlacement,133);assert.equal(loaded.territoryNextInvasion,120);assert.equal(loaded.territoryEvents[0].turnsRemaining,2);assert.equal(loaded.players[0].score,25912);assert.deepEqual(loaded.players[0].inventory,r.players[0].inventory);
 const saved=data.get('hash3_locals');loadLocalGames(storage,now+999999);assert.equal(data.get('hash3_locals'),saved);assert.deepEqual(JSON.parse(saved).find(g=>g.id==='finished'),finished);
});
test('Fauna and neutral forecasts advance only when Doble finishes, never on wall-clock ticks',()=>{
 let r=fresh();r.players[0].inventory.cards.double=1;r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now,random);r=move(r);
 assert.equal(r.habitatZones[0].placements,0);assert.equal(r.players[0].ecologyPlacements,0);assert.match(badge(r,'worm'),/>…</);
 r=localCommand(r,'tick',{},now+999999,random);assert.match(badge(r,'worm'),/>…</);r=move(r);assert.equal(r.habitatZones[0].placements,1);assert.equal(r.players[0].ecologyPlacements,1);assert.match(badge(r,'worm'),/>…</);assert.match(badge(r,'neutral'),/>−8</);
});
test('Every natural kind participates in the more frequent cycle with both invasion types still present',()=>{
 const result=simulateTurns({seed:61,size:999,moves:420});assert.equal(result.completed,true);
 for(const kind of ['meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','ufo','invader-rain','invader-colony'])assert.ok(result.announcements[kind]>0,kind);
 const natural=Object.entries(result.announcements).filter(([kind])=>!kind.startsWith('invader-')).reduce((n,[,v])=>n+v,0);assert.ok(natural>=10);assert.ok(result.rodentMeals>0&&result.wormMeals>0);
});
test('All announced threat regions, bombs off terrain and soldiers use the same overlay without adding terrain',()=>{
 const r=fresh();r.territoryEvents=[...['contagion','pandemic','tornado','hurricane','meteorites','earthquake','ufo','invader-colony'].map((kind,i)=>({id:kind,kind,region:[{x:i+10,y:0}],turnsRemaining:3})),{id:'bomb',kind:'invader-rain',region:[{x:-1,y:1}],turnsRemaining:2}];r.bombs=[{id:'legacy',blast:[{x:20,y:0}]}];r.works=[{id:'soldier',destroy:[{x:1,y:1}],build:[{x:3,y:1}],done:0,turnsRemaining:3}];
 const before=structuredClone(r),points=territoryThreatCells(r);for(const k of ['-1,1','1,1','20,0',...Array.from({length:8},(_,i)=>`${i+10},0`)])assert.ok(points.some(p=>key(p.x,p.y)===k),k);assert.ok(!points.some(p=>p.x===3&&p.y===1));assert.deepEqual(r,before);
 assert.equal(phenomenonTargets(r,'invader-rain')[0].x,-1);
 const model=overviewModel(r,r.players[0],null),markup=mapWindowMarkup(model,prepareMapRendering(model),{x:-2,y:-2,width:30,height:8},48);assert.match(markup,/map-territory-threat/);assert.match(markup,/stroke-dasharray=".12 .08"/);assert.match(markup,/x="-0.96"/);assert.equal(model.terrain.length,r.terrain.length+1);assert.equal(r.terrain.length,9);
});
test('Safe cells exclude immunity, shields, antidotes, anchors and blocked invasion entry; black-hole halo is threatened',()=>{
 const r=fresh();r.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));r.cells=[{id:'x',x:1,y:1,symbol:'X',owner:'local-x'},{id:'o',x:2,y:1,symbol:'O',owner:'local-o'}];r.inventoryEffects.immunities=[{player:'local-x',expiresAt:now+33000}];r.inventoryEffects.shields=[{cell:'o',remaining:3}];r.frontiers=[{cells:[{x:4,y:1}]}];
 r.territoryEvents=[{id:'contagion',kind:'contagion',region:[{x:1,y:1},{x:2,y:1},{x:3,y:1}],antidotes:[{x:3,y:1}]},{id:'bomb',kind:'invader-rain',region:[{x:4,y:1}],paths:[{target:{x:4,y:1},path:[{x:4,y:1}]}]},{id:'meteorites',kind:'meteorites',region:[{x:0,y:0}]},{id:'hole',kind:'blackhole',region:[{x:7,y:5}]}];
 const points=territoryThreatCells(r);for(const k of ['1,1','2,1','3,1','4,1','0,0'])assert.ok(!points.some(p=>key(p.x,p.y)===k),k);assert.ok(points.some(p=>p.x===10&&p.y===8));
});
