// Ecology snapshots may change the room version while the same rival turn is
// thinking. Keep that computation alive and let localCommand validate its move
// against the current board. A human/tool action or turn change starts anew.
export function machineTurnKey(room,hidden=false){
 if(hidden||room?.mode!=='solo'||room.status!=='playing')return null;
 const p=room.pairs[0],machine=room.humanId===p.o?p.x:p.o;
 if((p.pending?p.expander:p[p.turn.toLowerCase()])!==machine)return null;
 return [room.id,p.turn,p.pending||0,p.expander||'',room.lastEvent?.id||''].join(':');
}
