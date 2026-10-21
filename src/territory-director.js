import {availableCells,terrainOf} from './game.js';
import {SELECTABLE_FAUNA,faunaKindEnabled} from './fauna-selection.js';
import {SELECTABLE_PHENOMENA,phenomenonEnabled} from './phenomena-selection.js';

// This is the territory's decision policy, not another timed inhabitant.
// Only accepted board actions call it; paint, navigation and clock ticks do not.
export const directedTerritory=room=>['solo','local'].includes(room?.mode)&&room.variant!=='inverse'&&room.territoryDirector?.version===1;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const kinds=new Set([...SELECTABLE_FAUNA,...SELECTABLE_PHENOMENA,'work']);
export function validTerritoryDirector(room){
 const d=room?.territoryDirector;if(d==null)return true;
 return directedTerritory(room)&&integer(d.choices)&&integer(d.lastSize)&&typeof d.grown==='boolean'&&(d.fingerprint===null||typeof d.fingerprint==='string'&&d.fingerprint.length<=160)&&Array.isArray(d.recent)&&d.recent.length<=12&&d.recent.every(k=>kinds.has(k))&&(!d.last||kinds.has(d.last.kind)&&['fauna','weather'].includes(d.last.family)&&['small','large'].includes(d.last.tier)&&integer(d.last.turn));
}
export function initializeTerritoryDirector(room){
 if(room.variant==='inverse'||!['solo','local'].includes(room.mode)||!['playing','paused'].includes(room.status))return;
 if(!validTerritoryDirector(room))throw Error('El estado del territorio no es compatible. Se conserva la partida.');
 room.territoryDirector??={version:1,choices:0,lastSize:terrainOf(room).length,grown:terrainOf(room).length>9,fingerprint:null,recent:[]};
}
export function territoryAwaitingExpansion(room){
 if(!directedTerritory(room)||room.status!=='playing')return false;
 return room.pairs.some(p=>p.pending&&!p.optionalExpansion||!availableCells(room,p,{ignoreBlocks:true}).length);
}
export function markTerritoryGrowth(room){
 if(!directedTerritory(room))return;
 const d=room.territoryDirector,size=terrainOf(room).length;
 if(size>d.lastSize){d.grown=true;d.fingerprint=null;}
 d.lastSize=size;
}
const faunaTier=e=>e.directorTier||((e.scale==='large'||e.kind?.includes('plague')||['rhino','anaconda','work'].includes(e.kind))?'large':'small');
export function weatherTier(kind,count){
 return ['fog','tornado','tornado-rain','blackhole'].includes(kind)||count>(['meteorites','earthquake','rain','cataclysm','ufo'].includes(kind)?3:9)?'large':'small';
}
export function territoryPressure(room){
 const fauna=new Map(),weather=new Map();
 const offer=(map,id,tier)=>map.set(id,map.get(id)==='large'||tier==='large'?'large':'small');
 for(const e of [...room.faunaEvents||[],...room.rodentRaids||[],...room.worms||[],...room.anacondas||[],...room.works||[]])offer(fauna,e.directorBatch||e.birthBatch||e.kind==='work'&&('work:'+e.announcedTurn)||e.id,faunaTier(e));
 for(const f of room.frontiers||[])if(f.type==='beaver')offer(fauna,f.directorBatch||'beaver:'+f.bornTurn,f.directorTier||(f.cells.length>3?'large':'small'));
 for(const e of [...room.territoryEvents||[],...room.fogEffects||[]])offer(weather,e.id,e.directorTier||weatherTier(e.kind,e.region?.length||0));
 return {fauna:[...fauna.values()],weather:[...weather.values()]};
}
export function canTerritoryCombine(room,family,tier){
 const p=territoryPressure(room),own=family==='fauna'?p.fauna:p.weather,other=family==='fauna'?p.weather:p.fauna;
 return !own.length&&other.length<=1&&!(tier==='large'&&other.includes('large'));
}
const hashBoard=room=>{
 let h=0;for(const c of room.cells){let n=Math.imul(c.x,73856093)^Math.imul(c.y,19349663)^(c.symbol?.charCodeAt(0)||0);h=(h+(n>>>0))>>>0;}
 return h;
};
export function territoryAssessment(room){
 const size=terrainOf(room).length,occupied=room.cells.length,free=availableCells(room,room.pairs[0],{ignoreBlocks:true}).length,density=occupied/Math.max(1,size),d=room.territoryDirector;
 const fingerprint=[size,occupied,hashBoard(room),room.forms?.length||0,(room.inventoryEffects?.shields||[]).length,(room.inventoryEffects?.immunities||[]).length].join(':');
 return {size,occupied,free,density,fingerprint,ready:!!d?.grown&&occupied>=3&&density>=.12&&free>0&&!territoryAwaitingExpansion(room),pressure:territoryPressure(room)};
}
export function territoryCandidates(room,random=Math.random){
 const d=room.territoryDirector,c=territoryAssessment(room);
 // Compulsory growth is guarded by ready. A percentage-based free-space
 // reserve can exceed an entire 3x3 expansion and silence large boards forever.
 if(!c.ready||d.fingerprint===c.fingerprint)return [];
 // A reaction is a changed board/protection, not elapsed time or a camera move.
 d.fingerprint=c.fingerprint;
 const candidates=[],recent=d.recent,score=(kind,family,tier)=>{
  const repeat=recent.filter(k=>k===kind).length,change=d.last?.family===family?0:2;
  const pressure=tier==='large'?c.density*3-1:2-c.density;
  return 4+change+pressure-repeat*3+Math.max(0,Math.min(.999999,Number(random())||0));
 };
 if(room.faunaEnabled!==false)for(const kind of SELECTABLE_FAUNA){
  if(!faunaKindEnabled(room,kind))continue;
  const base=kind.replace('-plague',''),tier=kind.includes('plague')||['rhino','anaconda','build','destroy'].includes(base)?'large':'small';
  if(tier==='large'&&(c.occupied<9||c.density<.3)||!canTerritoryCombine(room,'fauna',tier))continue;
  if(base==='destroy'&&!room.cells.some(p=>p.symbol==='*'))continue;
  if(base==='build'&&c.density<.45)continue;
  candidates.push({kind,family:'fauna',tier,score:score(kind,'fauna',tier)});
 }
 if(room.territoryEnabled!==false)for(const kind of SELECTABLE_PHENOMENA){
  if(kind==='neutral'||!phenomenonEnabled(room,kind))continue;
  for(const tier of ['small','large']){
   if(!canTerritoryCombine(room,'weather',tier)||tier==='large'&&(c.occupied<9||c.density<.3))continue;
   if(tier==='small'&&['fog','tornado','blackhole'].includes(kind)||tier==='large'&&['clouds','contagion','death'].includes(kind))continue;
   const relief=['ufo','meteorites','earthquake'].includes(kind)&&c.density>.5?1:0;
   candidates.push({kind,family:'weather',tier,score:score(kind,'weather',tier)+relief-(kind==='death'?3:0)});
  }
 }
 return candidates.sort((a,b)=>b.score-a.score||a.kind.localeCompare(b.kind));
}
export function recordTerritoryChoice(room,candidate){
 const d=room.territoryDirector;d.choices++;d.recent=[...d.recent,candidate.kind].slice(-12);
 d.last={kind:candidate.kind,family:candidate.family,tier:candidate.tier,turn:room.ecologyTurns||0};
}
