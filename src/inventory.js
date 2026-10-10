import {dianaCardMarkup,targetIcon} from './watch-targets.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {inventoryRows} from './inventory-layout.js';
import {localLiving} from './living-balance.js';
import {borderIcon,wallIcon} from './frontiers.js';
import {machineChoice,localHumanId} from './local.js';
import {availableCells,figureWindows} from './game.js';
import {practiceTools,practiceTurn,canUsePracticeTool,inventoryFor,initializeInventory,spendCard,placementSymbol,REFILL_TURNS,MAX_CARDS,toolStock,toolAllowance,pendingTools} from './practice-tools.js';
import {hallIcon} from './hall.js';
import {immunityFor,immunityStock,immunityProgress,immunityRemaining,immunitySeconds} from './immunity.js';
import {activeInventoryEffects} from './inventory-status.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
const toolIcons={target:targetIcon,swap:'<rect x="2" y="3" width="10" height="10" rx="1"/><rect x="20" y="19" width="10" height="10" rx="1"/><path d="M16 7h11v8m-4-4 4 4 4-4M16 25H5v-8m-4 4 4-4 4 4"/>',destroy:'<rect x="4" y="4" width="24" height="24" rx="2" stroke-dasharray="3 3"/><path d="M10 16h12"/>',activate:'<rect x="4" y="4" width="24" height="24" rx="2" stroke-dasharray="3 3"/><path d="M16 10v12m-6-6h12"/>',immunity:'<path d="m16 2 13 7v14l-13 7-13-7V9L16 2Z"/><rect x="9" y="9" width="14" height="14" rx="1"/><path d="M9 14h14M9 18h14m-9-9v14m4-14v14"/>',combo:'<rect x="2" y="3" width="11" height="16" rx="2"/><rect x="19" y="13" width="11" height="16" rx="2"/><path d="M9 23h13m-4-4 4 4-4 4M22 3v6m-3-3h6"/>',double:'<rect x="3" y="6" width="16" height="20" rx="2"/><rect x="13" y="3" width="16" height="20" rx="2"/><path d="m18 9 6 8m0-8-6 8"/>',rival:'<path d="m3 5 8 8m0-8-8 8M15 9h13m-5-5 5 5-5 5"/><circle cx="23" cy="24" r="6"/>',opposite:'<path d="M5 11h20m-5-5 5 5-5 5M27 23H7m5-5-5 5 5 5"/><circle cx="7" cy="5" r="2"/>',erase:'<path d="m9 25-6-6 15-15 11 11-10 10H9Zm3-15 11 11M9 29h20"/>',shift:'<rect x="11" y="11" width="10" height="10" rx="2"/><path d="M16 2v7m-4-3 4-4 4 4M16 30v-7m-4 3 4 4 4-4M2 16h7m-3-4-4 4 4 4M30 16h-7m3-4 4 4-4 4"/>',block:'<rect x="6" y="14" width="20" height="15" rx="2"/><path d="M10 14V9a6 6 0 0 1 12 0v5M16 20v4"/>',shield:'<path d="M16 3 4 8v8c0 6 7 11 12 14 5-3 12-8 12-14V8L16 3Z"/><path d="m10 16 4 4 8-9"/>'};
Object.assign(toolIcons,{
 tornado:'<path d="M3 5h26M6 10h20M9 15h14M12 20h9M15 25h7l-4 4"/>',
 bomb:'<circle cx="14" cy="20" r="9"/><path d="m19 12 3-5 4 2M23 5l2-3m3 5h3m-3-4 2-2M9 17a5 5 0 0 1 4-2"/>',
 border:borderIcon,
 frontier:wallIcon,
 'hint-expand':'<rect x="3" y="12" width="18" height="18" rx="2" stroke-dasharray="3 3"/><path d="M3 18h18M3 24h18M9 12v18M15 12v18M19 3h10v10m-10 0L29 3"/>',
 'super-hint':'<path d="M9 20c0-3-4-4-4-9a9 9 0 0 1 18 0c0 5-4 6-4 9M9 24h10m-9 4h8M26 15l2 4 3 1-3 2-2 4-1-4-4-2 4-1 1-4Z"/>'
});
for(const length of [1,2,3])toolIcons[length===1?'activate':'expand-'+length]=`<rect x="3" y="9" width="26" height="14" rx="1" stroke-dasharray="2 2"/>${Array.from({length:length-1},(_,i)=>`<path d="M${3+26*(i+1)/length} 9v14"/>`).join('')}<path d="M8 16h6m-3-3v6"/><text x="22" y="20" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="800">${length}</text>`;
export const toolIcon=kind=>kind==='hint'?hintIcon:`<svg viewBox="0 0 32 32" ${['frontier','border'].includes(kind)?'style="color:var(--frontier)"':''} aria-hidden="true">${toolIcons[kind]||''}</svg>`;

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
   refill.message=`Inmunidad disponible · +${protections} ${protections===1?'protección':'protecciones'} de 33 segundos${drawn>0?` · +${drawn} ${refill.tool}`:''}`;
 }
 return refill;
}
export function inventoryDockMarkup(game,playerId,{icon='',open=false,refill=null,choice=null,uses=null}={}){
 if(!inventoryEnabled(game,playerId))return '';
 const total=inventoryTotal(game,playerId),inv=inventoryFor(game,playerId),turns=REFILL_TURNS-inv.turns;
 const protectedNow=immunityRemaining(game,playerId)>0,team=game?.players?.find(p=>p.id===playerId)?.symbol==='O'?'o':'x';
 const selected=choice?.player===playerId&&practiceTools.some(t=>t.id===choice.tool),card=selected?practiceTools.find(t=>t.id===choice.tool):null;
 const delay=choice?Math.min(0,choice.at-(choice.now??choice.at)):0;
 const chosenLabel=card?`${card.label} · ${choice.prepared?'Preparada':'Usada'} · quedan ${toolStock(game,playerId,card.id)}`:'';
 const chosen=card?`<span class="dock-card-choice ${team} ${choice.prepared?'is-prepared':'dock-used-card'}" data-dock-card="${card.id}" role="img" aria-label="${chosenLabel}" title="${chosenLabel}" style="left:${protectedNow?29:0}px;--card-choice-delay:${delay}ms">${toolIcon(card.id)}<b>×${toolStock(game,playerId,card.id)}</b></span>`:'';
 const recorded=uses??game.players.flatMap(p=>(p.inventory?.turnUse?.tools||game.practiceTurn?.player===p.id&&game.practiceTurn.used||[]).map(tool=>({player:p.id,tool})));
 const lastUses=recorded.filter(u=>practiceTools.some(t=>t.id===u.tool)).map(u=>{
  const played=game.players.find(p=>p.id===u.player),tool=practiceTools.find(t=>t.id===u.tool);
  const team=played?.symbol==='O'?'o':'x',symbol=played?.symbol||'?';
  const label=symbol+' usó '+tool.label;
  return {symbol,tool:u.tool,markup:'<span class="dock-used-card '+team+'" title="'+label+'" aria-label="'+label+'"><b>'+symbol+'</b>'+toolIcon(u.tool)+'</span>'};
 });
 const side=symbol=>{
  const selectedHere=card&&team===symbol.toLowerCase();
  const used=lastUses.filter(u=>u.symbol===symbol&&!(selectedHere&&u.tool===card.id)).slice(-(selectedHere?1:2)).map(u=>u.markup);
  if(selectedHere)used.push(chosen);
  const slots=Array.from({length:2},(_,i)=>`<span class="dock-used-cell ${used[i]?'':'is-empty'}" ${used[i]?'':`aria-label="${symbol} · sin carta"`}>${used[i]||''}</span>`).join('');
  return `<span class="dock-used-cards ${symbol.toLowerCase()}" role="group" aria-label="Últimas cartas usadas por los colonos · ${symbol}">${slots}</span>`;
 };

 const protection=protectedNow?`<span class="dock-immunity-active ${team} ${choice?.player===playerId&&choice.tool==='immunity'?'is-newly-chosen':''}" style="--card-choice-delay:${delay}ms" role="img" aria-label="Inmunidad activa · 33 segundos" title="Inmunidad activa · 33 segundos de partida activa">${toolIcon('immunity')}<b data-immunity-clock="${playerId}">${immunitySeconds(game,playerId)}</b></span>`:'';
 const label=`Inventario · ${total} carta${total===1?'':'s'}${protectedNow?' · Inmunidad activa de 33 segundos':''}${chosenLabel?' · '+chosenLabel:''} · ${turns<=0?'Recarga lista cuando haya hueco':`Recarga en ${turns} turno${turns===1?'':'s'} propio${turns===1?'':'s'}`}`;
 const active=refill?.player===playerId;
 return `<div class="inventory-dock">${side('X')}<button class="inventory-dock-button ${active?'is-refilled':''}" data-action="inventory" aria-label="${label}" title="${label}" aria-expanded="${open}" aria-controls="inventory-panel"><span class="inventory-dock-icon ${protectedNow?'is-protected':''}" style="padding-left:${protectedNow?29:0}px">${icon}${protection}<span class="inventory-badge ${total?'':'is-empty'}" aria-hidden="true">${total}</span></span></button>${side('O')}</div>${active?`<span class="inventory-refill-toast" role="status" aria-live="polite" aria-atomic="true">${refill.message||`Inventario recargado · +${refill.added} ${refill.tool}`}</span>`:''}`;
}
export function immunityComboNotice(previous,next,playerId){
 if(!previous||previous.id!==next?.id||!['solo','local'].includes(next.mode))return null;
 const before=immunityFor(previous,playerId),after=immunityFor(next,playerId);
 if(after.combos<=before.combos)return null;
 const earned=after.earned>before.earned,goals=immunityProgress(next,playerId),added=earned?goals.filter(g=>after.lastEarned?.includes(g.id)).reduce((n,g)=>n+g.protections,0):0;
 return {player:playerId,message:added?`Combo de inmunidad · +${added} ${added===1?'protección':'protecciones'}`:`Combo de inmunidad · faltan ${goals[0].missing} para otra protección`};
}
export function immunityMarkup(){
 return `<section class="immunity-section inventory-immunity-guide" aria-labelledby="immunity-title"><h3 id="immunity-title"><span class="inventory-icon">${toolIcon('immunity')}</span>Inmunidad del territorio</h3><p class="immunity-explanation"><strong>Inmunidad protege todo tu territorio; Escudo protege una celda concreta con una ficha tuya.</strong> Inmunidad detiene Destruir celda, Borrar, Ficha contraria, Desplazar, Bloqueo y Ficha rival. También preserva las fichas frente a Tornado y Bomba, protege las barreras de su propietario. Los rivales siguen colocando sus fichas normalmente.</p><p class="immunity-explanation">Cada colocación manual que consigue 33 puntos o más cuenta como un combo, incluidos sus bonus. Las acciones de cartas, las colocaciones automáticas y los puntos ganados por el símbolo propio colocado por el rival no cuentan.</p><table class="immunity-guide-table"><thead><tr><th>Objetivo</th><th>Premio</th></tr></thead><tbody><tr><td>3 combos de ≥33 pts</td><td>1 protección</td></tr><tr><td>33 combos de ≥33 pts</td><td>3 protecciones</td></tr><tr><td>333 combos de ≥33 pts</td><td>33 protecciones</td></tr></tbody></table><p class="immunity-explanation">Los tres objetivos avanzan juntos y se repiten, sin antigüedad mínima. Todas las protecciones duran <strong>33 segundos</strong> y se suman a tu reserva. Se activan de una en una en cualquier momento, sin gastar turno ni herramienta. Ganar 33 entrega 33 unidades independientes. Solo se gasta la que activas; las demás quedan guardadas, sin activarse solas ni perder el progreso de los objetivos.</p><p class="immunity-explanation">Fauna y fenómenos siguen su curso, pero no afectan a tus fichas, sus celdas, las celdas vacías que construiste ni tus muros. Caduca a los 33 segundos de partida activa; un habitante que siga vivo puede afectarte después. Pausar congela el tiempo restante. No se pueden apilar activaciones. Las protecciones se conservan al guardar la partida y no ocupan el límite de tres unidades por carta.</p><p class="immunity-explanation">En el inventario de partida, el icono con <strong>×N</strong> muestra la reserva; al tocarlo activas una protección de 33 segundos. El contador pequeño muestra los segundos restantes. Fuera del inventario, el mismo icono aparece junto a la bolsa en rojo para X o verde para O, 33 segundos de partida activa. Los contadores <strong>+1, +3 y +33</strong> muestran los premios y <strong>−N</strong> los combos que faltan para cada uno. Cada combo válido da un aviso de avance; conseguir protecciones resalta la bolsa en el color del modo.</p></section>`;
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
   const ranked=availableCells(game,pair).map(point=>({point,points:figureWindows([...game.cells,{...point,symbol}],point.x,point.y,symbol,game.level,null,localLiving(game)).filter(f=>!game.forms.includes(f.id)).reduce((sum,f)=>sum+f.size,0)})).sort((a,b)=>b.points-a.points);
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
 const cardMarkup=t=>{
   const count=inv.cards[t.id]||0,enabled=t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id),status=t.id==='frontier'&&game.pairs[0]?.pending?(game.pairs[0]?.frontierUsed?'Usada en esta ampliación':!count?'Agotada':enabled?'Colocar muro antes del 3×3':'No disponible en esta ampliación'):state.used.includes(t.id)?'Usada este turno':!count?'Agotada':enabled?'Usar':'Sin protecciones disponibles o ya activa';
   return `<button class="inventory-card inventory-icon-card" data-action="${t.group==='help'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="${t.label}, ${count} carta${count===1?'':'s'}, ${status}" title="${t.label} · ${status}" ${enabled?'':'disabled'}><span class="inventory-icon">${toolIcon(t.id)}</span><span class="inventory-count">×${count}</span></button>`;
 };
 const cards=inventoryRows(id=>id==='target'?dianaCardMarkup(game,playerId):cardMarkup(practiceTools.find(t=>t.id===id)));
 const help=practiceTools.filter(t=>t.group==='help').map(cardMarkup).join('');
 const enabled=canUsePracticeTool(game,playerId,'immunity'),label=`Inmunidad de todo el territorio: ${stock} protecciones guardadas. ${active?'Protección activa de 33 segundos':enabled?'Activar 33 segundos':'Sin protecciones disponibles o ya activa'}`;
 return `${cards}<section class="inventory-immunity-bottom" aria-label="Inmunidad y progreso de los objetivos"><button class="inventory-card inventory-icon-card immunity-reserve ${active?'is-active':''}" data-immunity="immunity" data-action="practice-tool" data-tool="immunity" aria-label="${label}" title="${label}" ${enabled?'':'disabled'}><span class="inventory-icon">${toolIcon('immunity')}</span><span class="immunity-stock inventory-count">×${stock}</span>${active?`<span class="immunity-active-indicator" data-immunity-clock="${playerId}">${immunitySeconds(game,playerId)}</span>`:''}</button>${goals.map(g=>`<div class="immunity-compact-goal" data-immunity-goal="${g.id}" aria-label="Premio de ${g.protections} protecciones de 33 segundos. Faltan ${g.missing} combos de al menos 33 puntos" title="+${g.protections} protecciones · faltan ${g.missing} combos de ≥33 puntos"><span>+${g.protections}</span><b class="immunity-missing">−${g.missing}</b><progress max="${g.combos}" value="${g.progress}" aria-label="${g.progress} de ${g.combos} combos"></progress></div>`).join('')}</section>`;
}
export const inventoryShortcutsMarkup=()=>`<button data-action="setup-solo" aria-label="Practicar contra la máquina" title="Practicar contra la máquina">${hallIcon('robot')}</button><button data-action="setup-local" aria-label="Dos en este dispositivo" title="Dos en este dispositivo">${hallIcon('players')}</button><button data-action="hall-games" aria-label="Abrir una partida guardada" title="Abrir una partida guardada">${hallIcon('games')}</button>`;
export function inventoryMarkup(game,playerId,{showShortcuts=true}={}){
 const local=game&&['solo','local'].includes(game.mode),state=local?practiceTurn(game,playerId):null,inv=inventoryFor(game,playerId);
 if(local)return compactInventoryMarkup(game,playerId);
 const catalogCard=t=>{
   const allowance=local?toolAllowance(game,playerId):null;
   const count=local?(inv.cards[t.id]||0):1,enabled=local&&(t.id==='hint'?canUsePracticeHint(game,playerId):canUsePracticeTool(game,playerId,t.id));
   return `<${game?'button':'div'} class="inventory-card" ${game?'data-action':'data-catalog-tool'}="${t.id==='hint'?'practice-hint':'practice-tool'}" data-tool="${t.id}" aria-label="${game?'Usar ':''}${t.label}, ${count} carta${count===1?'':'s'}" title="${t.description}" ${game&&!enabled?'disabled':''}><span class="inventory-card-top"><span class="inventory-icon">${toolIcon(t.id)}</span><span class="inventory-count">×${count}</span></span><strong>${t.label}</strong><small>${t.description}</small><span class="inventory-card-action">${state?.used.includes(t.id)?'Usada este turno':!count?'Agotada':local&&t.id==='combo'&&state.used.length?'Activar primero':local&&t.id!=='combo'&&!allowance.remaining?'Límite alcanzado':game?'Usar':''}</span></${game?'button':'div'}>`;
 };
 const cards=inventoryRows(id=>id==='target'?dianaCardMarkup(game,playerId):catalogCard(practiceTools.find(t=>t.id===id)));
 const help=practiceTools.filter(t=>t.group==='help').map(catalogCard).join('');
 const total=Object.values(inv.cards).reduce((s,n)=>s+n,0),last=practiceTools.find(t=>t.id===inv.lastDraw)?.label;
 return `<p class="inventory-status">${local?`${game.mode==='solo'?`Máquina ${game.machineInventory?'con':'sin'} inventario · `:''}${total}/${MAX_CARDS} cartas de recarga · ${inv.turns>=REFILL_TURNS?'Recarga lista cuando haya hueco':`Recarga en ${REFILL_TURNS-inv.turns} turno${REFILL_TURNS-inv.turns===1?'':'s'} propio${REFILL_TURNS-inv.turns===1?'':'s'}`}`:'Catálogo de pruebas · VS máquina y Sin conexión'}${last?` · Última: ${last}`:''}</p><div class="inventory-cards inventory-catalog-rows">${cards}${pendingTools.map(t=>`<button class="inventory-card inventory-pending" disabled aria-label="${t.label}, pendiente"><span class="inventory-card-top"><span class="inventory-icon">${toolIcon(t.id)}</span></span><strong>${t.label}</strong><small>${t.description}</small><span class="inventory-card-action">Pendiente</span></button>`).join('')}</div>${immunityMarkup()}<p class="inventory-rules">Una herramienta por turno, además de tu ficha. Inmunidad se activa aparte en cualquier momento y dura 33 segundos. Activa Combo primero para usar otras dos herramientas distintas. Súper Ayuda gasta su propia carta y utiliza las herramientas permitidas; muestra los recursos antes de ejecutarlos. Ampliación inteligente también permite ampliar por estrategia desde 333 figuras cobradas entre ambos; en ese caso, la carta se gasta al colocar el 3×3. Muro se coloca durante tu turno, sin necesidad de ampliar; cuenta como herramienta y luego colocas tu ficha. Si te corresponde una ampliación pendiente, también puedes poner un muro antes del 3×3, una vez en esa fase. Cada recarga sortea una carta entre los tipos permitidos, también pudiendo repetir. Doble, Ficha contraria, Ficha rival, Borrar, Desplazar y Combo tienen triple peso en el sorteo para ofrecer más opciones de ataque. Conservas las ocho cartas iniciales y una recarga por turno propio manual completado: máximo 18 cartas normales, 12 tipos distintos a la vez y tres unidades por tipo. Puedes tener tipos agotados y otros con una, dos o tres unidades; no se completa todo el catálogo. Las protecciones no tienen límite ni ocupan la mochila. Las reservas antiguas que superen los límites se conservan, pero no reciben recargas hasta dejar hueco. Si la bolsa está llena, gasta una carta para dejar hueco. ${game?.timeMode==='untimed'?'Sin límite de tiempo.':'Las cartas no reinician el reloj.'} Nunca se restan puntos. Permutar intercambia dos fichas y puntúa las figuras nuevas de ambos símbolos al aterrizar. Tornado puntúa las figuras nuevas de X y O en la posición final, incluidos los bonus; una figura ya presente antes de la mezcla no se vuelve a pagar. Bomba no suma puntos. Las figuras rotas pueden reconstruirse y cobrarse con una colocación posterior.</p>${local?'':game?'<p class="muted">El inventario online todavía está en preparación.</p>':showShortcuts?`<nav class="inventory-start" aria-label="Accesos a partidas">${inventoryShortcutsMarkup()}</nav>`:''}`;
}

export function immunityActionsMarkup(game){
 if(!['solo','local'].includes(game.mode))return '';
 const players=(game.mode==='solo'?game.players.filter(p=>p.id===localHumanId(game)):game.players).filter(p=>inventoryEnabled(game,p.id));
 return players.map(p=>{const seconds=immunitySeconds(game,p.id),stock=immunityStock(game,p.id),label=`Inmunidad ${p.symbol} · ${seconds?seconds+' segundos restantes':stock+' guardadas · activar 33 segundos'}`;
 return `<button class="immunity-quick ${p.symbol.toLowerCase()} ${seconds?'is-active':''}" data-action="practice-tool" data-tool="immunity" data-player="${p.id}" aria-label="${label}" title="${label}" ${canUsePracticeTool(game,p.id,'immunity')?'':'disabled'}>${toolIcon('immunity')}<small ${seconds?`data-immunity-clock="${p.id}"`:''}>${seconds||'×'+stock}</small></button>`;}).join('');
}

export function inventoryStatusMarkup(game,{paused=false,playerId}={}){
 if(!['solo','local'].includes(game.mode))return '';
 const pair=game.pairs[0],actor=playerId|| (game.mode==='solo'?localHumanId(game):pair.pending?pair.expander:pair.turn==='X'?pair.x:pair.o);
 const player=game.players.find(p=>p.id===actor);if(!player||!inventoryEnabled(game,actor))return '';
 const effects=activeInventoryEffects(game),cards=inventoryFor(game,actor).cards;
 // Prepared only when a game snapshot renders; never during pan, zoom or clock ticks.
 const catalog=[...practiceTools];
 const shortcuts=inventoryRows(id=>{if(id==='target')return dianaCardMarkup(game,actor,{paused,shortcut:true});const t=catalog.find(t=>t.id===id);
  const stock=cards[t.id]||0,enabled=!paused&&stock>0&&canUsePracticeTool(game,actor,t.id);
  const label=`${t.label} · ${stock} carta${stock===1?'':'s'}${paused?' · pausado':enabled?' · usar ahora':t.id==='hint-expand'?' · al ampliar o desde 333 figuras':' · no disponible en este turno'}`;
  return `<button class="inventory-effect inventory-shortcut ${stock?'has-stock':'is-inactive'} ${enabled?'is-ready':''} ${player.symbol.toLowerCase()}" data-action="${t.group==='help'?'practice-hint':'practice-tool'}" data-tool="${t.id}" data-player="${actor}" aria-label="${label}" title="${label}" ${enabled?'':'disabled'}>${toolIcon(t.id)}<small>×${stock}</small></button>`;
 });
 const pending=effects.filter(e=>!['frontier','border'].includes(e.tool)&&(e.tool!=='immunity'||paused||game.mode==='solo'&&e.player!==actor)).map(e=>{
  const name=e.tool==='immunity'?'Inmunidad':practiceTools.find(t=>t.id===e.tool).label;
  const detail=e.remaining!=null?`${e.remaining} ${e.unit}`:'sugerencia pendiente';
  const label=`${name} · ${e.symbol} · ${detail}${paused?' · pausado':''}`;
  return `<span class="inventory-effect inventory-pending-effect is-active ${e.symbol.toLowerCase()}" data-inventory-effect="${e.tool}" data-effect-player="${e.player}" role="img" aria-label="${label}" title="${label}">${toolIcon(e.tool)}<small ${e.tool==='immunity'?`data-immunity-clock="${e.player}"`:''}>${e.remaining??'•'}</small></span>`;
 }).join('');
 return `<div class="inventory-effects-bar" role="group" aria-label="Accesos rápidos al inventario"><div class="inventory-shortcuts" role="group" aria-label="Cartas de ${player.symbol}">${shortcuts}</div><div class="inventory-active-effects" role="group" aria-label="Efectos en curso">${pending}</div></div>`;
}
