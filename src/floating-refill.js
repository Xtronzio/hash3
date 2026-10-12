import {CARD_PRICES,tradeAvailability} from './inventory-economy.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {practiceTools,MAX_CARDS} from './practice-tools.js';
import {toolIcon,inventoryCardTotal} from './inventory.js';
import {bindHoldGesture} from './hold-gesture.js';
export const REFILL_HOLD_MS=1000;
export const refillIcon='<svg viewBox="0 0 40 40" aria-hidden="true"><path class="refill-orbit" d="M7 15a14 14 0 0 1 24-5m-1-6 2 7-7-1M33 25A14 14 0 0 1 9 30m1 6-2-7 7 1"/><rect x="13" y="12" width="13" height="17" rx="2"/><path d="M17 8h10a3 3 0 0 1 3 3v13M16 20h7m-3.5-3.5v7"/></svg>';
export function canOpenRefill(game,playerId,now=Date.now()){
 if(!game||game.status!=='playing'||!['solo','local'].includes(game.mode)||!inventoryEnabled(game,playerId))return false;
 const pair=game.pairs[0];
 return (pair.pending?pair.expander:pair[pair.turn.toLowerCase()])===playerId&&(game.timeMode==='untimed'||Date.parse(pair.deadline)>now);
}
export function floatingRefillMarkup(game,playerId){
 if(game.status!=='playing'||!['solo','local'].includes(game.mode)||!inventoryEnabled(game,playerId))return '';
 const player=game.players.find(p=>p.id===playerId),enabled=canOpenRefill(game,playerId),label='Recarga '+player.symbol+' · mantén 1 segundo para elegir hasta tres cartas y comprarlas con puntos';
 return `<div class="floating-refill" data-floating-player="${playerId}"><span class="refill-drag-handle" title="Arrastra para mover Recarga" aria-label="Arrastrar Recarga">⠿</span><button class="refill-trigger ${player.symbol.toLowerCase()}" data-action="refill-hold" data-player="${playerId}" aria-label="${label}" title="${label}" aria-haspopup="dialog" ${enabled?'':'disabled'}><svg class="refill-progress" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><circle class="refill-progress-fill" cx="32" cy="32" r="29" pathLength="100"/></svg><span class="refill-emblem">${refillIcon}</span><span class="refill-team">${player.symbol}</span><small>1s</small></button></div>`;
}
export function bindRefillHold(root,onOpen){return bindHoldGesture(root,{selector:'[data-action="refill-hold"]',duration:REFILL_HOLD_MS,onComplete:button=>onOpen(button.dataset.player)});}
export function refillSelectorMarkup(game,playerId,{remaining=3,exchange=false,replace=null}={}){
 const player=game.players.find(p=>p.id===playerId);
 const cards=[...practiceTools].sort((a,b)=>CARD_PRICES[a.id]-CARD_PRICES[b.id]).map(t=>{
  const price=CARD_PRICES[t.id];
  const stock=player.inventory.cards[t.id]||0,choosing=exchange&&!replace,state=choosing?{allowed:stock>0,reason:'No tienes esta carta'}:tradeAvailability(game,playerId,t.id,Date.now(),{replace:exchange?replace:null});
  if(choosing&&!stock)return '';
  const label=`${t.label} · ${choosing?'entregar una':(exchange?'sustituir por':'comprar')+' una por '+price+' puntos'} · tienes ${stock}${state.allowed?'':' · '+state.reason}`;
  return `<button class="refill-card" data-action="${choosing?'refill-replace':'refill-buy'}" data-tool="${t.id}" data-player="${playerId}" aria-label="${label}" title="${label}" ${state.allowed?'':'disabled'}><span class="refill-card-icon">${toolIcon(t.id)}</span><b class="refill-card-stock">×${stock}</b>${choosing?'':`<span class="refill-card-price">${price.toLocaleString('es-ES')}</span>`}</button>`;
 }).join('');
 const modes=`<nav class="refill-modes" aria-label="Comprar o cambiar"><button data-action="refill-mode" data-mode="buy" aria-pressed="${!exchange}">Comprar</button><button data-action="refill-mode" data-mode="exchange" aria-pressed="${exchange}">Cambiar</button>${exchange?`<span class="refill-exchange-stage">${replace?toolIcon(replace)+' →':'Entrega una'}</span>${replace?'<button data-action="refill-replace-clear" aria-label="Elegir otra carta para entregar">↶</button>':''}`:''}</nav>`;
 return `<div class="refill-backdrop"><section class="refill-selector" role="dialog" aria-modal="true" aria-labelledby="refill-title"><header><span class="refill-heading-icon">${refillIcon}</span><h2 id="refill-title">Recarga<span class="refill-capacity" aria-label="${inventoryCardTotal(game,playerId)} de ${MAX_CARDS} cartas guardadas">${inventoryCardTotal(game,playerId)}/${MAX_CARDS}${player.inventory.comboPending?'<small title="Recarga por combo pendiente de hueco"> · +1</small>':''}</span></h2><span class="refill-remaining" aria-label="${remaining} compras restantes">${remaining}/3</span><span class="refill-wallet" aria-label="${player.score} puntos disponibles">${player.score.toLocaleString('es-ES')} <small>pts</small></span><button data-action="close-refill" aria-label="Cerrar recarga">×</button></header>${modes}<div class="refill-catalog"><div class="refill-card-grid">${cards}</div></div></section></div>`;
}
