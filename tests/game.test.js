import test from 'node:test';
import assert from 'node:assert/strict';
import {key,figureWindows,connectedTerrain,availableCells,expansionOptions,immediateAbove,rankedPlayers} from '../src/game.js';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
const marks=(points,symbol='X')=>points.map(([x,y])=>({x,y,symbol}));
test('Líneas largas suman sus celdas y atraviesan los antiguos bloques',()=>{
  const f=figureWindows(marks([[-1,0],[0,0],[1,0],[2,0]]),2,0,'X');
  assert.equal(f.filter(v=>v.kind==='línea').length,1);assert.equal(f[0].size,4);
});
test('Reconoce L de 3 y 4, cuadrados y cruces en orientaciones diferentes',()=>{
  for(const [kind,points] of [['L',[[0,0],[0,-1],[-1,0]]],['L',[[0,0],[0,-1],[0,-2],[-1,0]]],['cuadrado',[[0,0],[1,0],[0,1],[1,1]]],['cruz',[[0,0],[-1,0],[1,0],[0,-1],[0,1]]]]) {
    assert.ok(figureWindows(marks(points),0,0,'X').some(f=>f.kind===kind&&f.size===points.length));
  }
});
test('Figuras distintas pueden compartir fichas pero sus identidades no se duplican',()=>{
  const f=figureWindows(marks([[0,0],[1,0],[2,0],[2,1],[2,2]]),2,0,'X');
  assert.equal(f.filter(v=>v.kind==='línea').length,2);assert.equal(new Set(f.map(v=>v.id)).size,f.length);
  assert.equal(figureWindows(marks([[0,0],[1,0],[2,0]]),1,0,'O').length,0);
});
test('El territorio conectado incluye huecos antiguos y excluye islas',()=>{
  const r=createLocal('local','A','B',0);r.terrain.push({x:3,y:0},{x:20,y:0});r.pairs[0].active={x:3,y:0};
  r.cells=marks([[3,0],[1,1]]);
  assert.ok(availableCells(r,r.pairs[0]).some(c=>c.x===0&&c.y===0));
  assert.ok(!availableCells(r,r.pairs[0]).some(c=>c.x===20));
  assert.equal(connectedTerrain(r.terrain,r.pairs[0].active).length,10);
});
test('Una figura no permite ampliar mientras quedan celdas vacías',()=>{
  let r=createLocal('local','A','B',0);
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1],[2,0]])r=localCommand(r,'move',{x,y},0);
  assert.equal(r.players[0].score,3);assert.equal(r.pairs[0].pending,0);assert.equal(r.pairs[0].credits,1);
  assert.throws(()=>localCommand(r,'expand',{x:3,y:0},0),/celdas vacías/);
  r=localCommand(r,'move',{x:2,y:2},0);assert.equal(r.cells.length,6);
});
test('Reutiliza un hueco del territorio anterior después de cambiar el foco',()=>{
  let r=createLocal('local','A','B',0);r.terrain.push({x:3,y:0});r.pairs[0].active={x:3,y:0};
  r=localCommand(r,'move',{x:0,y:2},0);assert.equal(r.cells[0].x,0);
});
test('Una ampliación puede añadir solo una celda y conserva todas las fichas',()=>{
  let r=createLocal('local','A','B',0);r.terrain=r.terrain.filter(c=>c.x!==2||c.y!==2);
  r.cells=r.terrain.map((c,i)=>({...c,id:String(i),symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
  r.pairs[0].pending=1;r.pairs[0].credits=1;r.pairs[0].expander='local-x';
  const before=structuredClone(r.cells);
  assert.ok(expansionOptions(r.terrain,r.pairs[0].active).some(c=>c.x===0&&c.y===0));
  r=localCommand(r,'expand',{x:0,y:0},0);
  assert.equal(r.terrain.length,9);assert.deepEqual(r.cells,before);assert.equal(r.pairs[0].pending,0);
  assert.equal(availableCells(r,r.pairs[0]).length,1);
});
test('No permite ampliar a una isla distante o sin añadir terreno',()=>{
  const r=createLocal('local','A','B',0),options=expansionOptions(r.terrain,r.pairs[0].active);
  assert.ok(!options.some(c=>c.x===99));assert.ok(!options.some(c=>c.x===0&&c.y===0));
});
test('Al agotar 33 segundos mueve al azar una sola vez, mantiene el turno y no pisa fichas',()=>{
  let r=createLocal('local','A','B',1000);r=localCommand(r,'move',{x:0,y:0},1000);
  assert.equal(localCommand(r,'tick',{},33999),r);
  r=localCommand(r,'tick',{},34000,()=>0);
  assert.equal(r.cells.length,2);assert.equal(r.cells[1].symbol,'O');assert.notEqual(key(r.cells[0].x,r.cells[0].y),key(r.cells[1].x,r.cells[1].y));
  assert.equal(r.lastEvent.automatic,true);assert.equal(localCommand(r,'tick',{},34000),r);
});
test('La máquina completa una figura posible y solo elige celdas vacías',()=>{
  const r=createLocal('solo','A','',0);r.pairs[0].turn='O';r.cells=marks([[0,0],[1,0]],'O');
  const chosen=machineChoice(r,()=>0);assert.equal(chosen.action,'move');
  const next=localCommand(r,chosen.action,chosen.payload,0);
  assert.ok(next.players[1].score>=3);assert.equal(next.cells.length,3);
});
test('Finalizar funciona desde cualquier turno y bloquea nuevas jugadas locales',()=>{
  let r=createLocal('solo','A','',0);r=localCommand(r,'move',{x:0,y:0},0);r=localCommand(r,'finish');
  assert.equal(r.status,'finished');assert.throws(()=>localCommand(r,'move',{x:1,y:0}),/no está activa/);
});
test('Referencia azul apunta al inmediato superior',()=>{
  const p=[{id:'a',score:4,order:1},{id:'b',score:6,order:2},{id:'c',score:4,order:3}];
  assert.deepEqual(rankedPlayers(p).map(v=>v.id),['b','a','c']);assert.equal(immediateAbove(p,'c').id,'a');assert.equal(immediateAbove(p,'b'),null);
});
test('La ampliación también vence: añade terreno al azar y conserva las fichas',()=>{
  let r=createLocal('local','A','B',0);
  for(const [x,y] of [[0,0],[0,1],[1,0],[1,1],[2,0],[2,2],[0,2],[2,1],[1,2]])r=localCommand(r,'move',{x,y},0);
  const before=structuredClone(r.cells);
  assert.equal(r.pairs[0].pending,1);assert.equal(Date.parse(r.pairs[0].deadline),33000);
  assert.equal(localCommand(r,'tick',{},32999),r);
  assert.throws(()=>localCommand(r,'expand',{x:3,y:0},33000),/Tiempo agotado/);
  r=localCommand(r,'tick',{},33000,()=>0);
  assert.deepEqual(r.cells,before);assert.ok(r.terrain.length>9);assert.equal(r.pairs[0].pending,0);
  assert.equal(r.lastEvent.kind,'expand');assert.equal(r.lastEvent.automatic,true);
  assert.equal(localCommand(r,'tick',{},33000),r);
});
