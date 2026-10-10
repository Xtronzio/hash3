import {immunityActionsMarkup} from './inventory.js';

export function floatingImmunityMarkup(game){
 if(game.status!=='playing')return '';
 return immunityActionsMarkup(game).replace(/(<button[^>]*data-player="([^"]+)"[^>]*>[\s\S]*?<\/button>)/g,(_,button,player)=>`<div class="floating-immunity" data-floating-player="${player}"><span class="immunity-drag-handle" aria-label="Arrastrar Inmunidad" title="Arrastra para mover Inmunidad">⠿</span>${button}</div>`);
}
export const clampRatio=value=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
export function bindFloatingImmunity(surface,gameId){
 if(!surface)return ()=>{};
 const cleanups=[];
 for(const [index,node] of [...surface.querySelectorAll('.floating-immunity')].entries()){
  const storageKey=`hash3_immunity_position:${gameId}:${node.dataset.floatingPlayer}`;
  let position={x:0,y:index?0.45:0.18},gesture=null,moved=false;
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved)position={x:clampRatio(saved.x),y:clampRatio(saved.y)};}catch{}
  const bounds=()=>({x:Math.max(0,surface.clientWidth-node.offsetWidth-12),y:Math.max(0,surface.clientHeight-node.offsetHeight-12)});
  const paint=()=>{const b=bounds();node.style.left=`${6+position.x*b.x}px`;node.style.top=`${6+position.y*b.y}px`;};
  paint();
  const down=e=>{if(e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,position:{...position}};moved=false;e.target.setPointerCapture?.(e.pointerId);e.stopPropagation();};
  const move=e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(!moved&&Math.hypot(dx,dy)<6)return;
   moved=true;node.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();
   const b=bounds();position={x:clampRatio(gesture.position.x+dx/(b.x||1)),y:clampRatio(gesture.position.y+dy/(b.y||1))};paint();
  };
  const end=e=>{if(!gesture||gesture.id!==e.pointerId)return;e.stopPropagation();gesture=null;if(moved)try{localStorage.setItem(storageKey,JSON.stringify(position));}catch{};};
  const click=e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}};
  node.addEventListener('pointerdown',down);node.addEventListener('pointermove',move);node.addEventListener('pointerup',end);node.addEventListener('pointercancel',end);node.addEventListener('click',click,true);
  const resize=new ResizeObserver(paint);resize.observe(surface);
  cleanups.push(()=>{resize.disconnect();node.removeEventListener('pointerdown',down);node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',end);node.removeEventListener('pointercancel',end);node.removeEventListener('click',click,true);});
 }
 return ()=>cleanups.forEach(fn=>fn());
}
