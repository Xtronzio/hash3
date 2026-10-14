import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {playerGameSettingsMarkup} from '../src/saved-game-settings.js';
test('Score settings identify each inventory independently when the human plays O',()=>{
 for(const playerInventory of [true,false])for(const machineInventory of [true,false]){
  const r=createLocal('solo','Jorge','',Date.now(),'advanced','untimed','pro','O',machineInventory,{playerInventory,faunaEnabled:false,territoryEnabled:true}),before=structuredClone(r);
  const own=playerGameSettingsMarkup(r,'local-o'),machine=playerGameSettingsMarkup(r,'local-x');
  assert.match(own,new RegExp(`data-setting="player-inventory" data-enabled="${playerInventory}"`));assert.match(machine,new RegExp(`data-setting="machine-inventory" data-enabled="${machineInventory}"`));
  assert.doesNotMatch(own,/data-setting="difficulty"/);assert.match(machine,/data-setting="difficulty" data-value="pro"/);
  for(const markup of [own,machine]){assert.match(markup,/data-setting="fauna" data-enabled="false"/);assert.match(markup,/data-setting="territory" data-enabled="true"/);assert.match(markup,/data-setting="figures" data-value="advanced"/);assert.match(markup,/data-setting="clock" data-enabled="false"/);assert.equal((markup.match(/data-icon="backpack"/g)||[]).length,1);}assert.deepEqual(r,before);
 }
});
