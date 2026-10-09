import {neutralFrequency} from './neutral.js';
import {isTurnWorm,wormTurnsToMeal} from './worm-turns.js';
import {localLiving,LIVING_FREQUENCIES,livingMinimum,livingAttempt,livingFirstClock} from './living-balance.js';
import {rodentTurnsRemaining} from './habitat-tools.js';
import {HABITAT_FREQUENCIES} from './habitat-budget.js';
import {territoryPlacements,territoryFigures,territoryReady} from './territory-tools.js';
import {territoryAttemptInterval} from './territory-event-rules.js';
import {faunaSuspended} from './ecology.js';
import {ecologySeconds} from './ecology-clock.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';

export function eventOutlook(game,playerId,now=game.clockNow??Date.now()){
 const rows=[],suspended=faunaSuspended(game,now)||(game.ecologyRecovery?.remainingMs??0)>0;
 for(const kind of ['rodent','worm','work']){
  const frequency=(localLiving(game)?LIVING_FREQUENCIES:HABITAT_FREQUENCIES)[kind];
  const upcoming=(game.habitatZones||[]).map(z=>Math.max(0,(z.next?.[kind]??frequency)-z.placements));
  rows.push({kind,enabled:game.faunaEnabled!==false,suspended,remaining:upcoming.length?Math.min(...upcoming):frequency,unit:'colocaciones en su zona',clockKind:kind,seconds:localLiving(game)&&game.habitatZones?.length?Math.min(...game.habitatZones.map(z=>Math.max(0,Math.ceil((z.clockRemaining?.[kind]??((z.clockNext?.[kind]??now)-now))/1000)))):null,warning:['rodent','worm'].includes(kind)?null:33});
 }
 const p=game.players.find(p=>p.id===playerId);
 if(p)rows.push({kind:'neutral',enabled:game.territoryEnabled!==false,suspended,remaining:neutralFrequency(game)-(p.placements||0)%neutralFrequency(game),unit:'colocaciones propias',warning:null});
 for(const [kind,family,field] of [['territory','natural','territoryNextPlacement'],['invaders','invaders','territoryNextInvasion']])
  rows.push({kind,trigger:'placements',enabled:game.territoryEnabled!==false,suspended:suspended||!!game.territoryEvents?.length,remaining:Math.max(0,(game[field]??territoryPlacements(game)+(livingAttempt(game,family)??territoryAttemptInterval(game.terrain?.length||0,family)))-territoryPlacements(game)),unit:'colocaciones entre ambos',clockKind:kind,seconds:localLiving(game)?Math.max(0,Math.ceil((game[(family==='invaders'?'territoryNextInvaderAt':'territoryNextNaturalAt')+'Remaining']??((game[family==='invaders'?'territoryNextInvaderAt':'territoryNextNaturalAt']??now+livingFirstClock(game,family))-now))/1000)):null,warning:33,requiresSize:false,requiresFigures:!territoryReady(game),figuresRemaining:Math.max(0,livingMinimum(game)-territoryFigures(game))});
 const timed=[...(game.territoryEvents||[]),...(game.worms||[]).filter(w=>!isTurnWorm(w)).map(e=>({...e,kind:'worm'})),...(game.works||[]).map(e=>({...e,kind:'work'})),...(game.bombs||[]).map(e=>({...e,kind:'bomb'}))].map(e=>({...e,seconds:ecologySeconds(e,now)}));
 const recovery=game.ecologyRecovery?{seconds:Math.max(0,Math.ceil((game.ecologyRecovery.remainingMs??(game.ecologyRecovery.until-now))/1000)),moves:game.ecologyRecovery.moves||0}:null;
 return {rows,timed,recovery};
}

// Prepared once per snapshot. Clock updates only touch the displayed digits.
export function ecologyWarningsMarkup(game,now=game.clockNow??Date.now()){
 const groups=new Map();
 const events=[...(game.worms||[]).filter(w=>!isTurnWorm(w)).map(e=>({...e,kind:'worm'})),...(game.works||[]).map(e=>({...e,kind:'build'})),...(game.bombs||[]).map(e=>({...e,kind:'bomb'})),...(game.territoryEvents||[])];
 for(const e of events){const prior=groups.get(e.kind);if(!prior||ecologySeconds(e,now)<ecologySeconds(prior,now))groups.set(e.kind,e);}
 const chips=[...groups.values()].map(e=>`<button data-action="events" class="ecology-warning-chip" aria-label="${e.kind==='build'?'Constructores y reconquistadores':ecologyNames[e.kind]} · ${e.remainingMs!=null?'cuenta atrás detenida · ':''}próxima intervención en ${ecologySeconds(e,now)} segundos">${e.kind==='build'?ecologyIcon('build')+ecologyIcon('destroy'):ecologyIcon(e.kind)}<span class="ecology-clock mono" data-ecology-kind="${e.kind}" data-ecology-source="${e.id}">${ecologySeconds(e,now)}</span><small>s</small></button>`);
 const turnWorms=(game.worms||[]).filter(isTurnWorm);
 if(turnWorms.length)chips.unshift(`<button data-action="events" class="ecology-warning-chip" aria-label="Gusanos: próxima comida en ${Math.min(...turnWorms.map(wormTurnsToMeal))} turnos">${ecologyIcon('worm')}</button>`);
 const raids=game.rodentRaids||[];
 if(raids.length)chips.unshift(`<button data-action="events" class="ecology-warning-chip" aria-label="Roedores · ${Math.max(...raids.map(rodentTurnsRemaining))} turnos pendientes · sin cuenta atrás temporal">${ecologyIcon('rodent')}<span class="mono">${Math.max(...raids.map(rodentTurnsRemaining))}</span><small>↷</small></button>`);
 return chips.length?`<nav class="ecology-warnings" aria-label="Habitantes y fenómenos anunciados">${chips.join('')}</nav>`:'';
}

export function eventOutlookMarkup(game,playerId){
 const {rows,timed,recovery}=eventOutlook(game,playerId);
 const icons=kind=>kind==='invaders'?['invader-rain','invader-colony'].map(ecologyIcon).join(''):kind==='territory'?['meteorites','ufo','blackhole'].map(ecologyIcon).join(''):kind==='work'?ecologyIcon('build')+ecologyIcon('destroy'):ecologyIcon(kind);
 const label=kind=>kind==='invaders'?'Invasores':kind==='territory'?'Fenómenos naturales y estelares':kind==='work'?'Constructores y reconquistadores':ecologyNames[kind];
 const live=timed.map(e=>`<li class="event-outlook-row"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${e.remainingMs!=null?'Cuenta atrás detenida':e.kind==='rodent'?'Por colocación':'Próxima intervención'}</small></span><b><small>En</small><span class="ecology-clock" data-ecology-kind="${e.kind==='work'?'build':e.kind}" data-ecology-source="${e.id}">${e.seconds}</span> s</b></li>`).join('');
 const raids=game.rodentRaids||[],rodents=raids.length?`<li class="event-outlook-row"><span class="event-outlook-icons">${ecologyIcon('rodent')}</span><span>Roedores<small>Aparecen, comen y se ocultan: tres visitas en nueve turnos; sin reloj</small></span><b><small>Faltan</small>${Math.max(...raids.map(rodentTurnsRemaining))}<small>turnos restantes</small></b></li>`:'';
 const turns=(game.worms||[]).filter(isTurnWorm).map(w=>`<li class="event-outlook-row"><span class="event-outlook-icons">${ecologyIcon('worm')}</span><span>Gusano<small>Una comida cada tres turnos; rastro protegido de tres casillas</small></span><b>${wormTurnsToMeal(w)}<small>turnos hasta comer</small></b></li>`).join('')+(game.invasions||[]).map(c=>`<li class="event-outlook-row"><span class="event-outlook-icons">${ecologyIcon(c.kind)}</span><span>Invasión en crecimiento<small>Una casilla por turno, según el terreno disponible</small></span><b>↗<small>marco discontinuo</small></b></li>`).join('');
 const upcoming=rows.map(e=>`<li class="event-outlook-row ${e.enabled?'':'is-disabled'}"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${!e.enabled?'Desactivado':e.suspended?'En espera hasta terminar el fenómeno y la recuperación':e.trigger==='placements'?(e.requiresFigures?'Disponible desde '+livingMinimum(game)+' figuras entre ambos · después, aviso de 33 s':'Ciclo de actividad independiente · después, aviso de 33 s'):e.warning?'Intento de aparición · después, intervención en 33 s':'Intento de aparición · actúa por colocaciones'}</small></span><b>${!e.enabled?'—':e.requiresFigures?`<small>Faltan</small>${e.figuresRemaining}<small>figuras entre ambos</small>`:e.remaining===0&&e.trigger==='placements'?'Próxima colocación':`<small>Faltan</small>${e.remaining}<small>${e.unit}</small>${e.seconds!=null?`<small>o en <span data-appearance-clock="${e.clockKind}">${e.seconds}</span> s activos</small>`:''}`}</b></li>`).join('');
 return `${live||rodents||turns?`<h3>Ya anunciados</h3><ul class="event-outlook-list">${rodents}${turns}${live}</ul>`:''}${recovery&&(recovery.seconds||recovery.moves)?`<p class="event-outlook-note">Recuperación: <span data-recovery-clock>${recovery.seconds}</span> s y ${recovery.moves} colocaciones pendientes. La fauna espera a que se cumplan ambos.</p>`:''}<h3>Próximas apariciones · lo que falta</h3><ul class="event-outlook-list">${upcoming}</ul><p class="event-outlook-note">Los intentos temporales se comprueban al colocar: se cumple primero el contador o el tiempo activo. Los intentos de fauna dependen del tamaño, la población y el alimento disponible. Invasores y fenómenos tienen ciclos separados. Las invasiones no detienen la fauna; ampliar no adelanta fenómenos. Roedores, gusanos e invasores crecen por turnos; # aparece por colocaciones. Los gusanos nuevos comen 3, 6 y 9 casillas según su aparición; desde la tercera se mantienen en 9 y solo protegen las últimas 3.</p>`;
}
