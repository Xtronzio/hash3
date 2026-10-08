import {faunaSuspended} from './ecology.js';
import {ecologySeconds} from './ecology-clock.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';

export function eventOutlook(game,playerId,now=game.clockNow??Date.now()){
 const rows=[],suspended=faunaSuspended(game,now)||(game.ecologyRecovery?.remainingMs??0)>0;
 for(const [kind,frequency] of Object.entries({rodent:33,worm:99,work:198})){
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

export function eventOutlookMarkup(game,playerId){
 const {rows,timed,recovery}=eventOutlook(game,playerId);
 const icons=kind=>kind==='territory'?['rain','ufo','cataclysm'].map(ecologyIcon).join(''):kind==='work'?ecologyIcon('build')+ecologyIcon('destroy'):ecologyIcon(kind);
 const label=kind=>kind==='territory'?'Fenómeno territorial':kind==='work'?'Constructores y destructores':ecologyNames[kind];
 const live=timed.map(e=>`<li class="event-outlook-row"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${e.remainingMs!=null?'Cuenta atrás detenida':e.kind==='rodent'?'Por colocación':'Próxima intervención'}</small></span><b><span class="ecology-clock" data-ecology-kind="${e.kind==='work'?'build':e.kind}" data-ecology-source="${e.id}">${e.seconds}</span> s</b></li>`).join('');
 const upcoming=rows.map(e=>`<li class="event-outlook-row ${e.enabled?'':'is-disabled'}"><span class="event-outlook-icons">${icons(e.kind)}</span><span>${label(e.kind)}<small>${!e.enabled?'Desactivado':e.suspended?'En espera hasta terminar el fenómeno y la recuperación':e.kind==='territory'?`Próximo umbral: ${e.target} casillas · después, aviso de 33 s`:e.warning?'Intento de aparición · después, intervención en 33 s':'Intento de aparición · actúa por colocaciones'}</small></span><b>${!e.enabled?'—':e.remaining===0&&e.kind==='territory'?'Próxima ampliación':`${e.remaining}<small>${e.unit}</small>`}</b></li>`).join('');
 return `${live?`<h3>Ya anunciados</h3><ul class="event-outlook-list">${live}</ul>`:''}${recovery&&(recovery.seconds||recovery.moves)?`<p class="event-outlook-note">Recuperación: <span data-recovery-clock>${recovery.seconds}</span> s y ${recovery.moves} colocaciones pendientes. La fauna espera a que se cumplan ambos.</p>`:''}<h3>Próximas apariciones</h3><ul class="event-outlook-list">${upcoming}</ul><p class="event-outlook-note">Los intentos de fauna dependen del tamaño, la población y el alimento disponible. El fenómeno se elige al alcanzar el umbral. Roedores y # actúan por colocaciones; no tienen cuenta atrás de 33 segundos.</p>`;
}
