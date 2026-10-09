import {invaderIcon} from './invader-mark.js';
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
 return `<g class="map-cell-symbols inspection-symbols" fill="none" stroke="#08090b" stroke-width=".1" stroke-linecap="round">${terrain.map(p=>p.symbol==='X'?`<path data-symbol="X" d="M${p.x+.25} ${p.y+.25}l.5 .5m0-.5-.5 .5"/>`:p.symbol==='O'?`<circle data-symbol="O" cx="${p.x+.5}" cy="${p.y+.5}" r=".27"/>`:p.symbol==='*'?`<g data-symbol="*"><rect x="${p.x+.05}" y="${p.y+.05}" width=".9" height=".9" fill="#161109" stroke="none"/><g transform="translate(${p.x} ${p.y}) scale(.015625)" stroke="var(--yellow)">${invaderIcon}</g></g>`:p.symbol==='#'?`<path data-symbol="#" d="M${p.x+.4} ${p.y+.2}l-.1 .6m.4-.6-.1 .6M${p.x+.2} ${p.y+.4}h.6m-.6 .2h.6"/>`:'').join('')}</g>`;
}
export function mapFrameMarkup(model){
 return (model.active?`<rect x="${model.active.x}" y="${model.active.y}" width="3" height="3" fill="none" stroke="#e3e5e9" stroke-width="2" vector-effect="non-scaling-stroke"/>`:'')+
 (model.target?`<rect class="inspection-rival" x="${Math.floor(model.target.x)}" y="${Math.floor(model.target.y)}" width="1" height="1" fill="none" stroke="var(--blue)" stroke-width="3" vector-effect="non-scaling-stroke"><title>Referencia del rival superior</title></rect>`:'');
}
export function prepareMapRendering(model,barriers=model.frontierCells||[]){
 return {detail:cellIndex(model.terrain),coarse:overviewGrid(model.terrain,model.bounds),barriers:cellIndex(barriers),coarseBarriers:frontierOverviewGrid(barriers,model.bounds),worms:cellIndex(model.wormTrails||[]),growth:cellIndex(model.invasionGrowth||[])};
}
export function mapWindowMarkup(model,index,box,scale){
 const detail=box.width*box.height<=MAP_DETAIL_LIMIT,cells=detail?index.detail.query(box):index.coarse.query(box);
 const walls=detail?frontierMarkup({frontiers:[{cells:index.barriers.query(box)}]}):frontierMarkup({frontiers:[{cells:index.coarseBarriers.query(box)}]});
 const worms=detail?`<g class="worm-map-trail" fill="none" stroke="var(--yellow)" stroke-width=".07" stroke-linecap="round">${wormTrailMarkup(index.worms.query(box))}</g>`:'';
 const growth=detail?invasionGrowthMarkup(index.growth.query(box)):'';
 return overviewCells(cells)+(detail&&scale>=MAP_SYMBOL_SCALE?mapCellSymbols(cells):'')+growth+worms+walls+mapFrameMarkup(model);
}

export function invasionGrowthMarkup(points){
 return `<g class="map-invasion-growth" fill="none" stroke="var(--yellow)" stroke-width=".065" stroke-dasharray=".12 .08">${points.map(c=>`<rect x="${c.x+.07}" y="${c.y+.07}" width=".86" height=".86"><title>Invasión: esta casilla puede expandirse</title></rect>`).join('')}</g>`;
}
