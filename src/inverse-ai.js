import {inverseCommand} from './inverse.js';
import {inverseClaims,canClaimInverse} from './inverse-claims.js';
import {availableCells,key,figureWindows,prepareFigureIndex} from './game.js';
import {placementSymbol,canUsePracticeTool,toolCells,practiceTurn} from './practice-tools.js';
import {tradeAvailability,buyCard} from './inventory-economy.js';

const STOP=Symbol('inverse-search-budget');
const analysisMemo=new WeakMap();
const other=s=>s==='X'?'O':'X';
const signed=(r,s)=>r.players.find(p=>p.symbol===s);
const stateKey=r=>JSON.stringify([r.pairs[0].turn,r.practiceTurn,r.inventoryEffects?.forced,r.inverseMoves,r.inverseWildNext,r.players.map(p=>[p.symbol,p.score,p.figures,p.inventory.cards]),r.cells.map(c=>[c.x,c.y,c.symbol]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),r.inverseFill]);
function analysis(room){
 if(analysisMemo.has(room))return analysisMemo.get(room);
 const filled=new Set(room.inverseFill),fillPoints=filled.size<=33?[...filled].map(k=>k.split(',').map(Number)):[],cells=new Map(room.cells.map(c=>[key(c.x,c.y),c])),claims={};
 for(const p of room.players)claims[p.symbol]=inverseClaims(room,p.id,24);
 const value=s=>{
  const p=signed(room,s),used=new Set();let prepared=0,discount=.86;
  for(const f of claims[s])if(f.pointsValue&&f.points.every(([x,y])=>!used.has(key(x,y)))){prepared+=f.pointsValue*discount;discount*=.55;for(const [x,y]of f.points)used.add(key(x,y));if(discount<.1)break;}
  let growth=0;
  for(const c of room.cells)if(c.symbol===s)for(const [dx,dy]of [[1,0],[0,1],[1,1],[1,-1]]){
   const n=cells.get(key(c.x+dx,c.y+dy));if(n&&(n.symbol===s||n.symbol==='#'))growth+=.10;
   if(filled.has(key(c.x,c.y)))growth+=.05;
   if(filled.size<=33){for(const [x,y]of fillPoints){const d=Math.abs(c.x-x)+Math.abs(c.y-y);if(d<=2)growth+=(3-d)*.12/Math.max(1,filled.size);}}
  }
  return p.score+prepared+Math.min(growth,8);
 };
 const result={claims,cells,filled,value:value('X')-value('O')};analysisMemo.set(room,result);return result;
}
function candidates(room,info,{cards=true,maximum=10}={}){
 const pair=room.pairs[0],actor=signed(room,pair.turn),symbol=placementSymbol(room,actor.id),sign=pair.turn==='X'?1:-1;
 const free=availableCells(room,pair),index=prepareFigureIndex(room.cells,true),occupied=index.occupied.get(symbol),signs=index.bySymbol.get(symbol),pool=[];
 const push=(action,payload,order)=>pool.push({choice:{action,payload},order});
 if(canClaimInverse(room,actor.id))for(const f of info.claims[actor.symbol].slice(0,8))push('claim',{x:f.points[0][0],y:f.points[0][1],figureId:f.id},f.pointsValue+f.filled*.08);
 // Keep every tactically adjacent empty cell before sampling distant zones.
 const near=new Set();for(const c of room.cells)for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)near.add(key(c.x+dx,c.y+dy));
 const adjacent=free.filter(c=>near.has(key(c.x,c.y))),sample=free.filter((_,i)=>i%Math.max(1,Math.ceil(free.length/72))===0),points=[...new Map([...adjacent,...sample].map(c=>[key(c.x,c.y),c])).values()];
 const rootBest=info.claims[actor.symbol][0]?.pointsValue||0,rivalIndex=prepareFigureIndex(room.cells,true),rival=other(actor.symbol),rs=rivalIndex.bySymbol.get(rival),ro=rivalIndex.occupied.get(rival);
 for(const point of points){
  const k=key(point.x,point.y);occupied.add(k);signs.push({...point,symbol});index.groups.delete(symbol);
  const figures=figureWindows(room.cells,point.x,point.y,symbol,room.level,index,true),best=Math.max(0,...figures.filter(f=>f.points.some(([x,y])=>info.filled.has(key(x,y)))).map(f=>f.size+(signed(room,symbol).figures%3===2?3:0)));
  occupied.delete(k);signs.pop();index.groups.delete(symbol);
  const own=symbol===actor.symbol,neighbor=[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dy])=>n+Number(occupied.has(key(point.x+dx,point.y+dy))),0);
  // Also retain blocking moves at the opponent's exact completion points.
  ro.add(k);rs.push({...point,symbol:rival});
  const denial=Math.max(0,...figureWindows(room.cells,point.x,point.y,rival,room.level,rivalIndex,true).filter(f=>f.points.some(([x,y])=>info.filled.has(key(x,y)))).map(f=>f.size));
  ro.delete(k);rs.pop();rivalIndex.groups.delete(rival);
  const reach=info.filled.size<=33?[...info.filled].reduce((v,k)=>{const [x,y]=k.split(',').map(Number),d=Math.abs(point.x-x)+Math.abs(point.y-y);return v+(d<=2?(3-d)*.08:0);},0):0;
  push('move',point,reach+(own?best:-best)*.9+denial*.55+neighbor*.25+(info.filled.has(k)?.08:0)-(rootBest&&best<=rootBest?.15:0));
 }
 if(cards){
  const command=(tool,point={},extra={},order=1)=>push('inventory',{tool,playerId:actor.id,...point,...extra},order);
  if(canUsePracticeTool(room,actor.id,'double',room.clockNow)&&free.length>=2)command('double',{}, {},2.5);
  if(canUsePracticeTool(room,actor.id,'rival',room.clockNow)&&free.length)command('rival',{}, {},1);
  if(canUsePracticeTool(room,actor.id,'combo',room.clockNow)&&practiceTurn(room,actor.id).used.length===0&&['opposite','shift','swap','double','rival'].filter(t=>actor.inventory.cards[t]>0).length>=2)command('combo',{}, {},.6);
  const important=new Set(info.claims[other(actor.symbol)].slice(0,3).flatMap(f=>f.points.map(([x,y])=>key(x,y))));
  for(const tool of ['opposite','erase','shift','swap'])if(canUsePracticeTool(room,actor.id,tool,room.clockNow)){
   const sources=toolCells(room,actor.id,tool).sort((a,b)=>Number(important.has(key(b.x,b.y)))-Number(important.has(key(a.x,a.y)))).slice(0,tool==='swap'?6:10);
   for(const c of sources){
    if(tool==='swap'){for(const d of sources)if(c.id!==d.id&&c.symbol!==d.symbol)command(tool,c,{toX:d.x,toY:d.y},2);}
    else if(tool==='shift'){for(const d of pool.filter(c=>c.choice.action==='move').sort((a,b)=>b.order-a.order).slice(0,4))command(tool,c,{toX:d.choice.payload.x,toY:d.choice.payload.y},2);}
    else command(tool,c,{},(important.has(key(c.x,c.y))?4:0)+1);
   }
  }
 }
 pool.sort((a,b)=>b.order-a.order);
 // Score deterministic legal inventory alternatives with the real referee.
 const ranked=[];
 const byTool=new Map();for(const c of pool.filter(c=>c.choice.action!=='move')){const k=c.choice.action==='claim'?'claim':c.choice.payload.tool;if(!byTool.has(k))byTool.set(k,[]);byTool.get(k).push(c);}
 const alternatives=[];for(let round=0;round<3;round++)for(const list of byTool.values())if(list[round])alternatives.push(list[round]);
 for(const c of alternatives.slice(0,maximum)){
  try{const next=inverseCommand(room,c.choice.action,c.choice.payload,room.clockNow,()=>.41),a=analysis(next);ranked.push({...c,order:(a.value-info.value)*sign+(c.choice.action==='claim'?.05:0)});}catch{}
 }
 ranked.push(...pool.filter(c=>c.choice.action==='move').slice(0,maximum));ranked.sort((a,b)=>b.order-a.order);
 const selected=ranked.slice(0,maximum);
 // A legal claim must remain available even while promising placements dominate.
 const claim=ranked.find(c=>c.choice.action==='claim');if(claim&&!selected.includes(claim))selected[selected.length-1]=claim;
 return selected.map(c=>c.choice);
}
function closeWinningFill(room,acquire){
 if(room.inverseVersion!==3||room.inverseFill.length>3)return null;
 const actor=signed(room,room.pairs[0].turn),opponent=signed(room,other(actor.symbol));
 const closing=r=>canClaimInverse(r,actor.id)&&inverseClaims(r,actor.id).some(f=>f.filled===r.inverseFill.length&&signed(r,actor.symbol).score+f.pointsValue>opponent.score);
 const action=r=>{for(const tool of ['opposite','shift','swap'])if(canUsePracticeTool(r,actor.id,tool,r.clockNow)){
  const sources=toolCells(r,actor.id,tool).slice(0,48),free=availableCells(r,r.pairs[0]);
  for(const c of sources){const targets=tool==='shift'?free.filter(p=>room.inverseFill.some(k=>{const [x,y]=k.split(',').map(Number);return Math.abs(p.x-x)+Math.abs(p.y-y)<=2;})).slice(0,24):tool==='swap'?sources.filter(p=>p.id!==c.id&&p.symbol!==c.symbol):[null];
   for(const d of targets){const choice={action:'inventory',payload:{tool,playerId:actor.id,x:c.x,y:c.y,...(d?{toX:d.x,toY:d.y}:{})}};try{if(closing(inverseCommand(r,choice.action,choice.payload,r.clockNow,()=>.41)))return choice;}catch{}}
  }
 }return null;};
 if(closing(room))return null;
 const held=action(room);if(held)return held;
 if(acquire)for(const tool of ['opposite','shift']){const trade=tradeAvailability(room,actor.id,tool,room.clockNow);if(!trade.allowed||actor.inventory.cards[tool]||actor.score-trade.price<=opponent.score)continue;const probe=structuredClone(room);buyCard(probe,actor.id,tool,room.clockNow);if(action(probe))return {action:'trade',payload:{playerId:actor.id,tool}};}
 return null;
}
export function chooseInverseAction(room,random=Math.random,options={}){
 if(options.automatic&&room.timeMode!=='untimed')room={...room,timeMode:'untimed'};
 const level=room.difficulty||'medium',pro=level==='pro',strong=pro||level==='high',start=performance.now(),deadline=start+(options.maxTimeMs??(options.automatic?100:pro?1800:level==='high'?450:80)),maxNodes=options.maxNodes??(pro?8000:1200);
 if(strong&&!options.automatic&&options.cards!==false){const close=closeWinningFill(room,true);if(close)return close;}
 let nodes=0,depthDone=0;const memo=new Map(),rootInfo=analysis(room),root=candidates(room,rootInfo,{cards:!options.automatic&&options.cards!==false&&level!=='basic',maximum:pro?12:8});
 if(!root.length){
  const actor=signed(room,room.pairs[0].turn);
  for(const tool of ['erase','bomb'])if(canUsePracticeTool(room,actor.id,tool,room.clockNow))for(const point of toolCells(room,actor.id,tool).slice(0,12)){const choice={action:'inventory',payload:{tool,playerId:actor.id,x:point.x,y:point.y}};try{inverseCommand(room,choice.action,choice.payload,room.clockNow,()=>.41);return choice;}catch{}}
  if(tradeAvailability(room,actor.id,'erase',room.clockNow).allowed)return {action:'trade',payload:{playerId:actor.id,tool:'erase'}};
  return null;
 }
 const finalClaim=rootInfo.claims[room.pairs[0].turn].find(f=>f.filled===room.inverseFill.length&&signed(room,room.pairs[0].turn).score+f.pointsValue>signed(room,other(room.pairs[0].turn)).score);
 if(finalClaim&&canClaimInverse(room,signed(room,room.pairs[0].turn).id))return {action:'claim',payload:{x:finalClaim.points[0][0],y:finalClaim.points[0][1],figureId:finalClaim.id}};
 const sign=room.pairs[0].turn==='X'?1:-1;
 let best=root[0],bestValue=-Infinity;
 const evaluate=r=>{const a=analysis(r);if(r.status==='finished'){const d=signed(r,'X').score-signed(r,'O').score;return d===0?0:Math.sign(d)*100000+d;}return a.value;};
 // Complete one-ply before deepening; interrupted iterations never replace it.
 for(const choice of root){try{const n=inverseCommand(room,choice.action,choice.payload,room.clockNow,()=>.41),value=evaluate(n)*sign;if(value>bestValue){bestValue=value;best=choice;}}catch{}}
 if(level==='basic'&&random()<.35)return root[Math.floor(random()*root.length)];
 const check=()=>{if(++nodes>maxNodes||performance.now()>=deadline)throw STOP;};
 function search(r,depth,alpha,beta){
  check();if(r.status==='finished'||depth===0)return evaluate(r);
  const cacheKey=stateKey(r)+':'+depth,hit=memo.get(cacheKey);if(hit!==undefined)return hit;
  const a=analysis(r),choices=candidates(r,a,{cards:options.cards!==false&&strong,maximum:pro?7:5});if(!choices.length)return a.value;
  const alphaStart=alpha,betaStart=beta,maximize=r.pairs[0].turn==='X';let value=maximize?-Infinity:Infinity,cut=false;
  for(const c of choices){check();let next;try{next=inverseCommand(r,c.action,c.payload,r.clockNow,()=>.41);}catch{continue;}
   const v=search(next,depth-1,alpha,beta);value=maximize?Math.max(value,v):Math.min(value,v);if(maximize)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);if(alpha>=beta){cut=true;break;}
  }
  if(!cut&&Number.isFinite(value)&&value>alphaStart&&value<betaStart)memo.set(cacheKey,value);return Number.isFinite(value)?value:a.value;
 }
 if(strong&&!options.automatic)for(let depth=2;depth<=(pro?6:3);depth++){
  let nextBest=best,value=-Infinity,complete=true;
  try{for(const c of [best,...root.filter(c=>c!==best)]){check();const next=inverseCommand(room,c.action,c.payload,room.clockNow,()=>.41),v=search(next,depth-1,-Infinity,Infinity)*sign;if(v>value){value=v;nextBest=c;}}}catch(e){if(e!==STOP)throw e;complete=false;}
  if(!complete)break;best=nextBest;bestValue=value;depthDone=depth;
 }
 options.onAnalysis?.({level,depth:depthDone||1,nodes,elapsedMs:performance.now()-start});
 return best;
}
