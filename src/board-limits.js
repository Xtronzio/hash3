export const CLASSIC_BOARD_LIMIT=33333;
export const CELL_TARGETS=[33,333,3333,33333];
export function boardCellLimit(room){
 if(!room||room.commonWorld||room.kind==='world'||room.mode==='world')return Infinity;
 if(CELL_TARGETS.includes(room.cellTarget))return room.cellTarget;
 return room.faunaEnabled===false&&room.territoryEnabled===false?CLASSIC_BOARD_LIMIT:Infinity;
}
export function expansionFitsLimit(room,known,point){
 let adds=0;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(!known.has(`${point.x+dx},${point.y+dy}`))adds++;
 return known.size+adds<=boardCellLimit(room);
}

export function finishAtBoardLimit(room,now){
 const limit=boardCellLimit(room),size=room.terrain?.length||0;
 if(!Number.isFinite(limit)||size<limit)return false;
 if(room.status==='finished'&&room.finalResult?.kind==='board-limit')return true;
 room.status='finished';room.finishReason='board-limit';room.finishedAt=new Date(now).toISOString();
 for(const pair of room.pairs||[]){pair.pending=0;pair.expander=null;pair.deadline=null;delete pair.optionalExpansion;}
 room.finalResult={kind:'board-limit',target:limit,goalType:'cells',limit,size,completedAt:room.finishedAt,mode:room.mode,level:room.level,timeMode:room.timeMode,difficulty:room.difficulty||null,machineInventory:room.machineInventory===true,faunaEnabled:room.faunaEnabled!==false,territoryEnabled:room.territoryEnabled!==false,declaredGoal:room.matchGoal|| (room.cellTarget?{type:'cells',target:room.cellTarget}:{type:'continuous'}),ruleVersion:room.ruleVersion||1,humanId:room.humanId||room.pairs?.[0]?.x,players:(room.players||[]).map(p=>({id:p.id,name:p.name,symbol:p.symbol,score:p.score||0,figures:p.figures||0,placements:p.placements??null,bestCombo:p.bestCombo?.points??null,max:p.max?.value??null}))};
 return true;
}

export function finishAtMatchGoal(room,now){
 if(room.status!=='playing')return false;
 const goal=room.matchGoal;
 if(!goal)return finishAtBoardLimit(room,now);
 const moves=(room.players||[]).reduce((sum,p)=>sum+(p.placements||0),0);
 const completed=goal.type==='moves'?moves>=goal.target:goal.type==='time'&&Date.parse(room.endsAt)<=now;
 if(!completed)return finishAtBoardLimit(room,now);
 room.status='finished';room.finishReason=goal.type==='time'?'time-limit':'move-limit';room.finishedAt=new Date(now).toISOString();
 for(const pair of room.pairs||[]){pair.pending=0;pair.expander=null;pair.deadline=null;delete pair.optionalExpansion;}
 room.finalResult={kind:room.finishReason,target:goal.target,goalType:goal.type,limit:goal.target,size:room.terrain?.length||0,completedAt:room.finishedAt,mode:room.mode,level:room.level,timeMode:room.timeMode,difficulty:room.difficulty||null,machineInventory:room.machineInventory===true,faunaEnabled:room.faunaEnabled!==false,territoryEnabled:room.territoryEnabled!==false,declaredGoal:room.matchGoal|| (room.cellTarget?{type:'cells',target:room.cellTarget}:{type:'continuous'}),ruleVersion:room.ruleVersion||1,humanId:room.humanId||room.pairs?.[0]?.x,players:(room.players||[]).map(p=>({id:p.id,name:p.name,symbol:p.symbol,score:p.score||0,figures:p.figures||0,placements:p.placements??null,bestCombo:p.bestCombo?.points??null,max:p.max?.value??null}))};
 return true;
}
