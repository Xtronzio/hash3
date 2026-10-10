import {isTurnWorm} from './worm-turns.js';
import {localLiving,LIVING_FREQUENCIES,livingMinimum,livingAttempt} from './living-balance.js';
import {borderIcon,wallIcon} from './frontiers.js';
import {snapshotMemo} from './snapshot-memo.js';
import {terrainOf,key} from './game.js';
import {HABITAT_FREQUENCIES} from './habitat-budget.js';
import {habitatTargets,rodentTurnsRemaining} from './habitat-tools.js';
import {habitatIcons,habitatAnimationDelay} from './inhabitants.js';
import {territoryIcons,territoryPlacements,territoryFigures} from './territory-tools.js';
import {rodentIcon} from './rodents.js';
import {neutralIcon,neutralFrequency} from './neutral.js';
import {frontierFootprint} from './frontiers.js';
import {ecologySeconds} from './ecology-clock.js';
import {TERRITORY_EVENT_RULES,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,EVENT_BALANCE,eventLabel,isTimedTerritoryKind,territoryAttemptInterval} from './territory-event-rules.js';
export const ecologyNames={rodent:'Ratón',worm:'Gusano',build:'Ampliadores',destroy:'Soldados',bomb:'Bombas antiguas',neutral:'Comodín #',frontier:'Muros',border:'Fronteras',...Object.fromEntries(Object.keys(TERRITORY_EVENT_RULES).map(kind=>[kind,eventLabel(kind)])),'invader-colony':'Colonias invasoras','rodent-plague':'Plaga de ratones','worm-plague':'Plaga de gusanos',contagion:'Contagio',tornado:'Tornado'};
export const ecologyColors={build:'var(--yellow)',destroy:'var(--yellow)',frontier:'var(--frontier)',border:'var(--frontier)',neutral:'#e3e5e9'};
const center=points=>{
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const p of points){left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
 const middle={x:(left+right)/2,y:(top+bottom)/2};return points.reduce((best,p)=>Math.hypot(p.x-middle.x,p.y-middle.y)<Math.hypot(best.x-middle.x,best.y-middle.y)?p:best,points[0]);
};
// Warnings keep the announced region, but only its surviving terrain is drawn.
// Cache the membership set with the snapshot; pan and clocks never scan it.
export function territoryRenderRegion(room,event){
 const known=snapshotMemo(room,'terrain-keys',()=>new Set(terrainOf(room).map(c=>key(c.x,c.y))));
 return event.region.filter(c=>known.has(key(c.x,c.y)));
}
export function phenomenonTargets(room,kind){
 return (room.territoryEvents||[]).filter(e=>e.kind===kind).flatMap(e=>{
  const groups=e.groups?.length?e.groups:['rain','meteorites','invader-rain'].includes(kind)?Array.from({length:Math.ceil(e.region.length/3)},(_,i)=>e.region.slice(i*3,i*3+3)):[e.region];
  const visible=new Set(territoryRenderRegion(room,e).map(c=>key(c.x,c.y)));
  return groups.flatMap((group,i)=>{const g=group.filter(c=>visible.has(key(c.x,c.y)));return g.length?[{...e,...center(g),kind,id:`${e.id}:${i}`,sourceId:e.sourceId||e.id,region:g,approach:e.approaches?.[i]}]:[];});
 });
}
export function ecologyTargets(room,kind,playerId){
 if(isTimedTerritoryKind(kind)){
  const live=snapshotMemo(room,'invasion-heads',()=>{const heads=new Map();for(const c of room.cells||[])if(c.symbol==='*'&&c.invasionId&&!heads.has(c.invasionId))heads.set(c.invasionId,c);return heads;});
  return [...phenomenonTargets(room,kind),...(room.invasions||[]).filter(c=>c.kind===kind).flatMap(c=>{const head=live.get(c.id);return head?[{...c,x:head.x,y:head.y,kind,sourceId:c.id,invasion:true}]:[];})];
 }
 if(kind==='neutral')return (room.cells||[]).filter(c=>c.symbol==='#').map(c=>({...c,kind}));
 if(['frontier','border'].includes(kind))return (room.frontiers||[]).filter(f=>(f.type==='border')===(kind==='border')).flatMap(f=>{const cells=frontierFootprint(f,room);return cells.length?[{...f,...center(cells),kind,sourceId:f.id}]:[];});
 if(['rodent','rodent-plague','worm','worm-plague'].includes(kind)){const base=kind.startsWith('rodent')?'rodent':'worm',large=kind.endsWith('plague');return habitatTargets(room,base,playerId).filter(e=>room.turnEcologyVersion!==1||((e.scale==='large'||e.count>1)===large)).map(e=>({...e,kind,sourceId:e.sourceId||e.id}));}
 return habitatTargets(room,kind,playerId).map(e=>({...e,sourceId:e.sourceId||e.id}));
}
export function nextEcologyTarget(items,previousId){if(!items.length)return null;const last=items.findIndex(e=>e.id===previousId);return items[(last+1)%items.length];}
export function ecologyIcon(kind){
 const base={'rodent-plague':'rodent','worm-plague':'worm'}[kind]||kind;
 const path=kind==='rodent-plague'||kind==='worm-plague'?habitatIcons[base]+'<path d="M2 3h6m-3-3v6M24 28h6m-3-3v6"/>':kind==='border'?borderIcon:kind==='rodent'?rodentIcon:kind==='neutral'?neutralIcon:kind==='frontier'?wallIcon:territoryIcons[kind]||habitatIcons[kind];
 return `<svg viewBox="0 0 ${kind==='neutral'?'64 64':'32 32'}" aria-hidden="true">${path||''}</svg>`;
}
export function ecologyClockEvents(room,kind){
 if(room.turnEcologyVersion===1&&['rodent','rodent-plague','worm','worm-plague'].includes(kind))return ecologyTargets(room,kind).filter(e=>e.warningTurns!=null);
 if(isTimedTerritoryKind(kind))return (room.territoryEvents||[]).filter(e=>e.kind===kind);
 return kind==='worm'?(room.worms||[]).filter(w=>!isTurnWorm(w)):['build','destroy'].includes(kind)?room.works||[]:kind==='bomb'?room.bombs||[]:[];
}
export function ecologyNavigationMarkup(room,playerId,{inspection=false,now=Date.now()}={}){
 const territoryKinds=room.territoryEnabled===false?[]:[...new Set([...INVADER_EVENT_ROTATION,...NATURAL_EVENT_ROTATION,...(room.territoryEvents||[]).map(e=>e.kind)])];
 const kinds=['rodent','worm',...(room.faunaEnabled!==false?['build','destroy']:[]),...(room.bombs?.length?['bomb']:[]),...territoryKinds,'neutral',...(room.frontiers?.some(f=>f.type!=='border')?['frontier']:[]),...(room.frontiers?.some(f=>f.type==='border')?['border']:[])];
 const forecasts=new Map([['invaders','territoryNextInvasion'],['natural','territoryNextPlacement']].map(([family,field])=>{
  const remaining=Math.max(0,(room[field]??territoryPlacements(room)+(livingAttempt(room,family)??territoryAttemptInterval(room.terrain?.length||0,family)))-territoryPlacements(room));
  const figures=Math.max(0,livingMinimum(room)-territoryFigures(room));
  return [family,` · próximo intento de la familia en ${remaining} colocaciones entre ambos${figures?' · faltan '+figures+' figuras para habilitarlo':''}${room.territoryEvents?.length?' · espera al aviso actual':''}`];
 }));
 const ordered=room.turnEcologyVersion===1?['rodent','rodent-plague','worm','worm-plague','build','destroy','meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','ufo','invader-colony','invader-rain','neutral',...kinds.filter(k=>!['rodent','worm','build','destroy',...NATURAL_EVENT_ROTATION,...INVADER_EVENT_ROTATION,'neutral'].includes(k))]:kinds;
 const columns=room.turnEcologyVersion===1;
 return (columns?'<div class="territory-columns" role="group" aria-label="Eventos locales y de gran escala">':'')+ordered.filter((kind,i,a)=>a.indexOf(kind)===i).filter(kind=>!['build','destroy','rodent','rodent-plague','worm','worm-plague'].includes(kind)||room.faunaEnabled!==false).filter(kind=>!isTimedTerritoryKind(kind)||room.territoryEnabled!==false).map(kind=>{
  const targets=ecologyTargets(room,kind,playerId),events=ecologyClockEvents(room,kind),color=ecologyColors[kind]||'var(--yellow)',frozen=events.some(e=>e.remainingMs!=null);
  const birthKind=['build','destroy'].includes(kind)?'work':kind==='rodent-plague'?'rodent':kind==='worm-plague'?'worm':kind,frequency=['rodent','worm','work'].includes(birthKind)?(localLiving(room)?LIVING_FREQUENCIES:HABITAT_FREQUENCIES)[birthKind]:null,births=(room.habitatZones||[]).map(z=>Math.max(0,(z.next?.[birthKind]??frequency)-z.placements)),birth=frequency&&room.faunaEnabled!==false?births.length?Math.min(...births):frequency:null;
  const colonies=targets.filter(e=>e.invasion);
  const turnEvents=events.filter(e=>e.warningTurns!=null||e.turnsRemaining!=null);
  let badge=turnEvents.length?`<span class="ecology-turn-badge mono">${Math.min(...turnEvents.map(e=>e.warningTurns??e.turnsRemaining))}↷</span>`:kind==='worm'?'':events.length?`<span class="ecology-clock mono" data-ecology-kind="${kind}" aria-label="${Math.min(...events.map(e=>ecologySeconds(e,now)))} segundos">${Math.min(...events.map(e=>ecologySeconds(e,now)))}</span><small>s</small>`:colonies.length?'':kind==='rodent'&&room.rodentRaids?.length?`<span class="ecology-badge mono" aria-label="Turnos restantes del ciclo visible">${Math.max(...(room.rodentRaids||[]).map(rodentTurnsRemaining),0)}</span>`:targets.length>1?`<span class="ecology-badge mono">${targets.length}</span>`:birth!=null?`<span class="ecology-badge mono" data-ecology-birth="${birthKind}" aria-label="Próximo intento en ${birth} colocaciones de la zona">${birth}</span>`:'';
  const own=room.players?.find(p=>p.id===playerId),neutralNext=room.territoryEnabled!==false&&own?neutralFrequency(room)-(own.placements||0)%neutralFrequency(room):null;
  const upcoming=kind==='neutral'&&neutralNext!=null?` · siguiente intento en ${neutralNext} colocaciones propias`:'';
  const timed=isTimedTerritoryKind(kind),active=targets.length>0,family=TERRITORY_EVENT_RULES[kind]?.family==='invaders'?'invaders':'natural';
  if(columns){
   const next=kind==='neutral'?neutralNext:birth!=null?birth:timed?Math.max(0,(room[family==='invaders'?'territoryNextInvasion':'territoryNextPlacement']??territoryPlacements(room)+livingAttempt(room,family))-territoryPlacements(room)):null;
   const missing=timed?Math.max(0,livingMinimum(room)-territoryFigures(room)):0;
   badge=next==null?'':`<span class="ecology-badge mono" aria-label="${missing?'Faltan '+missing+' figuras para habilitar la familia':'Próximo intento en '+next+' colocaciones'}">${missing||next}</span>`;
  }
  // Anchor the brief announcement pulse to game time so snapshot redraws do
  // not restart it. Paused events keep their exact elapsed warning time.
  const elapsed=timed&&events.length&&!columns?Math.min(...events.map(e=>Math.max(0,EVENT_BALANCE.warningMs-(e.remainingMs??(e.nextAt-now))))):0;
  const label=`${ecologyNames[kind]} · ${active?'activo':'inactivo'} · ${targets.length} ubicaciones${events.length?' · próxima intervención en '+Math.min(...events.map(e=>ecologySeconds(e,now)))+(columns?' turnos':' segundos'):['rodent','worm'].includes(kind)&&targets.length?' · actúa por turnos, sin cuenta atrás temporal':colonies.length?' · crece una casilla por turno hasta nueve':''}${frozen?' · cuenta atrás congelada':''}${upcoming}${timed&&!active?forecasts.get(family):''}${birth!=null?` · siguiente intento en ${birth} colocaciones de la zona`:''}`;
  return `<button ${inspection?'data-inspect-action="ecology"':'data-action="locate-ecology"'} data-ecology-kind="${kind}" ${timed?'data-ecology-attempt="'+family+'"':''} class="ecology-jump ${active?'is-active':'is-inactive'} ${timed&&events.length?'is-announced':''} ${frozen?'is-frozen':''}" style="--ecology-color:${color};--ecology-activation-delay:-${elapsed}ms" aria-label="${label}" title="${label}" ${targets.length?'':'disabled'}>${ecologyIcon(kind)}${badge}</button>`;
 }).join('')+(columns?'</div>':'');
}
export function ecologyPinTargets(room,playerId){
 return (room.turnEcologyVersion===1?['rodent','rodent-plague','worm','worm-plague','build','destroy','bomb']:['rodent','worm','build','destroy','bomb']).concat([...new Set([...(room.territoryEvents||[]),...(room.invasions||[])].map(e=>e.kind))]).flatMap(kind=>ecologyTargets(room,kind,playerId));
}
// A fit view may contain many rain groups. Draw at most 33 markers, keeping
// their real coordinates; every group remains reachable through the icon.
export function ecologyMapPins(targets,now=Date.now(),maximum=33){
 targets=targets.filter(e=>!e.invasion);
 const selected=targets.length>maximum?Array.from({length:maximum},(_,i)=>targets[Math.floor(i*targets.length/maximum)]):targets;
 return selected.map(e=>{
  const base={'rodent-plague':'rodent','worm-plague':'worm'}[e.kind]||e.kind,turns=e.warningTurns!=null||e.turnsRemaining!=null;
  const color=ecologyColors[e.kind]||'var(--yellow)',timed=!isTurnWorm(e)&&!e.invasion&&(['worm','build','destroy','bomb'].includes(e.kind)||isTimedTerritoryKind(e.kind)),value=e.invasion||base==='worm'&&!turns?null:turns?ecologySeconds(e,now):timed?ecologySeconds(e,now):rodentTurnsRemaining(e);
  return `<g class="ecology-map-pin visible-inhabitant habitat-${e.kind} phase-${e.phase||'working'} ${e.frozen||e.remainingMs!=null?'is-frozen':''}" data-x="${e.x+.5}" data-y="${e.y+.5}" style="color:${color};--inhabitant-delay:${habitatAnimationDelay(e,e.kind,now)}ms"><title>${ecologyNames[e.kind]}${e.invasion?' · en crecimiento':''}${e.approach?' · entrada '+e.approach.side:''}</title>${e.approach?`<path class="invasion-direction" d="M0-27v9m-4-4 4 4 4-4" transform="rotate(${{north:0,east:90,south:180,west:270}[e.approach.side]})" fill="none" stroke="currentColor" stroke-width="2"/>`:''}<circle r="13" fill="#101216" stroke="currentColor" stroke-width="1.5"/><svg x="-10" y="${value==null?-10:-12}" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${base==='rodent'?rodentIcon:territoryIcons[base]||habitatIcons[base]}</svg>${value==null?'':`<text y="11" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" class="${timed&&!turns?'ecology-clock':''}" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId||e.id}" aria-label="${timed&&!turns?value+' segundos':value+' turnos'}">${value}</text>`}</g>`;
 }).join('');
}
