// Cosmetic history: rival cards remain until the next placement.
export function stampTurnCards(previous,next){
 if(!previous||previous.id!==next.id||previous===next||next.status==='finished')return next;
 const history={...(previous.turnCards||Object.fromEntries(previous.players.map(p=>[p.id,p.inventory?.turnUse?.tools||[]])))};
 const event=next.lastEvent,fresh=event?.id&&event.id!==previous.lastEvent?.id;
 if(fresh&&event.kind==='move'&&!event.tool)for(const p of next.players)if(p.id!==(event.actor||event.player))history[p.id]=[];
 for(const p of next.players){
  const old=previous.players.find(q=>q.id===p.id)?.inventory?.turnUse,current=p.inventory?.turnUse;
  if(JSON.stringify(old)!==JSON.stringify(current))history[p.id]=current?.tools||[];
 }
 return {...next,turnCards:history};
}
export const displayedTurnCards=game=>Object.entries(game.turnCards||Object.fromEntries(game.players.map(p=>[p.id,p.inventory?.turnUse?.tools||[]]))).flatMap(([player,tools])=>tools.map(tool=>({player,tool})));
