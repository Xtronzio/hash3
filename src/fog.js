import {snapshotMemo} from './snapshot-memo.js';
const key=p=>`${p.x},${p.y}`;
export const fogIcon='<path d="M3 12h26M6 17h21M2 22h22M8 27h20M8 8a5 5 0 0 1 8-4 6 6 0 0 1 10 4"/>';
export const cloudIcon='<path d="M8 15a5 5 0 1 1 1-10 6 6 0 0 1 11 1 5 5 0 1 1 4 9H8ZM3 21h22M8 26h21"/>';
export const fogKeys=room=>snapshotMemo(room,'fog-keys:'+room.fogEffects?.map(e=>e.id+':'+e.turnsRemaining).join('|'),()=>new Set((room.fogEffects||[]).filter(e=>e.turnsRemaining>0).flatMap(e=>e.region.map(key))));
export function activateFog(room,event,region){
 const hidden=new Set((room.fogEffects||[]).flatMap(e=>e.region.map(key)));
 const regionKeys=new Set(region.map(key));
 const memory=Object.fromEntries(room.cells.filter(c=>regionKeys.has(key(c))&&!hidden.has(key(c))).map(c=>[key(c),{symbol:c.symbol,owner:c.owner,...(c.wildcardSymbol?{wildcardSymbol:c.wildcardSymbol}:{})}]));
 room.fogEffects||=[];room.fogEffects.push({id:event.id,kind:event.kind,region:region.map(({x,y})=>({x,y})),...(event.groups?{groups:event.groups}:{}),turnsRemaining:3,bornTurn:room.ecologyTurns||0,memory});
 delete room.practiceHint;
}
export function advanceFog(room){
 room.fogEffects=(room.fogEffects||[]).filter(e=>{if(e.bornTurn!==room.ecologyTurns)e.turnsRemaining--;return e.turnsRemaining>0;});
}
// Decisions see occupancy and remembered signs, never newly hidden identities.
export function perceivedRoom(room){
 if(room.fogPerception||!room.fogEffects?.length)return room;
 const hidden=fogKeys(room),memory=Object.assign({},...room.fogEffects.map(e=>e.memory||{}));
 const cells=room.cells.map(c=>hidden.has(key(c))?{id:'fog:'+key(c),x:c.x,y:c.y,symbol:memory[key(c)]?.symbol||'?',owner:memory[key(c)]?.owner??null,...(memory[key(c)]?.wildcardSymbol?{wildcardSymbol:memory[key(c)].wildcardSymbol}:{})}:c);
 return {...room,fogPerception:true,cells,players:room.players.map(p=>hidden.has(key(p.lastMove||{}))?{...p,lastMove:undefined}:p)};
}
export function fogCellMarkup(occupied){return `<svg class="fog-cell-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 10h24M2 16h23M7 22h23"/>${occupied?'<path d="M5 7h10M17 13h12M3 25h18"/>':'<circle class="fog-placement-point" cx="16" cy="16" r="3.3"/>'}</svg>`;}
