import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {machineMoveScore} from '../src/machine.js';
import {availableCells,expansionOptions,terrainOf} from '../src/game.js';
import {loadLocalGames,saveLocalGame} from '../src/sessions.js';
const seedRandom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const score=r=>r.players[0].score-r.players[1].score;
function exactContinuation(room){
  if(room.pairs[0].pending)return score(room);
  const values=availableCells(room,room.pairs[0]).map(c=>exactContinuation(localCommand(room,'move',c,0)));
  return room.pairs[0].turn==='X'?Math.max(...values):Math.min(...values);
}
test('El cálculo del rival coincide con el árbitro: figuras, solapamientos, grupos y bonus',()=>{
  for(const level of ['normal','advanced'])for(let seed=1;seed<=5;seed++){
    const random=seedRandom(seed);let room=createLocal('solo','A','',0,level,'untimed','pro');
    for(let turn=0;turn<24;turn++){
      if(room.pairs[0].pending){const choices=expansionOptions(terrainOf(room),room.pairs[0].active);room=localCommand(room,'expand',choices[Math.floor(random()*choices.length)],0);}
      const free=availableCells(room,room.pairs[0]);
      for(const c of free){const predicted=machineMoveScore(room,c),actual=localCommand(room,'move',c,0);assert.equal(predicted.points,actual.lastEvent.points);assert.equal(predicted.figures,actual.lastEvent.figures);}
      room=localCommand(room,'move',free[Math.floor(random()*free.length)],0);
    }
  }
});
test('Pro elige la continuación óptima del bloque frente a todas las respuestas legales, no solo puntos inmediatos',()=>{
  let differentFromMedium=0;
  for(const level of ['normal','advanced'])for(let seed=1;seed<=12;seed++){
    const random=seedRandom(seed);let room=createLocal('solo','A','',0,level,'untimed','pro');
    for(let n=0;n<5;n++){const free=availableCells(room,room.pairs[0]);room=localCommand(room,'move',free[Math.floor(random()*free.length)],0);}
    const snapshot=structuredClone(room),best=exactContinuation(room);
    const chosen=machineChoice(room,random,{maxTimeMs:10000,maxNodes:500000,futureWeight:0});
    assert.equal(exactContinuation(localCommand(room,chosen.action,chosen.payload,0)),best);assert.deepEqual(room,snapshot);
    const medium=machineChoice({...room,difficulty:'medium'},()=>0);
    if(exactContinuation(localCommand(room,medium.action,medium.payload,0))>best)differentFromMedium++;
  }
  assert(differentFromMedium>0,'Las posiciones deben incluir una trampa que el rival inmediato no resuelve.');
});
test('Los cuatro niveles amplían legalmente y Pro respeta el presupuesto aun en un tablero grande',()=>{
  let room=createLocal('solo','A','',0,'advanced','untimed','pro');
  for(const c of [...room.terrain])room=localCommand(room,'move',c,0);
  for(const difficulty of ['basic','medium','high','pro']){
    const snapshot=structuredClone(room),chosen=machineChoice({...room,difficulty},seedRandom(4),{maxTimeMs:100,maxNodes:200});
    assert.equal(chosen.action,'expand');assert(expansionOptions(terrainOf(room),room.pairs[0].active).some(c=>c.x===chosen.payload.x&&c.y===chosen.payload.y));
    assert(localCommand(room,chosen.action,chosen.payload,0).terrain.length>room.terrain.length);assert.deepEqual(room,snapshot);
  }
  const terrain=Array.from({length:500},(_,i)=>({x:i%25,y:Math.floor(i/25)}));
  const large={...room,terrain,cells:terrain.slice(0,-9).map((c,i)=>({...c,symbol:i%2?'X':'O'})),pairs:[{...room.pairs[0],pending:0,turn:'O'}]};
  let analysis;const choice=machineChoice(large,()=>0,{maxTimeMs:80,maxNodes:300,onAnalysis:a=>analysis=a});
  assert(availableCells(large,large.pairs[0]).some(c=>c.x===choice.payload.x&&c.y===choice.payload.y));assert(analysis.nodes<=301);
});
test('La dificultad se conserva al pausar, guardar y retomar; los guardados antiguos usan Medio',()=>{
  let room=createLocal('solo','A','',0,'normal','untimed','pro');room=localCommand(room,'move',{x:0,y:0},0);room=localCommand(room,'pause',{},0);
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  saveLocalGame(storage,room,0);const loaded=loadLocalGames(storage)[0];assert.equal(loaded.difficulty,'pro');assert.match(loaded.players[1].name,/Pro/);
  assert.equal(localCommand(loaded,'resume',{},0).difficulty,'pro');
  delete loaded.difficulty;let analysis;machineChoice(localCommand(loaded,'resume',{},0),()=>0,{onAnalysis:a=>analysis=a});assert.equal(analysis.level,'medium');
  assert.throws(()=>createLocal('solo','A','',0,'normal','untimed','god'),/Básico/);
  assert.equal(createLocal('local','A','B',0).difficulty,undefined);
});
