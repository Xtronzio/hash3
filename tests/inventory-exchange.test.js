import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyLocal as createLocal} from './helpers/legacy-balance.js';
import {localCommand} from '../src/local.js';
import {MAX_CARDS,practiceTools} from '../src/practice-tools.js';
import {tradeAvailability,CARD_PRICES} from '../src/inventory-economy.js';
const now=100000;
function full(){const r=createLocal('local','X','O',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});const inv=r.players[0].inventory;r.players[0].score=999;for(const t of practiceTools)inv.cards[t.id]=0;for(const id of ['double','opposite','rival','erase','frontier','border'])inv.cards[id]=3;inv.comboPending=1;return r;}
const total=r=>Object.values(r.players[0].inventory.cards).reduce((a,b)=>a+b,0);
test('Exchange preserves 18/18 and pending combo, costs the new card and changes exactly one unit without using a turn',()=>{
 const r=full(),before=structuredClone(r),next=localCommand(r,'trade',{playerId:'local-x',tool:'bomb',replace:'border'},now);
 assert.equal(MAX_CARDS,18);assert.equal(total(next),18);assert.equal(next.players[0].inventory.cards.border,2);assert.equal(next.players[0].inventory.cards.bomb,1);assert.equal(next.players[0].score,966);assert.equal(next.players[0].tradeSpent,33);assert.equal(next.players[0].inventory.comboPending,1);assert.equal(next.players[0].inventory.draws,before.players[0].inventory.draws);assert.equal(next.players[0].inventory.exchanged,1);assert.equal(next.players[0].practiceTools,before.players[0].practiceTools);assert.deepEqual(next.practiceTurn,before.practiceTurn);assert.deepEqual(next.pairs,before.pairs);assert.deepEqual(next.players[1],before.players[1]);assert.deepEqual(next.terrain,before.terrain);assert.deepEqual(r,before);
});
test('Replacement is voluntary and rejects absent, same, protected, capped, poor and out-of-turn choices atomically',()=>{
 const r=full(),before=structuredClone(r);
 for(const payload of [{tool:'bomb',replace:'absent'},{tool:'bomb',replace:'immunity'},{tool:'frontier',replace:'frontier'},{tool:'double',replace:'frontier'},{tool:'hint',replace:'shield'},{tool:'bomb',replace:'frontier',playerId:'local-o'}])assert.throws(()=>localCommand(r,'trade',{playerId:'local-x',...payload},now));
 assert.deepEqual(r,before);const poor=full();poor.players[0].score=2;assert.throws(()=>localCommand(poor,'trade',{playerId:'local-x',tool:'hint',replace:'frontier'},now));assert.equal(total(poor),18);
 const paused={...r,status:'paused'};assert.equal(tradeAvailability(paused,'local-x','bomb',now,{replace:'frontier'}).allowed,false);
 assert.equal(tradeAvailability(r,'local-x','bomb',now).allowed,false);assert.equal(CARD_PRICES.reconquest,333);
});
test('A full varied hand permits every different target below three, including zero-stock cards when the source has three',()=>{
 const r=full(),inv=r.players[0].inventory;r.players[0].score=12730;
 for(const t of practiceTools)inv.cards[t.id]=0;
 for(const t of practiceTools.slice(0,12))inv.cards[t.id]=1;
 inv.cards.hint=3;inv.cards.combo=3;inv.cards.bomb=1;
 assert.equal(total(r),18);assert.equal(practiceTools.filter(t=>inv.cards[t.id]>0).length,14);
 const before=structuredClone(r);
 for(const t of practiceTools){
  const expected=t.id!=='combo'&&inv.cards[t.id]<3&&CARD_PRICES[t.id]<=CARD_PRICES.combo;
  assert.equal(tradeAvailability(r,'local-x',t.id,now,{replace:'combo'}).allowed,expected,t.id);
  if(!expected)continue;
  const next=localCommand(r,'trade',{playerId:'local-x',tool:t.id,replace:'combo'},now);
  assert.equal(total(next),18);assert.equal(next.players[0].inventory.cards[t.id],inv.cards[t.id]+1);assert.equal(next.players[0].inventory.cards.combo,2);
  assert.equal(next.players[0].score,12730-CARD_PRICES[t.id]);assert.equal(next.players[0].inventory.comboPending,1);
  assert.deepEqual(next.players[1],before.players[1]);assert.deepEqual(next.pairs,before.pairs);
 }
 assert.deepEqual(r,before);
});
test('Exchanging repeated cards can grow variety to eighteen without increasing the total',()=>{
 let r=full();r.players[0].score=12730;
 for(const target of practiceTools.filter(t=>CARD_PRICES[t.id]<=33&&!['double','opposite','rival','erase','frontier','border'].includes(t.id)).slice(0,12).sort((a,b)=>CARD_PRICES[b.id]-CARD_PRICES[a.id])){
  const replace=practiceTools.find(t=>r.players[0].inventory.cards[t.id]>1&&CARD_PRICES[t.id]>=CARD_PRICES[target.id]).id;
  r=localCommand(r,'trade',{playerId:'local-x',tool:target.id,replace},now);
 }
 assert.equal(total(r),18);assert.equal(practiceTools.filter(t=>r.players[0].inventory.cards[t.id]>0).length,18);
 assert.equal(r.players[0].inventory.comboPending,1);
});
test('Historical excess remains unchanged in size during replacement; protections and reserves are untouched',()=>{
 const r=full();r.players[0].inventory.cards.border=27;r.players[0].inventory.immunity.cards['immunity-1']=333;r.players[0].freeExpansions=33;
 const before=total(r),next=localCommand(r,'trade',{playerId:'local-x',tool:'tornado',replace:'border'},now);assert.equal(total(next),before);assert.equal(next.players[0].inventory.cards.border,26);assert.equal(next.players[0].inventory.immunity.cards['immunity-1'],333);assert.equal(next.players[0].freeExpansions,33);assert.equal(MAX_CARDS,18);
});
test('Machine can exchange an unusable stored card through the same referee without touching human inventory',async()=>{
 const {chooseMachineCard}=await import('../src/bot-inventory.js');const r=createLocal('solo','Jorge','Rival',now,'normal','untimed','medium','O',true,{faunaEnabled:false,territoryEnabled:false}),inv=r.players[0].inventory;
 r.players[0].score=333;for(const t of practiceTools)inv.cards[t.id]=0;for(const id of ['hint-expand','sapper','antidote','ambush','reconquest','shield'])inv.cards[id]=3;inv.comboPending=1;
 const human=structuredClone(r.players[1]),choice=chooseMachineCard(r,now);assert.equal(choice.action,'trade');assert.equal(choice.payload.tool,'double');assert.ok(choice.payload.replace);const next=localCommand(r,choice.action,choice.payload,now);assert.equal(total(next),18);assert.equal(next.players[0].score,300);assert.equal(next.players[0].inventory.comboPending,1);assert.deepEqual(next.players[1],human);assert.notEqual(chooseMachineCard(next,now)?.action,'trade');
});
