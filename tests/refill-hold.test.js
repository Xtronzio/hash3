import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRefillHold} from '../src/floating-refill.js';
const surface=()=>{const listeners=new Map();return {addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},removeEventListener:(type,fn)=>listeners.set(type,(listeners.get(type)||[]).filter(f=>f!==fn)),emit:(type,e={})=>(listeners.get(type)||[]).forEach(fn=>fn(e))};};
test('Recarga hold cancels short taps/drags/scroll/hidden/detached gestures and opens the selector once per completed pointer or keyboard hold',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const root=surface(),win=surface(),doc=surface(),savedWindow=globalThis.window,savedDocument=globalThis.document;
 globalThis.window=win;globalThis.document=doc;
 try{
 const classes=new Set(),button={disabled:false,isConnected:true,dataset:{player:'local-x'},style:{setProperty:()=>{}},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
 const pointer={target:{closest:()=>button},isPrimary:true,button:0,clientX:10,clientY:10,preventDefault:()=>{}};const purchases=[];bindRefillHold(root,p=>purchases.push(p));
 root.emit('pointerdown',pointer);t.mock.timers.tick(2999);win.emit('pointerup');t.mock.timers.tick(1);assert.equal(purchases.length,0);
 for(const cancel of [()=>root.emit('pointermove',{clientX:30,clientY:10}),()=>doc.emit('scroll'),()=>win.emit('blur'),()=>win.emit('pointercancel'),()=>doc.emit('visibilitychange')]){root.emit('pointerdown',pointer);cancel();t.mock.timers.tick(3000);assert.equal(purchases.length,0);}
 root.emit('pointerdown',pointer);button.isConnected=false;t.mock.timers.tick(3000);assert.equal(purchases.length,0);button.isConnected=true;
 root.emit('pointerdown',pointer);t.mock.timers.tick(3000);assert.deepEqual(purchases,['local-x']);t.mock.timers.tick(9000);assert.equal(purchases.length,1);win.emit('pointerup');
 let ghostBlocked=false;
 const cardClick={target:{closest:()=>null},preventDefault:()=>{ghostBlocked=true;},stopImmediatePropagation:()=>{}};
 root.emit('click',cardClick);assert.equal(ghostBlocked,true,'Touch release must not purchase a retargeted card');
 ghostBlocked=false;root.emit('pointerdown',{...pointer,target:{closest:()=>null}});root.emit('click',cardClick);assert.equal(ghostBlocked,false,'A fresh card tap must work');
 const keyboard={...pointer,key:'Enter',repeat:false};root.emit('keydown',keyboard);t.mock.timers.tick(1500);root.emit('keydown',{...keyboard,repeat:true});t.mock.timers.tick(1500);assert.equal(purchases.length,2);root.emit('keyup',keyboard);assert.equal(classes.size,0);
 let stopped=false;root.emit('click',{...pointer,stopImmediatePropagation:()=>{stopped=true;}});assert.equal(stopped,true);assert.equal(purchases.length,2);
 }finally{globalThis.window=savedWindow;globalThis.document=savedDocument;t.mock.timers.reset();}
});
