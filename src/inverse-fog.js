import {activateFog,fogKeys} from './fog.js';
const key=c=>`${c.x},${c.y}`;
export function advanceInverseFog(room,random=Math.random){
 if(room.inventoryBalanceVersion!==1||room.inverseVersion!==3)return;
 const f=room.inverseFog??={version:1,turns:0,next:36,targets:[]};f.turns++;
 room.fogEffects=(room.fogEffects||[]).filter(e=>--e.turnsRemaining>0);
 if(f.turns===f.next-3&&!room.fogEffects.length&&!room.inverseDisorder?.targets?.length){
  if(room.cells.length<3)return;
  const terrain=new Map(room.terrain.map(c=>[key(c),c])),seed=room.cells[Math.floor(Math.max(0,Math.min(.999999,random()))*room.cells.length)],queue=[seed],seen=new Set();f.targets=[];
  for(let i=0;i<queue.length&&f.targets.length<33;i++){const c=queue[i],k=key(c);if(seen.has(k)||!terrain.has(k))continue;seen.add(k);f.targets.push({x:c.x,y:c.y});for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:c.x+dx,y:c.y+dy});}
  const hidden=new Set(f.targets.map(key));if(room.cells.filter(c=>hidden.has(key(c))).length<3)f.targets=[];
 }
 if(f.turns>=f.next){if(f.targets.length&&!room.fogEffects.length)activateFog(room,{id:crypto.randomUUID(),kind:'fog'},f.targets);f.targets=[];f.next=f.turns+33+3*Math.floor(Math.max(0,Math.min(.999999,random()))*12);}
}
export function visibleInverseClaimsAt(room,player,point,claimsAt){
 const hidden=fogKeys(room);return claimsAt(room,player,point).filter(f=>!f.points.some(([x,y])=>hidden.has(`${x},${y}`)));
}
export function inverseFogNotice(room){
 const f=room.inverseFog,e=room.fogEffects?.[0];if(!f)return '';
 const n=e?e.turnsRemaining:f.targets.length?f.next-f.turns:null;
 return n==null?'':`<div class="practice-banner inverse-contour-notice inverse-fog-notice" role="status">Niebla · ${e?'restan':'en'} ${n} turnos totales</div>`;
}
