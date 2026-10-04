import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {scoreFeedback,scoreBreakdown} from '../src/feedback.js';
const play=(r,x,y)=>localCommand(r,'move',{x,y},0);
test('Resalta las tres celdas realmente cobradas y desglosa el bonus',()=>{
  let r=createLocal('local','Ana','Luis',0);
  r.players[0].figures=2;
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]])r=play(r,x,y);
  const next=play(r,2,0),f=scoreFeedback(r,next);
  assert.equal(f.points,6);assert.equal(f.bonus,3);
  assert.deepEqual(f.cells,[{x:0,y:0},{x:1,y:0},{x:2,y:0}]);
  assert.equal(scoreBreakdown(f),'Línea de 3 · +3 / Bonus · +3');
  assert.equal(f.figures.reduce((n,g)=>n+g.size,0)+f.bonus,f.points);
});
test('Una jugada con figuras superpuestas ilumina la unión sin duplicar celdas',()=>{
  const r=createLocal('local','Ana','Luis',0);
  r.cells=[[1,0],[0,1],[2,1],[1,2]].map(([x,y],i)=>({x,y,symbol:'X',owner:'local-x',id:String(i)}));
  const next=play(r,1,1),f=scoreFeedback(r,next);
  assert.equal(f.cells.length,5);assert.ok(f.figures.some(g=>g.kind==='cruz'));
  assert.ok(f.figures.filter(g=>g.kind==='línea').length===2);
  assert.equal(f.figures.reduce((n,g)=>n+g.size,0)+f.bonus,f.points);
  assert.ok(f.groups.some(g=>g.kind==='L'&&g.count===4));
});
test('No repite la animación al recibir el mismo evento ni al recuperar una partida',()=>{
  let r=createLocal('local','Ana','Luis',0);
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]])r=play(r,x,y);
  const next=play(r,2,0);
  assert.equal(scoreFeedback(next,{...next,version:next.version+1}),null);
  assert.equal(scoreFeedback(null,next),null);
  assert.equal(scoreFeedback({...r,id:'other-room'},next),null);
});
test('Una jugada que no puntúa no resalta figuras antiguas',()=>{
  const r=createLocal('local','Ana','Luis',0),next=play(r,0,0);
  assert.equal(scoreFeedback(r,next),null);
});
test('La jugada por tiempo agotado también muestra las figuras pagadas',()=>{
  let r=createLocal('local','Ana','Luis',0);
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]])r=play(r,x,y);
  const next=localCommand(r,'tick',{},30000,()=>0),f=scoreFeedback(r,next);
  assert.ok(f);assert.equal(f.automatic,true);assert.equal(f.points,3);
});
