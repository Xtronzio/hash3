import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
import {activateFog} from '../src/fog.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
function fixture(size=81){const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:true,territoryEnabled:true});r.terrain=Array.from({length:size},(_,i)=>({x:i%(size===81?9:183),y:Math.floor(i/(size===81?9:183))}));r.territoryNextPlacement=r.territoryNextInvasion=r.territoryNextDeathTurn=999999;r.cells=['X','O','#','*'].map((symbol,x)=>({id:'p'+x,x,y:0,symbol,owner:symbol==='X'?'local-x':symbol==='O'?'local-o':null}));activateFog(r,{id:'fog',kind:'fog'},Array.from({length:33},(_,i)=>({x:i%9,y:Math.floor(i/9)})));r.anacondas=[{id:'snake',kind:'anaconda',x:0,y:5,route:Array.from({length:9},(_,x)=>({x,y:5})),body:[],cursor:0,warningTurns:3}];return r;}
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
 try{const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[],online=[];
 page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});await load(fixture());
  const occupied=page.locator('.board .fog-occupied'),empty=page.locator('.board .fog-empty');assert.ok(await occupied.count()>0);assert.ok(await empty.count()>0);
  for(const element of await occupied.all()){const label=await element.getAttribute('aria-label'),classes=await element.getAttribute('class');assert.match(label,/ocupada, signo oculto/);assert.doesNotMatch(label,/X de|O de|Comodín|invasores/);assert.doesNotMatch(classes,/(?:^|\s)(?:x|o|invader|neutral|wildcard-x|wildcard-o|target|last)(?:\s|$)/);}
  const exposed=await page.locator('.board .fog-empty[data-action="move"]').evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:e.dataset.x,y:e.dataset.y,exposed:hit?.closest('button')===e};}).find(p=>p.exposed));
  assert.ok(exposed,JSON.stringify({engine:name,width,reason:'No exposed free fog point'}));const point=page.locator(`.board .fog-empty[data-action="move"][data-x="${exposed.x}"][data-y="${exposed.y}"]`),dot=point.locator('.fog-placement-point');assert.ok(await dot.isVisible());assert.equal(await dot.evaluate(e=>getComputedStyle(e).fill),'rgb(255, 255, 255)');await point.click({trial:true});
  assert.ok(await page.locator('[data-ecology-kind="anaconda"]').count());assert.ok(await page.locator('[data-ecology-kind="fog"]').count());assert.ok(await page.locator('[data-ecology-kind="clouds"]').count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width===390){await page.screenshot({path:path.join(output,`a-fauna-fog-r76-${name}.png`)});const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);await point.click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(after.cells.length,before.cells.length+1);assert.equal(after.fogEffects[0].turnsRemaining,2);await page.locator('[data-action="pause"]').click();await page.locator('.inspection-canvas').waitFor();assert.ok(await page.locator('.inspection-canvas .map-fog').count());assert.equal(await page.locator('.inspection-canvas [data-symbol]').count(),0);await page.screenshot({path:path.join(output,`a-fauna-fog-pause-r76-${name}.png`)});}
  results.push({engine:name,width,height,neutralSigns:true,pointVisibleAndClickable:true,passed:true});
 }
 await page.setViewportSize({width:390,height:844});const moving=fixture();moving.fogEffects=[];moving.anacondas[0].warningTurns=1;await load(moving);await page.locator('.board [data-action="move"][data-x="1"][data-y="1"]').click();const action=page.locator('.board [data-animation-kind="anaconda"]').first();await action.waitFor();assert.ok(await action.evaluate(e=>e.getAnimations().length>0));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].anacondas[0].cursor),3);
 await load(fixture(33333));assert.ok(await page.locator('.board .terrain-cell').count()<1000);assert.ok(await page.locator('.board').evaluate(e=>e.children.length)<1500);await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.fog-placement-point').first().isVisible(),true);assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();console.log('PASS R76 fog, input, maps, fauna, six viewports, 33333 cells:',name);
 }finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'fauna-fog-r76.json'),JSON.stringify(results,null,2));await server.close();}
