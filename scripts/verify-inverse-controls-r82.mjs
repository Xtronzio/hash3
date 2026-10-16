import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const make=(inventory=true)=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>0,playerInventory:inventory});g.cells=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>({id:`X:${x},${y}`,x,y,symbol:'X',owner:'local-x'}));g.inventoryPreferences={'local-x':{inventoryDrawerCollapsed:false}};Object.assign(g.inverseBees.players.X,{turns:6,since:6});return g;};
const withoutPreferences=g=>{const n=structuredClone(g);delete n.inventoryPreferences;return n;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[],online=[];
 page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const toggle=()=>page.locator('[data-action="inventory-float-toggle"]');
 const openEditor=()=>page.locator('.board-inventory-status [data-action="edit-inventory-layout"]').click();
 const floating=()=>page.locator('.map-wrap > [data-floating-tool="inverse-claim"]');
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});let g=make();await load(g);let before=await stored();
  assert.equal(await page.locator('.inverse-bee-count').textContent(),'3');assert.ok(await page.locator('.inverse-bee-count').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=24));assert.equal(await page.locator('.board-inventory-status [data-icon="collect-figures"]').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await openEditor();await page.locator('[data-edit-tool="inverse-claim"] [data-action="inventory-edit-select"]').click();assert.match(await toggle().getAttribute('aria-label'),/Sacar Cobrar/);assert.ok(await page.locator('[data-action="inventory-order-step"]').evaluateAll(ns=>ns.every(n=>n.disabled)));await toggle().click();assert.match(await toggle().getAttribute('aria-label'),/Devolver Cobrar/);
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-controls-editor-r82-${name}.png`)});
  await page.locator('[data-action="close-inventory-layout"]').click();await frame();assert.equal(await floating().count(),1);assert.equal(await page.locator('.board-inventory-status [data-action="inverse-claim-toggle"]').count(),0);assert.deepEqual(withoutPreferences(await stored()),withoutPreferences(before));
  const handle=floating().locator('.favorite-drag-handle'),h=await handle.boundingBox(),camera=await page.locator('.viewport').evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}));await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+50,h.y+h.height/2-40,{steps:10});await page.mouse.up();await frame();
  let n=await stored();assert.ok(n.inventoryPreferences['local-x'].positions['inverse-claim']);assert.deepEqual(withoutPreferences(n),withoutPreferences(before));assert.deepEqual(await page.locator('.viewport').evaluate(n=>({x:n.scrollLeft,y:n.scrollTop})),camera);
  await handle.focus();await page.keyboard.press('ArrowRight');n=await stored();const savedPosition=n.inventoryPreferences['local-x'].positions['inverse-claim'];assert.deepEqual(withoutPreferences(n),withoutPreferences(before));
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-controls-floating-r82-${name}.png`)});
  await floating().locator('button').click();assert.equal(await floating().locator('button').getAttribute('aria-pressed'),'true');const square=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"][data-y="0"]');await square.evaluate(n=>n.scrollIntoView({block:'start',inline:'start'}));await square.click({position:{x:5,y:5}});assert.match(await page.locator('.inverse-claim-confirm').textContent(),/\+19/);assert.deepEqual(withoutPreferences(await stored()),withoutPreferences(before));await page.locator('[data-action="inverse-claim-cancel"]').click();
  await page.locator('.game-minimap').click();await page.locator('.world-map:visible').waitFor();assert.equal(await page.locator('.world-map > [data-floating-tool="inverse-claim"]').count(),1);await page.locator('.world-map > [data-floating-tool="inverse-claim"] button').click();assert.equal(await page.locator('.world-map').isVisible(),false);await page.locator('.inverse-claim-panel').waitFor();await page.locator('[data-action="inverse-claim-cancel"]').click();
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.equal(await page.locator('.paused-minimap > [data-floating-tool="inverse-claim"] button').isEnabled(),false);await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.deepEqual((await stored()).inventoryPreferences['local-x'].positions['inverse-claim'],savedPosition);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.deepEqual((await stored()).inventoryPreferences['local-x'].positions['inverse-claim'],savedPosition);
  await openEditor();await page.locator('[data-edit-tool="inverse-claim"] [data-action="inventory-edit-select"]').click();await toggle().click();await page.locator('[data-action="close-inventory-layout"]').click();assert.equal(await floating().count(),0);assert.equal(await page.locator('.board-inventory-status [data-action="inverse-claim-toggle"]').count(),1);
  // Returning to the bar preserves the exact combo and normal turn cost.
  await page.locator('.board-inventory-status [data-action="inverse-claim-toggle"]').click();const cell=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"][data-y="0"]');await cell.evaluate(n=>n.scrollIntoView({block:'start',inline:'start'}));await cell.click({position:{x:5,y:5}});await page.locator('.inverse-claim-confirm').click();n=await stored();assert.equal(n.players[0].score,19);assert.equal(n.pairs[0].turn,'O');assert.equal(n.inverseBees.players.X.since,0);assert.equal(n.inverseFill.length,32);
  results.push({name,width,height,largeBeeCount:true,newIcon:true,customization:true,dragKeyboard:true,noSpend:true,map:true,pauseReload:true,returnToBar:true,claim:true});
 }
 // Cobrar is a game control even with no player inventory.
 await page.setViewportSize({width:390,height:844});await load(make(false));const before=await stored();await openEditor();assert.match(await toggle().getAttribute('aria-label'),/Sacar Cobrar/);assert.equal(await page.locator('[data-edit-tool="double"]').count(),0);await toggle().click();await page.locator('[data-action="close-inventory-layout"]').click();assert.equal(await floating().count(),1);assert.equal(await floating().locator('button').isEnabled(),true);await floating().locator('button').click();await page.locator('[data-action="inverse-claim-cancel"]').click();assert.deepEqual(withoutPreferences(await stored()),withoutPreferences(before));
 await page.screenshot({path:path.join(output,`a-inverse-controls-no-inventory-r82-${name}.png`)});
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inverse-controls-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-controls-r82.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R82: ${results.length} viewport/engine cases, floating claim and inventory-off control passed`);
