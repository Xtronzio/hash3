import test from 'node:test';import assert from 'node:assert/strict';
import {calculateMax,recordMax} from '../src/max.js';import {rankedPlayers} from '../src/game.js';
test('#MAX uses last 100 actions, remains provisional before 100, and rejects point accumulation as ranking',()=>{
 assert.equal(calculateMax().value,null);const p={};for(let i=0;i<101;i++)recordMax(p,3,1);assert.equal(p.max.actions,100);assert.equal(p.max.provisional,false);assert.equal(p.max.value,270);
 const ordered=rankedPlayers([{id:'a',order:1,score:900,max:{value:128.431111}},{id:'b',order:2,score:5,max:{value:128.431112}}],true);assert.equal(ordered[0].id,'b');
});
test('Timeout contributes a zero-performance action; simultaneous combos improve equal-efficiency MAX',()=>{
 const solo=calculateMax(Array.from({length:20},()=>({points:6,figures:1})));const combo=calculateMax(Array.from({length:20},()=>({points:6,figures:2})));assert.ok(combo.value>solo.value);
 const p={};recordMax(p,30,3,true);assert.equal(p.max.value,0);assert.equal(p.max.actions,1);
});
