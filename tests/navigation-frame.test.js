import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationFrame} from '../src/navigation-frame.js';

test('Map motion paints the latest camera once per frame and flushes on release',()=>{
 const oldRequest=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 const frames=new Map();let id=0,camera=0;const painted=[];
 globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 try{
  const frame=navigationFrame(()=>painted.push(camera));
  for(camera=1;camera<=1000;camera++)frame.queue();
  camera=1000;assert.equal(frames.size,1);assert.deepEqual(painted,[]);
  for(const [id,fn] of frames){frames.delete(id);fn();}
  assert.deepEqual(painted,[1000]);
  camera=1001;frame.queue();camera=1002;frame.flush();
  assert.equal(frames.size,0);assert.deepEqual(painted,[1000,1002]);
  frame.queue();frame.cancel();assert.equal(frames.size,0);
  frame.queue();assert.equal(frames.size,1);frame.cancel();
 }finally{globalThis.requestAnimationFrame=oldRequest;globalThis.cancelAnimationFrame=oldCancel;}
});
