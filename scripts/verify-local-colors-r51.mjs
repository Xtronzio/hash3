import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
const cyan='rgb(0, 229, 255)',yellow='rgb(255, 206, 51)';
export async function verifyLocalColors({context,load,output,results}){
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){
  const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
  const inv=r.players[0].inventory;r.players[0].score=999;
  for(const kind of Object.keys(inv.cards))inv.cards[kind]=0;
  for(const kind of ['double','opposite','rival','erase','frontier','border'])inv.cards[kind]=3;
  inv.comboPending=1;r.inventoryEffects.immunities=[{player:'local-x',expiresAt:Date.now()+33000}];
  r.frontiers=[{id:'wall',cells:[{x:-1,y:0}],by:'local-x'},{id:'border',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}],by:'local-x'}];
  r.cells=[{id:'neutral',x:0,y:0,symbol:'#',owner:null}];
  const {page,errors}=await load(context,r);await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const color=locator=>locator.evaluate(el=>getComputedStyle(el).color),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const before=await saved();
  assert.equal(await page.locator('.board-inventory-status .inventory-capacity-strip').count(),0);
  assert.equal(await page.locator('.inventory-badge').innerText(),'18/18');assert.equal(await color(page.locator('.inventory-badge')),cyan);
  assert.equal(await page.locator('.inventory-dock-counter .inventory-pending').innerText(),'+1');assert.equal(await color(page.locator('.inventory-dock-counter .inventory-pending')),cyan);
  const badge=await page.locator('.inventory-dock-counter').boundingBox(),bag=await page.locator('.inventory-dock-icon>svg').boundingBox();
  assert.ok(badge.y+badge.height<=bag.y,'Counter must not overlap the bag');assert.ok(bag.height>=26&&bag.width>=26,'Bag icon remains fully visible');
  assert.equal(await color(page.locator('.dock-immunity-active')),cyan);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  for(const kind of ['double','erase','frontier','border'])assert.equal(await color(page.locator('.board-inventory-status [data-tool="'+kind+'"] svg')),cyan);
  for(const kind of ['barriers','neutral'])assert.equal(await color(page.locator('.board-territory-status [data-ecology-kind="'+kind+'"]')),yellow);
  assert.notEqual(await color(page.locator('.board-frontier-cell').first()),yellow,'Actual board wall remains purple');
  const control=await page.locator('.inventory-dock-button').boundingBox();assert.ok(control.x>=0&&control.x+control.width<=viewport.width);
  await page.screenshot({path:path.join(output,`mochila-cian-sin-franja-r51-${viewport.width}.png`)});
  assert.deepEqual(await saved(),before,'Reading full pending inventory must not refill or change a save');
  await page.locator('[data-action="pause"]').tap();assert.equal(await page.locator('.paused-minimap .inventory-capacity-value').innerText(),'18/18');assert.equal(await color(page.locator('.paused-minimap .inventory-capacity-value')),cyan);
  assert.equal(await color(page.locator('.paused-minimap [data-ecology-kind="barriers"]')),yellow);
  await page.screenshot({path:path.join(output,`pausa-colores-r51-${viewport.width}.png`)});
  assert.deepEqual(errors,[]);await page.close();
 }
 results.push({localColorsR51:true,fullPendingCounterCyan:true,bagUnobscured:true,activeImmunityCyan:true,territoryControlsYellow:true,boardWallsRemainPurple:true,noRedundantLiveStrip:true,pausedCapacityVisible:true,threeViewports:true,passed:true});
}
