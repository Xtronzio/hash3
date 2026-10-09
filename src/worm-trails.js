export function wormTrailParts(room){
 return (room.worms||[]).flatMap(w=>{
  const body=w.body||[];
  return body.map((p,i)=>({x:p.x,y:p.y,to:i+1<body.length?body[i+1]:null,id:w.id+':'+i,head:p.x===w.x&&p.y===w.y}));
 });
}
export function wormTrailMarkup(parts,{size=1,minX=0,minY=0,padding=0}={}){
 return parts.map(p=>{
  const x=(p.x-minX+.5)*size+padding,y=(p.y-minY+.5)*size+padding;
  const line=p.to?`<path d="M${x} ${y}L${(p.to.x-minX+.5)*size+padding} ${(p.to.y-minY+.5)*size+padding}"/>`:'';
  const dot=p.head?'':`<circle cx="${x}" cy="${y}" r="${size*.08}"/>`;
  return line+dot;
 }).join('');
}
