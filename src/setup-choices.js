const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={timed:'33 s / turno',untimed:'Sin reloj',normal:'Sencillas',advanced:'Complejas',cells:'Celdas',moves:'Movimientos',time:'Tiempo total',continuous:'Continua'};
const symbols={timed:'◷',untimed:'∞',normal:'▦',advanced:'✣',cells:'▦',moves:'↗',time:'◷',continuous:'∞'};
export function enhanceSetupChoices(root){
 const enhance=id=>{
  const select=root.querySelector('#'+id);if(!select)return;
  root.querySelector(`[data-setup-choices="${id}"]`)?.remove();select.hidden=true;
  const group=document.createElement('div');group.className='setup-icon-choices';group.dataset.setupChoices=id;group.setAttribute('role','group');group.setAttribute('aria-label',root.querySelector(`[for="${id}"]`)?.textContent||'Opciones');
  group.innerHTML=[...select.options].map(o=>`<button type="button" data-setup-select="${id}" data-value="${escape(o.value)}" aria-pressed="${o.value===select.value}" ${select.disabled||o.disabled?'disabled':''}><span class="setup-option-icon" aria-hidden="true">${symbols[o.value]||'·'}</span><span>${escape(o.value==='timed'&&select.dataset.turnSeconds==='3'?'3 s / turno · obligatorio':labels[o.value]||o.textContent)}</span></button>`).join('');select.after(group);
  group.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled||select.disabled)return;e.stopPropagation();select.value=button.dataset.value;select.dispatchEvent(new Event('change',{bubbles:true}));});
 };
 const refresh=()=>['local-level','local-time-mode','local-goal-type','local-goal-target'].forEach(enhance);
 root.addEventListener('change',e=>{if(['local-level','local-time-mode','local-goal-type','local-goal-target'].includes(e.target.id))refresh();});refresh();
}
