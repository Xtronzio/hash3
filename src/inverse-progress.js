export const filledInverse=room=>room?.variant==='inverse'&&[2,3].includes(room.inverseVersion);
export const fillKey=(x,y)=>`${x},${y}`;
export const inverseFillSet=room=>new Set(filledInverse(room)?room.inverseFill:[]);
export function payingInverseFigures(room,figures,remaining=inverseFillSet(room)){
 if(!filledInverse(room))return figures;
 return figures.filter(f=>f.points.some(([x,y])=>remaining.has(fillKey(x,y))));
}
export function clearInverseFill(room,figures){
 if(!filledInverse(room))return [];
 const hits=new Set(figures.flatMap(f=>f.points.map(([x,y])=>fillKey(x,y))));
 const cleared=room.inverseFill.filter(k=>hits.has(k));
 room.inverseFill=room.inverseFill.filter(k=>!hits.has(k));
 room.inverseCleared=room.terrain.length-room.inverseFill.length;return cleared;
}
export function inverseBoundary(terrain){
 const known=new Set(terrain.map(c=>fillKey(c.x,c.y)));
 return terrain.flatMap(c=>{const sides=[[0,-1,'top'],[1,0,'right'],[0,1,'bottom'],[-1,0,'left']].filter(([dx,dy])=>!known.has(fillKey(c.x+dx,c.y+dy))).map(s=>s[2]);return sides.length?[{...c,sides}]:[];});
}
export function inverseBoundaryPath(points){
 return points.flatMap(c=>c.sides.map(side=>side==='top'?`M${c.x} ${c.y}h1`:side==='right'?`M${c.x+1} ${c.y}v1`:side==='bottom'?`M${c.x} ${c.y+1}h1`:`M${c.x} ${c.y}v1`)).join('');
}
