import {localCommand,machineChoice} from './local.js';
import {availableCells,expansionOptions,terrainOf,key} from './game.js';
import {canUsePracticeTool,initializeInventory,spendCard,toolCells,moveDestination} from './practice-tools.js';

export function suggestExpansion(game,playerId){
 const pair=game.pairs[0];
 if(!pair.pending||pair.expander!==playerId)throw new Error('La ayuda de ampliación corresponde a quien está ampliando.');
 return machineChoice({...game,difficulty:'high'},()=>0,{maxTimeMs:250,maxNodes:4500}).payload;
}
export function useExpansionHint(original,playerId,now=Date.now(),suggestion){
 if(!canUsePracticeTool(original,playerId,'hint-expand',now))throw new Error('Usa Ayuda de ampliación mientras te corresponde ampliar.');
 const point=suggestion||suggestExpansion(original,playerId),pair=original.pairs[0];
 if(!expansionOptions(terrainOf(original),pair.terrainAnchor||pair.active,original).some(p=>p.x===point.x&&p.y===point.y))throw new Error('La ampliación sugerida ya no es válida.');
 const game=structuredClone(original);initializeInventory(game);
 const player=game.players.find(p=>p.id===playerId);player.inventory.cards['hint-expand']--;player.practiceHints=(player.practiceHints||0)+1;player.practiceTools=(player.practiceTools||0)+1;
 game.practiceHint={action:'expand',player:playerId,x:point.x,y:point.y};game.version++;game.updatedAt=new Date(now).toISOString();return game;
}
export function seededRandom(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function cardCandidates(room,player,now){
 const commands=[],own=room.players.find(p=>p.id===player),occupied=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
 const proximity=p=>[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dy])=>n+(occupied.get(key(p.x+dx,p.y+dy))?.symbol===own.symbol?1:0),0);
 for(const tool of ['combo','double','opposite','erase','activate','bomb','tornado','shift','rival','block','destroy','immunity','shield','frontier']){
  if(!canUsePracticeTool(room,player,tool,now))continue;
  if(['combo','double','rival','immunity'].includes(tool)){commands.push({action:'inventory',payload:{tool,playerId:player}});continue;}
  const points=toolCells(room,player,tool).sort((a,b)=>proximity(b)-proximity(a)).slice(0,3);
  for(const p of points){
   if(tool==='shift'){
    const destination=availableCells(room,room.pairs[0]).find(c=>moveDestination(room,player,c)&&moveDestination(room,p.owner,c));
    if(destination)commands.push({action:'inventory',payload:{tool,playerId:player,x:p.x,y:p.y,toX:destination.x,toY:destination.y}});
   }else commands.push({action:'inventory',payload:{tool,playerId:player,x:p.x,y:p.y,...(tool==='frontier'?{side:'north'}:{})}});
  }
 }
 return commands;
}
function finishTurn(room,player,steps,now){
 let next=room,sequence=[...steps];
 for(let i=0;i<2;i++){
  const pair=next.pairs[0];if(pair.pending||pair[pair.turn.toLowerCase()]!==player)break;
  const choice=machineChoice({...next,difficulty:'medium'},()=>0,{futureWeight:0});
  if(choice.action!=='move')break;
  sequence.push(choice);next=localCommand(next,choice.action,choice.payload,now,()=>.5);
 }
 return {room:next,steps:sequence};
}
export function planSuperHelp(original,playerId,now=Date.now(),{maxTimeMs=1400}={}){
 if(!canUsePracticeTool(original,playerId,'super-hint',now))throw new Error('Súper Ayuda está disponible durante tu turno de colocación.');
 const prepared=structuredClone(original);initializeInventory(prepared);spendCard(prepared,playerId,'super-hint');
 const before=original.players.find(p=>p.id===playerId),opponent=original.players.find(p=>p.id!==playerId),start=performance.now(),seen=new Set();
 const rate=result=>{
  const own=result.room.players.find(p=>p.id===playerId),other=result.room.players.find(p=>p.id===opponent.id);
  // Keep earned points, but penalise sequences gifting points to the opponent.
  return own.score-before.score-(other.score-opponent.score)-result.steps.filter(s=>s.action==='inventory').length*.025;
 };
 let best=finishTurn(prepared,playerId,[],now),beam=[{room:prepared,steps:[]}],value=rate(best),seed=190200;
 for(let depth=0;depth<3&&beam.length&&performance.now()-start<maxTimeMs;depth++){
  const next=[];
  for(const state of beam){
   for(const command of cardCandidates(state.room,playerId,now)){
    if(performance.now()-start>=maxTimeMs)break;
    const signature=state.steps.map(s=>JSON.stringify(s.payload)).join(';')+';'+JSON.stringify(command.payload);if(seen.has(signature))continue;seen.add(signature);
    try{
     const step={...command,seed:++seed},room=localCommand(state.room,step.action,step.payload,now,seededRandom(step.seed)),steps=[...state.steps,step];
     const result=finishTurn(room,playerId,steps,now),rating=rate(result);
     if(rating>value){best=result;value=rating;}
     if(!room.pairs[0].pending)next.push({room,steps,rating});
    }catch{/* Candidate legality and stock are checked by the normal referee. */}
   }
  }
  beam=next.sort((a,b)=>b.rating-a.rating).slice(0,5);
 }
 if(!best.steps.some(s=>s.action==='move'))throw new Error('No hay una secuencia de colocación disponible.');
 return {roomId:original.id,version:original.version,player:playerId,steps:best.steps,points:best.room.players.find(p=>p.id===playerId).score-before.score};
}
export function executeSuperHelp(original,plan,now=Date.now()){
 if(!plan||plan.roomId!==original.id||plan.version!==original.version||!canUsePracticeTool(original,plan.player,'super-hint',now))throw new Error('La partida ha cambiado; vuelve a pedir Súper Ayuda.');
 let game=structuredClone(original);initializeInventory(game);spendCard(game,plan.player,'super-hint');
 for(const step of plan.steps){
  const pair=game.pairs[0];
  if(pair.pending||pair[pair.turn.toLowerCase()]!==plan.player||step.action==='inventory'&&step.payload.playerId!==plan.player)throw new Error('Súper Ayuda no puede jugar turnos ajenos.');
  if(!['inventory','move'].includes(step.action))throw new Error('Acción de ayuda no permitida.');
  game=localCommand(game,step.action,step.payload,now,step.seed?seededRandom(step.seed):()=>.5);
 }
 return game;
}
