import test from 'node:test';
import assert from 'node:assert/strict';
import {bindBoardNavigation} from '../src/board-navigation.js';

function harness(){
 const listeners=new Map(),frames=new Map(),classes=new Set(),captures=new Set(),commits=[],interactions=[];
 let id=0,stopped=false;
 const previous={request:globalThis.requestAnimationFrame,cancel:globalThis.cancelAnimationFrame};
 globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
 globalThis.cancelAnimationFrame=n=>frames.delete(n);
 const space={style:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
 const board={parentElement:space,style:{width:'2000px',height:'1500px'}};
 const viewport={isConnected:true,scrollLeft:300,scrollTop:200,clientLeft:0,clientTop:0,
  querySelector:()=>board,getBoundingClientRect:()=>({left:10,top:20}),
  setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
  addEventListener:(kind,fn)=>listeners.set(kind,fn)};
 const layout={minX:-5,minY:3,size:48,padding:100};
 bindBoardNavigation({viewport,layout,zoom:1,changeZoom:(...args)=>commits.push(args),interacting:value=>interactions.push(value),update:()=>{}});
 const send=(kind,id,x,y)=>listeners.get(kind)?.({pointerId:id,button:0,clientX:x,clientY:y,target:{closest:()=>null},preventDefault:()=>{},stopPropagation:()=>{stopped=true;}});
 return {board,space,viewport,classes,commits,interactions,send,
  flush:()=>{for(const [n,fn] of [...frames]){frames.delete(n);fn();}},
  get stopped(){return stopped;},restore:()=>{globalThis.requestAnimationFrame=previous.request;globalThis.cancelAnimationFrame=previous.cancel;}};
}

test('Pinch coalesces visual frames and commits only once with its original world point',()=>{
 const h=harness();try{
  h.send('pointerdown',1,110,120);h.send('pointerdown',2,210,120);
  for(let i=0;i<20;i++)h.send('pointermove',2,310,140);
  assert.equal(h.commits.length,0);h.flush();assert.equal(h.commits.length,0);
  assert.ok(h.board.style.transform.startsWith('scale('));assert.ok(h.classes.has('is-navigating'));
  h.send('pointerup',2,310,140);
  assert.equal(h.commits.length,1);assert.equal(h.board.style.transform,'');assert.equal(h.classes.size,0);
  const [zoom,gesture,anchor]=h.commits[0];assert.ok(zoom>2&&zoom<2.2);assert.equal(gesture,true);
  assert.deepEqual(anchor.point,{x:-5+350/48,y:3+200/48});assert.deepEqual(anchor.screen,{x:200,y:110});
  h.send('pointerup',1,110,120);h.send('lostpointercapture',1,110,120);assert.equal(h.commits.length,1);assert.equal(h.interactions.at(-1),false);
 }finally{h.restore();}
});
test('Tap never zooms or suppresses placement; dragging suppresses its trailing click',()=>{
 const h=harness();try{
  h.send('pointerdown',1,110,120);h.send('pointerup',1,110,120);h.send('click',1,110,120);
  assert.equal(h.commits.length,0);assert.equal(h.stopped,false);assert.equal(h.interactions.at(-1),false);
  h.send('pointerdown',1,110,120);h.send('pointermove',1,150,140);assert.equal(h.viewport.scrollLeft,260);assert.equal(h.viewport.scrollTop,180);
  h.send('pointerup',1,150,140);h.send('click',1,150,140);assert.equal(h.stopped,true);assert.equal(h.commits.length,0);
 }finally{h.restore();}
});
test('Cancelled pinch clears the preview, commits once, and allows the remaining finger to drag',()=>{
 const h=harness();try{
  h.send('pointerdown',1,110,120);h.send('pointerdown',2,210,120);h.send('pointermove',2,160,120);h.flush();
  h.send('pointercancel',2,160,120);assert.equal(h.commits.length,1);assert.equal(h.board.style.transform,'');
  const left=h.viewport.scrollLeft;h.send('pointermove',1,90,120);assert.equal(h.viewport.scrollLeft,left+20);
  h.send('pointerup',1,90,120);assert.equal(h.commits.length,1);assert.equal(h.interactions.at(-1),false);
 }finally{h.restore();}
});
