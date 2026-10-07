import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGestures,swipeDirection} from '../src/gestures.js';
function harness(){
 const listeners=new Map(),open=new Set(),attributes={},ranking=[],pins=[];
 const toggle={setAttribute:(key,value)=>attributes[key]=value};
 const row={classList:{toggle:(key,on)=>on?open.add(key):open.delete(key),contains:key=>open.has(key)},querySelector:()=>toggle,setPointerCapture:()=>{}};
 const handle={setPointerCapture:()=>{}};
 const root={addEventListener:(name,listener,capture)=>{const list=listeners.get(name)||[];list.push({listener,capture:capture===true});listeners.set(name,list);},querySelectorAll:()=>open.has('is-revealed')?[row]:[]};
 bindGestures(root,{setRankingOpen:value=>ranking.push(value),togglePinned:row=>pins.push(row)});
 let prevented=false,stopped=false;
 const send=(name,x,y,{target='row',type='touch'}={})=>{
  const e={pointerId:1,pointerType:type,isPrimary:true,clientX:x,clientY:y,target:{closest:selector=>selector==='.ranking-toggle'&&target==='handle'?handle:selector==='.saved-game'&&target==='row'?row:null},preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true};
  for(const {listener} of (listeners.get(name)||[]).sort((a,b)=>Number(b.capture)-Number(a.capture)))listener(e);
 };
 return {send,open,attributes,ranking,pins,get prevented(){return prevented;},get stopped(){return stopped;}};
}
test('Swipe axis locking leaves vertical list scrolling and small or diagonal taps alone',()=>{
 assert.equal(swipeDirection(-80,5,'x'),-1);assert.equal(swipeDirection(80,5,'x'),1);
 assert.equal(swipeDirection(-10,80,'x'),0);assert.equal(swipeDirection(-30,2,'x'),0);assert.equal(swipeDirection(-50,50,'x'),0);
 const h=harness();h.send('pointerdown',100,100);h.send('pointermove',95,180);h.send('pointerup',95,180);assert.equal(h.open.size,0);assert.equal(h.prevented,false);
});
test('A row swipe reveals or hides only the delete action and suppresses its trailing click',()=>{
 const h=harness();h.send('pointerdown',150,100);h.send('pointermove',70,104);h.send('pointerup',70,104);
 assert.ok(h.open.has('is-revealed'));assert.equal(h.attributes['aria-expanded'],'true');h.send('click',70,104);assert.ok(h.stopped);
 h.send('pointerdown',70,100);h.send('pointermove',150,100);h.send('pointerup',150,100);assert.equal(h.open.size,0);
});
test('Cancelled touch and mouse drags never reveal a delete action',()=>{
 const h=harness();h.send('pointerdown',150,100);h.send('pointermove',70,100);h.send('pointercancel',70,100);assert.equal(h.open.size,0);
 const m=harness();m.send('pointerdown',150,100,{type:'mouse'});m.send('pointermove',70,100,{type:'mouse'});m.send('pointerup',70,100,{type:'mouse'});assert.equal(m.open.size,0);
});
test('Right swipe pins a row and suppresses opening; right swipe on exposed deletion only closes it',()=>{
 const h=harness();h.send('pointerdown',50,100);h.send('pointermove',140,100);h.send('pointerup',140,100);assert.equal(h.pins.length,1);h.send('click',140,100);assert.ok(h.stopped);
 h.send('pointerdown',140,100);h.send('pointermove',50,100);h.send('pointerup',50,100);h.send('pointerdown',50,100);h.send('pointermove',140,100);h.send('pointerup',140,100);assert.equal(h.pins.length,1);assert.equal(h.open.size,0);
});
test('Ranking header supports down to open and up to close without toggle clicks',()=>{
 const h=harness(),opts={target:'handle'};
 h.send('pointerdown',100,50,opts);h.send('pointermove',102,95,opts);h.send('pointerup',102,95,opts);
 h.send('pointerdown',100,100,opts);h.send('pointermove',100,50,opts);h.send('pointerup',100,50,opts);
 assert.deepEqual(h.ranking,[true,false]);
});
