import {createLocal,localCommand,machineChoice} from '../src/local.js';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const results=[];
for(const opponent of ['basic','medium','high']){
  let wins=0,draws=0,losses=0,totalMargin=0,moves=0,totalThink=0,maxThink=0;
  for(let sample=0;sample<12;sample++){
    const random=rng(100+sample),level=sample%2?'advanced':'normal',proSymbol=sample%4<2?'X':'O';
    let room=createLocal('solo','X','',0,level,'untimed');
    for(let placements=0;placements<30;){
      const pair=room.pairs[0],actor=pair.pending?room.players.find(p=>p.id===pair.expander).symbol:pair.turn;
      room.difficulty=actor===proSymbol?'pro':opponent;
      const choice=machineChoice(room,random,{onAnalysis:a=>{if(actor===proSymbol){moves++;totalThink+=a.elapsedMs;maxThink=Math.max(maxThink,a.elapsedMs);}}});
      room=localCommand(room,choice.action,choice.payload,0);if(choice.action==='move')placements++;
    }
    const own=room.players.find(p=>p.symbol===proSymbol).score,other=room.players.find(p=>p.symbol!==proSymbol).score,margin=own-other;
    totalMargin+=margin;if(margin>0)wins++;else if(margin<0)losses++;else draws++;
  }
  const result={opponent,games:12,wins,draws,losses,averageMargin:Math.round(totalMargin/12*10)/10,averageThinkMs:Math.round(totalThink/moves),maxThinkMs:Math.round(maxThink)};
  results.push(result);console.log(JSON.stringify(result));
}
if(results.some(r=>r.wins<=r.losses)){process.exitCode=1;console.error('Pro debe ganar más partidas de las que pierde contra cada nivel.');}
