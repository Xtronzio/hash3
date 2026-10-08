import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {eventOutlook,eventOutlookMarkup} from '../src/event-outlook.js';
const now=1700000000000;
const fresh=()=>createLocal('local','A','B',now,'normal','untimed');
test('El control descuenta colocaciones reales y respeta los siguientes umbrales recalculados',()=>{
 let game=fresh();game=localCommand(game,'move',{x:0,y:0},now);
 let rows=eventOutlook(game,'local-x').rows;
 assert.equal(rows.find(e=>e.kind==='rodent').remaining,32);
 assert.equal(rows.find(e=>e.kind==='worm').remaining,65);
 assert.equal(rows.find(e=>e.kind==='neutral').remaining,32);
 game.habitatZones[0].next.worm=333;game.habitatZones[0].placements=305;
 assert.equal(eventOutlook(game,'local-x').rows.find(e=>e.kind==='worm').remaining,28);
 const territory=rows.find(e=>e.kind==='territory');assert.equal(territory.remaining,324);assert.equal(territory.target,333);assert.equal(territory.warning,33);
 game.territoryMilestone=2;game.terrain=Array(600);assert.equal(eventOutlook(game,'local-x').rows.find(e=>e.kind==='territory').remaining,399);
});
test('Fenómenos y recuperación suspenden los intentos; fauna apagada y roedores no inventan reloj',()=>{
 const game=fresh();game.territoryEvents=[{id:'u',kind:'ufo',nextAt:now+28000}];
 let view=eventOutlook(game,'local-x',now);assert.equal(view.timed[0].seconds,28);assert.equal(view.rows.find(e=>e.kind==='rodent').suspended,true);assert.equal(view.rows.find(e=>e.kind==='rodent').warning,null);
 game.territoryEvents=[];game.ecologyRecovery={until:now+33000,moves:3};view=eventOutlook(game,'local-x',now);assert.deepEqual(view.recovery,{seconds:33,moves:3});assert.equal(view.rows[0].suspended,true);
 game.faunaEnabled=false;game.territoryEnabled=false;assert.ok(eventOutlook(game,'local-x').rows.every(e=>!e.enabled));
 assert.match(eventOutlookMarkup(game,'local-x'),/Desactivado/);
});
test('Pausa mantiene las cuentas de intervenciones y recuperación, sin leer fichas',()=>{
 const game=fresh();game.worms=[{id:'w',remainingMs:12000}];game.ecologyRecovery={remainingMs:15000,until:now,moves:2};
 Object.defineProperty(game,'cells',{get(){throw Error('Leyó fichas');}});
 const view=eventOutlook(game,'local-x',now+999999);assert.equal(view.timed[0].seconds,12);assert.equal(view.recovery.seconds,15);
});
test('Los números explican lo que falta y los avisos expresan cuándo actúan',()=>{
 const game=fresh();let html=eventOutlookMarkup(game,'local-x');assert.match(html,/Faltan<\/small>33<small>colocaciones/);
 game.territoryEvents=[{id:'event',kind:'ufo',dueAt:now+28000}];html=eventOutlookMarkup(game,'local-x');assert.match(html,/<small>En<\/small>/);assert.match(html,/Próximas apariciones · lo que falta/);
});
