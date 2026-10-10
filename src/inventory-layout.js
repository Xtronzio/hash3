export const INVENTORY_GROUPS=Object.freeze([
 {label:'Ataque',rows:[['opposite','rival'],['shift','tornado'],['erase','bomb'],['double','combo']]},
 {label:'Defensa',rows:[['shield','block'],['frontier','border']]},
 {label:'Ampliación',rows:[['activate','expand-2'],['expand-3','hint-expand']]},
 {label:'Eliminación',rows:[['destroy',null]]},
 {label:'Ayuda',rows:[['hint','super-hint']]}
]);
export function inventoryColumns(render){
 return `<div class="player-inventory-columns" role="group" aria-label="Herramientas del jugador en dos columnas">${INVENTORY_GROUPS.map(g=>`<span class="inventory-column-category">${g.label}</span>${g.rows.flat().map(id=>id?render(id):'<span class="inventory-column-empty" aria-hidden="true"></span>').join('')}`).join('')}</div>`;
}
