// Build once per game snapshot; navigation visits only nearby spatial buckets.
export function cellIndex(items,chunk=16){
 const buckets=new Map();
 for(const p of items){const k=`${Math.floor(p.x/chunk)},${Math.floor(p.y/chunk)}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);}
 return {query(box){
  const left=Math.floor(box.x/chunk),top=Math.floor(box.y/chunk),right=Math.floor((box.x+box.width)/chunk),bottom=Math.floor((box.y+box.height)/chunk);
  const found=[];
  const add=list=>{for(const p of list||[])if(p.x+1>box.x&&p.y+1>box.y&&p.x<box.x+box.width&&p.y<box.y+box.height)found.push(p);};
  if((right-left+1)*(bottom-top+1)>buckets.size){for(const list of buckets.values())add(list);}
  else for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)add(buckets.get(`${x},${y}`));
  return found;
 }};
}
export function viewportWindow(viewport,layout,margin=2){
 const factor=layout.previewScale||1,size=layout.size*factor;
 return {x:layout.minX+(viewport.scrollLeft-layout.padding*factor)/size-margin,y:layout.minY+(viewport.scrollTop-layout.padding*factor)/size-margin,width:viewport.clientWidth/size+2*margin,height:viewport.clientHeight/size+2*margin};
}
// Keep overlapping nodes intact, including a focused cell. No full board HTML
// replacement during pan or pinch; remove only cells that leave the window.
export function reconcileCells(container,entries,previous=new Map()){
 const wanted=new Set(entries.map(e=>e.id));
 for(const [id,item] of previous)if(!wanted.has(id)){item.node.remove();previous.delete(id);}
 for(const entry of entries){
  const old=previous.get(entry.id);if(old?.markup===entry.markup)continue;
  const template=container.ownerDocument.createElement('template');template.innerHTML=entry.markup;const node=template.content.firstElementChild;
  if(old)old.node.replaceWith(node);else container.append(node);
  previous.set(entry.id,{node,markup:entry.markup});
 }
 return previous;
}
