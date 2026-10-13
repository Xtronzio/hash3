import {cellIndex,overviewGrid} from './board-window.js';
import {terrainBounds} from './map-camera.js';
export function prepareImpactFocus(impact,now=performance.now()){
 const points=(impact.affected||[]).filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)),bounds=terrainBounds(points);
 if(!bounds)return null;
 return {id:impact.id,points,bounds,corners:[{x:bounds.x,y:bounds.y},{x:bounds.x+bounds.width-1,y:bounds.y+bounds.height-1}],index:cellIndex(points),coarse:overviewGrid(points,bounds,64),until:now+4500};
}
export function impactFocusEntries(focus,window,style,compact=false,now=performance.now()){
 if(!focus||focus.until<=now)return [];
 return (compact?focus.coarse:focus.index).query(window).map(c=>({id:'impact:'+c.x+','+c.y,markup:`<span class="impact-footprint" data-impact-x="${c.x}" data-impact-y="${c.y}" style="${style(c)};transform:scale(${c.width||1},${c.height||1});transform-origin:0 0" aria-hidden="true"></span>`}));
}
