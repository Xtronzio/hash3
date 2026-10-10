// #3_11: Identidad del evento y parámetros separados del motor.
// Los valores son provisionales: se afinan con simulaciones, no con cambios de lógica.
import {localLiving,livingImpact} from './living-balance.js';
export const TERRITORY_EVENT_RULES=Object.freeze({
  // Los alias se conservan para no romper partidas y avisos históricos.
  rain:{label:'Lluvia de bombas (antigua)',family:'legacy',effect:'demolish',distribution:'dispersed',basis:'terrain'},
  cataclysm:{label:'Cataclismo (antiguo)',family:'legacy',effect:'demolish',distribution:'local',basis:'terrain'},
  meteorites:{label:'Lluvia de meteoritos',family:'natural',effect:'demolish',distribution:'dispersed',basis:'terrain'},
  earthquake:{label:'Terremoto',family:'natural',effect:'demolish',distribution:'local',basis:'terrain'},
  pandemic:{label:'Pandemia',family:'natural',effect:'vacate',distribution:'dispersed',basis:'pieces'},
  ufo:{label:'OVNI',family:'stellar',effect:'vacate',distribution:'local',basis:'pieces'},
  'tornado-rain':{label:'Lluvia de tornados',family:'natural',effect:'shuffle',distribution:'dispersed',basis:'terrain'},
  hurricane:{label:'Huracán',family:'natural',effect:'shuffle',distribution:'local',basis:'terrain'},
  blackhole:{label:'Agujero negro',family:'stellar',effect:'blackhole',distribution:'local',basis:'fixed'},
  'invader-rain':{label:'Bombardeo invasor',family:'invaders',effect:'colonize',distribution:'dispersed',basis:'fixed'},
  'invader-colony':{label:'Colonia invasora 3×3',family:'invaders',effect:'colonize',distribution:'local',basis:'fixed'}
});
export const NATURAL_EVENT_ROTATION=Object.freeze(['meteorites','earthquake','pandemic','ufo','tornado-rain','hurricane','blackhole']);
export const INVADER_EVENT_ROTATION=Object.freeze(['invader-rain','invader-colony']);
// Efectos ligados al 3; frecuencias ajustadas por impacto y tamaño.
export const EVENT_BALANCE=Object.freeze({
  warningMs:33000,
  placementsPerAttempt:333,
  invaderPlacementsPerAttempt:66,
  placementScaleReference:666,
  incidenceNumerator:33,
  incidenceDenominator:333,
  invasionRainCells:3,
  invasionColonySide:3,
  blackholeSide:3,
  blackholeHalo:3,
  dispersedTornadoSide:3,
  recoveryMs:33000,
  recoveryMoves:3
});
export const LOCAL_EVENT_RULES=Object.freeze({tornado:{label:'Tornado',family:'natural',effect:'shuffle',distribution:'local',basis:'fixed'},contagion:{label:'Contagio',family:'natural',effect:'vacate',distribution:'local',basis:'pieces'}});
export const LOCAL_NATURAL_ROTATION=Object.freeze(['meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','ufo']);
export const eventRule=kind=>LOCAL_EVENT_RULES[kind]||TERRITORY_EVENT_RULES[kind]||null;
export const territoryAttemptInterval=(size,family='natural')=>3*Math.ceil(EVENT_BALANCE[family==='invaders'?'invaderPlacementsPerAttempt':'placementsPerAttempt']*Math.max(EVENT_BALANCE.placementScaleReference,size)/(3*EVENT_BALANCE.placementScaleReference));
export const eventLabel=kind=>({earthquake:'Cataclismo',meteorites:'Meteoritos',contagion:'Contagio',tornado:'Tornado'})[kind]||eventRule(kind)?.label||kind;
export const isTimedTerritoryKind=kind=>!!eventRule(kind);
export function impactCount(room,kind){
 const r=eventRule(kind),b=EVENT_BALANCE;
 if(!r)return 0;
 if(localLiving(room)&&r.family!=='legacy')return livingImpact(room,kind,r);
 if(kind==='invader-rain')return b.invasionRainCells;
 if(kind==='invader-colony')return b.invasionColonySide**2;
 if(kind==='blackhole')return b.blackholeSide**2;
 const size=r.basis==='pieces'?room.cells.length:(room.terrain||[]).length;
 const count=Math.floor(size*b.incidenceNumerator/b.incidenceDenominator);
 return kind==='rain'?3*Math.floor(count/3):Math.max(0,count);
}
export function pickEventKind(room,family='natural',random=Math.random){
 if(room.territoryCatalogueVersion!==2){
  // Versionado idempotente: no repetir la actividad pasada.
  room.territoryCatalogueVersion=2;
  room.territoryKindCounter=0;
  room.territoryNaturalIndex=0;
  room.territoryInvasionIndex=0;
  room.territoryBag=[];
 }
 const rotation=family==='invaders'?INVADER_EVENT_ROTATION:localLiving(room)?LOCAL_NATURAL_ROTATION:NATURAL_EVENT_ROTATION;
 if(localLiving(room)){
  room.livingBags||={};
  if(room.localEventCatalogue!==3){room.livingBags.natural=[];room.localEventCatalogue=3;}
  let bag=room.livingBags[family];
  if(!bag?.length){bag=[...rotation];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.floor(Math.max(0,random())*(i+1)));[bag[i],bag[j]]=[bag[j],bag[i]];}room.livingBags[family]=bag;}
  return {family,order:[...bag],index:family==='invaders'?'territoryInvasionIndex':'territoryNaturalIndex',living:true};
 }
 const index=family==='invaders'?'territoryInvasionIndex':'territoryNaturalIndex';
 const offset=room[index]%rotation.length;
 // Rotation ensures every member can appear with a fixed deterministic RNG.
 // A random offset may be introduced by the simulator after impact calibration.
 return {family,order:[...rotation.slice(offset),...rotation.slice(0,offset)],index};
}
export function confirmEventKind(room,choice,kind){
 if(choice.living){const bag=room.livingBags[choice.family],index=bag.indexOf(kind??choice.order[0]);if(index>=0)bag.splice(index,1);}
 room.territoryKindCounter++;
 room[choice.index]=(room[choice.index]||0)+1;
}
