import {machineChoice} from './local.js';
export const hintIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 21c0-3-4-5-4-10a10 10 0 0 1 20 0c0 5-4 7-4 10M11 25h10m-9 4h8M16 5v5m-5 4 5-4 5 4M16 10v11"/></svg>';
export function canUsePracticeHint(game,playerId,now=Date.now()){
 const p=game?.pairs?.[0];
 return !!(game&&['solo','local'].includes(game.mode)&&game.status==='playing'&&p&&!p.pending&&p[p.turn.toLowerCase()]===playerId&&!(game.mode==='solo'&&playerId===p.o)&&(game.timeMode==='untimed'||Date.parse(p.deadline)>now));
}
export function usePracticeHint(original,playerId,now=Date.now()){
 if(!canUsePracticeHint(original,playerId,now))throw new Error('La ayuda está disponible durante tu turno en una partida local.');
 const game=structuredClone(original),choice=machineChoice(game,()=>0);
 game.practiceHint={...choice.payload,player:playerId};
 const player=game.players.find(p=>p.id===playerId);player.practiceHints=(player.practiceHints||0)+1;
 game.version++;game.updatedAt=new Date(now).toISOString();
 return game;
}
export function inventoryMarkup(game,playerId){
 const local=game&&['solo','local'].includes(game.mode),canUse=canUsePracticeHint(game,playerId);
 const uses=game?.players?.find(p=>p.id===playerId)?.practiceHints||0;
 return `<p>Primer inventario de práctica · máquina y sin conexión.</p><article class="inventory-item"><div class="inventory-icon">${hintIcon}</div><div><h3 class="heading">Ayuda</h3><p>Sugiere una celda para puntuar o frenar al rival. Resalta su punto; tú decides dónde jugar.</p><small>Sin coste ni límite durante la práctica${local?` · ${uses} uso${uses===1?'':'s'} en esta partida`:''}</small></div><button class="primary" data-action="practice-hint" ${canUse?'':'disabled'}>Sugerir jugada</button></article>${local?`<p class="muted">${canUse?'La ayuda no coloca fichas ni cambia el turno.':'Disponible en tu turno, con la partida en marcha y sin una ampliación pendiente.'}</p>`:game?'<p class="muted">El inventario online todavía está en preparación.</p>':'<div class="inventory-start"><button data-action="setup-solo">Practicar contra la máquina</button><button data-action="setup-local">Dos en este dispositivo</button><button data-action="hall-games">Abrir una partida guardada</button></div>'}`;
}
