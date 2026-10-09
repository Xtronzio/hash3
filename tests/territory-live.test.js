import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {territoryRegion,advanceTerritory} from '../src/territory-tools.js';
import {TERRITORY_EVENT_RULES,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,EVENT_RHYTHM,impactCount,pickEventKind,confirmEventKind} from '../src/territory-event-rules.js';
import {plannedEventRegion} from '../src/territory-event-actions.js';

const make=()=>{
 const room=createLocal('local','A','B',1000,'normal','untimed');
 room.terrain=Array.from({length:999},(_,i)=>({x:i%33,y:Math.floor(i/33)}));
 room.cells=room.terrain.map((c,i)=>({...c,id:'piece:'+i,owner:i%2?'local-x':'local-o',symbol:i%2?'X':'O'}));
 room.players[0].figures=120;
 return room;
};
const present=r=>new Set(r.terrain.map(p=>p.x+','+p.y));
const eventRegion=(room,kind)=>{
 if(kind==='ufo')return territoryRegion(room,'ufo',()=>.31,impactCount(room,kind));
 if(kind==='earthquake')return territoryRegion(room,'cataclysm',()=>.31,impactCount(room,kind));
 const planned=plannedEventRegion(room,kind,()=>.31,1000);
 return planned;
};
for(const kind of [...NATURAL_EVENT_ROTATION,...INVADER_EVENT_ROTATION]){
 test(kind+' has a valid footprint, preserves scores, and executes the declared consequence',()=>{
  const r=make(),oldCells=r.cells.length,oldTerrain=r.terrain.length,oldScore=73;
  r.players[0].score=oldScore;
  const plan=eventRegion(r,kind),region=Array.isArray(plan)?plan:plan.region;
  assert.ok(region.length>0,kind+' selects region');
  assert.equal(new Set(region.map(p=>p.x+','+p.y)).size,region.length);
  assert.ok(region.every(p=>present(r).has(p.x+','+p.y)));
  if(kind==='invader-colony'||kind==='blackhole')assert.equal(region.length,9);
  if(kind==='meteorites'||kind==='earthquake')assert.equal(region.length,99);
  r.territoryEvents=[{id:'event:'+kind,kind,region,...(plan.groups?{groups:plan.groups}:{}),nextAt:2000}];
  const effect=advanceTerritory(r,2000),expected=TERRITORY_EVENT_RULES[kind].effect;
  assert.ok(effect.length>0);
  assert.equal(r.players[0].score,oldScore);
  assert.equal(r.territoryEvents.length,0);
  if(expected==='demolish'){
   assert.equal(r.terrain.length,oldTerrain-region.length);
   assert.equal(r.cells.length,oldCells-region.length);
  }else if(expected==='vacate'){
   assert.equal(r.terrain.length,oldTerrain);
   assert.equal(r.cells.length,oldCells-region.length);
  }else if(expected==='colonize'){
   assert.equal(r.terrain.length,oldTerrain);
   assert.equal(r.cells.length,oldCells);
   assert.equal(r.cells.filter(c=>c.symbol==='*').length,region.length);
  }else if(expected==='shuffle'){
   assert.equal(r.terrain.length,oldTerrain);
   assert.equal(r.cells.length,oldCells);
  }else if(expected==='blackhole'){
   assert.equal(r.terrain.length,oldTerrain);
   assert.equal(r.cells.length,oldCells-9);
  }
 });
}
test('Metorite and earthquake demolition shares the same 33/333 budget, with distinct distributions',()=>{
 const room=make(),m=plannedEventRegion(room,'meteorites',()=>.2,1000);
 const e=territoryRegion(room,'cataclysm',()=>.31,impactCount(room,'earthquake'));
 assert.equal(m.length,e.length);
 assert.equal(m.length,99);
 const concentration=points=>{
  const set=new Set(points.map(p=>p.x+','+p.y));
  return points.reduce((sum,p)=>sum+[[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y])=>set.has((p.x+x)+','+(p.y+y))).length,0);
 };
 assert.ok(concentration(e)>concentration(m));
});
test('Invaders inherit one slot of each three announcements while natural types rotate',()=>{
 const r=make(),families=[],kinds=[];
 for(let i=0;i<15;i++){
  const current=pickEventKind(r,()=>0);families.push(current.family);kinds.push(current.order[0]);confirmEventKind(r,current);
 }
 assert.deepEqual(families.slice(0,6),['invaders','natural','natural','invaders','natural','natural']);
 assert.equal(kinds.filter(k=>INVADER_EVENT_ROTATION.includes(k)).length,5);
 assert.equal(new Set(kinds.filter(k=>NATURAL_EVENT_ROTATION.includes(k))).size,7);
});
test('Historical rain/cataclysm definitions remain recognised and do not become asterisks',()=>{
 for(const kind of ['rain','cataclysm']){
  const room=make(),region=territoryRegion(room,kind,()=>.31,99);
  room.territoryEvents=[{id:'legacy:'+kind,kind,region,nextAt:2000}];
  assert.equal(advanceTerritory(room,2000).length,99);
  assert.equal(room.cells.filter(c=>c.symbol==='*').length,0);
 }
});
