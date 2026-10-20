import {imprisonedCell} from './inverse-prison.js';
export const INVERSE_DISORDER_INTERVAL=66,INVERSE_DISORDER_WARNING=3;
const key=p=>`${p.x},${p.y}`;
export function initializeInverseDisorder(room){
 if(room?.variant!=='inverse'||room.inverseVersion!==3||!['playing','paused'].includes(room.status))return;
 if(!validInverseDisorder(room))throw Error('El desorden del contorno no es compatible. Se conserva el guardado.');
 room.inverseDisorder??={version:1,next:(room.inverseContour?.turns||0)+INVERSE_DISORDER_INTERVAL,cycles:0,targets:[]};
}
export function validInverseDisorder(room){
 const d=room?.inverseDisorder;if(!d)return room?.inverseDisorderEvent==null;
 const n=room.inverseContour?.turns||0,known=new Set((room.terrain||[]).map(key));
 const list=a=>Array.isArray(a)&&a.length<=33&&new Set(a).size===a.length&&a.every(k=>known.has(k));
 if(room.variant!=='inverse'||room.inverseVersion!==3||d.version!==1||!Number.isSafeInteger(d.next)||d.next<=n||d.next-n>66||!Number.isSafeInteger(d.cycles)||d.cycles<0||!list(d.targets))return false;
 const e=room.inverseDisorderEvent;return !e||typeof e.id==='string'&&e.id.length>0&&e.id.length<=100&&Number.isSafeInteger(e.turn)&&e.turn>=0&&e.turn<=n&&list(e.affected)&&Number.isSafeInteger(e.moved)&&e.moved>=0&&e.moved<=33;
}
function plan(room,random){
 const locked=new Set(room.cells.filter(c=>imprisonedCell(room,c)).map(key)),points=room.terrain.filter(p=>!locked.has(key(p))),known=new Map(points.map(p=>[key(p),p]));
 const seeds=room.cells.filter(c=>!imprisonedCell(room,c));if(!seeds.length)return [];
 const seed=seeds[Math.min(seeds.length-1,Math.floor(Math.max(0,Math.min(.999999,random()))*seeds.length))],queue=[seed],seen=new Set(),region=[];
 for(let i=0;i<queue.length&&region.length<33;i++){const p=queue[i],k=key(p);if(seen.has(k)||!known.has(k))continue;seen.add(k);region.push(k);for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]])queue.push({x:p.x+dx,y:p.y+dy});}
 return region;
}
export function advanceInverseDisorder(room,random=Math.random){
 const d=room.inverseDisorder,n=room.inverseContour?.turns;if(!d)return;
 if(n===d.next-3)d.targets=plan(room,random);
 if(n<d.next)return;
 const locked=new Set(room.cells.filter(c=>imprisonedCell(room,c)).map(key)),targets=d.targets.filter(k=>!locked.has(k)),inside=new Set(targets),pieces=room.cells.filter(c=>inside.has(key(c)));
 const slots=[...targets];for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,Number(random())||0))*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 // A rotation makes a nontrivial advertised zone effective even if the shuffle
 // happened to assign every piece its current slot.
 if(pieces.length&&slots.length>1&&pieces.every((p,i)=>key(p)===slots[i]))slots.push(slots.shift());
 let moved=0;pieces.forEach((p,i)=>{if(key(p)!==slots[i])moved++;[p.x,p.y]=slots[i].split(',').map(Number);});
 const byId=new Map(pieces.map(p=>[p.id,p]));for(const p of room.players){if(byId.has(p.lastMove?.id))p.lastMove={...byId.get(p.lastMove.id)};if(byId.has(p.navigationLastMove?.id)){const c=byId.get(p.navigationLastMove.id);p.navigationLastMove={x:c.x,y:c.y,id:c.id};}}
 if(moved){room.inverseDisorderEvent={id:crypto.randomUUID(),turn:n,affected:targets,moved};delete room.practiceHint;}
 d.targets=[];d.cycles++;d.next=n+INVERSE_DISORDER_INTERVAL;
}
