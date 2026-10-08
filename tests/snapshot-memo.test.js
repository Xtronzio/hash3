import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotMemo} from '../src/snapshot-memo.js';
import {createLocal} from '../src/local.js';
import {expansionOptions} from '../src/game.js';
test('Expansion preview taps reuse choices; accepted changes invalidate the prepared options',()=>{
 const r=createLocal('local','A','B',1000,'normal','untimed');let preparations=0;
 const choices=()=>snapshotMemo(r,'expansion',()=>{preparations++;return expansionOptions(r.terrain,r.pairs[0].active,r);});
 const original=choices();for(let tap=0;tap<100;tap++)assert.equal(choices(),original);assert.equal(preparations,1);
 r.terrain.push({x:3,y:0});r.version++;const changed=choices();assert.equal(preparations,2);assert.notEqual(changed,original);
 assert.deepEqual(changed,expansionOptions(r.terrain,r.pairs[0].active,r));
 const saved=structuredClone(r);assert.notEqual(snapshotMemo(saved,'expansion',()=>expansionOptions(saved.terrain,saved.pairs[0].active,saved)),changed);
});
