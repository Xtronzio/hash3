// Axis locking keeps horizontal row actions separate from normal list scrolling.
export function swipeDirection(dx,dy,axis,threshold=44){
 const primary=axis==='x'?dx:dy,secondary=axis==='x'?dy:dx;
 return Math.abs(primary)>=threshold&&Math.abs(primary)>Math.abs(secondary)*1.4?Math.sign(primary):0;
}
export function bindGestures(root,{setRankingOpen,onSelectGame,isSelecting=()=>false}){
 let gesture=null,suppressUntil=0,holdTimer=null;
 const cancelHold=()=>{clearTimeout(holdTimer);holdTimer=null;};
 const reveal=(row,open)=>{
  if(open===true&&row.classList.contains('is-pinned'))open=false;
  root.querySelectorAll('.saved-game.is-revealed,.saved-game.is-pin-revealed').forEach(other=>{if(other!==row)reveal(other,false);});
  row.classList.toggle('is-revealed',open===true);
  row.classList.toggle('is-pin-revealed',open==='pin');
  const toggle=row.querySelector('[data-action="toggle-delete"]');
  toggle?.setAttribute('aria-expanded',String(open));
 };
 root.addEventListener('pointerdown',e=>{
  if(!e.isPrimary){cancelHold();gesture=null;return;}
  if(e.pointerType==='mouse')return;
  const handle=e.target.closest('.ranking-toggle'),row=e.target.closest('.saved-game');
  cancelHold();gesture=null;if(!handle&&!row||e.target.closest('.delete-game-button,.pin-game-button')||row&&isSelecting())return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,handle,row,locked:false,held:false};
  if(row&&onSelectGame&&!row.classList.contains('is-pinned')&&e.target.closest('.saved-game-open')){
   holdTimer=setTimeout(()=>{if(!gesture||gesture.locked)return;gesture.held=true;suppressUntil=Date.now()+800;onSelectGame(row);},550);
  }
 });
 root.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(Math.hypot(dx,dy)>10)cancelHold();
  if(gesture.held){e.preventDefault();return;}
  if(!gesture.locked&&swipeDirection(dx,dy,gesture.handle?'y':'x',12)){
   gesture.locked=true;(gesture.handle||gesture.row).setPointerCapture(e.pointerId);
  }
  if(gesture.locked){e.preventDefault();suppressUntil=Date.now()+500;}
 },{passive:false});
 const end=(e,cancelled=false)=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  cancelHold();const current=gesture;gesture=null;
  if(current.held){suppressUntil=Date.now()+500;return;}
  if(!current.locked)return;
  suppressUntil=Date.now()+500;
  if(cancelled)return;
  const direction=swipeDirection(e.clientX-current.x,e.clientY-current.y,current.handle?'y':'x',current.handle?32:44);
  if(!direction)return;
  if(current.handle)setRankingOpen(direction>0);
  else if(direction<0)reveal(current.row,current.row.classList.contains('is-pin-revealed')?false:true);
  else if(current.row.classList.contains('is-revealed'))reveal(current.row,false);
  else reveal(current.row,'pin');
 };
 root.addEventListener('pointerup',e=>end(e));
 root.addEventListener('pointercancel',e=>end(e,true));
 root.addEventListener('contextmenu',e=>{if(gesture?.held){e.preventDefault();}});
 root.addEventListener('click',e=>{
  if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
  const toggle=e.target.closest('[data-action="toggle-delete"]');
  if(toggle){const row=toggle.closest('.saved-game');reveal(row,!row.classList.contains('is-revealed'));e.stopImmediatePropagation();}
 },true);
}
