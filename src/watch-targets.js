import {terrainOf,key} from './game.js';
export const targetIcon='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>';
export const targetColors=['var(--red)','var(--green)','var(--blue)'];
export const lastNavigationMove=player=>player?.navigationLastMove||player?.lastMove||null;
export function dianaCardMarkup(game,playerId,{paused=false,shortcut=false}={}){
 const enabled=!!game&&['solo','local'].includes(game.mode)&&game.playerInventory!==false&&game.status==='playing'&&!paused;
 const label='Diana · roja, verde y azul · marcar o quitar hasta tres posiciones, sin gastar turno';
 return `<${game?'button':'div'} class="${shortcut?'inventory-effect inventory-shortcut has-stock '+(enabled?'is-ready':''):'inventory-card inventory-icon-card'}" ${game?'data-action="mark-target"':'data-catalog-tool="target"'} data-tool="target" aria-label="${label}" title="${label}" ${game&&!enabled?'disabled':''}><span class="inventory-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></span><${shortcut?'small':'span class="inventory-count"'}>${game?.watchTargets?.length||0}/3</${shortcut?'small':'span'}></${game?'button':'div'}>`;
}
export function toggleWatchTarget(room,point){
 if(!Number.isInteger(point.x)||!Number.isInteger(point.y))throw new Error('Elige una celda del territorio.');
 room.watchTargets||=[];
 const existing=room.watchTargets.findIndex(p=>p.x===point.x&&p.y===point.y);
 if(existing>=0){room.watchTargets.splice(existing,1);return;}
 if(!terrainOf(room).some(p=>p.x===point.x&&p.y===point.y))throw new Error('Elige una celda del territorio.');
 if(room.watchTargets.length>=3)throw new Error('Puedes seguir tres celdas. Quita una diana antes de añadir otra.');
 const number=[1,2,3].find(n=>!room.watchTargets.some(p=>p.number===n));
 room.watchTargets.push({id:crypto.randomUUID(),number,x:point.x,y:point.y});
}
export function removeWatchTarget(room,id){
 if(typeof id!=='string'||!id)throw new Error('Elige la diana que quieres quitar.');
 room.watchTargets=(room.watchTargets||[]).filter(p=>p.id!==id);
}
export function targetRemovalMarkup(room){
 return `<div class="target-removal-list" aria-label="Quitar dianas">${(room.watchTargets||[]).map(p=>`<button data-action="remove-target" data-id="${p.id}" style="color:${targetColors[(p.number||1)-1]}" aria-label="Quitar diana ${['roja','verde','azul'][(p.number||1)-1]}"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg><span>${p.number}</span><svg class="target-remove-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>`).join('')}</div>`;
}
export function targetNavigation(room,{inspection=false,playerId}={}){
 const targets=room.watchTargets||[];
 const own=room.players?.find(p=>p.id===(playerId||room.humanId||room.pairs?.[0]?.x)),move=lastNavigationMove(own);
 return `<details class="target-jump-menu"><summary aria-label="Acercarse o quitar una diana" title="Acercarse y dianas"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></summary><div class="target-jump-options">${[1,2,3].map((number,i)=>{const p=targets.find(p=>p.number===number),name=['roja','verde','azul'][i];return `<div class="target-jump-row" style="color:${targetColors[i]}"><button ${inspection?'data-inspect-action="target"':'data-action="locate-target"'} data-id="${p?.id||''}" class="watch-jump" data-target-color="${name}" aria-label="Acercarse a diana ${name}" title="Diana ${name}" ${p?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button><button data-action="remove-target" data-id="${p?.id||''}" class="target-remove" aria-label="Quitar diana ${name}" title="Quitar diana ${name}" ${p&&['playing','paused'].includes(room.status)?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button></div>`;}).join('')}<button ${inspection?'data-inspect-action="last-move"':'data-action="center"'} class="watch-jump" data-target-color="blanca" style="color:#fff" aria-label="Acercarse a mi último movimiento" title="Mi último movimiento" ${move?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button></div></details>`;
}
export const watchedKeys=room=>new Map((room.watchTargets||[]).map(p=>[key(p.x,p.y),p]));
