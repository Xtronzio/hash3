import {eventRule,EVENT_BALANCE} from './territory-event-rules.js';
import {habitatReservations} from './habitat-tools.js';
import {key,terrainOf} from './game.js';
import {protectedTerritoryKeys} from './immunity.js';
import {defendedInvasionCells} from './invasion-paths.js';
import {snapshotMemo} from './snapshot-memo.js';

// Snapshot-only overlay data. Off-terrain threats never create playable cells.
export function territoryThreatCells(room){
 return snapshotMemo(room,'territory-threats',()=>{
  if(room.status==='finished')return [];
  const protectedKeys=protectedTerritoryKeys(room),shieldKeys=new Set(),shields=new Set((room.inventoryEffects?.shields||[]).filter(s=>s.remaining>0).map(s=>s.cell));
  for(const c of room.cells||[])if(shields.has(c.id))shieldKeys.add(key(c.x,c.y));
  const habitatSafe=new Set([...(room.deadCells||[]),...habitatReservations(room),...(room.worms||[]).flatMap(w=>w.body||[]),...(room.frontiers||[]).flatMap(f=>f.cells||[])].map(c=>key(c.x,c.y)));
  const terrain=terrainOf(room),result=new Map(),add=(points,kind,eventId,excluded=new Set(),shieldsBlock=true)=>{
   for(const c of points||[])if(Number.isFinite(c.x)&&Number.isFinite(c.y)&&!protectedKeys.has(key(c.x,c.y))&&!excluded.has(key(c.x,c.y))&&(!shieldsBlock||!shieldKeys.has(key(c.x,c.y))))result.set(key(c.x,c.y),{x:c.x,y:c.y,kind,eventId});
  };
  for(const e of room.territoryEvents||[]){
   const excluded=new Set([...habitatSafe,...(e.antidotes||[]).map(c=>key(c.x,c.y))]);
   if(eventRule(e.kind)?.effect==='demolish')for(const p of room.pairs||[]){const a=p.terrainAnchor||p.active;excluded.add(key(a.x,a.y));}
   if(e.kind.startsWith('invader-'))for(const k of defendedInvasionCells(room,e))excluded.add(k);
   add(e.region,e.kind,e.id,excluded);
   if(e.kind==='blackhole')for(const core of e.groups||[e.region||[]]){
    if(!core.length)continue;
    const left=Math.min(...core.map(c=>c.x))-EVENT_BALANCE.blackholeHalo,right=Math.max(...core.map(c=>c.x))+EVENT_BALANCE.blackholeHalo,top=Math.min(...core.map(c=>c.y))-EVENT_BALANCE.blackholeHalo,bottom=Math.max(...core.map(c=>c.y))+EVENT_BALANCE.blackholeHalo;
    add(terrain.filter(c=>c.x>=left&&c.x<=right&&c.y>=top&&c.y<=bottom),e.kind,e.id,excluded);
   }
  }
  for(const e of room.faunaEvents||[])add(e.region,e.kind,e.id,habitatSafe);
  for(const w of room.worms||[])if(w.brief)add(w.route,'worm',w.id);
  for(const b of room.bombs||[])add(b.blast?.length?b.blast:[b],'bomb',b.id,new Set(),false);
  const occupied=new Map((room.cells||[]).map(c=>[key(c.x,c.y),c]));
  for(const w of room.works||[])add((w.destroy?.slice(w.done||0)||[]).filter(c=>!w.reconquer||occupied.get(key(c.x,c.y))?.symbol==='*'),'destroy',w.id);
  for(const r of room.rodentRaids||[])if(r.phase!=='hidden')add(r.members?.length?r.members:[r],'rodent',r.id,habitatSafe,!!r.brief);
  for(const w of room.worms||[])if(w.warningTurns!=null||!w.turnDriven)add([w],'worm',w.id,new Set(),false);
  return [...result.values()];
 });
}
