import {FEEDBACK_PULSE_MS} from './cell-effect-markup.js';
const actions=new Map(),DURATION=FEEDBACK_PULSE_MS,ITERATIONS=3;
let actionRoom=null;
const frames=[{filter:'brightness(1)',boxShadow:'0 0 0 transparent'},{filter:'brightness(1.65)',boxShadow:'0 0 12px #00e5ff88, inset 0 0 8px #00e5ff55',offset:.5},{filter:'brightness(1)',boxShadow:'0 0 0 transparent'}];
export function resumeInventoryAnimations(root,game){
 if(actionRoom!==game?.id||game?.status!=='playing'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){actions.clear();actionRoom=game?.id;return;}
 const now=performance.now();for(const [key,started] of actions)if(now-started>=DURATION*ITERATIONS)actions.delete(key);
 if(!actions.size)return;
 for(const node of root.querySelectorAll('[data-tool], [data-used-tool], [data-dock-card], [data-inventory-effect]')){
  const player=node.dataset.player||node.dataset.usedPlayer||node.dataset.dockPlayer||node.dataset.effectPlayer,tool=node.dataset.tool||node.dataset.usedTool||node.dataset.dockCard||node.dataset.inventoryEffect;
  const started=actions.get(player+'|'+tool);
  if(started==null||node.closest('.inventory-sheet')||!node.offsetWidth||!node.offsetHeight||node.getAnimations?.().some(a=>a.id==='inventory-action-glow'))continue;
  const animation=node.animate?.(frames,{duration:DURATION,iterations:ITERATIONS,delay:started-now,easing:'ease-in-out'});if(animation)animation.id='inventory-action-glow';
 }
}
export function animateInventoryAction(root,previous,next){
 const event=next?.lastEvent;
 if(!previous||previous.id!==next?.id||previous===next||next.status!=='playing'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 if(event?.id!==previous.lastEvent?.id&&event?.kind==='trade')return;
 const spent=new Map();
 // Help and multi-card actions may spend stock without replacing lastEvent.
 // Read only the two small inventories, never the board or saved history.
 for(const player of next.players){
  const old=previous.players.find(p=>p.id===player.id)?.inventory,before=old?.cards||{};
  for(const [tool,count] of Object.entries(player.inventory?.cards||{}))if(count<(before[tool]||0))spent.set(player.id+'|'+tool,true);
  const usage=player.inventory?.turnUse,usedBefore=usage?.turn===old?.turnUse?.turn?old?.turnUse?.tools||[]:[];
  for(const tool of usage?.tools?.slice(usedBefore.length)||[])spent.set(player.id+'|'+tool,true);
 }
 if(event?.id!==previous.lastEvent?.id&&event?.tool&&['inventory','move'].includes(event.kind))spent.set((event.actor||event.player)+'|'+event.tool,true);
 if(!spent.size)return;
 if(actionRoom!==next.id){actions.clear();actionRoom=next.id;}
 const now=performance.now();for(const key of spent.keys())actions.set(key,now);
 resumeInventoryAnimations(root,next);
}
