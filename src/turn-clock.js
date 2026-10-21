// A 33-second match always has three-second turns, including automatic moves
// and compulsory expansion. Other local modes retain their existing clock.
export const rapidMatch=room=>['solo','local'].includes(room?.mode)&&room.variant!=='inverse'&&room.matchGoal?.type==='time'&&room.matchGoal.target===33;
export const turnSecondsFor=room=>rapidMatch(room)?3:room.timeMode==='untimed'?null:33;
export function initializeTurnClock(room,now){
 if(room.status==='finished')return;
 const rapid=rapidMatch(room),old=room.turnSeconds;
 if(rapid)room.timeMode='timed';
 room.turnSeconds=turnSecondsFor(room);
 if(!rapid)return;
 // Adopt old rapid saves without granting extra time or replaying a turn.
 if(room.status==='paused')room.pauseRemainingMs=Math.min(room.pauseRemainingMs??3000,3000);
 else for(const p of room.pairs||[])if(old!==3||!p.deadline)p.deadline=new Date(Math.min(Number.isFinite(Date.parse(p.deadline))?Date.parse(p.deadline):now+3000,now+3000)).toISOString();
}
