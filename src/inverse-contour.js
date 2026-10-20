import {inverseRenewalLimit,advanceInverseRenewal} from './inverse-renewal.js';
import {imprisonedCell,prisonKeys} from './inverse-prison.js';
// Shared, public pressure: turns, never wall-clock time or hidden player information.
export const INVERSE_CONTOUR_INTERVAL=33,INVERSE_CONTOUR_WARNING=3;
const enabled=r=>r?.variant==='inverse'&&r.inverseVersion===3;
const key=(x,y)=>`${x},${y}`,point=k=>{const [x,y]=k.split(',').map(Number);return {x,y};};
const near=[[1,0],[-1,0],[0,1],[0,-1]],integer=n=>Number.isSafeInteger(n)&&n>=0;
export function validInverseContour(room){
 const c=room?.inverseContour;if(c==null)return room?.inverseContourEvent==null&&room?.inverseRenewalEvent==null;
 if(!enabled(room)||!Array.isArray(room.terrain)||c.version!==1||!integer(c.turns)||!integer(c.next)||c.next<=c.turns||c.next-c.turns>99||!integer(c.cycles)||!integer(c.lost)||!Array.isArray(c.targets)||c.targets.length>33||new Set(c.targets).size!==c.targets.length)return false;
 const terrain=new Set(room.terrain.map(p=>key(p.x,p.y)));
 if(c.targets.some(k=>!terrain.has(k)))return false;
 const list=items=>Array.isArray(items)&&items.length<=33&&new Set(items).size===items.length&&items.every(k=>terrain.has(k));
 const r=c.renewal;
 if(r!=null&&(r.version!==1||!integer(r.restored)||r.restored>inverseRenewalLimit(room)||!integer(r.next)||r.next<=c.turns||r.next-c.turns>198||!list(r.targets)))return false;
 if(c.lost>room.terrain.length+(r?.restored||0))return false;
 const event=(e,field)=>!e||typeof e.id==='string'&&e.id.length>0&&e.id.length<=100&&integer(e.turn)&&e.turn<=c.turns&&list(e[field]);
 return event(room.inverseContourEvent,'cleared')&&(!room.inverseRenewalEvent||!!r&&event(room.inverseRenewalEvent,'restored'));
}
export function initializeInverseContour(room){
 if(!enabled(room)||!['playing','paused'].includes(room.status))return;
 if(!validInverseContour(room))throw Error('El estado del contorno no es compatible. Se conserva el guardado.');
 room.inverseContour??={version:1,turns:0,next:inverseContourInterval(room),cycles:0,lost:0,targets:[]};
 room.inverseContour.renewal??={version:1,restored:0,next:room.inverseContour.turns+2*inverseContourInterval(room),targets:[]};
}
export function inverseContourBudget(room){
 const n=room.inverseFill.length;return Math.max(0,Math.min(33,3*Math.ceil(n/333),3*Math.floor((n-3)/3)));
}
export function inverseContourInterval(room){return 33*Math.max(1,Math.ceil(inverseContourBudget(room)/11));}
export function planInverseContour(room){
 const locked=prisonKeys(room),pending=new Set(room.inverseFill.filter(k=>!locked.has(k))),occupied=new Set(room.cells.filter(c=>['X','O'].includes(c.symbol)).map(c=>key(c.x,c.y))),count=inverseContourBudget(room);
 if(!count)return [];
 const rank=p=>Number(occupied.has(key(p.x,p.y)))*6+near.reduce((n,[dx,dy])=>n+Number(occupied.has(key(p.x+dx,p.y+dy)))*2,0);
 const tie=p=>((p.x*73856093)^(p.y*19349663)^((room.inverseContour?.cycles||0)*83492791))>>>0;
 const sort=(a,b)=>rank(b)-rank(a)||tie(a)-tie(b)||a.y-b.y||a.x-b.x;
 const edges=[...pending].map(point).filter(p=>near.some(([dx,dy])=>!pending.has(key(p.x+dx,p.y+dy)))).sort(sort);
 const selected=new Set();let seed=0;
 while(selected.size<count&&seed<edges.length){
  const queue=[edges[seed++]];let i=0;
  while(i<queue.length&&selected.size<count){const p=queue[i++],k=key(p.x,p.y);if(selected.has(k))continue;selected.add(k);
   queue.push(...near.map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).filter(n=>pending.has(key(n.x,n.y))&&!selected.has(key(n.x,n.y))).sort(sort));
  }
 }
 return [...selected];
}
export function advanceInverseContour(room,{beeImpact=false}={}){
 if(!enabled(room)||!room.inverseContour)return;
 const c=room.inverseContour;c.turns++;
 advanceInverseRenewal(room,inverseContourInterval,{beeImpact});
 if(c.turns===c.next-3)c.targets=planInverseContour(room);
 if(c.turns<c.next)return;
 if(beeImpact&&c.targets.length){c.next=c.turns+1;return;}
 const locked=new Set(room.cells.filter(p=>imprisonedCell(room,p)).map(p=>key(p.x,p.y)));
 const fill=new Set(room.inverseFill),limit=Math.max(0,fill.size-3),cleared=c.targets.filter(k=>fill.has(k)&&!locked.has(k)).slice(0,limit),hits=new Set(cleared);
 room.inverseFill=room.inverseFill.filter(k=>!hits.has(k));room.inverseCleared=room.terrain.length-room.inverseFill.length;
 c.lost+=cleared.length;c.cycles++;c.targets=[];c.next=c.turns+inverseContourInterval(room);
 if(cleared.length){room.inverseContourEvent={id:crypto.randomUUID(),turn:c.turns,cleared};delete room.practiceHint;}
}
export function contourThreatensClaim(room,claim){
 const c=room.inverseContour;if(!c?.targets.length||c.next-c.turns!==1)return false;
 const pending=new Set(room.inverseFill),targets=new Set(c.targets);
 return (claim.figures||[claim]).some(f=>{const filled=f.points.map(([x,y])=>key(x,y)).filter(k=>pending.has(k));return filled.length>0&&filled.every(k=>targets.has(k));});
}
