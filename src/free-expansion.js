import {boardCellLimit} from './board-limits.js';
import {terrainOf,expansionOptions} from './game.js';
export function initializeFreeExpansions(room){
 for(const p of room.players){p.freeExpansions??=0;p.nextFreeExpansionFigure??=(Math.floor((p.figures||0)/3)+1)*3;}
}
export function earnFreeExpansion(player){
 if(player.figures<(player.nextFreeExpansionFigure??Infinity))return false;
 player.freeExpansions=1;player.nextFreeExpansionFigure=(Math.floor(player.figures/3)+1)*3;return true;
}
export function canRequestFreeExpansion(room,playerId){
 const player=room.players.find(p=>p.id===playerId),pair=room.pairs.find(p=>p.x===playerId||p.o===playerId);
 return terrainOf(room).length<boardCellLimit(room)&&!!pair&&expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room).length>0&&room.status==='playing'&&!!player&&!!pair&&!pair.pending&&pair.turn===player.symbol&&player.freeExpansions>0&&!(room.practiceTurn?.remaining>1);
}
