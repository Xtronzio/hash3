import {overviewModel,overviewPoint,overviewView} from './map-overview.js';
import {fitOverview,clampCamera,zoomCamera,panCamera} from './map-camera.js';
export function overviewCells(terrain){return terrain.map(p=>`<rect x="${p.x+.07}" y="${p.y+.07}" width=".86" height=".86" rx=".06" fill="${p.fill}" ${p.eaten?'stroke="var(--yellow)" stroke-width=".09"':''}/>${p.rodent?`<text x="${p.x+.5}" y="${p.y+.64}" text-anchor="middle" font-size=".45" fill="${p.rodent.phase>=3?'var(--yellow)':'#08090b'}" font-weight="700">${p.rodent.eaten}</text>`:''}`).join('');}
export function bindMap({room,layout,zoom,target,own,changeZoom,interacting,onClose,mapState={}}){
  const viewport=document.querySelector('.viewport'),panel=document.querySelector('.world-map'),big=panel?.querySelector('.map-canvas');
  const model=overviewModel(room,own,target);if(!viewport||!big||!model)return;
  const {bounds,terrain,active,ownColor}=model;
  const mini=document.querySelector('.game-minimap svg');if(mini){mini.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);mini.innerHTML=overviewCells(terrain);}
  let fitted={...bounds},camera=mapState.box?clampCamera(mapState.box,bounds):{...bounds},aspect=null;
  big.innerHTML=overviewCells(terrain)+'<rect class="map-view" fill="#ffffff06" stroke="#e3e5e9" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>'+(active?`<rect x="${active.x}" y="${active.y}" width="3" height="3" rx=".08" fill="${ownColor}" fill-opacity=".12" stroke="${ownColor}" stroke-width="2.5" vector-effect="non-scaling-stroke"/><g class="map-own-pin"><circle r="7" fill="${ownColor}" stroke="#090d12" stroke-width="3"/><circle r="2" fill="#fff"/></g>`:'')+(model.target?'<g class="map-rival-pin"><path d="M0 -9 9 0 0 9 -9 0Z" fill="var(--blue)" stroke="#090d12" stroke-width="3"/></g>':'');
  panel.querySelector('.map-summary').textContent=`${terrain.length.toLocaleString('es-ES')} casillas · ${bounds.width-4} × ${bounds.height-4}`;
  const update=()=>{
    if(!big.isConnected){observer.disconnect();return;}
    const rect=big.getBoundingClientRect();
    if(rect.width&&rect.height){
      fitted=fitOverview(bounds,rect);
      const ratio=rect.width/rect.height;
      if(aspect!==ratio){
        if(!mapState.box)camera={...fitted};
        else camera=clampCamera({x:camera.x,y:camera.y+camera.height/2-camera.width/ratio/2,width:camera.width,height:camera.width/ratio},bounds);
        aspect=ratio;
      }
      mapState.box={...camera};
    }
    big.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    const view=overviewView(bounds,{x:(viewport.scrollLeft-layout.padding)/layout.size+layout.minX,y:(viewport.scrollTop-layout.padding)/layout.size+layout.minY,width:viewport.clientWidth/layout.size,height:viewport.clientHeight/layout.size});
    const box=big.querySelector('.map-view');for(const [k,v] of Object.entries(view))box.setAttribute(k,v);
    const scale=Math.min(rect.width/camera.width,rect.height/camera.height);
    if(scale>0){
      for(const [selector,position] of [['.map-own-pin',active?{x:active.x+1.5,y:active.y+1.5}:null],['.map-rival-pin',model.target]]){
        const pin=big.querySelector(selector);if(pin&&position)pin.setAttribute('transform',`translate(${position.x} ${position.y}) scale(${1/scale})`);
      }
      panel.querySelector('.map-scale').textContent=Math.round(fitted.width/camera.width*100)+'%';
    }
  };
  const setCamera=next=>{camera=next;mapState.box={...next};update();};
  const centerPoint=()=>({x:camera.x+camera.width/2,y:camera.y+camera.height/2});
  const jump=(clientX,clientY)=>{
    const point=overviewPoint(camera,big.getBoundingClientRect(),clientX,clientY);if(!point)return;
    viewport.scrollLeft=(point.x-layout.minX)*layout.size+layout.padding-viewport.clientWidth/2;
    viewport.scrollTop=(point.y-layout.minY)*layout.size+layout.padding-viewport.clientHeight/2;
    panel.hidden=true;onClose?.();document.querySelector('.game-minimap')?.focus({preventScroll:true});update();
  };
  panel.addEventListener('click',e=>{
    const action=e.target.closest('[data-map-action]')?.dataset.mapAction;if(!action)return;
    if(action==='fit')setCamera({...fitted});
    else setCamera(zoomCamera(camera,bounds,action==='plus'?1.5:1/1.5,centerPoint(),fitted));
  });
  big.addEventListener('wheel',e=>{
    e.preventDefault();const point=overviewPoint(camera,big.getBoundingClientRect(),e.clientX,e.clientY)||centerPoint();
    setCamera(zoomCamera(camera,bounds,Math.exp(Math.max(-1.2,Math.min(1.2,-e.deltaY*.003))),point,fitted));
  },{passive:false});
  big.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  const mapPointers=new Map();let mapDrag=null,mapPinch=null,mapMoved=false;
  const pairPoints=()=>[...mapPointers.values()],midpoint=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});
  big.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();big.setPointerCapture(e.pointerId);interacting(true);
    mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(mapPointers.size===1){mapDrag={x:e.clientX,y:e.clientY,box:{...camera}};mapMoved=false;}
    else if(mapPointers.size===2){const a=pairPoints(),mid=midpoint(a);mapPinch={box:{...camera},mid,distance:Math.max(1,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),anchor:overviewPoint(camera,big.getBoundingClientRect(),mid.x,mid.y)||centerPoint()};mapMoved=true;mapDrag=null;}
  });
  big.addEventListener('pointermove',e=>{
    if(!mapPointers.has(e.pointerId))return;e.preventDefault();mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const rect=big.getBoundingClientRect();
    if(mapPinch&&mapPointers.size===2){
      const a=pairPoints(),mid=midpoint(a),distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      const next=zoomCamera(mapPinch.box,bounds,distance/mapPinch.distance,mapPinch.anchor,fitted),scale=Math.min(rect.width/next.width,rect.height/next.height);
      if(scale)setCamera(panCamera(next,bounds,(mapPinch.mid.x-mid.x)/scale,(mapPinch.mid.y-mid.y)/scale));
    }else if(mapDrag){
      const dx=e.clientX-mapDrag.x,dy=e.clientY-mapDrag.y;if(Math.hypot(dx,dy)>6)mapMoved=true;
      if(mapMoved){const scale=Math.min(rect.width/mapDrag.box.width,rect.height/mapDrag.box.height);if(scale)setCamera(panCamera(mapDrag.box,bounds,-dx/scale,-dy/scale));}
    }
  });
  const endMap=(e,cancelled=false)=>{
    if(!mapPointers.has(e.pointerId))return;
    const tap=!cancelled&&!mapMoved&&mapPointers.size===1;
    mapPointers.delete(e.pointerId);
    if(big.hasPointerCapture(e.pointerId))big.releasePointerCapture(e.pointerId);
    if(!mapPointers.size){mapDrag=null;mapPinch=null;if(tap)jump(e.clientX,e.clientY);interacting(false);}
    else{const point=pairPoints()[0];mapDrag={...point,box:{...camera}};mapPinch=null;mapMoved=true;}
  };
  big.addEventListener('pointerup',e=>endMap(e));big.addEventListener('pointercancel',e=>endMap(e,true));big.addEventListener('lostpointercapture',e=>endMap(e,true));
  const observer=new ResizeObserver(update);observer.observe(big);
  viewport.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update);
  viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom=Math.max(.3,Math.min(2.2,zoom*Math.exp(-e.deltaY*.003)));changeZoom(zoom,true);}}, {passive:false});
  let drag=null,pinch=null,suppress=false;const pointers=new Map();
  viewport.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.game-minimap,.world-map'))return;interacting(true);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom};drag=null;suppress=true;interacting(true);for(const id of pointers.keys())viewport.setPointerCapture(id);}});
  viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()];const requested=Math.max(.3,Math.min(2.2,pinch.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/pinch.distance));zoom=requested;changeZoom(requested,true);update();return;}if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){suppress=true;interacting(true);viewport.setPointerCapture(e.pointerId);viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;update();}});
  const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;interacting(false);setTimeout(()=>suppress=false,100);}else{const a=[...pointers.values()][0];drag={x:a.x,y:a.y,left:viewport.scrollLeft,top:viewport.scrollTop};pinch=null;}};
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();}},{capture:true});
}
