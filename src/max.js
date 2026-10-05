// #MAX v1: moving window of 100 normalized actions. Bonus is excluded.
// The scale is points/action × 100; precision is retained for ranking.
export function calculateMax(actions=[]){
  const sample=actions.slice(-100);if(!sample.length)return {value:null,actions:0,provisional:true};
  const n=sample.length,efficiency=sample.reduce((s,a)=>s+a.points,0)/n;
  const blocks=[];for(let i=0;i<n;i+=10){const b=sample.slice(i,i+10);blocks.push(b.reduce((s,a)=>s+a.points,0)/b.length);}
  const mean=blocks.reduce((s,x)=>s+x,0)/blocks.length;
  const variance=blocks.reduce((s,x)=>s+(x-mean)**2,0)/blocks.length;
  const consistency=mean>0?1/(1+Math.sqrt(variance)/mean):0;
  const scored=sample.filter(a=>a.figures>0),combos=scored.length?scored.filter(a=>a.figures>1).length/scored.length:0;
  return {value:Math.round(100*efficiency*(.8+.1*consistency+.1*combos)*1e6)/1e6,actions:n,provisional:n<100};
}
export function recordMax(player,points,figures,automatic=false){
  const actions=[...(player.maxActions||[]),{points:automatic?0:Math.max(0,points),figures:automatic?0:figures}].slice(-100);
  const before=player.max?.value;player.maxActions=actions;player.max=calculateMax(actions);
  player.max.change=before==null?0:Math.sign(player.max.value-before);return player;
}
export function maxLabel(player){return player.max?.value==null?'—':Number(player.max.value).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});}
