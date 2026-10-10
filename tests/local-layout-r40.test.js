import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canUsePracticeTool,toolCells,practiceTools,completeInventoryTurn,inventoryDrawWeight} from '../src/practice-tools.js';
import {inventoryMarkup,inventoryStatusMarkup,toolIcon} from '../src/inventory.js';
import {INVENTORY_ROWS} from '../src/inventory-layout.js';
import {ecologyIcon,ecologyNavigationMarkup} from '../src/ecology-navigation.js';
import {savedMapModel} from '../src/saved-map.js';
import {activateImmunity} from '../src/immunity.js';
import {loadLocalGames} from '../src/sessions.js';
import {applyPlannedEvent} from '../src/territory-event-actions.js';
const now=100000;
const fresh=()=>{const r=createLocal('local','X','O',now,'normal','untimed');r.faunaEnabled=false;r.territoryEnabled=false;r.terrain=Array.from({length:16},(_,i)=>({x:i%4,y:Math.floor(i/4)}));return r;};
const piece=(symbol,x,y)=>({id:crypto.randomUUID(),symbol,x,y,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
test('Permutar swaps both pieces atomically, scores both landings once, preserves identities, turn and events',()=>{
 const r=fresh();r.players[0].inventory.cards.swap=2;
 r.cells=[piece('X',0,0),piece('X',1,0),piece('O',2,0),piece('O',0,2),piece('O',1,2),piece('X',2,2)];
 r.players[0].lastMove={...r.cells[5]};r.players[1].lastMove={...r.cells[2]};
 const n=localCommand(r,'inventory',{tool:'swap',playerId:'local-x',x:2,y:0,toX:2,toY:2},now,()=>0);
 assert.deepEqual(n.players.map(p=>p.score),[3,3]);assert.equal(n.landingEvent.scores.length,2);
 assert.equal(n.cells.find(c=>c.id===r.cells[2].id).y,2);assert.equal(n.cells.find(c=>c.id===r.cells[5].id).y,0);
 assert.equal(n.players[0].lastMove.y,0);assert.equal(n.players[1].lastMove.y,2);
 assert.equal(n.players[0].inventory.cards.swap,1);assert.equal(n.pairs[0].turn,'X');assert.equal(n.ecologyTurns,0);assert.equal(n.practiceTurn.remaining,1);
 assert.deepEqual(r.players.map(p=>p.score),[0,0]);assert.equal(r.cells[2].y,0);
 assert.deepEqual(localCommand(n,'tick',{},now+9999).players.map(p=>p.score),[3,3]);
 assert.throws(()=>localCommand(n,'inventory',{tool:'swap',playerId:'local-x',x:2,y:0,toX:2,toY:2},now));
});
test('Permutar rejects missing, duplicate, shielded, immune, reserved and blocked destinations without spending',()=>{
 const r=fresh();r.cells=[piece('X',0,0),piece('O',1,0),piece('X',2,0)];r.players[0].inventory.cards.swap=1;
 const payload={tool:'swap',playerId:'local-x',x:0,y:0,toX:1,toY:0};
 for(const change of [r=>r.inventoryEffects.shields.push({cell:r.cells[1].id,by:'local-o',remaining:2}),r=>activateImmunity(r,'local-o',now),r=>{r.faunaEnabled=true;r.worms=[{id:'w',x:1,y:0,eaten:0,mealLimit:3,turnDriven:true,turnsSinceMeal:0,body:[{x:1,y:0}]}]},r=>r.inventoryEffects.blocks.push({x:1,y:0,by:'local-o',remaining:2})]){
  const room=structuredClone(r);change(room);const before=structuredClone(room);assert.throws(()=>localCommand(room,'inventory',payload,now));assert.deepEqual(room,before);
 }
 assert.throws(()=>localCommand(r,'inventory',{...payload,toX:0},now));assert.throws(()=>localCommand(r,'inventory',{...payload,toX:3},now));assert.equal(r.players[0].inventory.cards.swap,1);
 assert.equal(canUsePracticeTool({...r,status:'paused'},'local-x','swap'),false);
});
test('Swap is drawn by refills and is present once in every two-row player inventory, including the hall',()=>{
 const r=fresh();for(const t of practiceTools)r.players[0].inventory.cards[t.id]=0;
 completeInventoryTurn(r,'local-x',{random:()=>.21});assert.equal(inventoryDrawWeight('swap'),3);
 assert.deepEqual(new Set(INVENTORY_ROWS.flat()),new Set([...practiceTools.map(t=>t.id),'target']));
 assert.equal(INVENTORY_ROWS.flat().length,practiceTools.length+1);const row=INVENTORY_ROWS.find(r=>r.includes('frontier'));assert.equal(row.indexOf('border'),row.indexOf('frontier')+1);
 for(const html of [inventoryMarkup(null,null),inventoryMarkup(r,'local-x'),inventoryStatusMarkup(r,{playerId:'local-x'})]){
  for(const tool of ['activate','expand-2','expand-3','swap'])assert.equal((html.match(new RegExp(`data-tool="${tool}"`,'g'))||[]).length,1);
  assert.doesNotMatch(html,/inventory-column-category/);assert.match(html,/player-inventory-rows/);
 }
 for(const [tool,n]of [['activate',1],['expand-2',2],['expand-3',3]])assert.match(toolIcon(tool),new RegExp(`>${n}</text>`));
 assert.notEqual(ecologyIcon('contagion'),ecologyIcon('pandemic'));
});
test('Used # keeps sharing and uses the latest scorer color in board data, maps and persisted saves',()=>{
 let r=fresh();r.cells=[piece('#',1,1),piece('X',0,1),piece('O',1,0),piece('#',3,3)];
 r=localCommand(r,'move',{x:2,y:1},now,()=>0);assert.equal(r.cells[0].wildcardSymbol,'X');
 r=localCommand(r,'move',{x:1,y:2},now,()=>0);assert.equal(r.cells[0].wildcardSymbol,'O');assert.equal(r.cells[0].symbol,'#');assert.equal(r.cells[3].wildcardSymbol,undefined);assert.deepEqual(r.players.map(p=>p.score),[3,3]);
 const m=savedMapModel(r);assert.equal(m.terrain.find(c=>c.x===1&&c.y===1).fill,'var(--green)');assert.equal(m.terrain.find(c=>c.x===3&&c.y===3).fill,'#c5cbd4');
 const values=new Map([['hash3_locals',JSON.stringify([r])]]),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const saved=loadLocalGames(store,now)[0];assert.equal(saved.cells[0].wildcardSymbol,'O');
 const clone=structuredClone(saved);clone.territoryEnabled=true;applyPlannedEvent(clone,{id:'flip',kind:'contagion',region:[{x:1,y:1}]},now);assert.equal(clone.cells[0].symbol,'*');assert.equal(clone.cells[0].wildcardSymbol,undefined);
});
test('Old paid wildcard uses restore once without awarding points or changing finished history',()=>{
 const r=fresh();r.cells=[piece('#',0,0),piece('X',1,0),piece('X',2,0)];r.forms=['X:línea:0,0;1,0;2,0'];r.players[0].score=25912;delete r.wildcardUsageVersion;delete r.players[0].inventory.cards.swap;
 const finished=structuredClone(r);finished.id='finished';finished.status='finished';
 const values=new Map([['hash3_locals',JSON.stringify([r,finished])],['hash3_game_pins','["local:'+r.id+'"]']]),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const games=loadLocalGames(store,now),first=values.get('hash3_locals');loadLocalGames(store,now+99999);assert.equal(values.get('hash3_locals'),first);
 const restored=games.find(g=>g.id===r.id);assert.equal(restored.cells[0].wildcardSymbol,'X');assert.equal(restored.players[0].score,25912);assert.equal(restored.players[0].inventory.cards.swap,0);assert.deepEqual(games.find(g=>g.id==='finished'),finished);
});
test('Territory keeps two rows, adjacent / and ///, and # in a separate final slot with no card actions',()=>{
 const r=fresh();r.faunaEnabled=true;r.territoryEnabled=true;
 const html=ecologyNavigationMarkup(r,'local-x');assert.match(html,/territory-rows/);assert.equal((html.match(/class="inventory-icon-row"/g)||[]).length,2);assert.doesNotMatch(html,/data-tool=/);
 assert.match(html,/data-ecology-kind="frontier"[\s\S]*data-ecology-kind="border"[\s\S]*data-ecology-kind="neutral"/);
});
