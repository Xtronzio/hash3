import {TRADE_HOLD_MS} from './inventory-economy.js';
// One deliberate purchase per gesture. Cancel on drag, scroll, blur or hiding.
export function bindTradeHold(root,onBuy){
 let hold=null;
 const cancel=()=>{if(!hold)return;clearTimeout(hold.timer);hold.button.classList.remove('is-holding');hold=null;};
 const begin=(button,point)=>{
  cancel();if(button.disabled)return;
  hold={button,point};button.classList.add('is-holding');
  hold.timer=setTimeout(()=>{if(!hold||!button.isConnected){cancel();return;}const tool=button.dataset.tradeTool,playerId=button.dataset.player;cancel();onBuy({tool,playerId});},TRADE_HOLD_MS);
 };
 root.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-action="trade-hold"]');if(button&&e.isPrimary&&e.button===0){e.preventDefault();begin(button,{x:e.clientX,y:e.clientY});}});
 root.addEventListener('pointermove',e=>{if(hold?.point&&Math.hypot(e.clientX-hold.point.x,e.clientY-hold.point.y)>8)cancel();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,cancel);
 document.addEventListener('scroll',cancel,true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);
 root.addEventListener('keydown',e=>{const button=e.target.closest('[data-action="trade-hold"]');if(!button)return;if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)begin(button,null);}else cancel();});
 root.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key))cancel();});
 root.addEventListener('click',e=>{if(e.target.closest('[data-action="trade-hold"]')){e.preventDefault();e.stopImmediatePropagation();}},true);
 return cancel;
}
