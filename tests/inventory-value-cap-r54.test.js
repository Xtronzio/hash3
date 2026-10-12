import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {practiceTools} from '../src/practice-tools.js';
import {CARD_PRICES,tradeAvailability} from '../src/inventory-economy.js';
import {refillSelectorMarkup} from '../src/floating-refill.js';
const now=100000;
const start=()=>createLocal('local','X','O',now,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});

test('Every catalogue pair obeys source value, independently of the points in the wallet',()=>{
 for(const source of practiceTools)for(const target of practiceTools){
  const r=start(),inv=r.players[0].inventory;r.players[0].score=33333;
  for(const t of practiceTools)inv.cards[t.id]=0;inv.cards[source.id]=1;inv.comboPending=1;
  r.players[0].freeExpansions=33;inv.immunity.cards['immunity-1']=333;
  const before=structuredClone(r),allowed=source.id!==target.id&&CARD_PRICES[target.id]<=CARD_PRICES[source.id];
  const state=tradeAvailability(r,'local-x',target.id,now,{replace:source.id});assert.equal(state.allowed,allowed,source.id+' → '+target.id);
  if(allowed){
   const next=localCommand(r,'trade',{playerId:'local-x',tool:target.id,replace:source.id},now);
   assert.equal(next.players[0].inventory.cards[source.id],0);assert.equal(next.players[0].inventory.cards[target.id],1);
   assert.equal(next.players[0].score,33333-CARD_PRICES[target.id]);assert.equal(next.players[0].inventory.comboPending,1);
   assert.equal(next.players[0].freeExpansions,33);assert.equal(next.players[0].inventory.immunity.cards['immunity-1'],333);
   assert.deepEqual(next.players[1],before.players[1]);assert.deepEqual(next.pairs,before.pairs);
  }else{
   assert.throws(()=>localCommand(r,'trade',{playerId:'local-x',tool:target.id,replace:source.id},now));
   if(source.id!==target.id)assert.equal(state.reason,'Solo puedes cambiar por valor igual o inferior');
  }
  assert.deepEqual(r,before);
 }
});
test('Selector disables Reconquista for 3/33 sources; direct purchase still works with space and points',()=>{
 const r=start();r.players[0].score=33333;r.players[0].inventory.cards.frontier=1;r.players[0].inventory.cards.combo=1;
 for(const replace of ['frontier','combo']){
  const html=refillSelectorMarkup(r,'local-x',{exchange:true,replace});
  assert.match(html,/<button[^>]*data-tool="reconquest"[^>]* disabled>/);
  assert.match(html,/Solo puedes cambiar por valor igual o inferior/);
 }
 const before=structuredClone(r),next=localCommand(r,'trade',{playerId:'local-x',tool:'reconquest'},now);
 assert.equal(next.players[0].inventory.cards.reconquest,1);assert.equal(next.players[0].score,33000);assert.deepEqual(r,before);
});
test('Machine cannot exchange a 33-point source for Reconquista even with ample points and an invasion',async()=>{
 const {chooseMachineCard}=await import('../src/bot-inventory.js');
 const r=createLocal('solo','Jorge','Rival',now,'normal','untimed','medium','O',true,{faunaEnabled:false,territoryEnabled:false}),inv=r.players[0].inventory;
 for(const t of practiceTools)inv.cards[t.id]=0;
 for(const id of ['hint-expand','sapper','antidote','ambush','shield','border'])inv.cards[id]=3;
 r.players[0].score=33333;r.cells=Array.from({length:9},(_,i)=>({id:'invasion-'+i,x:i%3,y:Math.floor(i/3),symbol:'*',owner:null}));
 const choice=chooseMachineCard(r,now);assert.notEqual(choice?.payload?.tool,'reconquest');
 if(choice?.action==='trade'&&choice.payload.replace)assert.ok(CARD_PRICES[choice.payload.tool]<=CARD_PRICES[choice.payload.replace]);
});
