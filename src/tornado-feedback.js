// The animation follows actual piece IDs between authoritative snapshots.
// It never invents a second shuffle or changes the completed command.
export function tornadoFeedback(previous,next){
 const event=next.lastEvent;
 if(!previous||previous.id!==next.id||event?.kind!=='inventory'||event.tool!=='tornado'||previous.lastEvent?.id===event.id)return null;
 const affected=event.affected||[],positions=new Set(affected.map(p=>`${p.x},${p.y}`));
 const before=new Map(previous.cells.filter(c=>positions.has(`${c.x},${c.y}`)).map(c=>[c.id,c]));
 const moves=next.cells.filter(c=>before.has(c.id)).flatMap(c=>{
  const from=before.get(c.id);return from.x===c.x&&from.y===c.y?[]:[{id:c.id,symbol:c.symbol,owner:c.owner,...(c.wildcardSymbol?{wildcardSymbol:c.wildcardSymbol}:{}),from:{x:from.x,y:from.y},to:{x:c.x,y:c.y}}];
 });
 return moves.length?{id:event.id,affected,moves}:null;
}
