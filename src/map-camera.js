export function terrainBounds(terrain){
  let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
  for(const c of terrain){x=Math.min(x,c.x);y=Math.min(y,c.y);right=Math.max(right,c.x+1);bottom=Math.max(bottom,c.y+1);}
  return terrain.length?{x,y,width:right-x,height:bottom-y}:null;
}
export function extensionView(terrain,viewport,baseSize=56){
  const b=terrainBounds(terrain);if(!b)return null;
  const ideal=Math.min(Math.max(1,viewport.width-40)/b.width,Math.max(1,viewport.height-40)/b.height);
  const size=Math.max(18,Math.min(baseSize*1.6,ideal));
  return {zoom:size/baseSize,capped:ideal<18,x:b.x+b.width/2-.5,y:b.y+b.height/2-.5};
}
export function fitOverview(bounds,rect){
  if(!rect.width||!rect.height)return {...bounds};
  const scale=Math.min(rect.width/bounds.width,rect.height/bounds.height),width=rect.width/scale,height=rect.height/scale;
  return {x:bounds.x+(bounds.width-width)/2,y:bounds.y+(bounds.height-height)/2,width,height};
}
export function clampCamera(box,bounds){
  const axis=(value,size,start,total)=>size>=total?start+(total-size)/2:Math.max(start,Math.min(start+total-size,value));
  return {...box,x:axis(box.x,box.width,bounds.x,bounds.width),y:axis(box.y,box.height,bounds.y,bounds.height)};
}
export function zoomCamera(box,bounds,factor,anchor,fitted){
  const scale=Math.max(3/box.width,3/box.height,Math.min(1/Math.max(.01,factor),fitted.width/box.width,fitted.height/box.height));
  return clampCamera({x:anchor.x-(anchor.x-box.x)*scale,y:anchor.y-(anchor.y-box.y)*scale,width:box.width*scale,height:box.height*scale},bounds);
}
export function panCamera(box,bounds,dx,dy){return clampCamera({...box,x:box.x+dx,y:box.y+dy},bounds);}
