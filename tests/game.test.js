import test from 'node:test';
import assert from 'node:assert/strict';
import {lineWindows, expansionOptions, immediateAbove, rankedPlayers} from '../src/game.js';
test('Una jugada puede completar dos líneas y usar fichas de compañeros', () => {
  const cells = [[0,0],[1,0],[2,0],[2,1],[2,2]].map(([x,y],i) => ({x,y,symbol:'X',owner:i%2}));
  assert.equal(lineWindows(cells,2,0,'X').length,2);
  assert.equal(lineWindows(cells,2,0,'O').length,0);
});
test('Las diagonales cruzan límites de bloques y coordenadas negativas', () => {
  const cells=[[-1,-1],[0,0],[1,1]].map(([x,y])=>({x,y,symbol:'O'}));
  assert.deepEqual(lineWindows(cells,0,0,'O'),['O:-1,-1:1,1']);
});
test('Una ficha rival interrumpe una línea',()=> {
  assert.deepEqual(lineWindows([{x:0,y:0,symbol:'X'},{x:1,y:0,symbol:'O'},{x:2,y:0,symbol:'X'}],2,0,'X'),[]);
});
test('Expansión prioriza vecinos, evita solapar y no salta a componentes lejanas',()=>{
  const choices=expansionOptions([{x:0,y:0},{x:1,y:0},{x:20,y:20}],{x:0,y:0});
  assert.equal(choices.length,3);
  assert.ok(choices.every(p=>Math.abs(p.x)+Math.abs(p.y)===1));
});
test('Si el bloque está rodeado, se busca el extrarradio conectado más cercano',()=>{
  const choices=expansionOptions([{x:0,y:0},{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}],{x:0,y:0});
  assert.equal(choices.length,8);
  assert.ok(choices.every(p=>Math.abs(p.x)+Math.abs(p.y)===2));
});
test('Referencia azul apunta al inmediato superior, y el líder no tiene referencia',()=>{
  const players=[{id:'a',score:4,order:1},{id:'b',score:6,order:2},{id:'c',score:4,order:3}];
  assert.deepEqual(rankedPlayers(players).map(p=>p.id),['b','a','c']);
  assert.equal(immediateAbove(players,'c').id,'a');
  assert.equal(immediateAbove(players,'b'),null);
});
