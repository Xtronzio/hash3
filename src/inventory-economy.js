import {inverseToolAllowed} from './inverse-rules.js';
import {isPrisoner} from './inverse-prison.js';
import {practiceTools,immunityTools,inventoryCapacity,MAX_PER_CARD} from './practice-tools.js';
import {inventoryEnabled} from './inventory-enabled.js';
// 3333 is reserved for a future power: current cards do not justify that tier.
export const CARD_PRICES=Object.freeze({immunity:333,hint:3,destroy:3,frontier:3,activate:3,
 relocate:33,double:33,opposite:33,rival:33,erase:33,swap:33,shift:33,block:33,shield:33,
 'expand-2':33,'expand-3':33,border:33,ambush:33,antidote:33,sapper:33,
 bomb:33,tornado:33,combo:33,'hint-expand':33,'super-hint':33,reconquest:333,nuclear:333});
export function tradeAvailability(game,playerId,tool,now=Date.now(),{replace=null}={}){
 if(game.inventoryBalanceVersion===1&&tool==='immunity')return {allowed:false,reason:'La inmunidad se gana con combos de 33, 66 y 99 puntos'};
 if(isPrisoner(game,playerId))return {allowed:false,price:CARD_PRICES[tool],reason:'El jugador está en la cárcel'};
 if(!inverseToolAllowed(game,tool))return {allowed:false,price:CARD_PRICES[tool],reason:'Esta carta modifica el territorio y no pertenece a Inverso'};
 const price=CARD_PRICES[tool],player=game?.players?.find(p=>p.id===playerId),pair=game?.pairs?.[0],inv=player?.inventory;
 if(!price||!([...practiceTools,...immunityTools]).some(t=>t.id===tool)||!inv)return {allowed:false,price,reason:'Carta no disponible'};
 if(!['solo','local'].includes(game.mode)||game.status!=='playing'||!inventoryEnabled(game,playerId))return {allowed:false,price,reason:'Inventario no disponible'};
 if((pair.pending?pair.expander:pair[pair.turn.toLowerCase()])!==playerId||game.timeMode!=='untimed'&&!(Date.parse(pair.deadline)>now))return {allowed:false,price,reason:'Espera tu turno'};
 if(tool==='immunity'){if(replace)return {allowed:false,price,reason:'La inmunidad total se compra directamente'};if(!Number.isFinite(player.score)||player.score<price)return {allowed:false,price,reason:'Puntos insuficientes'};return {allowed:true,price,reason:'Comprar protección total'};}
 if(replace&&(!practiceTools.some(t=>t.id===replace)||!(inv.cards[replace]>0)))return {allowed:false,price,reason:'Elige una carta guardada para entregar'};
 if(replace===tool)return {allowed:false,price,reason:'Elige una carta diferente'};
 if(replace&&price>CARD_PRICES[replace])return {allowed:false,price,reason:'Solo puedes cambiar por valor igual o inferior'};
 if((inv.cards[tool]||0)>=MAX_PER_CARD)return {allowed:false,price,reason:'Máximo tres unidades'};
 if(!replace&&Object.values(inv.cards).reduce((a,b)=>a+b,0)>=inventoryCapacity(game))return {allowed:false,price,reason:'Mochila llena'};
 if(!Number.isFinite(player.score)||player.score<price)return {allowed:false,price,reason:'Puntos insuficientes'};
 return {allowed:true,price,reason:replace?'Cambiar una unidad':'Comprar una unidad'};
}
export function buyCard(game,playerId,tool,now=Date.now(),{replace=null}={}){
 const state=tradeAvailability(game,playerId,tool,now,{replace});if(!state.allowed)throw new Error(state.reason);
 const player=game.players.find(p=>p.id===playerId);
 if(game.mode==='solo'&&playerId!==(game.humanId||game.pairs[0].x))player.inventory.machineTradeTurn=player.inventory.completedTurns||0;
 player.score-=state.price;player.tradeSpent=(player.tradeSpent||0)+state.price;
 if(replace){player.inventory.cards[replace]--;player.inventory.exchanged=(player.inventory.exchanged||0)+1;}
 if(tool==='immunity')player.inventory.immunity.cards['immunity-1']++;else player.inventory.cards[tool]=(player.inventory.cards[tool]||0)+1;
 player.inventory.purchases=(player.inventory.purchases||0)+1;
 player.inventory.received[tool]=(player.inventory.received[tool]||0)+1;
}
