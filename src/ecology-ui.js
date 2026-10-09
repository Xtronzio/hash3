import {ecologyIcon,ecologyColors} from './ecology-navigation.js';
import {territoryIcons} from './territory-tools.js';
import {eventLabel,eventRule} from './territory-event-rules.js';
export function ecologyChoicesMarkup(settings,inventoryIcon){
 const group=kinds=>`<span class="ecology-choice-icons" aria-hidden="true">${kinds.map(kind=>`<span data-ecology-kind="${kind}" style="--ecology-color:${ecologyColors[kind]||'var(--yellow)'}">${ecologyIcon(kind)}</span>`).join('')}</span>`;
 const choice=(id,label,icon,checked,disabled=false)=>`<label class="ecology-choice" for="${id}" title="${label}${disabled?' · solo contra la máquina':''}">${icon}<input id="${id}" type="checkbox" aria-label="${label}" ${checked?'checked':''} ${disabled?'disabled':''}></label>`;
 return `<fieldset class="ecology-choices" aria-label="Complejidad de la partida">${choice('machine-inventory','Inventario rival',inventoryIcon,settings.machineInventory,!settings.machine)}${choice('fauna-enabled','Fauna y habitantes: roedores, gusanos, constructores y destructores',group(['rodent','worm','build','destroy']),settings.faunaEnabled)}${choice('territory-enabled','Invasores y fenómenos naturales y estelares',group(['invader-colony','meteorites','hurricane','ufo']),settings.territoryEnabled)}</fieldset>`;
}
export function territoryWarningMarkup(room,now=Date.now()){
 return (room.territoryEvents||[]).map(e=>{
  const label=eventLabel(e.kind),seconds=Math.max(0,Math.ceil((e.remainingMs??e.nextAt-now)/1000));
  return `<button class="territory-notice" data-action="locate-territory" data-id="${e.id}" aria-label="${label}: ${e.region.length} ${eventRule(e.kind)?.effect==='vacate'?'fichas':'celdas'} marcadas. Ver región" title="${label}"><svg viewBox="0 0 32 32" aria-hidden="true">${territoryIcons[e.kind]}</svg><span class="territory-countdown mono" data-territory-id="${e.id}" aria-label="${seconds} segundos">${seconds}</span></button>`;
 }).join('');
}
