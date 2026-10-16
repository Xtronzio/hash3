export const inverseClaimIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22v17H5zM10 4v8M22 4v8M10 19l4 4 9-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const label=f=>f.kind==='grupo'?'Grupo':f.kind==='línea'?'Línea':f.kind==='cuadrado'?'Cuadrado':f.kind==='cruz'?'Cruz':f.kind;
export function inverseClaimPanel(selection,figures){
 if(!selection)return '';
 const chosen=figures.find(f=>f.id===selection.figureId);
 return `<aside class="inverse-claim-panel" aria-label="Elegir figura para cobrar"><div class="inverse-claim-heading"><span>${figures.length?'Elige una figura':selection.x!=null?'Sin figura propia aquí. Toca otra ficha.':'Toca una ficha propia o un # de la figura.'}</span><button data-action="inverse-claim-cancel" aria-label="Cancelar cobro">×</button></div>${figures.length?`<div class="inverse-claim-options" role="group" aria-label="Figuras disponibles">${figures.map((f,i)=>`<button data-action="inverse-claim-choice" data-index="${i}" aria-pressed="${f.id===selection.figureId}">${label(f)} ${f.size}<small>+${f.pointsValue} · ${f.filled} por vaciar</small></button>`).join('')}</div><button class="primary inverse-claim-confirm" data-action="inverse-claim-confirm" ${chosen?'':'disabled'}>${chosen?.pointsValue?'Cobrar +'+chosen.pointsValue:'Retirar sin puntos'} · termina tu turno</button>`:''}</aside>`;
}
