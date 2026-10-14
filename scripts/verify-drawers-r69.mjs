import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {normalizeInventoryPreferences} from '../src/inventory-layout.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture({status='playing',folded=false,lateral=true,large=false}={}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});
 r.terrain=Array.from({length:large?33333:304},(_,i)=>({x:i%(large?183:19),y:Math.floor(i/(large?183:19))}));
 r.players.forEach(p=>{p.score=25912;p.inventory.cards.double=84;p.inventory.comboPending=1;});r.status=status;
 r.inventoryPreferences=Object.fromEntries(r.players.map(p=>[p.id,normalizeInventoryPreferences({inventoryCollapsed:folded,territoryCollapsed:folded,inventoryDrawerCollapsed:lateral,territoryDrawerCollapsed:lateral})]));return r;
}
try{for(const [name,engine]of Object.entries({chromium,webkit,firefox}).filter(([name])=>!process.env.HASH3_QA_ENGINE||name===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator(r.status==='paused'?'.paused-minimap .inspection-canvas':'.game .viewport').waitFor();await frame(page);};
  for(const size of [{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:740,height:320},{width:1280,height:900},{width:1920,height:1080}])for(const status of ['playing','paused'])for(const folded of [false,true])for(const lateral of [false,true]){
   await page.setViewportSize(size);await load(fixture({status,folded,lateral}));const before=await read();
   for(const kind of ['inventory','territory']){
    const band=page.locator(`${status==='paused'?'.paused-minimap':kind==='inventory'?'.board-inventory-status':'.board-territory-status'} .custom-${kind}-band`);
    assert.equal(await band.locator('.custom-band-content').isVisible(),!folded);assert.equal(await band.locator('.band-auxiliary').isVisible(),!lateral);
    assert.equal(await band.locator('.band-fold').getAttribute('aria-expanded'),String(!folded));assert.equal(await band.locator('.band-drawer-toggle').getAttribute('aria-expanded'),String(!lateral));
    const boxes=await band.evaluate(b=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height};};return {band:box(b),rail:box(b.querySelector('.band-actions')),content:box(b.querySelector('.custom-band-content')),buttons:[...b.querySelectorAll('.band-actions button')].filter(e=>e.checkVisibility()).map(box)};});
    if(!folded)assert.equal(boxes.rail.width,status==='playing'&&size.height<=450?(lateral?92:188):(lateral?44:92),JSON.stringify({size,status,folded,lateral,boxes}));
    for(const b of boxes.buttons){assert.ok(b.width>=44&&b.height>=44);assert.ok(b.x>=boxes.band.x-1&&b.right<=boxes.band.right+1,JSON.stringify({size,status,folded,lateral,boxes}));}
    if(!folded)assert.ok(boxes.content.width>=48,JSON.stringify({size,status,boxes}));
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator(status==='paused'?'.paused-minimap .paused-inventory-bag':'.board-inventory-status .inventory-dock-icon>svg').first().evaluate(el=>getComputedStyle(el).fill),'none');assert.deepEqual(await read(),before);
   if(size.width===390||size.width===740)await page.screenshot({path:path.join(output,`drawers-r69-${name}-${size.width}-${status}-${folded}-${lateral}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await load(fixture());const base=await read(),strip=()=>page.locator('.board-inventory-status .custom-inventory-band'),territory=()=>page.locator('.board-territory-status .custom-territory-band');
  await strip().locator('[data-action="toggle-inventory-drawer"]').click();await territory().locator('[data-action="toggle-territory-drawer"]').click();let next=await read();
  assert.equal(next.inventoryPreferences['local-x'].inventoryDrawerCollapsed,false);assert.equal(next.inventoryPreferences['local-x'].territoryDrawerCollapsed,false);assert.deepEqual(next.inventoryPreferences['local-o'],base.inventoryPreferences['local-o']);
  const gameOnly=g=>{const v=structuredClone(g);delete v.inventoryPreferences;return v;};assert.deepEqual(gameOnly(next),gameOnly(base));
  await territory().locator('[data-action="territory-inventory"]').click();assert.equal(await page.locator('#territory-guide').count(),1);await page.locator('[data-action="close-inventory"]').click();
  await territory().locator('[data-action="events"]').click();await page.locator('.events-sheet').waitFor();await page.locator('[data-action="close-events"]').click();
  await strip().locator('[data-action="player-inventory"]').click();assert.equal(await page.locator('#territory-guide').count(),0);await page.locator('[data-action="close-inventory"]').click();
  await strip().locator('[data-action="edit-inventory-layout"]').click();await page.locator('[data-edit-tool="double"] [data-action="inventory-edit-select"]').click();await page.locator('[data-action="inventory-float-toggle"]').click();await page.locator('[data-action="close-inventory-layout"]').click();assert.equal(await page.locator('.map-wrap > [data-floating-tool="double"]').count(),1);assert.equal((await read()).players[0].inventory.cards.double,84);
  await strip().locator('[data-action="toggle-inventory-bar"]').click();assert.equal(await strip().locator('.custom-band-content').isVisible(),false);assert.equal(await strip().locator('.band-auxiliary').isVisible(),true);
  await territory().locator('[data-action="toggle-territory-drawer"]').click();assert.equal(await territory().locator('.custom-band-content').isVisible(),true);
  const preferences=(await read()).inventoryPreferences;await page.locator('[data-action="pause"]').click();await page.locator('.paused-minimap').waitFor();await page.reload();await page.locator('[data-action="hall-games"]').click();await page.locator(`[data-action="load-game"][data-id="${base.id}"]`).click();await page.locator('.paused-minimap').waitFor();assert.deepEqual((await read()).inventoryPreferences,preferences);
  await page.locator('[data-action="expand-pause-map"]').click();await page.locator('.inspection-fullscreen').waitFor();assert.equal(await page.locator('.inspection-fullscreen .custom-inventory-band .band-auxiliary').isVisible(),true);for(let i=0;i<2;i++){await page.locator('.inspection-fullscreen [data-action="toggle-inventory-drawer"]').click();assert.equal(await page.evaluate(()=>!!document.activeElement.closest('.inspection-fullscreen')&&document.activeElement.dataset.action==='toggle-inventory-drawer'),true);}
  await page.locator('.inspection-fullscreen [data-action="close-pause-map"]').click();await page.locator('[data-action="resume"]').click();
  await page.locator('[data-action="map"]').click();assert.equal(await page.locator('.world-map .custom-inventory-band .band-auxiliary').isVisible(),true);await page.locator('.world-map [data-action="toggle-inventory-drawer"]').click();assert.equal(await page.locator('.world-map .custom-inventory-band .band-auxiliary').isVisible(),false);await page.locator('[data-action="close-map"]').click();
  await load(fixture({large:true}));const large=await read();await page.locator('[data-action="fit-board"]').click();await frame(page);assert.ok(await page.locator('.board .cell').count()<1000);assert.deepEqual(await read(),large);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS independent drawers / 44px rail / preserved stock and preferences / pause and maps: '+name);
 }catch(error){if(page)await page.screenshot({path:path.join(output,`failure-r69-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'drawers-r69-results.json'),JSON.stringify(results));await new Promise(r=>server.httpServer.close(r));}
