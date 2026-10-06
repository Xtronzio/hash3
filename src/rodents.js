import {connectedTerrain,terrainOf,key} from './game.js';

export const RODENT_SPAWN=333;
export const RODENT_MEALS=33;
export function initializeRodents(room){
  room.rodents||=[];room.eatenCells||=[];
  for(const p of room.players)p.placements??=0;
}
export function rodentSleeping(r){return r.phase>=3;}
function pickFood(room,r,exclude){
  const player=room.players.find(p=>p.id===r.player),pair=room.pairs.find(p=>p.id===player?.pair);
  if(!pair)return null;
  const area=new Set(connectedTerrain(terrainOf(room),pair.active).map(c=>key(c.x,c.y)));
  const reserved=new Set(room.rodents.filter(v=>v.id!==r.id&&!rodentSleeping(v)).map(v=>key(v.x,v.y)));
  return room.cells.filter(c=>c.id!==exclude&&area.has(key(c.x,c.y))&&!reserved.has(key(c.x,c.y)))
    .sort((a,b)=>(Math.abs(a.x-r.x)+Math.abs(a.y-r.y))-(Math.abs(b.x-r.x)+Math.abs(b.y-r.y))||a.x-b.x||a.y-b.y)[0]||null;
}
export function forgetBrokenFigures(room,cell){
  const coordinate=key(cell.x,cell.y);
  room.forms=(room.forms||[]).filter(f=>!f.slice(f.lastIndexOf(':')+1).split(';').includes(coordinate));
}
// Every accepted placement counts; Doble advances the animal once when its turn ends.
// A fresh animal announces its first meal and never eats on its birth turn.
export function stepRodent(room,playerId,{placed=false,completed=true,exclude=room.lastEvent?.id}={}){
  initializeRodents(room);
  const player=room.players.find(p=>p.id===playerId);if(!player)return;
  if(placed){player.placements++;room.eatenCells=room.eatenCells.filter(c=>!room.cells.some(v=>v.x===c.x&&v.y===c.y));}
  let r=room.rodents.find(v=>v.player===playerId);
  if(placed&&player.placements%RODENT_SPAWN===0&&!r){
    const pair=room.pairs.find(p=>p.id===player.pair);
    r={id:crypto.randomUUID(),player:playerId,x:pair.active.x,y:pair.active.y,phase:0,eaten:0,age:0};
    const food=pickFood(room,r,exclude);
    if(food){r.x=food.x;r.y=food.y;room.rodents.push(r);}
    return;
  }
  if(!r||!completed)return;
  r.age++;
  if(!rodentSleeping(r)){
    const target=room.cells.find(c=>c.x===r.x&&c.y===r.y&&c.id!==exclude)||pickFood(room,r,exclude);
    if(target){
      r.x=target.x;r.y=target.y;
      room.cells=room.cells.filter(c=>c.id!==target.id);
      forgetBrokenFigures(room,target);
      room.eatenCells=room.eatenCells.filter(c=>c.x!==target.x||c.y!==target.y);
      room.eatenCells.push({x:target.x,y:target.y});
      for(const p of room.players)if(p.lastMove?.id===target.id)delete p.lastMove;
      if(room.inventoryEffects){room.inventoryEffects.shields=room.inventoryEffects.shields.filter(v=>v.cell!==target.id);room.inventoryEffects.blocks=room.inventoryEffects.blocks.filter(v=>v.x!==target.x||v.y!==target.y);}
      r.eaten++;
    }
  }
  if(r.eaten>=RODENT_MEALS){room.rodents=room.rodents.filter(v=>v.id!==r.id);return;}
  r.phase=(r.phase+1)%6;
  if(!rodentSleeping(r)){const food=pickFood(room,r,exclude);if(food){r.x=food.x;r.y=food.y;}}
}

// One compact line icon, distinct from cards; SVG numbers stay legible on the board.
export const rodentIcon='<path d="M8 13a4 4 0 1 1 5-5m6 0a4 4 0 1 1 5 5M8 13c0-6 16-6 16 0v6c0 6-16 6-16 0Zm4 2h.01M20 15h.01m-6 5 2 2 2-2M8 19H3m21 0h5"/>';
export function rodentMark(r){return `<span class="rodent-mark ${rodentSleeping(r)?'sleeping':''}"><svg viewBox="0 0 32 32" aria-hidden="true">${rodentIcon}</svg><b>${r.eaten}</b>${rodentSleeping(r)?'<small>z</small>':''}</span>`;}
