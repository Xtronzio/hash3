import {wildcardFill} from './wildcard-usage.js';
import {ecologyPinTargets,ecologyTargets,nextEcologyTarget,ecologyMapPins} from './ecology-navigation.js';
import {cellIndex} from './board-window.js';
import {frontierCells} from './frontiers.js';
import {overviewCells,mapCellSymbols,mapFrameMarkup,prepareMapRendering,mapWindowMarkup,MAP_SYMBOL_SCALE} from './map-render.js';
import {overviewModel,overviewPoint} from './map-overview.js';
import {fitOverview,clampCamera,zoomCamera,panCamera} from './map-camera.js';
import {immediateAbove} from './game.js';

// A snapshot is only drawn; inspecting it never dispatches a game command.
export function savedMapModel(room,own){
  if(!room||!Array.isArray(room.cells)||!Array.isArray(room.pairs)||!Array.isArray(room.terrain)&&!Array.isArray(room.blocks))return null;
  // Use the same ranking as the live board; the leader has no blue reference.
  const target=own?immediateAbove((room.players||[]).filter(p=>!p.bot),own.id,!!room.commonWorld):null;
  const model=overviewModel(room,own,target);if(!model)return null;
  const cells=new Map(room.cells.map(c=>[`${c.x},${c.y}`,c]));
  return {...model,ecologyPins:ecologyPinTargets(room,own?.id),ecologyTargets:Object.fromEntries(['rodent','rodent-plague','worm','worm-plague','build','destroy','bomb',...new Set([...(room.territoryEvents||[]),...(room.invasions||[])].map(e=>e.kind)),'neutral','frontier','border'].map(kind=>[kind,ecologyTargets(room,kind,own?.id)])),frontierCells:frontierCells(room),terrain:model.terrain.map(p=>{const c=cells.get(`${p.x},${p.y}`),isTarget=model.target&&p.x===Math.floor(model.target.x)&&p.y===Math.floor(model.target.y);return {...p,symbol:c?.symbol,fill:p.rodent?'var(--yellow)':isTarget?'var(--blue)':c?.symbol==='X'?'var(--red)':c?.symbol==='O'?'var(--green)':c?.symbol==='#'?wildcardFill(c):c?.symbol==='*'?'var(--yellow)':'#343e4c'};})};
}
export function thumbnailMarkup(room){
  const model=savedMapModel(room);if(!model)return '<span class="saved-map-pending" aria-label="Mapa no disponible">—</span>';
  const b=model.bounds;
  return `<svg viewBox="${b.x} ${b.y} ${b.width} ${b.height}" role="img" aria-label="Miniatura del tablero, ${model.terrain.length} casillas">${mapWindowMarkup(model,prepareMapRendering(model),b,0)}</svg>`;
}

export function inspectionCells(model){
 return overviewCells(model.terrain)+mapCellSymbols(model.terrain)+mapFrameMarkup(model)+(model.frontiers||'');
}

export function bindInspection(panel,model,state={},interacting=()=>{}){
  const svg=panel.querySelector('.inspection-canvas'),bounds=model.bounds;
  const prepared=prepareMapRendering(model);
  const pinIndex=cellIndex(model.ecologyPins||[]);
  svg.innerHTML='<g class="inspection-terrain"></g><g class="inspection-ecology"></g>';let lastWindow=null;
  let camera=state.box?clampCamera(state.box,bounds):{...bounds},fitted={...bounds},aspect=null,drag=null,pinch=null,frame=0,disposed=false;
  const pointers=new Map(),listeners=[];
  const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  const draw=()=>{
    frame=0;if(disposed||!svg.isConnected)return;
    const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;
    fitted=fitOverview(bounds,rect);const ratio=rect.width/rect.height;
    if(aspect!==ratio){
      camera=!state.box?{...fitted}:clampCamera({...camera,y:camera.y+camera.height/2-camera.width/ratio/2,height:camera.width/ratio},bounds);aspect=ratio;
    }
    state.box={...camera};
    const box={x:Math.floor(camera.x)-2,y:Math.floor(camera.y)-2,width:Math.ceil(camera.width)+4,height:Math.ceil(camera.height)+4},scale=rect.width/camera.width,key=JSON.stringify([box,scale>=MAP_SYMBOL_SCALE]);
    if(key!==lastWindow){
      lastWindow=key;svg.querySelector('.inspection-ecology').innerHTML=ecologyMapPins(pinIndex.query(box));
      const terrain=svg.querySelector('.inspection-terrain');
      terrain.innerHTML=mapWindowMarkup(model,prepared,box,scale);
    }
    for(const pin of svg.querySelectorAll('.ecology-map-pin'))pin.setAttribute('transform',`translate(${pin.dataset.x} ${pin.dataset.y}) scale(${1/scale})`);
    svg.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    svg.classList.toggle('show-symbols',rect.width/camera.width>=MAP_SYMBOL_SCALE);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const setCamera=next=>{camera=next;state.box={...next};schedule();};
  const center=()=>({x:camera.x+camera.width/2,y:camera.y+camera.height/2});
  const point=(x,y)=>overviewPoint(camera,svg.getBoundingClientRect(),x,y)||center();
  const focus=position=>{
    if(!position)return;const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const width=Math.min(fitted.width,Math.max(3,3*rect.width/rect.height,rect.width/36)),height=width*rect.height/rect.width;
    setCamera(clampCamera({x:position.x-width/2,y:position.y-height/2,width,height},bounds));
  };
  listen(panel,'click',e=>{
    const control=e.target.closest('[data-inspect-action]'),action=control?.dataset.inspectAction;if(!action)return;
    if(action==='target'){const p=model.watchTargets?.find(p=>p.id===control.dataset.id);control.closest('details')?.removeAttribute('open');if(p)focus({x:p.x+.5,y:p.y+.5});return;}
    if(action==='last-move'){const p=model.lastNavigationMove;control.closest('details')?.removeAttribute('open');if(p)focus({x:p.x+.5,y:p.y+.5});return;}
    if(action==='ecology'){const kind=control.dataset.ecologyKind,item=nextEcologyTarget(model.ecologyTargets?.[kind]||[],state[kind+'Id']);if(item){state[kind+'Id']=item.id;focus({x:item.x+.5,y:item.y+.5});}return;}
    if(action==='fit')setCamera({...fitted});
    if(action==='own'&&model.active)focus({x:model.active.x+1.5,y:model.active.y+1.5});
    if(action==='rival')focus(model.target);
    if(['rodent','bomb','worm','work'].includes(action)){
      const items=(model.habitats||model.terrain.flatMap(p=>p.rodent?[p.rodent]:[])).filter(p=>action==='work'?['build','destroy'].includes(p.kind):p.kind===action);
      if(items.length){const cursor=action+'Index';state[cursor]=(state[cursor]??-1)+1;const r=items[state[cursor]%items.length];focus({x:r.x+.5,y:r.y+.5});}
    }
  });
  listen(svg,'wheel',e=>{e.preventDefault();setCamera(zoomCamera(camera,bounds,Math.exp(Math.max(-1.2,Math.min(1.2,-e.deltaY*.003))),point(e.clientX,e.clientY),fitted));},{passive:false});
  listen(svg,'touchmove',e=>e.preventDefault(),{passive:false});
  const values=()=>[...pointers.values()],mid=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});
  listen(svg,'pointerdown',e=>{
    if(e.button!==0||pointers.size>=2)return;e.preventDefault();svg.focus({preventScroll:true});svg.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){interacting(true);drag={x:e.clientX,y:e.clientY,box:{...camera}};}
    else{const a=values(),m=mid(a);pinch={box:{...camera},mid:m,distance:Math.max(1,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),anchor:point(m.x,m.y)};drag=null;}
  });
  listen(svg,'pointermove',e=>{
    if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const rect=svg.getBoundingClientRect();
    if(pinch&&pointers.size===2){const a=values(),m=mid(a),next=zoomCamera(pinch.box,bounds,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/pinch.distance,pinch.anchor,fitted),scale=rect.width/next.width;if(scale)setCamera(panCamera(next,bounds,(pinch.mid.x-m.x)/scale,(pinch.mid.y-m.y)/scale));}
    else if(drag){const scale=rect.width/drag.box.width;if(scale)setCamera(panCamera(drag.box,bounds,(drag.x-e.clientX)/scale,(drag.y-e.clientY)/scale));}
  });
  const end=e=>{
    if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
    if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
    pinch=null;if(pointers.size)drag={...values()[0],box:{...camera}};else{drag=null;interacting(false);}
  };
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(svg,type,end);
  listen(svg,'keydown',e=>{
    const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(steps[e.key]){e.preventDefault();const [x,y]=steps[e.key];setCamera(panCamera(camera,bounds,x*camera.width*.15,y*camera.height*.15));}
    else if(['+','=','-'].includes(e.key)){e.preventDefault();setCamera(zoomCamera(camera,bounds,e.key==='-'?1/1.5:1.5,center(),fitted));}
    else if(e.key==='Home'){e.preventDefault();setCamera({...fitted});}
  });
  const observer=new ResizeObserver(schedule);observer.observe(svg);draw();
  return ()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);listeners.forEach(remove=>remove());if(pointers.size)interacting(false);pointers.clear();};
}
