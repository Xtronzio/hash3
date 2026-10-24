// A versioned adoption: retain historical surplus until spent, without new
// rewards or elapsed-turn credit for the time before the change.
export function adoptInventoryBalance(game){
 if(!['solo','local'].includes(game.mode)||game.status==='finished'||game.inventoryBalanceVersion===1||game.inventoryBalanceVersion===0)return;
 if(game.variant==='inverse'&&game.inverseVersion!=null&&game.inverseVersion!==3)return;
 game.inventoryBalanceVersion=1;
 for(const e of game.territoryEvents||[])if(['clouds','fog'].includes(e.kind))e.fogDuration??=3;
 for(const p of game.players){if(!p.inventory)continue;p.inventory.legacyPending=p.inventory.comboPending?1:0;p.inventory.comboPending=0;delete p.inventory.refillCycle;
  const inv=p.inventory.immunity;if(!inv)continue;
  const total=Object.entries(inv.cards||{}).reduce((a,[k,b])=>a+b*((game.immunityVersion||0)<2?({'immunity-1':1,'immunity-3':3,'immunity-33':33}[k]||1):1),0);
  inv.earned=Math.max(inv.earned||0,Math.min(3,total));
  if(total>3){inv.legacyCards={...inv.cards};inv.cards={'immunity-1':3,'immunity-3':0,'immunity-33':0};}
 }
}
import {INVENTORY_ORDER} from './inventory-layout.js';
import {inverseToolAllowed} from './inverse-rules.js';
export function validBalanceState(game){
 if(game.inventoryBalanceVersion==null||game.inventoryBalanceVersion===0)return true;
 if(game.inventoryBalanceVersion!==1)return false;
 const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
 for(const p of game.players||[]){const inv=p.inventory,c=inv?.refillCycle;if(!inv)return false;
  if(c&&(!INVENTORY_ORDER.includes(c.card)||['immunity','target','shield'].includes(c.card)||!inverseToolAllowed(game,c.card)||c.base!==(['hint','destroy','activate','frontier'].includes(c.card)?6:9)||!integer(c.elapsed)||c.elapsed>c.base||!integer(c.bonus)||c.bonus>c.base-3||!integer(c.comboTurn,-1)||c.comboTurn>(inv.completedTurns||0)||typeof c.pending!=='boolean'))return false;
  if(inv.immunity&&(!integer(inv.immunity.earned||0)||Object.values(inv.immunity.cards||{}).reduce((a,b)=>a+b,0)>3))return false;
 }
 const f=game.inverseFog;if(f){const known=new Set(game.terrain.map(c=>`${c.x},${c.y}`));if(game.variant!=='inverse'||f.version!==1||!integer(f.turns)||!integer(f.next)||f.next<=f.turns||f.next-f.turns>66||!Array.isArray(f.targets)||f.targets.length>33||new Set(f.targets.map(c=>`${c.x},${c.y}`)).size!==f.targets.length||f.targets.some(c=>!known.has(`${c.x},${c.y}`)))return false;}
 return true;
}
