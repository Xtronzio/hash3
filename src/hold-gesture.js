// A deliberate gesture completes once; cancellation never triggers the action.
export function bindHoldGesture(root,{selector,duration,onComplete}){
 let hold=null;
 const listeners=[];
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const cancel=()=>{if(!hold)return;clearTimeout(hold.timer);hold.button.classList.remove('is-holding');hold=null;};
 const begin=(button,point)=>{
  cancel();if(button.disabled)return;
  hold={button,point};button.style.setProperty('--hold-duration',duration+'ms');button.classList.add('is-holding');
  hold.timer=setTimeout(()=>{if(!hold||!button.isConnected||button.disabled){cancel();return;}cancel();onComplete(button);},duration);
 };
 listen(root,'pointerdown',e=>{const button=e.target.closest(selector);if(button&&e.isPrimary&&e.button===0){e.preventDefault();begin(button,{x:e.clientX,y:e.clientY,id:e.pointerId});}},true);
 listen(root,'pointermove',e=>{if(hold?.point&&e.pointerId===hold.point.id&&Math.hypot(e.clientX-hold.point.x,e.clientY-hold.point.y)>8)cancel();},true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(window,event,cancel,true);
 listen(document,'scroll',cancel,true);listen(window,'blur',cancel);listen(document,'visibilitychange',cancel);
 listen(root,'keydown',e=>{const button=e.target.closest(selector);if(!button)return;if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)begin(button,null);}else cancel();},true);
 listen(root,'keyup',e=>{if([' ','Enter'].includes(e.key))cancel();},true);
 listen(root,'click',e=>{if(e.target.closest(selector)){e.preventDefault();e.stopImmediatePropagation();}},true);
 return ()=>{cancel();listeners.forEach(fn=>fn());};
}
