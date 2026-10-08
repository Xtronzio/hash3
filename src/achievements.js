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
export const territoryComparisonKey=r=>JSON.stringify([r.goalType||'cells',r.target||r.limit,r.mode,r.level,r.timeMode,r.difficulty,r.machineInventory,r.faunaEnabled,r.territoryEnabled,r.ruleVersion,r.declaredGoal]);
const number=n=>n==null?'—':Number(n).toLocaleString('es-ES');
export function achievementsMarkup(results=[]){
 if(!results.length)return '<h3 class="heading">Partidas completadas</h3><p>Objetivos de 33, 333, 3.333 y 33.333 celdas o movimientos, y partidas de 3, 5 o 10 minutos. Al completar el objetivo, la partida termina y guarda aquí su resultado.</p>';
 const groups=new Map();for(const r of results.filter(valid)){const key=territoryComparisonKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 let html='<p>Partidas completadas. Solo se comparan resultados de las mismas reglas. Los registros se conservan en este navegador aunque borres el tablero guardado.</p>';
 for(const games of groups.values()){
  const r=games[0],mode={solo:'VS máquina',local:'Sin conexión',duel:'Duelo'}[r.mode]||r.mode;
  const rows=games.flatMap(g=>g.players.filter(p=>g.mode!=='solo'||p.id===g.humanId).map(p=>({...p,completedAt:g.completedAt,game:g.game}))).sort((a,b)=>b.score-a.score||b.figures-a.figures||Date.parse(a.completedAt)-Date.parse(b.completedAt));
  const title=r.kind==='time-limit'?`Tiempo · ${number(r.target/60)} minutos`:r.kind==='move-limit'?`Movimientos · ${number(r.target)}`:`Territorio completo · ${number(r.limit)}`;
  html+=`<section class="territory-achievement"><h3 class="heading">${title}</h3><p>${esc(mode)} · ${esc(r.level==='advanced'?'Avanzado':'Normal')} · ${esc(r.timeMode==='untimed'?'Sin reloj':'Con reloj')}${r.difficulty?' · '+esc(r.difficulty):''} · Inventario rival ${r.machineInventory?'✓':'—'} · Fauna ${r.faunaEnabled?'✓':'—'} · Fenómenos ${r.territoryEnabled?'✓':'—'}</p><div class="achievement-table"><table><thead><tr><th>Jugador</th><th>Puntos</th><th>Figuras</th><th>Colocaciones</th><th>Combo</th><th>#MAX</th><th>Fecha</th></tr></thead><tbody>${rows.map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${number(p.score)}</td><td>${number(p.figures)}</td><td>${number(p.placements)}</td><td>${number(p.bestCombo)}</td><td>${number(p.max)}</td><td>${esc(new Date(p.completedAt).toLocaleDateString('es-ES'))}</td></tr>`).join('')}</tbody></table></div></section>`;
 }
 return html;
}
