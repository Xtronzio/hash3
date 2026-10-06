import {machineChoice,localHumanId} from './local.js';
import {availableCells,figureWindows} from './game.js';
import {practiceTools,practiceTurn,canUsePracticeTool,inventoryFor,initializeInventory,spendCard,placementSymbol,REFILL_TURNS,MAX_CARDS} from './practice-tools.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
export function canUsePracticeHint(game,playerId,now=Date.now()){
 const p=game?.pairs?.[0];
 return !!(canUsePracticeTool(game,playerId,'hint',now)&&!(game.mode==='solo'&&playerId!==localHumanId(game)));
}
export function usePracticeHint(original,playerId,now=Date.now()){
 if(!canUsePracticeHint(original,playerId,now))throw new Error('La ayuda está disponible durante tu turno en una partida local.');
 const game=structuredClone(original),pair=game.pairs[0];initializeInventory(game);
 // Practice suggestions are immediate; Pro's deep Worker search must not
 // block the UI or use up the player's clock while opening a hint.
 let choice;
 const symbol=placementSymbol(game,playerId);
 if(symbol!==game.players.find(p=>p.id===playerId).symbol){
   const ranked=availableCells(game,pair).map(point=>({point,points:figureWindows([...game.cells,{...point,symbol}],point.x,point.y,symbol,game.level).filter(f=>!game.forms.includes(f.id)).reduce((sum,f)=>sum+f.size,0)})).sort((a,b)=>b.points-a.points);
   choice={payload:ranked[0].point};
 }else choice=machineChoice({...game,difficulty:'medium',pairs:[{...pair}]},()=>0);
 game.practiceHint={...choice.payload,player:playerId};
 const player=game.players.find(p=>p.id===playerId);player.practiceHints=(player.practiceHints||0)+1;
 spendCard(game,playerId,'hint');
 game.version++;game.updatedAt=new Date(now).toISOString();
 return game;
}
export function inventoryMarkup(game,playerId){
 const local=game&&['solo','local'].includes(game.mode),state=local?practiceTurn(game,playerId):null,inv=inventoryFor(game,playerId);
 const icons={double:'<rect x="3" y="6" width="16" height="20" rx="2"/><rect x="13" y="3" width="16" height="20" rx="2"/><path d="m18 9 6 8m0-8-6 8"/>',rival:'<path d="m3 5 8 8m0-8-8 8M15 9h13m-5-5 5 5-5 5"/><circle cx="23" cy="24" r="6"/>',opposite:'<path d="M5 11h20m-5-5 5 5-5 5M27 23H7m5-5-5 5 5 5"/><circle cx="7" cy="5" r="2"/>',erase:'<path d="m9 25-6-6 15-15 11 11-10 10H9Zm3-15 11 11M9 29h20"/>',shift:'<rect x="11" y="11" width="10" height="10" rx="2"/><path d="M16 2v7m-4-3 4-4 4 4M16 30v-7m-4 3 4 4 4-4M2 16h7m-3-4-4 4 4 4M30 16h-7m3-4 4 4-4 4"/>',block:'<rect x="6" y="14" width="20" height="15" rx="2"/><path d="M10 14V9a6 6 0 0 1 12 0v5M16 20v4"/>',shield:'<path d="M16 3 4 8v8c0 6 7 11 12 14 5-3 12-8 12-14V8L16 3Z"/><path d="m10 16 4 4 8-9"/>'};
 const svg=kind=>kind==='hint'?hintIcon:`<svg viewBox="0 0 32 32" aria-hidden="true">${icons[kind]}</svg>`;
 const cards=practiceTools.map(t=>{
   const count=local?(inv.cards[t.id]||0):1,enabled=local&&(t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id));
   return `<button class="inventory-card" data-action="${t.id==='hint'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="Usar ${t.label}, ${count} carta${count===1?'':'s'}" title="${t.description}" ${enabled?'':'disabled'}><span class="inventory-card-top"><span class="inventory-icon">${svg(t.id)}</span><span class="inventory-count">×${count}</span></span><strong>${t.label}</strong><small>${t.description}</small><span class="inventory-card-action">${state?.used.includes(t.id)?'Usada este turno':count?'Usar':'Agotada'}</span></button>`;
 }).join('');
 const total=Object.values(inv.cards).reduce((a,b)=>a+b,0),last=practiceTools.find(t=>t.id===inv.lastDraw)?.label;
 return `<p class="inventory-status">${local?`${game.mode==='solo'?`Máquina ${game.machineInventory?'con':'sin'} inventario · `:''}${total}/${MAX_CARDS} cartas · ${inv.turns>=REFILL_TURNS?'Recarga lista cuando haya hueco':`Recarga en ${REFILL_TURNS-inv.turns} turno${REFILL_TURNS-inv.turns===1?'':'s'} propio${REFILL_TURNS-inv.turns===1?'':'s'}`}`:'Catálogo de pruebas · VS máquina y Sin conexión'}${last?` · Última: ${last}`:''}</p><div class="inventory-cards">${cards}</div><p class="inventory-rules">Hasta dos cartas por turno, además de tu ficha. ${game?.timeMode==='untimed'?'Sin límite de tiempo.':'Las cartas no reinician el reloj.'} Nunca se restan puntos; las figuras ya cobradas no se pagan otra vez.</p>${local?'':game?'<p class="muted">El inventario online todavía está en preparación.</p>':'<div class="inventory-start"><button data-action="setup-solo">Practicar contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button><button data-action="hall-games">Abrir una partida guardada</button></div>'}`;
}
