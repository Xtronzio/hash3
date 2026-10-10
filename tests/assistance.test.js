import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {useExpansionHint,suggestExpansion,planSuperHelp,executeSuperHelp} from '../src/assistance.js';
import {canUsePracticeTool} from '../src/practice-tools.js';
import {expansionOptions} from '../src/game.js';
import {inventoryMarkup,toolIcon} from '../src/inventory.js';
const now=1700000000000;
const start=()=>{const r=createLocal('local','A','B',now,'normal','untimed');r.players[0].inventory.cards['super-hint']=1;r.players[0].inventory.cards['hint-expand']=1;return r;};
const pending=()=>{const r=start();r.cells=r.terrain.map((p,i)=>({...p,id:String(i),symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));r.pairs[0].pending=1;r.pairs[0].expander='local-x';r.pairs[0].turn='O';return r;};
test('Expansion help belongs to the expander even when the next placing turn is the rival; preview spends only its own card',()=>{
 const r=pending(),before=structuredClone(r),point=suggestExpansion(r,'local-x'),next=useExpansionHint(r,'local-x',now,point);
 assert.deepEqual(r,before);assert.deepEqual(next.terrain,r.terrain);assert.deepEqual(next.cells,r.cells);assert.deepEqual(next.pairs,r.pairs);
 assert.equal(next.players[0].inventory.cards['hint-expand'],0);assert.equal(next.players[0].inventory.cards.hint,1);
 assert.equal(next.practiceHint.action,'expand');assert.equal(canUsePracticeTool(r,'local-o','hint-expand',now),false);
 const placed=localCommand(next,'expand',point,now);assert.equal(placed.practiceHint,undefined);assert.equal(placed.pairs[0].turn,'O');assert.ok(placed.terrain.length>r.terrain.length);
});
test('Expansion aid respects frontiers, stock, pause, saved suggestion and the original deadline',()=>{
 const r=pending();r.timeMode='timed';r.pairs[0].deadline=new Date(now+33000).toISOString();
 const next=useExpansionHint(r,'local-x',now);assert.equal(next.pairs[0].deadline,r.pairs[0].deadline);
 assert.ok(expansionOptions(r.terrain,r.pairs[0].active,r).some(p=>p.x===next.practiceHint.x&&p.y===next.practiceHint.y));
 assert.throws(()=>useExpansionHint(next,'local-x',now));assert.throws(()=>useExpansionHint(r,'local-x',now+33000));assert.throws(()=>useExpansionHint(localCommand(r,'pause',{},now),'local-x',now));
 const saved=localCommand(JSON.parse(JSON.stringify(localCommand(next,'pause',{},now))),'resume',{},now+1000);assert.deepEqual(saved.practiceHint,next.practiceHint);
});
test('Super help analyses without spending; confirmed execution pays the help and suggested cards through the normal referee',()=>{
 const r=start();r.cells=[{x:0,y:0,id:'a',symbol:'X',owner:'local-x'},{x:1,y:0,id:'b',symbol:'X',owner:'local-x'},{x:0,y:1,id:'c',symbol:'O',owner:'local-o'}];
 r.players[0].inventory.cards.combo=1;const before=structuredClone(r),plan=planSuperHelp(r,'local-x',now,{maxTimeMs:500}),next=executeSuperHelp(r,plan,now);
 assert.deepEqual(r,before);assert.equal(next.players[0].inventory.cards['super-hint'],0);assert.equal(next.players[0].score-before.players[0].score,plan.points);
 for(const step of plan.steps.filter(s=>s.action==='inventory'))assert.equal(next.players[0].inventory.cards[step.payload.tool],r.players[0].inventory.cards[step.payload.tool]-1);
 assert.ok(plan.steps.some(s=>s.action==='move'));assert.equal(next.pairs[0].turn,'O');assert.equal(next.players[1].placements,r.players[1].placements);
});
test('Super help rejects stale versions, expiry, pause, missing stock and foreign turns without altering the original',()=>{
 const r=start(),plan=planSuperHelp(r,'local-x',now,{maxTimeMs:0}),before=structuredClone(r);
 assert.throws(()=>executeSuperHelp({...r,version:r.version+1},plan,now));assert.throws(()=>executeSuperHelp(localCommand(r,'pause',{},now),plan,now));
 assert.throws(()=>executeSuperHelp({...r,timeMode:'timed',pairs:[{...r.pairs[0],deadline:new Date(now).toISOString()}]},plan,now));
 const forged={...plan,steps:[{action:'move',payload:{x:0,y:0}},{action:'move',payload:{x:1,y:0}}]};assert.throws(()=>executeSuperHelp(r,forged,now));assert.deepEqual(r,before);
});
test('Aids have separate stocks and distinct icons within the player inventory categories',()=>{
 const r=start(),html=inventoryMarkup(r,'local-x');assert.match(html,/inventory-column-category">Ayuda/);
 for(const tool of ['hint','hint-expand','super-hint'])assert.match(html,new RegExp(`data-action="practice-hint" data-tool="${tool}"`));
 assert.notEqual(toolIcon('hint'),toolIcon('hint-expand'));assert.notEqual(toolIcon('hint-expand'),toolIcon('super-hint'));
});
