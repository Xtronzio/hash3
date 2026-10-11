import {terrainOf,key,immediateAbove} from './game.js';
export const targetIcon='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>';
export const targetColors=['var(--red)','var(--green)','var(--blue)'];
export const lastNavigationMove=player=>player?.navigationLastMove||player?.lastMove||null;
const removeIcon='<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7"/>';
export function targetDestinations(room,playerId){
 const own=room.players?.find(p=>p.id===(playerId||room.humanId||room.pairs?.[0]?.x));
 const players=['solo','local'].includes(room.mode)?room.players:room.players?.filter(p=>!p.bot);
 const superior=own?immediateAbove(players||[],own.id,!!room.commonWorld):null;
 const position=p=>p?.lastMove||lastNavigationMove(p)||(()=>{const pair=room.pairs?.find(pair=>pair.id===p?.pair);return pair?{x:pair.active.x+1,y:pair.active.y+1}:null;})();
 return [
  {id:'x',color:'roja',paint:targetColors[0],label:'Marcas de X',point:position(room.players?.find(p=>p.symbol==='X'))},
  {id:'o',color:'verde',paint:targetColors[1],label:'Marcas de O',point:position(room.players?.find(p=>p.symbol==='O'))},
  {id:'above',color:'azul',paint:targetColors[2],label:'Objetivo inmediato superior',point:position(superior)},
  {id:'last',color:'blanca',paint:'#fff',label:'Mi último movimiento · última puesta',point:lastNavigationMove(own)}
 ];
}
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
 return `<div class="target-removal-list" aria-label="Quitar dianas">${(room.watchTargets||[]).map(p=>`<button data-action="remove-target" data-id="${p.id}" style="color:${targetColors[(p.number||1)-1]}" aria-label="Quitar diana ${['roja','verde','azul'][(p.number||1)-1]}"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg><span>${p.number}</span><svg class="target-remove-icon" viewBox="0 0 24 24" aria-hidden="true">${removeIcon}</svg></button>`).join('')}</div>`;
}
export function targetNavigation(room,{inspection=false,playerId}={}){
 const targets=room.watchTargets||[];
 const destinations=targetDestinations(room,playerId).map(p=>`<button ${inspection?'data-inspect-action="destination"':'data-action="locate-destination"'} data-destination="${p.id}" class="watch-jump" data-target-color="${p.color}" style="color:${p.paint}" aria-label="${p.label}" title="${p.label}" ${p.point?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></button>`).join('');
 const markers=[1,2,3].map((number,i)=>{const p=targets.find(p=>p.number===number),name=['roja','verde','azul'][i];return `<div class="target-jump-row" style="color:${targetColors[i]}"><button ${inspection?'data-inspect-action="target"':'data-action="locate-target"'} data-id="${p?.id||''}" class="watch-jump" data-marker-number="${number}" aria-label="Ir a mi diana ${number}" title="Diana guardada ${number}" ${p?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg><small>${number}</small></button><button data-action="remove-target" data-id="${p?.id||''}" class="target-remove" aria-label="Quitar diana ${name}" title="Quitar diana ${number}" ${p&&['playing','paused'].includes(room.status)?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true">${removeIcon}</svg></button></div>`;}).join('');
 return `<details class="target-jump-menu"><summary aria-label="Acercarse y dianas guardadas" title="Acercarse y dianas"><svg viewBox="0 0 24 24" aria-hidden="true">${targetIcon}</svg></summary><div class="target-jump-options"><div class="target-destinations">${destinations}</div><div class="target-markers">${markers}</div></div></details>`;
}
export const watchedKeys=room=>new Map((room.watchTargets||[]).map(p=>[key(p.x,p.y),p]));
