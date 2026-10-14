import {backpackIcon} from './backpack-icon.js';
import {rodentIcon} from './rodents.js';
import {territoryIcons} from './territory-tools.js';
import {machineLevels,machineLevelLabel} from './machine.js';
import {inventoryEnabled} from './inventory-enabled.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=path=>`<svg viewBox="0 0 32 32" aria-hidden="true">${path}</svg>`;
const owners={human:'<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',robot:'<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M12 3v4M8 12v2m8-2v2m-7 4h6"/>'};
export function savedGameSettings(game){
 if(!['solo','local'].includes(game.mode))return [];
 const machine=game.mode==='solo',settings=[
  {id:'player-inventory',label:'Inventario propio',enabled:game.playerInventory!==false,icon:backpackIcon(),owner:'human',color:'cyan'},
  {id:machine?'machine-inventory':'other-inventory',label:machine?'Inventario de la máquina':'Inventario del otro colono',enabled:machine?game.machineInventory===true:game.playerInventory!==false,icon:backpackIcon(),owner:machine?'robot':'human',color:'cyan'},
  {id:'fauna',label:'Fauna y habitantes',enabled:game.faunaEnabled!==false,icon:svg(rodentIcon),color:'yellow'},
  {id:'territory',label:'Fenómenos del territorio',enabled:game.territoryEnabled!==false,icon:svg(territoryIcons.hurricane),color:'yellow'},
  {id:'figures',label:'Figuras '+(game.level==='advanced'?'avanzadas':'normales'),value:game.level==='advanced'?'advanced':'normal',icon:svg(game.level==='advanced'?'<path d="m16 2 4 9 10 1-8 7 3 11-9-6-9 6 3-11-8-7 10-1 4-9Z"/>':'<rect x="3" y="3" width="26" height="26" rx="2"/><path d="M12 3v26M20 3v26M3 12h26M3 20h26"/>'),color:'white'}
 ];
 if(machine){const difficulty=machineLevels.some(l=>l.id===game.difficulty)?game.difficulty:'medium',selected=machineLevels.findIndex(l=>l.id===difficulty);settings.push({id:'difficulty',label:'Nivel de máquina: '+machineLevelLabel(difficulty),value:difficulty,color:'cyan',icon:svg([0,1,2,3].map(i=>`<rect x="${3+i*7}" y="${23-i*5}" width="4" height="${6+i*5}" fill="${i<=selected?'currentColor':'none'}" opacity="${i<=selected?1:.35}"/>`).join(''))});}
 return settings;
}
export const savedSettingsDescription=game=>savedGameSettings(game).map(s=>s.label+(s.enabled==null?'':': '+(s.enabled?'activado':'desactivado'))).join(' · ');
export function playerGameSettingsMarkup(game,playerId){
 const player=game.players?.find(p=>p.id===playerId);if(!player||!['solo','local'].includes(game.mode))return '';
 const machine=game.mode==='solo'&&player.id!==(game.humanId||game.pairs?.[0]?.x);
 const settings=savedGameSettings(game).filter(s=>!s.id.includes('inventory')&&(s.id!=='difficulty'||machine));
 settings.unshift({id:machine?'machine-inventory':'player-inventory',label:`Inventario ${player.symbol} · ${player.name}`,enabled:inventoryEnabled(game,player.id),icon:backpackIcon(),owner:machine?'robot':'human',color:'cyan'});
 settings.push({id:'clock',label:'Reloj de turno (33 s)',enabled:game.timeMode!=='untimed',icon:svg('<circle cx="16" cy="16" r="12"/><path d="M16 7v9l6 4"/>'),color:'white'});
 return `<span class="player-game-settings" data-settings-player="${esc(player.id)}" role="group" aria-label="Configuración de ${esc(player.name)}">${settingsMarkup(settings)}</span>`;
}
export function savedGameSettingsMarkup(game){return settingsMarkup(savedGameSettings(game));}
function settingsMarkup(settings){
 return settings.map(s=>{
  const label=s.label+(s.enabled==null?'':': '+(s.enabled?'activado':'desactivado'));
  return `<span class="saved-game-setting ${s.color} ${s.enabled===false?'is-off':''}" data-setting="${s.id}" ${s.enabled==null?`data-value="${s.value}"`:`data-enabled="${s.enabled}"`} title="${esc(label)}" role="img" aria-label="${esc(label)}"><span class="saved-game-setting-icon">${s.icon}</span>${s.owner?`<svg class="saved-game-setting-owner" viewBox="0 0 24 24" aria-hidden="true">${owners[s.owner]}</svg>`:''}${s.enabled===false?'<svg class="saved-game-setting-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21 21 3"/></svg>':''}</span>`;
 }).join('');
}
