export function rodentVisitFeedback(previous,next){
 const event=next?.rodentVisit;
 if(!previous||previous.id!==next.id||!event||event.id===previous.rodentVisit?.id||!event.visits?.length)return null;
 return {id:event.id,visits:event.visits.map(v=>({...v,kind:'rodent'}))};
}
export function boardActionFeedback(previous,next){
 if(!previous||previous.id!==next.id||next.status!=='playing')return null;
 const visits=[...(rodentVisitFeedback(previous,next)?.visits||[])],toolVisits=[];
 const event=next.lastEvent;
 if(event?.id!==previous.lastEvent?.id&&event?.tool&&event.tool!=='tornado'){
  const prior=new Map((previous.cells||[]).map(c=>[c.id,c]));
  const points=event.affected||event.cells||event.region||(Number.isFinite(event.x)&&Number.isFinite(event.y)?[event]:(next.cells||[]).filter(c=>!prior.has(c.id)||prior.get(c.id).x!==c.x||prior.get(c.id).y!==c.y||prior.get(c.id).symbol!==c.symbol));
  toolVisits.push(...points.map(p=>({x:p.x,y:p.y,kind:event.tool,inventory:true})));
 }
 const habitat=next.habitatEvent,neutral=next.neutralEvent;
 if(habitat&&habitat.id!==previous.habitatEvent?.id)visits.push(...(habitat.actions||[]),...(habitat.visualActions||[]));
 if(habitat&&habitat.id!==previous.habitatEvent?.id)for(const route of habitat.visualRoutes||[]){
  const {from,to}=route;if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isInteger))continue;
  const length=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))+1;if(length>(next.terrain?.length??(next.blocks?.length||0)*9))continue;
  const dx=Math.sign(to.x-from.x),dy=Math.sign(to.y-from.y);
  for(let i=0;i<length;i++)visits.push({x:from.x+i*dx,y:from.y+i*dy,kind:'rhino',group:i});
 }
 if(neutral&&neutral.id!==previous.neutralEvent?.id)visits.push({x:neutral.x,y:neutral.y,kind:'neutral'});
 visits.push(...toolVisits);
 // A meal can free the exact cell chosen for # in the same command. The
 // resulting action must explain #, rather than covering it with a mouse.
 const neutralPositions=new Set(visits.filter(v=>v.kind==='neutral').map(v=>`${v.x},${v.y}`));
 const distinct=[...new Map(visits.filter(v=>v.kind==='neutral'||!neutralPositions.has(`${v.x},${v.y}`)).map(v=>[`${v.x},${v.y}`,v])).values()];
 return distinct.length?{visits:distinct}:null;
}
