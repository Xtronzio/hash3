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
export function targetNavigation(room,{inspection=false,playerId}={}){
 const targets=room.watchTargets||[];
 const own=room.players?.find(p=>p.id===(playerId||room.humanId||room.pairs?.[0]?.x)),move=lastNavigationMove(own);
 return `<details class="target-jump-menu"><summary aria-label="Acercarse a una diana o a mi último movimiento" title="Acercarse"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></summary><div class="target-jump-options">${[1,2,3].map((number,i)=>{const p=targets.find(p=>p.number===number),name=['roja','verde','azul'][i];return `<button ${inspection?'data-inspect-action="target"':'data-action="locate-target"'} data-id="${p?.id||''}" class="watch-jump" data-target-color="${name}" style="color:${targetColors[i]}" aria-label="Acercarse a diana ${name}" title="Diana ${name}" ${p?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button>`;}).join('')}<button ${inspection?'data-inspect-action="last-move"':'data-action="center"'} class="watch-jump" data-target-color="blanca" style="color:#fff" aria-label="Acercarse a mi último movimiento" title="Mi último movimiento" ${move?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button></div></details>`;
}
export const watchedKeys=room=>new Map((room.watchTargets||[]).map(p=>[key(p.x,p.y),p]));
