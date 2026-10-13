import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {createMachineRunner,legalMachineFallback} from '../src/machine-runner.js';
import {gamesMarkup} from '../src/session-ui.js';
import {availableCells} from '../src/game.js';

const fresh=(human='X')=>{
 const r=createLocal('solo','Jorge','',1000,'normal','untimed','medium',human,false,{faunaEnabled:false,territoryEnabled:false});
 r.pairs[0].turn=human==='X'?'O':'X';return r;
};
function harness(initial=fresh(),factory){
 let room=initial,busy=false,hidden=false,time=0,id=0;
 const jobs=new Map(),workers=[],choices=[],errors=[];
 const runner=createMachineRunner({getRoom:()=>room,isBusy:()=>busy,isHidden:()=>hidden,
  setTimer:(fn,delay)=>{const token=++id;jobs.set(token,{fn,at:time+delay});return token;},clearTimer:token=>jobs.delete(token),
  createWorker:()=>{if(factory)return factory();const w={postMessage(data){this.input=data;},terminate(){this.stopped=true;}};workers.push(w);return w;},
  apply:choice=>{const next=localCommand(room,choice.action,choice.payload,1000+time,()=>.9);choices.push(choice);room=next;runner.schedule();},onError:error=>errors.push(error)});
 const advance=ms=>{const end=time+ms;let iterations=0;while(true){const entry=[...jobs].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;assert.ok(++iterations<1000,'No timer spin');jobs.delete(entry[0]);time=entry[1].at;entry[1].fn();}time=end;};
 const reply=(choice,extra={})=>{const w=workers.at(-1);w.onmessage({data:{id:w.input.id,version:w.input.room.version,choice,...extra}});};
 return {runner,advance,reply,workers,choices,errors,get room(){return room;},set room(r){room=r;},set busy(v){busy=v;},set hidden(v){hidden=v;}};
}
test('Saved pinned/imported/paused rows show actual X/O balance without modifying games',()=>{
 const r=fresh();r.status='paused';r.players[0].score=22750;r.players[1].score=18045;r.transferOrigin={game:'original'};
 const snapshot=structuredClone(r),markup=gamesMarkup({local:[r],pins:['local:'+r.id]});
 assert.match(markup,/saved-score-x[^>]*>X <b>22\.750/);assert.match(markup,/saved-score-o[^>]*>O <b>18\.045/);
 assert.match(markup,/aria-label="Pausada"/);assert.match(markup,/aria-label="Sin reloj"/);assert.match(markup,/aria-label="Copia importada"/);
 assert.match(markup,/disabled title="Desancla la partida para borrarla"/);assert.deepEqual(r,snapshot);
});
test('Machine cannot choose a dead cell even if its apparent combo is better',()=>{
 const r=fresh();r.deadCells=[{x:0,y:0}];r.cells=r.terrain.filter(c=>(c.x!==0||c.y!==0)&&(c.x!==2||c.y!==2)).map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));
 const choice=machineChoice(r,()=>0);assert.deepEqual(choice.payload,{x:2,y:2});assert.doesNotThrow(()=>localCommand(r,choice.action,choice.payload,1000));
});
test('Silent, errored, malformed and stale-target workers recover once with a live legal move',()=>{
 for(const mode of ['silent','error','message-error','malformed','wrong-version','illegal']){
  const h=harness(),before=structuredClone(h.room);h.runner.schedule();h.advance(650);
  if(mode==='error')h.workers[0].onerror({});
  else if(mode==='message-error')h.workers[0].onmessageerror({});
  else if(mode==='malformed')h.reply(null);
  else if(mode==='wrong-version')h.reply({action:'move',payload:{x:0,y:0}},{version:-1});
  else if(mode==='illegal')h.reply({action:'move',payload:{x:999,y:999}});
  else h.advance(8000);
  assert.equal(h.choices.length,1,mode);assert.equal(h.room.pairs[0].turn,'X');assert.equal(h.room.cells.length,1);assert.deepEqual(h.room.players.map(p=>p.score),before.players.map(p=>p.score));assert.deepEqual(h.room.players.map(p=>p.inventory.cards),before.players.map(p=>p.inventory.cards));assert.deepEqual(h.errors,[]);assert.ok(h.workers[0].stopped);
 }
});
test('Missing Worker API recovers; busy callbacks wait instead of leaving a pending lock',()=>{
 const missing=harness(fresh(),()=>{throw new Error('Worker unavailable');});missing.runner.schedule();missing.advance(650);assert.equal(missing.choices.length,1);
 const h=harness();h.busy=true;h.runner.schedule();h.advance(650);assert.equal(h.workers.length,0);h.busy=false;h.advance(100);h.busy=true;h.reply({action:'move',payload:{x:0,y:0}});h.advance(200);assert.equal(h.choices.length,0);h.busy=false;h.advance(100);assert.equal(h.choices.length,1);
});
test('Pause/hidden/switch cancels computation; late messages cannot move the resumed turn',()=>{
 const h=harness();h.runner.schedule();h.advance(650);const old=h.workers[0];h.room=localCommand(h.room,'pause',{},1000);h.runner.schedule();h.advance(10000);assert.equal(h.choices.length,0);
 h.room=localCommand(h.room,'resume',{},2000);h.runner.schedule();h.advance(650);old.onmessage({data:{...old.input,version:old.input.room.version,choice:{action:'move',payload:{x:0,y:0}}}});assert.equal(h.choices.length,0);
 h.reply({action:'move',payload:{x:0,y:0}});assert.equal(h.choices.length,1);
 const hidden=harness();hidden.runner.schedule();hidden.advance(650);hidden.hidden=true;hidden.runner.schedule();hidden.advance(10000);assert.equal(hidden.choices.length,0);hidden.hidden=false;hidden.runner.schedule();hidden.advance(650);hidden.reply({action:'move',payload:{x:0,y:0}});assert.equal(hidden.choices.length,1);
 const switched=harness();switched.runner.schedule();switched.advance(650);switched.room=fresh('O');switched.runner.schedule();switched.workers[0].onerror({});assert.equal(switched.choices.length,0);switched.advance(650);switched.reply({action:'move',payload:{x:0,y:0}});assert.equal(switched.room.pairs[0].turn,'O');
});
test('Doble resumes its second placement and ecology advances exactly once',()=>{
 const r=fresh();r.practiceTurn={player:'local-o',used:['double'],remaining:2};const h=harness(r);
 h.runner.schedule();h.advance(650);h.reply({action:'move',payload:{x:0,y:0}});assert.equal(h.room.pairs[0].turn,'O');assert.equal(h.room.ecologyTurns||0,0);
 h.advance(1500);h.reply({action:'move',payload:{x:1,y:0}});assert.equal(h.choices.length,2);assert.equal(h.room.pairs[0].turn,'X');assert.equal(h.room.ecologyTurns,1);
});
test('Trade still waits a full second and the machine resumes after buying',()=>{
 const r=fresh();r.machineInventory=true;r.players[1].score=333;r.players[1].inventory.cards.double=0;
 const h=harness(r);h.runner.schedule();h.advance(650);h.reply({action:'trade',payload:{tool:'double',playerId:'local-o'}});
 h.advance(999);assert.equal(h.choices.length,0);h.advance(1);assert.equal(h.choices.length,1);assert.equal(h.room.players[1].inventory.cards.double,1);
 h.advance(650);h.reply({action:'move',payload:{x:0,y:0}});assert.equal(h.room.pairs[0].turn,'X');assert.equal(h.choices.length,2);
});
test('Fallback uses real blockers and pending expansion; no illegal pass or invented terrain',()=>{
 const r=fresh();r.deadCells=[{x:0,y:0}];r.frontiers=[{type:'beaver',cells:[{x:1,y:0}],turnsRemaining:9}];r.worms=[{body:[{x:2,y:0}]}];
 const choice=legalMachineFallback(r);assert.ok(availableCells(r,r.pairs[0]).some(p=>p.x===choice.payload.x&&p.y===choice.payload.y));
 const full=fresh();full.cells=full.terrain.map((c,i)=>({...c,id:String(i),symbol:'X',owner:'local-x'}));const paused=localCommand(full,'pause',{},1000),resumed=localCommand(paused,'resume',{},2000);const expansion=legalMachineFallback(resumed);assert.equal(expansion.action,'expand');assert.doesNotThrow(()=>localCommand(resumed,expansion.action,expansion.payload,2000));
});
test('Final fallback failure reports once and does not consume anything or spin',()=>{
 const r=fresh();r.deadCells=structuredClone(r.terrain);const h=harness(r);h.runner.schedule();h.advance(8650);assert.equal(h.errors.length,1);assert.equal(h.choices.length,0);h.advance(30000);assert.equal(h.errors.length,1);assert.deepEqual(h.room,r);
});
