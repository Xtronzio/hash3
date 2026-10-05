import {availableCells,connectedTerrain,terrainOf,key} from './game.js';

export const practiceTools=[
  {id:'double',label:'Doble',description:'Coloca dos fichas en este turno, dentro de los mismos 30 segundos.',button:'Activar doble'},
  {id:'opposite',label:'Ficha contraria',description:'Tu siguiente colocación usa el símbolo rival. Si cierra figuras, puntúan para ese símbolo.',button:'Cambiar próxima ficha'},
  {id:'erase',label:'Borrar',description:'Quita una ficha del rival de tu territorio y después juega. No puedes borrar tus propias colocaciones. Los puntos ya ganados se conservan.',button:'Elegir ficha rival'}
];
export function practiceTurn(game,playerId){
  return game.practiceTurn?.player===playerId?game.practiceTurn:{player:playerId,used:[],remaining:1};
}
export function canUsePracticeTool(game,playerId,tool,now=Date.now()){
  const p=game?.pairs?.[0];
  if(!game||!['solo','local'].includes(game.mode)||game.status!=='playing'||!p||p.pending||p[p.turn.toLowerCase()]!==playerId)return false;
  if(game.mode==='solo'&&playerId!==(game.humanId||p.x))return false;
  if(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now))return false;
  if(!practiceTools.some(t=>t.id===tool))return false;
  const state=practiceTurn(game,playerId);
  if(state.used.length>=2||(tool!=='erase'&&state.used.includes(tool)))return false;
  if(tool==='double')return availableCells(game,p).length>=2;
  if(tool==='erase'){
    const linked=new Set(connectedTerrain(terrainOf(game),p.active).map(c=>key(c.x,c.y)));
    return game.cells.some(c=>canErasePracticeCell(game,playerId,c)&&linked.has(key(c.x,c.y)));
  }
  return true;
}
export function canErasePracticeCell(game,playerId,cell){
  const player=game?.players?.find(p=>p.id===playerId);
  return !!(player&&cell&&cell.owner!==playerId&&cell.symbol!==player.symbol);
}
