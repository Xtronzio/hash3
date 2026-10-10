import {ecologyIcon,ecologyColors} from './ecology-navigation.js';
import {territoryIcons} from './territory-tools.js';
import {eventLabel,eventRule} from './territory-event-rules.js';
export function ecologyChoicesMarkup(settings,inventoryIcon){
 const group=kinds=>`<span class="ecology-choice-icons ${kinds.length>4?'all-phenomena':''}" aria-hidden="true">${kinds.map(kind=>`<span data-ecology-kind="${kind}" style="--ecology-color:${ecologyColors[kind]||'var(--yellow)'}">${ecologyIcon(kind)}</span>`).join('')}</span>`;
 const choice=(id,label,icon,checked,disabled=false)=>`<label class="ecology-choice" for="${id}" title="${label}${disabled?' · solo contra la máquina':''}">${icon}${id==='player-inventory'?`<span class="inventory-setting-label">${settings.machine?'Tú':'X/O'}</span>`:id==='machine-inventory'?'<span class="inventory-setting-label">IA</span>':''}<input id="${id}" type="checkbox" aria-label="${label}" ${checked?'checked':''} ${disabled?'disabled':''}></label>`;
 return `<fieldset class="ecology-choices" aria-label="Complejidad de la partida">${choice('player-inventory',settings.machine?'Tu inventario':'Inventario de los jugadores',inventoryIcon,settings.playerInventory!==false)}${choice('machine-inventory','Inventario rival',inventoryIcon,settings.machineInventory,!settings.machine)}${choice('fauna-enabled','Fauna y habitantes: roedores, gusanos, ampliadores y soldados',group(['rodent','worm','build','destroy']),settings.faunaEnabled)}${choice('territory-enabled','Invasores y fenómenos naturales y estelares',group(['invader-rain','invader-colony','meteorites','earthquake','pandemic','ufo','tornado-rain','hurricane','blackhole']),settings.territoryEnabled)}</fieldset>`;
}
export function territoryWarningMarkup(room,now=Date.now()){
 return (room.territoryEvents||[]).map(e=>{
  const label=eventLabel(e.kind),seconds=e.turnsRemaining??Math.max(0,Math.ceil((e.remainingMs??e.nextAt-now)/1000));
  return `<button class="territory-notice" data-action="locate-territory" data-id="${e.id}" aria-label="${label}: ${e.region.length} ${eventRule(e.kind)?.effect==='vacate'?'fichas':'celdas'} marcadas. Ver región" title="${label}"><svg viewBox="0 0 32 32" aria-hidden="true">${territoryIcons[e.kind]}</svg><span class="territory-countdown mono" data-territory-id="${e.id}" ${e.turnsRemaining!=null?'data-turn-countdown':''} aria-label="${seconds} ${e.turnsRemaining!=null?'turnos':'segundos'}">${seconds}</span></button>`;
 }).join('');
}
