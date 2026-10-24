import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {advanceInverseFog} from '../src/inverse-fog.js';
import {activateFog} from '../src/fog.js';
import {captureTransfer} from '../src/local-transfer.js';

const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const sizes=[[320,740],[390,844],[428,926],[740,320],[1280,800],[1920,1080]];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const tiles=n=>Array.from({length:n},(_,i)=>({x:i%(n===33333?183:3),y:Math.floor(i/(n===33333?183:3))}));
function fresh(variant='original'){
 const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false,initialCards:variant==='inverse'?['double','hint','erase']:['relocate','double','hint'],random:()=>0,...(variant==='inverse'?{variant,board:{id:'qa-r101',name:'Niebla',terrain:tiles(9)}}:{})});
 g.inventoryPreferences={'local-x':{inventoryDrawerCollapsed:false,territoryDrawerCollapsed:false}};return g;
}
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'}),errors=[],online=[];
 context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});
 await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();await frame(page);};
 const relocate=()=>page.locator('.board-inventory-status [data-action="practice-tool"][data-tool="relocate"]');
 const source=()=>page.locator('.terrain-cell[data-x="2"][data-y="2"]');
 for(const [width,height]of sizes){
  await page.setViewportSize({width,height});await load(fresh());const before=await read();
  assert.equal(await page.locator('.inventory-capacity-value').first().innerText(),'3/9');assert.ok(await page.locator('.inventory-refill-next').count());
  await relocate().scrollIntoViewIfNeeded();await relocate().click();await source().click();assert.ok(await page.locator('.activation-hole').count());assert.equal((await read()).players[0].inventory.cards.relocate,1);
  await page.locator('[data-action="cancel-tool-selection"]').click();assert.deepEqual((await read()).terrain,before.terrain);
  await relocate().click();await source().click();await page.locator('[data-action="fit-board"]').click();if(await page.locator('.board-overview-map').count()){await page.locator('.board-overview-map').click();await frame(page);}const destination=page.locator('.activation-hole').first(),point=await destination.evaluate(n=>({x:+n.dataset.x,y:+n.dataset.y}));await destination.click();
  const after=await read();assert.equal(after.terrain.length,9);assert.ok(after.terrain.some(c=>c.x===point.x&&c.y===point.y));assert.ok(!after.terrain.some(c=>c.x===2&&c.y===2));assert.equal(after.players[0].inventory.cards.relocate,0);assert.equal(after.pairs[0].turn,'X');assert.equal(after.players[0].inventory.completedTurns,before.players[0].inventory.completedTurns);assert.deepEqual(after.players.map(p=>p.score),before.players.map(p=>p.score));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await page.screenshot({path:path.join(output,`inventory-balance-r101-${name}-relocate.png`)});
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();const paused=await read();await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.deepEqual((await read()).terrain,paused.terrain);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.equal((await read()).players[0].inventory.cards.relocate,0);
  const fog=fresh('inverse');fog.cells=[0,1,2].map(x=>({x,y:0,id:'hidden-'+x,symbol:'X',owner:'local-x'}));for(let i=0;i<36;i++)advanceInverseFog(fog,()=>0);assert.equal(fog.fogEffects[0].turnsRemaining,18);await load(fog);
  assert.match(await page.locator('.inverse-fog-notice').getAttribute('aria-label'),/18 turnos totales/);assert.ok(await page.locator('.inverse-fog-notice').evaluate(n=>n.getBoundingClientRect().height<=48));assert.equal(await page.locator('.board .fog-occupied').count(),3);assert.equal(await page.locator('.board .fog-empty').count(),6);
  for(const label of await page.locator('.board .fog-occupied').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label'))))assert.match(label,/signo oculto/);
  assert.equal(await page.locator('.board-inventory-status [data-tool="relocate"]').count(),0);await page.locator('[data-action="inverse-claim-toggle"]:visible').click();assert.equal(await page.locator('.inverse-claim-highlight').count(),0);
  await page.locator('.fog-occupied[data-x="0"][data-y="0"]').click();const claimed=await read();assert.ok(claimed.players[0].score>fog.players[0].score);assert.equal(claimed.fogEffects[0].turnsRemaining,17);
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.equal((await read()).fogEffects[0].turnsRemaining,17);assert.ok(await page.locator('.inspection-canvas .map-fog').count());
  if(width===390)await page.screenshot({path:path.join(output,`inventory-balance-r101-${name}-fog.png`)});
  const saved=await read(),storage={getItem:k=>k==='hash3_locals'?JSON.stringify([saved]):null,setItem(){}};assert.equal(captureTransfer(storage).games[0].fogEffects[0].turnsRemaining,17);
  results.push({name,width,height,currentProductionDefaults:true,relocateTwoClicksAndCancel:true,nineCardBag:true,pauseReloadConserved:true,inverseFogAndBlindClaim:true,transfer:true});console.log(`PASS R101 ${name} ${width}×${height}: relocate, memory claim, pause and transfer`);
 }
 await page.setViewportSize({width:390,height:844});const full=fresh();full.players[0].score=9999;for(const k in full.players[0].inventory.cards)full.players[0].inventory.cards[k]=0;Object.assign(full.players[0].inventory.cards,{double:3,hint:3,erase:3});await load(full);
 const trigger=page.locator('[data-action="refill-hold"]'),box=await trigger.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(1150);await page.mouse.up();await page.locator('.refill-selector').waitFor();assert.equal(await page.locator('.refill-capacity').innerText(),'9/9');assert.equal(await page.locator('.refill-selector [data-tool="immunity"]').count(),0);assert.equal(await page.locator('.refill-selector [data-action="refill-buy"]:not(:disabled)').count(),0);await page.locator('[data-action="close-refill"]').click();
 const large=fresh();large.terrain=tiles(33333);await load(large);await relocate().click();assert.ok(await page.locator('.board .terrain-cell').count()<1500);await page.locator('.terrain-cell[data-x="1"][data-y="1"]').click();assert.ok(await page.locator('.activation-hole').count()<1500);await page.locator('[data-action="cancel-tool-selection"]').click();assert.equal((await read()).terrain.length,33333);
 for(const [kind,duration]of [['clouds',9],['fog',18]]){const g=fresh();activateFog(g,{id:kind,kind},g.terrain);await load(g);const free=page.locator('.fog-empty[data-action="move"]').first();await free.click();assert.equal((await read()).fogEffects[0].turnsRemaining,duration-1);}
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inventory-balance-r101-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inventory-balance-r101.json'),JSON.stringify({cases:results,nativeDeviceTested:false},null,2));}
console.log(`R101: ${results.length} current-default browser cases passed; relocation, fog, capacity, market, saves and33333`);
