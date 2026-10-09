import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {eventOutlook,eventOutlookMarkup,ecologyWarningsMarkup} from '../src/event-outlook.js';
const now=1700000000000;
const fresh=()=>createLocal('local','A','B',now,'normal','untimed');
test('El control descuenta colocaciones reales y respeta los siguientes umbrales recalculados',()=>{
 let game=fresh();game=localCommand(game,'move',{x:0,y:0},now);
 let rows=eventOutlook(game,'local-x').rows;
 assert.equal(rows.find(e=>e.kind==='rodent').remaining,65);
 assert.equal(rows.find(e=>e.kind==='worm').remaining,32);
 assert.equal(rows.find(e=>e.kind==='neutral').remaining,32);
 game.habitatZones[0].next.worm=333;game.habitatZones[0].placements=305;
 assert.equal(eventOutlook(game,'local-x').rows.find(e=>e.kind==='worm').remaining,28);
 const territory=rows.find(e=>e.kind==='territory');assert.equal(territory.remaining,98);assert.equal(territory.warning,33);
 assert.equal(rows.find(e=>e.kind==='invaders').remaining,32);
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

test('Active rodents show remaining turns, while offscreen timed events have a visible independent countdown',()=>{
 const game=fresh();game.rodentRaids=[{id:'r',remaining:2}];game.worms=[{id:'w',nextAt:now+33000}];game.clockNow=now;
 const html=eventOutlookMarkup(game,'local-x');assert.match(html,/tres visitas en nueve turnos/);assert.match(html,/turnos restantes/);
 for(const field of ['cells','terrain','frontiers'])Object.defineProperty(game,field,{get(){throw Error('Warning scanned board');}});
 const warnings=ecologyWarningsMarkup(game,now);assert.match(warnings,/Roedores · 6 turnos pendientes · sin cuenta atrás temporal/);assert.match(warnings,/data-ecology-source="w">33/);assert.equal((warnings.match(/class="ecology-clock/g)||[]).length,1);
 game.worms[0].remainingMs=12000;assert.match(ecologyWarningsMarkup(game,now+999999),/cuenta atrás detenida/);assert.match(ecologyWarningsMarkup(game,now+999999),/data-ecology-source="w">12/);
});

 test('The additional phenomenon cycle reports remaining shared placements without reading cells',()=>{
 const g=fresh();g.players[0].figures=99;g.terrain=Array(999);g.players[0].placements=12;g.players[1].placements=5;g.territoryNextPlacement=33;
 Object.defineProperty(g,'cells',{get(){throw Error('clock scanned cells');}});
 const row=eventOutlook(g,'local-x').rows.find(e=>e.trigger==='placements');assert.equal(row.remaining,16);assert.equal(row.unit,'colocaciones entre ambos');assert.equal(row.requiresSize,false);
 assert.match(eventOutlookMarkup(g,'local-x'),/Ciclo de actividad/);
 });

test('Activity countdown shows figures before 33 and shared placements after the opening',()=>{
 const g=fresh();g.players[0].figures=15;g.players[1].figures=17;
 assert.match(eventOutlookMarkup(g,'local-x'),/Faltan<\/small>1<small>figuras entre ambos/);
 g.players[0].figures=16;assert.equal(eventOutlook(g,'local-x').rows.find(e=>e.trigger==='placements').requiresFigures,false);
 assert.match(eventOutlookMarkup(g,'local-x'),/Ciclo de actividad/);
});

test('Invasion countdown is separate and its warning leaves fauna active',()=>{
 const g=fresh();g.players[0].figures=99;g.territoryNextPlacement=333;g.territoryNextInvasion=66;
 g.players[0].placements=33;g.territoryEvents=[{id:'i',kind:'invader-colony',nextAt:now+33000}];
 const rows=eventOutlook(g,'local-x').rows;
 assert.equal(rows.find(r=>r.kind==='territory').remaining,300);assert.equal(rows.find(r=>r.kind==='invaders').remaining,33);
 assert.equal(rows.find(r=>r.kind==='worm').suspended,false);
});
