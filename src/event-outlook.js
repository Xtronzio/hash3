import {HABITAT_FREQUENCIES} from './habitat-budget.js';
import {faunaSuspended} from './ecology.js';
import {ecologySeconds} from './ecology-clock.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';

export function eventOutlook(game,playerId,now=game.clockNow??Date.now()){
 const rows=[],suspended=faunaSuspended(game,now)||(game.ecologyRecovery?.remainingMs??0)>0;
 for(const kind of ['rodent','worm','work']){
  const frequency=HABITAT_FREQUENCIES[kind];
  const upcoming=(game.habitatZones||[]).map(z=>Math.max(0,(z.next?.[kind]??frequency)-z.placements));
  rows.push({kind,enabled:game.faunaEnabled!==false,suspended,remaining:upcoming.length?Math.min(...upcoming):frequency,unit:'colocaciones en su zona',warning:kind==='rodent'?null:33});
 }
 const p=game.players.find(p=>p.id===playerId);
 if(p)rows.push({kind:'neutral',enabled:game.territoryEnabled!==false,suspended,remaining:33-(p.placements||0)%33,unit:'colocaciones propias',warning:null});
 const size=game.terrain?.length??0,milestone=game.territoryMilestone??Math.floor(size/333),target=(milestone+1)*333;
 rows.push({kind:'territory',enabled:game.territoryEnabled!==false,suspended:false,remaining:Math.max(0,target-size),target,unit:'casillas nuevas',warning:33});
 const timed=[...(game.territoryEvents||[]),...(game.worms||[]).map(e=>({...e,kind:'worm'})),...(game.works||[]).map(e=>({...e,kind:'work'})),...(game.bombs||[]).map(e=>({...e,kind:'bomb'}))].map(e=>({...e,seconds:ecologySeconds(e,now)}));
 const recovery=game.ecologyRecovery?{seconds:Math.max(0,Math.ceil((game.ecologyRecovery.remainingMs??(game.ecologyRecovery.until-now))/1000)),moves:game.ecologyRecovery.moves||0}:null;
 return {rows,timed,recovery};
}

// Prepared once per snapshot. Clock updates only touch the displayed digits.
export function ecologyWarningsMarkup(game,now=game.clockNow??Date.now()){
 const groups=new Map();
 const events=[...(game.worms||[]).map(e=>({...e,kind:'worm'})),...(game.works||[]).map(e=>({...e,kind:'build'})),...(game.bombs||[]).map(e=>({...e,kind:'bomb'})),...(game.territoryEvents||[])];
 for(const e of events){const prior=groups.get(e.kind);if(!prior||ecologySeconds(e,now)<ecologySeconds(prior,now))groups.set(e.kind,e);}
 const chips=[...groups.values()].map(e=>`<button data-action="events" class="ecology-warning-chip" aria-label="${e.kind==='build'?'Constructores y destructores':ecologyNames[e.kind]} · ${e.remainingMs!=null?'cuenta atrás detenida · ':''}próxima intervención en ${ecologySeconds(e,now)} segundos">${e.kind==='build'?ecologyIcon('build')+ecologyIcon('destroy'):ecologyIcon(e.kind)}<span class="ecology-clock mono" data-ecology-kind="${e.kind}" data-ecology-source="${e.id}">${ecologySeconds(e,now)}</span><small>s</small></button>`);
 const raids=game.rodentRaids||[];
 if(raids.length)chips.unshift(`<button data-action="events" class="ecology-warning-chip" aria-label="Roedores · ${Math.max(...raids.map(e=>e.remaining))} jugadas pendientes · sin cuenta atrás temporal">${ecologyIcon('rodent')}<span class="mono">${Math.max(...raids.map(e=>e.remaining))}</span><small>↷</small></button>`);
 return chips.length?`<nav class="ecology-warnings" aria-label="Habitantes y fenómenos anunciados">${chips.join('')}</nav>`:'';
}

export function eventOutlookMarkup(game,playerId){
 const {rows,timed,recovery}=eventOutlook(game,playerId);
 const icons=kind=>kind==='territory'?['rain','ufo','cataclysm'].map(ecologyIcon).join(''):kind==='work'?ecologyIcon('build')+ecologyIcon('destroy'):ecologyIcon(kind);
 const label=kind=>kind==='territory'?'Fenómeno territorial':kind==='work'?'Constructores y destructores':ecologyNames[kind];
 const live=timed.map(e=>`<li class="event-outlook-row"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${e.remainingMs!=null?'Cuenta atrás detenida':e.kind==='rodent'?'Por colocación':'Próxima intervención'}</small></span><b><small>En</small><span class="ecology-clock" data-ecology-kind="${e.kind==='work'?'build':e.kind}" data-ecology-source="${e.id}">${e.seconds}</span> s</b></li>`).join('');
 const raids=game.rodentRaids||[],rodents=raids.length?`<li class="event-outlook-row"><span class="event-outlook-icons">${ecologyIcon('rodent')}</span><span>Roedores<small>Una visita por habitante en cada colocación; sin espera de 33 s</small></span><b><small>Faltan</small>${Math.max(...raids.map(e=>e.remaining))}<small>jugadas de visitas</small></b></li>`:'';
 const upcoming=rows.map(e=>`<li class="event-outlook-row ${e.enabled?'':'is-disabled'}"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${!e.enabled?'Desactivado':e.suspended?'En espera hasta terminar el fenómeno y la recuperación':e.kind==='territory'?`Próximo umbral: ${e.target} casillas · después, aviso de 33 s`:e.warning?'Intento de aparición · después, intervención en 33 s':'Intento de aparición · actúa por colocaciones'}</small></span><b>${!e.enabled?'—':e.remaining===0&&e.kind==='territory'?'Próxima ampliación':`<small>Faltan</small>${e.remaining}<small>${e.unit}</small>`}</b></li>`).join('');
 return `${live||rodents?`<h3>Ya anunciados</h3><ul class="event-outlook-list">${rodents}${live}</ul>`:''}${recovery&&(recovery.seconds||recovery.moves)?`<p class="event-outlook-note">Recuperación: <span data-recovery-clock>${recovery.seconds}</span> s y ${recovery.moves} colocaciones pendientes. La fauna espera a que se cumplan ambos.</p>`:''}<h3>Próximas apariciones · lo que falta</h3><ul class="event-outlook-list">${upcoming}</ul><p class="event-outlook-note">Los intentos de fauna dependen del tamaño, la población y el alimento disponible. El fenómeno se elige al alcanzar el umbral. Roedores y # actúan por colocaciones; no tienen cuenta atrás de 33 segundos.</p>`;
}
