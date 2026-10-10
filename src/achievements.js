import {metricsModePicker,metricModes,metricModeClass} from './metrics.js';
import {CELL_TARGETS} from './board-limits.js';
import {MATCH_TIME_TARGETS,matchDurationLabel} from './match-durations.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=r=>['board-limit','time-limit','move-limit'].includes(r?.kind)&&typeof r.game==='string'&&Number.isFinite(r.limit)&&(r.kind!=='board-limit'||r.size>=r.limit)&&Array.isArray(r.players);
const archiveKey='hash3_completed_territories';
export function loadTerritoryResults(storage,games=[]){
 let rows=[];try{const data=JSON.parse(storage.getItem(archiveKey));if(Array.isArray(data))rows=data.filter(valid);}catch{}
 const results=new Map(rows.map(r=>[r.game,r]));
 for(const game of games)if(game.status==='finished'&&['board-limit','time-limit','move-limit'].includes(game.finalResult?.kind)){
  const result={...game.finalResult,game:game.id};if(valid(result))results.set(game.id,result);
 }
 return [...results.values()].sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt));
}
export function archiveTerritoryResult(storage,game){
 if(game.status!=='finished'||!['board-limit','time-limit','move-limit'].includes(game.finalResult?.kind))return;
 storage.setItem(archiveKey,JSON.stringify(loadTerritoryResults(storage,[game])));
}
export const territoryComparisonKey=r=>JSON.stringify([r.goalType||'cells',r.target||r.limit,r.mode,r.level,r.timeMode,r.difficulty,r.playerInventory!==false,r.machineInventory,r.faunaEnabled,r.territoryEnabled,r.ruleVersion,r.declaredGoal]);
const number=n=>n==null?'—':Number(n).toLocaleString('es-ES');
const goalType=r=>r.goalType||({'time-limit':'time','move-limit':'moves'}[r.kind]||'cells');
const goalTarget=r=>r.target||r.limit;
const targets=(goal,records=[])=>goal==='time'
 ?[...new Set([...MATCH_TIME_TARGETS,...records.filter(r=>goalType(r)==='time').map(goalTarget)])].sort((a,b)=>a-b)
 :CELL_TARGETS;
const goalLabels={cells:'Celdas',moves:'Movimientos',time:'Tiempo'};
const metrics={score:'Puntos',figures:'Figuras',placements:'Colocaciones',bestCombo:'Combo',max:'#MAX'};
const settingsLabel=r=>`${r.level==='advanced'?'Avanzado':'Normal'} · ${r.timeMode==='untimed'?'Sin reloj':'Con reloj'}${r.difficulty?' · '+r.difficulty:''} · Tu inventario ${r.playerInventory!==false?'✓':'—'} · Inventario rival ${r.machineInventory?'✓':'—'} · Fauna ${r.faunaEnabled?'✓':'—'} · Fenómenos ${r.territoryEnabled?'✓':'—'}`;
export function achievementSelection(results=[],view={}){
 const records=results.filter(valid),mode=metricModes.some(([m])=>m===view.mode)?view.mode:records[0]?.mode||'solo';
 const inMode=records.filter(r=>r.mode===mode),goal=goalLabels[view.goal]?view.goal:inMode[0]?goalType(inMode[0]):'cells';
 const inGoal=inMode.filter(r=>goalType(r)===goal),target=targets(goal,inMode).includes(view.target)?view.target:goalTarget(inGoal[0]||{})||targets(goal)[0];
 const matching=inGoal.filter(r=>goalTarget(r)===target),comparison=matching.some(r=>territoryComparisonKey(r)===view.comparison)?view.comparison:matching[0]?territoryComparisonKey(matching[0]):null;
 return {mode,goal,target,comparison,metric:metrics[view.metric]?view.metric:'score'};
}
export function achievementsMarkup(results=[],view={}){
 const selected=achievementSelection(results,view),{mode,goal,target,comparison,metric}=selected;
 let html=`<div class="achievement-panel ${metricModeClass(mode)}">`+metricsModePicker(mode,{action:'achievements-mode',label:'Modalidad de los logros'});
 if(mode==='world')return html+'<p>Mundo es continuo. Consulta sus resultados en Ranking y métricas.</p></div>';
 html+=`<div class="achievement-selectors" role="group" aria-label="Objetivo de los logros">${Object.entries(goalLabels).map(([id,label])=>`<button data-action="achievements-goal" data-goal="${id}" aria-pressed="${id===goal}">${label}</button>`).join('')}</div><div class="achievement-selectors" role="group" aria-label="Límite de los logros">${targets(goal,results.filter(r=>valid(r)&&r.mode===mode)).map(n=>`<button data-action="achievements-target" data-target="${n}" aria-pressed="${n===target}">${goal==='time'?matchDurationLabel(n,true):number(n)}</button>`).join('')}</div>`;
 const matching=results.filter(r=>valid(r)&&r.mode===mode&&goalType(r)===goal&&goalTarget(r)===target),groups=new Map();
 for(const r of matching){const key=territoryComparisonKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 if(!matching.length)return html+`<p>No hay partidas completadas para esta selección. Al alcanzar ${goal==='time'?matchDurationLabel(target):number(target)+(goal==='moves'?' movimientos':' celdas')}, se guardará aquí el resultado.</p></div>`;
 if(groups.size>1)html+=`<label for="achievement-rules">Reglas de la partida</label><select id="achievement-rules">${[...groups].map(([key,games])=>`<option value="${esc(key)}" ${key===comparison?'selected':''}>${esc(settingsLabel(games[0]))} · ${games.length} partida${games.length===1?'':'s'} · ${esc(games[0].ruleVersion||'reglas originales')}${games[0].declaredGoal?' · objetivo '+esc(games[0].declaredGoal):''}</option>`).join('')}</select>`;
 html+=`<div class="achievement-selectors achievement-data" role="group" aria-label="Dato de los logros">${Object.entries(metrics).map(([id,label])=>`<button data-action="achievements-metric" data-metric="${id}" aria-pressed="${id===metric}">${label}</button>`).join('')}</div>`;
 const games=groups.get(comparison),r=games[0];
 const rows=games.flatMap(g=>g.players.filter(p=>g.mode!=='solo'||p.id===g.humanId).map(p=>({...p,completedAt:g.completedAt,game:g.game}))).sort((a,b)=>b.score-a.score||b.figures-a.figures||Date.parse(a.completedAt)-Date.parse(b.completedAt));
 const title=goal==='time'?`Tiempo · ${matchDurationLabel(target)}`:goal==='moves'?`Movimientos · ${number(target)}`:`Territorio completo · ${number(target)}`;
 html+=`<section class="territory-achievement"><h3 class="heading">${title}</h3><p>${esc(settingsLabel(r))}</p><div class="achievement-table"><table><thead><tr><th>Jugador</th><th>${metrics[metric]}</th><th>Fecha</th></tr></thead><tbody>${rows.map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${number(metric==='max'&&p.max!=null?Math.round(p.max*100)/100:p[metric])}</td><td>${esc(new Date(p.completedAt).toLocaleDateString('es-ES'))}</td></tr>`).join('')}</tbody></table></div></section><p class="muted">Solo se comparan partidas con las mismas reglas. Los resultados se conservan en este navegador aunque borres el tablero guardado.</p>`;
 return html+'</div>';
}
