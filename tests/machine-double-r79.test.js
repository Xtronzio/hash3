import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {availableCells} from '../src/game.js';
const exact=r=>{if(r.pairs[0].pending)return r.players[0].score-r.players[1].score;const scores=availableCells(r,r.pairs[0]).map(c=>exact(localCommand(r,'move',c,0)));return r.pairs[0].turn==='X'?Math.max(...scores):Math.min(...scores);};
test('Alto/PRO search the real second Doble placement, mirrored symbols and both figure levels',()=>{
 for(const difficulty of ['high','pro'])for(const level of ['normal','advanced'])for(const mirror of [false,true]){
  let r=createLocal('solo','J','',0,level,'untimed',difficulty,'X',true,{faunaEnabled:false,territoryEnabled:false});
  for(const p of [{x:2,y:0},{x:0,y:2},{x:1,y:1},{x:1,y:2},{x:0,y:0}])r=localCommand(r,'move',p,0);
  if(mirror){r.cells=r.cells.map(c=>({...c,symbol:c.symbol==='X'?'O':'X',owner:c.owner==='local-x'?'local-o':'local-x'}));r.players.forEach(p=>p.score=0);r.forms=[];r.pairs[0].turn='X';}
  r.practiceTurn={player:r.pairs[0][r.pairs[0].turn.toLowerCase()],used:['double'],remaining:2};const snapshot=structuredClone(r),optimum=exact(r);
  const choice=machineChoice(r,()=>0,{maxTimeMs:2000,maxNodes:100000,futureWeight:0});assert.equal(exact(localCommand(r,choice.action,choice.payload,0)),optimum);assert.deepEqual(r,snapshot);
 }
});
