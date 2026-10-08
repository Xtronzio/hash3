import test from 'node:test';import assert from 'node:assert/strict';
import {boardCellLimit} from '../src/board-limits.js';
import {createLocal,localCommand,reconcileLocalBoard} from '../src/local.js';
import {expansionOptions} from '../src/game.js';
import {toolCells} from '../src/practice-tools.js';
import {canRequestFreeExpansion} from '../src/free-expansion.js';
const classic=()=>createLocal('local','A','B',1000,'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
test('33333 classic cells applies only with both ecology switches off and always excludes Mundo',()=>{
 const room=classic();assert.equal(boardCellLimit(room),33333);assert.equal(boardCellLimit({...room,kind:'duel'}),33333);assert.equal(boardCellLimit({...room,commonWorld:true}),Infinity);assert.equal(boardCellLimit({...room,mode:'world'}),Infinity);assert.equal(boardCellLimit({...room,faunaEnabled:true}),Infinity);assert.equal(boardCellLimit({...room,territoryEnabled:true}),Infinity);
});
test('The limit measures actual terrain, filters oversized expansions and blocks construction/free expansion at capacity',()=>{
 const r=classic();r.terrain=Array.from({length:33330},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.players[0].freeExpansions=1;
 const known=new Set(r.terrain.map(c=>`${c.x},${c.y}`));const options=expansionOptions(r.terrain,r.pairs[0].active,r);assert.ok(options.length);
 for(const p of options){let added=0;for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(!known.has(`${p.x+x},${p.y+y}`))added++;assert.ok(known.size+added<=33333);}
 r.terrain.push({x:0,y:1010},{x:1,y:1010},{x:2,y:1010});assert.equal(expansionOptions(r.terrain,r.pairs[0].active,r).length,0);assert.equal(toolCells(r,'local-x','activate').length,0);assert.equal(canRequestFreeExpansion(r,'local-x'),false);
});
test('An existing board at the cap closes immediately even with empty cells',()=>{
 let r=classic();r.terrain=Array.from({length:33333},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.cells=[];
 r=reconcileLocalBoard(r,2000);assert.equal(r.status,'finished');assert.equal(r.finishReason,'board-limit');assert.equal(r.terrain.length,33333);assert.equal(r.pairs[0].pending,0);assert.ok(r.finishedAt);
});
