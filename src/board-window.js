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
// A subcell pan moves existing nodes through native scrolling. Only crossing
// a cell edge or resizing requires rebuilding the visible spatial window.
export function viewportCellWindow(viewport,layout){
 const box=viewportWindow(viewport,layout),x=Math.floor(box.x),y=Math.floor(box.y);
 return {x,y,width:Math.ceil(box.x+box.width)-x,height:Math.ceil(box.y+box.height)-y};
}
// Cache only the last visible window. Reuse overlapping cell markup, without
// accumulating the whole board as the player travels across it.
export function cachedCellWindow(index,markup){
 let lastKey=null,lastRevision=null,entries=[],cache=new Map();
 return {query(box,revision=null){
  const nextKey=`${box.x},${box.y},${box.width},${box.height}`;
  if(nextKey===lastKey&&revision===lastRevision)return entries;
  if(revision!==lastRevision)cache.clear();
  const nextCache=new Map();
  entries=index.query(box).map(pos=>{
   const id=`cell:${pos.x},${pos.y}`,entry=cache.get(id)||{id,markup:markup(pos)};
   nextCache.set(id,entry);return entry;
  });
  cache=nextCache;lastKey=nextKey;lastRevision=revision;return entries;
 }};
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
