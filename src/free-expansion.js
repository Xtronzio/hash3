import {boardCellLimit} from './board-limits.js';
import {terrainOf,expansionOptions} from './game.js';
// Versioned migration preserves saved reserves and only rewards new paid figures.
export function initializeFreeExpansions(room){
 for(const p of room.players){
  p.freeExpansions??=0;
  if(p.freeExpansionVersion!==3){p.nextFreeExpansionFigure=(Math.floor((p.figures||0)/3)+1)*3;p.freeExpansionVersion=3;}
  p.nextFreeExpansionFigure??=(Math.floor((p.figures||0)/3)+1)*3;
 }
}
export function earnFreeExpansion(player){
 const next=player.nextFreeExpansionFigure??Infinity;if(player.figures<next)return false;
 const earned=1+Math.floor((player.figures-next)/3);
 player.freeExpansions=(player.freeExpansions||0)+earned;player.nextFreeExpansionFigure=next+earned*3;return true;
}
export function canRequestFreeExpansion(room,playerId){
 const player=room.players.find(p=>p.id===playerId),pair=room.pairs.find(p=>p.x===playerId||p.o===playerId);
 return terrainOf(room).length<boardCellLimit(room)&&!!pair&&expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room).length>0&&room.status==='playing'&&!!player&&!!pair&&!pair.pending&&pair.turn===player.symbol&&player.freeExpansions>0&&!(room.practiceTurn?.remaining>1);
}
