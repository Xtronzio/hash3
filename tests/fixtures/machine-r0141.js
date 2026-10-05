// Frozen R0.14.1 opponent for repeatable strength comparisons.
import {key,terrainOf,connectedTerrain,expansionOptions,shapeTemplates} from '../../src/game.js';

export const machineLevels=[
  {id:'basic',label:'Básico'}, {id:'medium',label:'Medio'},
  {id:'high',label:'Alto'}, {id:'pro',label:'Pro'}
];
export const machineLevelLabel=level=>machineLevels.find(l=>l.id===level)?.label||'Medio';
const settings={
  basic:{depth:1,nodes:0,time:0},medium:{depth:1,nodes:0,time:0},
  high:{depth:4,nodes:5000,time:180},pro:{depth:9,nodes:42000,time:1100}
};
const directions=[[1,0],[0,1],[1,1],[1,-1]];
const STOP=Symbol('search-budget');
const symbolNumber=s=>s==='X'?1:2;

// Compile the legal terrain once. Search updates pattern counts in place and
// undoes each move, rather than cloning a growing game for every branch.
class Position {
  constructor(room,futureWeight=1){
    this.cells=connectedTerrain(terrainOf(room),room.pairs[0].active);
    this.legalSize=this.cells.length;this.futureWeight=futureWeight;
    const existing=new Set(this.cells.map(c=>key(c.x,c.y))),frontier=new Map();
    for(const c of this.cells)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const point={x:c.x+dx,y:c.y+dy},k=key(point.x,point.y);if(!existing.has(k))frontier.set(k,point);
    }
    this.expansionPoints=futureWeight?expansionOptions(this.cells,room.pairs[0].active):[];
    for(const point of this.expansionPoints)for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){
      const c={x:point.x+dx,y:point.y+dy},k=key(c.x,c.y);if(!existing.has(k))frontier.set(k,c);
    }
    this.cells.push(...frontier.values());
    this.index=new Map(this.cells.map((c,i)=>[key(c.x,c.y),i]));
    const sets=new Set();this.expansions=this.expansionPoints.map(c=>Array.from({length:9},(_,n)=>this.index.get(key(c.x+n%3,c.y+Math.floor(n/3)))).filter(i=>i>=this.legalSize)).filter(indices=>{
      const id=[...indices].sort((a,b)=>a-b).join(',');if(sets.has(id))return false;sets.add(id);return true;
    });this.extended=false;this.extensionKey='root';
    this.board=new Uint8Array(this.cells.length);
    for(const c of room.cells){const i=this.index.get(key(c.x,c.y));if(i!==undefined)this.board[i]=symbolNumber(c.symbol);}
    this.free=this.cells.slice(0,this.legalSize).map((_,i)=>i).filter(i=>!this.board[i]);
    this.figures=[0,...['X','O'].map(s=>room.players.find(p=>p.symbol===s)?.figures||0)];
    this.diff=(room.players.find(p=>p.symbol==='X')?.score||0)-(room.players.find(p=>p.symbol==='O')?.score||0);
    this.advanced=room.level==='advanced';this.patterns=[];this.at=this.cells.map(()=>[]);
    const known=new Set();
    const add=(indices,line=false)=>{
      if(indices.some(i=>i===undefined))return;
      const id=(line?'line:':'shape:')+[...indices].sort((a,b)=>a-b).join(',');if(known.has(id))return;known.add(id);
      const p={indices,line,frontier:indices.some(i=>i>=this.legalSize),size:indices.length,x:0,o:0};for(const i of indices){if(this.board[i]===1)p.x++;else if(this.board[i]===2)p.o++;}
      this.patterns.push(p);for(const i of indices)this.at[i].push(p);
    };
    for(const i of [...this.free,...this.cells.map((_,i)=>i).slice(this.legalSize)]){
      const c=this.cells[i];
      for(const {points} of shapeTemplates)for(const [ax,ay] of points)add(points.map(([x,y])=>this.index.get(key(c.x+x-ax,c.y+y-ay))));
      for(const [dx,dy] of directions)for(let anchor=0;anchor<3;anchor++)add([0,1,2].map(n=>this.index.get(key(c.x+(n-anchor)*dx,c.y+(n-anchor)*dy))),true);
    }
    this.rays=this.cells.map(c=>directions.map(([dx,dy])=>[-1,1].map(sign=>this.index.get(key(c.x+sign*dx,c.y+sign*dy))??-1)));
    this.neighbors=this.cells.map(c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>this.index.get(key(c.x+dx,c.y+dy))).filter(i=>i!==undefined));
    this.potential=this.patterns.reduce((sum,p)=>sum+this.patternValue(p),0);
    let seed=0x12345678;this.zobrist=this.cells.map(()=>[0,1,2].map(()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed|0;}));
    this.zobrist2=this.cells.map(()=>[0,1,2].map(()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed|0;}));
    this.hash=0;this.hash2=0;this.board.forEach((s,i)=>{if(s){this.hash^=this.zobrist[i][s];this.hash2^=this.zobrist2[i][s];}});
  }
  patternValue(p){
    if(p.x&&p.o)return 0;
    const count=p.x||p.o,missing=p.size-count;
    if(!count||!missing)return 0;
    const value=missing===1?p.size*0.7:missing===2&&count>=2?p.size*0.25:count*0.04;
    return (p.x?value:-value)*(p.frontier?this.futureWeight:1);
  }
  gain(i,s){
    let points=0,figures=0;const completed=[];
    for(const p of this.at[i])if(!p.line&&(s===1?p.x:p.o)===p.size-1&&!(s===1?p.o:p.x)){
      points+=p.size;figures++;if(this.advanced)completed.push(p.indices);
    }
    for(let d=0;d<4;d++){
      const line=[i];
      for(let side=0;side<2;side++){let j=this.rays[i][d][side];while(j!==-1&&this.board[j]===s){line.push(j);j=this.rays[j][d][side];}}
      if(line.length>=3){points+=line.length;figures++;if(this.advanced)completed.push(line);}
    }
    if(this.advanced){
      const visited=new Set([i]),queue=[i];
      for(let k=0;k<queue.length;k++)for(const j of this.neighbors[queue[k]])if(this.board[j]===s&&!visited.has(j)){visited.add(j);queue.push(j);}
      if(queue.length>=4&&!completed.some(indices=>indices.length===queue.length&&indices.every(j=>visited.has(j)))){points+=queue.length;figures++;}
    }
    const bonus=3*(Math.floor((this.figures[s]+figures)/3)-Math.floor(this.figures[s]/3));
    return {points:points+bonus,figures};
  }
  future(i,s){
    let value=0;
    for(const p of this.at[i]){
      const own=s===1?p.x:p.o,other=s===1?p.o:p.x;
      if(!other&&own<p.size-1)value+=(own+1)**2/p.size;
      if(!own&&other)value+=other*0.3;
    }
    return value;
  }
  moves(s){
    return this.free.filter(i=>!this.board[i]).map(i=>({i,g:this.gain(i,s),threat:this.gain(i,3-s).points,future:this.future(i,s)}))
      .map(m=>({...m,order:m.g.points*1.1+m.threat+m.future*0.2}))
      .sort((a,b)=>b.order-a.order||a.i-b.i);
  }
  play(i,s,g){
    const previous=this.figures[s];this.figures[s]+=g.figures;this.diff+=(s===1?1:-1)*g.points;
    for(const p of this.at[i]){this.potential-=this.patternValue(p);if(s===1)p.x++;else p.o++;this.potential+=this.patternValue(p);}
    this.board[i]=s;this.hash^=this.zobrist[i][s];this.hash2^=this.zobrist2[i][s];return previous;
  }
  undo(i,s,g,previous){
    this.board[i]=0;this.hash^=this.zobrist[i][s];this.hash2^=this.zobrist2[i][s];this.figures[s]=previous;this.diff-=(s===1?1:-1)*g.points;
    for(const p of this.at[i]){this.potential-=this.patternValue(p);if(s===1)p.x--;else p.o--;this.potential+=this.patternValue(p);}
  }
  evaluation(){return this.diff+this.potential*0.22;}
}

// Also used to verify that speculative scoring agrees with the game referee.
export function machineMoveScore(room,point,symbol=room.pairs[0].turn){
  const position=new Position(room),i=position.index.get(key(point.x,point.y));
  if(i===undefined||position.board[i])throw new Error('La máquina solo puede analizar celdas vacías legales.');
  return position.gain(i,symbolNumber(symbol));
}

function searchPosition(position,turn,config,budget){
  const table=new Map();let completedDepth=0,best=null,bestValue=position.evaluation();
  const check=()=>{if(++budget.nodes>budget.maxNodes||(budget.nodes%32===0&&performance.now()>=budget.deadline))throw STOP;};
  function search(depth,s,alpha,beta,ply){
    check();
    const startAlpha=alpha,startBeta=beta,k=`${position.hash}:${position.hash2}:${position.extensionKey}:${position.figures[1]%3}:${position.figures[2]%3}:${position.diff}:${s}`;
    const cached=table.get(k);
    if(cached&&cached.depth===depth){if(cached.bound==='exact')return cached.value;if(cached.bound==='lower')alpha=Math.max(alpha,cached.value);else beta=Math.min(beta,cached.value);if(alpha>=beta)return cached.value;}
    let moves=position.moves(s);
    if(!moves.length){
      if(config.depth<=4||!position.futureWeight||position.extended||!position.expansions.length)return position.evaluation();
      // Completing a block is not the end of #3. Its last mover chooses the
      // expansion, but the other symbol places the first mark afterwards.
      const actor=3-s,originalFree=position.free;
      const candidates=position.expansions.map(indices=>({indices,value:Math.max(...indices.map(i=>position.gain(i,s).points))*(s===1?1:-1)}))
        .sort((a,b)=>actor===1?b.value-a.value:a.value-b.value).slice(0,6);
      let value=actor===1?-Infinity:Infinity;position.extended=true;
      try{
        for(const c of candidates){
          position.free=c.indices;position.extensionKey=c.indices.join(',');
          const next=search(2,s,alpha,beta,ply+1);
          if(actor===1)value=Math.max(value,next);else value=Math.min(value,next);
          if(actor===1)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);
          if(alpha>=beta)break;
        }
      }finally{position.free=originalFree;position.extended=false;position.extensionKey='root';}
      return value;
    }
    if(depth<=0){
      // Extend noisy leaves: do not stop just before a large combo or reply.
      if(depth<=-2||!moves.some(m=>m.g.points>=6||m.threat>=6))return position.evaluation();
      moves=moves.filter(m=>m.g.points>=6||m.threat>=6).slice(0,6);
    }else if(moves.length>12)moves=moves.slice(0,config.depth>4?(ply<2?18:10):(ply<2?12:7));
    if(cached){const index=moves.findIndex(m=>m.i===cached.move);if(index>0)moves.unshift(...moves.splice(index,1));}
    let value=s===1?-Infinity:Infinity,move=moves[0].i;
    for(const m of moves){
      const previous=position.play(m.i,s,m.g);let next;
      try{next=search(depth-1,3-s,alpha,beta,ply+1);}finally{position.undo(m.i,s,m.g,previous);}
      if(s===1?next>value:next<value){value=next;move=m.i;}
      if(s===1)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);
      if(alpha>=beta)break;
    }
    table.set(k,{depth,value,move,bound:value<=startAlpha?'upper':value>=startBeta?'lower':'exact'});return value;
  }
  const roots=position.moves(turn);
  if(!roots.length)return {best:null,value:bestValue,depth:0};
  best=roots[0].i;
  for(let depth=1;depth<=Math.min(config.depth,position.free.length);depth++){
    let value=turn===1?-Infinity:Infinity,move=best,alpha=-Infinity,beta=Infinity;
    const ordered=[...roots].sort((a,b)=>(a.i===best?-1:b.i===best?1:0));
    try{
      for(const m of ordered){
        const previous=position.play(m.i,turn,m.g);let next;
        try{next=search(depth-1,3-turn,alpha,beta,1);}finally{position.undo(m.i,turn,m.g,previous);}
        if(turn===1?next>value:next<value){value=next;move=m.i;}
        if(turn===1)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);
      }
      best=move;bestValue=value;completedDepth=depth;
    }catch(error){if(error!==STOP)throw error;break;}
    if(performance.now()>=budget.deadline||budget.nodes>=budget.maxNodes)break;
  }
  return {best,value:bestValue,depth:completedDepth};
}

function chooseExpansion(room,level,random,config,budget){
  const pair=room.pairs[0],actor=symbolNumber(room.players.find(p=>p.id===pair.expander)?.symbol||pair.turn);
  const turn=symbolNumber(pair.turn),known=new Set(terrainOf(room).map(c=>key(c.x,c.y))),unique=new Set();
  const candidates=[];
  for(const point of expansionOptions(terrainOf(room),pair.active)){
    const added=Array.from({length:9},(_,i)=>({x:point.x+i%3,y:point.y+Math.floor(i/3)})).filter(c=>!known.has(key(c.x,c.y)));
    const id=added.map(c=>key(c.x,c.y)).sort().join(';');if(unique.has(id))continue;unique.add(id);
    candidates.push({point,added});
  }
  if(!candidates.length)throw new Error('No hay ampliaciones legales.');
  if(level==='basic')return candidates[Math.floor(random()*candidates.length)].point;
  const occupied=new Map(room.cells.map(c=>[key(c.x,c.y),symbolNumber(c.symbol)]));
  for(const c of candidates){
    c.promise=0;
    for(const point of c.added){
      let own=0,other=0;
      for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
        const s=occupied.get(key(point.x+dx,point.y+dy));if(!s)continue;
        const weight=1/(1+Math.abs(dx)+Math.abs(dy));if(s===actor)own+=weight;else other+=weight;
      }
      c.promise+=own-(turn===actor?0.7:1.25)*other;
    }
  }
  candidates.sort((a,b)=>b.promise-a.promise);
  const evaluated=candidates.slice(0,level==='pro'?36:20).map(c=>{
    const position=new Position({...room,terrain:[...terrainOf(room),...c.added],pairs:[{...pair,active:c.point}]}),moves=position.moves(turn);
    const immediate=Math.max(0,...moves.map(m=>m.g.points));
    return {...c,position,value:position.evaluation()+(turn===1?1:-1)*immediate*0.9};
  }).sort((a,b)=>actor===1?b.value-a.value:a.value-b.value);
  if(level==='medium')return evaluated[0].point;
  let best=evaluated[0];
  const shortlist=evaluated.slice(0,level==='pro'?10:5);
  // Every shortlisted expansion gets the same completed search depth before
  // moving deeper, so a late budget expiry cannot favor an unsearched choice.
  for(let depth=1;depth<=Math.min(config.depth,level==='pro'?6:4);depth++){
    let nextBest=best,nextValue=actor===1?-Infinity:Infinity,complete=true;
    for(const c of shortlist){
      if(performance.now()>=budget.deadline||budget.nodes>=budget.maxNodes){complete=false;break;}
      const result=searchPosition(c.position,turn,{...config,depth},budget);
      if(result.depth<Math.min(depth,c.position.free.length)){complete=false;break;}
      if(actor===1?result.value>nextValue:result.value<nextValue){nextValue=result.value;nextBest=c;}
    }
    if(!complete)break;best=nextBest;
  }
  return best.point;
}

export function chooseMachineMove(room,random=Math.random,options={}){
  const level=settings[room.difficulty]?room.difficulty:'medium',config=settings[level],start=performance.now();
  const budget={nodes:0,maxNodes:options.maxNodes??config.nodes,deadline:start+(options.maxTimeMs??config.time)};
  const pair=room.pairs[0];let choice,depth=0;
  if(pair.pending){choice={action:'expand',payload:chooseExpansion(room,level,random,config,budget)};}
  else{
    const position=new Position(room,options.futureWeight??1),turn=symbolNumber(pair.turn),moves=position.moves(turn);
    if(!moves.length)throw new Error('No hay jugadas legales.');
    let i;
    if(level==='basic'){
      const simple=[...moves].sort((a,b)=>b.g.points-a.g.points);
      i=random()<0.55?moves[Math.floor(random()*moves.length)].i:simple[Math.floor(random()*Math.min(3,simple.length))].i;
    }else if(level==='medium'){
      const rated=moves.map(m=>({...m,value:m.g.points*2+m.threat+m.future*0.08})),best=Math.max(...rated.map(m=>m.value));
      const preferred=rated.filter(m=>Math.abs(m.value-best)<1e-8);i=preferred[Math.floor(random()*preferred.length)].i;
    }else{
      const result=searchPosition(position,turn,config,budget);i=result.best;depth=result.depth;
    }
    choice={action:'move',payload:position.cells[i]};
  }
  options.onAnalysis?.({level,depth,nodes:budget.nodes,elapsedMs:performance.now()-start});
  return choice;
}
