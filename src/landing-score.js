import {key,figureWindows,prepareFigureIndex} from './game.js';
import {earnFreeExpansion} from './free-expansion.js';
import {recordCombo} from './records.js';

export function pruneBrokenForms(room){
 const symbols=new Map(room.cells.map(c=>[key(c.x,c.y),c.symbol]));
 room.forms=(room.forms||[]).filter(f=>f.slice(f.lastIndexOf(':')+1).split(';').every(k=>symbols.get(k)===f[0]));
}
export function awardFigures(room,scorer,figures){
 room.forms.push(...figures.map(f=>f.id));
 const bonus=3*(Math.floor((scorer.figures+figures.length)/3)-Math.floor(scorer.figures/3));
 const points=figures.reduce((sum,f)=>sum+f.size,0)+bonus;
 scorer.score+=points;scorer.figures+=figures.length;earnFreeExpansion(scorer);
 const pair=room.pairs.find(p=>p.id===scorer.pair)||room.pairs[0];pair.credits+=figures.length;
 return {figures:figures.length,points,bonus,paidFigures:figures};
}
// Score the final arrangement once, including figures crossing the shuffled
// region's edge. Identical figures already present before landing never pay.
export function scoreLandings(room,before,affected,{kind='tornado',actor=null}={}){
 const old=new Map(before.map(c=>[key(c.x,c.y),c])),after=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
 const changed=[...new Map(affected.map(c=>[key(c.x,c.y),c])).values()].filter(c=>old.get(key(c.x,c.y))?.symbol!==after.get(key(c.x,c.y))?.symbol);
 const beforeIndex=prepareFigureIndex(before),afterIndex=prepareFigureIndex(room.cells),existing=new Set();
 for(const c of changed){const symbol=old.get(key(c.x,c.y))?.symbol;if(symbol)for(const f of figureWindows(before,c.x,c.y,symbol,room.level,beforeIndex))existing.add(f.id);}
 pruneBrokenForms(room);
 const paid=new Set(room.forms),found=new Map();
 for(const c of changed){const symbol=after.get(key(c.x,c.y))?.symbol;if(symbol)for(const f of figureWindows(room.cells,c.x,c.y,symbol,room.level,afterIndex))if(!paid.has(f.id)&&!existing.has(f.id))found.set(f.id,f);}
 const scores=[];
 for(const scorer of room.players){
  const figures=[...found.values()].filter(f=>f.id[0]===scorer.symbol);if(!figures.length)continue;
  const result=awardFigures(room,scorer,figures);
  recordCombo(scorer,{...result,automatic:actor!==scorer.id,moveId:null});
  scores.push({player:scorer.id,symbol:scorer.symbol,...result});
 }
 if(scores.length)room.landingEvent={id:crypto.randomUUID(),kind,actor,scores};
 return scores;
}
