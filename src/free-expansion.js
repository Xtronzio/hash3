import {boardCellLimit} from './board-limits.js';
import {terrainOf,expansionOptions} from './game.js';
// Versioned migration preserves saved reserves and only rewards new paid figures.
export function initializeFreeExpansions(room){
 for(const p of room.players){
  p.freeExpansions??=0;
  if(p.freeExpansionVersion!==2){p.nextFreeExpansionFigure=(p.figures||0)+1;p.freeExpansionVersion=2;}
  p.nextFreeExpansionFigure??=(p.figures||0)+1;
 }
}
export function earnFreeExpansion(player){
 const next=player.nextFreeExpansionFigure??Infinity;if(player.figures<next)return false;
 const earned=1+player.figures-next;
 player.freeExpansions=(player.freeExpansions||0)+earned;player.nextFreeExpansionFigure=player.figures+1;return true;
}
export function canRequestFreeExpansion(room,playerId){
 const player=room.players.find(p=>p.id===playerId),pair=room.pairs.find(p=>p.x===playerId||p.o===playerId);
 return terrainOf(room).length<boardCellLimit(room)&&!!pair&&expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room).length>0&&room.status==='playing'&&!!player&&!!pair&&!pair.pending&&pair.turn===player.symbol&&player.freeExpansions>0&&!(room.practiceTurn?.remaining>1);
}
