import {machineChoice,localHumanId} from './local.js';
import {availableCells,figureWindows} from './game.js';
import {practiceTools,practiceTurn,canUsePracticeTool,inventoryFor,initializeInventory,spendCard,placementSymbol,REFILL_TURNS,MAX_CARDS,toolAllowance} from './practice-tools.js';
import {immunityFor,immunityProgress,immunityRemaining} from './immunity.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
export function inventoryTotal(game,playerId){
 return Object.values(inventoryFor(game,playerId).cards).reduce((sum,count)=>sum+count,0)+Object.values(immunityFor(game,playerId).cards).reduce((sum,count)=>sum+count,0);
}
export function inventoryRefill(previous,next,playerId){
 if(!previous||previous.id!==next?.id||!['solo','local'].includes(next.mode))return null;
 const before=inventoryFor(previous,playerId),after=inventoryFor(next,playerId);
 const drawn=(after.draws||0)-(before.draws||0),merit=immunityFor(next,playerId),earned=(merit.earned||0)-(immunityFor(previous,playerId).earned||0),added=drawn+earned;
 if(added<=0)return null;
 const refill={player:playerId,added,tool:practiceTools.find(t=>t.id===after.lastDraw)?.label||'Carta',total:inventoryTotal(next,playerId)};
 if(earned>0){
   const rewards=immunityProgress(next,playerId).filter(g=>merit.lastEarned?.includes(g.id));
   refill.message=`Inmunidad disponible · ${rewards.map(g=>`${g.rounds} ronda${g.rounds===1?'':'s'}`).join(' + ')}${drawn>0?` · +${drawn} ${refill.tool}`:''}`;
 }
 return refill;
}
export function inventoryDockMarkup(game,playerId,{icon='',open=false,refill=null}={}){
 const total=inventoryTotal(game,playerId),inv=inventoryFor(game,playerId),turns=REFILL_TURNS-inv.turns;
 const label=`Inventario · ${total} carta${total===1?'':'s'} · ${turns<=0?'Recarga lista cuando haya hueco':`Recarga en ${turns} turno${turns===1?'':'s'} propio${turns===1?'':'s'}`}`;
 const active=refill?.player===playerId;
 return `<button class="inventory-dock-button ${active?'is-refilled':''}" data-action="inventory" aria-label="${label}" title="${label}" aria-expanded="${open}" aria-controls="inventory-panel"><span class="inventory-dock-icon">${icon}<span class="inventory-badge ${total?'':'is-empty'}" aria-hidden="true">${total}</span></span></button>${active?`<span class="inventory-refill-toast" role="status" aria-live="polite" aria-atomic="true">${refill.message||`Inventario recargado · +${refill.added} ${refill.tool}`}</span>`:''}`;
}
export function immunityStatusMarkup(game,playerId){
 const own=immunityRemaining(game,playerId),rival=game?.players?.find(p=>p.id!==playerId),other=immunityRemaining(game,rival?.id);
 return `${own?`<span class="immunity-active">Tu inmunidad · ${own} ronda${own===1?'':'s'} restante${own===1?'':'s'}</span>`:''}${other?`<span class="immunity-active">Rival inmune · ${other} ronda${other===1?'':'s'}</span>`:''}`;
}
export function immunityBoardMarkup(game,playerId){
 const goals=immunityProgress(game,playerId),total=goals.reduce((s,g)=>s+g.count,0),status=immunityStatusMarkup(game,playerId);
 return `<div class="immunity-board"><button class="immunity-summary ${total?'has-immunity':''}" data-action="inventory" aria-label="Inmunidad: ${total} cartas disponibles. ${goals.map(g=>`${g.rounds} ronda${g.rounds===1?'':'s'}: faltan ${g.missing} combos`).join('. ')}"><span class="immunity-summary-title">Inmunidad<small>${total?`${total} disponible${total===1?'':'s'}`:'Combos ≥33 pts'}</small></span>${goals.map(g=>`<span class="immunity-summary-goal"><span>${g.rounds} ronda${g.rounds===1?'':'s'}${g.count?` · ×${g.count}`:''}</span><b>Faltan ${g.missing}</b></span>`).join('')}</button>${status?`<div class="immunity-board-status" role="status">${status}</div>`:''}</div>`;
}
export function immunityMarkup(game,playerId){
 const local=game&&['solo','local'].includes(game.mode),goals=immunityProgress(game,playerId),merit=immunityFor(game,playerId),status=immunityStatusMarkup(game,playerId),allowance=local?toolAllowance(game,playerId):null;
 return `<section class="immunity-section" aria-labelledby="immunity-title"><h3 id="immunity-title">Inmunidad por buen juego</h3><p class="immunity-explanation">Cada colocación manual de 33 puntos o más cuenta como un combo, incluidos sus bonus. Las cartas no suman combos. ${local?`${merit.combos} conseguido${merit.combos===1?'':'s'}. `:''}Los tres objetivos avanzan juntos y se repiten; gastar una carta conserva todo el progreso.</p>${status?`<p class="immunity-inventory-status" role="status">${status}</p>`:''}<div class="immunity-cards">${goals.map(g=>{
   const enabled=local&&canUsePracticeTool(game,playerId,g.id),rounds=`${g.rounds} ronda${g.rounds===1?'':'s'}`,action=!g.count?'Por conseguir':immunityRemaining(game,playerId)?'Ya estás protegido':local&&!allowance.remaining?'Límite alcanzado':enabled?'Activar':'Espera tu turno';
   return `<article class="immunity-card ${g.count?'has-immunity':''}" data-immunity="${g.id}"><div class="immunity-card-top"><strong>${rounds}</strong><span class="immunity-stock" aria-label="${g.count} cartas disponibles">×${g.count}</span></div><span class="immunity-available">${g.count?`${g.count} disponible${g.count===1?'':'s'}`:'Sin cartas'}</span><progress max="${g.combos}" value="${g.progress}" aria-label="${g.progress} de ${g.combos} combos para otra inmunidad de ${rounds}"></progress><b class="immunity-missing">Faltan ${g.missing} combo${g.missing===1?'':'s'}</b><small>${g.progress}/${g.combos} de ≥33 pts para la siguiente</small><button class="immunity-use" data-action="practice-tool" data-tool="${g.id}" aria-label="Activar inmunidad de ${rounds}, ${g.count} disponibles" ${enabled?'':'disabled'}>${action}</button></article>`;
 }).join('')}</div><p class="immunity-explanation">Elige qué duración gastar. Protege de Borrar, Ficha contraria, Desplazar, Bloqueo y Ficha rival. Una ronda termina al completar el turno rival; Doble cuenta una, ampliar no cuenta. Las cartas ganadas se guardan aparte de las ocho de recarga.</p></section>`;
}
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
 const icons={combo:'<rect x="2" y="3" width="11" height="16" rx="2"/><rect x="19" y="13" width="11" height="16" rx="2"/><path d="M9 23h13m-4-4 4 4-4 4M22 3v6m-3-3h6"/>',double:'<rect x="3" y="6" width="16" height="20" rx="2"/><rect x="13" y="3" width="16" height="20" rx="2"/><path d="m18 9 6 8m0-8-6 8"/>',rival:'<path d="m3 5 8 8m0-8-8 8M15 9h13m-5-5 5 5-5 5"/><circle cx="23" cy="24" r="6"/>',opposite:'<path d="M5 11h20m-5-5 5 5-5 5M27 23H7m5-5-5 5 5 5"/><circle cx="7" cy="5" r="2"/>',erase:'<path d="m9 25-6-6 15-15 11 11-10 10H9Zm3-15 11 11M9 29h20"/>',shift:'<rect x="11" y="11" width="10" height="10" rx="2"/><path d="M16 2v7m-4-3 4-4 4 4M16 30v-7m-4 3 4 4 4-4M2 16h7m-3-4-4 4 4 4M30 16h-7m3-4 4 4-4 4"/>',block:'<rect x="6" y="14" width="20" height="15" rx="2"/><path d="M10 14V9a6 6 0 0 1 12 0v5M16 20v4"/>',shield:'<path d="M16 3 4 8v8c0 6 7 11 12 14 5-3 12-8 12-14V8L16 3Z"/><path d="m10 16 4 4 8-9"/>'};
 const svg=kind=>kind==='hint'?hintIcon:`<svg viewBox="0 0 32 32" aria-hidden="true">${icons[kind]}</svg>`;
 const cards=practiceTools.map(t=>{
   const allowance=local?toolAllowance(game,playerId):null;
   const count=local?(inv.cards[t.id]||0):1,enabled=local&&(t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id));
   return `<button class="inventory-card" data-action="${t.id==='hint'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="Usar ${t.label}, ${count} carta${count===1?'':'s'}" title="${t.description}" ${enabled?'':'disabled'}><span class="inventory-card-top"><span class="inventory-icon">${svg(t.id)}</span><span class="inventory-count">×${count}</span></span><strong>${t.label}</strong><small>${t.description}</small><span class="inventory-card-action">${state?.used.includes(t.id)?'Usada este turno':!count?'Agotada':local&&t.id==='combo'&&state.used.length?'Activar primero':local&&t.id!=='combo'&&!allowance.remaining?'Límite alcanzado':'Usar'}</span></button>`;
 }).join('');
 const total=Object.values(inv.cards).reduce((s,n)=>s+n,0),last=practiceTools.find(t=>t.id===inv.lastDraw)?.label;
 return `${immunityMarkup(game,playerId)}<p class="inventory-status">${local?`${game.mode==='solo'?`Máquina ${game.machineInventory?'con':'sin'} inventario · `:''}${total}/${MAX_CARDS} cartas de recarga · ${inv.turns>=REFILL_TURNS?'Recarga lista cuando haya hueco':`Recarga en ${REFILL_TURNS-inv.turns} turno${REFILL_TURNS-inv.turns===1?'':'s'} propio${REFILL_TURNS-inv.turns===1?'':'s'}`}`:'Catálogo de pruebas · VS máquina y Sin conexión'}${last?` · Última: ${last}`:''}</p><div class="inventory-cards">${cards}</div><p class="inventory-rules">Una herramienta por turno, incluida Inmunidad, además de tu ficha. Activa Combo primero para usar otras dos herramientas distintas. Combo se obtiene en la recarga. ${game?.timeMode==='untimed'?'Sin límite de tiempo.':'Las cartas no reinician el reloj.'} Nunca se restan puntos; las figuras ya cobradas no se pagan otra vez.</p>${local?'':game?'<p class="muted">El inventario online todavía está en preparación.</p>':'<div class="inventory-start"><button data-action="setup-solo">Practicar contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button><button data-action="hall-games">Abrir una partida guardada</button></div>'}`;
}
