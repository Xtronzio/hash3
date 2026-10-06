import {availableCells,connectedTerrain,terrainOf,key,isBlockedCell} from './game.js';
export const REFILL_TURNS=4,MAX_CARDS=8,MAX_PER_CARD=2;
export const practiceTools=[
  {id:'double',label:'Doble',description:'Coloca dos fichas con el mismo reloj. Cuenta como un turno para la recarga.',button:'Activar doble'},
  {id:'opposite',label:'Ficha contraria',description:'Cambia una ficha rival ya puesta a tu símbolo y propiedad. Después coloca tu ficha.',button:'Elegir ficha rival'},
  {id:'rival',label:'Ficha rival',description:'Obliga al rival a poner una ficha de tu color en su próxima colocación. Esa figura puntúa para tu símbolo.',button:'Activar ficha rival'},
  {id:'erase',label:'Borrar',description:'Borra una ficha rival y después juega. Tus propias fichas no se pueden borrar.',button:'Elegir ficha rival'},
  {id:'shift',label:'Desplazar',description:'Mueve una ficha rival a una celda vacía. Conserva su símbolo y dueño; las figuras nuevas puntúan para ese símbolo.',button:'Mover ficha rival'},
  {id:'block',label:'Bloqueo',description:'Reserva una celda vacía y coloca tu ficha en otra. Puedes ocupar la reserva en tu próxima tirada; si no, bloquea dos turnos rivales.',button:'Elegir celda vacía'},
  {id:'shield',label:'Escudo',description:'Protege una ficha tuya contra borrar, convertir y desplazar durante dos turnos rivales.',button:'Proteger ficha'},
  {id:'hint',label:'Ayuda',description:'Resalta una celda para puntuar o frenar al rival. Tú decides dónde colocar tu ficha.',button:'Sugerir jugada'}
];
const initialCards=()=>Object.fromEntries(practiceTools.map(t=>[t.id,1]));
export function initializeInventory(game){
  if(!game.inventoryVersion){if(game.practiceTurn)delete game.practiceTurn.nextSymbol;game.inventoryVersion=1;}
  for(const player of game.players){
    player.inventory||={cards:initialCards(),turns:0};
    for(const t of practiceTools)player.inventory.cards[t.id]??=0;
  }
  game.inventoryEffects||={blocks:[],shields:[]};
  game.inventoryEffects.blocks||=[];game.inventoryEffects.shields||=[];game.inventoryEffects.forced||=[];
}
export function inventoryFor(game,playerId){return game?.players?.find(p=>p.id===playerId)?.inventory||{cards:initialCards(),turns:0};}
export function practiceTurn(game,playerId){return game.practiceTurn?.player===playerId?game.practiceTurn:{player:playerId,used:[],remaining:1};}
export function isShielded(game,cell){return !!cell&&!!game.inventoryEffects?.shields?.some(e=>e.cell===cell.id&&e.remaining>0);}
export function canErasePracticeCell(game,playerId,cell){return !!(game?.players?.some(p=>p.id===playerId)&&cell&&cell.owner!==playerId&&!isShielded(game,cell));}
export function toolCells(game,playerId,tool){
  const p=game?.pairs?.[0];if(!p)return [];
  const linked=new Set(connectedTerrain(terrainOf(game),p.active).map(c=>key(c.x,c.y)));
  if(tool==='block')return availableCells(game,p).filter(c=>!game.inventoryEffects?.blocks?.some(e=>e.x===c.x&&e.y===c.y&&e.remaining>0));
  if(tool==='shield')return game.cells.filter(c=>linked.has(key(c.x,c.y))&&c.owner===playerId&&!isShielded(game,c));
  return game.cells.filter(c=>linked.has(key(c.x,c.y))&&canErasePracticeCell(game,playerId,c));
}
export function canUsePracticeTool(game,playerId,tool,now=Date.now()){
  const p=game?.pairs?.[0];
  if(!game||!['solo','local'].includes(game.mode)||game.status!=='playing'||!p||p.pending||p[p.turn.toLowerCase()]!==playerId)return false;
  if(game.mode==='solo'&&playerId!==(game.humanId||p.x)&&game.machineInventory!==true)return false;
  if(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now))return false;
  if(!practiceTools.some(t=>t.id===tool)||(inventoryFor(game,playerId).cards[tool]||0)<=0)return false;
  const state=practiceTurn(game,playerId);
  if(state.used.length>=2||state.used.includes(tool))return false;
  if(tool==='double')return availableCells(game,p).length>=2;
  if(tool==='rival')return !game.inventoryEffects?.forced?.some(e=>e.player!==playerId);
  if(tool==='hint')return availableCells(game,p).length>0;
  if(tool==='shift'&&!availableCells(game,p).length)return false;
  if(tool==='block'&&availableCells(game,p).length<2)return false;
  return toolCells(game,playerId,tool).length>0;
}
export function spendCard(game,playerId,tool){
  initializeInventory(game);const player=game.players.find(p=>p.id===playerId);
  player.inventory.cards[tool]--;player.practiceTools=(player.practiceTools||0)+1;
  const state=structuredClone(practiceTurn(game,playerId));state.used.push(tool);game.practiceTurn=state;
}
export function completeInventoryTurn(game,playerId,{automatic=false,placed=true,random=Math.random}={}){
  initializeInventory(game);
  for(const list of [game.inventoryEffects.blocks,game.inventoryEffects.shields])for(const effect of list){if(effect.by!==playerId)effect.remaining--;else if(effect.fresh)effect.fresh=false;}
  game.inventoryEffects.blocks=game.inventoryEffects.blocks.filter(e=>e.remaining>0&&!game.cells.some(c=>c.x===e.x&&c.y===e.y));
  game.inventoryEffects.shields=game.inventoryEffects.shields.filter(e=>e.remaining>0&&game.cells.some(c=>c.id===e.cell));
  if(automatic||!placed)return;
  const inv=game.players.find(p=>p.id===playerId).inventory;inv.turns=Math.min(REFILL_TURNS,inv.turns+1);
  const eligible=practiceTools.filter(t=>inv.cards[t.id]<MAX_PER_CARD);
  if(inv.turns>=REFILL_TURNS&&Object.values(inv.cards).reduce((a,b)=>a+b,0)<MAX_CARDS&&eligible.length){
    const draw=eligible[Math.min(eligible.length-1,Math.floor(Math.max(0,random())*eligible.length))];
    inv.cards[draw.id]++;inv.turns=0;inv.lastDraw=draw.id;inv.draws=(inv.draws||0)+1;
  }
}
export function moveDestination(game,playerId,cell){
  if(!cell)return false;
  const pair=game.pairs[0],linked=connectedTerrain(terrainOf(game),pair.active);
  return linked.some(c=>c.x===cell.x&&c.y===cell.y)&&!game.cells.some(c=>c.x===cell.x&&c.y===cell.y)&&!isBlockedCell(game,playerId,cell.x,cell.y);
}

export function placementSymbol(game,playerId){return game.inventoryEffects?.forced?.find(e=>e.player===playerId)?.symbol||game.players.find(p=>p.id===playerId)?.symbol;}
