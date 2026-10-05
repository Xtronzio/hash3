import {createLocal,localCommand,machineChoice} from '../src/local.js';
import {chooseMachineMove as previousPro} from '../tests/fixtures/machine-r0141.js';
import {availableCells} from '../src/game.js';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const games=Number(args.games||16),placementsLimit=Number(args.moves||36),seed=Number(args.seed||200);
if(!Number.isInteger(games)||games<4||games%4||!Number.isInteger(placementsLimit)||placementsLimit<12)throw new Error('Use a multiple of four games and at least twelve moves.');
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const results=[];
for(const opponent of (args.opponents||'previous-pro,high,medium').split(',')){
  let wins=0,draws=0,losses=0,totalMargin=0,moves=0,totalThink=0,maxThink=0;
  for(let sample=0;sample<games;sample++){
    const opening=Math.floor(sample/4),random=rng(seed+opening),level=sample%2?'advanced':'normal',proSymbol=sample%4<2?'X':'O';
    let room=createLocal('solo','X','',0,level,'untimed');
    // Compare both engines from the same varied openings, with each symbol and
    // both figure rules. Deterministic bots alone would repeat the same games.
    for(let n=0;n<(opening===0?0:2+2*(opening%3));n++){
      const free=availableCells(room,room.pairs[0]);room=localCommand(room,'move',free[Math.floor(random()*free.length)],0);
    }
    for(let placements=room.cells.length;placements<placementsLimit;){
      const pair=room.pairs[0],actor=pair.pending?room.players.find(p=>p.id===pair.expander).symbol:pair.turn;
      room.difficulty=actor===proSymbol||opponent==='previous-pro'?'pro':opponent;
      const engine=actor!==proSymbol&&opponent==='previous-pro'?previousPro:machineChoice;
      const choice=engine(room,random,{onAnalysis:a=>{if(actor===proSymbol){moves++;totalThink+=a.elapsedMs;maxThink=Math.max(maxThink,a.elapsedMs);}}});
      room=localCommand(room,choice.action,choice.payload,0);if(choice.action==='move')placements++;
    }
    const own=room.players.find(p=>p.symbol===proSymbol).score,other=room.players.find(p=>p.symbol!==proSymbol).score,margin=own-other;
    console.log(JSON.stringify({opponent,case:sample+1,level,proSymbol,margin}));
    totalMargin+=margin;if(margin>0)wins++;else if(margin<0)losses++;else draws++;
  }
  const result={opponent,games,placementsLimit,openingSeed:seed,wins,draws,losses,averageMargin:Math.round(totalMargin/games*10)/10,averageThinkMs:Math.round(totalThink/moves),maxThinkMs:Math.round(maxThink)};
  results.push(result);console.log(JSON.stringify(result));
}
// X always opens. Against the old Pro, a tied win count can still demonstrate
// an improvement when paired X/O games have a positive combined score margin.
if(results.some(r=>r.opponent==='previous-pro'?r.wins<r.losses||r.averageMargin<=0:r.wins<=r.losses)){
  process.exitCode=1;console.error('Pro debe mejorar el margen pareado frente al anterior y superar los demás niveles.');
}
