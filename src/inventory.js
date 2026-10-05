import {machineChoice,localHumanId} from './local.js';
import {practiceTools,practiceTurn,canUsePracticeTool} from './practice-tools.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
export function canUsePracticeHint(game,playerId,now=Date.now()){
 const p=game?.pairs?.[0];
 return !!(game&&['solo','local'].includes(game.mode)&&game.status==='playing'&&p&&!p.pending&&p[p.turn.toLowerCase()]===playerId&&!(game.mode==='solo'&&playerId!==localHumanId(game))&&(game.timeMode==='untimed'||Date.parse(p.deadline)>now));
}
export function usePracticeHint(original,playerId,now=Date.now()){
 if(!canUsePracticeHint(original,playerId,now))throw new Error('La ayuda está disponible durante tu turno en una partida local.');
 const game=structuredClone(original),pair=game.pairs[0],state=practiceTurn(game,playerId);
 // Practice suggestions are immediate; Pro's deep Worker search must not
 // block the UI or use up the player's clock while opening a hint.
 const choice=machineChoice({...game,difficulty:'medium',pairs:[{...pair,turn:state.nextSymbol||pair.turn}]},()=>0);
 game.practiceHint={...choice.payload,player:playerId};
 const player=game.players.find(p=>p.id===playerId);player.practiceHints=(player.practiceHints||0)+1;
 game.version++;game.updatedAt=new Date(now).toISOString();
 return game;
}
export function inventoryMarkup(game,playerId){
 const local=game&&['solo','local'].includes(game.mode),canUse=canUsePracticeHint(game,playerId);
 const uses=game?.players?.find(p=>p.id===playerId)?.practiceHints||0;
 const icons={double:'<rect x="3" y="6" width="16" height="20" rx="2"/><rect x="13" y="3" width="16" height="20" rx="2"/><path d="m18 9 6 8m0-8-6 8"/>',opposite:'<path d="m3 5 8 8m0-8-8 8m19-9 5 5-5 5M17 9h10M10 28l-5-5 5-5m5 5H5"/><circle cx="24" cy="24" r="6"/>',erase:'<path d="m9 25-6-6 15-15 11 11-10 10H9Zm3-15 11 11M9 29h20"/>'};
 const svg=kind=>`<svg viewBox="0 0 32 32" aria-hidden="true">${icons[kind]}</svg>`;
 const state=local?practiceTurn(game,playerId):null;
 const tools=practiceTools.map(t=>`<article class="inventory-item"><div class="inventory-icon">${svg(t.id)}</div><div><h3 class="heading">${t.label}</h3><p>${t.description}</p></div><button class="primary" data-action="practice-tool" data-tool="${t.id}" ${canUsePracticeTool(game,playerId,t.id)?'':'disabled'}>${state?.used.includes(t.id)&&t.id!=='erase'?'Activado en este turno':t.button}</button></article>`).join('');
 return `<p>Inventario de pruebas · VS máquina y Sin conexión.</p><p class="muted">Sin coste durante las pruebas. Hasta dos herramientas por turno; Ayuda no cuenta para ese límite. El reloj sigue corriendo.${state?` ${state.used.length}/2 herramientas usadas en este turno.`:''}</p>${tools}<article class="inventory-item"><div class="inventory-icon">${hintIcon}</div><div><h3 class="heading">Ayuda</h3><p>Sugiere una celda para puntuar o frenar al rival. Resalta su punto; tú decides dónde jugar.</p><small>Sin coste ni límite${local?` · ${uses} uso${uses===1?'':'s'} en esta partida`:''}</small></div><button class="primary" data-action="practice-hint" ${canUse?'':'disabled'}>Sugerir jugada</button></article>${local?'<p class="muted">Usa las herramientas en tu turno, con la partida en marcha y sin una ampliación pendiente. Borrar conserva la puntuación; una figura ya cobrada no vuelve a sumar al reconstruirla.</p>':game?'<p class="muted">El inventario online todavía está en preparación.</p>':'<div class="inventory-start"><button data-action="setup-solo">Practicar contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button><button data-action="hall-games">Abrir una partida guardada</button></div>'}`;
}
