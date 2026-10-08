// A burst of pointer/scroll events paints the latest camera once per frame.
export function navigationFrame(paint){
 let frame=0;
 const flush=()=>{if(frame){cancelAnimationFrame(frame);frame=0;}paint();};
 return {queue(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;paint();});},flush,
  cancel(){if(frame)cancelAnimationFrame(frame);frame=0;}};
}
