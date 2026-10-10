import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
import {practiceTools} from '../src/practice-tools.js';
const ids=practiceTools.map(t=>t.id).concat('target','immunity','immunity-1','immunity-3','immunity-33');
export async function verifyInventoryDescriptions({context,load,output,results}){
 const r=createLocal('local','X','O',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
 const {page,errors}=await load(context,r);
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 await page.setViewportSize({width:320,height:740});
 await page.locator('[data-action="inventory"]').tap();
 const before=await saved();
 async function checkAll(scope){
  assert.equal(await page.locator(`${scope} .inventory-description-panel:not([hidden])`).count(),0);
  for(const id of ids){
   const toggle=page.locator(`${scope} [data-action="inventory-description"][data-tool="${id}"]`);
   await toggle.evaluate(el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));await toggle.tap();
   const panel=page.locator(`${scope} [data-description-panel="${id}"]`);
   assert.equal(await panel.isVisible(),true);assert.ok((await panel.locator('p').first().innerText()).length>30);
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   const box=await panel.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=321,'Description exceeds mobile width');
   if(id==='swap')await page.screenshot({path:path.join(output,scope.includes('catalog')?'hall-description-r43.png':'backpack-description-r43.png')});
   await toggle.evaluate(el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));await toggle.tap();
   assert.equal(await panel.isVisible(),false);
  }
 }
 await checkAll('#inventory-panel');assert.deepEqual(await saved(),before,'Reading spent stock or changed game');
 await page.locator('#inventory-panel [data-tool="double"]').tap();
 await page.locator('#inventory-panel [data-use-tool="double"]').tap();
 assert.equal((await saved()).players[0].inventory.cards.double,before.players[0].inventory.cards.double-1);
 assert.equal(await page.locator('#inventory-panel').count(),0);
 await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="go-hall"]').tap();await page.locator('[data-action="hall-inventory"]').tap();
 await checkAll('.inventory-catalog');assert.equal(await page.locator('.inventory-catalog [data-use-tool]').count(),0);
 assert.deepEqual(errors,[]);results.push({allInventoryDescriptions:true,collapsedByDefault:true,readingDoesNotSpend:true,explicitUse:true,mobileWidth:320,passed:true});await page.close();
}
