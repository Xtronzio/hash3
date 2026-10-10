import test from 'node:test';import assert from 'node:assert/strict';
import {ecologyChoicesMarkup,territoryWarningMarkup} from '../src/ecology-ui.js';
test('Complexity has four independent accessible icon checkboxes, own inventory enabled by default',()=>{
 const html=ecologyChoicesMarkup({machine:true,machineInventory:false,faunaEnabled:true,territoryEnabled:false},'<svg></svg>');
 assert.equal((html.match(/type="checkbox"/g)||[]).length,4);assert.match(html,/id="player-inventory"[^>]*checked/);assert.match(html,/aria-label="Tu inventario"/);assert.match(html,/aria-label="Inventario rival"/);assert.match(html,/id="fauna-enabled"[^>]*checked/);assert.doesNotMatch(html,/id="territory-enabled"[^>]*checked/);assert.doesNotMatch(html,/<strong>|<small>/);
 for(const kind of ['rodent','worm','build','destroy','invader-colony','meteorites','hurricane','ufo'])assert.ok(html.includes(`data-ecology-kind="${kind}"`));
 assert.match(html,/Invasores y fenómenos naturales y estelares/);
});
test('Phenomenon warnings show the actual icon and countdown, with quantity accessible and region navigation',()=>{
 const html=territoryWarningMarkup({territoryEvents:[{id:'a',kind:'ufo',region:Array(33).fill({x:0,y:0}),nextAt:34000}]},11000);
 assert.match(html,/data-action="locate-territory"/);assert.match(html,/<ellipse/);assert.match(html,/aria-label="23 segundos">23/);assert.doesNotMatch(html,/>OVNI|>.*en 33 s</);
});
