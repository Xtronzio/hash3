import assert from 'node:assert/strict';import path from 'node:path';
import {createLocal} from '../src/local.js';
export async function verifyLocalTargets({context,load,output,results}){
 const r=createLocal('local','X','O',Date.now(),'normal','untimed');r.faunaEnabled=false;
 r.terrain=Array.from({length:999},(_,i)=>({x:i%32,y:Math.floor(i/32)}));
 r.players[0].navigationLastMove={x:20,y:20};r.watchTargets=[{id:'red',number:1,x:2,y:2},{id:'green',number:2,x:15,y:15},{id:'blue',number:3,x:28,y:28}];
 const {page,errors}=await load(context,r);
 assert.equal(await page.locator('.board-inventory-status [data-tool="target"]').count(),1);
 const menu=page.locator('.map-jumps .target-jump-menu');await menu.locator('summary').tap();
 assert.equal(await menu.locator('[data-target-color]').count(),4);await page.screenshot({path:path.join(output,'target-menu-r42.png')});
 for(const color of ['roja','verde','azul','blanca']){if(!await menu.evaluate(el=>el.open))await menu.locator('summary').tap();await menu.locator(`[data-target-color="${color}"]`).tap();}
 const at=page.locator('.board [data-x="20"][data-y="20"]').first();await at.waitFor();
 const geometry=await page.evaluate(()=>{const c=document.querySelector('.board [data-x="20"][data-y="20"]')?.getBoundingClientRect(),v=document.querySelector('.viewport').getBoundingClientRect();return {cell:c?{x:c.x+c.width/2,y:c.y+c.height/2}:null,view:{x:v.x+v.width/2,y:v.y+v.height/2}};});
 assert.ok(geometry.cell&&Math.abs(geometry.cell.x-geometry.view.x)<30&&Math.abs(geometry.cell.y-geometry.view.y)<30);
 await page.locator('[data-action="pause"]').tap();await page.locator('.target-jump-menu summary').tap();assert.equal(await page.locator('[data-target-color]').count(),4);await page.locator('[data-target-color="blanca"]').tap();
 assert.deepEqual(errors,[]);results.push({dianaCardAndFourColorJumpMenu:true,whiteIsLastMoveNotActiveTerritory:true,pausedTargets:true,passed:true});await page.close();
 const u=createLocal('local','X','O',Date.now(),'normal','untimed');u.faunaEnabled=false;
 u.cells=[0,1,2].map(x=>({id:'u'+x,x,y:0,symbol:'X',owner:'local-x'}));u.inventoryEffects.shields=[{cell:'u2',by:'local-x',remaining:2}];
 u.territoryEvents=[{id:'actual-ufo',kind:'ufo',turnsRemaining:1,region:[{x:0,y:0},{x:1,y:0},{x:2,y:0}]}];
 const {page:impact,errors:impactErrors}=await load(context,u);await impact.locator('.board [data-action="move"][data-x="0"][data-y="1"]').tap();
 await impact.locator('.territory-impact-announcements').getByText('OVNI ha liberado 2 celdas',{exact:true}).waitFor();
 await impact.screenshot({path:path.join(output,'territory-impact-r42.png')});
 const saved=await impact.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(saved.territoryImpacts[0].freed,2);assert.deepEqual(impactErrors,[]);await impact.close();
 const {page:reopened}=await load(context,saved);assert.equal(await reopened.locator('[data-impact-id]').count(),0);await reopened.close();results.push({actualImpactNoticeWithProtections:true,noReplaySavedImpact:true,passed:true});
}
