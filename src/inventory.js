import {machineChoice,localHumanId} from './local.js';
import {availableCells,figureWindows} from './game.js';
import {practiceTools,practiceTurn,canUsePracticeTool,inventoryFor,initializeInventory,spendCard,placementSymbol,REFILL_TURNS,MAX_CARDS,toolAllowance} from './practice-tools.js';
import {immunityFor,immunityStock,immunityProgress,immunityRemaining} from './immunity.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
const toolIcons={activate:'<rect x="4" y="4" width="24" height="24" rx="2" stroke-dasharray="3 3"/><path d="M16 10v12m-6-6h12"/>',immunity:'<path d="m16 2 13 7v14l-13 7-13-7V9L16 2Z"/><rect x="9" y="9" width="14" height="14" rx="1"/><path d="M9 14h14M9 18h14m-9-9v14m4-14v14"/>',combo:'<rect x="2" y="3" width="11" height="16" rx="2"/><rect x="19" y="13" width="11" height="16" rx="2"/><path d="M9 23h13m-4-4 4 4-4 4M22 3v6m-3-3h6"/>',double:'<rect x="3" y="6" width="16" height="20" rx="2"/><rect x="13" y="3" width="16" height="20" rx="2"/><path d="m18 9 6 8m0-8-6 8"/>',rival:'<path d="m3 5 8 8m0-8-8 8M15 9h13m-5-5 5 5-5 5"/><circle cx="23" cy="24" r="6"/>',opposite:'<path d="M5 11h20m-5-5 5 5-5 5M27 23H7m5-5-5 5 5 5"/><circle cx="7" cy="5" r="2"/>',erase:'<path d="m9 25-6-6 15-15 11 11-10 10H9Zm3-15 11 11M9 29h20"/>',shift:'<rect x="11" y="11" width="10" height="10" rx="2"/><path d="M16 2v7m-4-3 4-4 4 4M16 30v-7m-4 3 4 4 4-4M2 16h7m-3-4-4 4 4 4M30 16h-7m3-4 4 4-4 4"/>',block:'<rect x="6" y="14" width="20" height="15" rx="2"/><path d="M10 14V9a6 6 0 0 1 12 0v5M16 20v4"/>',shield:'<path d="M16 3 4 8v8c0 6 7 11 12 14 5-3 12-8 12-14V8L16 3Z"/><path d="m10 16 4 4 8-9"/>'};
export const toolIcon=kind=>kind==='hint'?hintIcon:`<svg viewBox="0 0 32 32" aria-hidden="true">${toolIcons[kind]}</svg>`;

export function inventoryTotal(game,playerId){
 return Object.values(inventoryFor(game,playerId).cards).reduce((sum,count)=>sum+count,0)+immunityStock(game,playerId);
}
export function inventoryRefill(previous,next,playerId){
 if(!previous||previous.id!==next?.id||!['solo','local'].includes(next.mode))return null;
 const before=inventoryFor(previous,playerId),after=inventoryFor(next,playerId);
 const drawn=(after.draws||0)-(before.draws||0),merit=immunityFor(next,playerId),earned=(merit.earned||0)-(immunityFor(previous,playerId).earned||0);
 const rewards=earned>0?immunityProgress(next,playerId).filter(g=>merit.lastEarned?.includes(g.id)):[],protections=rewards.reduce((n,g)=>n+g.protections,0),added=drawn+protections;
 if(added<=0)return null;
 const refill={player:playerId,added,tool:practiceTools.find(t=>t.id===after.lastDraw)?.label||'Carta',total:inventoryTotal(next,playerId)};
 if(earned>0){
   refill.message=`Inmunidad disponible · +${protections} ${protections===1?'protección':'protecciones'} de 1 ronda${drawn>0?` · +${drawn} ${refill.tool}`:''}`;
 }
 return refill;
}
export function inventoryDockMarkup(game,playerId,{icon='',open=false,refill=null}={}){
 const total=inventoryTotal(game,playerId),inv=inventoryFor(game,playerId),turns=REFILL_TURNS-inv.turns;
 const protectedNow=immunityRemaining(game,playerId)>0,team=game?.players?.find(p=>p.id===playerId)?.symbol==='O'?'o':'x';
 const protection=protectedNow?`<span class="dock-immunity-active ${team}" role="img" aria-label="Inmunidad activa · 1 ronda" title="Inmunidad activa · hasta completar el turno rival">${toolIcon('immunity')}</span>`:'';
 const label=`Inventario · ${total} carta${total===1?'':'s'}${protectedNow?' · Inmunidad activa de 1 ronda':''} · ${turns<=0?'Recarga lista cuando haya hueco':`Recarga en ${turns} turno${turns===1?'':'s'} propio${turns===1?'':'s'}`}`;
 const active=refill?.player===playerId;
 return `<button class="inventory-dock-button ${active?'is-refilled':''}" data-action="inventory" aria-label="${label}" title="${label}" aria-expanded="${open}" aria-controls="inventory-panel"><span class="inventory-dock-icon ${protectedNow?'is-protected':''}">${icon}${protection}<span class="inventory-badge ${total?'':'is-empty'}" aria-hidden="true">${total}</span></span></button>${active?`<span class="inventory-refill-toast" role="status" aria-live="polite" aria-atomic="true">${refill.message||`Inventario recargado · +${refill.added} ${refill.tool}`}</span>`:''}`;
}
export function immunityComboNotice(previous,next,playerId){
 if(!previous||previous.id!==next?.id||!['solo','local'].includes(next.mode))return null;
 const before=immunityFor(previous,playerId),after=immunityFor(next,playerId);
 if(after.combos<=before.combos)return null;
 const earned=after.earned>before.earned,goals=immunityProgress(next,playerId),added=earned?goals.filter(g=>after.lastEarned?.includes(g.id)).reduce((n,g)=>n+g.protections,0):0;
 return {player:playerId,message:added?`Combo de inmunidad · +${added} ${added===1?'protección':'protecciones'}`:`Combo de inmunidad · faltan ${goals[0].missing} para otra protección`};
}
export function immunityMarkup(){
 return `<section class="immunity-section inventory-immunity-guide" aria-labelledby="immunity-title"><h3 id="immunity-title"><span class="inventory-icon">${toolIcon('immunity')}</span>Inmunidad del territorio</h3><p class="immunity-explanation"><strong>Inmunidad protege todo tu territorio; Escudo protege una celda concreta con una ficha tuya.</strong> Inmunidad detiene Borrar, Ficha contraria, Desplazar, Bloqueo y Ficha rival. Los rivales siguen colocando sus fichas normalmente.</p><p class="immunity-explanation">Cada colocación manual que consigue 33 puntos o más cuenta como un combo, incluidos sus bonus. Las acciones de cartas, las colocaciones automáticas y los puntos ganados por el símbolo propio colocado por el rival no cuentan.</p><table class="immunity-guide-table"><thead><tr><th>Objetivo</th><th>Premio</th></tr></thead><tbody><tr><td>3 combos de ≥33 pts</td><td>1 protección</td></tr><tr><td>33 combos de ≥33 pts</td><td>3 protecciones</td></tr><tr><td>333 combos de ≥33 pts</td><td>33 protecciones</td></tr></tbody></table><p class="immunity-explanation">Los tres objetivos avanzan juntos y se repiten, sin antigüedad mínima. Todas las protecciones duran <strong>una ronda</strong> y se suman a tu reserva. Se activan de una en una durante tu turno, dentro del límite de herramientas. Ganar 33 entrega 33 unidades independientes. Solo se gasta la que activas; las demás quedan guardadas, sin activarse solas ni perder el progreso de los objetivos.</p><p class="immunity-explanation">La protección activa termina al completar el turno rival, aunque no te ataque. Doble cuenta un turno; ampliar y pausar no descuentan. No se pueden apilar activaciones. Las protecciones se conservan al guardar la partida y no ocupan el máximo de ocho cartas de recarga.</p><p class="immunity-explanation">En el inventario de partida, el icono con <strong>×N</strong> muestra la reserva; al tocarlo activas una protección de una ronda. El indicador <strong>1</strong> señala que está activa. Fuera del inventario, el mismo icono aparece junto a la bolsa en rojo para X o verde para O, hasta completar el turno rival. Los contadores <strong>+1, +3 y +33</strong> muestran los premios y <strong>−N</strong> los combos que faltan para cada uno. Cada combo válido da un aviso de avance; conseguir protecciones resalta la bolsa en el color del modo.</p></section>`;
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
export function compactInventoryMarkup(game,playerId){
 const inv=inventoryFor(game,playerId),state=practiceTurn(game,playerId),stock=immunityStock(game,playerId),active=immunityRemaining(game,playerId),goals=immunityProgress(game,playerId);
 const cards=practiceTools.map(t=>{
   const count=inv.cards[t.id]||0,enabled=t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id),status=state.used.includes(t.id)?'Usada este turno':!count?'Agotada':enabled?'Usar':'No disponible en este turno';
   return `<button class="inventory-card inventory-icon-card" data-action="${t.id==='hint'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="${t.label}, ${count} carta${count===1?'':'s'}, ${status}" title="${t.label} · ${status}" ${enabled?'':'disabled'}><span class="inventory-icon">${toolIcon(t.id)}</span><span class="inventory-count">×${count}</span></button>`;
 }).join('');
 const enabled=canUsePracticeTool(game,playerId,'immunity'),label=`Inmunidad de todo el territorio: ${stock} protecciones guardadas. ${active?'Protección activa de 1 ronda':enabled?'Activar 1 ronda':'No disponible en este turno'}`;
 return `<div class="inventory-cards inventory-compact-grid">${cards}</div><section class="inventory-immunity-bottom" aria-label="Inmunidad y progreso de los objetivos"><button class="inventory-card inventory-icon-card immunity-reserve ${active?'is-active':''}" data-immunity="immunity" data-action="practice-tool" data-tool="immunity" aria-label="${label}" title="${label}" ${enabled?'':'disabled'}><span class="inventory-icon">${toolIcon('immunity')}</span><span class="immunity-stock inventory-count">×${stock}</span>${active?'<span class="immunity-active-indicator" aria-label="1 ronda activa">1</span>':''}</button>${goals.map(g=>`<div class="immunity-compact-goal" data-immunity-goal="${g.id}" aria-label="Premio de ${g.protections} protecciones de una ronda. Faltan ${g.missing} combos de al menos 33 puntos" title="+${g.protections} protecciones · faltan ${g.missing} combos de ≥33 puntos"><span>+${g.protections}</span><b class="immunity-missing">−${g.missing}</b><progress max="${g.combos}" value="${g.progress}" aria-label="${g.progress} de ${g.combos} combos"></progress></div>`).join('')}</section>`;
}
export function inventoryMarkup(game,playerId){
 const local=game&&['solo','local'].includes(game.mode),state=local?practiceTurn(game,playerId):null,inv=inventoryFor(game,playerId);
 if(local)return compactInventoryMarkup(game,playerId);
 const cards=practiceTools.map(t=>{
   const allowance=local?toolAllowance(game,playerId):null;
   const count=local?(inv.cards[t.id]||0):1,enabled=local&&(t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id));
   return `<button class="inventory-card" data-action="${t.id==='hint'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="Usar ${t.label}, ${count} carta${count===1?'':'s'}" title="${t.description}" ${enabled?'':'disabled'}><span class="inventory-card-top"><span class="inventory-icon">${toolIcon(t.id)}</span><span class="inventory-count">×${count}</span></span><strong>${t.label}</strong><small>${t.description}</small><span class="inventory-card-action">${state?.used.includes(t.id)?'Usada este turno':!count?'Agotada':local&&t.id==='combo'&&state.used.length?'Activar primero':local&&t.id!=='combo'&&!allowance.remaining?'Límite alcanzado':'Usar'}</span></button>`;
 }).join('');
 const total=Object.values(inv.cards).reduce((s,n)=>s+n,0),last=practiceTools.find(t=>t.id===inv.lastDraw)?.label;
 return `<p class="inventory-status">${local?`${game.mode==='solo'?`Máquina ${game.machineInventory?'con':'sin'} inventario · `:''}${total}/${MAX_CARDS} cartas de recarga · ${inv.turns>=REFILL_TURNS?'Recarga lista cuando haya hueco':`Recarga en ${REFILL_TURNS-inv.turns} turno${REFILL_TURNS-inv.turns===1?'':'s'} propio${REFILL_TURNS-inv.turns===1?'':'s'}`}`:'Catálogo de pruebas · VS máquina y Sin conexión'}${last?` · Última: ${last}`:''}</p><div class="inventory-cards">${cards}</div>${immunityMarkup()}<p class="inventory-rules">Una herramienta por turno, incluida Inmunidad, además de tu ficha. Activa Combo primero para usar otras dos herramientas distintas. Combo se obtiene en la recarga. ${game?.timeMode==='untimed'?'Sin límite de tiempo.':'Las cartas no reinician el reloj.'} Nunca se restan puntos; las figuras ya cobradas no se pagan otra vez.</p>${local?'':game?'<p class="muted">El inventario online todavía está en preparación.</p>':'<div class="inventory-start"><button data-action="setup-solo">Practicar contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button><button data-action="hall-games">Abrir una partida guardada</button></div>'}`;
}
