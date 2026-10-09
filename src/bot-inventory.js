import {borderChains} from './area-tools.js';
import {defendedInvasionCells} from './invasion-paths.js';
import {canUsePracticeTool,toolCells,moveDestination,placementSymbol} from './practice-tools.js';
import {availableCells,figureWindows,key,isBlockedCell} from './game.js';

// Card decisions stay in the Worker alongside search. The same referee and
// stock rules validate bot and human actions; no hidden cards or privileges.
export function chooseMachineCard(room,now=Date.now()){
  if(room.mode!=='solo'||room.machineInventory!==true||room.pairs[0].pending)return null;
  const pair=room.pairs[0],actor=pair[pair.turn.toLowerCase()],human=room.humanId||pair.x;
  if(actor===human)return null;
  const player=room.players.find(p=>p.id===actor),level=room.difficulty||'medium';
  const usable=tool=>canUsePracticeTool(room,actor,tool,now);
  const command=(tool,point,extra={})=>({action:'inventory',payload:{tool,playerId:actor,...point,...extra}});
  if(usable('immunity'))return command('immunity',{});
  if(level!=='basic'&&usable('combo')&&usable('double')&&usable('rival'))return command('combo',{});
  const cells=new Map(room.cells.map(c=>[key(c.x,c.y),c]));
  const neighbors=(point,symbol)=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>cells.get(key(point.x+dx,point.y+dy))?.symbol===symbol).length;
  if(usable('opposite')){
    const targets=toolCells(room,actor,'opposite').sort((a,b)=>neighbors(b,player.symbol)-neighbors(a,player.symbol)).slice(0,16);
    let best=null,points=0;
    for(const target of targets){
      const changed=room.cells.map(c=>c.id===target.id?{...c,symbol:player.symbol}:c);
      const gain=figureWindows(changed,target.x,target.y,player.symbol,room.level).filter(f=>!room.forms.includes(f.id)).reduce((sum,f)=>sum+f.size,0);
      if(gain>points){best=target;points=gain;}
    }
    if(best&&points>=(level==='basic'?4:3))return command('opposite',best);
  }
  if(usable('border')){
   for(const event of room.territoryEvents||[])if(event.kind.startsWith('invader-')&&event.paths?.length){
    const already=defendedInvasionCells(room,event);
    for(const cells of borderChains(room,24)){
     const defended=defendedInvasionCells({...room,frontiers:[...(room.frontiers||[]),{type:'border',cells}]},event);
     if(defended.size>already.size)return command('border',{}, {cells});
    }
   }
  }
  if(usable('double'))return command('double',{});
  if(usable('activate')){
    const symbol=placementSymbol(room,actor),targets=toolCells(room,actor,'activate').sort((a,b)=>neighbors(b,symbol)-neighbors(a,symbol)).slice(0,24);
    for(const point of targets){
      const figures=figureWindows([...room.cells,{...point,symbol}],point.x,point.y,symbol,room.level);
      if(figures.some(f=>!room.forms.includes(f.id)))return command('activate',point);
    }
  }
  if(usable('bomb')){
    const target=toolCells(room,actor,'bomb').find(c=>c.symbol!==player.symbol&&neighbors(c,player.symbol)>=1);
    if(target)return command('bomb',target);
  }
  if(level==='high'||level==='pro'){
    if(usable('tornado')){
      const target=toolCells(room,actor,'tornado').find(p=>{const pieces=room.cells.filter(c=>c.x>=p.x&&c.x<p.x+3&&c.y>=p.y&&c.y<p.y+3);return pieces.filter(c=>c.symbol!==player.symbol).length>=4&&pieces.filter(c=>c.symbol===player.symbol).length<=2;});
      if(target)return command('tornado',target);
    }
  }
  if(level==='basic')return null;
  if(usable('rival'))return command('rival',{});
  if(usable('erase')){
    const target=toolCells(room,actor,'erase').find(c=>neighbors(c,c.symbol)>=2&&neighbors(c,player.symbol)>0);
    if(target)return command('erase',target);
  }
  if(usable('shield')){
    const target=toolCells(room,actor,'shield').find(c=>neighbors(c,player.symbol)>=1);
    if(target)return command('shield',target);
  }
  if(usable('destroy')){
    const symbol=player.symbol==='X'?'O':'X';
    const target=toolCells(room,actor,'destroy').find(point=>figureWindows([...room.cells,{...point,symbol}],point.x,point.y,symbol,room.level).some(f=>!room.forms.includes(f.id)));
    if(target)return command('destroy',target);
  }
  if(usable('block')){
    const target=toolCells(room,actor,'block').find(c=>neighbors(c,player.symbol==='X'?'O':'X')>=2);
    if(target)return command('block',target);
  }
  if(usable('shift')){
    const target=toolCells(room,actor,'shift').find(c=>neighbors(c,c.symbol)>=2);
    if(target){const destination=availableCells(room,pair).find(c=>neighbors(c,target.symbol)===0&&moveDestination(room,target.owner,c)&&!isBlockedCell(room,target.owner,c.x,c.y));if(destination)return command('shift',target,{toX:destination.x,toY:destination.y});}
  }
  return null;
}
