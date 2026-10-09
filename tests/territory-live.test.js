import test from 'node:test';
import {key} from '../src/game.js';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {territoryRegion,advanceTerritory} from '../src/territory-tools.js';
import {TERRITORY_EVENT_RULES,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,impactCount,pickEventKind,confirmEventKind,territoryAttemptInterval} from '../src/territory-event-rules.js';
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
 test(kind+' has a valid footprint, preserves earned scores, scores new landing figures, and executes the declared consequence',()=>{
  const r=make(),oldCells=r.cells.length,oldTerrain=r.terrain.length,oldScore=73;
  r.players[0].score=oldScore;
  const plan=eventRegion(r,kind),region=Array.isArray(plan)?plan:plan.region;
  assert.ok(region.length>0,kind+' selects region');
  assert.equal(new Set(region.map(p=>p.x+','+p.y)).size,region.length);
  assert.ok(region.every(p=>present(r).has(p.x+','+p.y)));
  if(kind==='blackhole')assert.equal(region.length,18);if(kind==='invader-colony')assert.equal(region.length,2);
  if(kind==='meteorites'||kind==='earthquake')assert.equal(region.length,27);
  r.territoryEvents=[{id:'event:'+kind,kind,region,...(plan.groups?{groups:plan.groups}:{}),nextAt:2000}];
  const effect=advanceTerritory(r,2000),expected=TERRITORY_EVENT_RULES[kind].effect;
  assert.ok(effect.length>0);
  if(['shuffle','blackhole'].includes(expected)){assert.equal(r.players[0].score,oldScore+(r.landingEvent?.scores.find(s=>s.symbol==='X')?.points||0));}else assert.equal(r.players[0].score,oldScore);
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
   assert.equal(r.cells.length,oldCells-region.length);
  }
 });
}
test('Metorite and earthquake demolition shares the same 3% budget, with distinct distributions',()=>{
 const room=make(),m=plannedEventRegion(room,'meteorites',()=>.2,1000);
 const e=territoryRegion(room,'cataclysm',()=>.31,impactCount(room,'earthquake'));
 assert.equal(m.length,e.length);
 assert.equal(m.length,27);
 const concentration=points=>{
  const set=new Set(points.map(p=>p.x+','+p.y));
  return points.reduce((sum,p)=>sum+[[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y])=>set.has((p.x+x)+','+(p.y+y))).length,0);
 };
 assert.ok(concentration(e)>concentration(m));
});
test('Each family draws without replacement independently and survives serialization',()=>{
 let r=make();const natural=[],invaders=[];
 for(let i=0;i<7;i++){
  const n=pickEventKind(r,'natural');natural.push(n.order[0]);confirmEventKind(r,n);
  if(i<4){const v=pickEventKind(r,'invaders');invaders.push(v.order[0]);confirmEventKind(r,v);}
  r=JSON.parse(JSON.stringify(r));
 }
 assert.deepEqual([...natural].sort(),[...NATURAL_EVENT_ROTATION].sort());
 for(const pair of [invaders.slice(0,2),invaders.slice(2)])assert.deepEqual(pair.sort(),[...INVADER_EVENT_ROTATION].sort());
});
test('Historical rain/cataclysm definitions remain recognised and do not become asterisks',()=>{
 for(const kind of ['rain','cataclysm']){
  const room=make(),region=territoryRegion(room,kind,()=>.31,99);
  room.territoryEvents=[{id:'legacy:'+kind,kind,region,nextAt:2000}];
  assert.equal(advanceTerritory(room,2000).length,99);
  assert.equal(room.cells.filter(c=>c.symbol==='*').length,0);
 }
});
test('Impact rechecks current anchors, protected cells and work reservations',()=>{
 const r=make(),first={x:10,y:10};
 r.pairs[0].terrainAnchor=first;r.works=[{id:'work',kind:'work',done:0,destroy:[{x:11,y:10}],build:[{x:33,y:0}]}];
 r.territoryEvents=[{id:'recheck',kind:'meteorites',region:[first,{x:11,y:10},{x:12,y:10}],nextAt:2000}];
 const actions=advanceTerritory(r,2000);
 assert.deepEqual(actions.map(c=>key(c.x,c.y)),['12,10']);assert.ok(r.terrain.some(c=>c.x===10&&c.y===10));assert.equal(r.works.length,1);
});
test('A stale tornado group cannot move pieces onto removed terrain',()=>{
 const r=make(),plan=plannedEventRegion(r,'tornado-rain',()=>.31,1000),removed=plan.region[0];
 r.terrain=r.terrain.filter(c=>key(c.x,c.y)!==key(removed.x,removed.y));r.cells=r.cells.filter(c=>key(c.x,c.y)!==key(removed.x,removed.y));
 r.territoryEvents=[{id:'stale-tornado',kind:'tornado-rain',...plan,nextAt:2000}];advanceTerritory(r,2000);
 assert.ok(r.cells.every(c=>present(r).has(key(c.x,c.y))));
});
test('Proportional event intervals leave fauna time to appear before a territorial warning',()=>{
 for(const [size,interval] of [[333,333],[990,495],[999,501],[3333,1668]])assert.equal(territoryAttemptInterval(size),interval);
 let r=createLocal('local','A','B',1000,'normal','untimed');r.terrain=Array.from({length:333},(_,i)=>({x:i%33,y:Math.floor(i/33)}));r.players[0].figures=99;
 r.cells=r.terrain.slice(100,200).map((c,i)=>({...c,id:'food:'+i,symbol:'O',owner:'local-o'}));
 delete r.territoryActivityVersion;
 for(let i=0;i<33;i++)r=localCommand(r,'move',{x:i%33,y:Math.floor(i/33)},1000+i,()=>.3);
 assert.equal(r.territoryEvents.length,0);assert.equal(r.rodentRaids.length,0);assert.ok(r.worms.length);
});
