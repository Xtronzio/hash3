// #3_11: Identidad del evento y parámetros separados del motor.
// Los valores son provisionales: se afinan con simulaciones, no con cambios de lógica.
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
export const EVENT_RHYTHM=Object.freeze(['invaders','natural','natural']);

// Ajustes para el futuro simulador. La familia invasora conserva el turno de
// aparición de la antigua lluvia de bombas (1 de cada 3 anuncios).
export const EVENT_BALANCE=Object.freeze({
  warningMs:33000,
  placementsPerAttempt:33,
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
export const eventRule=kind=>TERRITORY_EVENT_RULES[kind]||null;
export const eventLabel=kind=>eventRule(kind)?.label||kind;
export const isTimedTerritoryKind=kind=>!!eventRule(kind);
export function impactCount(room,kind){
 const r=eventRule(kind),b=EVENT_BALANCE;
 if(!r)return 0;
 if(kind==='invader-rain')return b.invasionRainCells;
 if(kind==='invader-colony')return b.invasionColonySide**2;
 if(kind==='blackhole')return b.blackholeSide**2;
 const size=r.basis==='pieces'?room.cells.length:(room.terrain||[]).length;
 const count=Math.floor(size*b.incidenceNumerator/b.incidenceDenominator);
 return kind==='rain'?3*Math.floor(count/3):Math.max(0,count);
}
export function pickEventKind(room,random=Math.random){
 if(room.territoryCatalogueVersion!==1){
  // Versionado idempotente: no repetir la actividad pasada.
  room.territoryCatalogueVersion=1;
  room.territoryKindCounter=0;
  room.territoryNaturalIndex=0;
  room.territoryInvasionIndex=0;
  room.territoryBag=[];
 }
 const family=EVENT_RHYTHM[room.territoryKindCounter%EVENT_RHYTHM.length];
 const rotation=family==='invaders'?INVADER_EVENT_ROTATION:NATURAL_EVENT_ROTATION;
 const index=family==='invaders'?'territoryInvasionIndex':'territoryNaturalIndex';
 const offset=room[index]%rotation.length;
 // Rotation ensures every member can appear with a fixed deterministic RNG.
 // A random offset may be introduced by the simulator after impact calibration.
 return {family,order:[...rotation.slice(offset),...rotation.slice(0,offset)],index};
}
export function confirmEventKind(room,choice){
 room.territoryKindCounter++;
 room[choice.index]=(room[choice.index]||0)+1;
}
