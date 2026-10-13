import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {newTerritoryImpacts,territoryImpactText} from '../src/territory-impact.js';
import {prepareImpactFocus,impactFocusEntries} from '../src/impact-focus.js';
import {stampTurnCards,displayedTurnCards} from '../src/turn-card-display.js';
import {inventoryMarkup,inventoryDockMarkup} from '../src/inventory.js';
const now=1000000;
const piece=(symbol,x,y)=>({id:symbol+x+','+y,symbol,x,y,owner:'local-'+symbol.toLowerCase()});
function fresh(){const r=createLocal('local','Jorge','Rival',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.pairs[0].active={x:3,y:3};r.territoryNextPlacement=r.territoryNextInvasion=r.territoryNextDeathTurn=99999;return r;}
for(const kind of ['contagion','pandemic'])test(kind+' pays both final signs and bonuses from an accepted turn, without passive stock or repeated awards',()=>{
 let r=fresh();r.players.forEach((p,i)=>{p.score=100*(i+1);p.figures=2;});
 r.cells=[piece('X',0,0),piece('X',1,0),piece('O',2,0),piece('O',0,2),piece('O',1,2),piece('X',2,2),piece('X',5,5),piece('X',6,5),piece('X',7,5)];
 r.territoryEvents=[{id:'conversion',kind,region:[{x:2,y:0},{x:2,y:2}],turnsRemaining:1,announcedTurn:0}];const inventory=structuredClone(r.players.map(p=>p.inventory));
 const previous=structuredClone(r);r=localCommand(r,'move',{x:8,y:8},now+1,()=>.5);
 assert.deepEqual(r.players.map(p=>p.score),[106,206]);assert.deepEqual(r.players.map(p=>p.inventory.cards),inventory.map(i=>i.cards));assert.deepEqual(r.landingEvent.scores.map(s=>s.points),[6,6]);
 const impact=r.territoryImpacts.find(i=>i.id==='conversion');assert.deepEqual(impact.affected,[{x:2,y:0},{x:2,y:2}]);assert.match(territoryImpactText(impact),/X \+6 · O \+6/);assert.equal(newTerritoryImpacts(previous,r).length,1);
 const saved=JSON.parse(JSON.stringify(r)),scores=r.players.map(p=>p.score);advanceTerritory(saved,now+2);assert.deepEqual(saved.players.map(p=>p.score),scores);assert.deepEqual(newTerritoryImpacts(null,saved),[]);
});
test('Protected conversion positions never enter impact footprint or gain points, while paid scores survive',()=>{
 const r=fresh();r.cells=[piece('X',0,0),piece('X',1,0),piece('O',2,0)];r.players[0].score=333;r.inventoryEffects.shields=[{cell:r.cells[2].id,by:'local-o',remaining:2}];
 r.territoryEvents=[{id:'safe',kind:'pandemic',region:[{x:2,y:0},{x:8,y:8}],turnsRemaining:0}];advanceTerritory(r,now);
 assert.equal(r.players[0].score,333);assert.deepEqual(r.territoryImpacts[0].affected,[]);assert.equal(r.territoryImpacts[0].converted,0);
});
test('Demolished cells retain exact coordinates and navigation never creates terrain or touches stock',()=>{
 const r=fresh();r.territoryEvents=[{id:'gone',kind:'earthquake',region:[{x:4,y:4},{x:5,y:4},{x:4,y:5},{x:5,y:5},{x:99,y:99}],turnsRemaining:0}];advanceTerritory(r,now);
 const impact=r.territoryImpacts[0],before=JSON.stringify(r);assert.equal(impact.destroyed,4);assert.equal(impact.affected.length,4);assert.ok(!r.terrain.some(c=>c.x===4&&c.y===4));
 const focus=prepareImpactFocus(impact,0),entries=impactFocusEntries(focus,{x:3,y:3,width:4,height:4},()=>'',false,1);assert.equal(entries.length,4);assert.match(entries[0].markup,/data-impact-x="4"/);assert.deepEqual(impactFocusEntries(focus,{x:3,y:3,width:4,height:4},()=>'',false,4501),[]);assert.equal(JSON.stringify(r),before);
});
test('Distant clusters fit original coordinates and large impacts have bounded coarse navigation',()=>{
 const focus=prepareImpactFocus({id:'long',affected:Array.from({length:33333},(_,x)=>({x,y:0}))},0);
 assert.equal(focus.bounds.width,33333);assert.equal(focus.corners[1].x,33332);assert.ok(impactFocusEntries(focus,{x:0,y:0,width:33333,height:1},()=>'',true,1).length<=64);assert.equal(impactFocusEntries(focus,{x:30000,y:0,width:3,height:1},()=>'',false,1).length,3);
});
test('Turn cards survive opponent tools and pause, then clear only after the next placement',()=>{
 let r=fresh();r.territoryEnabled=false;r.players[0].inventory.cards.double=1;r.players[1].inventory.cards.rival=1;
 const step=(action,payload={})=>{const previous=r;r=stampTurnCards(previous,localCommand(r,action,payload,now+1,()=>.5));};
 step('inventory',{tool:'double',playerId:'local-x'});step('move',{x:0,y:0});step('move',{x:1,y:0});step('inventory',{tool:'rival',playerId:'local-o'});
 assert.deepEqual(displayedTurnCards(r).map(u=>u.tool),['double','rival']);step('pause');step('resume');assert.equal(displayedTurnCards(r).length,2);step('move',{x:2,y:0});assert.deepEqual(displayedTurnCards(r).map(u=>u.tool),['rival']);
});
test('Backpacks expose independent catalogues, and used ongoing cards remain in the top history',()=>{
 const r=fresh();assert.doesNotMatch(inventoryMarkup(r,'local-x',{section:'player'}),/id="territory-guide"/);const territory=inventoryMarkup(r,'local-x',{section:'territory'});assert.match(territory,/id="territory-guide"/);assert.doesNotMatch(territory,/data-use-tool|inventory-player-heading/);
 r.inventoryEffects.forced=[{player:'local-x',by:'local-o',symbol:'O'}];const html=inventoryDockMarkup(r,'local-x',{section:'uses',uses:[{player:'local-o',tool:'rival'}]});assert.match(html,/data-used-tool="rival"/);assert.doesNotMatch(html,/data-action="inventory"/);
 r.mode='solo';r.humanId='local-x';r.playerInventory=false;r.machineInventory=true;assert.match(inventoryDockMarkup(r,'local-x',{section:'uses',uses:[{player:'local-o',tool:'rival'}]}),/data-used-tool="rival"/);assert.equal(inventoryDockMarkup(r,'local-x',{section:'bag'}),'');
});
