import test from 'node:test';
import assert from 'node:assert/strict';
import {savedMapModel,thumbnailMarkup,inspectionCells,bindInspection} from '../src/saved-map.js';
import {loadGamePins,toggleGamePin,saveLocalGame,loadLocalGames,deleteLocalGame,assertGameDeletionAllowed} from '../src/sessions.js';
import {createLocal,localCommand} from '../src/local.js';
import {gamesMarkup} from '../src/session-ui.js';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('Saved superior stays blue and outlined even after its last piece disappears',()=>{
 const r=createLocal('local','A','B'),own=r.players[0],target=r.players[1];target.score=10;target.lastMove={id:'o',x:1,y:1};r.cells=[{id:'o',x:1,y:1,symbol:'O',owner:target.id}];
 let m=savedMapModel(r,own);assert.equal(m.terrain.find(p=>p.x===1&&p.y===1).fill,'var(--blue)');assert.match(inspectionCells(m),/class="inspection-rival"/);
 r.cells=[];m=savedMapModel(r,own);assert.equal(m.terrain.find(p=>p.x===1&&p.y===1).fill,'var(--blue)');assert.match(inspectionCells(m),/Referencia del rival superior/);
 assert.doesNotMatch(thumbnailMarkup(r),/var\(--blue\)/);
});
test('Paused solo leader keeps O green, has no blue frame and does not change the saved game',()=>{
 const r=createLocal('solo','XTRONZIO','',0),own=r.players[0],rival=r.players[1];
 own.score=5865;rival.score=4745;rival.lastMove={id:'o',x:1,y:1};r.cells=[{...rival.lastMove,symbol:'O',owner:rival.id}];
 const paused=localCommand(r,'pause',{},1),before=JSON.stringify(paused),m=savedMapModel(paused,paused.players[0]);
 assert.equal(m.target,null);assert.equal(m.terrain.find(p=>p.x===1&&p.y===1).fill,'var(--green)');
 assert.doesNotMatch(inspectionCells(m),/inspection-rival|var\(--blue\)/);assert.equal(JSON.stringify(paused),before);
});
test('The blue reference follows ranking changes and disappears when the player regains first place',()=>{
 const r=createLocal('solo','A','',0),own=r.players[0],rival=r.players[1];
 rival.lastMove={id:'o',x:1,y:1};r.cells=[{...rival.lastMove,symbol:'O',owner:rival.id}];
 own.score=20;rival.score=30;assert.deepEqual(savedMapModel(r,own).target,{x:1.5,y:1.5});
 own.score=40;assert.equal(savedMapModel(r,own).target,null);
 own.score=30;assert.equal(savedMapModel(r,own).target,null); // Equal scores keep the established join-order ranking.
});
test('Paused reference selects the immediate superior, not the paired opponent, and uses MAX in Mundo',()=>{
 const r=createLocal('local','A','B',0),own=r.players[0],opponent=r.players[1];
 own.score=20;opponent.score=10;opponent.lastMove={id:'o',x:0,y:0};
 const superior={id:'superior',order:3,score:30,lastMove:{id:'s',x:2,y:2},max:{value:5}};
 r.players.push(superior,{id:'bot',order:4,score:100,bot:true,lastMove:{id:'b',x:0,y:2}});
 assert.deepEqual(savedMapModel(r,own).target,{x:2.5,y:2.5});
 r.commonWorld=true;own.max={value:8};opponent.max={value:12};
 assert.deepEqual(savedMapModel(r,own).target,{x:.5,y:.5});
 own.max.value=15;assert.equal(savedMapModel(r,own).target,null);
});
test('Pin metadata survives game updates without changing board, clock or save order and isolates online identities',()=>{
 const storage=memory();let a=createLocal('local','A','B',1700000000000),b=createLocal('solo','C','D',1700000001000);
 a=localCommand(a,'pause',{},1700000000001);saveLocalGame(storage,a,1700000000002);saveLocalGame(storage,b,1700000001001);
 const before=storage.getItem('hash3_locals');assert.equal(toggleGamePin(storage,a),true);assert.equal(storage.getItem('hash3_locals'),before);
 saveLocalGame(storage,a,1700000002000);assert.ok(loadGamePins(storage).includes(`local:${a.id}`));assert.equal(loadLocalGames(storage)[0].status,'paused');
 toggleGamePin(storage,{id:'remote'},'first');assert.ok(loadGamePins(storage).includes('online:first:remote'));assert.ok(!loadGamePins(storage).includes('online:second:remote'));
 assert.equal(toggleGamePin(storage,a),false);deleteLocalGame(storage,a.id);assert.equal(loadLocalGames(storage).length,1);
 const broken={getItem:()=>'{bad',setItem:()=>{throw new Error('quota');}};assert.deepEqual(loadGamePins(broken),[]);assert.throws(()=>toggleGamePin(broken,b),/quota/);
});
test('A pinned closed or paused game appears once above ongoing games with its board miniature',()=>{
 const g=createLocal('local','A','B'),closed={...g,id:'closed',status:'finished'},playing={...g,id:'open'};
 const html=gamesMarkup({local:[playing,closed],pins:['local:closed']});assert.ok(html.indexOf('Ancladas')<html.indexOf('Activas'));assert.equal((html.match(/class="saved-game is-pinned"/g)||[]).length,1);
 assert.match(html,/Miniatura del tablero, 9 casillas/);assert.match(html,/data-action="pin-game"[^>]*>.*Desanclar/);assert.match(html,/saved-group-label">Cerradas/);assert.match(html,/saved-group-count">0/);
});
test('Inspection preserves the saved state, distinguishes both teams and empties, and supports irregular negative terrain',()=>{
 const r={terrain:[{x:-9,y:-2},{x:-8,y:-2},{x:20,y:5}],cells:[{x:-9,y:-2,symbol:'X'},{x:20,y:5,symbol:'O'}],pairs:[]};
 const before=JSON.stringify(r),model=savedMapModel(r);assert.deepEqual(model.bounds,{x:-11,y:-4,width:34,height:12});assert.deepEqual(model.terrain.map(p=>p.fill),['var(--red)','#343e4c','var(--green)']);
 assert.match(inspectionCells(model),/inspection-symbols/);assert.match(inspectionCells(model),/<circle cx="20.5"/);assert.match(thumbnailMarkup(r),/viewBox="-11 -4 34 12"/);assert.equal(JSON.stringify(r),before);
 assert.equal(savedMapModel(null),null);assert.equal(savedMapModel({...r,terrain:[]}),null);assert.match(thumbnailMarkup(null),/Mapa no disponible/);
});
test('Large-map pinch coalesces camera frames without rebuilding cells, and cancellation leaves navigation usable',()=>{
 const previous=Object.fromEntries(['requestAnimationFrame','cancelAnimationFrame','ResizeObserver'].map(k=>[k,globalThis[k]]));
 const frames=new Map();let nextFrame=0,disconnected=false,builds=0;
 globalThis.requestAnimationFrame=fn=>{frames.set(++nextFrame,fn);return nextFrame;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 globalThis.ResizeObserver=class{observe(){}disconnect(){disconnected=true;}};
 const listeners=new Map(),classes=new Set(),attributes={},captures=new Set(),states=[];
 const svg={isConnected:true,getBoundingClientRect:()=>({left:0,top:0,width:390,height:650}),classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c)},setAttribute:(k,v)=>attributes[k]=v,focus(){},setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:(k)=>listeners.delete(k),set innerHTML(value){builds++;}};
 const panel={querySelector:()=>svg,addEventListener:(k,fn)=>listeners.set('panel:'+k,fn),removeEventListener:k=>listeners.delete('panel:'+k)};
 const send=(type,id,x,y)=>listeners.get(type)?.({button:0,pointerId:id,clientX:x,clientY:y,preventDefault(){}}),flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 const room={terrain:Array.from({length:2000},(_,i)=>({x:i%50-25,y:Math.floor(i/50)-20})),cells:[],pairs:[]},original=JSON.stringify(room),state={};
 let dispose;
 try{
   dispose=bindInspection(panel,savedMapModel(room),state,v=>states.push(v));const initial={...state.box};
   send('pointerdown',1,130,320);send('pointerdown',2,260,320);
   for(let i=0;i<30;i++){send('pointermove',1,130-i,320);send('pointermove',2,260+i,320);}
   assert.equal(frames.size,1);flush();assert.ok(state.box.width<initial.width);assert.equal(builds,1);
   send('pointercancel',2,289,320);send('pointermove',1,90,370);flush();send('pointerup',1,90,370);assert.deepEqual(states,[true,false]);
   send('pointerdown',3,100,100);send('pointerup',3,100,100);assert.deepEqual(states,[true,false,true,false]);
   listeners.get('panel:click')({target:{closest:()=>({dataset:{inspectAction:'fit'}})}});flush();assert.deepEqual(state.box,initial);assert.equal(JSON.stringify(room),original);assert.equal(builds,1);
   dispose();assert.ok(disconnected);assert.equal(listeners.size,0);
 }finally{dispose?.();for(const [k,v]of Object.entries(previous)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});

test('Pinning protects local saves, online removal entry points and all delete controls until unpinned',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},g=createLocal('local','A','B',1000);
 saveLocalGame(storage,g,1000);toggleGamePin(storage,g);const before=storage.getItem('hash3_locals');
 assert.throws(()=>deleteLocalGame(storage,g.id),/anclada/);assert.equal(storage.getItem('hash3_locals'),before);
 const html=gamesMarkup({local:[g],pins:loadGamePins(storage)});assert.match(html,/<button disabled[^>]*data-action="delete-game"/);assert.match(html,/class="delete-game-button" disabled/);
 const online={id:'remote',local:false};toggleGamePin(storage,online,'u');assert.throws(()=>assertGameDeletionAllowed(storage,online,'u'),/anclada/);assert.doesNotThrow(()=>assertGameDeletionAllowed(storage,online,'other'));
 toggleGamePin(storage,g);deleteLocalGame(storage,g.id);assert.equal(loadLocalGames(storage).length,0);
 assert.throws(()=>assertGameDeletionAllowed({getItem:()=>{throw Error('storage');}},online,'u'),/verificar/);
});
