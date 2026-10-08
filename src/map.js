import {habitatMapPins} from './inhabitants.js';
import {bindBoardNavigation} from './board-navigation.js';
import {overviewModel,overviewPoint,overviewView} from './map-overview.js';
import {fitOverview,clampCamera,zoomCamera,panCamera} from './map-camera.js';
import {rodentIcon,rodentSleeping} from './rodents.js';
import {frontierCells} from './frontiers.js';
import {cellIndex,overviewGrid} from './board-window.js';
export function overviewCells(terrain){
 const paths=new Map();
 for(const p of terrain){const group=p.fill+(p.eaten?' eaten':''),part=p.frontier&&!p.width?`M${p.x+.5} ${p.y+.08}l.42 .42-.42 .42-.42-.42Z`:`M${p.x+.07} ${p.y+.07}h${(p.width||1)-.14}v${(p.height||1)-.14}h-${(p.width||1)-.14}Z`;if(!paths.has(group))paths.set(group,{fill:p.fill,eaten:p.eaten,d:''});paths.get(group).d+=part;}
 return [...paths.values()].map(p=>`<path fill="${p.fill}" d="${p.d}" ${p.eaten?'stroke="var(--yellow)" stroke-width=".09"':''}/>`).join('');
}
export function bindMap({room,layout,zoom,target,own,changeZoom,interacting,onClose,onNavigate=()=>{},mapState={}}){
  const viewport=document.querySelector('.viewport'),panel=document.querySelector('.world-map'),big=panel?.querySelector('.map-canvas');
  const model=overviewModel(room,own,target,{includeFrontiers:false});if(!viewport||!big||!model)return;
  const {bounds,terrain,active,ownColor}=model;
  const visual=[...terrain,...frontierCells(room).map(c=>({...c,frontier:true,fill:'#b88bff'}))],grid=overviewGrid(visual,bounds),detailIndex=cellIndex(visual);
  const mini=document.querySelector('.game-minimap svg');if(mini){mini.setAttribute('viewBox',`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);mini.innerHTML=overviewCells(grid.query(bounds));}
  let fitted={...bounds},camera=mapState.box?clampCamera(mapState.box,bounds):{...bounds},aspect=null;
  let initialized=false,lastTerrainWindow=null;
  const initialize=()=>{if(initialized)return;initialized=true;
  big.innerHTML='<g class="map-terrain"></g>'+'<rect class="map-view" fill="#ffffff06" stroke="#e3e5e9" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>'+(active?`<rect x="${active.x}" y="${active.y}" width="3" height="3" rx=".08" fill="${ownColor}" fill-opacity=".12" stroke="#e3e5e9" stroke-width="2.5" vector-effect="non-scaling-stroke"/><g class="map-own-pin"><circle r="7" fill="${ownColor}" stroke="#090d12" stroke-width="3"/><circle r="2" fill="#fff"/></g>`:'')+(model.target?'<g class="map-rival-pin"><path d="M0 -9 9 0 0 9 -9 0Z" fill="var(--blue)" stroke="#090d12" stroke-width="3"/></g>':'');
  panel.querySelector('.map-summary').innerHTML=`${terrain.length.toLocaleString('es-ES')} casillas <span class="map-dimensions">· ${bounds.width-4} × ${bounds.height-4}</span>`;
  big.insertAdjacentHTML('beforeend',habitatMapPins(room));
  };
  const update=(immediate=false)=>{
    onNavigate(immediate===true);
    if(!big.isConnected){observer.disconnect();return;}
    if(panel.hidden)return;
    initialize();
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
    const window={x:Math.floor(camera.x)-1,y:Math.floor(camera.y)-1,width:Math.ceil(camera.width)+2,height:Math.ceil(camera.height)+2};
    const windowKey=JSON.stringify(window);
    if(windowKey!==lastTerrainWindow){lastTerrainWindow=windowKey;big.querySelector('.map-terrain').innerHTML=overviewCells(window.width*window.height<=20000?detailIndex.query(window):grid.query(window));}
    big.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    const view=overviewView(bounds,{x:(viewport.scrollLeft-layout.padding)/layout.size+layout.minX,y:(viewport.scrollTop-layout.padding)/layout.size+layout.minY,width:viewport.clientWidth/layout.size,height:viewport.clientHeight/layout.size});
    const box=big.querySelector('.map-view');for(const [k,v] of Object.entries(view))box.setAttribute(k,v);
    const scale=Math.min(rect.width/camera.width,rect.height/camera.height);
    if(scale>0){
      for(const [selector,position] of [['.map-own-pin',active?{x:active.x+1.5,y:active.y+1.5}:null],['.map-rival-pin',model.target]]){
        const pin=big.querySelector(selector);if(pin&&position)pin.setAttribute('transform',`translate(${position.x} ${position.y}) scale(${1/scale})`);
      }
      for(const pin of big.querySelectorAll('.map-rodent-pin'))pin.setAttribute('transform',`translate(${pin.dataset.x} ${pin.dataset.y}) scale(${1/scale})`);
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
  const open=()=>update();panel.addEventListener('map-open',open);
  const observer=new ResizeObserver(update);observer.observe(big);
  viewport.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update);
  const disposeNavigation=bindBoardNavigation({viewport,layout,zoom,changeZoom,interacting,update:()=>update(true)});
  return ()=>{panel.removeEventListener('map-open',open);observer.disconnect();viewport.removeEventListener('scroll',update);disposeNavigation?.();};
}
