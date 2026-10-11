import {practiceTools,MAX_CARDS,MAX_CARD_TYPES,MAX_PER_CARD} from './practice-tools.js';
import {inventoryEnabled} from './inventory-enabled.js';
// 3333 is reserved for a future power: current cards do not justify that tier.
export const CARD_PRICES=Object.freeze({hint:3,destroy:3,frontier:3,activate:3,
 double:33,opposite:33,rival:33,erase:33,swap:33,shift:33,block:33,shield:33,
 'expand-2':33,'expand-3':33,border:33,ambush:33,antidote:33,
 bomb:333,tornado:333,combo:333,'hint-expand':333,'super-hint':333,reconquest:333});
export function tradeAvailability(game,playerId,tool,now=Date.now()){
 const price=CARD_PRICES[tool],player=game?.players?.find(p=>p.id===playerId),pair=game?.pairs?.[0],inv=player?.inventory;
 if(!price||!practiceTools.some(t=>t.id===tool)||!inv)return {allowed:false,price,reason:'Carta no disponible'};
 if(!['solo','local'].includes(game.mode)||game.status!=='playing'||!inventoryEnabled(game,playerId))return {allowed:false,price,reason:'Inventario no disponible'};
 if((pair.pending?pair.expander:pair[pair.turn.toLowerCase()])!==playerId||game.timeMode!=='untimed'&&!(Date.parse(pair.deadline)>now))return {allowed:false,price,reason:'Espera tu turno'};
 const counts=Object.values(inv.cards),held=practiceTools.filter(t=>inv.cards[t.id]>0).length;
 if((inv.cards[tool]||0)>=MAX_PER_CARD)return {allowed:false,price,reason:'Máximo tres unidades'};
 if(counts.reduce((a,b)=>a+b,0)>=MAX_CARDS||held>MAX_CARD_TYPES||!inv.cards[tool]&&held>=MAX_CARD_TYPES)return {allowed:false,price,reason:'Mochila llena'};
 if(!Number.isFinite(player.score)||player.score<price)return {allowed:false,price,reason:'Puntos insuficientes'};
 return {allowed:true,price,reason:'Comprar una unidad'};
}
export function buyCard(game,playerId,tool,now=Date.now()){
 const state=tradeAvailability(game,playerId,tool,now);if(!state.allowed)throw new Error(state.reason);
 const player=game.players.find(p=>p.id===playerId);
 if(game.mode==='solo'&&playerId!==(game.humanId||game.pairs[0].x))player.inventory.machineTradeTurn=player.inventory.completedTurns||0;
 player.score-=state.price;player.tradeSpent=(player.tradeSpent||0)+state.price;
 player.inventory.cards[tool]=(player.inventory.cards[tool]||0)+1;
 player.inventory.purchases=(player.inventory.purchases||0)+1;
 player.inventory.received[tool]=(player.inventory.received[tool]||0)+1;
}
