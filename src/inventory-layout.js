export const INVENTORY_ROWS=Object.freeze([
 ['double','opposite','rival','swap','shift','erase','bomb','nuclear','tornado','combo','shield','block','ambush'],
 ['reconquest','target','frontier','border','activate','expand-2','expand-3','destroy','hint','hint-expand','super-hint','antidote','sapper']
]);
export const INVENTORY_ORDER=Object.freeze(INVENTORY_ROWS.flat());
export function normalizeInventoryPreferences(value={}){
 const order=[...new Set((Array.isArray(value?.order)?value.order:[]).filter(id=>INVENTORY_ORDER.includes(id)))];
 order.push(...INVENTORY_ORDER.filter(id=>!order.includes(id)));
 const floating=[...new Set((Array.isArray(value?.floating)?value.floating:[]).filter(id=>INVENTORY_ORDER.includes(id)))];
 const positions={};for(const id of floating){const p=value?.positions?.[id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))positions[id]={x:Math.min(1,Math.max(0,p.x)),y:Math.min(1,Math.max(0,p.y))};}
 return {order,floating,positions,inventoryCollapsed:value?.inventoryCollapsed===true,territoryCollapsed:value?.territoryCollapsed===true};
}
export function reorderInventory(order,from,to){
 const next=[...order],i=next.indexOf(from),j=next.indexOf(to);if(i<0||j<0||i===j)return next;
 next.splice(i,1);next.splice(j,0,from);return next;
}
export function inventoryRows(render,{order=INVENTORY_ORDER,floating=[]}={}){
 const visible=order.filter(id=>!floating.includes(id)),split=Math.ceil(visible.length/2),rows=[visible.slice(0,split),visible.slice(split)];
 return `<div class="player-inventory-rows" role="group" aria-label="Herramientas del jugador en dos filas">${rows.map(row=>`<div class="inventory-icon-row">${row.map(render).join('')}</div>`).join('')}</div>`;
}
