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
import {cellWarningMarkup,cellEffectMarkup} from './cell-effect-markup.js';
export const inverseWarningMarkup=kind=>cellWarningMarkup(kind,`inverse-cell-warning inverse-warning-${kind}`);
export const inverseEffectMarkup=cellEffectMarkup;
