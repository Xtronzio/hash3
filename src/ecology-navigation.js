import {habitatTargets} from './habitat-tools.js';
import {habitatIcons} from './inhabitants.js';
import {territoryIcons} from './territory-tools.js';
import {rodentIcon} from './rodents.js';
import {neutralIcon} from './neutral.js';
import {frontierFootprint} from './frontiers.js';
import {ecologySeconds} from './ecology-clock.js';
export const ecologyNames={rodent:'Roedores',worm:'Gusanos',build:'Constructores',destroy:'Destructores',bomb:'Bombas antiguas',rain:'Lluvia de bombas',ufo:'OVNI',cataclysm:'Cataclismo',neutral:'Ficha neutral #',frontier:'Muros'};
export const ecologyColors={build:'var(--green)',destroy:'var(--red)',frontier:'var(--frontier)',neutral:'#e3e5e9'};
const center=points=>{
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const p of points){left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
 const middle={x:(left+right)/2,y:(top+bottom)/2};return points.reduce((best,p)=>Math.hypot(p.x-middle.x,p.y-middle.y)<Math.hypot(best.x-middle.x,best.y-middle.y)?p:best,points[0]);
};
export function phenomenonTargets(room,kind){
 return (room.territoryEvents||[]).filter(e=>e.kind===kind).flatMap(e=>{
  const groups=kind==='rain'?Array.from({length:Math.ceil(e.region.length/3)},(_,i)=>e.region.slice(i*3,i*3+3)):[e.region];
  return groups.filter(g=>g.length).map((g,i)=>({...e,...center(g),kind,id:`${e.id}:${i}`,sourceId:e.id,region:g}));
 });
}
export function ecologyTargets(room,kind,playerId){
 if(['rain','ufo','cataclysm'].includes(kind))return phenomenonTargets(room,kind);
 if(kind==='neutral')return (room.cells||[]).filter(c=>c.symbol==='#').map(c=>({...c,kind}));
 if(kind==='frontier')return (room.frontiers||[]).flatMap(f=>{const cells=frontierFootprint(f,room);return cells.length?[{...f,...center(cells),kind,sourceId:f.id}]:[];});
 return habitatTargets(room,kind,playerId).map(e=>({...e,sourceId:e.id}));
}
export function nextEcologyTarget(items,previousId){if(!items.length)return null;const last=items.findIndex(e=>e.id===previousId);return items[(last+1)%items.length];}
export function ecologyIcon(kind){
 const path=kind==='rodent'?rodentIcon:kind==='neutral'?neutralIcon:kind==='frontier'?'<rect x="4" y="4" width="24" height="24"/><path d="m16 8 8 8-8 8-8-8Z"/>':territoryIcons[kind]||habitatIcons[kind];
 return `<svg viewBox="0 0 ${kind==='neutral'?'64 64':'32 32'}" aria-hidden="true">${path||''}</svg>`;
}
export function ecologyClockEvents(room,kind){
 if(['rain','ufo','cataclysm'].includes(kind))return (room.territoryEvents||[]).filter(e=>e.kind===kind);
 return kind==='worm'?room.worms||[]:['build','destroy'].includes(kind)?room.works||[]:kind==='bomb'?room.bombs||[]:[];
}
export function ecologyNavigationMarkup(room,playerId,{inspection=false,now=Date.now()}={}){
 const kinds=['rodent','worm',...(room.faunaEnabled!==false?['build','destroy']:[]),...(room.bombs?.length?['bomb']:[]),...(room.territoryEnabled!==false?['rain','ufo','cataclysm']:[]),'neutral',...(room.frontiers?.length?['frontier']:[])];
 return kinds.map(kind=>{
  const targets=ecologyTargets(room,kind,playerId),events=ecologyClockEvents(room,kind),color=ecologyColors[kind]||'var(--yellow)',frozen=events.some(e=>e.remainingMs!=null);
  const birthKind=['build','destroy'].includes(kind)?'work':kind,frequency={rodent:33,worm:99,work:198}[birthKind],births=(room.habitatZones||[]).map(z=>Math.max(0,(z.next?.[birthKind]??frequency)-z.placements)),birth=frequency&&room.faunaEnabled!==false?births.length?Math.min(...births):frequency:null;
  const badge=events.length?`<span class="ecology-clock mono" data-ecology-kind="${kind}" aria-label="${Math.min(...events.map(e=>ecologySeconds(e,now)))} segundos">${Math.min(...events.map(e=>ecologySeconds(e,now)))}</span>`:kind==='rodent'&&targets.length?`<span class="ecology-badge mono" aria-label="Visitas restantes por colocaciones">${Math.max(...targets.map(r=>r.remaining??3-(r.eaten||0)))}</span>`:targets.length>1?`<span class="ecology-badge mono">${targets.length}</span>`:birth!=null?`<span class="ecology-badge mono" data-ecology-birth="${birthKind}" aria-label="Próximo intento en ${birth} colocaciones de la zona">${birth}</span>`:'';
  const own=room.players?.find(p=>p.id===playerId),neutralNext=room.territoryEnabled!==false&&own?33-(own.placements||0)%33:null;
  const upcoming=kind==='neutral'&&neutralNext!=null?` · siguiente intento en ${neutralNext} colocaciones propias`:'';
  const label=`${ecologyNames[kind]} · ${targets.length} ubicaciones${frozen?' · cuenta atrás congelada':''}${upcoming}${birth!=null?` · siguiente intento en ${birth} colocaciones de la zona`:''}`;
  return `<button ${inspection?'data-inspect-action="ecology"':'data-action="locate-ecology"'} data-ecology-kind="${kind}" class="ecology-jump ${frozen?'is-frozen':''}" style="--ecology-color:${color}" aria-label="${label}" title="${label}" ${targets.length?'':'disabled'}>${ecologyIcon(kind)}${badge}</button>`;
 }).join('');
}
export function ecologyPinTargets(room,playerId){
 return ['rodent','worm','build','destroy','bomb','rain','ufo','cataclysm'].flatMap(kind=>ecologyTargets(room,kind,playerId));
}
// A fit view may contain many rain groups. Draw at most 33 markers, keeping
// their real coordinates; every group remains reachable through the icon.
export function ecologyMapPins(targets,now=Date.now(),maximum=33){
 const selected=targets.length>maximum?Array.from({length:maximum},(_,i)=>targets[Math.floor(i*targets.length/maximum)]):targets;
 return selected.map(e=>{
  const color=ecologyColors[e.kind]||'var(--yellow)',timed=['worm','build','destroy','bomb','rain','ufo','cataclysm'].includes(e.kind),value=timed?ecologySeconds(e,now):e.remaining??3-(e.eaten||0);
  return `<g class="ecology-map-pin" data-x="${e.x+.5}" data-y="${e.y+.5}" style="color:${color}"><title>${ecologyNames[e.kind]}</title><circle r="13" fill="#101216" stroke="currentColor" stroke-width="1.5"/><svg x="-10" y="-12" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${e.kind==='rodent'?rodentIcon:territoryIcons[e.kind]||habitatIcons[e.kind]}</svg><text y="11" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" class="${timed?'ecology-clock':''}" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId||e.id}" aria-label="${timed?value+' segundos':value+' visitas'}">${value}</text></g>`;
 }).join('');
}
