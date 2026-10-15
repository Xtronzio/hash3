import {createLocal} from '../src/local.js';
import {rhinoRoutes} from '../src/brief-ecology.js';
import {anacondaRoute,ANACONDA_BODY,ANACONDA_INTERVAL} from '../src/anaconda.js';
import {rememberRoute,routeHistoryIndex,routeNovelty} from '../src/fauna-routes.js';
import assert from 'node:assert/strict';
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
const results=[];
for(const size of [9,99,333,999,33333]){
 const room=createLocal('local','A','B',1000,'normal','untimed','medium','X',false,{random:rng(33)}),width=size===9?3:size===33333?183:33;room.terrain=Array.from({length:size},(_,i)=>({x:i%width,y:Math.floor(i/width)}));
 const start=performance.now(),lengths=[],orientations=new Set();let skipped=0;
 for(let n=0;n<12;n++){const path=rhinoRoutes(room,1,rng(33+n))[0];if(!path){skipped++;continue;}assert.ok(routeNovelty(path,routeHistoryIndex(room,'rhino'))>=0);orientations.add(Math.abs(Math.sign(path.at(-1).x-path[0].x))+','+Math.sign(path.at(-1).y-path[0].y));rememberRoute(room,'rhino',path);}
 for(let n=0;n<12;n++){const path=anacondaRoute(room,rng(n+333));if(!path.length){skipped++;continue;}assert.equal(new Set(path.map(c=>c.x+','+c.y)).size,path.length);assert.ok(routeNovelty(path,routeHistoryIndex(room,'anaconda'))>=0);rememberRoute(room,'anaconda',path);lengths.push(path.length);}
 results.push({size,attempts:12,skipped,rhinoOrientations:orientations.size,anacondaLength:{min:Math.min(...lengths),max:Math.max(...lengths),mean:lengths.reduce((a,b)=>a+b,0)/lengths.length},anacondaTurnsMean:lengths.reduce((a,b)=>a+Math.ceil(b/3),0)/lengths.length,body:ANACONDA_BODY,baseInterval:ANACONDA_INTERVAL,elapsedMs:Math.round(performance.now()-start),historyBytes:JSON.stringify(room.faunaRouteHistory).length});
}
console.log(JSON.stringify({note:'Synthetic self-avoiding walks, not measured human balance. Frequency 165, single resident, tail9; no lifetime cap.',results},null,2));
