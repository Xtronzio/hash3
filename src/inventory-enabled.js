// Missing flags on existing saves keep their original inventories.
export function inventoryEnabled(game,playerId){
 if(!['solo','local'].includes(game?.mode))return true;
 const human=game.humanId||game.pairs?.[0]?.x;
 return game.mode==='solo'&&playerId!==human?game.machineInventory===true:game.playerInventory!==false;
}
