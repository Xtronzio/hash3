import test from 'node:test';import assert from 'node:assert/strict';
import {copyPreparedText,copyText} from '../src/clipboard.js';
test('Starts clipboard write inside the click gesture before async profile generation resolves',async()=>{
 let resolve,called=false,blob;const task=new Promise(r=>resolve=r);
 class Item{constructor(data){blob=data['text/plain'];}}
 const copied=copyPreparedText(task,{Item,clipboard:{write(items){called=true;assert.equal(items.length,1);return blob.then(()=>{});}}});
 assert.equal(called,true);resolve('private-test-link');assert.equal(await copied,true);assert.equal(await (await blob).text(),'private-test-link');
});
test('Clipboard denial uses fallback; never reports success when both routes fail',async()=>{
 const clipboard={writeText(){return Promise.reject(Error('Denied'));}};
 let value;assert.equal(await copyText('test',{clipboard,fallback:t=>(value=t,true)}),true);assert.equal(value,'test');
 assert.equal(await copyText('test',{clipboard,fallback:()=>false}),false);
});
test('Preparation failure cannot copy an empty or invalid link and propagates its error',async()=>{
 let writeText=0,fallback=0;class Item{constructor(data){data['text/plain'].catch(()=>{});}}
 await assert.rejects(copyPreparedText(Promise.reject(Error('Service unavailable')),{Item,clipboard:{write:()=>Promise.reject(Error('Denied')),writeText:()=>writeText++},fallback:()=>fallback++}),/Service unavailable/);
 assert.equal(writeText,0);assert.equal(fallback,0);
});
test('A prepared link copy starts writeText synchronously without asking the server again',async()=>{
 let called=false;const task=copyText('test',{clipboard:{writeText(){called=true;return Promise.resolve();}}});assert.equal(called,true);assert.equal(await task,true);
});
