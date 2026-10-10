export const INVENTORY_ROWS=Object.freeze([
 ['double','opposite','rival','swap','shift','erase','bomb','tornado','combo','shield','block'],
 ['frontier','border','activate','expand-2','expand-3','destroy','hint','hint-expand','super-hint']
]);
export function inventoryRows(render){
 return `<div class="player-inventory-rows" role="group" aria-label="Herramientas del jugador en dos filas">${INVENTORY_ROWS.map(row=>`<div class="inventory-icon-row">${row.map(render).join('')}</div>`).join('')}</div>`;
}
