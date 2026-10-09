// Display a new final-arrangement payout once, never replay it on opening a save.
export function landingFeedback(previous,next){
 const event=next.landingEvent;
 if(!previous||previous.id!==next.id||next.status!=='playing'||!event?.id||event.id===previous.landingEvent?.id)return null;
 const scores=(event.scores||[]).filter(s=>['X','O'].includes(s.symbol)&&Number.isFinite(s.points)&&s.points>0).map(s=>{
  const points=(s.paidFigures||[]).flatMap(f=>f.points||[]),anchor=points[Math.floor(points.length/2)];
  return {...s,move:anchor?{x:anchor[0],y:anchor[1]}:null};
 });
 return scores.length?{id:event.id,scores}:null;
}
export function landingScoreMarkup(scores,manual=null){
 const totals=new Map();
 for(const s of [...scores,...(manual?[manual]:[])])if(['X','O'].includes(s.symbol)&&Number.isFinite(s.points)&&s.points>0)totals.set(s.symbol,(totals.get(s.symbol)||0)+s.points);
 return ['X','O'].filter(s=>totals.has(s)).map(symbol=>`<strong class="score-notice-total ${symbol.toLowerCase()}" aria-label="${symbol}: ${totals.get(symbol)} puntos">+${totals.get(symbol)}</strong>`).join('');
}
