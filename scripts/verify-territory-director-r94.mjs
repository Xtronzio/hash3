import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {considerTerritory} from '../src/inhabitants.js';
import {announceDirectedTerritory} from '../src/territory-tools.js';
import {markTerritoryGrowth} from '../src/territory-director.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const fresh=options=>createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,options);
const fixture=()=>{const g=fresh({fauna:['rodent'],phenomena:['tornado']});g.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));g.cells=g.terrain.slice(0,50).map((c,i)=>({...c,id:'piece:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));markTerritoryGrowth(g);assert.ok(considerTerritory(g,Date.now(),()=>.4));assert.ok(announceDirectedTerritory(g,{kind:'tornado',tier:'large'},Date.now(),()=>.4));return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({serviceWorkers:'block',hasTouch:true});page=await context.newPage();const errors=[],online=[];
  page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async g=>{await page.goto(origin);await page.evaluate(g=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([g]));localStorage.setItem('hash3_local',JSON.stringify({id:g.id}));sessionStorage.setItem('hash3_restore_local','1');},g);await page.reload();await page.locator('.game .viewport').waitFor();await frame();};
  for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
   console.log(name,width,height);await page.setViewportSize({width,height});await load(fixture());const before=await stored();
   for(const kind of ['rodent','tornado'])assert.match(await page.locator(`.board-territory-status [data-ecology-kind="${kind}"]`).innerText(),/−3/);
   await page.locator('.board .available').first().click();await frame();const after=await stored();assert.equal(after.rodentRaids[0].warningTurns,2);assert.equal(after.territoryEvents[0].turnsRemaining,2);assert.deepEqual(after.territoryEvents[0].region,before.territoryEvents[0].region);
   await page.locator('[data-action="pause"]').click();const paused=await stored();await page.locator('[data-action="resume"]').click();await frame();const resumed=await stored();assert.deepEqual(resumed.territoryDirector,paused.territoryDirector);assert.deepEqual(resumed.territoryEvents,paused.territoryEvents);
   const full=fixture();full.cells=full.terrain.map((c,i)=>({...c,id:'full:'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));await load(full);const original=await stored();assert.equal(await page.locator('.expansion-controls').count(),1);
   await page.locator('.board [data-action="select-expansion"]').first().click();await page.locator('[data-action="confirm-expansion"]').click();await frame();const grown=await stored();assert.ok(grown.terrain.length>99);assert.deepEqual(grown.cells,original.cells);assert.deepEqual(grown.territoryEvents,original.territoryEvents);assert.deepEqual(grown.rodentRaids,original.rodentRaids);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===390)await page.screenshot({path:path.join(output,`territory-director-r94-${name}.png`)});results.push({name,width,height,smallLargeCoexist:true,committedWarning:true,pauseConserved:true,growthBeforeClearing:true});
  }
  // Setup controls are the actual icon buttons, not only their hidden select.
  await page.setViewportSize({width:390,height:844});await page.goto(origin);await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();await page.locator('.hall-mode[data-mode="offline"]').click();await page.locator('[data-action="setup-local"]').click();
  await page.locator('[data-setup-select="local-time-mode"][data-value="untimed"]').click();await page.locator('[data-setup-select="local-goal-type"][data-value="time"]').click();await page.locator('[data-setup-select="local-goal-target"][data-value="33"]').click();
  const timed=page.locator('[data-setup-select="local-time-mode"][data-value="timed"]'),untimed=page.locator('[data-setup-select="local-time-mode"][data-value="untimed"]');assert.match(await timed.innerText(),/3 s \/ turno · obligatorio/);assert.equal(await untimed.isDisabled(),true);assert.equal(await page.locator('#local-time-mode').inputValue(),'timed');
  await page.locator('[data-action="setup-variant"][data-variant="inverse"]').click();assert.equal(await untimed.isDisabled(),false);await page.locator('[data-action="setup-variant"][data-variant="original"]').click();assert.equal(await untimed.isDisabled(),true);
  await page.locator('[data-setup-select="local-goal-target"][data-value="180"]').click();assert.equal(await untimed.isDisabled(),false);await untimed.click();assert.equal(await page.locator('#local-time-mode').inputValue(),'untimed');await page.locator('[data-setup-select="local-goal-target"][data-value="33"]').click();
  await page.locator('#local-name').fill('Jorge');await page.locator('[data-action="start-local"]').click();await page.locator('.game .viewport').waitFor();const rapid=await stored();assert.equal(rapid.turnSeconds,3);assert.equal(rapid.timeMode,'timed');assert.equal(Date.parse(rapid.pairs[0].deadline)-Date.parse(rapid.createdAt),3000);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].cells.length>0,null,{timeout:7000});await page.locator('[data-action="ranking"]').click();assert.match(await page.locator('.game-details').innerText(),/Reloj\s*3 segundos por turno/);await page.locator('[data-action="ranking"]').click();await page.locator('[data-action="pause"]').click();await page.locator('.paused-scores').click();assert.match(await page.locator('.paused-extra').innerText(),/Reloj\s*3 segundos por turno/);
  const large=fresh({faunaEnabled:false,territoryEnabled:true,phenomena:['clouds']});large.terrain=Array.from({length:33333},(_,i)=>({x:i%183,y:Math.floor(i/183)}));await load(large);const largeBefore=await stored();assert.ok(await page.locator('.terrain-cell').count()<2000);await page.locator('.viewport').evaluate(v=>{v.scrollLeft+=2000;v.scrollTop+=1000;v.dispatchEvent(new Event('scroll'));});await frame();assert.ok(await page.locator('.terrain-cell').count()<2000);assert.deepEqual(await stored(),largeBefore);
  assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`territory-director-r94-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'territory-director-r94.json'),JSON.stringify(results,null,2));}
console.log(`R94: ${results.length} browser/viewport cases, mandatory three-second clocks and 33333-cell navigation passed.`);
