import {nuclearOptions,nuclearBlast} from '../src/nuclear-tool.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,LOCAL_RULE_VERSION} from '../src/local.js';
import {advanceEcologyTurn} from '../src/inhabitants.js';
import {anacondaRoute,announceAnaconda,advanceAnacondas,ANACONDA_BODY} from '../src/anaconda.js';
import {rhinoRoutes,announceBriefFauna} from '../src/brief-ecology.js';
import {rememberRoute,routeHistoryIndex,routeNovelty} from '../src/fauna-routes.js';
import {activateFog,fogKeys,perceivedRoom} from '../src/fog.js';
import {plannedEventRegion} from '../src/territory-event-actions.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {pickEventKind,confirmEventKind} from '../src/territory-event-rules.js';
import {availableCells,key} from '../src/game.js';
import {habitatBlocked} from '../src/habitat-tools.js';
import {savedMapModel} from '../src/saved-map.js';
import {mapWindowMarkup,prepareMapRendering} from '../src/map-render.js';
import {chooseMachineMove} from '../src/machine.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {toolCells} from '../src/practice-tools.js';
import {loadLocalGames} from '../src/sessions.js';
import {captureTransfer,encodeTransfer,decodeTransfer} from '../src/local-transfer.js';
const now=1700000000000;
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
function fresh(side=12){const r=createLocal('local','A','B',now,'normal','untimed','medium','X',false,{random:rng(3)});r.terrain=Array.from({length:side*side},(_,i)=>({x:i%side,y:Math.floor(i/side)}));r.territoryNextPlacement=r.territoryNextInvasion=r.territoryNextDeathTurn=999999;r.players.forEach(p=>{p.score=100;p.figures=0;});return r;}
const piece=(x,y,symbol='X')=>({id:key(x,y),x,y,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const points=n=>Array.from({length:n},(_,x)=>({x,y:0}));
function snakeRoom(n){const r=fresh();r.territoryEnabled=false;r.terrain=[...points(n),...points(9).map(p=>({...p,y:3}))];r.cells=points(n).map(c=>piece(c.x,c.y));r.anacondas=[{id:'snake',kind:'anaconda',x:0,y:0,route:points(n),cursor:0,body:[],warningTurns:3}];return r;}
const advance=(r,n=1)=>{for(let i=0;i<n;i++)advanceEcologyTurn(r,now+i,rng(i+3));};
test('Anaconda warns three turns then traverses exactly three orthogonal cells each turn, ending with one or two steps',()=>{
 for(const length of [10,11]){const r=snakeRoom(length),scores=r.players.map(p=>p.score);advance(r,2);assert.equal(r.anacondas[0].cursor,0);advance(r);assert.equal(r.anacondas[0].cursor,3);assert.equal(r.cells.length,length-3);advance(r,2);assert.equal(r.anacondas[0].cursor,9);assert.equal(r.anacondas[0].body.length,ANACONDA_BODY);assert.ok(habitatBlocked(r,8,0));advance(r);assert.equal(r.anacondas.length,0);assert.equal(r.cells.length,0);assert.deepEqual(r.players.map(p=>p.score),scores);assert.equal(habitatBlocked(r,8,0),false);}
});
test('New walks are self-avoiding, side-adjacent and stop at barriers/protected cells; no arbitrary life cap',()=>{
 const r=fresh(33);r.deadCells=[{x:5,y:5}];r.frontiers=[{id:'wall',cells:[{x:4,y:4}],by:'local-x'}];r.cells=[piece(8,8)];r.inventoryEffects.shields=[{cell:'8,8',remaining:3}];const path=anacondaRoute(r,rng(42));assert.ok(path.length>3);assert.equal(new Set(path.map(c=>key(c.x,c.y))).size,path.length);
 path.forEach((c,i)=>{assert.ok(!['5,5','4,4','8,8'].includes(key(c.x,c.y)));if(i)assert.equal(Math.abs(c.x-path[i-1].x)+Math.abs(c.y-path[i-1].y),1);});
});
test('Anaconda respects a newly built wall, latest placement, last playable hole and immutable scores',()=>{
 const r=snakeRoom(12);delete r.anacondas[0].warningTurns;r.frontiers=[{id:'wall',cells:[{x:1,y:0}]}];advanceAnacondas(r,now,new Set(['snake']));assert.equal(r.cells.length,11);assert.equal(r.anacondas.length,0);
 const placed=snakeRoom(12);delete placed.anacondas[0].warningTurns;advanceAnacondas(placed,now,new Set(['snake']),{x:0,y:0});assert.equal(placed.cells.length,12);assert.equal(placed.anacondas.length,0);
 const last=fresh(3);last.territoryEnabled=false;last.cells=last.terrain.slice(1).map(c=>piece(c.x,c.y));last.anacondas=[{id:'snake',x:0,y:0,kind:'anaconda',route:[{x:0,y:0},{x:1,y:0}],cursor:0,body:[]}];advanceAnacondas(last,now,new Set(['snake']));assert.ok(availableCells(last,last.pairs[0]).length);assert.equal(last.anacondas.length,0);
});
test('Doble and pause/save do not accelerate or reset anaconda, warning or route history',()=>{
 let r=snakeRoom(21);r.players[0].inventory.cards.double=1;rememberRoute(r,'anaconda',points(21));const history=structuredClone(r.faunaRouteHistory);
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now);r=localCommand(r,'move',{x:0,y:3},now);assert.equal(r.anacondas[0].warningTurns,3);r=localCommand(r,'move',{x:1,y:3},now);assert.equal(r.anacondas[0].warningTurns,2);
 r=localCommand(r,'pause',{},now);r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+999999);assert.equal(r.anacondas[0].warningTurns,2);assert.deepEqual(r.faunaRouteHistory,history);
});
test('Rhinoceros selection varies direction/zone; reverse and trimmed copies are rejected persistently',()=>{
 const r=fresh(12),paths=[];for(let seed=1;seed<=18;seed++){const p=rhinoRoutes(r,1,rng(seed))[0];if(!p)break;assert.ok(routeNovelty(p,routeHistoryIndex(r,'rhino'))>=0);rememberRoute(r,'rhino',p);paths.push(p);}
 assert.ok(paths.length>9);assert.ok(new Set(paths.map(p=>Math.sign(p.at(-1).x-p[0].x)+','+Math.sign(p.at(-1).y-p[0].y))).size>=3);
 const narrow=fresh();narrow.terrain=points(30);rememberRoute(narrow,'rhino',points(30));assert.equal(routeNovelty(points(30).reverse(),routeHistoryIndex(narrow,'rhino')),-1);assert.equal(routeNovelty(points(30).slice(1,-1),routeHistoryIndex(narrow,'rhino')),-1);assert.deepEqual(rhinoRoutes(JSON.parse(JSON.stringify(narrow)),3,rng(2)),[]);
 const plague=fresh(12),z={birthScale:{rhino:1}};assert.ok(announceBriefFauna(plague,'rhino',z,now,rng(4)));assert.equal(plague.faunaRouteHistory.length,3);
});
test('Anaconda appearances keep their past paths; no history reset on exhaustion',()=>{
 const r=fresh();r.terrain=points(21);r.terrain.push(...points(9).map(p=>({...p,y:3})));assert.ok(announceAnaconda(r,now,rng(3)));const history=structuredClone(r.faunaRouteHistory);r.anacondas=[];const path=r.terrain.filter(c=>c.y===0);rememberRoute(r,'anaconda',path);rememberRoute(r,'anaconda',r.terrain.filter(c=>c.y===3));assert.equal(announceAnaconda(r,now,rng(3)),false);assert.deepEqual(r.faunaRouteHistory.slice(0,history.length),history);
});
test('Clouds plan exactly three separated connected trios; fog plans exactly 33 compact cells or skips',()=>{
 const r=fresh(12),clouds=plannedEventRegion(r,'clouds',rng(5),now),fog=plannedEventRegion(r,'fog',rng(8),now);assert.equal(clouds.groups.length,3);assert.deepEqual(clouds.groups.map(g=>g.length),[3,3,3]);assert.equal(new Set(clouds.region.map(c=>key(c.x,c.y))).size,9);assert.equal(fog.length,33);
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)assert.ok(clouds.groups[a].every(c=>clouds.groups[b].every(p=>Math.max(Math.abs(c.x-p.x),Math.abs(c.y-p.y))>1)));
 assert.deepEqual(plannedEventRegion(fresh(3),'fog',rng(2),now),[]);assert.deepEqual(plannedEventRegion(fresh(3),'clouds',rng(2),now),[]);
});
test('Fog warning and active duration last three full turns; empty hidden cells remain playable and score truthfully',()=>{
 let r=fresh(9);r.faunaEnabled=false;r.cells=[piece(0,0),piece(1,0)];r.territoryEvents=[{id:'fog',kind:'fog',region:points(3),turnsRemaining:3}];advance(r,2);assert.equal(r.fogEffects.length,0);advance(r);assert.equal(r.fogEffects[0].turnsRemaining,3);assert.ok(fogKeys(r).has('2,0'));const stock=structuredClone(r.players.map(p=>p.inventory.cards));
 r=localCommand(r,'move',{x:2,y:0},now);assert.equal(r.players[0].score,103);assert.equal(r.fogEffects[0].turnsRemaining,2);r=localCommand(r,'pause',{},now);const remaining=r.fogEffects[0].turnsRemaining;r=localCommand(JSON.parse(JSON.stringify(r)),'resume',{},now+999999);assert.equal(r.fogEffects[0].turnsRemaining,remaining);advance(r,2);assert.equal(r.fogEffects.length,0);assert.deepEqual(r.players.map(p=>p.inventory.cards),stock);
});
test('Fog activation/expiry preserves every piece, owner, paid figure, points and territory',()=>{
 const r=fresh(9);r.cells=[piece(0,0),piece(1,0,'O'),piece(2,0,'#'),piece(3,0,'*')];r.forms=['X:line:1,1;2,1;3,1'];r.territoryEvents=[{id:'c',kind:'clouds',region:points(9),turnsRemaining:0}];const before=structuredClone({cells:r.cells,forms:r.forms,terrain:r.terrain,players:r.players});advanceTerritory(r,now);assert.deepEqual({cells:r.cells,forms:r.forms,terrain:r.terrain,players:r.players},before);advance(r,3);assert.deepEqual(r.cells,before.cells);assert.deepEqual(r.forms,before.forms);
});
test('Machine memory sees pre-fog signs but never new hidden identities; both decision engines are invariant',()=>{
 const r=fresh(9);r.mode='solo';r.humanId='local-x';r.machineInventory=true;r.pairs[0].turn='O';r.cells=[piece(0,0,'X')];activateFog(r,{id:'f',kind:'fog'},points(9));r.cells[0].symbol='O';r.cells[0].owner='local-o';r.cells.push(piece(1,0,'X'));
 const p=perceivedRoom(r);assert.equal(p.cells[0].symbol,'X');assert.equal(p.cells[1].symbol,'?');assert.equal(p.cells[1].owner,null);const other=structuredClone(r);other.cells[0].symbol='#';other.cells[1].symbol='O';
 assert.deepEqual(chooseMachineMove(r,rng(33)),chooseMachineMove(other,rng(33)));assert.deepEqual(chooseMachineCard(r,now),chooseMachineCard(other,now));assert.ok(toolCells(r,'local-o','erase').every(c=>c.y!==0));
});
test('All map surfaces conceal X/O/*/# colors and accessible symbols while retaining empty/occupied distinction',()=>{
 const r=fresh(9);r.cells=[piece(0,0),piece(1,0,'O'),piece(2,0,'#'),piece(3,0,'*')];activateFog(r,{id:'f',kind:'fog'},points(5));const model=savedMapModel(r,r.players[0]);const covered=model.terrain.filter(c=>c.y===0&&c.x<5);assert.ok(covered.every(c=>c.symbol===undefined));assert.equal(new Set(covered.slice(0,4).map(c=>c.fill)).size,1);assert.notEqual(covered[0].fill,covered[4].fill);
 const box={x:0,y:0,width:5,height:1},markup=mapWindowMarkup(model,prepareMapRendering(model),box,48);assert.match(markup,/map-fog/);assert.doesNotMatch(markup,/data-symbol=/);
});
test('The ten-kind natural bag survives serialization and exhausts without repeats',()=>{
 let r=fresh(),seen=[];for(let i=0;i<10;i++){const choice=pickEventKind(r,'natural',rng(i));seen.push(choice.order[0]);confirmEventKind(r,choice);r=JSON.parse(JSON.stringify(r));}assert.equal(new Set(seen).size,10);assert.ok(seen.includes('clouds')&&seen.includes('fog'));
});
test('Migration is idempotent and full transfer preserves snake progress, history, fog, stock and finished records',async()=>{
 const r=snakeRoom(12);r.territoryEnabled=true;activateFog(r,{id:'f',kind:'clouds'},points(3));rememberRoute(r,'anaconda',points(12));r.status='paused';r.ruleVersion=23;delete r.faunaRouteVersion;const done=structuredClone(r);done.id='finished';done.status='finished';const data=new Map([['hash3_locals',JSON.stringify([r,done])]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const games=loadLocalGames(storage,now);assert.equal(games[0].ruleVersion,LOCAL_RULE_VERSION);const saved=data.get('hash3_locals');loadLocalGames(storage,now+999999);assert.equal(data.get('hash3_locals'),saved);assert.deepEqual(JSON.parse(saved).find(g=>g.id==='finished'),done);
 const copy=captureTransfer(storage,{ids:[r.id],now}),decoded=await decodeTransfer(await encodeTransfer(copy));assert.deepEqual(decoded.data.games[0].anacondas,r.anacondas);assert.deepEqual(decoded.data.games[0].fogEffects,r.fogEffects);assert.deepEqual(decoded.data.games[0].faunaRouteHistory,r.faunaRouteHistory);
});

test('A live anaconda follows new legal continuations and detours around later walls without teleporting or revisiting',()=>{
 const r=snakeRoom(4);delete r.anacondas[0].warningTurns;advanceAnacondas(r,now,new Set(['snake']));assert.equal(r.anacondas[0].cursor,3);r.terrain.push({x:3,y:1},{x:3,y:2});advanceAnacondas(r,now,new Set(['snake']));assert.equal(r.anacondas[0].cursor,6);assert.equal(r.anacondas[0].y,2);assert.equal(new Set(r.anacondas[0].route.slice(0,6).map(c=>key(c.x,c.y))).size,6);
 const d=snakeRoom(8);delete d.anacondas[0].warningTurns;d.terrain.push({x:0,y:1},{x:1,y:1},{x:2,y:1});d.frontiers=[{id:'late',cells:[{x:1,y:0}]}];advanceAnacondas(d,now,new Set(['snake']),null,()=>0);assert.equal(d.anacondas[0].cursor,3);assert.deepEqual(d.anacondas[0].route.slice(0,3),[{x:0,y:0},{x:0,y:1},{x:1,y:1}]);
});

test('Every machine level and nuclear targeting respect the full live anaconda body, not just its head',()=>{
 const r=fresh(3);r.cells=[piece(0,0,'X'),piece(1,0,'X')];r.anacondas=[{id:'body',kind:'anaconda',x:0,y:2,route:[{x:2,y:0},{x:2,y:1},{x:1,y:1},{x:0,y:1},{x:0,y:2}],cursor:5,body:[{x:2,y:0},{x:2,y:1},{x:1,y:1},{x:0,y:1},{x:0,y:2}]}];
 for(const difficulty of ['basic','medium','high','pro']){const choice=chooseMachineMove({...r,difficulty},rng(33),{maxNodes:1000,maxTimeMs:50});assert.ok(availableCells(r,r.pairs[0]).some(c=>c.x===choice.payload.x&&c.y===choice.payload.y));}
 const body=new Set(r.anacondas[0].body.map(c=>key(c.x,c.y)));assert.ok(nuclearOptions(r).every(c=>!body.has(key(c.x,c.y))));assert.ok(nuclearBlast(r,{x:1,y:0}).every(c=>!body.has(key(c.x,c.y))));
});

test('Concealment preserves active inventory blocks and eaten-cell markers without consuming or clearing them',()=>{
 const r=fresh(9);r.inventoryEffects.blocks=[{x:5,y:0,by:'local-x',remaining:3,fresh:true}];r.eatenCells=[{x:6,y:0}];r.territoryEvents=[{id:'cloud',kind:'clouds',region:points(9),turnsRemaining:0}];const effects=structuredClone(r.inventoryEffects),eaten=structuredClone(r.eatenCells);advanceTerritory(r,now);assert.deepEqual(r.inventoryEffects,effects);assert.deepEqual(r.eatenCells,eaten);
});
