export function animateInventoryAction(root,previous,next){
 const event=next?.lastEvent;
 if(!previous||previous.id!==next.id||event?.id===previous.lastEvent?.id||!event?.tool||next.status!=='playing'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const name=event.tool;
 for(const node of root.querySelectorAll(`[data-tool="${name}"], [data-used-tool="${name}"], [data-dock-card="${name}"]`)){
  if(node.closest('.inventory-description-panel')||!node.offsetWidth||!node.offsetHeight)continue;
  node.animate?.([{transform:'scale(.8)',filter:'brightness(1.8)'},{transform:'scale(1.12)',filter:'brightness(1.4)',offset:.45},{transform:'scale(1)',filter:'brightness(1)'}],{duration:700,easing:'ease-out'});
 }
}
