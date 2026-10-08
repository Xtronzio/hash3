import {cellIndex,overviewGrid,frontierOverviewGrid} from './board-window.js';
import {frontierCells,frontierMarkup} from './frontiers.js';
import {overviewCells} from './map.js';
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
  return {...model,frontierCells:frontierCells(room),terrain:model.terrain.map(p=>{const c=cells.get(`${p.x},${p.y}`),isTarget=model.target&&p.x===Math.floor(model.target.x)&&p.y===Math.floor(model.target.y);return {...p,symbol:c?.symbol,fill:p.rodent?'var(--yellow)':isTarget?'var(--blue)':c?.symbol==='X'?'var(--red)':c?.symbol==='O'?'var(--green)':c?.symbol==='#'?'#c5cbd4':'#343e4c'};})};
}
export function thumbnailMarkup(room){
  const model=savedMapModel(room);if(!model)return '<span class="saved-map-pending" aria-label="Mapa no disponible">—</span>';
  const paths=new Map();
  for(const p of model.terrain){const part=`M${p.x+.07} ${p.y+.07}h.86v.86h-.86Z`;paths.set(p.fill,(paths.get(p.fill)||'')+part);}
  const b=model.bounds;
  return `<svg viewBox="${b.x} ${b.y} ${b.width} ${b.height}" role="img" aria-label="Miniatura del tablero, ${model.terrain.length} casillas">${[...paths].map(([fill,d])=>`<path fill="${fill}" d="${d}"/>`).join('')}${model.frontiers||''}</svg>`;
}
export function inspectionCells(model){
  return model.terrain.map(p=>`<rect x="${p.x+.05}" y="${p.y+.05}" width=".9" height=".9" rx=".04" fill="${p.fill}" ${p.eaten?'stroke="var(--yellow)" stroke-width=".08"':''}/>`).join('')+
    `<g class="inspection-symbols" fill="none" stroke="#08090b" stroke-width=".1" stroke-linecap="round">${model.terrain.map(p=>p.symbol==='X'?`<path d="M${p.x+.25} ${p.y+.25}l.5 .5m0-.5-.5 .5"/>`:p.symbol==='O'?`<circle cx="${p.x+.5}" cy="${p.y+.5}" r=".27"/>`:p.symbol==='#'?`<path data-symbol="#" d="M${p.x+.4} ${p.y+.2}l-.1 .6m.4-.6-.1 .6M${p.x+.2} ${p.y+.4}h.6m-.6 .2h.6"/>`:'').join('')}</g>`+
    model.terrain.filter(p=>p.rodent).map(p=>`<circle cx="${p.x+.5}" cy="${p.y+.5}" r=".3" fill="none" stroke="#08090b" stroke-width=".12"/>`).join('')+
    (model.active?`<rect x="${model.active.x}" y="${model.active.y}" width="3" height="3" fill="none" stroke="#e3e5e9" stroke-width="2" vector-effect="non-scaling-stroke"/>`:'')+
    (model.target?`<rect class="inspection-rival" x="${Math.floor(model.target.x)}" y="${Math.floor(model.target.y)}" width="1" height="1" fill="none" stroke="var(--blue)" stroke-width="3" vector-effect="non-scaling-stroke"><title>Referencia del rival superior</title></rect>`:'')+(model.frontiers||'');
}

export function bindInspection(panel,model,state={},interacting=()=>{}){
  const svg=panel.querySelector('.inspection-canvas'),bounds=model.bounds;
  const terrainIndex=cellIndex(model.terrain),coarse=overviewGrid(model.terrain,bounds);
  // Both layers share the camera; preparation is once per snapshot, never during pan.
  const barrierCells=model.frontierCells||[],barrierIndex=cellIndex(barrierCells),barrierGrid=frontierOverviewGrid(barrierCells,bounds);
  svg.innerHTML='<g class="inspection-terrain"></g>';let lastWindow=null;
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
    const box={x:Math.floor(camera.x)-2,y:Math.floor(camera.y)-2,width:Math.ceil(camera.width)+4,height:Math.ceil(camera.height)+4},detail=box.width*box.height<=4096,key=JSON.stringify([box,detail]);
    if(key!==lastWindow){
      lastWindow=key;
      const terrain=svg.querySelector('.inspection-terrain');
      if(detail)terrain.innerHTML=inspectionCells({...model,terrain:terrainIndex.query(box),frontiers:frontierMarkup({frontiers:[{cells:barrierIndex.query(box)}]})});
      else terrain.innerHTML=overviewCells([...coarse.query(box),...barrierGrid.query(box).map(c=>({...c,frontier:true,fill:'#b88bff'}))])+inspectionCells({...model,terrain:[],frontiers:''});
    }
    svg.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    svg.classList.toggle('show-symbols',rect.width/camera.width>=14);
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
    const action=e.target.closest('[data-inspect-action]')?.dataset.inspectAction;if(!action)return;
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
