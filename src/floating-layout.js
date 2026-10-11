// Small control rectangles only: never inspect board geometry during dragging.
export function separateFloatingControl(point,size,limits,blockers,gap=8){
 const clamp=p=>({x:Math.max(6,Math.min(limits.x,p.x)),y:Math.max(6,Math.min(limits.y,p.y))});
 const overlaps=(p,b)=>p.x<b.x+b.width+gap&&p.x+size.width+gap>b.x&&p.y<b.y+b.height+gap&&p.y+size.height+gap>b.y;
 const preferred=clamp(point);if(!blockers.some(b=>overlaps(preferred,b)))return preferred;
 const candidates=[...blockers.flatMap(b=>[
  {x:b.x-size.width-gap,y:preferred.y},{x:b.x+b.width+gap,y:preferred.y},
  {x:preferred.x,y:b.y-size.height-gap},{x:preferred.x,y:b.y+b.height+gap}
 ]),{x:6,y:6},{x:limits.x,y:6},{x:6,y:limits.y},{x:limits.x,y:limits.y}].map(clamp).filter(p=>!blockers.some(b=>overlaps(p,b)));
 return candidates.sort((a,b)=>Math.abs(a.x-preferred.x)+Math.abs(a.y-preferred.y)-Math.abs(b.x-preferred.x)-Math.abs(b.y-preferred.y))[0]||preferred;
}
