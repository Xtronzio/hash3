import {overviewModel,overviewPoint,overviewView} from './map-overview.js';
export function bindMap({room,layout,zoom,target,own,changeZoom,interacting,onClose}){
  const viewport=document.querySelector('.viewport'),panel=document.querySelector('.world-map'),big=panel?.querySelector('svg');
  const model=overviewModel(room,own,target);if(!viewport||!big||!model)return;
  const {bounds,terrain,active,ownColor}=model;
  big.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  big.innerHTML=terrain.map(p=>`<rect x="${p.x+.07}" y="${p.y+.07}" width=".86" height=".86" rx=".06" fill="${p.fill}"/>`).join('')+'<rect class="map-view" fill="#ffffff06" stroke="#e3e5e9" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>'+(active?`<rect x="${active.x}" y="${active.y}" width="3" height="3" rx=".08" fill="${ownColor}" fill-opacity=".12" stroke="${ownColor}" stroke-width="2.5" vector-effect="non-scaling-stroke"/><g class="map-own-pin" transform="translate(${active.x+1.5} ${active.y+1.5})"><circle r="7" fill="${ownColor}" stroke="#090d12" stroke-width="3"/><circle r="2" fill="#fff"/></g>`:'')+(model.target?`<g class="map-rival-pin" transform="translate(${model.target.x} ${model.target.y})"><path d="M0 -9 9 0 0 9 -9 0Z" fill="var(--blue)" stroke="#090d12" stroke-width="3"/></g>`:'');
  panel.querySelector('.map-summary').textContent=`${terrain.length.toLocaleString('es-ES')} casillas · ${bounds.width-4} × ${bounds.height-4}`;
  const update=()=>{
    if(!big.isConnected){observer.disconnect();return;}
    const view=overviewView(bounds,{x:(viewport.scrollLeft-layout.padding)/layout.size+layout.minX,y:(viewport.scrollTop-layout.padding)/layout.size+layout.minY,width:viewport.clientWidth/layout.size,height:viewport.clientHeight/layout.size});
    const box=big.querySelector('.map-view');for(const [k,v] of Object.entries(view))box.setAttribute(k,v);
    const rect=big.getBoundingClientRect(),scale=Math.min(rect.width/bounds.width,rect.height/bounds.height);
    if(scale>0){for(const [selector,position] of [['.map-own-pin',active?{x:active.x+1.5,y:active.y+1.5}:null],['.map-rival-pin',model.target]]){const pin=big.querySelector(selector);if(pin&&position)pin.setAttribute('transform',`translate(${position.x} ${position.y}) scale(${1/scale})`);}}
  };
  const observer=new ResizeObserver(update);observer.observe(big);
  viewport.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update);
  big.addEventListener('click',e=>{const point=overviewPoint(bounds,big.getBoundingClientRect(),e.clientX,e.clientY);if(!point)return;viewport.scrollLeft=(point.x-layout.minX)*layout.size+layout.padding-viewport.clientWidth/2;viewport.scrollTop=(point.y-layout.minY)*layout.size+layout.padding-viewport.clientHeight/2;panel.hidden=true;onClose?.();document.querySelector('.game-minimap')?.focus({preventScroll:true});update();});
  let drag=null,pinch=null,suppress=false;const pointers=new Map();
  viewport.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.game-minimap,.world-map'))return;interacting(true);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom};drag=null;suppress=true;interacting(true);for(const id of pointers.keys())viewport.setPointerCapture(id);}});
  viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()];const requested=Math.max(.3,Math.min(2.2,pinch.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/pinch.distance));zoom=requested;changeZoom(requested,true);update();return;}if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){suppress=true;interacting(true);viewport.setPointerCapture(e.pointerId);viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;update();}});
  const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;interacting(false);setTimeout(()=>suppress=false,100);}else{const a=[...pointers.values()][0];drag={x:a.x,y:a.y,left:viewport.scrollLeft,top:viewport.scrollTop};pinch=null;}};
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();}},{capture:true});
}
