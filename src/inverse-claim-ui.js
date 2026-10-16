import {canClaimInverse,manualInverse} from './inverse-claims.js';
export const inverseClaimIcon='<svg data-icon="claim-trophy" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h14v8c0 10-14 10-14 0ZM9 7H3v3c0 5 4 7 8 7M23 7h6v3c0 5-4 7-8 7M16 20v7m-7 2h14m-11-2h8"/><path d="m16 7 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4Z" fill="currentColor" stroke-width=".7"/></g></svg>';
export function inverseClaimControl(room,playerId,{selected=false,floating=false}={}){
 if(!manualInverse(room))return '';
 return `<button class="inverse-claim-toggle ${floating?'inventory-shortcut inverse-claim-floating':''}" data-action="inverse-claim-toggle" aria-label="Cobrar: activar y tocar un conjunto" title="Cobrar · toca después un conjunto" aria-pressed="${selected}" ${canClaimInverse(room,playerId)?'':'disabled'}>${inverseClaimIcon}<small>COBRAR</small></button>`;
}
const label=f=>f.kind==='grupo'?'Grupo':f.kind==='línea'?'Línea':f.kind==='cuadrado'?'Cuadrado':f.kind==='cruz'?'Cruz':f.kind;
export function inverseClaimPanel(selection,figures){
 if(!selection)return '';
 const combo=figures[0]?.figures?figures[0]:null;
 if(combo){
  const groups=combo.scoreGroups.slice(0,8).map(g=>`${g.count} ${label(g)} de ${g.size}`).join(' · ');
  return `<aside class="inverse-claim-panel" aria-label="Cobrar combo completo"><div class="inverse-claim-heading"><span>Mejor combo del conjunto</span><button data-action="inverse-claim-cancel" aria-label="Cancelar cobro">×</button></div><div class="inverse-combo-summary"><strong>${label(combo.primary)} ${combo.primary.size} · ${combo.figureCount} figuras</strong><span>${combo.size} fichas · ${combo.filled} por vaciar</span><small>${groups||'Figuras en zona vaciada: sin puntos'}${combo.scoreGroups.length>8?' · …':''}${combo.bonus?' · Bonus +'+combo.bonus:''}</small></div><p class="inverse-claim-instruction">Toca una ficha resaltada para cobrar directamente · termina tu turno.</p></aside>`;
 }
 const chosen=figures.find(f=>f.id===selection.figureId);
 return `<aside class="inverse-claim-panel" aria-label="Elegir figura para cobrar"><div class="inverse-claim-heading"><span>${figures.length?'Elige una figura':selection.x!=null?'Sin figura propia aquí. Toca otra ficha.':'Toca una ficha propia o un # del conjunto para cobrar directamente.'}</span><button data-action="inverse-claim-cancel" aria-label="Cancelar cobro">×</button></div>${figures.length?`<div class="inverse-claim-options" role="group" aria-label="Figuras disponibles">${figures.map((f,i)=>`<button data-action="inverse-claim-choice" data-index="${i}" aria-pressed="${f.id===selection.figureId}">${label(f)} ${f.size}<small>+${f.pointsValue} · ${f.filled} por vaciar</small></button>`).join('')}</div><p class="inverse-claim-instruction">Toca el conjunto para cobrar directamente · termina tu turno.</p>`:''}</aside>`;
}
