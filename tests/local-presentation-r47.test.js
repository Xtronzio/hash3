import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {localCommand} from '../src/local.js';
import {createLegacyLocal as createLocal} from './helpers/legacy-balance.js';
import {disarmPendingBombs,pendingInvasionBombs} from '../src/pending-bombs.js';
import {canUsePracticeTool,toolCells} from '../src/practice-tools.js';
import {applyPlannedEvent} from '../src/territory-event-actions.js';
import {chooseMachineCard} from '../src/bot-inventory.js';
import {loadLocalGames} from '../src/sessions.js';
import {pausedScoreMarkup} from '../src/paused-ui.js';
import {turnWarningsMarkup} from '../src/turn-event-ui.js';
const now=100000;
const fresh=mode=>{const r=createLocal(mode||'local','Jorge','Rival',now,'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:true});r.players.forEach(p=>p.score=333);return r;};
const warning=(id='raid',count=6,turns=2)=>{const region=Array.from({length:count},(_,i)=>({x:i%3,y:Math.floor(i/3)}));return {id,kind:'invader-rain',x:0,y:0,region,groups:[region.slice(0,3),region.slice(3)],paths:region.map(target=>({target,path:[{...target}]})),approaches:region.map(p=>({...p,side:'north'})),turnsRemaining:turns,announcedTurn:12};};
test('Artificieros disarms selected and nearest two in one announcement, retaining geometry, clocks and all other warnings',()=>{
 const r=fresh(),event=warning();r.territoryEvents=[event,warning('other',3,1)];const other=structuredClone(r.territoryEvents[1]),before=structuredClone(r);
 const result=disarmPendingBombs(r,{x:0,y:1});assert.equal(result.disarmed,3);assert.deepEqual(result.cells,[{x:0,y:1},{x:0,y:0},{x:1,y:1}]);
 assert.deepEqual(event.region,[{x:1,y:0},{x:2,y:0},{x:2,y:1}]);assert.deepEqual(event.groups.flat(),event.region);assert.deepEqual(event.paths.map(p=>p.target),event.region);assert.deepEqual(event.approaches.map(({x,y})=>({x,y})),event.region);
 assert.equal(event.turnsRemaining,2);assert.equal(event.announcedTurn,12);assert.deepEqual(r.territoryEvents[1],other);for(const k of ['terrain','cells','players','pairs'])assert.deepEqual(r[k],before[k]);
 applyPlannedEvent(r,event,now);for(const p of result.cells)assert.ok(!r.cells.some(c=>c.x===p.x&&c.y===p.y&&c.symbol==='*'));assert.equal(r.cells.filter(c=>c.symbol==='*').length,3);
});
test('One or two remaining bombs are safely retired; expired or stale coordinates reject atomically',()=>{
 for(const n of [1,2,3]){const r=fresh();r.territoryEvents=[warning('last',n),warning('kept',3)];assert.equal(disarmPendingBombs(r,{x:0,y:0}).disarmed,n);assert.deepEqual(r.territoryEvents.map(e=>e.id),['kept']);}
 const r=fresh();r.territoryEvents=[warning('expired',3,0)];const copy=structuredClone(r);assert.throws(()=>disarmPendingBombs(r,{x:0,y:0}));assert.deepEqual(r,copy);assert.equal(pendingInvasionBombs(r).length,0);
});
test('Buy after announcement for 33, use without another score deduction, preserve turn, reserves and remaining prewarning',()=>{
 let r=fresh();r.territoryEvents=[warning()];r.players[0].freeExpansions=27;const original=structuredClone(r);
 r=localCommand(r,'trade',{tool:'sapper',playerId:'local-x'},now);assert.equal(r.players[0].score,300);assert.equal(r.players[0].inventory.cards.sapper,1);assert.ok(canUsePracticeTool(r,'local-x','sapper',now));assert.equal(toolCells(r,'local-x','sapper').length,6);
 r=localCommand(r,'inventory',{tool:'sapper',playerId:'local-x',x:0,y:0},now);assert.equal(r.lastEvent.disarmed,3);assert.equal(r.players[0].score,300);assert.equal(r.players[0].tradeSpent,33);assert.equal(r.players[0].inventory.cards.sapper,0);assert.equal(r.players[0].freeExpansions,27);assert.deepEqual(r.pairs,original.pairs);assert.deepEqual(r.terrain,original.terrain);assert.deepEqual(r.cells,original.cells);assert.deepEqual(r.players[1],original.players[1]);assert.equal(r.territoryEvents[0].turnsRemaining,2);
 const invalid=fresh();invalid.territoryEvents=[warning()];invalid.players[0].inventory.cards.sapper=1;const copy=structuredClone(invalid);assert.throws(()=>localCommand(invalid,'inventory',{tool:'sapper',playerId:'local-x',x:99,y:99},now));assert.deepEqual(invalid,copy);
 for(const status of ['paused','finished'])assert.equal(canUsePracticeTool({...invalid,status},'local-x','sapper',now),false);assert.equal(canUsePracticeTool(invalid,'local-o','sapper',now),false);
});
test('Machine buys and uses Artificieros through the same price and referee',()=>{
 let r=fresh('solo');r.pairs[0].turn='O';r.territoryEvents=[warning()];r.cells=[{id:'own',x:0,y:0,symbol:'O',owner:'local-o'}];let c=chooseMachineCard(r,now);assert.equal(c.payload.tool,'sapper');assert.equal(c.action,'trade');r=localCommand(r,c.action,c.payload,now);assert.equal(r.players[1].score,300);c=chooseMachineCard(r,now);assert.equal(c.payload.tool,'sapper');assert.equal(c.action,'inventory');r=localCommand(r,c.action,c.payload,now);assert.equal(r.lastEvent.disarmed,3);assert.equal(r.cells[0].symbol,'O');assert.equal(r.players[1].score,300);
});
test('R46 saves acquire zero Artificieros stock once without changing points, excessive inventory, reserves or finished results',()=>{
 const active=fresh();active.status='paused';active.pauseRemainingMs=23456;active.players[0].score=25912;active.players[0].inventory.cards.frontier=27;active.players[0].freeExpansions=44;active.players[0].inventory.immunity.cards['immunity-1']=333;delete active.players[0].inventory.cards.sapper;delete active.players[0].inventory.received.sapper;
 const finished=structuredClone(active);finished.id='archive';finished.status='finished';finished.finalResult={ruleVersion:14,players:[{score:25912}]};const data=new Map([['hash3_locals',JSON.stringify([active,finished])]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const loaded=loadLocalGames(storage,now),r=loaded.find(g=>g.id===active.id);assert.equal(r.players[0].inventory.cards.sapper,0);assert.equal(r.players[0].inventory.received.sapper,0);assert.equal(r.players[0].score,25912);assert.equal(r.players[0].inventory.cards.frontier,27);assert.equal(r.players[0].freeExpansions,44);assert.equal(r.players[0].inventory.immunity.cards['immunity-1'],333);assert.equal(r.pauseRemainingMs,23456);assert.deepEqual(r.pairs,active.pairs);assert.deepEqual(loaded.find(g=>g.id==='archive'),finished);const saved=data.get('hash3_locals');loadLocalGames(storage,now+999999);assert.equal(data.get('hash3_locals'),saved);
});
test('Paused disclosure defaults closed with points alone in summary; warning urgency is ordered; public #33 retains installation identity',()=>{
 const r=fresh(),copy=structuredClone(r),html=pausedScoreMarkup(r,{ranking:'<ol>Ranking detallado</ol>',stock:'<aside>Stock</aside>'});assert.doesNotMatch(html,/<details[^>]*\bopen\b/);assert.match(html,/<summary[^>]*>[\s\S]*X <strong>333<\/strong>/);assert.doesNotMatch(html.split('</summary>')[0],/Ranking detallado|Stock|Figuras|Reloj/);assert.match(html,/Ranking detallado/);assert.deepEqual(r,copy);
 r.territoryEvents=[warning('late',3,3),{...warning('soon',3,1),kind:'pandemic'}];const warnings=turnWarningsMarkup(r);assert.ok(warnings.indexOf('Pandemia')<warnings.indexOf('Bombardeo'));assert.match(warnings,/is-imminent/);assert.match(warnings,/IMPACTO INMINENTE/);
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));assert.equal(manifest.name,'#33');for(const k of ['id','scope','start_url'])assert.equal(manifest[k],'./');for(const icon of manifest.icons)assert.ok(fs.existsSync('public/'+icon.src));
});

test('Enlarged recharge stays separate when immunity is dragged across its saved position',async()=>{
 const {separateFloatingControl}=await import('../src/floating-layout.js');const size={width:92,height:106},limits={x:292,y:500};
 for(const blockers of [[{x:106,y:160,width:48,height:60}],[{x:6,y:90,width:48,height:60},{x:6,y:250,width:48,height:60}]]){
  const point=separateFloatingControl({x:86,y:100},size,limits,blockers);assert.ok(point.x>=6&&point.y>=6&&point.x<=limits.x&&point.y<=limits.y);
  for(const b of blockers)assert.ok(point.x>=b.x+b.width+8||point.x+size.width+8<=b.x||point.y>=b.y+b.height+8||point.y+size.height+8<=b.y);
  assert.deepEqual(separateFloatingControl(point,size,limits,blockers),point);
 }
});

test('Capacity shows normal cards /18 after spending, buying and combo refills; protections stay separate and excess reserves stay real',async()=>{
 const {inventoryDockMarkup,inventoryCardTotal,inventoryMarkup}=await import('../src/inventory.js');const {refillSelectorMarkup}=await import('../src/floating-refill.js');const {recordInventoryCombo}=await import('../src/practice-tools.js');
 let r=fresh();r.players[0].inventory.immunity.cards['immunity-1']=333;assert.equal(inventoryCardTotal(r,'local-x'),3);assert.match(inventoryDockMarkup(r,'local-x'),/>3\/18</);assert.match(inventoryMarkup(r,'local-x'),/3\/18/);assert.match(refillSelectorMarkup(r,'local-x'),/>3\/18</);
 r=localCommand(r,'inventory',{tool:'double',playerId:'local-x'},now);assert.match(inventoryDockMarkup(r,'local-x'),/>2\/18</);r=localCommand(r,'trade',{tool:'sapper',playerId:'local-x'},now);assert.match(refillSelectorMarkup(r,'local-x'),/>3\/18</);recordInventoryCombo(r,'local-x',33,{random:()=>0});assert.match(inventoryDockMarkup(r,'local-x'),/>4\/18</);
 r.players[0].inventory.cards.frontier=27;const total=inventoryCardTotal(r,'local-x');assert.ok(total>18);assert.match(inventoryDockMarkup(r,'local-x'),new RegExp('>'+total+'/18<'));r.players[0].inventory.comboPending=1;assert.match(inventoryDockMarkup(r,'local-x'),/inventory-pending/);assert.match(refillSelectorMarkup(r,'local-x'),/combo pendiente de hueco/);assert.equal(r.players[0].inventory.immunity.cards['immunity-1'],333);
});
