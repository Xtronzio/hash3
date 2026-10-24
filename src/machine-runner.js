import {isInverse} from './inverse-rules.js';
import {inverseMachineChoice} from './inverse.js';
import {machineTurnKey} from './machine-turn.js';
import {availableCells,expansionOptions,terrainOf,prepareFigureIndex,figureWindows,key} from './game.js';
import {perceivedRoom,fogKeys} from './fog.js';
import {placementSymbol} from './practice-tools.js';

// An emergency choice uses the referee's current legal cells, not an old
// speculative board. It never spends a card, invents a pass or skips a turn.
export function legalMachineFallback(room,rejectedChoice=null){
 if(isInverse(room)){
  let view=perceivedRoom(room);
  // A failed remembered claim supplies no hidden identity. Discard uncertain
  // signs for this retry so recovery cannot repeat the same failed claim.
  if(rejectedChoice?.action==='claim'&&room.fogEffects?.length){const hidden=fogKeys(room);view={...view,fogPerception:true,cells:view.cells.map(c=>hidden.has(key(c.x,c.y))?{id:c.id,x:c.x,y:c.y,symbol:'?',owner:null}:c)};}
  const choice=inverseMachineChoice(view,Math.random,{maxTimeMs:80,cards:false});if(choice)return choice;throw new Error('Dibujo lleno: el rival necesita una carta para continuar. Puedes pausar y conservar la partida.');
 }
 const pair=room.pairs[0];
 if(pair.pending){
  const point=expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room)[0];
  if(point)return {action:'expand',payload:point};
 }else{
  const free=availableCells(room,pair),visible=perceivedRoom(room),actor=room.players.find(p=>p.symbol===pair.turn),symbol=placementSymbol(room,actor.id),rival=actor.symbol==='X'?'O':'X',index=prepareFigureIndex(visible.cells,true),paid=new Set(room.forms),near=new Set();
  for(const c of visible.cells)for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)near.add(key(c.x+dx,c.y+dy));
  const sampled=free.length<=256?free:[...free.filter(c=>near.has(key(c.x,c.y))).slice(0,192),...free.filter((_,i)=>i%Math.ceil(free.length/64)===0)];
  const gain=(point,sign)=>{const k=key(point.x,point.y),set=index.occupied.get(sign),list=index.bySymbol.get(sign);set.add(k);list.push({...point,symbol:sign});index.groups.delete(sign);const found=figureWindows(visible.cells,point.x,point.y,sign,room.level,index,true).filter(f=>!paid.has(f.id));set.delete(k);list.pop();index.groups.delete(sign);return found.reduce((n,f)=>n+f.size,0);};
  let point=free[0],best=-Infinity;for(const p of sampled){const value=gain(p,symbol)*(symbol===actor.symbol?2:-2)+gain(p,rival);if(value>best){best=value;point=p;}}

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
    if(!choice||!['move','expand','pass','inventory','trade','claim'].includes(choice.action))throw new Error('Respuesta de máquina incompleta.');
    stop();apply(choice);
    schedule();
   }catch(error){
    // apply may reject a stale target while ecology/protection has changed.
    // Retry once against the live board, with no speculative cards.
    if(key()!==turnKey)return;
    if(fallback){stop();onError(error);return;}
    stop();pending=job;recover(choice);
   }
  }
  function recover(rejectedChoice=null){
   if(!live())return;
   releaseWorker();
   if(isBusy()){later(()=>recover(rejectedChoice));return;}
   try{commit(legalMachineFallback(getRoom(),rejectedChoice),true);}catch(error){fail(error);}
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
