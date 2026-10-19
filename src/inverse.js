import {initializeInverseContour,advanceInverseContour} from './inverse-contour.js';
import {comboInverse} from './inverse-combos.js';
import {initializeInverseBees,completeInverseBeeTurn} from './inverse-bees.js';
import {earnFreeExpansion} from './free-expansion.js';
import {manualInverse,canClaimInverse,inverseClaimsAt,advanceInverseWild,INVERSE_WILD_INTERVAL} from './inverse-claims.js';
import {chooseInverseAction} from './inverse-ai.js';
import {filledInverse,clearInverseFill,payingInverseFigures,inverseFillSet} from './inverse-progress.js';
import {toggleWatchTarget,removeWatchTarget} from './watch-targets.js';
import {isInverse,inverseToolAllowed} from './inverse-rules.js';
import {validateInverseBoard,INVERSE_PRESETS} from './inverse-boards.js';
import {availableCells,figureWindows,key,prepareFigureIndex} from './game.js';
import {practiceTurn,placementSymbol,canUsePracticeTool,toolCells,moveDestination,spendCard,completeInventoryTurn,recordInventoryCombo} from './practice-tools.js';
import {awardFigures,scoreLandings,pruneBrokenForms} from './landing-score.js';
import {buyCard,tradeAvailability} from './inventory-economy.js';
import {recordCombo} from './records.js';
import {recordMax} from './max.js';
import {applyAreaTool} from './area-tools.js';
const id=()=>crypto.randomUUID();
export function configureInverse(room,options={},random=Math.random){
 const board=validateInverseBoard(options.board||INVERSE_PRESETS[0]);
 room.variant='inverse';room.inverseVersion=3;room.inverseClaimVersion=2;room.inverseMoves=0;room.inverseWildNext=INVERSE_WILD_INTERVAL;room.inverseBoard={id:board.id,name:board.name,...(options.board?.scale?{scale:options.board.scale}:{})};room.faunaEnabled=false;room.territoryEnabled=false;
 delete room.cellTarget;delete room.matchGoal;delete room.endsAt;
 room.terrain=board.terrain;room.blocks=[];room.cells=[];room.forms=[];
 room.pairs[0].active={...board.terrain[0]};room.pairs[0].terrainAnchor={...board.terrain[0]};
 room.inverseFill=room.terrain.map(c=>key(c.x,c.y));room.inverseInitialCount=room.terrain.length;room.inverseCleared=0;
 for(const p of room.players)for(const tool of Object.keys(p.inventory.cards))if(!inverseToolAllowed(room,tool))p.inventory.cards[tool]=0;
 initializeInverseBees(room,random);initializeInverseContour(room);return room;
}
function clearPaid(room,figures){
 const cleared=new Set(figures.flatMap(f=>f.points.map(([x,y])=>key(x,y))));
 const removed=room.cells.filter(c=>cleared.has(key(c.x,c.y)));
 clearInverseFill(room,figures);
 room.cells=room.cells.filter(c=>!cleared.has(key(c.x,c.y)));if(!filledInverse(room))room.inverseCleared=(room.inverseCleared||0)+removed.length;
 for(const p of room.players)if(removed.some(c=>c.id===p.lastMove?.id))delete p.lastMove;
 room.inventoryEffects.shields=room.inventoryEffects.shields.filter(e=>!removed.some(c=>c.id===e.cell));
 pruneBrokenForms(room);room.pairs[0].credits=0;
 return removed.map(({x,y})=>({x,y}));
}
function finishIfEmpty(room,now){
 if(filledInverse(room)?room.inverseFill.length:room.cells.length)return;
 room.status='finished';room.finishReason='inverse-empty';room.finishedAt=new Date(now).toISOString();
 for(const p of room.pairs){p.pending=0;p.expander=null;p.deadline=null;}
 delete room.practiceTurn;delete room.practiceHint;
 room.finalResult={kind:'inverse-empty',variant:'inverse',goalType:'inverse',target:room.terrain.length,limit:room.terrain.length,size:room.terrain.length,completedAt:room.finishedAt,mode:room.mode,level:room.level,timeMode:room.timeMode,difficulty:room.difficulty||null,playerInventory:room.playerInventory!==false,machineInventory:room.machineInventory===true,faunaEnabled:false,territoryEnabled:false,ruleVersion:room.ruleVersion,inverseVersion:room.inverseVersion,...(room.inverseVersion===3?{inverseClaimVersion:room.inverseClaimVersion||1,...(room.inverseContour?{inverseContourVersion:room.inverseContour.version,inverseContourLost:room.inverseContour.lost,...(room.inverseContour.renewal?{inverseRenewalVersion:room.inverseContour.renewal.version,inverseRestored:room.inverseContour.renewal.restored}:{})}:{}),...(room.inverseBees?{inverseBeeVersion:room.inverseBees.version}:{})}:{}),drawing:room.inverseBoard?.name,humanId:room.humanId||room.pairs[0].x,players:room.players.map(p=>({id:p.id,name:p.name,symbol:p.symbol,score:p.score,figures:p.figures,placements:p.placements||0,bestCombo:p.bestCombo?.points??null,tradeSpent:p.tradeSpent||0,max:p.max?.value??null}))};
}
function completeInverseTurn(room,player,points,random){
 const previous=room.inverseBeeEvent?.id;
 completeInverseBeeTurn(room,player,points,random);
 advanceInverseContour(room,{beeImpact:room.inverseBeeEvent?.id!==previous&&room.inverseBeeEvent?.moved>0});
}
export function inverseCommand(original,action,payload={},now=Date.now(),random=Math.random){
 if(!isInverse(original)||![1,2,3].includes(original.inverseVersion))throw new Error('Versión de Inverso no compatible. Se conserva el guardado.');
 const room=structuredClone(original),pair=room.pairs[0];room.clockNow=now;
 if(comboInverse(room))room.inverseClaimVersion=2;
 const done=()=>{initializeInverseBees(room,random);initializeInverseContour(room);finishIfEmpty(room,now);room.version++;room.updatedAt=new Date(now).toISOString();return room;};
 if(action==='finish'){room.status='finished';room.finishReason='manual';room.finishedAt=new Date(now).toISOString();pair.deadline=null;return done();}
 if(action==='pause'){if(room.status==='paused')return original;if(room.status!=='playing')throw new Error('La partida no está en curso.');room.pauseRemainingMs=room.timeMode==='untimed'?null:Math.max(0,Date.parse(pair.deadline)-now);room.pausedAt=new Date(now).toISOString();room.status='paused';pair.deadline=null;return done();}
 if(action==='resume'){if(room.status!=='paused')throw new Error('La partida no está pausada.');room.status='playing';pair.deadline=room.timeMode==='untimed'?null:new Date(now+(room.pauseRemainingMs??33000)).toISOString();delete room.pauseRemainingMs;delete room.pausedAt;return done();}
 if(action==='watch-target'||action==='remove-target'){if(!['playing','paused'].includes(room.status))throw new Error('Partida no disponible.');if(action==='watch-target')toggleWatchTarget(room,payload);else removeWatchTarget(room,payload.id);return done();}
 if(action==='tick'&&(room.status!=='playing'||room.timeMode==='untimed'||Date.parse(pair.deadline)>now))return original;
 if(room.status!=='playing')throw new Error('La partida no está activa.');
 initializeInverseBees(room,random);initializeInverseContour(room);
 const automatic=action==='tick';
 if(automatic){const choice=inverseMachineChoice(room,random,{automatic:true});if(!choice)return original;action=choice.action;payload=choice.payload;}
 const actor=room.players.find(p=>p.symbol===pair.turn);
 if(!automatic&&room.timeMode!=='untimed'&&Date.parse(pair.deadline)<=now)throw new Error('Tiempo agotado: se jugará automáticamente.');
 if(action==='claim'){
  if(!canClaimInverse(room,actor.id))throw new Error('Elige colocar o cobrar; termina Doble antes de cobrar.');
  const figure=inverseClaimsAt(room,actor.id,{x:payload.x,y:payload.y}).find(f=>f.id===payload.figureId);
  if(!figure)throw new Error('La figura ya no está disponible. Elige una figura propia válida.');
  let result,scoreGroups;
  if(comboInverse(room)){
   actor.score+=figure.pointsValue;actor.figures+=figure.payingCount;earnFreeExpansion(actor);
   const fill=new Set(room.inverseFill),paid=figure.figures.filter(f=>f.points.some(([x,y])=>fill.has(key(x,y))));
   result={points:figure.pointsValue,figures:figure.payingCount,bonus:figure.bonus,paidFigures:!figure.reportTruncated&&paid.length<=128?paid:[{id:figure.id,kind:'combo',size:figure.size,points:figure.points}]};scoreGroups=figure.scoreGroups;
  }else result=awardFigures(room,actor,[figure]);
  const cleared=clearPaid(room,[figure]);
  recordCombo(actor,{...result,automatic});recordMax(actor,result.points-result.bonus,result.figures,automatic);
  recordInventoryCombo(room,actor.id,result.points,{automatic,scorer:actor.id,random});
  completeInventoryTurn(room,actor.id,{automatic,placed:false,random});delete room.practiceTurn;
  pair.turn=pair.turn==='X'?'O':'X';pair.deadline=room.timeMode==='untimed'?null:new Date(now+33000).toISOString();
  room.lastEvent={id:id(),kind:'claim',player:actor.id,actor:actor.id,...result,...(scoreGroups?{scoreGroups}:{}),cleared,automatic,move:{x:payload.x,y:payload.y,symbol:actor.symbol}};
  completeInverseTurn(room,actor.id,result.points,random);
  delete room.practiceHint;return done();
 }
 if(action==='trade'){buyCard(room,payload.playerId,payload.tool,now,{replace:payload.replace});room.lastEvent={id:id(),kind:'trade',player:payload.playerId,tool:payload.tool};return done();}
 if(action==='inventory'){
  const {tool,playerId}=payload;
  if(!inverseToolAllowed(room,tool)||!canUsePracticeTool(room,playerId,tool,now))throw new Error('Esta carta no está disponible en Inverso.');
  const before=structuredClone(room.cells);let landing=[],cleared=[],changed=[],affected=[];
  if(['double','rival','combo'].includes(tool)){
   spendCard(room,playerId,tool);
   if(tool==='double')room.practiceTurn.remaining=2;
   if(tool==='rival')room.inventoryEffects.forced.push({player:pair[pair.turn==='X'?'o':'x'],symbol:actor.symbol,by:playerId});
  }else if(['bomb','tornado'].includes(tool)){
   const result=applyAreaTool(room,playerId,tool,payload,random);landing=result.landing||[];affected=result.affected||[];spendCard(room,playerId,tool);
   cleared=clearPaid(room,landing.flatMap(s=>s.resolvedFigures||s.paidFigures));
  }else{
   const cell=toolCells(room,playerId,tool).find(c=>c.x===payload.x&&c.y===payload.y);if(!cell)throw new Error('Elige una ficha válida del dibujo.');
   affected=[{x:cell.x,y:cell.y}];
   if(tool==='erase'){room.cells=room.cells.filter(c=>c.id!==cell.id);for(const p of room.players)if(p.lastMove?.id===cell.id)delete p.lastMove;}
   else if(tool==='opposite'){cell.symbol=actor.symbol;cell.owner=actor.id;cell.id=id();changed=[cell];}
   else if(tool==='shift'){
    const to={x:payload.toX,y:payload.toY};if(!moveDestination(room,playerId,to))throw new Error('El destino debe ser una celda vacía del dibujo.');changed=[{...cell},to];Object.assign(cell,to);
   }else if(tool==='swap'){
    const other=toolCells(room,playerId,tool).find(c=>c.x===payload.toX&&c.y===payload.toY&&c.id!==cell.id);if(!other)throw new Error('Elige otra ficha del dibujo.');
    const a={x:cell.x,y:cell.y};changed=[a,{x:other.x,y:other.y}];Object.assign(cell,{x:other.x,y:other.y});Object.assign(other,a);
   }else throw new Error('Carta no disponible.');
   if(['shift','swap'].includes(tool))affected=changed;
   if(changed.length){landing=scoreLandings(room,before,changed,{kind:tool,actor:playerId});for(const p of room.players){const c=room.cells.find(c=>c.id===p.lastMove?.id);if(c)p.lastMove={...c};}}
   cleared=clearPaid(room,landing.flatMap(s=>s.resolvedFigures||s.paidFigures));spendCard(room,playerId,tool);
  }
  if(landing.length)room.landingEvent={id:id(),kind:tool,actor:playerId,scores:landing};
  room.lastEvent={id:id(),kind:'inventory',tool,player:playerId,landing,cleared,affected:affected.map(({x,y})=>({x,y}))};delete room.practiceHint;return done();
 }
 if(action==='pass'){
  if(availableCells(room,pair).length)throw new Error('Todavía puedes colocar una ficha.');
  // A full drawing waits for inventory. Never invent an expansion or a pass.
  throw new Error('Dibujo lleno: utiliza Borrar, Bomba o una carta que forme un combo.');
 }
 if(action!=='move')throw new Error('El tablero de Inverso es fijo: no admite ampliaciones ni cambios de terreno.');
 if(!availableCells(room,pair).some(c=>c.x===payload.x&&c.y===payload.y))throw new Error('Elige una celda vacía dentro del dibujo.');
 const state=practiceTurn(room,actor.id),symbol=placementSymbol(room,actor.id),scorer=room.players.find(p=>p.symbol===symbol);
 const cell={id:id(),requestId:payload.requestId||id(),x:payload.x,y:payload.y,symbol,owner:actor.id};room.cells.push(cell);
 room.inventoryEffects.forced=room.inventoryEffects.forced.filter(e=>e.player!==actor.id);
 const found=manualInverse(room)?[]:figureWindows(room.cells,cell.x,cell.y,symbol,room.level).filter(f=>!room.forms.includes(f.id)),result=awardFigures(room,scorer,found);
 const cleared=clearPaid(room,found);actor.lastMove=room.cells.some(c=>c.id===cell.id)?cell:null;actor.navigationLastMove={x:cell.x,y:cell.y,id:cell.id};
 recordCombo(scorer,{...result,automatic,moveId:cell.id});recordMax(actor,scorer===actor?result.points-result.bonus:0,scorer===actor?result.figures:0,automatic);recordInventoryCombo(room,actor.id,result.points,{automatic,scorer:scorer.id,random});
 actor.placements=(actor.placements||0)+1;
 if(manualInverse(room))advanceInverseWild(room,random);
 if(!automatic&&state.remaining>1&&availableCells(room,pair).length){room.practiceTurn={...state,remaining:state.remaining-1};}
 else{completeInventoryTurn(room,actor.id,{automatic,random});delete room.practiceTurn;pair.turn=pair.turn==='X'?'O':'X';pair.deadline=room.timeMode==='untimed'?null:new Date(now+33000).toISOString();completeInverseTurn(room,actor.id,0,random);}
 room.lastEvent={id:cell.id,kind:'move',player:scorer.id,actor:actor.id,...result,cleared,automatic,continuation:false};delete room.practiceHint;return done();
}
export function inverseMachineChoice(room,random=Math.random,options={}){
 if(manualInverse(room)||room.inverseVersion===2&&['high','pro'].includes(room.difficulty))return chooseInverseAction(room,random,options);
 const {automatic=false}=options;
 const pair=room.pairs[0],actor=room.players.find(p=>p.symbol===pair.turn),symbol=placementSymbol(room,actor.id);
 const ranked=rankInverseMoves(room,symbol,333);
 const tactical=room.cells.length<=9&&room.cells.length>0?inverseTacticalChoice(room,actor,ranked[0]?.gain||0):null;if(tactical)return tactical;
 if(ranked.length){
  if(room.difficulty==='basic'&&random()<.35)return {action:'move',payload:ranked[Math.floor(random()*ranked.length)].point};
  if(!automatic&&['high','pro'].includes(room.difficulty)){
   const pro=room.difficulty==='pro',large=room.cells.length>3333,candidates=ranked.slice(0,large?3:pro?16:8);
   for(const c of candidates){
    const next=inverseCommand(room,'move',c.point,room.clockNow,()=>.4),rival=next.players.find(p=>p.id!==actor.id);
    const immediate=next.players.find(p=>p.id===actor.id).score-actor.score-(rival.score-room.players.find(p=>p.id===rival.id).score);
    const response=next.status==='finished'?0:(rankInverseMoves(next,placementSymbol(next,next.pairs[0][next.pairs[0].turn.toLowerCase()]),large?12:pro?64:32)[0]?.gain||0);
    c.value=immediate-response*(pro?.95:.7)+(next.status==='finished'&&next.players.find(p=>p.id===actor.id).score>rival.score?10000:0)+c.adjacent*.1;
   }
   candidates.sort((a,b)=>b.value-a.value);return {action:'move',payload:candidates[0].point};
  }
  return {action:'move',payload:ranked[0].point};
 }
 // On a full drawing, use a real held card, with the same referee as a human.
 for(const tool of ['opposite','swap','erase','bomb'])if(canUsePracticeTool(room,actor.id,tool,room.clockNow)){
  const targets=toolCells(room,actor.id,tool).slice(0,48);
  for(const a of targets){const choices=tool==='swap'?targets.filter(b=>b.id!==a.id&&b.symbol!==a.symbol).slice(0,12):[null];
   for(const b of choices){const payload={tool,playerId:actor.id,x:a.x,y:a.y,...(b?{toX:b.x,toY:b.y}:{})};try{const next=inverseCommand(room,'inventory',payload,room.clockNow,()=>.4);if(next.cells.length<room.cells.length)return {action:'inventory',payload};}catch{}}
  }
 }
 if(tradeAvailability(room,actor.id,'erase',room.clockNow).allowed)return {action:'trade',payload:{playerId:actor.id,tool:'erase'}};
 return null;
}

function rankInverseMoves(room,symbol,limit){
 const pending=inverseFillSet(room),free=availableCells(room,room.pairs[0]),index=prepareFigureIndex(room.cells),occupied=index.occupied.get(symbol),signs=index.bySymbol.get(symbol);
 const sample=free.length<=limit?free:free.filter((_,i)=>i%Math.ceil(free.length/limit)===0);
 return sample.map(point=>{
  const k=key(point.x,point.y);occupied.add(k);signs.push({...point,symbol});index.groups.delete(symbol);
  const figures=figureWindows(room.cells,point.x,point.y,symbol,room.level,index).filter(f=>!room.forms.includes(f.id));
  const paying=payingInverseFigures(room,figures,pending);
  occupied.delete(k);signs.pop();
  const gain=paying.reduce((n,f)=>n+f.size,0),adjacent=[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dy])=>n+Number(occupied.has(key(point.x+dx,point.y+dy))),0);
  const actor=room.players.find(p=>p.symbol===room.pairs[0].turn),own=symbol===actor.symbol;
  const progress=filledInverse(room)?(pending.has(k)?1:0)+[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dy])=>n+Number(pending.has(key(point.x+dx,point.y+dy))),0):0;
  return {point,gain,adjacent,value:(own?gain:-gain)+adjacent*.2+progress*.12};
 }).sort((a,b)=>b.value-a.value);
}

function inverseTacticalChoice(room,actor,currentGain){
 if(!filledInverse(room)&&room.cells.length===1&&canUsePracticeTool(room,actor.id,'erase',room.clockNow))return {action:'inventory',payload:{tool:'erase',playerId:actor.id,x:room.cells[0].x,y:room.cells[0].y}};
 if(currentGain>0)return null;
 const free=availableCells(room,room.pairs[0]),near=new Set();for(const c of room.cells)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)near.add(key(c.x+dx,c.y+dy));
 const destinations=free.filter(c=>near.has(key(c.x,c.y))).slice(0,48);
 let best=null,value=0;
 for(const tool of ['opposite','shift','swap','bomb'])if(canUsePracticeTool(room,actor.id,tool,room.clockNow)){
  const sources=toolCells(room,actor.id,tool).slice(0,12);
  for(const source of sources){const targets=tool==='shift'?destinations:tool==='swap'?sources.filter(c=>c.id!==source.id):[null];
   for(const target of targets){const payload={playerId:actor.id,tool,x:source.x,y:source.y,...(target?{toX:target.x,toY:target.y}:{})};try{
    const next=inverseCommand(room,'inventory',payload,room.clockNow,()=>.4),gain=next.players.find(p=>p.id===actor.id).score-actor.score;
    const future=rankInverseMoves(next,placementSymbol(next,actor.id),96)[0]?.gain||0;
    const score=(next.status==='finished'?10000:0)+gain+future*.8;
    if(score>value){value=score;best={action:'inventory',payload};}
   }catch{}}
  }
 }
 if(best)return best;
 if(!filledInverse(room)&&room.cells.length===1&&tradeAvailability(room,actor.id,'erase',room.clockNow).allowed)return {action:'trade',payload:{playerId:actor.id,tool:'erase'}};
 return null;
}
