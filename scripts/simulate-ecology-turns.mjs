// Actual commands, accepted placements, tools, Doble, pause and recovery.
// Random play is a reproducible stress scenario, not a measured human win rate.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createLocal,localCommand} from '../src/local.js';
import {availableCells,expansionOptions,key} from '../src/game.js';
import {canUsePracticeTool,toolCells,MAX_CARDS,MAX_CARD_TYPES,MAX_PER_CARD} from '../src/practice-tools.js';
import {initializeTerritory} from '../src/territory-tools.js';

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const choose=(items,random)=>items[Math.floor(random()*items.length)];
function runTurns({size=333,moves=1500,seed=33,secondsPerMove=6,density=.35,territoryEnabled=true,durationSeconds=null,openingFigures=99}={}){
 const random=rng(seed);let now=1000;
 let room=createLocal('local','X','O',now,'normal','untimed','medium','X',false,{matchGoal:durationSeconds?{type:'time',target:durationSeconds}:undefined});
 room.territoryEnabled=territoryEnabled;
 room.terrain=Array.from({length:size},(_,i)=>({x:i%33,y:Math.floor(i/33)}));
 room.cells=room.terrain.filter(()=>random()<density).map((p,i)=>({...p,id:'initial:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
 // Start after the opening gate; report separately from a fresh 3×3 game.
 room.players[0].figures=openingFigures;room.territoryMilestone=Math.floor(size/333);
 delete room.territoryActivityVersion;initializeTerritory(room);
 const stats={size,seed,territoryEnabled,requestedMoves:moves,secondsPerMove,density,openingFigures,durationSeconds,activeSeconds:0,placements:0,turns:0,expansions:0,cardsUsed:0,pauses:0,rodentMeals:0,wormMeals:0,constructed:0,demolished:0,announcements:{},impacts:{},piecesMoved:0,minSize:size,maxSize:size};
 const seen={events:new Set(),actions:new Set(),visits:new Set()};
 const collect=before=>{
  for(const event of room.territoryEvents||[])if(!seen.events.has(event.id)){
   seen.events.add(event.id);stats.announcements[event.kind]=(stats.announcements[event.kind]||0)+1;
  }
  const habitat=room.habitatEvent;
  if(habitat&&!seen.actions.has(habitat.id)){
   seen.actions.add(habitat.id);
   for(const c of habitat.actions||[]){
    if(c.kind==='worm')stats.wormMeals++;
    else if(c.kind==='build')stats.constructed++;
    else if(c.kind==='destroy')stats.demolished++;
    else stats.impacts[c.kind]=(stats.impacts[c.kind]||0)+1;
   }
  }
  if(room.rodentVisit&&!seen.visits.has(room.rodentVisit.id)){seen.visits.add(room.rodentVisit.id);stats.rodentMeals+=room.rodentVisit.visits.length;}
  const positions=new Map(before.cells.map(c=>[c.id,key(c.x,c.y)]));
  stats.piecesMoved+=room.cells.filter(c=>positions.has(c.id)&&positions.get(c.id)!==key(c.x,c.y)).length;
  stats.minSize=Math.min(stats.minSize,room.terrain.length);stats.maxSize=Math.max(stats.maxSize,room.terrain.length);
  for(const p of room.players)assert.ok(p.score>=before.players.find(v=>v.id===p.id).score,'Already paid scores never decrease');
 };
 const command=(action,payload={},time=now)=>{const before=room;room=localCommand(room,action,payload,time,random);collect(before);};
 const invariants=()=>{
  const terrain=new Set(room.terrain.map(p=>key(p.x,p.y)));
  assert.equal(terrain.size,room.terrain.length,'Unique terrain');
  assert.equal(new Set(room.cells.map(p=>key(p.x,p.y))).size,room.cells.length,'Unique occupied slots');
  assert.ok(room.cells.every(p=>terrain.has(key(p.x,p.y))),'Pieces remain on terrain');
  assert.ok(room.territoryEvents.length<=1,'No queue of territorial events');
  for(const p of room.players){const stock=Object.values(p.inventory.cards);assert.ok(stock.every(n=>n>=0&&n<=MAX_PER_CARD));assert.ok(stock.reduce((n,v)=>n+v,0)<=MAX_CARDS);assert.ok(stock.filter(n=>n>0).length<=MAX_CARD_TYPES);}
 };
 let stalled=0;
 while(stats.placements<moves&&room.status==='playing'&&stalled<10){
  now+=secondsPerMove*1000;stats.activeSeconds+=secondsPerMove;command('tick');if(room.status!=='playing')break;
  if(stats.placements>0&&stats.placements%211===0&&stats.pauses<Math.floor(stats.placements/211)){
   command('pause');const cells=JSON.stringify(room.cells),score=room.players.map(p=>p.score);
   now+=3600000;command('tick');assert.equal(JSON.stringify(room.cells),cells);assert.deepEqual(room.players.map(p=>p.score),score);command('resume');stats.pauses++;
  }
  const pair=room.pairs[0];
  if(pair.pending){const options=expansionOptions(room.terrain,pair.terrainAnchor||pair.active,room);if(!options.length){stalled++;continue;}command('expand',choose(options,random));stats.expansions++;continue;}
  const playerId=pair[pair.turn.toLowerCase()];
  if(stats.placements%5===0)for(const tool of ['double','erase','opposite','rival']){
   if(!canUsePracticeTool(room,playerId,tool,now))continue;
   const targets=['erase','opposite'].includes(tool)?toolCells(room,playerId,tool):[{}];
   if(!targets.length)continue;
   command('inventory',{tool,playerId,...choose(targets,random)});stats.cardsUsed++;break;
  }
  const free=availableCells(room,room.pairs[0]);
  if(!free.length){stalled++;continue;}
  const turn=room.pairs[0].turn;command('move',choose(free,random));stats.placements++;stalled=0;
  if(room.pairs[0].turn!==turn)stats.turns++;
  if(stats.placements%50===0)invariants();
 }
 invariants();
 return {...stats,finalSize:room.terrain.length,finalPieces:room.cells.length,invaderPieces:room.cells.filter(p=>p.symbol==='*').length,figures:room.players.reduce((n,p)=>n+p.figures,0)-openingFigures,points:room.players.reduce((n,p)=>n+p.score,0),finishReason:room.finishReason,completed:stats.placements===moves||room.status==='finished'};
}
export function simulateTurns(options={}){
 const original=crypto.randomUUID;let serial=0;
 crypto.randomUUID=()=>`00000000-0000-4000-8000-${String((options.seed??33)*100000+serial++).padStart(12,'0')}`;
 try{return runTurns(options);}finally{crypto.randomUUID=original;}
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const quick=process.argv.includes('--quick'),results=[];
 for(const size of quick?[333]:[333,999,3333])for(const seed of quick?[33]:[33,99]){
  for(const territoryEnabled of [true,false])results.push(simulateTurns({size,seed,territoryEnabled,moves:quick?180:size===3333?2000:1500}));
 }
 console.log(JSON.stringify({scenario:'Seeded random local play after the 99-figure gate, 6 active seconds per placement, one tool attempt per five placements; no human strategy model',results},null,2));
}
