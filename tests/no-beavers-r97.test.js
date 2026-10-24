import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,reconcileLocalBoard} from '../src/local.js';
import {SELECTABLE_FAUNA,STORED_FAUNA,normalizeFauna,retireBeavers,faunaKindEnabled,faunaComparison} from '../src/fauna-selection.js';
import {territoryPressure,territoryCandidates,markTerritoryGrowth,validTerritoryDirector} from '../src/territory-director.js';
import {announceBriefFauna,resolveBriefFauna,briefFrequencies} from '../src/brief-ecology.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {ecologyNavigationMarkup} from '../src/ecology-navigation.js';
import {territoryGuideMarkup} from '../src/territory-guide.js';
import {faunaPickerMarkup} from '../src/phenomena-ui.js';
import {turnOutlook} from '../src/turn-event-ui.js';
import {loadLocalGames} from '../src/sessions.js';
import {captureTransfer,validateTransfer,encodeTransfer,decodeTransfer} from '../src/local-transfer.js';
import {territoryComparisonKey} from '../src/achievements.js';
const NOW=1800000000000;
function board(mode='local'){
 const g=createLocal(mode,'Jorge','Rival',NOW,'normal','untimed','medium','X',false,{fauna:STORED_FAUNA});
 g.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));g.cells=g.terrain.slice(0,60).map((c,i)=>({...c,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));markTerritoryGrowth(g);return g;
}
function legacy(){
 const g=board();g.ruleVersion=27;g.fauna=[...STORED_FAUNA];g.status='paused';
 g.faunaEvents=[{id:'castor',kind:'beaver-plague',paths:[[{x:0,y:7},{x:1,y:7},{x:2,y:7}]],region:[{x:0,y:7}],x:0,y:7,turnsRemaining:2},{id:'rhino',kind:'rhino',paths:[[{x:0,y:0}]],region:[{x:0,y:0}],x:0,y:0,turnsRemaining:2}];
 g.frontiers=[{id:'dam',type:'beaver',cells:[{x:3,y:7},{x:4,y:7},{x:5,y:7}],turnsRemaining:6},{id:'border',type:'border',by:'local-x',cells:[{x:8,y:7}]},{id:'wall',by:'local-o',cells:[{x:-1,y:0}]}];
 g.territoryEvents=[{id:'weather',kind:'clouds',region:[{x:0,y:3}],turnsRemaining:2}];
 g.territoryDirector.last={kind:'beaver-plague',family:'fauna',tier:'large',turn:0};g.territoryDirector.recent=['beaver','ufo','beaver-plague'];Object.assign(g.territoryDirector.rhythm,{load:5,episode:2});
 g.habitatZones=[{id:'zone',x:0,y:0,placements:10,next:{rodent:40,beaver:30},credit:{beaver:.5},birthScale:{beaver:2}}];return g;
}
test('New local and machine games offer eleven choices and cannot announce or resolve a castor',()=>{
 assert.equal(SELECTABLE_FAUNA.length,11);assert.deepEqual(normalizeFauna(STORED_FAUNA),SELECTABLE_FAUNA);
 for(const mode of ['local','solo']){const g=board(mode);assert.equal(g.ruleVersion,31);assert.deepEqual(g.fauna,SELECTABLE_FAUNA);assert.equal(briefFrequencies(g).beaver,undefined);
 for(const kind of ['beaver','beaver-plague','beaver-barrier'])assert.equal(faunaKindEnabled(g,kind),false);
 for(const scale of [0,1])assert.equal(announceBriefFauna(g,'beaver',{birthScale:{beaver:scale}},NOW,()=>0),false);
 resolveBriefFauna(g,{id:'injected',kind:'beaver',paths:[[{x:0,y:7},{x:1,y:7},{x:2,y:7}]]},NOW,()=>0);assert.equal(g.frontiers.length,0);
 for(const candidate of territoryCandidates(g,()=>0))assert.ok(!candidate.kind.startsWith('beaver'));
 for(const html of [faunaPickerMarkup(),territoryGuideMarkup(g,'local-x'),ecologyNavigationMarkup(g,'local-x')])assert.doesNotMatch(html,/data-(?:fauna|ecology-kind)="beaver|territory:beaver|Castor|castor/);
 assert.ok(!turnOutlook(g,'local-x').rows.some(r=>r.kind==='beaver'));
 }
});
test('Saved retirement is atomic and idempotent; it preserves unrelated commitments, economy, rhythm and pins',()=>{
 const g=legacy(),before=structuredClone(g),done=structuredClone(g);done.id='done';done.status='finished';
 const values=new Map([['hash3_locals',JSON.stringify([g,done])],['hash3_game_pins',JSON.stringify(['local:'+g.id])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const games=loadLocalGames(storage,NOW),next=games.find(x=>x.id===g.id);assert.equal(next.ruleVersion,31);assert.deepEqual(next.fauna,SELECTABLE_FAUNA);assert.deepEqual(next.faunaEvents,[before.faunaEvents[1]]);assert.deepEqual(next.frontiers,before.frontiers.slice(1));
 for(const field of ['terrain','cells','forms','players','pairs','territoryEvents','ecologyTurns','territoryDirector','updatedAt'])assert.deepEqual(next[field],before[field],field);
 assert.equal(next.habitatZones[0].next.beaver,undefined);assert.equal(next.habitatZones[0].next.rodent,40);assert.deepEqual(games.find(x=>x.id==='done'),done);assert.equal(values.get('hash3_game_pins'),JSON.stringify(['local:'+g.id]));
 const saved=values.get('hash3_locals');loadLocalGames(storage,NOW+999999);assert.equal(values.get('hash3_locals'),saved);retireBeavers(next);assert.deepEqual(JSON.parse(saved).find(x=>x.id===g.id),next);
 const broken={getItem:k=>k==='hash3_locals'?JSON.stringify([before]):null,setItem(){throw Error('quota');}};assert.throws(()=>loadLocalGames(broken,NOW),/quota/);assert.deepEqual(JSON.parse(broken.getItem('hash3_locals')),[before]);
});
test('Old transfer payloads and result comparison keep historical castor keys instead of losing the save',async()=>{
 const g=legacy(),result={game:'historic',mode:'local',kind:'move-limit',limit:33,ruleVersion:27,fauna:[...STORED_FAUNA],players:g.players};
 const data={format:'hash33-local-transfer',version:1,id:'legacy',createdAt:new Date(NOW).toISOString(),name:'Jorge',games:[g],results:[result],pins:[g.id]};
 const before=structuredClone(data);assert.equal(validateTransfer(data),data);assert.equal(validTerritoryDirector(g),true);assert.deepEqual((await decodeTransfer(await encodeTransfer(data))).data,before);assert.deepEqual(data,before);
 assert.equal(faunaComparison(result),null);assert.notEqual(territoryComparisonKey(result),territoryComparisonKey({...result,fauna:SELECTABLE_FAUNA}));
 const storage={getItem:k=>k==='hash3_locals'?JSON.stringify([g]):null,setItem(){}};const copy=captureTransfer(storage,{now:NOW});assert.deepEqual(copy.games[0].frontiers,g.frontiers.slice(1));assert.deepEqual(g,before.games[0]);
});
test('Retired castors consume no pressure slot; existing recovery is not reset or replaced by a burst',()=>{
 const g=legacy();g.status='playing';g.ruleVersion=28;g.faunaEvents=g.faunaEvents.slice(0,1);g.territoryEvents=[];
 assert.deepEqual(territoryPressure(g),{fauna:[],weather:[]});const rhythm=structuredClone(g.territoryDirector.rhythm);retireBeavers(g);assert.deepEqual(g.territoryDirector.rhythm,rhythm);assert.deepEqual(territoryCandidates(g,()=>0),[]);
});
test('A full board still expands before a committed clearing, with no lost turn or accelerated warning',()=>{
 let g=board();g.cells=g.terrain.map((c,i)=>({...c,id:String(i),symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));g=reconcileLocalBoard(g,NOW);assert.equal(g.pairs[0].pending,1);
 g.territoryEvents=[{id:'clear',kind:'ufo',region:g.terrain.slice(0,3),turnsRemaining:1}];const before=structuredClone(g),options=expansionOptions(g.terrain,g.pairs[0].active,g);assert.ok(options.length);
 const expanded=localCommand(g,'expand',options[0],NOW,()=>.99);for(const field of ['cells','players','ecologyTurns','territoryEvents'])assert.deepEqual(expanded[field],before[field],field);assert.equal(expanded.terrain.length,108);assert.equal(expanded.pairs[0].turn,before.pairs[0].turn);assert.ok(availableCells(expanded,expanded.pairs[0]).length>=9);
});
test('Finished, Inverso and online records are not retired or reclassified',()=>{
 for(const extra of [{status:'finished'},{variant:'inverse'},{mode:'world'},{mode:'duel'}]){const g={...legacy(),ruleVersion:28,...extra},before=structuredClone(g);retireBeavers(g);assert.deepEqual(g,before);}
});
