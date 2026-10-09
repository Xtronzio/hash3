import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTurns} from '../scripts/simulate-ecology-turns.mjs';
test('Seeded command simulation repeats invasions, fauna and balanced works without changing the UUID provider',()=>{
 const original=crypto.randomUUID,options={size:333,moves:180,seed:33};
 const first=simulateTurns(options),second=simulateTurns(options);
 assert.deepEqual(first,second);assert.equal(crypto.randomUUID,original);
 assert.equal(first.completed,true);assert.equal(first.constructed,first.demolished);
 assert.ok(first.rodentMeals>0&&first.wormMeals>0&&first.constructed>0);
 assert.deepEqual(first.announcements,{'invader-rain':1,'invader-colony':1});
});
