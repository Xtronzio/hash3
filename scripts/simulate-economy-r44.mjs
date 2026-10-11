import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {practiceTools,recordInventoryCombo,MAX_CARDS,MAX_CARD_TYPES} from '../src/practice-tools.js';
import {CARD_PRICES} from '../src/inventory-economy.js';
import {plannedEventRegion} from '../src/territory-event-actions.js';
import {advanceTerritory} from '../src/territory-tools.js';
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
const fresh=()=>createLocal('local','X','O',1000,'normal','untimed','high','X',false,{faunaEnabled:false,territoryEnabled:true});
const totals=[];
for(const size of [333,999,3333]){
 const row={size,trials:9,contagionPlans:0,contagionPieces:0,pandemicPieces:0,newPoints:0};
 for(let seed=1;seed<=9;seed++){
  const random=rng(seed),room=fresh(),width=Math.ceil(Math.sqrt(size));room.terrain=Array.from({length:size},(_,i)=>({x:i%width,y:Math.floor(i/width)}));
  room.cells=room.terrain.filter(()=>random()<.8).map(c=>{const symbol=['X','O','#','*'][Math.floor(random()*4)];return {...c,id:crypto.randomUUID(),symbol,owner:room.players.find(p=>p.symbol===symbol)?.id??null};});
  const contagion=plannedEventRegion(room,'contagion',random,1000);if(contagion.region?.length){assert.equal(contagion.region.length,9);row.contagionPlans++;row.contagionPieces+=9;}
  const plan=plannedEventRegion(room,'pandemic',random,1000);row.pandemicPieces+=plan.length;
  room.players[0].score=25912;room.players[1].score=333;const bags=room.players.map(p=>structuredClone(p.inventory)),land=structuredClone(room.terrain);room.territoryEvents=[{id:'p'+seed,kind:'pandemic',region:plan,turnsRemaining:0}];advanceTerritory(room,1000);
  assert.deepEqual(room.terrain,land);assert.deepEqual(room.players.map(p=>p.inventory),bags);assert.ok(room.players[0].score>=25912&&room.players[1].score>=333);row.newPoints+=room.players[0].score+room.players[1].score-26245;
 }
 totals.push({...row,meanPandemicPieces:row.pandemicPieces/row.trials,meanNewPoints:row.newPoints/row.trials});
}
const draws={},stocks=new Set();
for(let seed=1;seed<=33;seed++){
 const r=fresh(),random=rng(seed),inv=r.players[0].inventory;
 for(let i=0;i<333;i++){
  const held=practiceTools.filter(t=>inv.cards[t.id]>0);if(held.length){const tool=held[Math.floor(random()*held.length)].id;inv.cards[tool]--;}
  recordInventoryCombo(r,'local-x',33,{random});draws[inv.lastDraw]=(draws[inv.lastDraw]||0)+1;
  const values=Object.values(inv.cards);assert.ok(values.reduce((a,b)=>a+b,0)<=MAX_CARDS&&values.filter(Boolean).length<=MAX_CARD_TYPES);assert.ok(values.every(n=>n>=0&&n<=3));values.forEach(n=>stocks.add(n));
 }
}
assert.equal(Object.keys(draws).length,practiceTools.length);
const defenses=[{card:'ambush',maximum:3},{card:'reconquest',maximum:33}].map(r=>({...r,price:CARD_PRICES[r.card],pointsPerRecoveredCell:CARD_PRICES[r.card]/r.maximum}));
const commonDefeat=[333,999,3333].flatMap(size=>[.333,.666,.9].map(threshold=>({size,threshold,invadedAtWarning:Math.ceil(size*threshold),oneReconquestShare:33/size,threeReconquestsShare:99/size,minimumInvadedAfterThreeReconquests:Math.max(0,Math.ceil(size*threshold)-99)/size,warningApproved:false})));
console.log(JSON.stringify({version:'R0.21.44',conversionTrials:totals,drawTrials:33*333,draws,stocks:[...stocks].sort(),prices:CARD_PRICES,defenses,commonDefeat,evaluation:'A fixed 33-cell response becomes weaker as territory grows. No defeat threshold/deadline enabled. Three shared turns give unequal 1/2 response turns; propose three own response opportunities each, still unapproved.'},null,2));
