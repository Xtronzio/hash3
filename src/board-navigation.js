// Keep the cell DOM intact while the fingers move. Commit one logical zoom
// when the pinch finishes, with the same world point beneath its midpoint.
export function bindBoardNavigation({viewport,layout,zoom,changeZoom,interacting,update}){
 const board=viewport.querySelector('.board'),space=board?.parentElement;
 if(!board||!space)return;
 const pointers=new Map();let drag=null,pinch=null,wheel=null,frame=0,wheelTimer=0,suppressUntil=0;
 const clamp=value=>Math.max(.3,Math.min(2.2,value));
 const midpoint=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
 const distance=()=>{const [a,b]=[...pointers.values()];return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));};
 const screen=point=>{const r=viewport.getBoundingClientRect();return {x:point.x-r.left-viewport.clientLeft,y:point.y-r.top-viewport.clientTop};};
 const start=(point)=>{
  const local=screen(point),pixel={x:viewport.scrollLeft+local.x,y:viewport.scrollTop+local.y};
  space.classList.add('is-navigating');
  return {baseZoom:zoom,requested:zoom,pixel,screen:local,width:parseFloat(board.style.width),height:parseFloat(board.style.height),point:{x:layout.minX+(pixel.x-layout.padding)/layout.size,y:layout.minY+(pixel.y-layout.padding)/layout.size}};
 };
 const preview=()=>{
  frame=0;const state=pinch||wheel;if(!state||!viewport.isConnected)return;
  const factor=state.requested/state.baseZoom;
  space.style.width=`${state.width*factor}px`;space.style.height=`${state.height*factor}px`;
  board.style.transform=`scale(${factor})`;
  viewport.scrollLeft=state.pixel.x*factor-state.screen.x;viewport.scrollTop=state.pixel.y*factor-state.screen.y;
  update();
 };
 const queue=()=>{if(!frame)frame=requestAnimationFrame(preview);};
 const commit=state=>{
  if(frame){cancelAnimationFrame(frame);frame=0;}
  if(!state||!viewport.isConnected)return;
  board.style.transform='';space.classList.remove('is-navigating');
  zoom=state.requested;
  changeZoom(zoom,true,{point:state.point,screen:state.screen});update();
 };
 const finishWheel=()=>{
  clearTimeout(wheelTimer);const state=wheel;wheel=null;if(!state)return;
  commit(state);if(!pointers.size)interacting(false);
 };
 viewport.addEventListener('wheel',e=>{
  if(!e.ctrlKey&&!e.metaKey||pinch)return;
  e.preventDefault();if(!wheel){wheel=start({x:e.clientX,y:e.clientY});interacting(true);}
  wheel.requested=clamp(wheel.requested*Math.exp(Math.max(-1,Math.min(1,-e.deltaY*.003))));queue();
  clearTimeout(wheelTimer);wheelTimer=setTimeout(finishWheel,120);
 },{passive:false});
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0||pointers.size>=2||e.target.closest('.game-minimap,.world-map'))return;
  finishWheel();interacting(true);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
  if(pointers.size===2){pinch={...start(midpoint()),distance:distance()};drag=null;suppressUntil=Infinity;for(const id of pointers.keys())viewport.setPointerCapture(id);}
 });
 viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&pointers.size>=2){e.preventDefault();pinch.requested=clamp(pinch.baseZoom*distance()/pinch.distance);pinch.screen=screen(midpoint());queue();return;}
  if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){
   e.preventDefault();suppressUntil=Infinity;viewport.setPointerCapture(e.pointerId);
   viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;update();
  }
 },{passive:false});
 const end=e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);
  if(pinch&&pointers.size<2){const state=pinch;pinch=null;commit(state);}
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(!pointers.size){drag=null;if(suppressUntil===Infinity)suppressUntil=Date.now()+180;interacting(false);}
  else{const a=[...pointers.values()][0];drag={x:a.x,y:a.y,left:viewport.scrollLeft,top:viewport.scrollTop};}
 };
 viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);
 viewport.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.stopPropagation();e.preventDefault();}},{capture:true});
}
