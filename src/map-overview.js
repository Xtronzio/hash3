import {terrainOf,key} from './game.js';

export function overviewModel(room,own,target){
  const terrain=terrainOf(room),myPair=room.pairs.find(p=>p.id===own?.pair),targetPair=room.pairs.find(p=>p.id===target?.pair);
  if(!terrain.length)return null;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const cell of terrain){left=Math.min(left,cell.x);top=Math.min(top,cell.y);right=Math.max(right,cell.x+1);bottom=Math.max(bottom,cell.y+1);}
  const bounds={x:left-2,y:top-2,width:right-left+4,height:bottom-top+4};
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),owners=new Set(myPair?[myPair.x,myPair.o]:[]);
  const position=target?.lastMove?{x:target.lastMove.x+.5,y:target.lastMove.y+.5}:targetPair?{x:targetPair.active.x+1.5,y:targetPair.active.y+1.5}:null;
  return {bounds,terrain:terrain.map(p=>({...p,fill:cells.has(key(p.x,p.y))?(owners.has(cells.get(key(p.x,p.y)).owner)?cells.get(key(p.x,p.y)).symbol==='X'?'var(--red)':'var(--green)':'#7b8492'):'#343e4c'})),active:myPair?.active,ownColor:own?.symbol==='X'?'var(--red)':'var(--green)',target:position};
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

export function overviewMarkup({own,hasTarget,open}){
  return `<section class="world-map" aria-label="Mapa general" ${open?'':'hidden'}><div class="map-heading"><div><strong>MAPA GENERAL</strong><p class="map-summary"></p></div><button data-action="close-map" aria-label="Cerrar mapa">×</button></div><p class="map-instruction">Toca una zona para ir allí</p><svg role="img" aria-label="Vista general del tablero, tu zona y la vista actual"></svg><div class="map-legend"><span><i class="map-key own ${own.symbol.toLowerCase()}"></i>Tu zona activa</span>${hasTarget?'<span><i class="map-key rival"></i>Rival superior</span>':''}<span><i class="map-key view"></i>Vista actual</span></div><nav class="map-shortcuts" aria-label="Accesos del mapa"><button data-action="center">Mi territorio</button>${hasTarget?'<button class="blue" data-action="locate">Rival superior</button>':''}</nav></section>`;
}
