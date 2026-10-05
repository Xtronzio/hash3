// Axis locking keeps horizontal row actions separate from normal list scrolling.
export function swipeDirection(dx,dy,axis,threshold=44){
 const primary=axis==='x'?dx:dy,secondary=axis==='x'?dy:dx;
 return Math.abs(primary)>=threshold&&Math.abs(primary)>Math.abs(secondary)*1.4?Math.sign(primary):0;
}
export function bindGestures(root,{setRankingOpen}){
 let gesture=null,suppressUntil=0;
 const reveal=(row,open)=>{
  root.querySelectorAll('.saved-game.is-revealed').forEach(other=>{if(other!==row)reveal(other,false);});
  row.classList.toggle('is-revealed',open);
  const toggle=row.querySelector('[data-action="toggle-delete"]');
  toggle?.setAttribute('aria-expanded',String(open));
 };
 root.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||!e.isPrimary)return;
  const handle=e.target.closest('.ranking-toggle'),row=e.target.closest('.saved-game');
  if(!handle&&!row||e.target.closest('.delete-game-button'))return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,handle,row,locked:false};
 });
 root.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(!gesture.locked&&swipeDirection(dx,dy,gesture.handle?'y':'x',12)){
   gesture.locked=true;(gesture.handle||gesture.row).setPointerCapture(e.pointerId);
  }
  if(gesture.locked){e.preventDefault();suppressUntil=Date.now()+500;}
 },{passive:false});
 const end=(e,cancelled=false)=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  const current=gesture;gesture=null;
  if(!current.locked)return;
  suppressUntil=Date.now()+500;
  if(cancelled)return;
  const direction=swipeDirection(e.clientX-current.x,e.clientY-current.y,current.handle?'y':'x',current.handle?32:44);
  if(!direction)return;
  if(current.handle)setRankingOpen(direction>0);
  else reveal(current.row,direction<0);
 };
 root.addEventListener('pointerup',e=>end(e));
 root.addEventListener('pointercancel',e=>end(e,true));
 root.addEventListener('click',e=>{
  if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
  const toggle=e.target.closest('[data-action="toggle-delete"]');
  if(toggle){const row=toggle.closest('.saved-game');reveal(row,!row.classList.contains('is-revealed'));e.stopImmediatePropagation();}
 },true);
}
