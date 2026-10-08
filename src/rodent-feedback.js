export function rodentVisitFeedback(previous,next){
 const event=next?.rodentVisit;
 if(!previous||previous.id!==next.id||!event||event.id===previous.rodentVisit?.id||!event.visits?.length)return null;
 return {id:event.id,visits:event.visits.map(v=>({...v,kind:'rodent'}))};
}
export function boardActionFeedback(previous,next){
 if(!previous||previous.id!==next.id||next.status!=='playing')return null;
 const visits=[...(rodentVisitFeedback(previous,next)?.visits||[])];
 const habitat=next.habitatEvent,neutral=next.neutralEvent;
 if(habitat&&habitat.id!==previous.habitatEvent?.id)visits.push(...(habitat.actions||[]));
 if(neutral&&neutral.id!==previous.neutralEvent?.id)visits.push({x:neutral.x,y:neutral.y,kind:'neutral'});
 return visits.length?{visits}:null;
}
