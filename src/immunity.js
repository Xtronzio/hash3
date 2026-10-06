export const IMMUNITY_POINTS=33;
export const immunityGoals=[
  {id:'immunity-1',combos:3,rounds:1},
  {id:'immunity-3',combos:33,rounds:3},
  {id:'immunity-33',combos:333,rounds:33}
];
const initialImmunity=()=>({combos:0,cards:Object.fromEntries(immunityGoals.map(g=>[g.id,0])),earned:0});
export function immunityFor(game,playerId){return game?.players?.find(p=>p.id===playerId)?.inventory?.immunity||initialImmunity();}
export function initializeImmunity(game){
  for(const player of game.players){
    player.inventory.immunity||=initialImmunity();
    for(const goal of immunityGoals)player.inventory.immunity.cards[goal.id]??=0;
  }
  game.inventoryEffects.immunities||=[];
}
export function immunityRemaining(game,playerId){return game?.inventoryEffects?.immunities?.find(e=>e.player===playerId)?.remaining||0;}
export function isImmune(game,playerId){return immunityRemaining(game,playerId)>0;}
export function immunityProgress(game,playerId){
  const inv=immunityFor(game,playerId);
  return immunityGoals.map(goal=>({...goal,count:inv.cards[goal.id]||0,progress:inv.combos%goal.combos,missing:goal.combos-inv.combos%goal.combos}));
}
// Count a placement, never a turn or accumulated score. Doble's placements
// qualify separately; points from a card or the rival's forced symbol do not.
export function recordImmunityCombo(game,playerId,points,{automatic=false,scorer=playerId}={}){
  if(automatic||scorer!==playerId||!Number.isFinite(points)||points<IMMUNITY_POINTS||!['solo','local'].includes(game.mode))return [];
  const inv=immunityFor(game,playerId);inv.combos++;
  const earned=immunityGoals.filter(goal=>inv.combos%goal.combos===0);
  for(const goal of earned)inv.cards[goal.id]++;
  if(earned.length){inv.earned+=earned.length;inv.lastEarned=earned.map(g=>g.id);}
  return earned;
}
export function activateImmunity(game,playerId,tool){
  const goal=immunityGoals.find(g=>g.id===tool);
  game.inventoryEffects.immunities.push({player:playerId,remaining:goal.rounds});
  game.inventoryEffects.forced=game.inventoryEffects.forced.filter(e=>e.player!==playerId);
}
export function completeImmunityRound(game,playerId){
  for(const effect of game.inventoryEffects.immunities)if(effect.player!==playerId)effect.remaining--;
  game.inventoryEffects.immunities=game.inventoryEffects.immunities.filter(e=>e.remaining>0);
}
