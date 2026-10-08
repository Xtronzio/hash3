import test from 'node:test';
import assert from 'node:assert/strict';
import {needsLocalTick} from '../src/local-clock.js';
test('Idle navigation never reads terrain or pieces and preserves the deadline trigger',()=>{
 const room={status:'playing',timeMode:'timed',habitatVersion:2,pairs:[{deadline:new Date(33000).toISOString()}],get terrain(){throw new Error('Full terrain scan');},get cells(){throw new Error('Full piece scan');}};
 assert.equal(needsLocalTick(room,32999),false);assert.equal(needsLocalTick(room,33000),true);
 assert.equal(needsLocalTick(Object.assign(Object.create(room),{status:'paused'}),33000),false);
});
test('Inhabitants still advance without a turn clock, including saved legacy initialization',()=>{
 const room={status:'playing',timeMode:'untimed',habitatVersion:2};
 for(const kind of ['worms','works','bombs']){
  assert.equal(needsLocalTick({...room,[kind]:[{nextAt:33000}]},32999),false);
  assert.equal(needsLocalTick({...room,[kind]:[{nextAt:33000}]},33000),true);
  assert.equal(needsLocalTick({...room,[kind]:[{remainingMs:1000,nextAt:33000}]},32999),true);
 }
 assert.equal(needsLocalTick(room,33000),false);assert.equal(needsLocalTick({...room,habitatVersion:undefined},33000),true);
});

test('Rodent visit queues have no time clock',()=>{assert.equal(needsLocalTick({status:'playing',timeMode:'untimed',habitatVersion:2,rodentRaids:[{remaining:3}],rodents:[{nextAt:0}]},1000000),false);});
