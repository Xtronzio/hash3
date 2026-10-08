import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeInventory,completeInventoryTurn} from '../src/practice-tools.js';
import {initializeHabitats} from '../src/inhabitants.js';
import {frontierEdges} from '../src/frontiers.js';
import {loadLocalGames,loadGamePins,toggleGamePin} from '../src/sessions.js';
const now=1700000000000;
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
function legacy(){
 const g=createLocal('local','A','B',now,'normal','untimed');delete g.wallMigrationVersion;
 g.frontiers=[{id:'three-x',by:'local-x',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]},{id:'edge-o',by:'local-o',edges:frontierEdges({x:0,y:0,side:'west'})},{id:'single',by:'local-x',cells:[{x:1,y:-1}]}];
 return g;
}
test('Old three-cell and edge barriers become exactly one Muro each for their respective owner, without changing play state',()=>{
 const g=legacy(),before=structuredClone(g);g.players[0].inventory.cards.frontier=2;
 initializeInventory(g);assert.deepEqual(g.frontiers,[before.frontiers[2]]);
 assert.equal(g.players[0].inventory.cards.frontier,3);assert.equal(g.players[1].inventory.cards.frontier,1);
 assert.equal(g.players[0].inventory.wallRefunds,1);assert.equal(g.players[1].inventory.wallRefunds,1);
 for(const key of ['terrain','cells','forms','pairs','status','clockNow'])assert.deepEqual(g[key],before[key]);
 assert.deepEqual(g.players.map(p=>[p.score,p.figures,p.placements,p.inventory.received,p.inventory.draws]),before.players.map(p=>[p.score,p.figures,p.placements,p.inventory.received,p.inventory.draws]));
 const converted=structuredClone(g);initializeInventory(g);assert.deepEqual(g,converted);
});
test('Refunds above per-card caps are preserved without duplicate migration or drawing more of that type',()=>{
 const g=legacy();for(let i=0;i<9;i++)g.frontiers.push({id:'extra-'+i,by:'local-x',cells:[{x:10+i,y:0},{x:10+i,y:1},{x:10+i,y:2}]});
 initializeInventory(g);assert.equal(g.players[0].inventory.cards.frontier,10);assert.equal(Object.values(g.players[0].inventory.cards).reduce((n,c)=>n+c,0),18);
 const stored=JSON.parse(JSON.stringify(g));initializeInventory(stored);assert.equal(stored.players[0].inventory.cards.frontier,10);
 for(let i=0;i<6;i++)completeInventoryTurn(stored,'local-x');assert.equal(stored.players[0].inventory.draws,6);assert.equal(stored.players[0].inventory.cards.frontier,10);
});
test('A refunded expander can use one new wall in the same pending phase; no unknown-owner barrier is destroyed',()=>{
 const g=legacy();g.players[0].figures=333;g.players[0].inventory.cards['hint-expand']=1;Object.assign(g.pairs[0],{pending:1,optionalExpansion:true,strategicExpansion:true,expander:'local-x',frontierUsed:true});
 g.frontiers.push({id:'orphan',by:'missing',cells:[{x:8,y:0},{x:8,y:1},{x:8,y:2}]});
 const next=localCommand(g,'inventory',{tool:'frontier',playerId:'local-x',x:3,y:0},now);
 assert.equal(g.frontiers.length,4);assert.deepEqual(next.frontiers.map(f=>f.id).slice(0,2),['single','orphan']);
 assert.equal(next.frontiers.at(-1).cells.length,1);assert.equal(next.players[0].inventory.cards.frontier,0);assert.equal(next.pairs[0].frontierUsed,true);
});
test('Loading paused, active and finished local saves persists conversion and refunds once while retaining pins, clocks, scores and unknown entries',()=>{
 const storage=memory(),games=[];
 for(const status of ['paused','playing','finished']){const g=legacy();g.status=status;g.players[0].score=333;g.pauseRemainingMs=12000;g.players[0].freeExpansionVersion=2;g.players[0].figures=13;g.players[0].freeExpansions=4;games.push(g);}
 const unknown={id:'recoverable',partial:'retain'};storage.setItem('hash3_locals',JSON.stringify([...games,unknown]));toggleGamePin(storage,games[0]);const pins=loadGamePins(storage);
 const loaded=loadLocalGames(storage,now+999999);assert.equal(loaded.length,3);
 for(const g of loaded){assert.equal(g.frontiers.length,1);assert.equal(g.players[0].inventory.cards.frontier,1);assert.equal(g.players[0].score,333);assert.equal(g.pauseRemainingMs,12000);assert.equal(g.players[0].freeExpansions,4);assert.equal(g.players[0].nextFreeExpansionFigure,undefined);assert.equal(g.updatedAt,games.find(old=>old.id===g.id).updatedAt);}
 const first=storage.getItem('hash3_locals');loadLocalGames(storage);assert.equal(storage.getItem('hash3_locals'),first);assert.deepEqual(loadGamePins(storage),pins);assert.deepEqual(JSON.parse(first).at(-1),unknown);
 const original=legacy(),limited=memory();limited.setItem('hash3_locals',JSON.stringify([original]));const blocked={getItem:limited.getItem,setItem:()=>{throw Error('quota');}};
 assert.throws(()=>loadLocalGames(blocked),/quota/);assert.deepEqual(JSON.parse(limited.getItem('hash3_locals'))[0],original);
});
test('Old fauna counters shorten proportionally once, without creating residents or changing live clocks and credits',()=>{
 const g=createLocal('local','A','B',now,'normal','untimed');delete g.habitatFrequencyVersion;
 g.habitatZones=[{x:0,y:0,placements:20,next:{rodent:33,worm:99,work:198,bomb:66},credit:{worm:.4,work:.7}}];
 g.worms=[{id:'live',x:0,y:0,body:[{x:0,y:0}],eaten:1,nextAt:now+28000}];const before=structuredClone(g.worms);
 initializeHabitats(g,now+1000);assert.equal(g.habitatZones[0].next.rodent,33);assert.equal(g.habitatZones[0].next.worm,47);assert.equal(g.habitatZones[0].next.work,80);assert.deepEqual(g.habitatZones[0].credit,{worm:.4,work:.7});assert.deepEqual(g.worms,before);assert.equal(g.works.length,0);
 const saved=structuredClone(g);initializeHabitats(g,now+999999);assert.deepEqual(g,saved);
});
