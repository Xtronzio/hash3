import {isInverse,inverseToolAllowed} from './inverse-rules.js';
import {isPrisoner,imprisonedCell} from './inverse-prison.js';
import {fogKeys} from './fog.js';
import {relocationSources} from './relocate-cell.js';
import {snapshotMemo} from './snapshot-memo.js';
import {initializeWildcardUsage} from './wildcard-usage.js';
import {nuclearOptions} from './nuclear-tool.js';
import {microLength,microSelectionOptions} from './micro-expansion.js';
import {inventoryEnabled} from './inventory-enabled.js';
import {pendingInvasionBombs,activeInvasionBombs} from './pending-bombs.js';
import {canRequestStrategicExpansion} from './free-expansion.js';
import {migrateLegacyWalls} from './wall-migration.js';
import {boardCellLimit} from './board-limits.js';
import {habitatBlocked,habitatReservations} from './habitat-tools.js';
import {availableCells,playableTerrain,terrainOf,key,isBlockedCell} from './game.js';
import {immunityStock,spendImmunity,initializeImmunity,isImmune,protectedTerritoryKeys,completeImmunityRound} from './immunity.js';
import {tornadoOptions,bombOptions,frontierOptions,borderOptions,borderChains} from './area-tools.js';
import {expansionFrontierContext,edgeKey,frontierDirections} from './frontiers.js';
export const REFILL_TURNS=1,MAX_PER_CARD=3; // Legacy export; turns never grant cards.
export const practiceTools=[
  {id:'double',label:'Doble',description:'Coloca dos fichas con el mismo reloj. Cuenta como un turno propio completo para la recarga.',button:'Activar doble'},
  {id:'opposite',label:'Ficha contraria',description:'Cambia una ficha rival ya puesta a tu símbolo y propiedad. Después coloca tu ficha.',button:'Elegir ficha rival'},
  {id:'rival',label:'Ficha rival',description:'Obliga al rival a poner una ficha de tu color en su próxima colocación. Esa figura puntúa para tu símbolo.',button:'Activar ficha rival'},
  {id:'erase',label:'Borrar',description:'Borra una ficha rival y después juega. Tus propias fichas no se pueden borrar.',button:'Elegir ficha rival'},
  {id:'swap',label:'Permutar fichas',description:'Intercambia las posiciones de dos fichas del tablero. Conserva símbolos y propietarios; puntúa las figuras nuevas de X y O al aterrizar. Respeta Escudo, Inmunidad y habitantes. Después coloca tu ficha.',button:'Elegir dos fichas'},
  {id:'shift',label:'Desplazar',description:'Mueve una ficha rival a una celda vacía o una bomba de bombardeo pendiente a otra casilla válida sin reiniciar el preaviso. Conserva su símbolo y dueño; las figuras nuevas puntúan para ese símbolo.',button:'Mover ficha rival'},
  {id:'block',label:'Bloqueo',description:'Reserva una celda vacía y coloca tu ficha en otra. Puedes ocupar la reserva en tu próxima tirada; si no, bloquea dos turnos rivales.',button:'Elegir celda vacía'},
  {id:'shield',label:'Escudo',description:'Inmunidad de una celda durante tres turnos completos. Protege tu ficha y su celda de fauna, conversiones, bombas y desplazamientos. Se compra por 33 puntos.',button:'Proteger celda'},
  {id:'hint',group:'help',label:'Ayuda de movimiento',description:'Resalta una celda para puntuar o frenar al rival. Tú decides dónde colocar tu ficha.',button:'Sugerir jugada'},
  {id:'activate',label:'Ampliación +1 (1×1)',description:'Construye una celda en un hueco que toca tu territorio conectado, sin añadir un 3×3. Después coloca allí tu ficha como jugada normal.',button:'Elegir hueco'},
  {id:'expand-2',label:'Ampliación +2',description:'Toca dos casillas sin construir contiguas por un lado, empezando junto al territorio. La segunda pulsación coloca las dos. Cancelar no gasta la carta.',button:'Elegir dos casillas'},
  {id:'expand-3',label:'Ampliación +3',description:'Toca tres casillas sin construir contiguas por un lado, empezando junto al territorio. Pueden formar una L. La tercera pulsación coloca las tres. Cancelar no gasta la carta.',button:'Elegir tres casillas'},
  {id:'destroy',label:'Destruir celda',description:'Elimina una celda vacía de tu territorio conectado. No elimina fichas ni resta puntos. Después coloca tu ficha. El hueco se recupera con Construir celda o una ampliación.',button:'Elegir celda vacía'},
  {id:'tornado',label:'Tornado',description:'Selecciona una zona 3×3 como al ampliar. Mezcla sus fichas y huecos; las figuras nuevas al aterrizar puntúan para X y O. Conserva símbolos, propietarios y terreno. Respeta Escudo e Inmunidad. Después coloca tu ficha.',button:'Seleccionar zona 3×3'},
  {id:'bomb',label:'Bomba',description:'Elimina tres fichas adyacentes aleatorias, incluidas diagonales, sin usar plantillas de figuras ni quitar terreno. Junto a un muro también puede alcanzar huecos. Respeta Escudo e Inmunidad; rompe los muros alcanzados. Después coloca tu ficha.',button:'Elegir centro'},
  {id:'nuclear',label:'Bomba atómica',description:'Demuele hasta 33 celdas contiguas alrededor del centro elegido y elimina sus fichas X, O, invasores y comodines. Vista previa exacta antes de confirmar. Conserva puntos cobrados; respeta Inmunidad, Escudo, habitantes y anclajes. Rompe barreras alcanzadas sin protección. Cuesta 333 puntos por unidad. Después coloca tu ficha o amplía si no quedan huecos.',button:'Elegir zona de demolición'},
  {id:'frontier',label:'Muro',description:'Coloca una casilla de muro en un hueco sin construir junto al territorio, durante tu turno de colocación. Cuenta como herramienta y después colocas tu ficha. La diagonal morada / bloquea construir o ampliar sobre esa casilla; Bomba lo rompe.',button:'Elegir casilla de muro'},
  {id:'border',label:'Frontera',description:'Bloquea indefinidamente una celda libre con punto del tablero construido para ambos jugadores. Deja otra colocación disponible. Solo quien la coloca puede retirarla: púlsala y confirma, sin coste ni consumo de turno o herramienta. Bombas y fenómenos no la eliminan. Colocarla gasta una carta y una herramienta; después coloca tu ficha.',button:'Elegir celda libre'},
  {id:'hint-expand',group:'help',label:'Ampliación inteligente',description:'Propone un 3×3 favorable al quedarte sin movimientos. Desde 333 figuras cobradas en la partida también permite ampliar por estrategia aunque queden huecos. Tú confirmas o eliges otra; la ampliación voluntaria gasta la carta al colocarla.',button:'Sugerir ampliación'},
  {id:'super-hint',group:'help',label:'Súper Ayuda',description:'Analiza tu jugada y las cartas disponibles; propone una secuencia para este turno y la ejecuta tras tu confirmación. Gasta las cartas indicadas y respeta Combo y Doble.',button:'Analizar turno'},
  {id:'ambush',label:'Emboscada',description:'Expulsa hasta tres invasores cercanos a la celda elegida. Conserva terreno y puntos; no afecta X, O ni comodines. Después coloca tu ficha.',button:'Elegir invasor'},
  {id:'reconquest',label:'Reconquista',description:'Expulsa hasta 33 invasores cercanos a la celda elegida, sin perder terreno ni puntos. No afecta X, O ni comodines. Después coloca tu ficha.',button:'Elegir invasor'},
  {id:'antidote',label:'Antídoto',description:'Protege una celda amenazada por un aviso concreto de Contagio o Pandemia antes del impacto. No cancela las demás conversiones ni cambia su plazo. Cuesta 33 puntos por unidad en el trueque. Después coloca tu ficha.',button:'Elegir celda amenazada'},
  {id:'sapper',label:'Artificieros',description:'Desactiva hasta tres bombas: la seleccionada y las dos más cercanas del mismo aviso o foco activo de Bombardeo. Conserva terreno y puntos; las restantes mantienen su plazo y crecimiento. Las ocupaciones estables se recuperan con Emboscada o Reconquista. Cuesta 33 puntos por unidad. Después coloca tu ficha.',button:'Elegir bomba'},
  {id:'relocate',label:'Trasladar celda',description:'Mueve una celda vacía con punto a una posición sin terreno adyacente. Conserva el número de celdas y permite colocar después. Respeta anclajes, protecciones y continuidad.',button:'Elegir celda vacía'},
  {id:'combo',label:'Combo',description:'Actívala primero para usar otras dos herramientas distintas este turno, además de colocar tu ficha.',button:'Activar combo'}
];
// Variety has no separate cap: a normal 18-card hand can hold 18 distinct types.
export const MAX_CARDS=18,MAX_CARD_TYPES=MAX_CARDS;
export const inventoryCapacity=game=>!game||game.inventoryBalanceVersion===1?9:MAX_CARDS;
export function refillProgress(game,playerId){
 const c=inventoryFor(game,playerId).refillCycle;if(!c)return '';
 return `${practiceTools.find(t=>t.id===c.card)?.label||'Recarga'} · ${Math.max(3-c.elapsed,c.base-c.elapsed-c.bonus,0)} turnos propios${c.pending?' · pendiente de hueco':''}`;
}
export const pendingTools=[];
export const immunityTools=[{id:'immunity',label:'Inmunidad total',description:'Protege tus fichas, sus celdas, tus celdas vacías construidas y tus barreras durante tres turnos completos. Se gana con combos de 33, 66 y 99 puntos; desde la tercera exige 99. Máximo tres. No se puede comprar ni cambiar. Actívala en cualquier momento, sin consumir turno ni herramienta. Pausar conserva la duración y las reservas antiguas.',button:'Activar tres turnos'}];
export const inventoryTools=[...practiceTools,...immunityTools];
// Historical eight-card starter only for legacy saves with no inventory record.
const startingCards=new Set(['double','opposite','rival','erase','shift','block','shield','hint']);
export const RECOMMENDED_CARDS=Object.freeze(['double','opposite','hint']);
export function validateStartingCards(cards){
 if(!Array.isArray(cards)||cards.length!==3||new Set(cards).size!==3||cards.some(id=>!practiceTools.some(t=>t.id===id)))throw new Error('Elige tres cartas distintas del catálogo.');
 return [...cards];
}
const initialCards=()=>Object.fromEntries(practiceTools.map(t=>[t.id,startingCards.has(t.id)?1:0])); // Missing legacy inventories retain the original starter.
export function seedStartingInventory(game,selections={},random=Math.random){
 for(const player of game.players){
  const cards=validateStartingCards(selections[player.id]||RECOMMENDED_CARDS);
  player.inventory={cards:Object.fromEntries(practiceTools.map(t=>[t.id,inventoryEnabled(game,player.id)&&cards.includes(t.id)?1:0])),turns:0,received:Object.fromEntries(practiceTools.map(t=>[t.id,inventoryEnabled(game,player.id)&&cards.includes(t.id)?1:0]))};
 }
 initializeInventory(game,random);
}
export function initializeInventory(game,random=Math.random){
  if(!game.inventoryVersion&&game.practiceTurn)delete game.practiceTurn.nextSymbol;
  game.inventoryVersion=2;initializeWildcardUsage(game);
  if(['solo','local'].includes(game.mode)&&game.status!=='finished'&&game.inventoryEconomyVersion!==1){
   // Keep all stocks/reserves. Old paid-turn counters buy no historical draws.
   for(const p of game.players)if(p.inventory){p.inventory.turns=0;p.inventory.comboPending=0;}
   game.inventoryEconomyVersion=1;
  }
  for(const player of game.players){
    const ownDisabled=game.playerInventory===false&&(game.mode==='local'||player.id===(game.humanId||game.pairs?.[0]?.x));
    player.inventory||={cards:ownDisabled?Object.fromEntries(practiceTools.map(t=>[t.id,0])):initialCards(),turns:0};
    player.inventory.received||={};
    for(const t of practiceTools){
      player.inventory.cards[t.id]??=0;
      // Seed known initial/held cards once; no retroactive draws on old saves.
      player.inventory.received[t.id]??=Math.max(startingCards.has(t.id)?1:0,player.inventory.cards[t.id]);
    }
  }
  if(game.inventoryCadenceVersion!==1){for(const p of game.players)p.inventory.turns=Math.min(REFILL_TURNS,p.inventory.turns||0);game.inventoryCadenceVersion=1;}
  migrateLegacyWalls(game);
  game.inventoryEffects||={blocks:[],shields:[]};
  game.inventoryEffects.blocks||=[];game.inventoryEffects.shields||=[];game.inventoryEffects.forced||=[];
  initializeImmunity(game);
  if(game.inventoryBalanceVersion===1)for(const p of game.players){
   p.inventory.comboPending=0;
   if(inventoryEnabled(game,p.id)&&!p.inventory.refillCycle)startRefill(game,p.id,random);
   if(p.inventory.legacyPending&&p.inventory.refillCycle){p.inventory.refillCycle.elapsed=p.inventory.refillCycle.base;p.inventory.refillCycle.pending=true;p.inventory.legacyPending=0;}
  }
}
function startRefill(game,playerId,random=Math.random){
 const inv=inventoryFor(game,playerId),pool=practiceTools.filter(t=>inverseToolAllowed(game,t.id)&&t.id!=='shield').flatMap(t=>Array(inventoryDrawWeight(t.id)).fill(t));
 const card=pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999,random()))*pool.length))]?.id;
 inv.refillCycle={card,base:['hint','destroy','activate','frontier'].includes(card)?6:9,elapsed:0,bonus:0,comboTurn:-1,pending:false};
}
function deliverRefill(game,playerId,random=Math.random){
 const inv=inventoryFor(game,playerId),c=inv.refillCycle;if(!c||c.elapsed<3||c.elapsed+c.bonus<c.base)return false;
 c.pending=true;if(Object.values(inv.cards).reduce((a,b)=>a+b,0)>=inventoryCapacity(game)||(inv.cards[c.card]||0)>=MAX_PER_CARD)return false;
 inv.cards[c.card]=(inv.cards[c.card]||0)+1;inv.received[c.card]=(inv.received[c.card]||0)+1;inv.draws=(inv.draws||0)+1;inv.lastDraw=c.card;startRefill(game,playerId,random);return true;
}
export function inventoryFor(game,playerId){return game?.players?.find(p=>p.id===playerId)?.inventory||{cards:initialCards(),turns:0};}
export function toolStock(game,playerId,tool){return tool==='immunity'?immunityStock(game,playerId):inventoryFor(game,playerId).cards[tool]||0;}
export function practiceTurn(game,playerId){return game.practiceTurn?.player===playerId?game.practiceTurn:{player:playerId,used:[],remaining:1};}
export function toolAllowance(game,playerId){
  const state=practiceTurn(game,playerId),combo=state.used.includes('combo');
  const limit=combo?2:1,used=state.used.filter(id=>!['combo','super-hint','immunity'].includes(id)).length;
  return {combo,limit,used,remaining:Math.max(0,limit-used)};
}
export function isShielded(game,cell){return !!cell&&!!game.inventoryEffects?.shields?.some(e=>e.cell===cell.id&&e.remaining>0);}
export function canErasePracticeCell(game,playerId,cell){return !!(game?.players?.some(p=>p.id===playerId)&&cell&&cell.owner!==playerId&&!isShielded(game,cell)&&!isImmune(game,cell.owner));}
export function toolCells(game,playerId,tool,options={}){
 if(tool==='relocate')return isInverse(game)?[]:options.source?relocationDestinations(game,playerId,options.source):relocationSources(game);
 if(isPrisoner(game,playerId))return [];
 const hidden=fogKeys(game);return rawToolCells(game,playerId,tool,options).filter(c=>!imprisonedCell(game,c)&&(!hidden.has(key(c.x,c.y))||['bomb','tornado','nuclear','destroy','activate','block','border','frontier','expand-2','expand-3','antidote','sapper'].includes(tool)));
}
function rawToolCells(game,playerId,tool,{side='north',pivot=false,selected=[]}={}){
  const p=game?.pairs?.[0];if(!p||!inverseToolAllowed(game,tool))return [];
  if(isInverse(game)&&['erase','shift'].includes(tool))return game.cells.filter(c=>['X','O'].includes(c.symbol));
  if(['expand-2','expand-3'].includes(tool))return microSelectionOptions(game,microLength(tool),selected);
  if(['ambush','reconquest'].includes(tool))return game.cells.filter(c=>c.symbol==='*'&&!habitatBlocked(game,c.x,c.y));
  if(tool==='sapper')return [...pendingInvasionBombs(game),...activeInvasionBombs(game)];
  if(tool==='antidote'){const seen=new Map(),occupied=new Set(game.cells.filter(c=>['X','O','*','#'].includes(c.symbol)).map(c=>key(c.x,c.y)));for(const event of game.territoryEvents||[])if(['contagion','pandemic'].includes(event.kind)&&(event.turnsRemaining>0||event.nextAt>game.clockNow))for(const c of event.region||[])if(!(event.antidotes||[]).some(p=>p.x===c.x&&p.y===c.y)&&occupied.has(key(c.x,c.y)))seen.set(key(c.x,c.y),{x:c.x,y:c.y});return [...seen.values()];}
  if(tool==='tornado')return tornadoOptions(game);
  if(tool==='bomb')return bombOptions(game);
  if(tool==='nuclear')return nuclearOptions(game);
  if(tool==='border')return borderOptions(game,selected);
  if(tool==='frontier')return frontierOptions(game,side,playerId,{pivot});
  const linked=new Set(playableTerrain(game,p).map(c=>key(c.x,c.y)));
  if(tool==='swap'){const protectedKeys=protectedTerritoryKeys(game);return game.cells.filter(c=>linked.has(key(c.x,c.y))&&!protectedKeys.has(key(c.x,c.y))&&!habitatBlocked(game,c.x,c.y)&&!isShielded(game,c)&&!isImmune(game,c.owner));}
  if(tool==='activate'){
    if(terrainOf(game).length>=boardCellLimit(game))return [];
    const known=new Set(terrainOf(game).map(c=>key(c.x,c.y))),occupied=new Set(game.cells.map(c=>key(c.x,c.y))),holes=new Map();
    const frontier=expansionFrontierContext(terrainOf(game),p.terrainAnchor||p.active,game);
    for(const c of playableTerrain(game,p))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const point={x:c.x+dx,y:c.y+dy},k=key(point.x,point.y);
      if(!known.has(k)&&!occupied.has(k)&&!habitatBlocked(game,point.x,point.y)&&(!frontier||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const b={x:point.x+dx,y:point.y+dy};return frontier.reached.has(key(b.x,b.y))&&!frontier.blocked.has(edgeKey({a:point,b}));})))holes.set(k,point);
    }
    return [...holes.values()];
  }
  if(tool==='destroy'){
    const protectedKeys=protectedTerritoryKeys(game),occupied=new Set(game.cells.map(c=>key(c.x,c.y)));
    return terrainOf(game).filter(c=>linked.has(key(c.x,c.y))&&!protectedKeys.has(key(c.x,c.y))&&!occupied.has(key(c.x,c.y))&&!habitatBlocked(game,c.x,c.y)&&!game.rodents?.some(r=>r.x===c.x&&r.y===c.y));
  }
  if(tool==='block'){const protectedKeys=protectedTerritoryKeys(game);return availableCells(game,p).filter(c=>!protectedKeys.has(key(c.x,c.y))&&!game.inventoryEffects?.blocks?.some(e=>e.x===c.x&&e.y===c.y&&e.remaining>0));}
  if(tool==='shield')return game.cells.filter(c=>linked.has(key(c.x,c.y))&&c.owner===playerId&&!isShielded(game,c));
  return [...game.cells.filter(c=>linked.has(key(c.x,c.y))&&!habitatBlocked(game,c.x,c.y)&&canErasePracticeCell(game,playerId,c)&&(c.symbol!=='#'||tool==='erase')), ...(tool==='shift'?pendingInvasionBombs(game).map(b=>({...b,bombId:b.id,symbol:'bomb',owner:null})):[])];
}
export function canUsePracticeTool(game,playerId,tool,now=Date.now()){
  if(isPrisoner(game,playerId)||tool==='rival'&&game.players?.some(p=>p.id!==playerId&&isPrisoner(game,p.id)))return false;
  const p=game?.pairs?.[0];
  if(!inverseToolAllowed(game,tool))return false;
  if(!game||!['solo','local'].includes(game.mode)||game.status!=='playing'||!p)return false;
  if(!inventoryEnabled(game,playerId))return false;
  if(tool==='immunity')return toolStock(game,playerId,tool)>0&&!isImmune(game,playerId,now)&&game.players.some(v=>v.id===playerId);
  if(p.pending){
    if(p.expander!==playerId||toolStock(game,playerId,tool)<=0||(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now)))return false;
    if(tool==='nuclear')return toolAllowance(game,playerId).remaining>0&&!practiceTurn(game,playerId).used.includes(tool)&&toolCells(game,playerId,tool).length>0;
    if(['border','frontier'].includes(tool))return false;
    if(microLength(tool))return toolAllowance(game,playerId).remaining>0&&!practiceTurn(game,playerId).used.includes(tool)&&toolCells(game,playerId,tool).length>0;
    return tool==='hint-expand'&&game.practiceHint?.action!=='expand';
  }
  if(tool==='hint-expand')return canRequestStrategicExpansion(game,playerId)&&(game.timeMode==='untimed'||Date.parse(p.deadline)>now);
  if(p[p.turn.toLowerCase()]!==playerId)return false;
  if(game.timeMode!=='untimed'&&!(Date.parse(p.deadline)>now))return false;
  if(!inventoryTools.some(t=>t.id===tool)||toolStock(game,playerId,tool)<=0)return false;
  const state=practiceTurn(game,playerId);
  if(state.used.includes(tool))return false;
  if(tool==='super-hint')return availableCells(game,p).length>0;
  if(tool==='combo'){
    const ordinary=practiceTools.filter(t=>!['combo','super-hint','hint-expand'].includes(t.id)&&toolStock(game,playerId,t.id)>0).length;
    return state.used.every(id=>id==='super-hint')&&availableCells(game,p).length>0&&ordinary>=2;
  }
  if(!toolAllowance(game,playerId).remaining)return false;
  if(tool==='double')return availableCells(game,p).length>=2;
  if(tool==='rival')return !game.players.some(v=>v.id!==playerId&&isImmune(game,v.id))&&!game.inventoryEffects?.forced?.some(e=>e.player!==playerId);
  if(tool==='hint')return availableCells(game,p).length>0;
  if(tool==='shift'&&!availableCells(game,p).length&&!pendingInvasionBombs(game).length)return false;
  if(tool==='block'&&availableCells(game,p).length<2)return false;
  if(tool==='swap')return toolCells(game,playerId,tool).length>=2;
  if(tool==='border')return borderChains(game,1).length>0;
  return toolCells(game,playerId,tool).length>0;
}
export function spendCard(game,playerId,tool){
  initializeInventory(game);const player=game.players.find(p=>p.id===playerId);
  if(tool==='immunity')spendImmunity(game,playerId);else player.inventory.cards[tool]--;
  player.practiceTools=(player.practiceTools||0)+1;
  if(tool==='immunity')return;
  const inv=player.inventory,turn=inv.completedTurns||0;
  if(inv.turnUse?.turn!==turn)inv.turnUse={turn,tools:[]};
  inv.turnUse.tools.push(tool);
  drawComboCard(game,playerId);
  const state=structuredClone(practiceTurn(game,playerId));state.used.push(tool);game.practiceTurn=state;
}
export function completeInventoryTurn(game,playerId,{automatic=false,placed=true,random=Math.random}={}){
  initializeInventory(game);
  completeImmunityRound(game,playerId);
  const usage=game.players.find(p=>p.id===playerId).inventory;
  if(usage.turnUse?.turn!==(usage.completedTurns||0))usage.turnUse={turn:usage.completedTurns||0,tools:[]};
  usage.completedTurns=(usage.completedTurns||0)+1;
  if(game.inventoryBalanceVersion===1&&inventoryEnabled(game,playerId)){usage.refillCycle.elapsed=Math.min(usage.refillCycle.base,usage.refillCycle.elapsed+1);deliverRefill(game,playerId,random);}
  for(const list of [game.inventoryEffects.blocks,game.inventoryEffects.shields])for(const effect of list){if(effect.turnsRemaining!=null)continue;else if(effect.by!==playerId)effect.remaining--;else if(effect.fresh)effect.fresh=false;}
  game.inventoryEffects.blocks=game.inventoryEffects.blocks.filter(e=>e.remaining>0&&!game.cells.some(c=>c.x===e.x&&c.y===e.y));
  game.inventoryEffects.shields=game.inventoryEffects.shields.filter(e=>e.remaining>0&&game.cells.some(c=>c.id===e.cell));
  // Completed turns only age effects and record usage. No time/turn refill.
}
export function drawComboCard(game,playerId,random=Math.random){
  if(game.inventoryBalanceVersion===1)return deliverRefill(game,playerId,random);
  if(!inventoryEnabled(game,playerId))return false;
  const inv=game.players.find(p=>p.id===playerId)?.inventory;if(!inv?.comboPending)return false;
  const heldTypes=practiceTools.filter(t=>inv.cards[t.id]>0).length;
  const eligible=practiceTools.filter(t=>inverseToolAllowed(game,t.id)&&!((game.ruleVersion||0)>=22&&t.id==='shield')&&inv.cards[t.id]<MAX_PER_CARD&&(heldTypes<MAX_CARD_TYPES||inv.cards[t.id]>0));
  if(Object.values(inv.cards).reduce((a,b)=>a+b,0)>=MAX_CARDS||heldTypes>MAX_CARD_TYPES||!eligible.length)return false;
  const tickets=eligible.flatMap(t=>Array(inventoryDrawWeight(t.id)).fill(t));
  const draw=tickets[Math.min(tickets.length-1,Math.floor(Math.max(0,random())*tickets.length))];
  inv.cards[draw.id]++;inv.received[draw.id]++;inv.comboPending=0;inv.lastDraw=draw.id;inv.draws=(inv.draws||0)+1;return true;
}
export function recordInventoryCombo(game,playerId,points,{automatic=false,scorer=playerId,random=Math.random}={}){
 initializeInventory(game);
 if(points<33||!Number.isFinite(points)||automatic||scorer!==playerId||!inventoryEnabled(game,playerId))return false;
 const inv=game.players.find(p=>p.id===playerId).inventory;
 if(game.inventoryBalanceVersion===1){const c=inv.refillCycle,turn=inv.completedTurns||0;if(c.comboTurn!==turn){c.bonus=Math.min(c.base-3,c.bonus+1);c.comboTurn=turn;inv.qualifyingCombos=(inv.qualifyingCombos||0)+1;}return false;}
 inv.qualifyingCombos=(inv.qualifyingCombos||0)+1;inv.comboPending=1;
 return drawComboCard(game,playerId,random);
}
export const TACTICAL_CARDS=Object.freeze(['double','opposite','rival','erase','shift','swap','combo']);
export const inventoryDrawWeight=tool=>TACTICAL_CARDS.includes(tool)?3:1;
export function moveDestination(game,playerId,cell){
  if(!cell)return false;
  const pair=game.pairs[0],linked=playableTerrain(game,pair);
  return linked.some(c=>c.x===cell.x&&c.y===cell.y)&&!game.cells.some(c=>c.x===cell.x&&c.y===cell.y)&&!isBlockedCell(game,playerId,cell.x,cell.y);
}
export function relocationDestinations(game,playerId,source){
 const memo=snapshotMemo(game,'relocation-destination',()=>({key:null,value:[]})),id=[game.version,playerId,source.x,source.y].join(':');if(memo.key===id)return memo.value;
 if(!relocationSources(game).some(c=>c.x===source.x&&c.y===source.y))return [];
 const probe={...game,terrain:terrainOf(game).filter(c=>c.x!==source.x||c.y!==source.y)};
 memo.key=id;memo.value=rawToolCells(probe,playerId,'activate',{}).filter(c=>c.x!==source.x||c.y!==source.y);return memo.value;
}

export function placementSymbol(game,playerId){return game.inventoryEffects?.forced?.find(e=>e.player===playerId&&!isPrisoner(game,e.symbol))?.symbol||game.players.find(p=>p.id===playerId)?.symbol;}
