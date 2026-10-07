import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotQueue} from '../src/snapshot-queue.js';
const next=()=>new Promise(resolve=>setImmediate(resolve));
test('Online thumbnails share reads across redraws, cap concurrency and let removal wait until a read ends',async()=>{
 const calls=[],finish=new Map(),saved=[];
 const queue=createSnapshotQueue(code=>{calls.push(code);return new Promise(resolve=>finish.set(code,resolve));},(key,value)=>saved.push([key,value]));
 const a=queue.request('a','A'),b=queue.request('b','B'),c=queue.request('c','C');assert.equal(queue.request('a','A'),a);
 await next();assert.deepEqual(calls,['A','B']);assert.equal(queue.get('a'),a);
 finish.get('A')({id:'A'});await a;await next();assert.deepEqual(calls,['A','B','C']);assert.equal(queue.get('a'),undefined);
 finish.get('B')({id:'B'});finish.get('C')({id:'C'});await Promise.all([b,c]);assert.equal(saved.length,3);
});
test('A closed list cancels queued reads, and a failed read does not block later previews',async()=>{
 const calls=[],finish=new Map();let visible=true;
 const queue=createSnapshotQueue(code=>{calls.push(code);return new Promise((resolve,reject)=>finish.set(code,{resolve,reject}));});
 const a=queue.request('a','A').catch(e=>e.message),b=queue.request('b','B'),cancelled=queue.request('c','C',()=>visible);await next();visible=false;
 finish.get('A').reject(new Error('offline'));assert.equal(await a,'offline');assert.equal(await cancelled,null);assert.deepEqual(calls,['A','B']);
 finish.get('B').resolve({});await b;await next();const d=queue.request('d','D');await next();finish.get('D').resolve({id:'D'});assert.deepEqual(await d,{id:'D'});
});
