// Called only on accepted snapshots, not while panning. Restoring a save is silent.
export function inverseCellChanges(previous,next){
 if(previous?.id!==next.id||next.variant!=='inverse'||![2,3].includes(next.inverseVersion)||!['playing','finished'].includes(next.status)||previous.version>=next.version)return [];
 const before=new Set(previous.inverseFill),after=new Set(next.inverseFill),lost=new Set(next.inverseContourEvent?.id!==previous.inverseContourEvent?.id?next.inverseContourEvent?.cleared:[]);
 const result=[];
 const add=(k,kind)=>{const [x,y]=k.split(',').map(Number);result.push({x,y,kind});};
 for(const k of before)if(!after.has(k))add(k,lost.has(k)?'erode':'clear');
 for(const k of after)if(!before.has(k))add(k,'create');
 if(next.inverseWildEvent?.id!==previous.inverseWildEvent?.id&&next.inverseWildEvent){const {x,y}=next.inverseWildEvent;result.push({x,y,kind:'wild'});}
 return result;
}
export const inverseWarningMarkup=kind=>`<svg class="inverse-cell-warning inverse-warning-${kind}" viewBox="0 0 48 48" aria-hidden="true"><rect class="warning-underlay" x="5" y="5" width="38" height="38" rx="4"/><rect class="warning-dashes" x="5" y="5" width="38" height="38" rx="4"/><path d="${kind==='restore'?'M19 10h10m-5-5v10':'M19 10h10'}"/></svg>`;
export const inverseEffectMarkup=kind=>`<svg viewBox="0 0 48 48" aria-hidden="true"><rect class="effect-ring" x="5" y="5" width="38" height="38" rx="6"/><g class="effect-shards"><path d="M8 15V8h7M33 8h7v7M40 33v7h-7M15 40H8v-7"/></g>${kind==='wild'?'<text x="24" y="32" text-anchor="middle">#</text>':`<path class="effect-sign" d="M17 24h14${kind==='create'?'m-7-7v14':''}"/>`}</svg>`;
