import {SELECTABLE_FAUNA,faunaKindEnabled} from './fauna-selection.js';
import {phenomenonEnabled} from './phenomena-selection.js';
import {fogKeys} from './fog.js';
import {briefEcology,BRIEF_FREQUENCIES} from './brief-ecology.js';
import {lastGlyphPerCell} from './glyph-order.js';
import {faunaSuspended} from './ecology.js';
import {isTurnWorm} from './worm-turns.js';
import {localLiving,plannedEcology,LIVING_FREQUENCIES,livingMinimum,livingAttempt} from './living-balance.js';
import {borderIcon,wallIcon} from './frontiers.js';
import {snapshotMemo} from './snapshot-memo.js';
import {terrainOf,key} from './game.js';
import {HABITAT_FREQUENCIES} from './habitat-budget.js';
import {habitatTargets,rodentTurnsRemaining} from './habitat-tools.js';
import {habitatIcons,habitatAnimationDelay} from './inhabitants.js';
import {territoryIcons,territoryProgress,territoryFigures} from './territory-tools.js';
import {rodentIcon} from './rodents.js';
import {neutralIcon,neutralFrequency} from './neutral.js';
import {frontierFootprint} from './frontiers.js';
import {ecologySeconds} from './ecology-clock.js';
import {TERRITORY_EVENT_RULES,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,EVENT_BALANCE,eventLabel,isTimedTerritoryKind,territoryAttemptInterval} from './territory-event-rules.js';
export const ecologyNames={rodent:'Ratón',worm:'Gusano',build:'Ampliadores',destroy:'Soldados',bomb:'Bombas antiguas',neutral:'Comodín #',frontier:'Muros',border:'Fronteras',...Object.fromEntries(Object.keys(TERRITORY_EVENT_RULES).map(kind=>[kind,eventLabel(kind)])),'invader-colony':'Colonias invasoras','rodent-plague':'Plaga de ratones','worm-plague':'Plaga de gusanos',contagion:'Contagio',tornado:'Tornado'};
Object.assign(ecologyNames,{ants:'Hormigas','ants-plague':'Plaga de hormigas',anaconda:'Anaconda',clouds:'Nubes',fog:'Niebla',rhino:'Rinoceronte','rhino-plague':'Plaga de rinocerontes',beaver:'Castor','beaver-plague':'Plaga de castores','beaver-barrier':'Barreras de castor //',death:'Celda muerta','invader-colony':'Entrada invasora'});
ecologyNames.barriers='Muros y Fronteras';
export const ecologyColors={build:'var(--yellow)',destroy:'var(--yellow)',frontier:'var(--yellow)',border:'var(--yellow)',barriers:'var(--yellow)',neutral:'var(--yellow)'};
const center=points=>{
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;for(const p of points){left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
 const middle={x:(left+right)/2,y:(top+bottom)/2};return points.reduce((best,p)=>Math.hypot(p.x-middle.x,p.y-middle.y)<Math.hypot(best.x-middle.x,best.y-middle.y)?p:best,points[0]);
};
// Warnings keep the announced region, but only its surviving terrain is drawn.
// Cache the membership set with the snapshot; pan and clocks never scan it.
export function territoryRenderRegion(room,event){
 const known=snapshotMemo(room,'terrain-keys',()=>new Set(terrainOf(room).map(c=>key(c.x,c.y))));
 const protectedCells=new Set(['contagion','pandemic'].includes(event.kind)?(event.antidotes||[]).map(c=>key(c.x,c.y)):[]);
 return event.region.filter(c=>known.has(key(c.x,c.y))&&!protectedCells.has(key(c.x,c.y)));
}
export function phenomenonTargets(room,kind){
 return [...(room.territoryEvents||[]),...(room.fogEffects||[])].filter(e=>e.kind===kind).flatMap(e=>{
  const groups=e.groups?.length?e.groups:['rain','meteorites','invader-rain'].includes(kind)?Array.from({length:Math.ceil(e.region.length/3)},(_,i)=>e.region.slice(i*3,i*3+3)):[e.region];
  const visible=new Set((kind==='invader-rain'?e.region:territoryRenderRegion(room,e)).map(c=>key(c.x,c.y)));
  return groups.flatMap((group,i)=>{const g=group.filter(c=>visible.has(key(c.x,c.y)));return g.length?[{...e,activeFog:(room.fogEffects||[]).includes(e),...(e.bombPhase==='bomb'?g[0]:center(g)),kind,id:`${e.id}:${i}`,sourceId:e.sourceId||e.id,region:g,approach:e.approaches?.[i]}]:[];});
 });
}
export function ecologyTargets(room,kind,playerId){
 if(kind==='death')return [...phenomenonTargets(room,kind),...(room.deadCells||[]).map((c,i)=>({...c,id:'dead:'+i,kind}))];
 if(isTimedTerritoryKind(kind)){
  const live=snapshotMemo(room,'invasion-heads',()=>{const heads=new Map();for(const c of room.cells||[])if(c.symbol==='*'&&c.invasionId&&!heads.has(c.invasionId))heads.set(c.invasionId,c);return heads;});
  return [...phenomenonTargets(room,kind),...(briefEcology(room)&&kind==='invader-colony'?(room.cells||[]).filter(c=>c.symbol==='*'&&!fogKeys(room).has(key(c.x,c.y))).map(c=>({...c,kind,id:c.id,sourceId:c.id,invasion:true})):[]),...(briefEcology(room)?[]:(room.invasions||[])).filter(c=>c.kind===kind).flatMap(c=>{const head=live.get(c.id);return head?[{...c,x:head.x,y:head.y,kind,sourceId:c.id,invasion:true}]:[];})];
 }
 if(kind==='beaver-barrier')return (room.frontiers||[]).filter(f=>f.type==='beaver').map(f=>({...f,...center(f.cells),kind}));
 if(['ants','ants-plague'].includes(kind))return habitatTargets(room,kind,playerId);
 if(['rhino','rhino-plague','beaver','beaver-plague'].includes(kind))return (room.faunaEvents||[]).filter(e=>e.kind===kind).map(e=>({...e,sourceId:e.id}));
 if(kind==='neutral')return (room.cells||[]).filter(c=>c.symbol==='#'&&!fogKeys(room).has(key(c.x,c.y))).map(c=>({...c,kind}));
 if(['frontier','border','barriers'].includes(kind))return (room.frontiers||[]).filter(f=>kind==='barriers'||(f.type==='border')===(kind==='border')).flatMap(f=>{const cells=frontierFootprint(f,room);return cells.length?[{...f,...center(cells),kind,sourceId:f.id}]:[];});
 if(['rodent','rodent-plague','worm','worm-plague'].includes(kind)){const base=kind.startsWith('rodent')?'rodent':'worm',large=kind.endsWith('plague');return habitatTargets(room,base,playerId).filter(e=>room.turnEcologyVersion!==1||((e.scale==='large'||e.count>1)===large)).map(e=>({...e,kind,sourceId:e.sourceId||e.id}));}
 return habitatTargets(room,kind,playerId).map(e=>({...e,sourceId:e.sourceId||e.id}));
}
export function nextEcologyTarget(items,previousId){if(!items.length)return null;const last=items.findIndex(e=>e.id===previousId);return items[(last+1)%items.length];}
export function ecologyIcon(kind){
 if(kind==='barriers')return '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="9" width="20" height="20" rx="3"/><path d="M9 9V6a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-3M8 24l10-10"/></svg>';
 const base=kind.replace('-plague','');
 const path=kind.endsWith('-plague')?habitatIcons[base]+'<path d="M2 3h6m-3-3v6M24 28h6m-3-3v6"/>':kind==='border'?borderIcon:kind==='rodent'?rodentIcon:kind==='neutral'?neutralIcon:kind==='frontier'?wallIcon:territoryIcons[kind]||habitatIcons[kind];
 return `<svg viewBox="0 0 ${kind==='neutral'?'64 64':'32 32'}" aria-hidden="true">${path||''}</svg>`;
}
export function ecologyClockEvents(room,kind){
 if(['rhino','rhino-plague','beaver','beaver-plague','ants','ants-plague'].includes(kind))return (room.faunaEvents||[]).filter(e=>e.kind===kind);
 if(room.turnEcologyVersion===1&&['rodent','rodent-plague','worm','worm-plague'].includes(kind))return ecologyTargets(room,kind).filter(e=>e.warningTurns!=null);
 if(kind==='anaconda')return (room.anacondas||[]).filter(e=>e.warningTurns!=null);
 if(isTimedTerritoryKind(kind))return [...(room.territoryEvents||[]),...(room.fogEffects||[])].filter(e=>e.kind===kind);
 return kind==='worm'?(room.worms||[]).filter(w=>!isTurnWorm(w)):['build','destroy'].includes(kind)?room.works||[]:kind==='bomb'?room.bombs||[]:[];
}
export function ecologyCardStatus(room,kind,playerId,{events=ecologyClockEvents(room,kind),targets=ecologyTargets(room,kind,playerId)}={}){
 if(['build','destroy'].includes(kind))events=events.filter(e=>e[kind]?.slice(e.done||0).length);
 const announced=events.filter(e=>e.warningTurns!=null||e.turnsRemaining!=null);
 if([...SELECTABLE_FAUNA,'beaver-barrier'].includes(kind)&&!faunaKindEnabled(room,kind)&&!events.length&&!targets.length)return {badge:'—',text:'Desactivado en la configuración de esta partida.',state:'disabled'};
 if((isTimedTerritoryKind(kind)||kind==='neutral')&&!phenomenonEnabled(room,kind)&&!events.length&&!targets.length)return {badge:'—',text:'Desactivado en la configuración de esta partida.',state:'disabled'};
 if(kind==='barriers')return {badge:'×'+targets.length,text:targets.length+' muros y fronteras colocados. Permanecen hasta que se destruyen.',state:'quantity'};
 if(kind==='beaver-barrier')return targets.length?{badge:'−'+Math.min(...targets.map(e=>e.turnsRemaining)),text:'Turnos completos hasta que desaparezca la primera barrera de castor.',state:'duration'}:{badge:'—',text:'No hay barreras de castor colocadas.',state:'absent'};
 if(['clouds','fog'].includes(kind)&&room.fogEffects?.some(e=>e.kind===kind)){const turns=Math.min(...room.fogEffects.filter(e=>e.kind===kind).map(e=>e.turnsRemaining));return {badge:'−'+turns,turns,text:turns+' turnos hasta disiparse.',state:'duration'};}
 if(kind==='anaconda'&&targets.some(e=>e.warningTurns==null))return {badge:'3↷',text:'Avanza tres celdas por turno hasta quedarse sin continuación.',state:'active'};
 if(announced.length){const turns=Math.min(...announced.map(e=>e.warningTurns??e.turnsRemaining));return {badge:'−'+turns,turns,text:turns+' turnos hasta la intervención anunciada.',state:'announced'};}
 if(kind==='invader-colony'&&briefEcology(room))return {badge:targets.length?'∞':'—',text:targets.length?'Invasores estáticos: no caducan. Su icono permite localizarlos.':'No hay una entrada invasora anunciada ni invasores que localizar.',state:targets.length?'permanent':'absent'};
 let turns=null;
 if(kind==='death'&&briefEcology(room))turns=Math.max(0,(room.territoryNextDeathTurn??(room.ecologyTurns||0)+333)-(room.ecologyTurns||0))+3;
 else if(kind==='neutral'){
  const player=room.players?.find(p=>p.id===playerId);if(player&&room.territoryEnabled!==false)turns=neutralFrequency(room)-(player.ecologyPlacements||0)%neutralFrequency(room);
 }else if(isTimedTerritoryKind(kind)){
  const family=TERRITORY_EVENT_RULES[kind]?.family==='invaders'?'invaders':'natural',field=family==='invaders'?'territoryNextInvasion':'territoryNextPlacement';
  if(room.territoryPlans?.[family]===kind)turns=Math.max(0,(room[field]??territoryProgress(room)+livingAttempt(room,family))-territoryProgress(room))+3;
 }else{
  const species=['rodent','worm','rhino','beaver','anaconda','ants'],base=kind.replace('-plague',''),birthKind=['build','destroy'].includes(kind)?'work':base;
  const frequency=({...LIVING_FREQUENCIES,...BRIEF_FREQUENCIES})[birthKind],large=kind.endsWith('plague');
  if(frequency){const zones=(room.habitatZones||[]).filter(z=>!species.includes(base)||((z.birthScale?.[base]||0)%2===1)===large);
   if(zones.length)turns=Math.min(...zones.map(z=>Math.max(0,(z.next?.[birthKind]??frequency)-z.placements)))+3;
   else if(!room.habitatZones?.length&&!large)turns=frequency+3;
  }
 }
 if(turns==null)return {badge:'…',text:'Todavía sin turno asignado: esta variante no es la próxima elegida. No es una cuenta atrás.',state:'unplanned'};
 const waiting=kind!=='neutral'&&(isTimedTerritoryKind(kind)?territoryFigures(room)<livingMinimum(room)||!!room.territoryEvents?.length:faunaSuspended(room));
 return {badge:'−'+turns,turns,state:'forecast',text:turns+' '+(kind==='neutral'?'turnos propios':'turnos completos')+' hasta la aparición prevista'+(kind==='neutral'?'':', incluidos tres de aviso')+'. '+(waiting?'En espera: el contador no garantiza aparición mientras falten condiciones.':'Sujeta a espacio, alimento y población disponibles.')};
}
export function ecologyNavigationMarkup(room,playerId,{inspection=false,now=Date.now()}={}){
 const territoryKinds=room.territoryEnabled===false?[]:[...new Set([...INVADER_EVENT_ROTATION,...NATURAL_EVENT_ROTATION,...(room.territoryEvents||[]).map(e=>e.kind)])];
 const kinds=['rodent','worm',...(room.faunaEnabled!==false?['build','destroy']:[]),...(room.bombs?.length?['bomb']:[]),...territoryKinds,'neutral',...(room.frontiers?.length?['barriers']:[])];
 const forecasts=new Map([['invaders','territoryNextInvasion'],['natural','territoryNextPlacement']].map(([family,field])=>{
  const remaining=Math.max(0,(room[field]??territoryProgress(room)+(livingAttempt(room,family)??territoryAttemptInterval(room.terrain?.length||0,family)))-territoryProgress(room));
  const figures=Math.max(0,livingMinimum(room)-territoryFigures(room));
  return [family,` · próximo intento de la familia en ${remaining} ${plannedEcology(room)?'turnos completos':'colocaciones entre ambos'}${figures?' · faltan '+figures+' figuras para habilitarlo':''}${room.territoryEvents?.length?' · espera al aviso actual':''}`];
 }));
 const ordered=room.turnEcologyVersion===1?['rodent','rodent-plague','worm','worm-plague',...(briefEcology(room)?['rhino','rhino-plague','beaver','beaver-plague','anaconda','ants','ants-plague']:[]),'build','destroy','meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','ufo','clouds','fog','invader-colony','invader-rain',...(briefEcology(room)?['death','beaver-barrier']:[]),'barriers','neutral',...kinds.filter(k=>!['rodent','worm','build','destroy',...NATURAL_EVENT_ROTATION,...INVADER_EVENT_ROTATION,'neutral'].includes(k))]:kinds;
 const columns=room.turnEcologyVersion===1;
 const visible=ordered.filter((kind,i,a)=>a.indexOf(kind)===i).filter(kind=>![...SELECTABLE_FAUNA,'beaver-barrier'].includes(kind)||faunaKindEnabled(room,kind)||ecologyTargets(room,kind,playerId).length>0).filter(kind=>(!isTimedTerritoryKind(kind)&&kind!=='neutral'||phenomenonEnabled(room,kind))||ecologyTargets(room,kind,playerId).length>0);
 const renderButton=kind=>{
  const targets=ecologyTargets(room,kind,playerId),events=ecologyClockEvents(room,kind).filter(e=>!columns||!['build','destroy'].includes(kind)||(e[kind]?.slice(e.done||0).length||0)>0),color=ecologyColors[kind]||'var(--yellow)',frozen=room.status==='paused'||events.some(e=>e.remainingMs!=null);
  const birthKind=['build','destroy'].includes(kind)?'work':kind==='rodent-plague'?'rodent':kind==='worm-plague'?'worm':kind.replace('-plague',''),frequency=['rodent','worm','work','rhino','beaver','anaconda','ants'].includes(birthKind)?(localLiving(room)?{...LIVING_FREQUENCIES,...BRIEF_FREQUENCIES}:HABITAT_FREQUENCIES)[birthKind]:null,births=(room.habitatZones||[]).map(z=>Math.max(0,(z.next?.[birthKind]??frequency)-z.placements)),birth=frequency&&room.faunaEnabled!==false?births.length?Math.min(...births):frequency:null;
  let forecasting=false;
  const colonies=targets.filter(e=>e.invasion);
  const turnEvents=events.filter(e=>e.warningTurns!=null||e.turnsRemaining!=null);
  const imminent=turnEvents.some(e=>(e.warningTurns??e.turnsRemaining)<=1);
  let badge=turnEvents.length?`<span class="ecology-turn-badge mono">${Math.min(...turnEvents.map(e=>e.warningTurns??e.turnsRemaining))}↷</span>`:kind==='worm'?'':events.length?`<span class="ecology-clock mono" data-ecology-kind="${kind}" aria-label="${Math.min(...events.map(e=>ecologySeconds(e,now)))} segundos">${Math.min(...events.map(e=>ecologySeconds(e,now)))}</span><small>s</small>`:colonies.length?'':kind==='rodent'&&room.rodentRaids?.length?`<span class="ecology-badge mono" aria-label="Turnos restantes del ciclo visible">${Math.max(...(room.rodentRaids||[]).map(rodentTurnsRemaining),0)}</span>`:targets.length>1?`<span class="ecology-badge mono">${targets.length}</span>`:birth!=null?`<span class="ecology-badge mono" data-ecology-birth="${birthKind}" aria-label="Próximo intento en ${birth} ${plannedEcology(room)?'turnos de la zona':'colocaciones de la zona'}">${birth}</span>`:'';
  const own=room.players?.find(p=>p.id===playerId),neutralNext=room.territoryEnabled!==false&&own?neutralFrequency(room)-(plannedEcology(room)?own.ecologyPlacements||0:own.placements||0)%neutralFrequency(room):null;
  const upcoming=kind==='neutral'&&neutralNext!=null?` · siguiente intento en ${neutralNext} ${plannedEcology(room)?'turnos propios':'colocaciones propias'}`:'';
  const timed=isTimedTerritoryKind(kind),active=targets.length>0,family=TERRITORY_EVENT_RULES[kind]?.family==='invaders'?'invaders':'natural';
  if(columns){
   const status=ecologyCardStatus(room,kind,playerId,{events,targets});forecasting=status.state==='forecast';
   badge=kind==='barriers'?`<span class="ecology-badge mono" data-ecology-state="quantity" aria-label="${targets.length} barreras colocadas">${status.badge}</span>`:`<span class="ecology-badge ecology-turn-badge mono ${status.state==='announced'?'':'is-forecast'}" ${status.turns!=null?'data-ecology-countdown="'+kind+'"':''} data-ecology-state="${status.state}" aria-label="${status.text}">${status.badge}</span>`;
  }
  if(!columns&&kind==='barriers')badge=`<span class="ecology-badge mono" aria-label="${targets.length} barreras colocadas">×${targets.length}</span>`;
  // Anchor the brief announcement pulse to game time so snapshot redraws do
  // not restart it. Paused events keep their exact elapsed warning time.
  const elapsed=timed&&events.length&&!columns?Math.min(...events.map(e=>Math.max(0,EVENT_BALANCE.warningMs-(e.remainingMs??(e.nextAt-now))))):0;
  const label=`${ecologyNames[kind]}${kind==='barriers'?` · Muros: ${targets.filter(t=>t.type!=='border').length} · Fronteras: ${targets.filter(t=>t.type==='border').length}`:''} · ${active?'activo':'inactivo'} · ${targets.length} ubicaciones${events.length?' · próxima intervención en '+Math.min(...events.map(e=>ecologySeconds(e,now)))+(columns?' turnos':' segundos'):['rodent','worm'].includes(kind)&&targets.length?' · actúa por turnos, sin cuenta atrás temporal':colonies.length?(briefEcology(room)?' · ocupación estática':' · crece una casilla por turno hasta nueve'):''}${frozen?' · cuenta atrás congelada':''}${upcoming}${timed&&!active?forecasts.get(family):''}${birth!=null?` · siguiente intento en ${birth} ${plannedEcology(room)?'turnos de la zona':'colocaciones de la zona'}`:''}`+(columns?' · '+ecologyCardStatus(room,kind,playerId,{events,targets}).text:'');
  return `<button ${inspection?'data-inspect-action="ecology"':'data-action="locate-ecology"'} data-ecology-kind="${kind}" ${timed?'data-ecology-attempt="'+family+'"':''} class="ecology-jump ${active?'is-active':'is-inactive'} ${(columns?turnEvents.length:timed&&events.length)?'is-announced':''} ${imminent?'is-imminent':''} ${frozen?'is-frozen':''} ${forecasting?'has-forecast':''}" style="--ecology-color:${color};--ecology-activation-delay:-${elapsed}ms" aria-label="${label}" title="${label}" ${targets.length?'':'disabled'}>${ecologyIcon(kind)}${badge}</button>`;
 };
 const firstRow=new Set(['rodent','rodent-plague','worm','worm-plague','rhino','rhino-plague','beaver','beaver-plague','anaconda','ants','ants-plague','build','destroy','meteorites','earthquake']);
 return columns?`<div class="territory-rows" role="group" aria-label="Eventos del territorio en dos filas">${[visible.filter(k=>firstRow.has(k)),visible.filter(k=>!firstRow.has(k))].map(row=>`<div class="inventory-icon-row">${row.map(renderButton).join('')}</div>`).join('')}</div>`:visible.map(renderButton).join('');
}
export function ecologyPinTargets(room,playerId){
 return (room.turnEcologyVersion===1?['rodent','rodent-plague','worm','worm-plague','rhino','rhino-plague','beaver','beaver-plague','anaconda','ants','ants-plague','build','destroy','bomb']:['rodent','worm','build','destroy','bomb']).concat([...new Set([...(room.territoryEvents||[]),...(room.fogEffects||[]),...(room.invasions||[])].map(e=>e.kind))]).flatMap(kind=>ecologyTargets(room,kind,playerId));
}
// A fit view may contain many rain groups. Draw at most 33 markers, keeping
// their real coordinates; every group remains reachable through the icon.
export function ecologyMapPins(targets,now=Date.now(),maximum=33){
 targets=[...lastGlyphPerCell(targets.filter(e=>!e.invasion)).values()];
 const selected=targets.length>maximum?Array.from({length:maximum},(_,i)=>targets[Math.floor(i*targets.length/maximum)]):targets;
 return selected.map(e=>{
  const base=e.kind.replace('-plague',''),turns=e.warningTurns!=null||e.turnsRemaining!=null;
  const color=ecologyColors[e.kind]||'var(--yellow)',timed=!isTurnWorm(e)&&!e.invasion&&(['worm','build','destroy','bomb'].includes(e.kind)||isTimedTerritoryKind(e.kind)),value=e.type==='antidote'||e.invasion||['worm','anaconda'].includes(base)&&!turns?null:turns?ecologySeconds(e,now):timed?ecologySeconds(e,now):rodentTurnsRemaining(e);
  return `<g class="ecology-map-pin visible-inhabitant habitat-${e.kind} phase-${e.phase||'working'} ${e.frozen||e.remainingMs!=null?'is-frozen':''}" data-x="${e.x+.5}" data-y="${e.y+.5}" style="color:${color};--inhabitant-delay:${habitatAnimationDelay(e,e.kind,now)}ms"><title>${e.type==='antidote'?'Antídoto aplicado':ecologyNames[e.kind]}${e.invasion?(e.invasionId?' · invasión':' · ocupación estática'):''}${e.approach?' · entrada '+e.approach.side:''}</title>${e.approach?`<path class="invasion-direction" d="M0-27v9m-4-4 4 4 4-4" transform="rotate(${{north:0,east:90,south:180,west:270}[e.approach.side]})" fill="none" stroke="currentColor" stroke-width="2"/>`:''}<circle r="13" fill="#101216" stroke="currentColor" stroke-width="1.5"/><svg x="-10" y="${value==null?-10:-12}" width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${e.type==='antidote'?'<path d="M16 5v22M5 16h22"/>':base==='rodent'?rodentIcon:territoryIcons[base]||habitatIcons[base]}</svg>${value==null?'':`<text y="11" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" class="${timed&&!turns?'ecology-clock':''}" data-ecology-kind="${e.kind}" data-ecology-source="${e.sourceId||e.id}" aria-label="${timed&&!turns?value+' segundos':value+' turnos'}">${value}</text>`}</g>`;
 }).join('');
}
