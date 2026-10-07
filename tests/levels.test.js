import test from 'node:test';
import assert from 'node:assert/strict';
import {figureWindows} from '../src/game.js';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {scoreFeedback,scoreBreakdown} from '../src/feedback.js';
const marks=points=>points.map(([x,y])=>({x,y,symbol:'X'}));
const forms=(points,x,y,level)=>figureWindows(marks(points),x,y,'X',level);
test('Los dos niveles pagan todas las L y el cuadrado que una ficha completa',()=>{
  for(const level of ['normal','advanced']) {
    const r=createLocal('local','A','B',0,level);r.cells=marks([[0,0],[1,0],[0,1]]);
    const n=localCommand(r,'move',{x:1,y:1},0);
    assert.equal(n.lastEvent.figures,4);assert.equal(n.lastEvent.points,16);assert.equal(n.lastEvent.bonus,3);
    assert.equal(n.forms.filter(f=>f.includes(':grupo:')).length,0);
  }
});
test('Avanzado añade la T completa a sus dos L y el aviso ilumina el grupo exacto',()=>{
  for(const level of ['normal','advanced']) {
    const r=createLocal('local','A','B',0,level);r.cells=marks([[0,0],[1,0],[2,0]]);
    const n=localCommand(r,'move',{x:1,y:1},0),f=scoreFeedback(r,n);
    assert.equal(n.lastEvent.figures,level==='advanced'?3:2);assert.equal(n.lastEvent.points,level==='advanced'?13:6);
    assert.equal(f.figures.reduce((s,g)=>s+g.size,0)+f.bonus,f.points);
    if(level==='advanced'){assert.equal(f.cells.length,4);assert.ok(scoreBreakdown(f).includes('Figura compleja de 4 · +4'));}
  }
});
test('No duplica como grupo una línea, L, cuadrado o cruz completos',()=>{
  for(const points of [[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[-1,0],[1,0],[0,-1],[0,1]]]) {
    const [x,y]=points.at(-1);assert.ok(!forms(points,x,y,'advanced').some(f=>f.kind==='grupo'));
  }
});
test('Los grupos solo se unen por lados y por el mismo símbolo',()=>{
  assert.ok(!forms([[0,0],[1,1],[2,2],[3,3]],3,3,'advanced').some(f=>f.kind==='grupo'));
  const points=[[0,0],[1,0],[2,0],[1,1]];
  const f=figureWindows([...marks(points),...marks([[10,0],[11,0],[12,0],[11,1]]),{x:1,y:2,symbol:'O'}],1,1,'X','advanced');
  assert.equal(f.filter(f=>f.kind==='grupo').length,1);assert.equal(f.find(f=>f.kind==='grupo').size,4);
});
test('Al prolongar o fusionar grupos se cobra una geometría nueva completa',()=>{
  const a=[[0,0],[1,0],[2,0],[1,1]],b=[...a,[3,0]];
  const first=forms(a,1,1,'advanced').find(f=>f.kind==='grupo'),second=forms(b,3,0,'advanced').find(f=>f.kind==='grupo');
  assert.notEqual(first.id,second.id);assert.equal(second.size,5);
  const merged=forms([...a,[4,0],[5,0],[6,0],[5,1],[3,0]],3,0,'advanced');
  assert.equal(merged.filter(f=>f.kind==='grupo').length,1);assert.equal(merged.find(f=>f.kind==='grupo').size,9);
});
test('Un grupo y una línea diagonal de igual tamaño no se confunden',()=>{
  const points=[[0,0],[1,0],[0,1],[1,1],[2,2],[3,3]];
  const f=forms(points,0,0,'advanced');
  assert.ok(f.some(f=>f.kind==='línea'&&f.size===4));
  // The full side-connected square is basic, so correctly excluded regardless of the diagonal.
  assert.ok(!f.some(f=>f.kind==='grupo'));
  const t=forms([[0,0],[1,0],[2,0],[1,1],[-1,-1],[-2,-2]],1,1,'advanced');
  assert.ok(t.some(f=>f.kind==='línea'&&f.size===4));assert.ok(t.some(f=>f.kind==='grupo'&&f.size===4));
});
test('Nivel antiguo sigue normal; los turnos vencidos y la máquina mantienen el nivel',()=>{
  assert.equal(createLocal('solo').level,'normal');assert.throws(()=>createLocal('solo','A','B',0,'otro'),/nivel/);
  const r=createLocal('solo','A','B',0,'advanced');r.cells=marks([[0,0],[1,0],[2,0]]);r.terrain=marks([[0,0],[1,0],[2,0],[1,1]]);
  const n=localCommand(r,'tick',{},33000,()=>0);assert.equal(n.lastEvent.points,13);assert.equal(n.level,'advanced');
  const old=structuredClone(r);delete old.level;assert.equal(localCommand(old,'tick',{},33000,()=>0).lastEvent.points,6);
  assert.deepEqual(machineChoice(r,()=>0).payload,{x:1,y:1,symbol:'X'});
});
