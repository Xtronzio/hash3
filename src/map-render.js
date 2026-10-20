import {inverseBoundaryPath} from './inverse-progress.js';
import {briefIcons} from './brief-ecology.js';
import {targetColors} from './watch-targets.js';
import {invaderIcon,invasionBombIcon} from './invader-mark.js';
import {cellIndex,overviewGrid,frontierOverviewGrid} from './board-window.js';
import {frontierMarkup} from './frontiers.js';
import {wormTrailMarkup} from './worm-trails.js';

export const MAP_DETAIL_LIMIT=4096,MAP_SYMBOL_SCALE=14;
// Shared by live, paused and zoomed-out board views. Group fills into paths;
// retain real glyphs at readable scales, and bounded tiles when fitting a map.
export function overviewCells(terrain){
 const paths=new Map();
 for(const p of terrain){const group=p.fill+(p.eaten?' eaten':'')+(p.frontier?' wall':''),part=p.frontier?`M${p.x+.2} ${p.y+.8}l.6-.6`:`M${p.x+.05} ${p.y+.05}h${(p.width||1)-.1}v${(p.height||1)-.1}h-${(p.width||1)-.1}Z`;if(!paths.has(group))paths.set(group,{fill:p.fill,eaten:p.eaten,frontier:p.frontier,d:''});paths.get(group).d+=part;}
 return [...paths.values()].map(p=>`<path fill="${p.frontier?'none':p.fill}" ${p.frontier?`stroke="${p.fill}" stroke-width=".14" stroke-linecap="round"`:''} d="${p.d}" ${p.eaten?'stroke="var(--yellow)" stroke-width=".08"':''}/>`).join('');
}
export function mapCellSymbols(terrain){
 const fog=terrain.filter(p=>p.fog);terrain=terrain.filter(p=>!p.cardCovered&&!p.fog);
 return `<g class="map-prison-bars" fill="none" stroke="#e6be62" stroke-width=".055">${terrain.filter(p=>p.prison).map(p=>`<path d="M${p.x+.15} ${p.y+.08}v.84m.23-.84v.84m.24-.84v.84m.23-.84v.84"/>`).join('')}</g><g class="map-fog" fill="none" stroke="#d1d5da" stroke-width=".065">${fog.filter(p=>!p.cardCovered).map(p=>`<path d="M${p.x+.13} ${p.y+.28}h.72m-.8 .23h.72m-.6 .22h.72"/>${p.occupied?'':`<circle cx="${p.x+.5}" cy="${p.y+.5}" r=".12" fill="#fff" stroke="#101216"/>`}`).join('')}</g><g class="map-cell-symbols inspection-symbols" fill="none" stroke="#08090b" stroke-width=".1" stroke-linecap="round">${terrain.map(p=>p.symbol==='X'?`<path data-symbol="X" d="M${p.x+.25} ${p.y+.25}l.5 .5m0-.5-.5 .5"/>`:p.symbol==='O'?`<circle data-symbol="O" cx="${p.x+.5}" cy="${p.y+.5}" r=".27"/>`:p.symbol==='*'?`<g data-symbol="*" ${p.invasionBomb?'data-invasion-bomb="active"':''}><rect x="${p.x+.05}" y="${p.y+.05}" width=".9" height=".9" fill="#161109" stroke="none"/><g transform="translate(${p.x} ${p.y}) scale(.015625)" stroke="var(--yellow)" color="var(--yellow)">${p.invasionBomb?invasionBombIcon:invaderIcon}</g></g>`:p.symbol==='#'?`<path data-symbol="#" d="M${p.x+.4} ${p.y+.2}l-.1 .6m.4-.6-.1 .6M${p.x+.2} ${p.y+.4}h.6m-.6 .2h.6"/>`:'').join('')}</g>`;
}
export function mapFrameMarkup(model){
 return (model.active?`<rect x="${model.active.x}" y="${model.active.y}" width="3" height="3" fill="none" stroke="#e3e5e9" stroke-width="2" vector-effect="non-scaling-stroke"/>`:'')+
 (model.visibleWatchTargets||model.watchTargets||[]).map(p=>`<g class="map-watch-target" transform="translate(${p.x+.5} ${p.y+.5})" fill="none" stroke="${targetColors[(p.number||1)-1]}" stroke-width=".07"><circle r=".36"/><circle r=".12"/><path d="M-.5 0h.22m.56 0H.5M0-.5v.22m0 .56V.5"/><title>Diana ${p.number}</title></g>`).join('')+
 (model.target?`<rect class="inspection-rival" x="${Math.floor(model.target.x)}" y="${Math.floor(model.target.y)}" width="1" height="1" fill="none" stroke="var(--blue)" stroke-width="3" vector-effect="non-scaling-stroke"><title>Referencia del rival superior</title></rect>`:'');
}
export function prepareMapRendering(model,barriers=model.frontierCells||[]){
 return {inverseBoundary:cellIndex(model.inverseBoundary||[]),inverseCoarse:overviewGrid((model.inverseBoundary||[]).map(c=>({...c,fill:'#b6bfcc'})),model.bounds),detail:cellIndex(model.terrain),coarse:overviewGrid(model.terrain,model.bounds),barriers:cellIndex(barriers),coarseBarriers:frontierOverviewGrid(barriers,model.bounds),worms:cellIndex(model.wormTrails||[]),growth:cellIndex(model.invasionGrowth||[]),threats:cellIndex(model.threatCells||[]),dead:cellIndex(model.deadCells||[])};
}
export function mapWindowMarkup(model,index,box,scale){
 const outline=!model.inverseBoundary?.length?'':box.width*box.height<=MAP_DETAIL_LIMIT?`<path class="inverse-map-outline" fill="none" stroke="#f1f3f6" stroke-width="1.5" vector-effect="non-scaling-stroke" d="${inverseBoundaryPath(index.inverseBoundary.query(box))}"/>`:`<g class="inverse-map-outline">${overviewCells(index.inverseCoarse.query(box))}</g>`;
 const detail=box.width*box.height<=MAP_DETAIL_LIMIT,cells=detail?index.detail.query(box):index.coarse.query(box);
 const walls=detail?frontierMarkup({frontiers:[{cells:index.barriers.query(box)}]}):frontierMarkup({frontiers:[{cells:index.coarseBarriers.query(box)}]});
 const worms=detail?`<g class="worm-map-trail" fill="none" stroke="var(--yellow)" stroke-width=".07" stroke-linecap="round">${wormTrailMarkup(index.worms.query(box))}</g>`:'';
 const growth=detail?invasionGrowthMarkup(index.growth.query(box)):'';
 const threats=threatMarkup(index.threats?.query(box)||[],{compact:!detail});
 return overviewCells(cells)+outline+(detail&&scale>=MAP_SYMBOL_SCALE?mapCellSymbols(cells):'')+growth+worms+walls+threats+deadMarkup(index.dead?.query(box)||[])+mapFrameMarkup(model);
}

export function invasionGrowthMarkup(points){
 return `<g class="map-invasion-growth" fill="none" stroke="var(--yellow)" stroke-width=".065" stroke-dasharray=".12 .08">${points.map(c=>`<rect x="${c.x+.07}" y="${c.y+.07}" width=".86" height=".86"><title>Invasión: esta casilla puede expandirse</title></rect>`).join('')}</g>`;
}

export function threatMarkup(points,{compact=false}={}){
 // Same backed dashed warning in every variant and map, static when paused.
 return [false,true].map(restore=>{
  const group=points.filter(p=>(p.kind==='restore')===restore);if(!group.length)return '';
  const shapes=compact?`<path d="${group.map(c=>`M${c.x+.04} ${c.y+.04}h.92v.92h-.92Z`).join('')}"/>`:group.map(c=>`<rect x="${c.x+.04}" y="${c.y+.04}" width=".92" height=".92"/>`).join('');
  return `<g class="map-territory-threat ${restore?'map-warning-restore':''}" fill="none"><g stroke="#061015" stroke-width=".125">${shapes}</g><g stroke="${restore?'#65efce':'var(--yellow)'}" stroke-width=".065" stroke-dasharray=".12 .08">${shapes}</g><title>${restore?'Reposición anunciada':'Celdas amenazadas'}</title></g>`;
 }).join('');
}

export function deadMarkup(points){return `<g class="map-dead-cells" fill="none" stroke="#aab0ba" stroke-width="1.8">${points.map(c=>`<g transform="translate(${c.x} ${c.y}) scale(.03125)"><rect x="1.5" y="1.5" width="29" height="29" fill="#111214"/>${briefIcons.death}<title>Celda muerta · inalterable</title></g>`).join('')}</g>`;}
