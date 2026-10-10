import {eventTurns} from './turn-ecology.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';
import {LIVING_FREQUENCIES,livingMinimum,livingAttempt} from './living-balance.js';
import {territoryPlacements,territoryFigures} from './territory-tools.js';
import {neutralFrequency} from './neutral.js';
import {faunaSuspended} from './ecology.js';
import {wormTurnsToMeal} from './worm-turns.js';
export function turnWarnings(game){
 return [...(game.territoryEvents||[]).map(e=>({...e,kind:e.kind})),
  ...(game.rodentRaids||[]).filter(e=>e.warningTurns!=null).map(e=>({...e,kind:e.scale==='large'?'rodent-plague':'rodent'})),
  ...(game.worms||[]).filter(e=>e.warningTurns!=null).map(e=>({...e,kind:e.scale==='large'?'worm-plague':'worm'})),
  ...(game.works||[]).flatMap(e=>[...(e.build?.slice(e.done||0).length?[{...e,kind:'build'}]:[]),...(e.destroy?.slice(e.done||0).length?[{...e,kind:'destroy'}]:[])]),...(game.bombs||[]).map(e=>({...e,kind:'bomb'}))];
}
export function turnOutlook(game,playerId){
 const suspended=faunaSuspended(game),rows=['rodent','worm','work'].map(kind=>({kind,enabled:game.faunaEnabled!==false,suspended,remaining:game.habitatZones?.length?Math.min(...game.habitatZones.map(z=>Math.max(0,(z.next?.[kind]??LIVING_FREQUENCIES[kind])-z.placements))):LIVING_FREQUENCIES[kind],unit:'colocaciones en su zona',seconds:null,warning:3}));
 const player=game.players.find(p=>p.id===playerId);
 if(player)rows.push({kind:'neutral',enabled:game.territoryEnabled!==false,remaining:neutralFrequency(game)-(player.placements||0)%neutralFrequency(game),unit:'colocaciones propias'});
 for(const [kind,family,field]of [['invaders','invaders','territoryNextInvasion'],['territory','natural','territoryNextPlacement']])rows.push({kind,enabled:game.territoryEnabled!==false,suspended:!!game.territoryEvents?.length,remaining:Math.max(0,(game[field]??territoryPlacements(game)+livingAttempt(game,family))-territoryPlacements(game)),unit:'colocaciones entre ambos',seconds:null,warning:3,requiresFigures:territoryFigures(game)<livingMinimum(game),figuresRemaining:Math.max(0,livingMinimum(game)-territoryFigures(game))});
 return {rows,timed:turnWarnings(game).map(e=>({...e,turns:eventTurns(e),seconds:null})),recovery:game.ecologyRecovery?{moves:game.ecologyRecovery.moves||0,seconds:0}:null};
}
const label=kind=>({work:'Ampliadores y soldados',territory:'Fenómenos locales y de gran escala',invaders:'Invasores'})[kind]||ecologyNames[kind];
const icons=kind=>kind==='work'?ecologyIcon('build')+ecologyIcon('destroy'):kind==='territory'?ecologyIcon('hurricane'):kind==='invaders'?ecologyIcon('invader-rain'):ecologyIcon(kind);
export function turnWarningsMarkup(game){
 const groups=new Map();
 for(const e of turnWarnings(game)){const prior=groups.get(e.kind);if(!prior||eventTurns(e)<eventTurns(prior))groups.set(e.kind,e);}
 return groups.size?`<nav class="ecology-warnings turn-warnings" aria-label="Avisos de eventos por turnos" aria-live="polite">${[...groups.values()].map(e=>`<button data-action="open-event-warning" data-kind="${e.kind}" class="ecology-warning-chip" aria-label="${label(e.kind)} en ${eventTurns(e)} turnos. Ver zona anunciada">${icons(e.kind)}<span>${label(e.kind)}</span><strong>${eventTurns(e)}↷</strong></button>`).join('')}</nav>`:'';
}
export function turnOutlookMarkup(game,playerId){
 const {rows,timed,recovery}=turnOutlook(game,playerId);
 const warnings=timed.map(e=>`<li class="event-outlook-row announced-event"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${['build','destroy'].includes(e.kind)?'Intervención anunciada':'Zona marcada en el territorio'}${faunaSuspended(game)&&!game.territoryEvents?.some(v=>v.id===e.id)?' · en espera durante fenómeno y recuperación':''}</small></span><b>${e.turns}<small>turnos</small></b><button data-action="focus-event-warning" data-kind="${e.kind}" data-id="${e.id}" aria-label="Ver ${label(e.kind)} en el territorio">↗</button></li>`).join('');
 const rodents=(game.rodentRaids||[]).filter(r=>r.warningTurns==null).map(r=>`<li class="event-outlook-row"><span class="event-outlook-icons">${icons(r.scale==='large'?'rodent-plague':'rodent')}</span><span>${r.scale==='large'?'Plaga de ratones':'Ratón'}<small>tres visitas en nueve turnos</small></span><b>${Math.max(0,3*(r.mealsLeft??3)-(r.turn||0)%3)}<small>turnos restantes</small></b></li>`).join('');
 const live=(game.worms||[]).filter(w=>w.warningTurns==null).map(w=>`<li class="event-outlook-row"><span class="event-outlook-icons">${icons('worm')}</span><span>Gusano<small>Rastro protegido de tres casillas</small></span><b>${wormTurnsToMeal(w)}<small>turnos hasta comer</small></b></li>`).join('');
 const upcoming=rows.map(e=>`<li class="event-outlook-row ${e.enabled?'':'is-disabled'}"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${!e.enabled?'Desactivado':e.suspended?'En espera':e.kind==='neutral'?'Aparición sin puntos':'Después del intento: tres turnos de preaviso'}</small></span><b>${!e.enabled?'—':'<small>Faltan</small>'+(e.requiresFigures?e.figuresRemaining:e.remaining)}<small>${e.requiresFigures?'figuras entre ambos':e.unit}</small></b></li>`).join('');
 return `${warnings?'<h3>Avisos · prepara tu estrategia</h3><ul class="event-outlook-list">'+warnings+'</ul>':''}${rodents||live?'<h3>Actividad en curso</h3><ul class="event-outlook-list">'+rodents+live+'</ul>':''}${recovery?.moves?`<p class="event-outlook-note">Recuperación: ${recovery.moves} turnos. Fauna y habitantes esperan.</p>`:''}<h3>Próximas apariciones</h3><ul class="event-outlook-list">${upcoming}</ul><p class="event-outlook-note">Cada turno completo de cualquiera de los dos colonos avanza un paso. Doble cuenta una vez. Cartas, ampliaciones, pausas y esperas no adelantan los eventos. Las frecuencias conservan sus contadores de colocaciones; no hay disparadores por tiempo.</p>`;
}
