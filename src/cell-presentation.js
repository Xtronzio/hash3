import {ecologyPinTargets,ecologyIcon,ecologyNames} from './ecology-navigation.js';
import {frontierFootprint} from './frontiers.js';
import {habitatLocations} from './habitat-tools.js';
import {snapshotMemo} from './snapshot-memo.js';
import {targetColors,targetIcon} from './watch-targets.js';
import {lastGlyphPerCell} from './glyph-order.js';
export {lastGlyphPerCell} from './glyph-order.js';
const key=p=>`${p.x},${p.y}`;
const identity=e=>e.id||e.cell||`${e.x},${e.y}:${e.by||''}`;
const pointSignature=p=>p?`${p.x},${p.y}:${p.cellId||''}`:'';
const geometry=e=>['members','region','cells','build','destroy'].map(field=>{const list=e[field]||[];return `${list.length}:${pointSignature(list[0])}:${pointSignature(list.at(-1))}`;}).join('|')+'|'+(e.groups||[]).map(group=>`${group.length}:${pointSignature(group[0])}:${pointSignature(group.at(-1))}`).join('|');
const changed=(a,b)=>!a||a.x!==b.x||a.y!==b.y||a.phase!==b.phase||a.bombPhase!==b.bombPhase||a.done!==b.done||geometry(a)!==geometry(b);

// Cosmetic provenance travels with the save. Stamp only new/moved markers;
// countdown ticks never reorder cards. Historical snapshots are not replayed.
export function stampCellPresentation(previous,next){
 if(!previous||previous.id!==next.id||next===previous||next.status==='finished')return next;
 let sequence=previous.presentationSequence||0,result=next;
 const stamp=(e,old)=>changed(old,e)?{...e,visualAt:next.clockNow??Date.now(),visualOrder:++sequence}:e;
 for(const field of ['watchTargets','frontiers','rodents','rodentRaids','worms','works','faunaEvents','territoryEvents']){
  if(!Array.isArray(next[field]))continue;
  const old=new Map((previous[field]||[]).map(e=>[identity(e),e]));
  let modified=false;
  const values=next[field].map(e=>{
   const prior=old.get(identity(e));let value=stamp(e,prior);
   if(field==='territoryEvents'&&e.antidotes){const before=new Map((prior?.antidotes||[]).map(e=>[identity(e),e]));const antidotes=e.antidotes.map(a=>stamp(a,before.get(identity(a))));if(antidotes.some((a,i)=>a!==e.antidotes[i]))value={...value,antidotes};}
   if(value!==e)modified=true;return value;
  });
  if(modified)result={...result,[field]:values};
 }
 if(sequence!==(previous.presentationSequence||0))result={...result,presentationSequence:sequence};
 return result;
}
export function cellGlyphs(room,playerId){
 return snapshotMemo(room,'cell-glyphs:'+playerId,()=>{
  const candidates=[];
  for(const e of room.frontiers||[])for(const point of frontierFootprint(e,room))candidates.push({...e,...point,type:'frontier',glyphId:'frontier:'+e.id,kind:e.type==='beaver'?'beaver-barrier':'barriers'});
  for(const e of habitatLocations(room))if(!['rhino','rhino-plague','beaver','beaver-plague'].includes(e.kind))candidates.push({...e,type:'event',glyphId:'habitat:'+e.id+':'+e.kind});
  for(const e of ecologyPinTargets(room,playerId))if(!e.invasion)candidates.push({...e,type:'event',glyphId:'event:'+e.id});
  for(const event of room.territoryEvents||[])for(const e of event.antidotes||[])candidates.push({...e,type:'antidote',kind:'antidote',glyphId:'antidote:'+event.id+':'+key(e)});
  for(const e of room.watchTargets||[])candidates.push({...e,type:'target',kind:'target',glyphId:'target:'+e.id});
  const dead=new Set((room.deadCells||[]).map(key));return new Map([...lastGlyphPerCell(candidates)].filter(([k])=>!dead.has(k)));
 });
}
export function glyphMarkup(e){
 if(e.type==='target')return `<span class="watch-cell-symbol" style="color:${targetColors[(e.number||1)-1]}" aria-label="Diana ${e.number}"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg><small>${e.number}</small></span>`;
 if(e.type==='antidote')return '<span class="antidote-cell" aria-label="Antídoto aplicado">+</span>';
 const turns=e.warningTurns??e.turnsRemaining;
 return `${ecologyIcon(e.kind)}${turns!=null?`<b class="ecology-clock mono" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId||e.id}">${turns}</b>`:''}`;
}
export const glyphLabel=e=>e.type==='target'?'Diana '+e.number:e.type==='antidote'?'Antídoto aplicado':ecologyNames[e.kind]||e.kind;
