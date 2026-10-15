import {isInverse} from './inverse-rules.js';
import {inverseMachineChoice} from './inverse.js';
import {machineTurnKey} from './machine-turn.js';
import {availableCells,expansionOptions,terrainOf} from './game.js';

// An emergency choice uses the referee's current legal cells, not an old
// speculative board. It never spends a card, invents a pass or skips a turn.
export function legalMachineFallback(room){
 if(isInverse(room)){const choice=inverseMachineChoice(room);if(choice)return choice;throw new Error('Dibujo lleno: el rival necesita una carta para continuar. Puedes pausar y conservar la partida.');}
 const pair=room.pairs[0];
 if(pair.pending){
  const point=expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room)[0];
  if(point)return {action:'expand',payload:point};
 }else{
  const point=availableCells(room,pair)[0];
  if(point)return {action:'move',payload:point};
  if(availableCells(room,pair,{ignoreBlocks:true}).length)return {action:'pass',payload:{}};
 }
 throw new Error('No hay una acción legal para el rival.');
}

export function createMachineRunner({getRoom,isHidden=()=>false,isBusy=()=>false,apply,
 createWorker,onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,
 timeoutMs=8000,tradeHoldMs=1000}){
 let pending=null;
 const key=()=>machineTurnKey(getRoom(),isHidden());
 const stop=()=>{
  if(!pending)return;
  const old=pending;pending=null;clearTimer(old.timer);clearTimer(old.watchdog);old.worker?.terminate();
 };
 function schedule(){
  const turnKey=key();
  if(!turnKey){stop();return;}
  if(pending?.key===turnKey)return;
  stop();
  const job=pending={key:turnKey},live=()=>pending===job&&key()===turnKey;
  const later=fn=>{job.timer=setTimer(fn,100);};
  const releaseWorker=()=>{clearTimer(job.watchdog);job.worker?.terminate();job.worker=null;};
  const fail=error=>{if(!live())return;stop();onError(error);};
  function commit(choice,fallback=false){
   if(!live())return;
   if(isBusy()){later(()=>commit(choice,fallback));return;}
   try{
    // Release before apply: accept() may immediately schedule a second move
    // (Doble), an expansion or the next card in this same machine turn.
    if(!choice||!['move','expand','pass','inventory','trade'].includes(choice.action))throw new Error('Respuesta de máquina incompleta.');
    stop();apply(choice);
    schedule();
   }catch(error){
    // apply may reject a stale target while ecology/protection has changed.
    // Retry once against the live board, with no speculative cards.
    if(key()!==turnKey)return;
    if(fallback){stop();onError(error);return;}
    stop();pending=job;recover();
   }
  }
  function recover(){
   if(!live())return;
   releaseWorker();
   if(isBusy()){later(recover);return;}
   try{commit(legalMachineFallback(getRoom()),true);}catch(error){fail(error);}
  }
  function start(){
   if(!live())return;
   if(isBusy()){later(start);return;}
   const room=getRoom(),version=room.version;
   try{
    const worker=job.worker=createWorker();
    job.watchdog=setTimer(recover,timeoutMs);
    worker.onmessage=({data})=>{
     if(!live())return;
     releaseWorker();
     if(data?.error||data?.id!==room.id||data?.version!==version||!data?.choice){recover();return;}
     if(data.choice.action==='trade')job.timer=setTimer(()=>commit(data.choice),tradeHoldMs);
     else commit(data.choice);
    };
    worker.onerror=worker.onmessageerror=recover;
    worker.postMessage({id:room.id,room});
   }catch{recover();}
  }
  job.timer=setTimer(start,getRoom().lastEvent?.points?1500:650);
 }
 return {schedule,stop};
}
