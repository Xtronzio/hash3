import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
export async function verifyLocalEconomy({context,load,output,results}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'advanced','untimed','high','X',false,{faunaEnabled:false,territoryEnabled:false});r.players[0].score=999;
 const {page,errors}=await load(context,r);await page.setViewportSize({width:320,height:740});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('.refill-trigger').waitFor({state:'visible'});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const trigger=page.locator('.floating-refill [data-action="refill-hold"]');
 assert.equal(await trigger.count(),1);assert.equal(await page.locator('.floating-immunity').count(),0);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"]').count(),2);
 const refillBox=await trigger.boundingBox();
 const before=await saved();await trigger.tap();assert.deepEqual(await saved(),before);assert.equal(await page.locator('.refill-selector').count(),0);
 const touch=await context.newCDPSession(page);
 const hold=async(ms=1100)=>{const box=await trigger.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await page.waitForTimeout(ms);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 await hold(400);assert.equal(await page.locator('.refill-selector').count(),0);assert.deepEqual(await saved(),before,'Short hold changed game');
 await page.screenshot({path:path.join(output,'recarga-flotante-r45.png')});
 await hold();await page.locator('.refill-selector').waitFor();assert.deepEqual(await saved(),before,'Opening the selector changed the game');
 const buy=page.locator('.refill-selector [data-action="refill-buy"][data-tool="antidote"]');await buy.evaluate(el=>el.scrollIntoView());
 const sheet=await page.locator('.refill-selector').boundingBox();assert.ok(sheet.height<=740*.46+1,'Refill tray covers too much of the board');
 assert.equal(await page.locator('.refill-card-name,.refill-instruction,.refill-card-reason').count(),0);
 for(const card of await page.locator('.refill-card').all()){const bounds=await card.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44,'Refill icons must retain touch targets');}
 await page.screenshot({path:path.join(output,'recarga-selector-r46.png')});
 await buy.tap();assert.equal(await page.locator('#notice').evaluate(el=>getComputedStyle(el).color),'rgb(0, 229, 255)');let next=await saved();assert.equal(next.players[0].score,966);assert.equal(next.players[0].inventory.cards.antidote,1);assert.deepEqual(next.players[1],before.players[1]);assert.deepEqual(next.pairs,before.pairs);assert.equal(await page.locator('.refill-selector').count(),1);
 assert.equal(await buy.locator('.refill-card-stock').textContent(),'×1');
 assert.match(await page.locator('.refill-wallet').textContent(),/966/);
 for(let i=0;i<2;i++)await buy.tap();
 next=await saved();assert.equal(next.players[0].inventory.cards.antidote,3);assert.equal(next.players[0].score,900);
 assert.equal(await page.locator('.refill-selector').count(),0,'Three buys exhaust the hold allowance');await hold();assert.equal(await buy.isDisabled(),true);await page.locator('[data-action="close-refill"]').tap();
 // Compact in landscape too; scroll remains inside the tray.
 await hold();await page.locator('.refill-selector').waitFor();await page.setViewportSize({width:740,height:320});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('.refill-selector').waitFor();
 assert.ok((await page.locator('.refill-selector').boundingBox()).height<=320*.46+1);await page.screenshot({path:path.join(output,'recarga-horizontal-r46.png')});
 await page.setViewportSize({width:320,height:740});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('[data-action="close-refill"]').tap();
 // Opening from an already visible bag closes it; cancel never spends.
 await page.locator('[data-action="inventory"]').tap();await hold();assert.equal(await page.locator('#inventory-panel').count(),0);await page.locator('[data-action="close-refill"]').tap();
 const handle=page.locator('.refill-drag-handle'),original=await handle.boundingBox(),camera=await page.locator('.viewport').evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
 await page.mouse.move(original.x+original.width/2,original.y+original.height/2);await page.mouse.down();await page.mouse.move(original.x+original.width/2+50,original.y+original.height/2+40,{steps:8});await page.mouse.up();
 const moved=await trigger.boundingBox();assert.ok(moved.x>refillBox.x+35);assert.deepEqual(await page.locator('.viewport').evaluate(el=>({x:el.scrollLeft,y:el.scrollTop})),camera);assert.equal(await page.locator('.refill-selector').count(),0);
 await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="resume"]').tap();assert.ok(Math.abs((await trigger.boundingBox()).x-moved.x)<1);
 await touch.detach();
 await page.locator('[data-action="inventory"]').tap();assert.equal(await page.locator('#inventory-panel [data-action="trade-hold"],#inventory-panel [data-action="refill-buy"]').count(),0);
 await page.locator('#inventory-panel [data-action="close-inventory"]').tap();await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="go-hall"]').tap();await page.locator('[data-action="hall-inventory"]').tap();
 const a=page.locator('.inventory-catalog [data-action="inventory-description"][data-tool="antidote"]'),b=page.locator('.inventory-catalog [data-action="inventory-description"][data-tool="ambush"]');
 for(const button of [a,b,a]){await button.evaluate(el=>el.scrollIntoView());await button.tap();}
 assert.equal(await a.getAttribute('aria-expanded'),'false');assert.equal(await b.getAttribute('aria-expanded'),'true');assert.equal(await a.evaluate(el=>el.classList.contains('is-open')),false);assert.equal(await b.evaluate(el=>el.classList.contains('is-open')),true);
 assert.equal(await a.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');assert.equal(await a.evaluate(el=>getComputedStyle(el).webkitTapHighlightColor),'rgba(0, 0, 0, 0)');
 assert.notEqual(await a.evaluate(el=>getComputedStyle(el).backgroundColor),await b.evaluate(el=>getComputedStyle(el).backgroundColor));await page.screenshot({path:path.join(output,'hall-independent-r45.png')});
 await page.locator('[data-action="setup-solo"]').tap();await page.locator('#local-name').fill('Jorge');await page.locator('#player-inventory').check();await page.locator('#machine-inventory').check();
 const picker=page.locator('[data-starter-player="0"].starting-inventory-picker');assert.equal(await picker.locator('[aria-pressed="true"]').count(),3);
 await picker.locator('[data-tool="double"]').tap();await picker.locator('[data-tool="antidote"]').evaluate(el=>el.scrollIntoView());await picker.locator('[data-tool="antidote"]').tap();assert.equal(await picker.locator('[aria-pressed="true"]').count(),3);
 await page.locator('[data-action="start-local"]').tap();await page.locator('.game .viewport').waitFor();const created=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.mode==='solo'));
 const human=created.players.find(p=>p.id===created.humanId),machine=created.players.find(p=>p.id!==created.humanId);assert.equal(human.inventory.cards.antidote,1);assert.equal(machine.inventory.cards.antidote,0);assert.equal(Object.values(human.inventory.cards).reduce((a,b)=>a+b,0),3);assert.equal(Object.values(machine.inventory.cards).reduce((a,b)=>a+b,0),3);
 assert.deepEqual(errors,[]);results.push({localRefillR45:true,shortTapNoOpen:true,oneSecondHoldSelector:true,oneTapSinglePurchase:true,threeUnitCap:true,independentHallHighlights:true,selectableThreeCards:true,passed:true});await page.close();
 const botGame=createLocal('solo','Jorge','Máquina',Date.now(),'normal','untimed','medium','X',true,{faunaEnabled:false,territoryEnabled:false});
 botGame.pairs[0].turn='O';botGame.players[1].score=333;botGame.players[1].inventory.cards.double=0;
 const {page:botPage,errors:botErrors}=await load(context,botGame);
 await botPage.waitForTimeout(400);let botSaved=await botPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(botSaved.players[1].tradeSpent||0,0,'Machine bought before the 1s wait');
 await botPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[1].tradeSpent===33,{},{timeout:10000});
 botSaved=await botPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(botSaved.players[1].score,300);assert.deepEqual(botErrors,[]);await botPage.close();results.push({machinePurchaseWaitOneSecond:true,passed:true});
}
