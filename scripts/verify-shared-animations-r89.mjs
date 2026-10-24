import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const engines={chromium,firefox,webkit};
function fixture(variant,w=9,h=9){const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',true,{variant,board:{id:'qa-r89',name:'QA',terrain:Array.from({length:w*h},(_,i)=>({x:i%w-(w>166?Math.floor(w/2):0),y:Math.floor(i/w)-(h>166?Math.floor(h/2):0)}))},faunaEnabled:false,territoryEnabled:false,random:()=>.99});g.terrain=Array.from({length:w*h},(_,i)=>({x:i%w-(w>166?Math.floor(w/2):0),y:Math.floor(i/w)-(h>166?Math.floor(h/2):0)}));g.pairs[0].active={x:0,y:0};return g;}
try{for(const [name,engine]of Object.entries(engines)){
 if(process.env.HASH3_QA_ENGINES&&!process.env.HASH3_QA_ENGINES.split(',').includes(name))continue;
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[],online=[];page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const load=async g=>{await page.goto(origin);await page.evaluate(g=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([g]));localStorage.setItem('hash3_local',JSON.stringify({id:g.id}));sessionStorage.setItem('hash3_restore_local','1');},g);await page.reload();await page.locator('.game .viewport').waitFor();await frame();assert.equal(await page.locator('.cell-effect').count(),0);await page.evaluate(()=>{window.r89Actions=[];new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes){if(!(n instanceof Element))continue;for(const e of [...(n.matches('[data-animation-kind]')?[n]:[]),...n.querySelectorAll('[data-animation-kind]')]){const css=getComputedStyle(e);window.r89Actions.push({kind:e.dataset.animationKind,name:css.animationName,duration:css.animationDuration});}}}).observe(document.body,{childList:true,subtree:true});});};
 const clickCell=async(x,y)=>{await page.locator('.viewport').evaluate((v,p)=>{const c=v.querySelector('.terrain-cell[data-x][data-y]'),size=parseFloat(c.style.width);v.scrollLeft=parseFloat(c.style.left)+(p.x-Number(c.dataset.x)+.5)*size-v.clientWidth/2;v.scrollTop=parseFloat(c.style.top)+(p.y-Number(c.dataset.y)+.5)*size-v.clientHeight/2;},{x,y});await frame();const c=page.locator(`.board .terrain-cell[data-x="${x}"][data-y="${y}"]`);await c.evaluate(e=>e.click());await frame();};
 const effect=()=>page.locator('.cell-effect').first();
 const profile=()=>effect().evaluate(e=>{const s=getComputedStyle(e);return {name:s.animationName,duration:s.animationDuration,pointer:s.pointerEvents,color:s.color,ring:getComputedStyle(e.querySelector('.effect-ring')).animationName};});
 for(const [width,height]of (process.env.HASH3_QA_QUICK?[[390,844]]:[[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]])){
  console.log(name,width,height);await page.setViewportSize({width,height});const profiles=[];
  for(const variant of ['original','inverse']){
   await load(fixture(variant));await clickCell(1,1);assert.equal(await page.locator('[data-cell-effect="place"]').count(),1);profiles.push(await profile());
   await effect().evaluate(e=>{window.r89Node=e;window.r89Time=e.getAnimations()[0].currentTime;});const saved=await stored();await page.locator('.viewport').evaluate(e=>{e.scrollLeft+=8;e.dispatchEvent(new Event('scroll'));});await frame();assert.ok(await effect().evaluate(e=>e===window.r89Node&&e.getAnimations()[0].currentTime>=window.r89Time),'Pan must retain the live node and timeline');assert.deepEqual(await stored(),saved);
   if(width===390)await page.screenshot({path:path.join(output,`a-shared-place-r89-${name}-${variant}.png`)});
   await page.locator('[data-action="pause"]').evaluate(e=>e.click());await page.locator('.paused-game').waitFor();assert.equal(await page.locator('.cell-effect').count(),0);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.equal(await page.locator('.cell-effect').count(),0);
   await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.equal(await page.locator('.cell-effect').count(),0);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.equal(await page.locator('.cell-effect').count(),0);
   const erased=fixture(variant);erased.cells=[{x:1,y:1,id:'o',symbol:'O',owner:'local-o'}];erased.players[0].inventory.cards.erase=1;await load(erased);await page.locator('.board-inventory-status [data-tool="erase"]').evaluate(e=>e.click());await clickCell(1,1);assert.equal(await page.locator('[data-cell-effect="clear"]').count(),1);assert.ok(await page.evaluate(()=>window.r89Actions.some(e=>e.kind==='erase'&&e.name==='piece-erase'&&e.duration==='0.9s')),'Erase must create its real 900ms animation');assert.equal((await profile()).duration,'1.8s');assert.deepEqual((await stored()).inverseFill,erased.inverseFill);
   await page.emulateMedia({reducedMotion:'reduce'});await load(fixture(variant));await clickCell(1,1);assert.equal((await profile()).name,'none');await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.deepEqual(profiles[0],profiles[1]);assert.equal(profiles[0].duration,'1.8s');assert.equal(profiles[0].pointer,'none');
  // Same backed warning and immutable live/paused map in both variants.
  for(const variant of ['original','inverse']){
   const g=fixture(variant);if(variant==='inverse'){g.inverseFill=g.inverseFill.filter(k=>k!=='1,1');g.inverseCleared=1;Object.assign(g.inverseContour,{turns:63,next:66,targets:['2,1']});Object.assign(g.inverseContour.renewal,{next:66,targets:['1,1']});}else{g.territoryEnabled=true;g.territoryEvents=[{id:'warning',kind:'ufo',region:[{x:2,y:1}],turnsRemaining:3,announcedTurn:0}];}
   await load(g);const dash=page.locator('.board .cell-warning .warning-dashes').first();assert.equal(await dash.evaluate(e=>getComputedStyle(e).strokeWidth),'3px');assert.equal(await dash.evaluate(e=>getComputedStyle(e).animationName),'cell-warning-march');const saved=await stored();await page.locator('[data-action="map"]').click();assert.ok(await page.locator('.world-map .map-territory-threat').count()>0);if(variant==='inverse')assert.ok(await page.locator('.world-map .map-warning-restore').count()>0);assert.deepEqual(await stored(),saved);await page.locator('[data-action="close-map"]').click();if(width===390)await page.screenshot({path:path.join(output,`a-shared-warning-r89-${name}-${variant}.png`)});await page.locator('[data-action="pause"]').click();assert.ok(await page.locator('.paused-game .map-territory-threat').count()>0);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({name,width,height,variants:2,samePlacement:true,sameErasure:true,sameWarning:true,liveAndPausedMaps:true,noPanReplay:true,noLoadOrResumeReplay:true,reducedMotion:true,conservedSave:true});
 }
 // A large board still draws only a visible window, including effect layers.
 for(const variant of ['original','inverse']){await page.setViewportSize({width:390,height:844});await load(fixture(variant,181,184));await clickCell(1,1);assert.ok(await page.locator('.terrain-cell').count()<2000);assert.ok(await page.locator('.cell-effect').count()<=500);const saved=await stored();await page.locator('.viewport').evaluate(e=>{e.scrollLeft+=2000;e.scrollTop+=2000;e.dispatchEvent(new Event('scroll'));});await frame();assert.ok(await page.locator('.terrain-cell').count()<2000);assert.deepEqual(await stored(),saved);}
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`shared-animations-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'shared-animations-r89.json'),JSON.stringify(results,null,2));}
console.log(`R89: ${results.length} browser/viewport cases passed for both variants, plus large-board navigation.`);
