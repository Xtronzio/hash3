import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLegacyLocal as createLocal} from './helpers/legacy-balance.js';
import {localCommand} from '../src/local.js';
import {practiceTools,validateStartingCards,recordInventoryCombo,completeInventoryTurn,drawComboCard,canUsePracticeTool} from '../src/practice-tools.js';
import {CARD_PRICES,tradeAvailability} from '../src/inventory-economy.js';
import {loadLocalGames,saveLocalGame} from '../src/sessions.js';
import {plannedEventRegion,applyPlannedEvent} from '../src/territory-event-actions.js';
import {advanceTerritory} from '../src/territory-tools.js';
import {seedInvasions} from '../src/invasion-paths.js';
import {inventoryMarkup,toolIcon} from '../src/inventory.js';
import {ONLINE_MODES} from '../src/online-availability.js';
const now=100000;
const fresh=(options={},mode='local',symbol='X',machine=true)=>createLocal(mode,'Jorge','Rival',now,'advanced','untimed','high',symbol,machine,{faunaEnabled:false,territoryEnabled:false,...options});
const stock=p=>Object.values(p.inventory.cards).reduce((a,b)=>a+b,0);
const board=(n=99)=>{const r=fresh();r.terrain=Array.from({length:n},(_,i)=>({x:i%11,y:Math.floor(i/11)}));return r;};
const piece=(symbol,x,y)=>({id:crypto.randomUUID(),x,y,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null});
const storage=games=>{const data=new Map([['hash3_locals',JSON.stringify(games)],['hash3_game_pins',JSON.stringify(games.map(g=>'local:'+g.id))]]);return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};

test('New games choose exactly three distinct cards, each side owns its own stock and flags',()=>{
 for(const symbol of ['X','O']){
  const r=fresh({initialCards:['ambush','antidote','reconquest']},'solo',symbol);
  const human=r.players.find(p=>p.id===r.humanId),bot=r.players.find(p=>p.id!==r.humanId);
  assert.equal(stock(human),3);assert.equal(stock(bot),3);assert.equal(human.inventory.cards.antidote,1);assert.equal(bot.inventory.cards.antidote,0);
  human.inventory.cards.double=3;assert.equal(bot.inventory.cards.double,1);
  const ownOff=fresh({playerInventory:false},'solo',symbol);assert.equal(stock(ownOff.players.find(p=>p.id===ownOff.humanId)),0);assert.equal(stock(ownOff.players.find(p=>p.id!==ownOff.humanId)),3);
  const botOff=fresh({},'solo',symbol,false);assert.equal(stock(botOff.players.find(p=>p.id!==botOff.humanId)),0);
 }
 const both=fresh({initialCards:['hint','shield','border'],secondInitialCards:['double','bomb','combo']});assert.equal(both.players[0].inventory.cards.shield,1);assert.equal(both.players[1].inventory.cards.shield,0);
 for(const cards of [[],['hint','hint','shield'],['hint','bad','double'],['hint','double']])assert.throws(()=>validateStartingCards(cards));
});

test('R43 migration preserves oversized bags, score 25912, reserves, geometry, clocks, pins and finished results, exactly once',()=>{
 const old=board(991);delete old.inventoryEconomyVersion;delete old.players[0].inventory.cards.antidote;old.players[0].score=25912;old.players[0].placements=1422;old.players[0].inventory.turns=1;old.players[0].inventory.cards.frontier=27;old.players[0].freeExpansions=44;old.players[0].inventory.immunity.cards['immunity-1']=333;
 old.territoryEnabled=true;old.status='paused';old.pauseRemainingMs=12345;old.territoryEvents=[{id:'p',kind:'pandemic',region:[{x:0,y:0}],turnsRemaining:2}];
 const finished=structuredClone(old);finished.id='archive';finished.status='finished';finished.finalResult={players:[{score:25912}]};const st=storage([old,finished]);
 const games=loadLocalGames(st,now),g=games.find(g=>g.id===old.id),saved=st.getItem('hash3_locals');
 assert.equal(g.players[0].score,25912);assert.equal(g.players[0].inventory.cards.frontier,27);assert.equal(g.players[0].freeExpansions,44);assert.equal(g.players[0].inventory.immunity.cards['immunity-1'],333);assert.equal(g.players[0].inventory.draws,undefined);assert.equal(g.players[0].inventory.turns,0);
 assert.deepEqual(g.terrain,old.terrain);assert.equal(g.pauseRemainingMs,12345);assert.deepEqual(g.territoryEvents,old.territoryEvents);assert.deepEqual(games.find(g=>g.id==='archive'),finished);
 loadLocalGames(st,now+999999);assert.equal(st.getItem('hash3_locals'),saved);assert.ok(st.getItem('hash3_game_pins').includes(old.id));
});

test('Only individual manual own-symbol combos >=33 recharge; no sum of small plays, time, tools, turn or historic award',()=>{
 const r=fresh(),p=r.players[0];
 for(const points of [0,3,32,32,NaN])recordInventoryCombo(r,p.id,points);
 recordInventoryCombo(r,p.id,333,{automatic:true});recordInventoryCombo(r,p.id,333,{scorer:r.players[1].id});
 for(let i=0;i<100;i++)completeInventoryTurn(r,p.id);
 assert.equal(stock(p),3);assert.equal(p.inventory.draws,undefined);
 assert.equal(recordInventoryCombo(r,p.id,33,{random:()=>0}),true);assert.equal(stock(p),4);
 recordInventoryCombo(r,p.id,333,{random:()=>0});assert.equal(stock(p),5);assert.equal(p.inventory.draws,2);assert.equal(stock(r.players[1]),3);
 let full=fresh();for(const t of practiceTools)full.players[0].inventory.cards[t.id]=0;for(const t of practiceTools.slice(0,6))full.players[0].inventory.cards[t.id]=3;
 for(let i=0;i<10;i++)recordInventoryCombo(full,'local-x',333);assert.equal(full.players[0].inventory.comboPending,1);assert.equal(stock(full.players[0]),18);
 full.players[0].inventory.cards.double--;drawComboCard(full,'local-x',()=>0);assert.equal(stock(full.players[0]),18);assert.equal(full.players[0].inventory.comboPending,0);assert.equal(drawComboCard(full,'local-x'),false);
});

test('The actual referee awards combos from manual placements but never from expired-turn automatic moves or conversion events',()=>{
 const setup=()=>{const r=fresh();r.terrain=Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5)}));r.cells=r.terrain.filter(c=>c.x!==2||c.y!==2).map(c=>piece('X',c.x,c.y));return r;};
 const manual=localCommand(setup(),'move',{x:2,y:2},now,()=>0);assert.ok(manual.lastEvent.points>=33);assert.equal(manual.players[0].inventory.draws,1);
 const timed=setup();timed.timeMode='timed';timed.pairs[0].deadline=new Date(now).toISOString();const automatic=localCommand(timed,'tick',{},now,()=>0);assert.ok(automatic.lastEvent.points>=33);assert.equal(automatic.players[0].inventory.draws,undefined);
});

test('Trueque buys exactly one at the listed price, with strict caps, turn, clock, pause, isolation and atomic rejection',()=>{
 let r=fresh();r.players[0].score=333;r.players[1].score=999;const before=structuredClone(r);
 r=localCommand(r,'trade',{tool:'antidote',playerId:'local-x'},now);assert.equal(r.players[0].score,300);assert.equal(r.players[0].tradeSpent,33);assert.equal(r.players[0].inventory.cards.antidote,1);assert.deepEqual(r.players[1],before.players[1]);assert.deepEqual(r.pairs,before.pairs);assert.equal(r.ecologyTurns,before.ecologyTurns);
 r=localCommand(r,'trade',{tool:'antidote',playerId:'local-x'},now);r=localCommand(r,'trade',{tool:'antidote',playerId:'local-x'},now);const copy=structuredClone(r);assert.throws(()=>localCommand(r,'trade',{tool:'antidote',playerId:'local-x'},now));assert.deepEqual(r,copy);
 for(const game of [{...r,status:'paused'},{...r,mode:'world'},{...r,playerInventory:false},{...r,timeMode:'timed',pairs:[{...r.pairs[0],deadline:new Date(now).toISOString()}]}])assert.equal(tradeAvailability(game,'local-x','hint',now).allowed,false);
 assert.equal(tradeAvailability(r,'local-o','hint',now).allowed,false);assert.equal(tradeAvailability(r,'local-x','invalid',now).allowed,false);
 const poor=fresh();assert.throws(()=>localCommand(poor,'trade',{tool:'hint',playerId:'local-x'},now));assert.equal(poor.players[0].score,0);
 assert.ok(practiceTools.every(t=>[3,33,333].includes(CARD_PRICES[t.id])));assert.equal(CARD_PRICES.antidote,33);
 assert.deepEqual(Object.keys(CARD_PRICES).filter(id=>CARD_PRICES[id]===333),['immunity','reconquest','nuclear']);assert.equal(CARD_PRICES.bomb,33);assert.equal(CARD_PRICES.tornado,33);
});

test('Emboscada and Reconquista clear up to 3/33 stars, preserve land, all other symbols, points and stop defeated colonies',()=>{
 for(const [tool,cap] of [['ambush',3],['reconquest',33]]){
  let r=board();seedInvasions(r,[{x:0,y:0}],'invader-colony');r.cells.push(...Array.from({length:40},(_,i)=>piece('*',i%10,1+Math.floor(i/10))),piece('X',10,0),piece('O',10,1),piece('#',10,2));r.players[0].score=25912;r.players[0].inventory.cards[tool]=1;const land=structuredClone(r.terrain),others=r.cells.filter(c=>c.symbol!=='*');
  r=localCommand(r,'inventory',{tool,playerId:'local-x',x:0,y:0},now);assert.equal(r.lastEvent.cleared,cap);assert.equal(r.cells.filter(c=>c.symbol==='*').length,41-cap);assert.deepEqual(r.terrain,land);assert.deepEqual(r.cells.filter(c=>c.symbol!=='*'),others);assert.equal(r.players[0].score,25912);assert.equal(r.invasions.length,0);assert.equal(r.players[0].inventory.cards[tool],0);
 }
});

test('Antidote protects only its cell in one warning, preserves the deadline through pause/save and expires with that event',()=>{
 let r=board();r.territoryEnabled=true;r.cells=[piece('X',0,0),piece('O',1,0),piece('*',2,0),piece('#',3,0)];r.players[0].inventory.cards.antidote=1;
 r.territoryEvents=[{id:'p',kind:'pandemic',region:r.cells.map(c=>({x:c.x,y:c.y})),turnsRemaining:2},{id:'q',kind:'contagion',region:[{x:0,y:0}],turnsRemaining:3}];
 r=localCommand(r,'inventory',{tool:'antidote',playerId:'local-x',x:0,y:0},now);assert.equal(r.territoryEvents[0].turnsRemaining,2);assert.equal(r.territoryEvents[0].region.length,4);assert.equal(r.territoryEvents[1].antidotes,undefined);assert.equal(r.territoryEvents[0].antidotes.length,1);
 const st=storage([]);r=localCommand(r,'pause',{},now);saveLocalGame(st,r,now);r=localCommand(loadLocalGames(st,now)[0],'resume',{},now+9999);assert.equal(r.territoryEvents[0].turnsRemaining,2);
 applyPlannedEvent(r,{...r.territoryEvents[0]},now+9999);assert.deepEqual(r.cells.map(c=>c.symbol),['X','X','#','*']);
 assert.equal(canUsePracticeTool(r,'local-x','antidote',now+9999),false);
});

test('Contagio plans three distinct non-touching connected trios; undersized or fragmented maps skip it',()=>{
 const r=board(333);r.cells=r.terrain.map(c=>piece('X',c.x,c.y));const plan=plannedEventRegion(r,'contagion',()=>.4,now);assert.equal(plan.groups.length,3);assert.equal(plan.region.length,9);
 for(let i=0;i<3;i++){const group=plan.groups[i];assert.equal(group.length,3);assert.ok(group.every(a=>group.some(b=>a!==b&&Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1)));for(const other of plan.groups.slice(i+1))assert.ok(group.every(a=>other.every(b=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))>1)));}
 const small=fresh();small.cells=small.terrain.map(c=>piece('X',c.x,c.y));assert.deepEqual(plannedEventRegion(small,'contagion',()=>0,now),[]);
});

test('Conversion payouts use final geometry, wildcards and bonuses for both signs, without repaying unchanged figures or granting inventory',()=>{
 const r=board();r.territoryEnabled=true;r.cells=[piece('X',0,0),piece('X',1,0),piece('O',2,0),piece('O',0,2),piece('O',1,2),piece('X',2,2),piece('X',5,5),piece('X',6,5),piece('X',7,5)];r.players[0].score=25912;r.players[0].figures=2;r.players[1].score=333;r.players[1].figures=2;
 const inventory=r.players.map(p=>structuredClone(p.inventory));r.territoryEvents=[{id:'conversion',kind:'pandemic',region:[{x:2,y:0},{x:2,y:2}],turnsRemaining:0}];advanceTerritory(r,now);
 assert.deepEqual(r.players.map(p=>p.score),[25918,339]);assert.equal(r.landingEvent.scores.length,2);assert.deepEqual(r.players.map(p=>p.inventory),inventory);
 const scores=r.players.map(p=>p.score);advanceTerritory(r,now);assert.deepEqual(r.players.map(p=>p.score),scores);
});

test('Hall highlights independently and all new cards have icons, descriptions and listed trade costs; online stays disabled',()=>{
 const html=inventoryMarkup(null,null,{openTools:new Set(['ambush','antidote'])});assert.match(html,/inventory-description-toggle[^>]*is-open[^>]*data-tool="ambush"[^>]*aria-expanded="true"/);assert.match(html,/data-tool="reconquest"[^>]*aria-expanded="false"/);
 for(const t of ['ambush','reconquest','antidote'])assert.ok(toolIcon(t).includes('<path'));
 const r=fresh();r.players[0].score=999;assert.doesNotMatch(inventoryMarkup(r,'local-x'),/data-action="trade-hold"/);assert.deepEqual(ONLINE_MODES,{duel:false,world:false});
 assert.match(fs.readFileSync(new URL('../src/hold-gesture.js',import.meta.url),'utf8'),/pointercancel/);
});

test('Machine buys from its own points with the same caps and limited budget, without exhausting its score or changing human stock',async()=>{
 const {chooseMachineCard}=await import('../src/bot-inventory.js');let r=fresh({},'solo','O');r.players[0].inventory.cards.double=0;r.players[0].score=333;const human=structuredClone(r.players[1]);
 const choice=chooseMachineCard(r,now);assert.equal(choice.action,'trade');assert.equal(choice.payload.playerId,'local-x');r=localCommand(r,choice.action,choice.payload,now);assert.equal(r.players[0].score,300);assert.deepEqual(r.players[1],human);
 assert.equal(chooseMachineCard(r,now).action,'inventory');r.players[0].inventory.cards.double=0;assert.notEqual(chooseMachineCard(r,now)?.action,'trade');
 const disabled={...r,machineInventory:false};assert.equal(chooseMachineCard(disabled,now),null);
});
