import {habitatBlocked,habitatReservations} from './habitat-tools.js';
import {availableCells,playableTerrain,terrainOf,key,isBlockedCell} from './game.js';
import {immunityStock,spendImmunity,initializeImmunity,isImmune,completeImmunityRound} from './immunity.js';
import {tornadoOptions,bombOptions,frontierOptions} from './area-tools.js';
import {expansionFrontierContext,edgeKey} from './frontiers.js';
export const REFILL_TURNS=4,MAX_CARDS=8,MAX_PER_CARD=2;
export const practiceTools=[
  {id:'double',label:'Doble',description:'Coloca dos fichas con el mismo reloj. Cuenta como un turno para la recarga.',button:'Activar doble'},
  {id:'opposite',label:'Ficha contraria',description:'Cambia una ficha rival ya puesta a tu símbolo y propiedad. Después coloca tu ficha.',button:'Elegir ficha rival'},
  {id:'rival',label:'Ficha rival',description:'Obliga al rival a poner una ficha de tu color en su próxima colocación. Esa figura puntúa para tu símbolo.',button:'Activar ficha rival'},
  {id:'erase',label:'Borrar',description:'Borra una ficha rival y después juega. Tus propias fichas no se pueden borrar.',button:'Elegir ficha rival'},
  {id:'shift',label:'Desplazar',description:'Mueve una ficha rival a una celda vacía. Conserva su símbolo y dueño; las figuras nuevas puntúan para ese símbolo.',button:'Mover ficha rival'},
  {id:'block',label:'Bloqueo',description:'Reserva una celda vacía y coloca tu ficha en otra. Puedes ocupar la reserva en tu próxima tirada; si no, bloquea dos turnos rivales.',button:'Elegir celda vacía'},
  {id:'shield',label:'Escudo',description:'Protege una celda concreta con una ficha tuya contra borrar, convertir y desplazar durante dos turnos rivales.',button:'Proteger celda'},
  {id:'hint',group:'help',label:'Ayuda de movimiento',description:'Resalta una celda para puntuar o frenar al rival. Tú decides dónde colocar tu ficha.',button:'Sugerir jugada'},
  {id:'activate',label:'Construir celda',description:'Construye una celda en un hueco que toca tu territorio conectado, sin añadir un 3×3. Después coloca allí tu ficha como jugada normal.',button:'Elegir hueco'},
  {id:'destroy',label:'Destruir celda',description:'Elimina una celda vacía de tu territorio conectado. No elimina fichas ni resta puntos. Después coloca tu ficha. El hueco se recupera con Construir celda o una ampliación.',button:'Elegir celda vacía'},
  {id:'tornado',label:'Tornado',description:'Selecciona una zona 3×3 como al ampliar. Mezcla sus fichas y huecos, conservando símbolos, propietarios y terreno. Respeta Escudo e Inmunidad. Después coloca tu ficha.',button:'Seleccionar zona 3×3'},
  {id:'bomb',label:'Bomba',description:'Elimina tres fichas adyacentes aleatorias, incluidas diagonales, sin usar plantillas de figuras ni quitar terreno. Junto a una frontera también puede alcanzar huecos. Respeta Escudo e Inmunidad; rompe las fronteras alcanzadas. Después coloca tu ficha.',button:'Elegir centro'},
  {id:'frontier',label:'Frontera',description:'Solo quien está ampliando puede usarla, una vez por ampliación. Primero coloca y gira el muro 3×1 en tres huecos sin construir; después coloca la ampliación 3×3. Cada celda lleva un rombo violeta. No consume una herramienta del turno de fichas; solo Bomba rompe el muro.',button:'Colocar muro y después ampliar'},
  {id:'hint-expand',group:'help',label:'Ayuda de ampliación',description:'Durante la ampliación propone una ubicación 3×3 favorable para tus próximas figuras, respetando las fronteras. Tú confirmas o eliges otra.',button:'Sugerir ampliación'},
  {id:'super-hint',group:'help',label:'Súper Ayuda',description:'Analiza tu jugada y las cartas disponibles; propone una secuencia para este turno y la ejecuta tras tu confirmación. Gasta las cartas indicadas y respeta Combo y Doble.',button:'Analizar turno'},
  {id:'combo',label:'Combo',description:'Actívala primero para usar otras dos herramientas distintas este turno, además de colocar tu ficha.',button:'Activar combo'}
];
export const pendingTools=[];
export const immunityTools=[{id:'immunity',label:'Inmunidad',description:'Protege todo tu territorio durante una ronda. Cada 3, 33 y 333 combos de al menos 33 puntos ganas 1, 3 y 33 protecciones; las guardas y activas de una en una.',button:'Activar 1 ronda'}];
export const inventoryTools=[...practiceTools,...immunityTools];
// Keep eight starting cards; the rest enter through the refill draw.
const startingCards=new Set(['double','opposite','rival','erase','shift','block','shield','hint']);
const initialCards=()=>Object.fromEntries(practiceTools.map(t=>[t.id,startingCards.has(t.id)?1:0]));
export function initializeInventory(game){
  if(!game.inventoryVersion&&game.practiceTurn)delete game.practiceTurn.nextSymbol;
  game.inventoryVersion=2;
  for(const player of game.players){
    player.inventory||={cards:initialCards(),turns:0};
    for(const t of practiceTools)player.inventory.cards[t.id]??=0;
  }
  game.inventoryEffects||={blocks:[],shields:[]};
  game.inventoryEffects.blocks||=[];game.inventoryEffects.shields||=[];game.inventoryEffects.forced||=[];
  initializeImmunity(game);
}
export function inventoryFor(game,playerId){return game?.players?.find(p=>p.id===playerId)?.inventory||{cards:initialCards(),turns:0};}
export function toolStock(game,playerId,tool){return tool==='immunity'?immunityStock(game,playerId):inventoryFor(game,playerId).cards[tool]||0;}
export function practiceTurn(game,playerId){return game.practiceTurn?.player===playerId?game.practiceTurn:{player:playerId,used:[],remaining:1};}
export function toolAllowance(game,playerId){
  const state=practiceTurn(game,playerId),combo=state.used.includes('combo');
  const limit=combo?2:1,used=state.used.filter(id=>!['combo','super-hint'].includes(id)).length;
  return {combo,limit,used,remaining:Math.max(0,limit-used)};
}
export function isShielded(game,cell){return !!cell&&!!game.inventoryEffects?.shields?.some(e=>e.cell===cell.id&&e.remaining>0);}
export function canErasePracticeCell(game,playerId,cell){return !!(game?.players?.some(p=>p.id===playerId)&&cell&&cell.owner!==playerId&&!isShielded(game,cell)&&!isImmune(game,cell.owner));}
export function toolCells(game,playerId,tool,{side='north',pivot=false}={}){
  const p=game?.pairs?.[0];if(!p)return [];
  if(tool==='tornado')return tornadoOptions(game);
  if(tool==='bomb')return bombOptions(game);
  if(tool==='frontier')return frontierOptions(game,side,playerId,{pivot});
  const linked=new Set(playableTerrain(game,p).map(c=>key(c.x,c.y)));
  if(tool==='activate'){
    const known=new Set(terrainOf(game).map(c=>key(c.x,c.y))),occupied=new Set(game.cells.map(c=>key(c.x,c.y))),holes=new Map();
    const frontier=expansionFrontierContext(terrainOf(game),p.terrainAnchor||p.active,game);
    for(const c of playableTerrain(game,p))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const point={x:c.x+dx,y:c.y+dy},k=key(point.x,point.y);
      if(!known.has(k)&&!occupied.has(k)&&!habitatBlocked(game,point.x,point.y)&&(!frontier||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const b={x:point.x+dx,y:point.y+dy};return frontier.reached.has(key(b.x,b.y))&&!frontier.blocked.has(edgeKey({a:point,b}));})))holes.set(k,point);
    }
    return [...holes.values()];
  }
  if(tool==='destroy'){
    if(game.players.some(v=>v.id!==playerId&&isImmune(game,v.id)))return [];
    const occupied=new Set(game.cells.map(c=>key(c.x,c.y)));
    return terrainOf(game).filter(c=>linked.has(key(c.x,c.y))&&!occupied.has(key(c.x,c.y))&&!habitatBlocked(game,c.x,c.y)&&!game.rodents?.some(r=>r.x===c.x&&r.y===c.y));
  }
  if(tool==='block')return game.players.some(v=>v.id!==playerId&&isImmune(game,v.id))?[]:availableCells(game,p).filter(c=>!game.inventoryEffects?.blocks?.some(e=>e.x===c.x&&e.y===c.y&&e.remaining>0));
  if(tool==='shield')return game.cells.filter(c=>linked.has(key(c.x,c.y))&&c.owner===playerId&&!isShielded(game,c));
  return game.cells.filter(c=>linked.has(key(c.x,c.y))&&!habitatBlocked(game,c.x,c.y)&&canErasePracticeCell(game,playerId,c)&&(c.symbol!=='#'||tool==='erase'));
}
export function canUsePracticeTool(game,playerId,tool,now=Date.now()){
  const p=game?.pairs?.[0];
  if(!game||!['solo','local'].includes(game.mode)||game.status!=='playing'||!p)return false;
  if(game.mode==='solo'&&playerId!==(game.humanId||p.x)&&game.machineInventory!==true)return false;
  if(p.pending){
    if(p.expander!==playerId||toolStock(game,playerId,tool)<=0||(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now)))return false;
    if(tool==='frontier')return !p.frontierUsed&&!availableCells(game,p,{ignoreBlocks:true}).length&&['north','east','south','west'].some(side=>frontierOptions(game,side,playerId).length);
    return tool==='hint-expand'&&game.practiceHint?.action!=='expand';
  }
  if(['hint-expand','frontier'].includes(tool)||p[p.turn.toLowerCase()]!==playerId)return false;
  if(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now))return false;
  if(!inventoryTools.some(t=>t.id===tool)||toolStock(game,playerId,tool)<=0)return false;
  const state=practiceTurn(game,playerId);
  if(state.used.includes(tool))return false;
  if(tool==='super-hint')return availableCells(game,p).length>0;
  if(tool==='combo'){
    const ordinary=practiceTools.filter(t=>!['combo','super-hint','hint-expand','frontier'].includes(t.id)&&toolStock(game,playerId,t.id)>0).length;
    const immunity=!isImmune(game,playerId)&&immunityTools.some(t=>toolStock(game,playerId,t.id)>0)?1:0;
    return state.used.every(id=>id==='super-hint')&&availableCells(game,p).length>0&&ordinary+immunity>=2;
  }
  if(!toolAllowance(game,playerId).remaining)return false;
  if(tool==='immunity')return !isImmune(game,playerId)&&availableCells(game,p,{ignoreBlocks:true}).length>0;
  if(tool==='double')return availableCells(game,p).length>=2;
  if(tool==='rival')return !game.players.some(v=>v.id!==playerId&&isImmune(game,v.id))&&!game.inventoryEffects?.forced?.some(e=>e.player!==playerId);
  if(tool==='hint')return availableCells(game,p).length>0;
  if(tool==='shift'&&!availableCells(game,p).length)return false;
  if(tool==='block'&&availableCells(game,p).length<2)return false;
  return toolCells(game,playerId,tool).length>0;
}
export function spendCard(game,playerId,tool){
  initializeInventory(game);const player=game.players.find(p=>p.id===playerId);
  if(tool==='immunity')spendImmunity(game,playerId);else player.inventory.cards[tool]--;
  player.practiceTools=(player.practiceTools||0)+1;
  if(tool==='frontier'){game.pairs[0].frontierUsed=true;return;}
  const state=structuredClone(practiceTurn(game,playerId));state.used.push(tool);game.practiceTurn=state;
}
export function completeInventoryTurn(game,playerId,{automatic=false,placed=true,random=Math.random}={}){
  initializeInventory(game);
  completeImmunityRound(game,playerId);
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
  const pair=game.pairs[0],linked=playableTerrain(game,pair);
  return linked.some(c=>c.x===cell.x&&c.y===cell.y)&&!game.cells.some(c=>c.x===cell.x&&c.y===cell.y)&&!isBlockedCell(game,playerId,cell.x,cell.y);
}

export function placementSymbol(game,playerId){return game.inventoryEffects?.forced?.find(e=>e.player===playerId)?.symbol||game.players.find(p=>p.id===playerId)?.symbol;}
