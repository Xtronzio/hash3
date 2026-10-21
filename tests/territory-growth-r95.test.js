import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,reconcileLocalBoard} from '../src/local.js';
import {availableCells,expansionOptions} from '../src/game.js';
import {considerTerritory} from '../src/inhabitants.js';
import {markTerritoryGrowth,territoryPressure} from '../src/territory-director.js';
const NOW=1800000000000,random=()=>.4;
function board(size,free,options={}){
 const g=createLocal('local','Jorge','Rival',NOW,'normal','untimed','medium','X',false,options);
 g.terrain=Array.from({length:size},(_,i)=>({x:i%183,y:Math.floor(i/183)}));
 g.cells=g.terrain.slice(0,size-free).map((p,i)=>({...p,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
 markTerritoryGrowth(g);return g;
}
test('Nine free cells do not silence fauna or weather on dense large boards',()=>{
 for(const size of [450,999,33333])for(const options of [{fauna:['rodent'],phenomena:[]},{fauna:[],phenomena:['ufo']}]){
  const g=board(size,9,options),cells=structuredClone(g.cells),scores=g.players.map(p=>p.score);
  assert.ok(considerTerritory(g,NOW,random),`${size}: ${JSON.stringify(options)}`);
  assert.deepEqual(g.cells,cells);assert.deepEqual(g.players.map(p=>p.score),scores);
  assert.equal(g.rodentRaids[0]?.warningTurns??g.territoryEvents[0]?.turnsRemaining,3);
  const pressure=territoryPressure(g);assert.equal(pressure.fauna.length+pressure.weather.length,1);
 }
});
test('Full boards expand before announcing; the new nine cells allow warning, reaction and clearing',()=>{
 let g=board(450,0,{fauna:[],phenomena:['ufo']});
 assert.equal(considerTerritory(g,NOW,random),false);
 g=reconcileLocalBoard(g,NOW);assert.equal(g.pairs[0].pending,1);
 const cells=structuredClone(g.cells),scores=g.players.map(p=>p.score),turn=g.ecologyTurns;
 const option=expansionOptions(g.terrain,g.pairs[0].terrainAnchor||g.pairs[0].active,g)[0];
 g=localCommand(g,'expand',option,NOW,random);
 assert.equal(g.terrain.length,459);assert.deepEqual(g.cells,cells);assert.deepEqual(g.players.map(p=>p.score),scores);assert.equal(g.ecologyTurns,turn);
 assert.equal(g.territoryEvents.length,1);assert.equal(g.territoryEvents[0].turnsRemaining,3);
 const event=structuredClone(g.territoryEvents[0]);
 for(let i=1;i<=3;i++){
  g=localCommand(g,'move',availableCells(g,g.pairs[0])[0],NOW+i,random);
  if(i<3){assert.equal(g.territoryEvents.find(e=>e.id===event.id).turnsRemaining,3-i);assert.deepEqual(g.territoryEvents.find(e=>e.id===event.id).region,event.region);}
 }
 assert.ok(!g.territoryEvents.some(e=>e.id===event.id));assert.ok(g.cells.length<cells.length+3);
});
test('A silent R94 save resumes without reset and decides on the next accepted move',()=>{
 let g=board(450,9,{fauna:['rodent'],phenomena:[]});
 g=localCommand(g,'pause',{},NOW,random);const saved=JSON.parse(JSON.stringify(g)),pieces=structuredClone(g.cells);
 g=localCommand(saved,'resume',{},NOW+999999,random);
 assert.deepEqual(g.cells,pieces);assert.equal(g.territoryDirector.choices,0);assert.equal(g.rodentRaids.length,0);
 g=localCommand(g,'move',availableCells(g,g.pairs[0])[0],NOW+1000000,random);
 assert.equal(g.territoryDirector.choices,1);assert.equal(g.rodentRaids[0].warningTurns,3);
 assert.equal(g.cells.length,pieces.length+1);
});
