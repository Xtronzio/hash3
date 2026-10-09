import {simulateTurns} from './simulate-ecology-turns.mjs';
const quick=process.argv.includes('--quick'),results=[];
for(const size of quick?[333]:[333,999,3333])for(const seed of quick?[33]:[33,66,99]){
 results.push(simulateTurns({size,seed,moves:180}));
 process.stderr.write(`Completed ${size} cells, seed ${seed}\n`);
}
for(const durationSeconds of quick?[180]:[33,180,360,540])for(const openingFigures of quick?[99]:[0,99])
 results.push(simulateTurns({size:333,seed:33,moves:1000,durationSeconds,openingFigures}));
if(!quick)for(const size of [9999,33333]){
 results.push(simulateTurns({size,seed:33,moves:180}));process.stderr.write(`Completed ${size} cells\n`);
}
console.log(JSON.stringify({scenario:'Actual seeded local commands, random play, density .35, six active seconds per action, one tool attempt per five placements; opening gate stated per run. No human strategy or win-rate model.',results},null,2));
