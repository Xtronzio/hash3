import test from 'node:test';import assert from 'node:assert/strict';
import {ecologyChoicesMarkup,territoryWarningMarkup} from '../src/ecology-ui.js';
test('Complexity has three independent accessible icon checkboxes, without visible explanatory copy',()=>{
 const html=ecologyChoicesMarkup({machine:true,machineInventory:false,faunaEnabled:true,territoryEnabled:false},'<svg></svg>');
 assert.equal((html.match(/type="checkbox"/g)||[]).length,3);assert.match(html,/aria-label="Inventario rival"/);assert.match(html,/id="fauna-enabled"[^>]*checked/);assert.doesNotMatch(html,/id="territory-enabled"[^>]*checked/);assert.doesNotMatch(html,/<strong>|<small>/);
});
test('Phenomenon warnings show the actual icon and countdown, with quantity accessible and region navigation',()=>{
 const html=territoryWarningMarkup({territoryEvents:[{id:'a',kind:'ufo',region:Array(33).fill({x:0,y:0}),nextAt:34000}]},11000);
 assert.match(html,/data-action="locate-territory"/);assert.match(html,/<ellipse/);assert.match(html,/aria-label="23 segundos">23/);assert.doesNotMatch(html,/>OVNI|>.*en 33 s</);
});
