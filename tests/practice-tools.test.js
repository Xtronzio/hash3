import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,localHumanId} from '../src/local.js';
import {canUsePracticeTool,canErasePracticeCell} from '../src/practice-tools.js';
import {machineMoveScore} from '../src/machine.js';
import {availableCells,expansionOptions,terrainOf} from '../src/game.js';
import {saveLocalGame,loadLocalGames} from '../src/sessions.js';
const now=1700000000000;
const game=(level='normal')=>createLocal('local','A','B',now,level);
const play=(room,points)=>points.reduce((r,[x,y])=>localCommand(r,'move',{x,y},now),room);
const tool=(room,id,playerId='local-x',extra={})=>localCommand(room,'inventory',{tool:id,playerId,...extra},now+1000);

test('Doble coloca dos fichas del mismo jugador con un solo reloj y dos acciones normalizadas',()=>{
 let room=play(game(),[[0,0],[2,2],[1,0],[2,1]]),original=structuredClone(room),deadline=room.pairs[0].deadline;
 const before=room.players[0].maxActions.length;
 const activated=tool(room,'double');assert.deepEqual(room,original);room=activated;
 assert.equal(room.pairs[0].deadline,deadline);
 room=localCommand(room,'move',{x:2,y:0},now+2000);
 assert.equal(room.pairs[0].turn,'X');assert.equal(room.practiceTurn.remaining,1);assert.equal(room.pairs[0].deadline,deadline);assert(room.lastEvent.points>0);
 room=localCommand(room,'move',{x:0,y:1},now+3000);
 assert.equal(room.pairs[0].turn,'O');assert.equal(room.practiceTurn,undefined);assert.equal(Date.parse(room.pairs[0].deadline),now+36000);
 assert.deepEqual(room.cells.slice(-2).map(c=>c.owner),['local-x','local-x']);assert.equal(room.players[0].maxActions.length,before+2);
});

test('Borrar solo libera fichas rivales, sin cambiar puntos, terreno, turno ni reloj',()=>{
 let room=play(game(),[[0,0],[0,1],[2,0],[1,1],[0,2],[2,1]]),snapshot=structuredClone(room);
 assert.throws(()=>tool(room,'erase','local-x',{x:0,y:0}),/tus colocaciones/);assert.deepEqual(room,snapshot);
 const erased=tool(room,'erase','local-x',{x:1,y:1});
 assert.deepEqual(erased.players.map(p=>[p.score,p.figures]),room.players.map(p=>[p.score,p.figures]));
 assert.deepEqual(erased.forms,room.forms);assert.deepEqual(erased.terrain,room.terrain);assert.deepEqual(erased.pairs,room.pairs);
 assert.equal(erased.cells.length,room.cells.length-1);assert(!erased.cells.some(c=>c.x===1&&c.y===1));
 assert.equal(erased.players[0].maxActions.at(-1).points,0);assert.deepEqual(room,snapshot);
});

test('Ficha contraria convierte una ficha puesta del rival, conserva los puntos y permite jugar después',()=>{
 let room=play(game(),[[0,0],[1,1]]),old=room.cells[1],scores=room.players.map(p=>p.score),deadline=room.pairs[0].deadline;
 room=tool(room,'opposite','local-x',{x:1,y:1});
 const converted=room.cells.find(c=>c.x===1&&c.y===1);assert.equal(converted.symbol,'X');assert.equal(converted.owner,'local-x');assert.notEqual(converted.id,old.id);
 assert(room.players.every((p,i)=>p.score>=scores[i]));assert.equal(room.pairs[0].turn,'X');assert.equal(room.pairs[0].deadline,deadline);
 assert.throws(()=>tool(room,'erase','local-x',{x:1,y:1}));room=localCommand(room,'move',{x:2,y:0},now+2000);assert.equal(room.pairs[0].turn,'O');
});

test('Ficha rival fuerza al adversario a colocar tu símbolo una sola vez, incluso con Doble',()=>{
 let room=tool(game(),'rival');room=localCommand(room,'move',{x:0,y:0},now+1000);
 assert.equal(room.cells.at(-1).symbol,'X');room=tool(room,'double','local-o');
 room=localCommand(room,'move',{x:1,y:0},now+2000);assert.equal(room.cells.at(-1).symbol,'X');assert.equal(room.cells.at(-1).owner,'local-o');assert.equal(room.pairs[0].turn,'O');
 room=localCommand(room,'move',{x:1,y:1},now+3000);assert.equal(room.cells.at(-1).symbol,'O');assert.equal(room.inventoryEffects.forced.length,0);
 assert.throws(()=>tool(room,'erase','local-x',{x:0,y:0}));assert.equal(tool(room,'erase','local-x',{x:1,y:0}).cells.length,2);
});

test('Una geometría ya cobrada no vuelve a puntuar tras borrar y reconstruir; la máquina respeta esa historia',()=>{
 for(const level of ['normal','advanced']){
   let room=play(game(level),[[0,0],[0,1],[2,0],[1,1],[0,2],[2,1]]),score=room.players[1].score;
   room=tool(room,'erase','local-x',{x:1,y:1});room=localCommand(room,'move',{x:1,y:1},now+1000);
   room=tool(room,'erase','local-o',{x:1,y:1});
   for(const c of availableCells(room,room.pairs[0])){
     const predicted=machineMoveScore(room,c),actual=localCommand(room,'move',c,now+2000);
     assert.equal(predicted.points,actual.lastEvent.points);assert.equal(predicted.figures,actual.lastEvent.figures);
   }
   const predicted=machineMoveScore(room,{x:1,y:1});room=localCommand(room,'move',{x:1,y:1},now+2000);
   assert.equal(predicted.points,0);assert.equal(room.lastEvent.points,0);assert.equal(room.players[1].score,score);
 }
});

test('El inventario respeta reloj, pausa, modo, territorio, turno y una herramienta, salvo Combo',()=>{
 let room=play(game(),[[0,0],[1,1]]);
 assert.equal(canUsePracticeTool(room,'local-o','erase',now),false);
 assert.equal(canUsePracticeTool({...room,mode:undefined},'local-x','double',now),false);
 assert.equal(canUsePracticeTool(room,'local-x','double',now+33000),false);
 assert.equal(canUsePracticeTool(localCommand(room,'pause',{},now+1000),'local-x','double',now+1000),false);
 const island={...room,terrain:[...room.terrain,{x:100,y:100}],cells:[...room.cells,{id:'island',owner:'local-o',symbol:'O',x:100,y:100}]};
 const erased=tool(island,'erase','local-x',{x:100,y:100});assert.ok(!erased.cells.some(c=>c.id==='island'));
 const unbuilt={...room,cells:[...room.cells,{id:'unbuilt',owner:'local-o',symbol:'O',x:100,y:100}]};assert.throws(()=>tool(unbuilt,'erase','local-x',{x:100,y:100}),/del tablero/);
 room.players[0].inventory.cards.combo=1;room.players[0].inventory.cards.hint=0;room=tool(room,'combo');room=tool(room,'double');room=tool(room,'rival');assert.equal(canUsePracticeTool(room,'local-x','erase',now+1000),false);assert.throws(()=>tool(room,'erase','local-x',{x:1,y:1}),/una por turno/);
 room=localCommand(room,'move',{x:2,y:0},now+1000);assert.equal(room.cells.at(-1).symbol,'X');assert.equal(room.pairs[0].turn,'X');
 room=localCommand(room,'move',{x:0,y:1},now+1000);assert.equal(room.cells.at(-1).symbol,'X');assert.equal(room.pairs[0].turn,'O');
 assert.equal(canUsePracticeTool(room,'local-o','double',now+1000),true);
});

test('Guardar y pausar a mitad del doble conserva el símbolo humano O, la segunda ficha y el tiempo',()=>{
 let room=createLocal('solo','Humano','',now,'normal','timed','medium','O');room=localCommand(room,'move',{x:1,y:1},now);
 room=tool(room,'double','local-o');room=localCommand(room,'move',{x:0,y:0},now+2000);room=localCommand(room,'pause',{},now+4000);
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 saveLocalGame(storage,room,now+4000);room=localCommand(loadLocalGames(storage)[0],'resume',{},now+86400000);
 assert.equal(localHumanId(room),'local-o');assert.equal(room.practiceTurn.remaining,1);assert.equal(Date.parse(room.pairs[0].deadline),now+86400000+29000);
 room=localCommand(room,'move',{x:2,y:2},now+86400001);assert.equal(room.cells.at(-1).owner,'local-o');assert.equal(room.pairs[0].turn,'X');
});

test('Al vencer el doble se coloca solo una ficha automática y se entrega el turno al rival',()=>{
 let room=tool(game(),'double');room=localCommand(room,'move',{x:0,y:0},now+2000);
 room=localCommand(room,'tick',{},now+33000,()=>0);
 assert.equal(room.cells.length,2);assert.equal(room.lastEvent.automatic,true);assert.equal(room.pairs[0].turn,'O');assert.equal(room.practiceTurn,undefined);
 assert.equal(localCommand(room,'tick',{},now+33000),room);
});

test('Tras borrados repetidos, la máquina coincide con el árbitro para figuras nuevas, ya cobradas y grupos complejos',()=>{
 let seed=91;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const level of ['normal','advanced']){
   let room=game(level);
   for(let n=0;n<32;n++){
     const p=room.pairs[0],actor=p[p.turn.toLowerCase()];
     if(p.pending){const options=expansionOptions(terrainOf(room),p.active);room=localCommand(room,'expand',options[Math.floor(random()*options.length)],now);}
     else if(canUsePracticeTool(room,actor,'erase',now)&&random()<0.65){
       const candidates=room.cells.filter(c=>canErasePracticeCell(room,actor,c)),c=candidates[Math.floor(random()*candidates.length)];
       room=tool(room,'erase',actor,c);
     }
     for(const c of availableCells(room,room.pairs[0])){
       const predicted=machineMoveScore(room,c),actual=localCommand(room,'move',c,now+2000);
       assert.equal(predicted.points,actual.lastEvent.points);assert.equal(predicted.figures,actual.lastEvent.figures);
     }
     const free=availableCells(room,room.pairs[0]);room=localCommand(room,'move',free[Math.floor(random()*free.length)],now+2000);
   }
 }
});
