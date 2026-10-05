import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,localHumanId,localMachineId,machineChoice} from '../src/local.js';
import {canUsePracticeHint,usePracticeHint} from '../src/inventory.js';
import {saveLocalGame,loadLocalGames} from '../src/sessions.js';
const now=1700000000000;
test('Elegir O conserva la identidad humana y la máquina abre con X',()=>{
 let room=createLocal('solo','Humano','',now,'normal','untimed','medium','O');
 assert.equal(localHumanId(room),'local-o');assert.equal(localMachineId(room),'local-x');assert.equal(room.host,'local-o');
 assert.equal(room.players.find(p=>p.id===localHumanId(room)).name,'Humano');assert.equal(room.players[0].name,'Máquina · Medio');
 assert.equal(room.pairs[0].turn,'X');assert.equal(canUsePracticeHint(room,'local-o',now),false);assert.equal(canUsePracticeHint(room,'local-x',now),false);
 const choice=machineChoice(room,()=>0);room=localCommand(room,choice.action,choice.payload,now);
 assert.equal(room.cells[0].symbol,'X');assert.equal(room.cells[0].owner,localMachineId(room));assert.equal(room.pairs[0].turn,'O');
 assert.equal(canUsePracticeHint(room,'local-o',now),true);
 const hinted=usePracticeHint(room,'local-o',now);room=localCommand(hinted,'move',hinted.practiceHint,now);
 assert.equal(room.cells[1].symbol,'O');assert.equal(room.cells[1].owner,localHumanId(room));assert.equal(room.pairs[0].turn,'X');
});
test('La máquina X amplía y devuelve el siguiente movimiento al humano O; guardado y pausa mantienen identidad',()=>{
 let room=createLocal('solo','Humano','',now,'advanced','timed','high','O');
 for(const [x,y] of [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]])room=localCommand(room,'move',{x,y},now);
 assert.equal(room.pairs[0].pending,1);assert.equal(room.pairs[0].expander,localMachineId(room));assert.equal(room.pairs[0].turn,'O');
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 saveLocalGame(storage,localCommand(room,'pause',{},now+1200),now+1200);
 room=localCommand(loadLocalGames(storage)[0],'resume',{},now+90000);
 assert.equal(localHumanId(room),'local-o');assert.equal(room.pairs[0].expander,localMachineId(room));assert.equal(room.difficulty,'high');
 const choice=machineChoice(room,()=>0,{maxTimeMs:30,maxNodes:50});room=localCommand(room,choice.action,choice.payload,now+90000);
 assert.equal(room.pairs[0].pending,0);assert.equal(room.pairs[0].turn,'O');assert.equal(room.lastEvent.player,localMachineId(room));
});
test('Dos jugadores locales intercambian símbolos y los guardados antiguos siguen siendo humano X',()=>{
 const room=createLocal('local','Creador','Invitado',now,'normal','untimed','medium','O');
 assert.equal(room.players[0].name,'Invitado');assert.equal(room.players[1].name,'Creador');assert.equal(room.pairs[0].turn,'X');
 const legacy=createLocal('solo','Humano');delete legacy.humanId;delete legacy.playerSymbol;
 assert.equal(localHumanId(legacy),'local-x');assert.equal(localMachineId(legacy),'local-o');
 assert.throws(()=>createLocal('solo','A','',now,'normal','timed','medium','Z'),/X u O/);
});
