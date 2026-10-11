import assert from 'node:assert/strict';
import path from 'node:path';
import {createLocal} from '../src/local.js';
export async function verifyLocalFeedback({context,load,output,results}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'advanced','untimed','high','X',false,{faunaEnabled:false,territoryEnabled:false});
 r.terrain=Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5)}));r.terrain.push({x:5,y:0});
 r.cells=r.terrain.filter(c=>c.x<5&&(c.x!==2||c.y!==2)).map((c,i)=>({...c,id:'piece'+i,symbol:'X',owner:'local-x'}));
 r.frontiers=[{id:'wall1',cells:[{x:-1,y:0}]},{id:'wall2',cells:[{x:-1,y:1}]},{id:'border',type:'border',cells:[{x:6,y:0},{x:6,y:1},{x:6,y:2}]}];
 const {page,errors}=await load(context,r);await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.compact-turnbar .brand').innerText(),'#33');assert.equal(await page.locator('.brand svg').count(),0);
 assert.match(await page.locator('.compact-turnbar .brand').evaluate(el=>getComputedStyle(el).fontFamily),/Barlow Condensed/);
 assert.equal(await page.locator('.board-territory-status [data-ecology-kind="barriers"] .ecology-badge').innerText(),'×3');
 assert.equal(await page.locator('.board-territory-status [data-ecology-kind="frontier"],.board-territory-status [data-ecology-kind="border"]').count(),0);
 await page.locator('.board-inventory-status [data-tool="double"]').tap();await page.locator('.board [data-action="move"][data-x="2"][data-y="2"]').tap();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);const scored=await saved();assert.ok(scored.lastEvent.points>=33);assert.equal(scored.players[0].inventory.draws,1);
 assert.equal(await page.locator('#notice .score-breakdown').isVisible(),false);assert.match(await page.locator('#notice').innerText(),/^\+\d[\d.]*$/);
 assert.equal(await page.locator('.inventory-refill-toast').evaluate(el=>getComputedStyle(el).color),'rgb(0, 229, 255)');
 await page.screenshot({path:path.join(output,'combo-puntos-cian-r48.png')});
 await page.locator('#notice .score-details summary').tap();assert.equal(await page.locator('#notice .score-breakdown').isVisible(),true);for(const size of [{width:390,height:844},{width:320,height:740},{width:740,height:320}]){await page.setViewportSize(size);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const box=await page.locator('#notice .score-breakdown').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=size.width&&box.y>=0&&box.y+box.height<=size.height,'Requested score breakdown must fit the viewport: '+JSON.stringify({box,size}));}await page.setViewportSize({width:390,height:844});await page.waitForTimeout(4600);assert.equal(await page.locator('#notice').isVisible(),true,'Requested breakdown must remain readable');assert.deepEqual(await saved(),scored);
 await page.screenshot({path:path.join(output,'combo-desglose-voluntario-r48.png')});
 await page.locator('#notice .score-notice-jump').tap();assert.equal(await page.locator('#notice').isVisible(),false);assert.deepEqual(await saved(),scored,'Jump must not change scores, stock, turns or geometry');
 const centered=await page.locator('.board [data-x="2"][data-y="2"]').boundingBox(),viewport=await page.locator('.viewport').boundingBox();assert.ok(centered.x+centered.width>viewport.x&&centered.x<viewport.x+viewport.width&&centered.y+centered.height>viewport.y&&centered.y<viewport.y+viewport.height);
 await page.locator('[data-action="pause"]').tap();assert.equal(await page.locator('.paused-minimap .inventory-shortcuts').isVisible(),true);assert.equal(await page.locator('.paused-score-body .inventory-shortcuts').count(),0);assert.equal(await page.locator('.paused-minimap [data-tool="double"] small').innerText(),'×'+scored.players[0].inventory.cards.double);assert.equal(await page.locator('.paused-minimap [data-ecology-kind="barriers"] .ecology-badge').innerText(),'×3');
 assert.deepEqual(errors,[]);await page.close();results.push({localFeedbackR48:true,pointsOnly:true,optionalReadableBreakdown:true,scoreTapJumpsWithoutMutation:true,comboRechargeCyan:true,visiblePausedInventory:true,stackedWallCounts:true,passed:true});
}
