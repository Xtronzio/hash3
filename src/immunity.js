import {inventoryEnabled} from './inventory-enabled.js';
export const IMMUNITY_MS=33000;
export const IMMUNITY_POINTS=33;
export const immunityGoals=[
  {id:'immunity-1',combos:3,protections:1},
  {id:'immunity-3',combos:33,protections:3},
  {id:'immunity-33',combos:333,protections:33}
];
const initialImmunity=()=>({combos:0,cards:Object.fromEntries(immunityGoals.map(g=>[g.id,0])),earned:0});
export function immunityFor(game,playerId){
  const inv=game?.players?.find(p=>p.id===playerId)?.inventory?.immunity||initialImmunity();
  if(game?.immunityVersion>=2)return inv;
  // R0.16.8 stored duration cards. Preserve their unspent protection as
  // single-round units, including the unused rounds of an active card.
  const cards=Object.fromEntries(immunityGoals.map(g=>[g.id,(inv.cards[g.id]||0)*g.protections]));
  cards['immunity-1']+=(game?.inventoryEffects?.immunities||[]).filter(e=>e.player===playerId).reduce((n,e)=>n+Math.max(0,e.remaining-1),0);
  return {...inv,cards};
}
export function immunityStock(game,playerId){return Object.values(immunityFor(game,playerId).cards).reduce((n,v)=>n+v,0);}
export function initializeImmunity(game,now=game.clockNow??Date.now()){
  for(const player of game.players){
    if((game.immunityVersion??0)<2)player.inventory.immunity=immunityFor(game,player.id);
    player.inventory.immunity||=initialImmunity();
    for(const goal of immunityGoals)player.inventory.immunity.cards[goal.id]??=0;
  }
  game.inventoryEffects.immunities||=[];
  if((game.immunityVersion??0)<2)for(const effect of game.inventoryEffects.immunities)effect.remaining=Math.min(1,effect.remaining);
  if(game.immunityVersion!==3){game.inventoryEffects.immunities=game.inventoryEffects.immunities.filter(e=>e.remaining>0);}
  if(game.immunityVersion!==3)for(const e of game.inventoryEffects.immunities){e.expiresAt=now+IMMUNITY_MS;delete e.remaining;}
  game.immunityVersion=3;
}
export function immunitySeconds(game,playerId,now=game.clockNow??Date.now()){
 const e=game?.inventoryEffects?.immunities?.find(e=>e.player===playerId);if(!e)return 0;
 return Math.max(0,Math.ceil((e.remainingMs??(e.expiresAt!=null?e.expiresAt-now:e.remaining>0?IMMUNITY_MS:0))/1000));
}
export const immunityRemaining=(game,playerId,now=game.clockNow??Date.now())=>immunitySeconds(game,playerId,now)>0?1:0;
export const isImmune=(game,playerId,now=game.clockNow??Date.now())=>immunityRemaining(game,playerId,now)>0;
export function expireImmunities(game,now=Date.now()){
 const before=game.inventoryEffects.immunities.length;
 game.inventoryEffects.immunities=game.inventoryEffects.immunities.filter(e=>e.remainingMs!=null||e.expiresAt>now);
 return before!==game.inventoryEffects.immunities.length;
}
export function freezeImmunities(game,now){for(const e of game.inventoryEffects.immunities)e.remainingMs=Math.max(0,e.expiresAt-now);}
export function resumeImmunities(game,now){for(const e of game.inventoryEffects.immunities){e.expiresAt=now+(e.remainingMs??IMMUNITY_MS);delete e.remainingMs;}}
// Local terrain is shared. Occupied cells belong to their piece owner; empty
// cells built by a player retain that owner's territory. Frontiers retain by.
export function protectedTerritoryKeys(game,now=game.clockNow??Date.now()){
 const immune=new Set((game.players||[]).filter(p=>isImmune(game,p.id,now)).map(p=>p.id));
 const occupied=new Map((game.cells||[]).map(c=>[`${c.x},${c.y}`,c]));
 const keys=new Set([...occupied].filter(([,c])=>immune.has(c.owner)).map(([k])=>k));
 for(const c of game.terrain||[])if(!occupied.has(`${c.x},${c.y}`)&&immune.has(c.owner))keys.add(`${c.x},${c.y}`);
 for(const f of game.frontiers||[])if(immune.has(f.by))for(const c of f.cells||[])keys.add(`${c.x},${c.y}`);
 return keys;
}
export function immunityProgress(game,playerId){
  const inv=immunityFor(game,playerId);
  return immunityGoals.map(goal=>({...goal,count:inv.cards[goal.id]||0,progress:inv.combos%goal.combos,missing:goal.combos-inv.combos%goal.combos}));
}
// Count a placement, never a turn or accumulated score. Doble's placements
// qualify separately; points from a card or the rival's forced symbol do not.
export function recordImmunityCombo(game,playerId,points,{automatic=false,scorer=playerId}={}){
  if(!inventoryEnabled(game,playerId))return [];
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
export function activateImmunity(game,playerId,now=game.clockNow??Date.now()){
  game.inventoryEffects.immunities.push({player:playerId,expiresAt:now+IMMUNITY_MS});
  game.inventoryEffects.forced=game.inventoryEffects.forced.filter(e=>e.player!==playerId);
}
export function completeImmunityRound(){} // Turns never consume timed protection.
