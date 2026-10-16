export const inverseClaimIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22v17H5zM10 4v8M22 4v8M10 19l4 4 9-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
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
