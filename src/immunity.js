export const IMMUNITY_POINTS=33;
export const immunityGoals=[
  {id:'immunity-1',combos:3,protections:1},
  {id:'immunity-3',combos:33,protections:3},
  {id:'immunity-33',combos:333,protections:33}
];
const initialImmunity=()=>({combos:0,cards:Object.fromEntries(immunityGoals.map(g=>[g.id,0])),earned:0});
export function immunityFor(game,playerId){
  const inv=game?.players?.find(p=>p.id===playerId)?.inventory?.immunity||initialImmunity();
  if(game?.immunityVersion===2)return inv;
  // R0.16.8 stored duration cards. Preserve their unspent protection as
  // single-round units, including the unused rounds of an active card.
  const cards=Object.fromEntries(immunityGoals.map(g=>[g.id,(inv.cards[g.id]||0)*g.protections]));
  cards['immunity-1']+=(game?.inventoryEffects?.immunities||[]).filter(e=>e.player===playerId).reduce((n,e)=>n+Math.max(0,e.remaining-1),0);
  return {...inv,cards};
}
export function immunityStock(game,playerId){return Object.values(immunityFor(game,playerId).cards).reduce((n,v)=>n+v,0);}
export function initializeImmunity(game){
  for(const player of game.players){
    if(game.immunityVersion!==2)player.inventory.immunity=immunityFor(game,player.id);
    player.inventory.immunity||=initialImmunity();
    for(const goal of immunityGoals)player.inventory.immunity.cards[goal.id]??=0;
  }
  game.inventoryEffects.immunities||=[];
  if(game.immunityVersion!==2)for(const effect of game.inventoryEffects.immunities)effect.remaining=Math.min(1,effect.remaining);
  game.immunityVersion=2;
}
export function immunityRemaining(game,playerId){return Math.min(1,game?.inventoryEffects?.immunities?.find(e=>e.player===playerId)?.remaining||0);}
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
  for(const goal of earned)inv.cards[goal.id]+=goal.protections;
  if(earned.length){inv.earned+=earned.length;inv.lastEarned=earned.map(g=>g.id);}
  return earned;
}
export function spendImmunity(game,playerId){
  const inv=immunityFor(game,playerId),source=immunityGoals.find(g=>inv.cards[g.id]>0);
  inv.cards[source.id]--;
}
export function activateImmunity(game,playerId){
  game.inventoryEffects.immunities.push({player:playerId,remaining:1});
  game.inventoryEffects.forced=game.inventoryEffects.forced.filter(e=>e.player!==playerId);
}
export function completeImmunityRound(game,playerId){
  for(const effect of game.inventoryEffects.immunities)if(effect.player!==playerId)effect.remaining--;
  game.inventoryEffects.immunities=game.inventoryEffects.immunities.filter(e=>e.remaining>0);
}
