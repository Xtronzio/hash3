export function lastGlyphPerCell(items){
 const winners=new Map();
 for(const e of items){if(!Number.isFinite(e.x)||!Number.isFinite(e.y))continue;
  const key=`${e.x},${e.y}`,prior=winners.get(key),time=e.visualAt??e.at??0,order=e.visualOrder||0;
  if(!prior||order>(prior.visualOrder||0)||order===(prior.visualOrder||0)&&time>=(prior.visualAt??prior.at??0))winners.set(key,e);
 }
 return winners;
}
