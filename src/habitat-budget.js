import {key} from './game.js';
export const HABITAT_REFERENCE=333;
export const HABITAT_FREQUENCIES={rodent:33,bomb:66,worm:66,work:99};
export const HABITAT_WEIGHTS={rodent:3,bomb:1,worm:1,work:1};
// Fractional carry preserves linear incidence without rounding every small
// board up to a full animal. Whole failed births never become a backlog.
export function proportionalBudget(state,kind,size){
 state.credit||={};const credit=(state.credit[kind]||0)+size/HABITAT_REFERENCE*HABITAT_WEIGHTS[kind];
 const count=Math.floor(credit+1e-9);state.credit[kind]=Math.max(0,credit-count);return count;
}
export const habitatInterval=(frequency,size)=>Math.ceil(frequency*Math.max(1,size/HABITAT_REFERENCE));
export function habitatZone(room,area,frequencies){
 room.habitatZones||=[];const coords=new Set(area.map(c=>key(c.x,c.y)));
 const matching=room.habitatZones.filter(z=>coords.has(key(z.x,z.y)));
 if(matching.length===1)return matching[0];
 const zone={id:crypto.randomUUID(),...area[0],placements:matching.reduce((n,z)=>n+z.placements,0),credit:{},next:{}};
 if(!matching.length)zone.placements=room.players.filter(p=>{
  const pair=room.pairs.find(v=>v.x===p.id||v.o===p.id),anchor=pair?.terrainAnchor||pair?.active;
  return anchor&&coords.has(key(anchor.x,anchor.y));
 }).reduce((n,p)=>n+(p.placements||0),0);
 for(const kind of Object.keys(frequencies)){
  zone.credit[kind]=matching.reduce((n,z)=>n+(z.credit[kind]||0),0)%1;
  const interval=habitatInterval(frequencies[kind],area.length);
  zone.next[kind]=(Math.floor(zone.placements/interval)+1)*interval;
 }
 room.habitatZones=room.habitatZones.filter(z=>!matching.includes(z));room.habitatZones.push(zone);return zone;
}
