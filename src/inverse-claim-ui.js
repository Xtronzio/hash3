import {canClaimInverse,manualInverse} from './inverse-claims.js';
export const inverseClaimIcon='<svg data-icon="collect-figures" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="7" height="7" rx="1"/><rect x="13" y="3" width="7" height="7" rx="1"/><rect x="4" y="12" width="7" height="7" rx="1"/><path d="M22 12v9m-5-5 5 5 5-5M4 23v6h24v-6M10 25h12"/></g></svg>';
export function inverseClaimControl(room,playerId,{selected=false,floating=false}={}){
 if(!manualInverse(room))return '';
 return `<button class="inverse-claim-toggle ${floating?'inventory-shortcut inverse-claim-floating':''}" data-action="inverse-claim-toggle" aria-label="Previsualizar el mejor combo para cobrar" title="Cobrar mejor combo" aria-pressed="${selected}" ${canClaimInverse(room,playerId)?'':'disabled'}>${inverseClaimIcon}<small>Cobrar</small></button>`;
}
const label=f=>f.kind==='grupo'?'Grupo':f.kind==='línea'?'Línea':f.kind==='cuadrado'?'Cuadrado':f.kind==='cruz'?'Cruz':f.kind;
export function inverseClaimPanel(selection,figures){
 if(!selection)return '';
 const combo=figures[0]?.figures?figures[0]:null;
 if(combo){
  const groups=combo.scoreGroups.slice(0,8).map(g=>`${g.count} ${label(g)} de ${g.size}`).join(' · ');
  return `<aside class="inverse-claim-panel" aria-label="Confirmar combo completo"><div class="inverse-claim-heading"><span>Mejor combo del conjunto</span><button data-action="inverse-claim-cancel" aria-label="Cancelar cobro">×</button></div><div class="inverse-combo-summary"><strong>${label(combo.primary)} ${combo.primary.size} · ${combo.figureCount} figuras</strong><span>${combo.size} fichas · ${combo.filled} por vaciar</span><small>${groups||'Figuras en zona vaciada: sin puntos'}${combo.scoreGroups.length>8?' · …':''}${combo.bonus?' · Bonus +'+combo.bonus:''}</small></div><button class="primary inverse-claim-confirm" data-action="inverse-claim-confirm">${combo.pointsValue?'Cobrar combo +'+combo.pointsValue:'Retirar sin puntos'} · termina tu turno</button></aside>`;
 }
 const chosen=figures.find(f=>f.id===selection.figureId);
 return `<aside class="inverse-claim-panel" aria-label="Elegir figura para cobrar"><div class="inverse-claim-heading"><span>${figures.length?'Elige una figura':selection.x!=null?'Sin figura propia aquí. Toca otra ficha.':'Toca una ficha propia o un # del conjunto.'}</span><button data-action="inverse-claim-cancel" aria-label="Cancelar cobro">×</button></div>${figures.length?`<div class="inverse-claim-options" role="group" aria-label="Figuras disponibles">${figures.map((f,i)=>`<button data-action="inverse-claim-choice" data-index="${i}" aria-pressed="${f.id===selection.figureId}">${label(f)} ${f.size}<small>+${f.pointsValue} · ${f.filled} por vaciar</small></button>`).join('')}</div><button class="primary inverse-claim-confirm" data-action="inverse-claim-confirm" ${chosen?'':'disabled'}>${chosen?.pointsValue?'Cobrar +'+chosen.pointsValue:'Retirar sin puntos'} · termina tu turno</button>`:''}</aside>`;
}
