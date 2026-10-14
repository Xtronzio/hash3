import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
export async function verifyLocalInventory({context,load,output,results}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'advanced','untimed','high','X',false,{faunaEnabled:false,territoryEnabled:false});
 r.players[0].score=999;r.players[0].inventory.cards.erase=1;
 r.cells=[{id:'rival',x:0,y:0,symbol:'O',owner:'local-o'}];
 r.frontiers=[{id:'wall',cells:[{x:-1,y:0}]},{id:'border1',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]},{id:'border2',type:'border',cells:[{x:0,y:3},{x:1,y:3},{x:2,y:3}]}];
 const {page,errors}=await load(context,r);await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const stock=page.locator('.board-inventory-status'),capacity=page.locator('.inventory-badge'),counter=page.locator('.inventory-dock-counter');
 assert.equal(await capacity.innerText(),'4/18');
 const counterBox=await counter.boundingBox();assert.ok(counterBox.x>=0&&counterBox.x+counterBox.width<=390);assert.ok(counterBox.height>=14);
 await stock.locator('.inventory-shortcuts').evaluate(el=>{el.scrollLeft=el.scrollWidth;});
 assert.deepEqual(await counter.boundingBox(),counterBox,'Capacity must remain fixed when the cards scroll');
 const barrier=page.locator('.board-territory-status [data-ecology-kind="barriers"]');
 assert.equal(await barrier.locator('.ecology-badge').innerText(),'×3');assert.match(await barrier.getAttribute('aria-label'),/Muros: 1 · Fronteras: 2/);
 assert.equal(await page.locator('.board-territory-status [data-ecology-kind="frontier"],.board-territory-status [data-ecology-kind="border"]').count(),0);
 const before=await saved();for(let i=0;i<4;i++)await barrier.tap();assert.deepEqual(await saved(),before,'Barrier navigation must not mutate the game');
 // Use the same erase action that was still showing a white message on Jorge’s screen.
 const erase=stock.locator('[data-tool="erase"]');await erase.evaluate(el=>el.scrollIntoView());await erase.tap();
 const target=page.locator('.board [data-action="inventory-target"][data-x="0"][data-y="0"]');await target.evaluate(el=>el.scrollIntoView());await target.tap();
 assert.match(await page.locator('.turn-feedback-bar .player-notice-extra').innerText(),/^Borrar aplicada\. Los puntos se conservan/);
 const style=await page.locator('.turn-feedback-bar .player-notice-extra').evaluate(el=>{const s=getComputedStyle(el),frame=getComputedStyle(el.closest('.practice-banner'));return {color:s.color,font:+parseFloat(s.fontSize),weight:+s.fontWeight,border:parseFloat(frame.borderLeftWidth),shadow:frame.boxShadow,pulse:frame.animationName};});
 assert.equal(style.color,'rgb(0, 229, 255)');assert.ok(style.font>=12&&style.weight>=700);assert.ok(style.border>=1);assert.notEqual(style.shadow,'none');assert.equal(style.pulse,'playerFeedbackPulse');assert.equal(await page.locator('#notice.inventory-notice.visible').count(),0);
 assert.equal(await capacity.innerText(),'3/18');const after=await saved();assert.equal(after.players[0].score,999);assert.deepEqual(after.players[1],before.players[1]);assert.deepEqual(after.frontiers,before.frontiers);assert.deepEqual(after.terrain,before.terrain);assert.equal(after.pairs[0].turn,'X');
 await page.screenshot({path:path.join(output,'inventario-cian-contador-pila-r50.png')});
 assert.equal(await page.locator('.refill-trigger small').innerText(),'1s');const touch=await context.newCDPSession(page),box=await page.locator('.refill-trigger').boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(1100);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 assert.equal(await page.locator('.refill-selector').count(),1);await page.locator('.refill-selector [data-tool="erase"]').tap();assert.equal(await capacity.innerText(),'4/18');await page.locator('[data-action="close-refill"]').tap();
 await page.locator('[data-action="pause"]').tap();assert.equal(await page.locator('.paused-minimap [data-paused-inventory="own"] .inventory-capacity-value').innerText(),'4/18');assert.equal(await page.locator('.paused-score-body .inventory-capacity-value').count(),0);assert.equal(await page.locator('.paused-minimap [data-ecology-kind="barriers"] .ecology-badge').innerText(),'×3');
 await page.screenshot({path:path.join(output,'pausa-contador-pila-r50.png')});assert.deepEqual(errors,[]);await page.close();
 results.push({localInventoryR50:true,eraseNoticeCyanProminent:true,capacityOutsideScrollingCards:true,capacitySpendBuyPause:true,oneSecondHold:true,oneBarrierStack:true,navigationPreservesState:true,passed:true});
}
