import {immunitySeconds} from './immunity.js';

// Read effect records once per snapshot, never terrain or pieces while panning.
export function activeInventoryEffects(game,now=game?.clockNow??Date.now()){
 if(!game||!['solo','local'].includes(game.mode)||!['playing','paused'].includes(game.status))return [];
 const effects=[],players=new Map(game.players.map(p=>[p.id,p]));
 const add=(tool,player,count,remaining,unit)=>{
  if(!players.has(player)||!count)return;
  effects.push({tool,player,symbol:players.get(player).symbol,count,remaining,unit});
 };
 const turn=game.practiceTurn;
 if(turn){
  if(turn.used.includes('combo'))add('combo',turn.player,1,Math.max(0,2-turn.used.filter(id=>!['combo','super-hint','immunity'].includes(id)).length),'herramientas');
  if(turn.used.includes('double')&&turn.remaining>0)add('double',turn.player,1,turn.remaining,'fichas');
 }
 const grouped=(tool,list,unit)=>{
  const groups=new Map();for(const e of list){if(e.remaining!=null&&e.remaining<=0)continue;const by=e.by;if(!groups.has(by))groups.set(by,[]);groups.get(by).push(e);}
  for(const [by,items] of groups)add(tool,by,items.length,Math.min(...items.map(e=>e.remaining??1)),unit);
 };
 grouped('block',game.inventoryEffects?.blocks||[],'turnos rivales');
 grouped('shield',game.inventoryEffects?.shields||[],'turnos rivales');
 grouped('rival',game.inventoryEffects?.forced||[],'colocación rival');
 if(game.practiceHint)add(game.practiceHint.action==='expand'?'hint-expand':'hint',game.practiceHint.player,1,null,'');
 grouped('frontier',(game.frontiers||[]).filter(f=>f.type!=='border'),'');
 grouped('border',(game.frontiers||[]).filter(f=>f.type==='border'),'');
 for(const p of game.players){const seconds=immunitySeconds(game,p.id,now);if(seconds)add('immunity',p.id,1,seconds,'segundos');}
 return effects;
}
