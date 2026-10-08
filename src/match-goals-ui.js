import {CELL_TARGETS} from './board-limits.js';
export function matchGoalsMarkup(type='cells',target=33333){
 const options=type==='time'?[180,300,600]:CELL_TARGETS;
 if(!options.includes(target))target=type==='time'?300:33;
 return `<label for="local-goal-type">Final de la partida</label><select id="local-goal-type"><option value="cells" ${type==='cells'?'selected':''}>Por celdas</option><option value="time" ${type==='time'?'selected':''}>Por tiempo total</option><option value="moves" ${type==='moves'?'selected':''}>Por movimientos</option><option value="continuous" ${type==='continuous'?'selected':''}>Continua</option></select><div id="local-goal-target-row" ${type==='continuous'?'hidden':''}><label for="local-goal-target">Objetivo</label><select id="local-goal-target">${options.map(n=>`<option value="${n}" ${target===n?'selected':''}>${type==='time'?n/60+' minutos':n.toLocaleString('es-ES')+(type==='moves'?' movimientos':' celdas')}</option>`).join('')}</select></div>`;
}
