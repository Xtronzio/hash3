import assert from 'node:assert/strict';
import path from 'node:path';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
const cyan='rgb(0, 229, 255)',yellow='rgb(255, 206, 51)',red='rgb(255, 74, 88)',green='rgb(36, 211, 147)';
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
  assert.equal(await page.locator('.board-inventory-status .inventory-counter-pair [data-icon="backpack"]').count(),2);
  assert.equal(await page.locator('.board-inventory-status .inventory-capacity-strip [data-paused-inventory="own"]').count(),1,'Exactly one own bag shares the counter identity with pause');
  assert.equal(await page.locator('.board-inventory-status [data-paused-inventory="rival"]').getAttribute('data-paused-player'),r.players[1].id);
  assert.equal(await color(page.locator('.board-inventory-status [data-paused-inventory="rival"] .paused-inventory-bag')),cyan);
  assert.equal(await page.locator('.inventory-badge').innerText(),'18/18');assert.equal(await color(page.locator('.inventory-badge')),red);
  assert.equal(await color(page.locator('.board-inventory-status [data-paused-inventory="rival"] .inventory-capacity-value')),green);
  assert.equal(await color(page.locator('.inventory-dock-icon>svg')),cyan);
  assert.equal(await page.locator('.inventory-dock-counter .inventory-pending').innerText(),'+1');assert.equal(await color(page.locator('.inventory-dock-counter .inventory-pending')),red);
  const badge=await page.locator('.inventory-dock-counter').boundingBox(),bag=await page.locator('.inventory-dock-icon>svg').boundingBox();
  assert.ok(badge.x+badge.width<=bag.x||bag.x+bag.width<=badge.x||badge.y+badge.height<=bag.y||bag.y+bag.height<=badge.y,'Counter must not overlap the bag');const rivalBag=await page.locator('.board-inventory-status .paused-inventory-bag').boundingBox();assert.ok(bag.height>=24&&bag.width===rivalBag.width&&bag.height===rivalBag.height,'Both bags use the same visible toolbar size');
  assert.equal(await color(page.locator('.dock-immunity-active')),cyan);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  for(const kind of ['double','erase','frontier','border'])assert.equal(await color(page.locator('.board-inventory-status [data-tool="'+kind+'"] svg')),cyan);
  for(const kind of ['barriers','neutral'])assert.equal(await color(page.locator('.board-territory-status [data-ecology-kind="'+kind+'"]')),yellow);
  await page.locator('.board-territory-status [data-ecology-kind="barriers"]').tap();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.notEqual(await color(page.locator('.board-frontier-cell').first()),yellow,'Actual board wall remains purple');
  const control=await page.locator('.inventory-dock-button').boundingBox();assert.ok(control.x>=0&&control.x+control.width<=viewport.width);
  await page.screenshot({path:path.join(output,`mochila-cian-sin-franja-r51-${viewport.width}.png`)});
  assert.deepEqual(await saved(),before,'Reading full pending inventory must not refill or change a save');
  await page.locator('[data-action="pause"]').tap();const ownCounter=page.locator('.paused-minimap [data-paused-inventory="own"] .inventory-capacity-value');assert.equal(await ownCounter.innerText(),'18/18');assert.equal(await color(ownCounter),'rgb(255, 74, 88)');
  assert.equal(await color(page.locator('.paused-minimap [data-ecology-kind="barriers"]')),yellow);
  await page.screenshot({path:path.join(output,`pausa-colores-r51-${viewport.width}.png`)});
  assert.deepEqual(errors,[]);await page.close();
 }
 results.push({localColorsR51:true,fullPendingCounterUsesSymbolColor:true,bagUnobscured:true,activeImmunityCyan:true,territoryControlsYellow:true,boardWallsRemainPurple:true,oneLiveBagPerParticipant:true,pausedCapacityVisible:true,threeViewports:true,passed:true});
}
