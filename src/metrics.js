import {localHumanId} from './local.js';
import {hallIcon,hallModeClass} from './hall.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const metricModes=[['solo','VS máquina','robot'],['local','Sin conexión','players'],['duel','Duelo','duel'],['world','Mundo','world']];
export function localMetrics(games=[]){
 const latest=new Map();
 for(const g of games){if(!['solo','local'].includes(g.mode))continue;const prior=latest.get(g.id);if(!prior||Date.parse(g.updatedAt||0)>=Date.parse(prior.updatedAt||0))latest.set(g.id,g);}
 return [...latest.values()].flatMap(g=>(g.mode==='solo'?g.players.filter(p=>p.id===localHumanId(g)):g.players.filter(p=>!p.bot)).map(p=>({game:g.id,mode:g.mode,name:p.name,participant:p.id,status:g.status,score:p.score||0,figures:p.figures||0,placements:p.placements??null,bestCombo:p.bestCombo?.points??null,max:p.max?.value??null,maxActions:p.max?.actions??0,provisional:p.max?.provisional!==false,difficulty:g.difficulty,level:g.level})));
}
export function summarizeMetrics(entries=[]){
 const numeric=field=>entries.map(e=>e[field]).filter(v=>v!=null&&Number.isFinite(Number(v))).map(Number);
 const combos=numeric('bestCombo'),maxes=numeric('max'),placements=numeric('placements');
 return {games:new Set(entries.map(e=>e.game)).size,closed:new Set(entries.filter(e=>e.status==='finished').map(e=>e.game)).size,score:numeric('score').reduce((a,b)=>a+b,0),figures:numeric('figures').reduce((a,b)=>a+b,0),placements:placements.length?placements.reduce((a,b)=>a+b,0):null,bestCombo:combos.length?Math.max(...combos):null,max:maxes.length?Math.max(...maxes):null};
}
const format=v=>v==null?'—':Number(v).toLocaleString('es-ES');
function tiles(entries,mode){
 const m=summarizeMetrics(entries),max=format(m.max==null?null:Math.round(m.max*100)/100);
 const fields=[['Partidas',m.games],['Cerradas',m.closed],['Puntos acumulados',m.score],['Figuras',m.figures],['Fichas colocadas',m.placements],['Combo récord',m.bestCombo],[mode==='world'?'#MAX actual':'Mejor #MAX de partida',max]];
 return `<dl class="metric-cards">${fields.map(([label,v])=>`<div><dt>${label}</dt><dd>${typeof v==='string'?v:format(v)}</dd></div>`).join('')}</dl>`;
}
export const metricModeClass=mode=>hallModeClass(mode==='local'?'offline':mode);
export function metricsModePicker(mode='solo',{action='metrics-mode',label='Modalidad de las métricas'}={}){
 return `<div class="metric-modes" role="group" aria-label="${esc(label)}">${metricModes.map(([id,label,icon])=>`<button class="${metricModeClass(id)}" data-action="${esc(action)}" data-mode="${id}" aria-pressed="${id===mode}">${hallIcon(icon)}${label}</button>`).join('')}</div>`;
}
export function metricsMarkup({entries=[],mode='solo',loading=false,error='',showModes=true}={}){
 const selected=entries.filter(e=>e.mode===mode),name=metricModes.find(m=>m[0]===mode)?.[1]||'VS máquina';
 let body=showModes?metricsModePicker(mode):'';
 if(loading)body+='<p role="status">Consultando tus métricas online…</p>';
 if(error)body+=`<p class="muted">${esc(error)}</p><button data-action="refresh-metrics">Volver a consultar</button>`;
 body+=`<h3 class="heading hall-ranking-subtitle metric-mode-title ${metricModeClass(mode)}">${name}</h3>`;
 if(!selected.length)return body+`<p class="muted">${loading&&['duel','world'].includes(mode)?'Esperando datos de esta modalidad.':'No hay partidas registradas en esta modalidad.'}</p>`;
 if(mode==='local'){
   const people=new Map();for(const e of selected){const key=e.name||e.participant;if(!people.has(key))people.set(key,[]);people.get(key).push(e);}
   body+='<p class="muted">Dispositivo compartido: cada participante tiene sus propias métricas.</p>';
   body+=[...people].map(([name,games])=>`<section class="participant-metrics"><h4>${esc(name)}</h4>${tiles(games,mode)}</section>`).join('');
 }else body+=tiles(selected,mode);
 body+=`<p class="muted">${['solo','local'].includes(mode)?'Datos de las partidas guardadas en este navegador; no incluyen otros dispositivos ni partidas borradas.':'Datos personales de las salas online en las que conservas participación, incluidas las ocultas en Mis partidas.'} ${mode==='world'?'El #MAX oficial pertenece a Mundo.':'El #MAX es una referencia de partida, no modifica el oficial de Mundo.'} Los récords y contadores antiguos solo aparecen cuando fueron registrados.</p>`;
 return body;
}
