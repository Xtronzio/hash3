import {inventoryEnabled} from './inventory-enabled.js';
import {inventoryFor,MAX_CARDS} from './practice-tools.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function pausedInventorySummaryMarkup(game,playerId,{interactive=false,open=false}={}){
 const own=game.players.find(p=>p.id===playerId);if(!own)return '';
 const rival=game.players.find(p=>p.id!==playerId);
 const counter=(player,side)=>{
  if(!player)return '';
  const enabled=inventoryEnabled(game,player.id),inv=inventoryFor(game,player.id);
  const total=Object.values(inv.cards).reduce((n,count)=>n+count,0),value=enabled?`${total}/${MAX_CARDS}`:'-/-';
  const label=`${side==='own'?'Mi inventario':'Inventario del rival'} ${player.symbol}: ${enabled?`${total} de ${MAX_CARDS} cartas guardadas${inv.comboPending?' · una recarga por combo pendiente de hueco':''}`:'desactivado'}`;
  const mark=player.symbol==='O'?'<circle cx="16" cy="20" r="5"/>':'<path d="m12 16 8 8m0-8-8 8"/>';
  const markup=`<span class="paused-inventory-player ${player.symbol==='O'?'o':'x'}" data-paused-inventory="${side}" data-paused-player="${esc(player.id)}" role="img" aria-label="${esc(label)}" title="${esc(label)}"><svg class="paused-inventory-bag" viewBox="0 0 32 36" aria-hidden="true"><rect x="5" y="9" width="22" height="23" rx="4"/><path d="M11 9V6a5 5 0 0 1 10 0v3M9 28h14M2 17v9m28-9v9"/>${mark}</svg><strong class="inventory-capacity-value ${enabled&&total>=MAX_CARDS?'is-full':''}">${value}</strong>${enabled&&inv.comboPending?'<small class="paused-inventory-pending" aria-hidden="true" title="Una recarga por combo pendiente de hueco">+1</small>':''}</span>`;
  return interactive&&side==='own'&&enabled?`<button class="paused-bag-access" data-action="inventory" aria-label="${esc(label)} · abrir mochila" title="${esc(label)} · abrir mochila" aria-controls="inventory-panel" aria-expanded="${open}">${markup}</button>`:markup;
 };
 return `<div class="paused-inventory-summary inventory-capacity-strip" role="group" aria-label="Inventarios de ambos participantes">${counter(own,'own')}${counter(rival,'rival')}</div>`;
}
