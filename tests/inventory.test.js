import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {canUsePracticeHint,usePracticeHint} from '../src/inventory.js';
import {availableCells} from '../src/game.js';
import {saveLocalGame,loadLocalGames,deleteLocalGame} from '../src/sessions.js';
const now=1700000000000;
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('Practice hint suggests a legal scoring move without moving, changing the clock or modifying MAX',()=>{
 let game=createLocal('local','A','B',now);
 for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]])game=localCommand(game,'move',{x,y},now);
 const original=structuredClone(game),helped=usePracticeHint(game,'local-x',now+1000);
 assert.deepEqual(game,original);assert.deepEqual(helped.cells,game.cells);assert.deepEqual(helped.pairs,game.pairs);assert.deepEqual(helped.players[0].max,game.players[0].max);
 assert.equal(helped.players[0].practiceHints,1);assert.ok(availableCells(game,game.pairs[0]).some(c=>c.x===helped.practiceHint.x&&c.y===helped.practiceHint.y));
 const moved=localCommand(helped,'move',helped.practiceHint,now+1000);assert.ok(moved.players[0].score>game.players[0].score);assert.equal(moved.practiceHint,undefined);
 const storage=memory();saveLocalGame(storage,helped,now+1000);assert.deepEqual(loadLocalGames(storage)[0].practiceHint,helped.practiceHint);
});
test('Practice inventory respects the turn, paused games, expansion, clock and online restriction',()=>{
 const game=createLocal('solo','A','B',now);
 assert.equal(canUsePracticeHint(game,'local-o',now),false);assert.throws(()=>usePracticeHint(game,'local-o',now));
 assert.equal(canUsePracticeHint({...game,mode:undefined,commonWorld:true},'local-x',now),false);
 assert.equal(canUsePracticeHint(localCommand(game,'pause',{},now+1000),'local-x',now),false);
 assert.equal(canUsePracticeHint(game,'local-x',now+30000),false);
 const pending=structuredClone(game);pending.pairs[0].pending=1;assert.equal(canUsePracticeHint(pending,'local-x',now),false);
 const unlimited=createLocal('solo','A','B',now,'normal','untimed');assert.equal(canUsePracticeHint(unlimited,'local-x',now+86400000),true);
});
test('Deleting one local save preserves other games and cannot resurrect the legacy pointer',()=>{
 const storage=memory(),a=createLocal('solo','A','B',now),b=createLocal('local','C','D',now+1000);
 saveLocalGame(storage,a,now);saveLocalGame(storage,b,now+1000);
 const partial={getItem:storage.getItem,setItem:(k,v)=>{if(k==='hash3_local')throw new Error('legacy quota');storage.setItem(k,v);}};
 deleteLocalGame(partial,b.id);assert.deepEqual(loadLocalGames(storage).map(g=>g.id),[a.id]);
 deleteLocalGame(partial,a.id);assert.deepEqual(loadLocalGames(storage),[]);
 const one=memory();saveLocalGame(one,a,now);const failing={getItem:one.getItem,setItem:()=>{throw new Error('quota');}};
 assert.throws(()=>deleteLocalGame(failing,a.id));assert.equal(loadLocalGames(one)[0].id,a.id);
});
