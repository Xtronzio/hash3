// Finite refill of the original silhouette: never new terrain or retroactive points.
export const inverseRenewalLimit=room=>3*Math.floor(room.terrain.length/27);
export const inverseRenewalBudget=room=>Math.min(33,3*Math.ceil(room.terrain.length/3333),inverseRenewalLimit(room)-(room.inverseContour?.renewal?.restored||0));
export function planInverseRenewal(room){
 if(room.inverseFill.length<=9)return [];
 const fill=new Set(room.inverseFill),occupied=new Set(room.cells.map(p=>`${p.x},${p.y}`)),candidates=room.terrain.filter(p=>!fill.has(`${p.x},${p.y}`)&&!occupied.has(`${p.x},${p.y}`));
 const adjacent=p=>[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dy])=>n+Number(fill.has(`${p.x+dx},${p.y+dy}`)),0);
 const salt=room.inverseContour.cycles*83492791;
 const ranked=candidates.map(p=>({...p,rank:adjacent(p),tie:((p.x*73856093)^(p.y*19349663)^salt)>>>0}));
 ranked.sort((a,b)=>b.rank-a.rank||a.tie-b.tie||a.y-b.y||a.x-b.x);
 return ranked.slice(0,inverseRenewalBudget(room)).map(p=>`${p.x},${p.y}`);
}
export function advanceInverseRenewal(room,interval,{beeImpact=false}={}){
 const c=room.inverseContour,r=c?.renewal;if(!r)return;
 if(c.turns===r.next-3)r.targets=planInverseRenewal(room);
 if(c.turns<r.next)return;
 if(beeImpact&&r.targets.length){r.next=c.turns+1;return;}
 const fill=new Set(room.inverseFill),occupied=new Set(room.cells.map(p=>`${p.x},${p.y}`));
 const restored=room.inverseFill.length>9?r.targets.filter(k=>!fill.has(k)&&!occupied.has(k)).slice(0,inverseRenewalBudget(room)):[];
 room.inverseFill.push(...restored);room.inverseCleared=room.terrain.length-room.inverseFill.length;
 r.restored+=restored.length;r.targets=[];r.next=c.turns+2*interval(room);
 if(restored.length){room.inverseRenewalEvent={id:crypto.randomUUID(),turn:c.turns,restored};delete room.practiceHint;}
}
