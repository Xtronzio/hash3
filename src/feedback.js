import {key,figureWindows} from './game.js';

// Render only the geometries actually paid by the authoritative engine.
export function scoreFeedback(previous,next) {
  const ev=next.lastEvent;
  if(!previous||previous.id!==next.id||ev?.kind!=='move'||!(ev.points>0)||previous.lastEvent?.id===ev.id)return null;
  const move=next.cells.find(c=>c.id===ev.id),player=next.players.find(p=>p.id===ev.player);
  if(!player)return null;
  const scoredMove=move||ev.move;if(!scoredMove)return null;
  const paid=new Set(next.forms||[]),before=new Set(previous.forms||[]);
  const figures=ev.paidFigures||figureWindows(next.cells,scoredMove.x,scoredMove.y,scoredMove.symbol,next.level).filter(f=>paid.has(f.id)&&!before.has(f.id));
  const cells=new Map(),groups=new Map();
  for(const f of figures) {
    for(const [x,y] of f.points)cells.set(key(x,y),{x,y});
    const groupKey=f.kind+':'+f.size;
    if(!groups.has(groupKey))groups.set(groupKey,{kind:f.kind,size:f.size,count:0,points:0});
    const group=groups.get(groupKey);group.count++;group.points+=f.size;
  }
  return {id:ev.id,player:ev.player,name:player.name,symbol:scoredMove.symbol,move:scoredMove,figures,cells:[...cells.values()],groups:[...groups.values()],points:ev.points,bonus:ev.bonus||0,automatic:!!ev.automatic};
}
export function scoreBreakdown(feedback) {
  const names={'línea':['Línea','Líneas'],L:['L','L'],cuadrado:['Cuadrado','Cuadrados'],cruz:['Cruz','Cruces'],grupo:['Figura compleja','Figuras complejas']};
  const items=feedback.groups.map(g=>`${g.count>1?g.count+' ':''}${names[g.kind]?.[g.count>1?1:0]||g.kind} de ${g.size} · +${g.points}`);
  if(feedback.bonus)items.push(`Bonus · +${feedback.bonus}`);
  return items.join(' / ');
}
