import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {loadLocalGames,saveLocalGame,selectExpansion,voteCounts} from '../src/sessions.js';
import {expansionOptions,terrainOf} from '../src/game.js';
const now=1700000000000;
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('Local pause freezes board, turn, scores and the exact remaining clock across a week',()=>{
 let g=createLocal('solo','A','B',now);g=localCommand(g,'move',{x:0,y:0},now+1000);
 const frozen=localCommand(g,'pause',{},now+9000);assert.equal(frozen.pauseRemainingMs,22000);
 assert.equal(frozen.pairs[0].deadline,null);assert.deepEqual(frozen.cells,g.cells);assert.equal(frozen.pairs[0].turn,'O');
 assert.equal(localCommand(frozen,'tick',{},now+7*86400000),frozen);
 assert.throws(()=>localCommand(frozen,'move',{x:1,y:0},now+7*86400000));
 const resumed=localCommand(frozen,'resume',{},now+7*86400000);assert.equal(Date.parse(resumed.pairs[0].deadline),now+7*86400000+22000);assert.deepEqual(resumed.cells,g.cells);
});
test('Unlimited local turns and expansion never place a timeout move',()=>{
 let g=createLocal('local','A','B',now,'normal','untimed');assert.equal(g.pairs[0].deadline,null);
 assert.equal(localCommand(g,'tick',{},now+100*86400000),g);
 for(let i=0;i<9;i++)g=localCommand(g,'move',{x:i%3,y:Math.floor(i/3)},now+(i+1)*86400000);
 assert.equal(g.pairs[0].pending,1);assert.equal(localCommand(g,'tick',{},now+100*86400000),g);
 const point=expansionOptions(terrainOf(g),g.pairs[0].active)[0];let choice=selectExpansion(null,point);assert.equal(choice.confirm,false);assert.equal(g.terrain.length,9);
 choice=selectExpansion(choice.selected,point);assert.equal(choice.confirm,true);
 g=localCommand(g,'expand',point,now+100*86400000);assert.ok(g.terrain.length>9);assert.equal(g.cells.length,9);assert.equal(g.pairs[0].deadline,null);
});
test('Multiple saved games remain independent, including closed games and legacy migration',()=>{
 const storage=memory();let a=createLocal('solo','A','B',now),b=createLocal('local','C','D',now+1000);
 a=localCommand(a,'move',{x:0,y:0},now+1000);a=localCommand(a,'pause',{},now+3000);saveLocalGame(storage,a,now+3000);
 b=localCommand(b,'finish',{},now+4000);saveLocalGame(storage,b,now+4000);
 const loaded=loadLocalGames(storage);assert.equal(loaded.length,2);assert.equal(loaded.find(x=>x.id===a.id).cells.length,1);assert.equal(loaded.find(x=>x.id===a.id).status,'paused');assert.equal(loaded.find(x=>x.id===b.id).status,'finished');
 const old=memory();old.setItem('hash3_local',JSON.stringify(createLocal('solo','Old','B',now)));
 const imported=loadLocalGames(old,now+86400000)[0];assert.equal(imported.status,'paused');assert.equal(imported.pauseRemainingMs,30000);assert.equal(imported.cells.length,0);
});
test('A room of ten humans needs six affirmative votes, and local quota failure preserves saves',()=>{
 assert.deepEqual(voteCounts({eligible:Array(10).fill('x'),votes:{a:true,b:true,c:true,d:true,e:true,f:false}}),{total:10,required:6,yes:5,no:1});
 const storage=memory(),a=createLocal('solo','A','B',now);saveLocalGame(storage,a,now);
 const limited={getItem:storage.getItem,setItem:()=>{throw new Error('quota');}};assert.throws(()=>saveLocalGame(limited,createLocal('solo','B','C',now+1000)));
 assert.equal(loadLocalGames(storage)[0].id,a.id);
});
