import {fogKeys} from './fog.js';
import {territoryThreatCells} from './territory-threats.js';
import {activeInvasionBombs} from './pending-bombs.js';
import {lastNavigationMove} from './watch-targets.js';
import {wildcardFill} from './wildcard-usage.js';
import {invasionGrowthCells} from './invasion-paths.js';
import {habitatLocations,habitatReservations} from './habitat-tools.js';
import {terrainOf,key} from './game.js';
import {navigationIcon} from './navigation-icons.js';
import {frontierMarkup,frontierCells} from './frontiers.js';
import {wormTrailParts} from './worm-trails.js';
import {cellGlyphs} from './cell-presentation.js';

export function overviewModel(room,own,target,{includeFrontiers=true}={}){
  const hidden=fogKeys(room),glyphs=cellGlyphs(room,own?.id);
  const threatCells=territoryThreatCells(room),actual=terrainOf(room),known=new Set(actual.map(c=>key(c.x,c.y))),terrain=[...actual,...habitatReservations(room).filter(c=>!known.has(key(c.x,c.y)))],myPair=room.pairs.find(p=>p.id===own?.pair),targetPair=room.pairs.find(p=>p.id===target?.pair);
  if(!terrain.length)return null;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const cell of [...terrain,...threatCells,...frontierCells(room),...(room.watchTargets||[]),...(lastNavigationMove(own)?[lastNavigationMove(own)]:[])]){left=Math.min(left,cell.x);top=Math.min(top,cell.y);right=Math.max(right,cell.x+1);bottom=Math.max(bottom,cell.y+1);}
  const bounds={x:left-2,y:top-2,width:right-left+4,height:bottom-top+4};
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
  const eaten=new Set((room.eatenCells||[]).map(c=>key(c.x,c.y))),rodents=new Map(habitatLocations(room).map(r=>[key(r.x,r.y),r]));
  const position=target?.lastMove?{x:target.lastMove.x+.5,y:target.lastMove.y+.5}:targetPair?{x:targetPair.active.x+1.5,y:targetPair.active.y+1.5}:null;
  const growthCells=invasionGrowthCells(room),bombKeys=new Set(activeInvasionBombs(room,growthCells).map(c=>key(c.x,c.y)));
  return {bounds,threatCells,deadCells:room.deadCells||[],lastNavigationMove:lastNavigationMove(own),watchTargets:room.watchTargets||[],visibleWatchTargets:[...glyphs.values()].filter(e=>e.type==='target'),ecologyPins:[...glyphs.values()].filter(e=>e.type==='event'||e.type==='antidote'),frontierCells:frontierCells(room).map(c=>glyphs.has(key(c.x,c.y))&&glyphs.get(key(c.x,c.y)).type!=='frontier'?{...c,suppressSign:true}:c),invasionGrowth:growthCells,wormTrails:wormTrailParts(room),habitats:habitatLocations(room),frontiers:includeFrontiers?frontierMarkup(room):'',terrain:terrain.map(p=>{const c=cells.get(key(p.x,p.y)),r=rodents.get(key(p.x,p.y));const dead=(room.deadCells||[]).some(d=>d.x===p.x&&d.y===p.y);return {...p,dead,cardCovered:glyphs.has(key(p.x,p.y)),fog:hidden.has(key(p.x,p.y)),occupied:!!c,symbol:hidden.has(key(p.x,p.y))?undefined:c?.symbol,invasionBomb:bombKeys.has(key(p.x,p.y)),fill:hidden.has(key(p.x,p.y))?(c?'#91979e':'#30363d'):dead?'#111214':r?'var(--yellow)':c?(c.symbol==='#'?wildcardFill(c):c.symbol==='*'?'var(--yellow)':c.id&&c.id===target?.lastMove?.id?'var(--blue)':c.symbol==='X'?'var(--red)':'var(--green)'):'#343e4c',eaten:!hidden.has(key(p.x,p.y))&&!c&&eaten.has(key(p.x,p.y)),rodent:r||null};}),active:myPair?.active,ownColor:own?.symbol==='X'?'var(--red)':'var(--green)',target:target?.lastMove&&hidden.has(key(target.lastMove.x,target.lastMove.y))?null:position};
}

export function overviewPoint(bounds,rect,clientX,clientY){
  const scale=Math.min(rect.width/bounds.width,rect.height/bounds.height);
  if(!scale)return null;
  const x=bounds.x+(clientX-rect.left-(rect.width-bounds.width*scale)/2)/scale;
  const y=bounds.y+(clientY-rect.top-(rect.height-bounds.height*scale)/2)/scale;
  return x<bounds.x||x>bounds.x+bounds.width||y<bounds.y||y>bounds.y+bounds.height?null:{x,y};
}

export function overviewView(bounds,view){
  const x=Math.max(bounds.x,view.x),y=Math.max(bounds.y,view.y);
  return {x,y,width:Math.max(0,Math.min(bounds.x+bounds.width,view.x+view.width)-x),height:Math.max(0,Math.min(bounds.y+bounds.height,view.y+view.height)-y)};
}

export function overviewMarkup({open,jumpButtons='',rodentButton='',habitatButtons=rodentButton,inventoryStatus='',usedCards='',warningMarkup='',floatingInventory='',controlsInInventory=false}){
  inventoryStatus=inventoryStatus.replaceAll('data-action="inventory"','data-action="map-inventory"');
  habitatButtons=habitatButtons.replaceAll('data-action="events"','data-action="map-events"');
  return `<section class="world-map" aria-label="Mapa general" ${open?'':'hidden'}><nav class="map-controls" aria-label="Controles del mapa"><p class="map-summary"></p>${controlsInInventory?'':`<button data-map-action="fit" aria-label="Ver mapa completo" title="Zoom extensión del mapa">${navigationIcon('fit')}</button>${jumpButtons}<button data-action="close-map" aria-label="Volver al tablero" title="Volver al tablero">${navigationIcon('restore')}</button>`}</nav>${usedCards}${inventoryStatus}<svg class="map-canvas" role="img" aria-label="Mapa navegable: arrastra o pellizca; toca una zona para ir allí"></svg>${warningMarkup}<nav class="map-controls ecology-controls" aria-label="Fauna y fenómenos del territorio">${habitatButtons}</nav>${floatingInventory}</section>`;
}
