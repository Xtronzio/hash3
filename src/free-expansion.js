import {boardCellLimit} from './board-limits.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {terrainOf,expansionOptions} from './game.js';
export const STRATEGIC_EXPANSION_FIGURES=333;
export const strategicExpansionUnlocked=room=>(room.players||[]).reduce((n,p)=>n+(p.figures||0),0)>=STRATEGIC_EXPANSION_FIGURES;
// Keep historic reserves in saves, but stop awarding and exposing free growth.
export function initializeFreeExpansions(room){
 for(const p of room.players){p.freeExpansions??=0;p.freeExpansionVersion=5;delete p.nextFreeExpansionFigure;}
}
export function earnFreeExpansion(){return false;}
export function canRequestStrategicExpansion(room,playerId){
 if(!inventoryEnabled(room,playerId))return false;
 const player=room.players.find(p=>p.id===playerId),pair=room.pairs.find(p=>p.x===playerId||p.o===playerId),state=room.practiceTurn?.player===playerId?room.practiceTurn:null;
 const used=(state?.used||[]).filter(id=>!['combo','super-hint','immunity'].includes(id)).length,allowance=state?.used.includes('combo')?2:1;
 return room.status==='playing'&&!!player&&!!pair&&!pair.pending&&pair.turn===player.symbol&&strategicExpansionUnlocked(room)&&(player.inventory?.cards['hint-expand']||0)>0&&used<allowance&&!state?.used.includes('double')&&!(room.practiceTurn?.remaining>1)&&!(room.practiceTurn?.player===playerId&&(room.practiceTurn.freeExpanded||room.practiceTurn.used.includes('hint-expand')))&&terrainOf(room).length<boardCellLimit(room)&&expansionOptions(terrainOf(room),pair.terrainAnchor||pair.active,room).length>0;
}
// Compatibility for callers; old free tickets no longer authorize expansion.
export const canRequestFreeExpansion=canRequestStrategicExpansion;
