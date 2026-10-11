import {createLocal as createNewLocal} from '../../src/local.js';
import {practiceTools} from '../../src/practice-tools.js';
// Existing mechanical regressions exercise the eight-card R43 saved-game bag.
// New R44 economy tests import the real new-game factory directly.
export function createLegacyLocal(...args){
 const game=createNewLocal(...args),starter=new Set(['double','opposite','rival','erase','shift','block','shield','hint']);
 for(const p of game.players){const disabled=game.playerInventory===false&&(game.mode==='local'||p.id===(game.humanId||game.pairs[0].x));p.inventory.cards=Object.fromEntries(practiceTools.map(t=>[t.id,!disabled&&starter.has(t.id)?1:0]));p.inventory.received={...p.inventory.cards};}
 return game;
}
