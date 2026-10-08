import {createLocal,localCommand} from '../src/local.js';
import {expansionOptions} from '../src/game.js';
import {cellIndex} from '../src/board-window.js';
import {saveLocalGame} from '../src/sessions.js';
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
for(const n of [9999,33333,99999]){
 const w=Math.ceil(Math.sqrt(n));const r=createLocal('local','A','B',1000,'normal','untimed','medium','X',false,{faunaEnabled:true,territoryEnabled:false});
 r.terrain=Array.from({length:n},(_,i)=>({x:i%w,y:Math.floor(i/w)}));
 r.cells=r.terrain.filter((_,i)=>i%5!==0).map((c,i)=>({...c,id:`cell-${i}`,symbol:((c.x*73856093^c.y*19349663)>>>0)%3?'X':'O',owner:i%2?'local-x':'local-o'}));
 r.forms=r.cells.filter((_,i)=>i%3===0).map(c=>`X:línea:${c.x},${c.y};${c.x+1},${c.y};${c.x+2},${c.y}`);
 const sample={move:[],expansion:[],save:[],navigation:[]};const idx=cellIndex(r.terrain);let visible;
 for(let run=0;run<6;run++){
  let t=performance.now();// No match goal and no classic cap: benchmark the actual move, including above-cap stress cases.
  const moved=localCommand(r,'move',{x:0,y:0},2000,()=>.5);const move=performance.now()-t;
  t=performance.now();expansionOptions(r.terrain,r.pairs[0].active,{...r,faunaEnabled:true});const expansion=performance.now()-t;
  const storage={map:new Map(),getItem(k){return this.map.get(k)||null},setItem(k,v){this.map.set(k,v)}};
  t=performance.now();saveLocalGame(storage,moved);const save=performance.now()-t;
  t=performance.now();for(let j=0;j<1000;j++)visible=idx.query({x:j%(w-14),y:(j*7)%(w-22),width:14,height:22}).length;const navigation=(performance.now()-t)/1000;
  if(run){sample.move.push(move);sample.expansion.push(expansion);sample.save.push(save);sample.navigation.push(navigation);}
 }
 console.log(JSON.stringify({n,method:'5 medians after warmup; synthetic 80% occupied',visible,moveMs:+median(sample.move).toFixed(1),expansionMs:+median(sample.expansion).toFixed(1),serializeSaveMs:+median(sample.save).toFixed(1),navigationQueryMs:+median(sample.navigation).toFixed(3),jsonBytes:Buffer.byteLength(JSON.stringify(r)),fullOccupancyAt10sHours:+(n*10/3600).toFixed(1)}));
}
