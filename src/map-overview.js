import {terrainOf,key} from './game.js';

export function overviewModel(room,own,target){
  const terrain=terrainOf(room),myPair=room.pairs.find(p=>p.id===own?.pair),targetPair=room.pairs.find(p=>p.id===target?.pair);
  if(!terrain.length)return null;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const cell of terrain){left=Math.min(left,cell.x);top=Math.min(top,cell.y);right=Math.max(right,cell.x+1);bottom=Math.max(bottom,cell.y+1);}
  const bounds={x:left-2,y:top-2,width:right-left+4,height:bottom-top+4};
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),owners=new Set(myPair?[myPair.x,myPair.o]:[]);
  const eaten=new Set((room.eatenCells||[]).map(c=>key(c.x,c.y))),rodents=new Map((room.rodents||[]).map(r=>[key(r.x,r.y),r]));
  const position=target?.lastMove?{x:target.lastMove.x+.5,y:target.lastMove.y+.5}:targetPair?{x:targetPair.active.x+1.5,y:targetPair.active.y+1.5}:null;
  return {bounds,terrain:terrain.map(p=>{const c=cells.get(key(p.x,p.y)),r=rodents.get(key(p.x,p.y));return {...p,fill:r&&r.phase<3?'var(--yellow)':c?(c.id&&c.id===target?.lastMove?.id?'var(--blue)':owners.has(c.owner)?c.symbol==='X'?'var(--red)':'var(--green)':'#7b8492'):'#343e4c',eaten:!c&&eaten.has(key(p.x,p.y)),rodent:r||null};}),active:myPair?.active,ownColor:own?.symbol==='X'?'var(--red)':'var(--green)',target:position};
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

export function overviewMarkup({open,jumpButtons=''}){
  return `<section class="world-map" aria-label="Mapa general" ${open?'':'hidden'}><div class="map-heading"><p class="map-summary"></p><button data-action="close-map" aria-label="Cerrar mapa" title="Cerrar mapa">×</button></div><nav class="map-controls" aria-label="Controles del mapa"><button data-map-action="minus" aria-label="Alejar mapa" title="Alejar mapa">−</button><span class="map-scale" aria-live="off">100%</span><button data-map-action="plus" aria-label="Acercar mapa" title="Acercar mapa">+</button><button data-map-action="fit" aria-label="Ver mapa completo" title="Zoom extensión del mapa">⤢</button>${jumpButtons}</nav><svg class="map-canvas" role="img" aria-label="Mapa navegable: arrastra o pellizca; toca una zona para ir allí"></svg></section>`;
}
