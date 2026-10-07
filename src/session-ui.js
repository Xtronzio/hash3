import {machineLevelLabel} from './machine.js';
import {maxLabel} from './max.js';
import {comboLabel} from './records.js';
import {voteCounts,gamePinKey} from './sessions.js';
import {thumbnailMarkup} from './saved-map.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pinIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3 8 0-1 7 4 4H5l4-4-1-7ZM12 14v7"/></svg>';
export const periods=[['all','General'],['year','Anual'],['month','Mensual'],['week','Semanal'],['day','Diaria'],['hour','Por horas']];
export function voteMarkup(vote,uid){
 if(!vote||Date.parse(vote.expiresAt)<=Date.now())return '';
 const c=voteCounts(vote),mine=vote.votes?.[uid],eligible=vote.eligible?.includes(uid);
 return `<section class="vote-panel" aria-label="Votación de sala"><div><strong>${vote.kind==='pause'?'¿Pausamos el duelo?':'¿Reanudamos el duelo?'}</strong><small>Solicita ${esc(vote.requestedBy)} · ${c.yes}/${c.required} votos a favor · ${c.total} jugadores</small></div>${eligible?`<div class="vote-buttons"><button data-action="vote-yes" aria-pressed="${mine===true}">Sí</button><button data-action="vote-no" aria-pressed="${mine===false}">No</button></div>`:''}<small>${vote.kind==='pause'?'La partida continúa mientras se vota.':'La partida sigue pausada mientras se vota.'} Mayoría absoluta · votación de 60 segundos.</small></section>`;
}
export function gamesMarkup({local=[],online=[],loading=false,error='',pins=[],uid=''}={}){
 const all=[...online.map(g=>({...g,local:false})),...local.map(g=>({...g,local:true,active:true}))];
 const pinned=all.filter(g=>pins.includes(gamePinKey(g,uid))),remaining=all.filter(g=>!pins.includes(gamePinKey(g,uid)));
 const closed=remaining.filter(g=>g.status==='finished'),paused=remaining.filter(g=>g.status==='paused'),open=remaining.filter(g=>!['finished','paused'].includes(g.status));
 const cards=games=>games.map(g=>{
 const title=g.local?(g.mode==='solo'?'VS máquina':'Sin conexión'):g.commonWorld?'Mundo':g.kind==='duel'?'Duelo':'Sala libre';
 const names=g.local?g.players.map(p=>p.name).join(' · '):(g.players||[]).slice(0,3).join(' · ');
 const label=g.status==='finished'?'Consultar':g.status==='paused'?'Ver y retomar':g.commonWorld&&!g.active?'Volver a Mundo':'Abrir partida';
 const state=g.status==='finished'?'Cerrada':g.status==='paused'?'Pausada':g.status==='lobby'?'En la antesala':g.active===false?'Fuera de la sala':g.local?'Guardada':g.yourTurn?'Tu turno':'Esperando rival';
 return `<article class="saved-game${pins.includes(gamePinKey(g,uid))?' is-pinned':''}" data-local="${g.local}" data-id="${esc(g.id)}"><div class="saved-game-front"><button class="saved-game-info saved-game-open" data-action="load-game" data-local="${g.local}" data-id="${esc(g.id)}" data-code="${esc(g.code)}" aria-label="${label}: ${title}, ${esc(names)}"><span class="saved-game-thumbnail">${thumbnailMarkup(g.local?g:g.preview)}</span><span class="saved-game-copy"><strong>${pins.includes(gamePinKey(g,uid))?'<span class="saved-game-pin" aria-label="Anclada">'+pinIcon+'</span>':''}${title}${g.local?'':` <span class="mono">${esc(g.code)}</span>`}</strong><span>${esc(names)}</span><small>${state} · ${g.commonWorld?'30 s por turno':g.timeMode==='untimed'?'Sin reloj':'Con reloj'} · ${g.level==='advanced'?'Avanzado':'Normal'}${g.local&&g.mode==='solo'?' · Rival '+machineLevelLabel(g.difficulty):''}${g.local?' · Este dispositivo':''}</small></span></button><div class="saved-game-actions"><button class="saved-game-more" data-action="toggle-game-menu" aria-label="Opciones de partida" aria-expanded="false">⋯</button><div class="saved-game-menu" hidden><button data-action="pin-game" data-local="${g.local}" data-id="${esc(g.id)}">${pinIcon}${pins.includes(gamePinKey(g,uid))?'Desanclar':'Anclar'}</button><button data-action="delete-game" data-local="${g.local}" data-id="${esc(g.id)}">${g.local?'Borrar':'Quitar'}</button></div></div></div><button class="delete-game-button" data-action="delete-game" data-local="${g.local}" data-id="${esc(g.id)}" data-code="${esc(g.code)}" aria-label="${g.local?'Borrar':'Quitar'} partida ${esc(g.local?names:g.code)}" title="${g.local?'Borrar partida local':'Quitar de Mis partidas'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg></button></article>`;
 }).join('');
 return `<p>Elige qué partida quieres abrir. Las pausadas conservan tablero, puntos y turno.</p>${loading?'<p role="status">Consultando tus salas…</p>':''}${error?`<p class="muted">${esc(error)}</p>`:''}${pinned.length?`<div class="saved-game-group pinned-games"><h3 class="heading">Ancladas · ${pinned.length}</h3>${cards(pinned)}</div>`:''}<div class="saved-game-group"><h3 class="heading">En curso · ${open.length}</h3>${cards(open)||'<p class="muted">No hay partidas abiertas.</p>'}</div><div class="saved-game-group"><h3 class="heading">Pausadas · ${paused.length}</h3>${cards(paused)||'<p class="muted">No hay partidas pausadas.</p>'}</div><details class="closed-games"><summary>Cerradas · ${closed.length}</summary>${cards(closed)||'<p class="muted">No hay partidas cerradas.</p>'}</details><p class="muted">Las partidas locales se conservan en este navegador.</p>`;
}
function rankRows(players,uid){return `<ol class="world-rank-list">${players.map(p=>`<li class="${p.id===uid?'rank-you':''}"><span class="rank-position ${p.rank===1?'gold':p.rank===2?'silver':p.rank===3?'bronze':''}">${p.rank}</span><span>${esc(p.name)}${p.id===uid?' · tú':''}<small>${p.score||0} puntos · Combo máx. ${comboLabel(p)} · ${p.max?.actions||0}/100 acciones${p.max?.provisional?' · provisional':''}</small></span><strong class="mono">${maxLabel(p)}</strong></li>`).join('')}</ol>`;}
export function worldRankMarkup(state,uid){
 const {period='all',date='',hour=0,data,loading,error='',offset=0}=state;
 const filters=`<div class="rank-periods" role="group" aria-label="Periodo del ranking">${periods.map(([id,name])=>`<button data-action="rank-period" data-period="${id}" aria-pressed="${id===period}">${name}</button>`).join('')}</div>${period!=='all'?`<div class="rank-date"><label for="rank-date">Fecha del periodo<input id="rank-date" type="date" value="${esc(date)}"></label>${period==='hour'?`<label for="rank-hour">Hora<select id="rank-hour">${Array.from({length:24},(_,h)=>`<option value="${h}" ${h===Number(hour)?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select></label>`:''}</div>`:''}`;
 let body=filters;
 if(loading)return body+'<p role="status">Consultando el Ranking de Mundo…</p>';
 if(error)return body+`<p>${esc(error)}</p><button data-action="refresh-rank">Volver a consultar</button>`;
 if(!data)return body;
 if(data.from){const f=new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'});body+=`<p class="muted">${f.format(new Date(data.from))} → ${f.format(new Date(data.to))} · hora peninsular</p>`;}
 body+=`<section class="rank-personal"><strong>${data.you?`Tu posición: #${data.you.rank} · #MAX ${maxLabel(data.you)}`:period==='all'?'Entra en Mundo para aparecer en el ranking.':'No tienes jugadas en este periodo.'}</strong>${data.above?`<small>Tu rival superior: ${esc(data.above.name)} · #MAX ${maxLabel(data.above)}</small>`:''}</section><div class="rank-table-title"><span>POSICIÓN / JUGADOR</span><span>#MAX</span></div>`;
 body+=data.players?.length?rankRows(data.players,uid):'<p class="muted">Todavía no hay actividad de Mundo en este periodo.</p>';
 if(data.total>100)body+=`<div class="rank-pagination"><button data-action="rank-page" data-offset="${Math.max(0,offset-100)}" ${offset===0?'disabled':''}>Anterior</button><span>${offset+1}–${Math.min(offset+100,data.total)} / ${data.total}</span><button data-action="rank-page" data-offset="${offset+100}" ${offset+100>=data.total?'disabled':''}>Siguiente</button></div>`;
 body+=`<p class="muted">${period==='all'?'#MAX oficial · últimas 100 acciones de Mundo.':'#MAX de las últimas 100 acciones dentro del periodo elegido. El historial por periodos se registra desde R0.11.'} Puntos y actividad acompañan la clasificación.</p>`;
 return body;
}
