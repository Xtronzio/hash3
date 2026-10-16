import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const make=(inventory=true)=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>.5,playerInventory:inventory});g.inventoryPreferences={'local-x':{inventoryDrawerCollapsed:false}};g.inverseBees.players.X.limit=33;g.inverseBees.players.O.limit=10;return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const floating=()=>page.locator('.map-wrap > [data-floating-tool="inverse-claim"]');
 const counts=()=>page.locator('.inverse-bee-clocks:visible .inverse-bee-count').allTextContents();
 const visible=()=>page.locator('.inverse-bee-clocks:visible').evaluate(n=>{const b=n.getBoundingClientRect();return b.x>=0&&b.y>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight&&[...n.querySelectorAll('.inverse-bee-badge')].every(e=>{const c=e.getBoundingClientRect();return c.left>=b.left&&c.right<=b.right&&c.top>=b.top&&c.bottom<=b.bottom;});});
 const openEditor=()=>page.locator('.board-inventory-status [data-action="edit-inventory-layout"]').click();
 const select=()=>page.locator('[data-edit-tool="inverse-claim"] button').click();
 const toggle=()=>page.locator('[data-action="inventory-float-toggle"]').click();
 const close=()=>page.locator('[data-action="close-inventory-layout"]').click();
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});const g=make();await load(g);const before=await stored();assert.equal(await floating().count(),1);assert.equal(await page.locator('.board-inventory-status [data-action="inverse-claim-toggle"]').count(),0);const box=await floating().locator('button').boundingBox();assert.ok(box.width>=70&&box.height>=70);assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);assert.deepEqual(await counts(),['33','10']);assert.equal(await visible(),true);assert.equal(await page.locator('.inverse-bee-notice').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-default-r83-${name}.png`)});
  await page.locator('.board-inventory-status [data-action="toggle-inventory-bar"]').click();assert.deepEqual(await counts(),['33','10']);assert.equal(await visible(),true);await page.locator('.board-inventory-status [data-action="toggle-inventory-bar"]').click();
  await page.locator('.game-minimap').click();await page.locator('.world-map:visible').waitFor();assert.deepEqual(await counts(),['33','10']);assert.equal(await visible(),true);await page.locator('[data-action="close-map"]').click();
  await openEditor();await select();assert.match(await page.locator('[data-action="inventory-float-toggle"]').getAttribute('aria-label'),/Devolver Cobrar/);await toggle();await close();assert.equal(await floating().count(),0);assert.equal(await page.locator('.board-inventory-status [data-action="inverse-claim-toggle"]').count(),1);assert.equal((await stored()).inventoryPreferences['local-x'].inverseClaimDocked,true);
  await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.equal((await stored()).inventoryPreferences['local-x'].inverseClaimDocked,true);assert.deepEqual(await counts(),['33','10']);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.equal(await floating().count(),0);assert.deepEqual(await counts(),['33','10']);await openEditor();await select();await toggle();await close();assert.equal(await floating().count(),1);
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.deepEqual(await counts(),['33','10']);await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.deepEqual(await counts(),['33','10']);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.equal(await floating().count(),1);assert.deepEqual((await stored()).inverseBees,before.inverseBees);assert.deepEqual((await stored()).players,before.players);
  results.push({name,width,height,defaultFloating:true,largeClaim:true,bothFullCounts:true,folded:true,map:true,dockReload:true,pauseReload:true});
 }
 await page.setViewportSize({width:390,height:844});const o=make(false);o.pairs[0].turn='O';await load(o);assert.deepEqual(await counts(),['10','33']);assert.match(await page.locator('.inverse-bee-clocks').textContent(),/TúO10RivalX33/);assert.equal(await floating().count(),1);assert.equal(await floating().locator('button').isEnabled(),true);assert.equal(await visible(),true);await page.screenshot({path:path.join(output,`a-inverse-o-no-inventory-r83-${name}.png`)});
 const both=make();both.inverseBees.players.O.limit=33;await load(both);assert.deepEqual(await counts(),['33','33']);assert.equal(await visible(),true);assert.deepEqual(errors,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inverse-visible-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-visible-r83.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R83: ${results.length} viewport/engine cases, default floating and both full countdowns passed`);
