import {scoreBreakdown} from './feedback.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Points stay legible in play. Consult the paid figures only on request.
export function scoreNoticeMarkup(feedback,comboNotice=null){
 const label=`Ver jugada de ${feedback.name} · +${feedback.points} puntos`;
 return `<button class="score-notice-jump" aria-label="${esc(label)}"><strong class="score-notice-total ${feedback.symbol==='O'?'o':'x'}">+${feedback.points.toLocaleString('es-ES')}</strong><svg class="score-jump-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M6 5h13v13"/></svg></button><details class="score-details"><summary aria-label="Ver desglose de la jugada" title="Ver desglose de la jugada"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/></svg></summary><div class="score-breakdown"><span>${esc(feedback.name)} · ${esc(feedback.symbol)}${feedback.automatic?' · jugada por tiempo':''}</span><p>${esc(scoreBreakdown(feedback)||'Figura completada')}</p>${comboNotice?`<p>${esc(comboNotice.message)}</p>`:''}</div></details>`;
}
