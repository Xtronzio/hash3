import {backpackIcon} from './backpack-icon.js';
import {navigationIcon} from './navigation-icons.js';
import {normalizeInventoryPreferences,reorderInventory} from './inventory-layout.js';
import {toolIcon,inventoryShortcutMarkup} from './inventory.js';
import {practiceTools,immunityTools} from './practice-tools.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {targetIcon} from './watch-targets.js';
import {separateFloatingControl} from './floating-layout.js';

const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const editIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/></svg>';
const floatIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="13" height="13" rx="2"/><path d="M12 3h9v9m0-9L10 14"/></svg>';
const name=id=>id==='target'?'Diana':[...practiceTools,...immunityTools].find(t=>t.id===id)?.label||'';
const icon=id=>id==='target'?`<svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg>`:toolIcon(id);
const preferenceKey=(game,actor)=>`hash3_inventory_preferences:${game.mode}:${game.mode==='solo'?'colono':actor}`;
export function inventoryPreferences(game,actor,storage){
 const own=game.inventoryPreferences?.[actor];if(own)return normalizeInventoryPreferences(own);
 try{return normalizeInventoryPreferences(JSON.parse(storage?.getItem(preferenceKey(game,actor))||'{}'));}catch{return normalizeInventoryPreferences();}
}
export function storeInventoryPreferences(game,actor,preferences,storage){
 const normalized=normalizeInventoryPreferences(preferences);
 // UI data rides with saved/transported games; never alter the game clock,
 // version, cards, points, turn counters or reward thresholds to customize.
 const next={...game,inventoryPreferences:{...game.inventoryPreferences,[actor]:normalized}};
 try{storage?.setItem(preferenceKey(game,actor),JSON.stringify(normalized));}catch{}
 return next;
}
export function inventoryBandMarkup(content,game,actor,preferences,{access='',navigation=''}={}){
 if(!inventoryEnabled(game,actor))return navigation?`<div class="player-tools"><nav class="band-navigation" aria-label="Controles del tablero">${navigation}</nav></div>${content}`:content;
 const folded=preferences.inventoryCollapsed,label=(folded?'Desplegar':'Plegar')+' barra de inventario';
 const actions=`<nav class="band-actions" aria-label="Personalizar y plegar inventario">${access}<button class="band-fold" data-action="toggle-inventory-bar" aria-label="${label}" title="${label}" aria-expanded="${!folded}">${chevron}</button><button data-action="edit-inventory-layout" aria-label="Personalizar inventario" title="Ordenar cartas y elegir flotantes">${editIcon}</button></nav>`;
 return `<div class="custom-inventory-band ${navigation?'has-toolbar ':''}${folded?'is-collapsed':''}">${navigation?`<div class="band-toolbar">${actions}<nav class="band-navigation" aria-label="Controles del tablero">${navigation}</nav></div>`:actions}<div class="custom-band-content" ${folded?'hidden':''}>${content}</div></div>`;
}
export function territoryBandMarkup(content,preferences){
 const folded=preferences.territoryCollapsed,label=(folded?'Desplegar':'Plegar')+' barra del territorio';
 const bag=backpackIcon();
 return `<div class="custom-territory-band ${folded?'is-collapsed':''}"><nav class="band-actions" aria-label="Inventario y barra del territorio"><button class="band-fold" data-action="toggle-territory-bar" aria-label="${label}" title="${label}" aria-expanded="${!folded}">${chevron}</button><button class="territory-bag" data-action="territory-inventory" aria-label="Inventario del territorio · descripciones" title="Entender los eventos del territorio">${bag}</button><button class="territory-calendar" data-action="events" aria-label="Próximos eventos" title="Próximos eventos" aria-controls="events-panel">${navigationIcon('events')}</button></nav><div class="custom-band-content" ${folded?'hidden':''}>${content}</div></div>`;
}
export function floatingInventoryMarkup(game,actor,preferences){
 if(!['solo','local'].includes(game.mode)||!['playing','paused'].includes(game.status)||!inventoryEnabled(game,actor))return '';
 return preferences.floating.map(id=>`<div class="floating-inventory-card" data-floating-tool="${id}" data-floating-player="${actor}"><span class="favorite-drag-handle" role="button" tabindex="0" aria-label="Mover ${name(id)}" title="Arrastra para mover ${name(id)}">⠿</span>${inventoryShortcutMarkup(game,actor,id,{paused:game.status==='paused'})}</div>`).join('');
}
export function inventoryEditorMarkup(preferences,selected){
 const chosen=preferences.order.includes(selected)?selected:preferences.order[0],index=preferences.order.indexOf(chosen),floated=preferences.floating.includes(chosen);
 return `<div class="inventory-editor-backdrop"><section class="inventory-editor" role="dialog" aria-modal="true" aria-labelledby="inventory-editor-title"><header><h2 id="inventory-editor-title">Tu inventario</h2><button data-action="close-inventory-layout" aria-label="Cerrar personalización">×</button></header><p>Arrastra el tirador para ordenar. Selecciona una carta para moverla con las flechas o sacarla al tablero. Los cambios se guardan.</p><nav class="inventory-editor-actions" aria-label="Editar carta seleccionada"><span>${icon(chosen)}<b>${name(chosen)}</b></span><button data-action="inventory-order-step" data-direction="-1" aria-label="Mover ${name(chosen)} a la posición anterior" ${index?'':'disabled'}>←</button><button data-action="inventory-order-step" data-direction="1" aria-label="Mover ${name(chosen)} a la posición siguiente" ${index<preferences.order.length-1?'':'disabled'}>→</button><button data-action="inventory-float-toggle" aria-label="${floated?'Devolver '+name(chosen)+' a la barra':'Sacar '+name(chosen)+' como flotante'}" title="${floated?'Devolver a la barra':'Sacar como flotante'}" aria-pressed="${floated}">${floatIcon}</button></nav><div class="inventory-editor-grid">${preferences.order.map(id=>`<div class="inventory-edit-card ${id===chosen?'is-selected':''} ${preferences.floating.includes(id)?'is-floating':''}" data-edit-tool="${id}"><span class="inventory-order-handle" role="button" tabindex="0" aria-label="Ordenar ${name(id)} con arrastre o flechas">⠿</span><button data-action="inventory-edit-select" data-tool="${id}" aria-pressed="${id===chosen}" aria-label="Seleccionar ${name(id)}${preferences.floating.includes(id)?' · flotante':''}">${icon(id)}<small>${name(id)}</small></button>${preferences.floating.includes(id)?'<span class="inventory-float-badge" title="Flotante">↗</span>':''}</div>`).join('')}</div><footer><span>Las cartas flotantes salen de la barra. Su stock y uso son los mismos.</span><button data-action="reset-inventory-layout">Restablecer orden</button></footer></section></div>`;
}
export function bindInventoryEditor(root,onReorder){
 if(!root)return ()=>{};let gesture=null,moved=false;
 const clear=()=>{root.querySelectorAll('.is-dragging,.is-drop-target').forEach(n=>n.classList.remove('is-dragging','is-drop-target'));};
 const down=e=>{const handle=e.target.closest('.inventory-order-handle');if(!handle||e.button!==0)return;gesture={id:e.pointerId,from:handle.closest('[data-edit-tool]').dataset.editTool,to:null,x:e.clientX,y:e.clientY};moved=false;handle.setPointerCapture?.(e.pointerId);e.stopPropagation();};
 const move=e=>{if(!gesture||gesture.id!==e.pointerId)return;if(!moved&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<6)return;moved=true;e.preventDefault();e.stopPropagation();clear();root.querySelector(`[data-edit-tool="${gesture.from}"]`)?.classList.add('is-dragging');const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-edit-tool]');gesture.to=card?.dataset.editTool||null;card?.classList.add('is-drop-target');};
 const end=e=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;clear();if(e.type!=='pointercancel'&&moved&&g.to&&g.to!==g.from)onReorder(g.from,g.to);e.stopPropagation();};
 const click=e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}};
 const keydown=e=>{const handle=e.target.closest('.inventory-order-handle');if(!handle||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const ids=[...root.querySelectorAll('[data-edit-tool]')].map(n=>n.dataset.editTool),id=handle.closest('[data-edit-tool]').dataset.editTool,index=ids.indexOf(id),next=index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);if(ids[next])onReorder(id,ids[next]);e.preventDefault();e.stopPropagation();};
 for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,click,keydown}))root.addEventListener(event,fn,event==='click');
 return ()=>{for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,click,keydown}))root.removeEventListener(event,fn,event==='click');};
}
export function bindFloatingInventory(surface,preferences,onPosition){
 if(!surface)return ()=>{};const cleanups=[];
 for(const [index,node] of [...surface.querySelectorAll(':scope > .floating-inventory-card')].entries()){
  const id=node.dataset.floatingTool;let position=preferences.positions[id]||{x:(index%4)*.2,y:.68+Math.floor(index/4)*.1},gesture=null,moved=false;
  const bounds=()=>({x:Math.max(0,surface.clientWidth-node.offsetWidth-12),y:Math.max(0,surface.clientHeight-node.offsetHeight-12)});
  const paint=(separate=false)=>{const b=bounds(),p={x:6+position.x*b.x,y:6+position.y*b.y},point=separate?separateFloatingControl(p,{width:node.offsetWidth,height:node.offsetHeight},{x:6+b.x,y:6+b.y},[...surface.querySelectorAll('.floating-immunity,.floating-refill,.floating-inventory-card,.map-tools,.game-minimap')].filter(n=>n!==node&&!n.hidden&&n.offsetWidth>0&&n.offsetHeight>0&&(n.classList.contains('floating-inventory-card')?n.style.left:true)).map(n=>({x:n.offsetLeft,y:n.offsetTop,width:n.offsetWidth,height:n.offsetHeight}))):p;node.style.left=`${point.x}px`;node.style.top=`${point.y}px`;};
  const down=e=>{if(!e.target.closest('.favorite-drag-handle')||e.button!==0)return;const b=bounds();position={x:(node.offsetLeft-6)/(b.x||1),y:(node.offsetTop-6)/(b.y||1)};gesture={id:e.pointerId,x:e.clientX,y:e.clientY,position:{...position}};moved=false;e.target.setPointerCapture?.(e.pointerId);e.stopPropagation();};
  const move=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!moved&&Math.hypot(dx,dy)<6)return;moved=true;e.preventDefault();e.stopPropagation();const b=bounds();position={x:Math.max(0,Math.min(1,gesture.position.x+dx/(b.x||1))),y:Math.max(0,Math.min(1,gesture.position.y+dy/(b.y||1)))};paint();};
  const end=e=>{if(!gesture||gesture.id!==e.pointerId)return;gesture=null;e.stopPropagation();if(moved&&e.type!=='pointercancel')onPosition(id,position);};
  const click=e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}};
  const keydown=e=>{if(!e.target.closest('.favorite-drag-handle')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;position={x:Math.max(0,Math.min(1,position.x+(e.key==='ArrowLeft'?-.05:e.key==='ArrowRight'?.05:0))),y:Math.max(0,Math.min(1,position.y+(e.key==='ArrowUp'?-.05:e.key==='ArrowDown'?.05:0)))};paint();onPosition(id,position);e.preventDefault();e.stopPropagation();};
  for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,click,keydown}))node.addEventListener(event,fn,event==='click');
  paint(true);const resize=new ResizeObserver(()=>paint(true));resize.observe(surface);
  cleanups.push(()=>{resize.disconnect();for(const [event,fn] of Object.entries({pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,click,keydown}))node.removeEventListener(event,fn,event==='click');});
 }
 return ()=>cleanups.forEach(fn=>fn());
}
export {reorderInventory};
