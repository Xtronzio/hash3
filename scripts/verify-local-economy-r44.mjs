import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
export async function verifyLocalEconomy({context,load,output,results}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'advanced','untimed','high','X',false,{faunaEnabled:false,territoryEnabled:false});r.players[0].score=999;
 const {page,errors}=await load(context,r);await page.setViewportSize({width:320,height:740});await page.locator('[data-action="inventory"]').tap();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const toggle=page.locator('#inventory-panel [data-action="inventory-description"][data-tool="antidote"]');await toggle.evaluate(el=>el.scrollIntoView());await toggle.tap();
 const buy=page.locator('#inventory-panel [data-action="trade-hold"][data-trade-tool="antidote"]');await buy.evaluate(el=>el.scrollIntoView());const before=await saved();await buy.tap();assert.deepEqual(await saved(),before,'Short tap purchased a card');
 const hold=async()=>{const box=await buy.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();};
 await hold();let next=await saved();assert.equal(next.players[0].score,966);assert.equal(next.players[0].inventory.cards.antidote,1);assert.deepEqual(next.players[1],before.players[1]);assert.deepEqual(next.pairs,before.pairs);
 await buy.evaluate(el=>el.scrollIntoView());await hold();await buy.evaluate(el=>el.scrollIntoView());await hold();next=await saved();assert.equal(next.players[0].inventory.cards.antidote,3);assert.equal(await buy.isDisabled(),true);assert.equal(next.players[0].score,900);
 await page.screenshot({path:path.join(output,'trueque-r44.png')});
 await page.locator('#inventory-panel [data-action="close-inventory"]').tap();await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="go-hall"]').tap();await page.locator('[data-action="hall-inventory"]').tap();
 const a=page.locator('.inventory-catalog [data-action="inventory-description"][data-tool="antidote"]'),b=page.locator('.inventory-catalog [data-action="inventory-description"][data-tool="ambush"]');
 for(const button of [a,b,a]){await button.evaluate(el=>el.scrollIntoView());await button.tap();}
 assert.equal(await a.getAttribute('aria-expanded'),'false');assert.equal(await b.getAttribute('aria-expanded'),'true');assert.equal(await a.evaluate(el=>el.classList.contains('is-open')),false);assert.equal(await b.evaluate(el=>el.classList.contains('is-open')),true);
 assert.notEqual(await a.evaluate(el=>getComputedStyle(el).backgroundColor),await b.evaluate(el=>getComputedStyle(el).backgroundColor));await page.screenshot({path:path.join(output,'hall-independent-r44.png')});
 await page.locator('[data-action="setup-solo"]').tap();await page.locator('#local-name').fill('Jorge');await page.locator('#machine-inventory').check();
 const picker=page.locator('[data-starter-player="0"].starting-inventory-picker');assert.equal(await picker.locator('[aria-pressed="true"]').count(),3);
 await picker.locator('[data-tool="double"]').tap();await picker.locator('[data-tool="antidote"]').evaluate(el=>el.scrollIntoView());await picker.locator('[data-tool="antidote"]').tap();assert.equal(await picker.locator('[aria-pressed="true"]').count(),3);
 await page.locator('[data-action="start-local"]').tap();await page.locator('.game .viewport').waitFor();const created=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.mode==='solo'));
 const human=created.players.find(p=>p.id===created.humanId),machine=created.players.find(p=>p.id!==created.humanId);assert.equal(human.inventory.cards.antidote,1);assert.equal(machine.inventory.cards.antidote,0);assert.equal(Object.values(human.inventory.cards).reduce((a,b)=>a+b,0),3);assert.equal(Object.values(machine.inventory.cards).reduce((a,b)=>a+b,0),3);
 assert.deepEqual(errors,[]);results.push({localEconomyR44:true,shortTapNoBuy:true,longHoldSingleUnit:true,threeUnitCap:true,independentHallHighlights:true,selectableThreeCards:true,passed:true});await page.close();
}
