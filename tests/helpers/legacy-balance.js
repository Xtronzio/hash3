import {createLocal} from '../../src/local.js';
// Historical R100 economy regression fixtures. New-balance acceptance tests
// import createLocal directly and exercise the production default/adoption.
export function createLegacyLocal(...args){const game=createLocal(...args);game.inventoryBalanceVersion=0;for(const p of game.players)delete p.inventory.refillCycle;return game;}
