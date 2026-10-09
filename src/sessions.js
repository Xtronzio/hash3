import {initializeInventory} from './practice-tools.js';
import {initializeFreeExpansions} from './free-expansion.js';
import {initializeHabitats} from './inhabitants.js';
import {archiveTerritoryResult} from './achievements.js';
import {localCommand} from './local.js';
const valid=g=>g&&typeof g.id==='string'&&['solo','local'].includes(g.mode)&&Array.isArray(g.players)&&Array.isArray(g.pairs)&&['playing','paused','finished'].includes(g.status);
export const gamePinKey=(game,uid='')=>game.local||game.mode?`local:${game.id}`:`online:${uid}:${game.id}`;
export function loadGamePins(storage){try{const pins=JSON.parse(storage.getItem('hash3_game_pins'));return Array.isArray(pins)?pins.filter(p=>typeof p==='string'):[];}catch{return [];}}
export function assertGameDeletionAllowed(storage,game,uid=''){
 let pins;
 try{pins=JSON.parse(storage.getItem('hash3_game_pins')||'[]');if(!Array.isArray(pins))throw new Error();}
 catch{throw new Error('No se puede verificar el anclaje. La partida no se ha borrado.');}
 if(pins.includes(gamePinKey(game,uid)))throw new Error('Partida anclada: desánclala antes de borrarla.');
}
export function toggleGamePin(storage,game,uid=''){
 const pins=loadGamePins(storage),id=gamePinKey(game,uid),pinned=!pins.includes(id),next=pinned?[...pins,id]:pins.filter(p=>p!==id);
 storage.setItem('hash3_game_pins',JSON.stringify(next));return pinned;
}
export function loadLocalGames(storage,now=Date.now()){
  let games=[],canonical=false,storedEntries=[];try{const list=JSON.parse(storage.getItem('hash3_locals'));if(Array.isArray(list)){games=list.filter(valid);storedEntries=list;canonical=true;}}catch{}
  try{const old=JSON.parse(storage.getItem('hash3_local'));if(!canonical&&valid(old)&&!games.some(g=>g.id===old.id)){
    // Existing single saves become paused; no elapsed offline moves are replayed.
    let imported={...old,updatedAt:old.updatedAt||new Date(now).toISOString()};
    if(imported.status==='playing'){const at=Date.parse(imported.updatedAt);imported=localCommand(imported,'pause',{},Number.isFinite(at)&&old.updatedAt?at:Date.parse(imported.pairs[0].deadline)-(old.turnSeconds??30)*1000||now);}
    games.push(imported);
  }}catch{}
  let migrated=!canonical&&games.length>0;
  for(const game of games)if(game.wallMigrationVersion!==1||game.habitatFrequencyVersion!==3||game.inventoryCadenceVersion!==1||game.territoryActivityVersion!==4||game.rodentLifecycleVersion!==1||game.status!=='finished'&&(game.wormLifecycleVersion!==1||game.invasionVersion!==1||game.inhabitantReclaimVersion!==1)||game.players.some(p=>p.freeExpansionVersion!==5)){
    initializeInventory(game);initializeFreeExpansions(game);initializeHabitats(game,now);migrated=true;
  }
  // Persist conversion/refunds atomically before returning an upgraded map;
  // failed storage leaves the previous complete collection recoverable.
  if(migrated)storage.setItem('hash3_locals',JSON.stringify(canonical?storedEntries:games));
  return games.sort((a,b)=>Date.parse(b.updatedAt||0)-Date.parse(a.updatedAt||0));
}
export function saveLocalGame(storage,game,now=Date.now()){
  if(!valid(game))throw new Error('Partida local no válida.');
  const games=loadLocalGames(storage,now),saved={...game,updatedAt:new Date(now).toISOString()};
  const index=games.findIndex(g=>g.id===saved.id);if(index<0)games.unshift(saved);else games[index]=saved;
  // Save the complete collection before updating the legacy pointer.
  storage.setItem('hash3_locals',JSON.stringify(games));
  // The canonical finished game also retains its result if this small archive is full.
  try{archiveTerritoryResult(storage,saved);}catch{}
  try{storage.setItem('hash3_local',JSON.stringify({id:saved.id}));}catch{}
  return saved;
}
export function selectExpansion(selected,point){return selected&&selected.x===point.x&&selected.y===point.y?{confirm:true,selected}:{confirm:false,selected:point};}
export function voteCounts(vote){
 const total=vote?.eligible?.length||0,values=Object.values(vote?.votes||{});
 return {total,required:Math.floor(total/2)+1,yes:values.filter(x=>x===true).length,no:values.filter(x=>x===false).length};
}

export function deleteLocalGame(storage,gameId){
 assertGameDeletionAllowed(storage,{id:gameId,local:true});
 const games=loadLocalGames(storage);if(!games.some(g=>g.id===gameId))throw new Error('Esta partida ya no está guardada.');
 archiveTerritoryResult(storage,games.find(g=>g.id===gameId));
 const remaining=games.filter(g=>g.id!==gameId);
 storage.setItem('hash3_locals',JSON.stringify(remaining));
 // The collection is authoritative; a failed legacy pointer write cannot resurrect a save.
 try{const old=JSON.parse(storage.getItem('hash3_local'));if(old?.id===gameId)storage.setItem('hash3_local',JSON.stringify(remaining[0]?{id:remaining[0].id}:null));}catch{}
 return remaining;
}
