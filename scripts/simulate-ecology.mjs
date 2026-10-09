// Evaluación reproducible de intensidad geométrica; no necesita servidor ni red.
// npm run simulate:ecology -- --json
import {createLocal} from '../src/local.js';
import {terrainOf,key} from '../src/game.js';
import {territoryRegion,advanceTerritory} from '../src/territory-tools.js';
import {TERRITORY_EVENT_RULES,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION,impactCount} from '../src/territory-event-rules.js';
import {plannedEventRegion} from '../src/territory-event-actions.js';

const rng=seed=>()=>{
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;
};
const create=(size,density,seed)=>{
 const game=createLocal('local','Colono X','Colono O',1000,'normal','untimed'),r=rng(seed);
 game.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));
 game.cells=game.terrain.filter((_,i)=>r()<density).map((c,i)=>({...c,id:'p'+i,owner:i%2?'local-x':'local-o',symbol:i%2?'X':'O'}));
 game.players[0].figures=120;return game;
};
function footprint(room,kind,random){
 if(kind==='ufo')return territoryRegion(room,'ufo',random,impactCount(room,kind));
 if(kind==='earthquake')return territoryRegion(room,'cataclysm',random,impactCount(room,kind));
 return plannedEventRegion(room,kind,random,1000);
}
export function simulateEcology({sizes=[333,999,3333],densities=[.35,.7,.95],trials=12}={}){
 const results=[];
 for(const size of sizes)for(const density of densities){
  for(const kind of [...INVADER_EVENT_ROTATION,...NATURAL_EVENT_ROTATION]){
   let trialsRun=0,territoryRemoved=0,piecesRemoved=0,piecesMoved=0,invasionCells=0,unavailable=0;
   for(let i=0;i<trials;i++){
    const room=create(size,density,i+Math.floor(density*1000)+size),random=rng(i+100+size);
    const plan=footprint(room,kind,random),region=Array.isArray(plan)?plan:plan.region;
    if(!region?.length){unavailable++;continue;}
    const beforePieces=new Map(room.cells.map(c=>[c.id,{x:c.x,y:c.y}]));
    const oldTerrain=terrainOf(room).length,oldPieces=room.cells.length;
    room.territoryEvents=[{id:kind+':'+i,kind,region,...(plan.groups?{groups:plan.groups}:{}),nextAt:2000}];
    advanceTerritory(room,2000);
    const moved=room.cells.filter(c=>beforePieces.has(c.id)).filter(c=>{
     const previous=beforePieces.get(c.id);return previous.x!==c.x||previous.y!==c.y;
    }).length;
    territoryRemoved+=oldTerrain-room.terrain.length;
    piecesRemoved+=oldPieces-room.cells.filter(c=>c.symbol!=='*').length;
    piecesMoved+=moved;
    invasionCells+=room.cells.filter(c=>c.symbol==='*').length;
    trialsRun++;
   }
   const avg=v=>trialsRun?Math.round(v/trialsRun*10)/10:0;
   results.push({size,density,kind,family:TERRITORY_EVENT_RULES[kind].family,attempts:trials,
    viable:trialsRun,unavailable,terrainLost:avg(territoryRemoved),
    piecesLost:avg(piecesRemoved),piecesMoved:avg(piecesMoved),invaderCells:avg(invasionCells)});
  }
 }
 return results;
}
const results=simulateEcology({trials:process.argv.includes('--quick')?2:12});
if(results.some(r=>r.viable+r.unavailable!==r.attempts||Object.values(r).some(v=>typeof v==='number'&&!Number.isFinite(v))))throw Error('Invalid simulation metrics');
if(process.argv.includes('--json'))console.log(JSON.stringify(results,null,2));
else console.table(results);
