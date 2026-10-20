import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='#'?null:symbol==='X'?'local-x':'local-o'});
const make=()=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>0});g.cells=[tile(0,0),tile(1,0),tile(2,0),tile(0,3,'O'),tile(1,3,'O'),tile(5,5,'#')];Object.assign(g.inversePrison.players.X,{turns:6,since:6,limit:9});Object.assign(g.inversePrison.players.O,{turns:7,since:7,limit:9});return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[],online=[];
 page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 const choose=async(x,y,action='move')=>{const c=page.locator(`.board [data-action="${action}"][data-x="${x}"][data-y="${y}"]`);await c.evaluate(el=>el.scrollIntoView({block:'start',inline:'start'}));await c.click({position:{x:5,y:5}});};
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});let g=make();await load(g);
  assert.match(await page.locator('.inverse-bee-notice').textContent(),/X: 3 turnos propios.*O: 2/);assert.match(await page.locator('.inverse-bee-badge[data-bee-symbol="X"]').getAttribute('aria-label'),/quedan 3 turnos propios/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const button=await page.locator('[data-action="inverse-claim-toggle"]:visible').boundingBox();assert.ok(button.width>=44&&button.height>=44);assert.ok(await page.locator('.inverse-bee-clocks .inverse-bee-badge').evaluateAll(els=>els.length===2&&els.every(el=>{const b=el.getBoundingClientRect(),p=el.closest('.inverse-bee-clocks').getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1&&b.top>=p.top-1&&b.bottom<=p.bottom+1;})),'Both bee badges must stay within their visible row');
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-bees-warning-r81-${name}.png`)});
  const before=await stored();await page.locator('.game-minimap').click();await page.locator('.world-map:visible').waitFor();assert.match(await page.locator('.inverse-bee-notice').textContent(),/X: 3/);assert.deepEqual((await stored()).inversePrison,before.inversePrison);await page.locator('[data-action="close-map"]').click();
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.match(await page.locator('.inverse-bee-notice').textContent(),/Pausa: cuenta detenida/);await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();assert.deepEqual((await stored()).inversePrison,before.inversePrison);await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();assert.deepEqual((await stored()).inversePrison,before.inversePrison);
  await page.locator('[data-action="inverse-claim-toggle"]:visible').click();assert.deepEqual((await stored()).inversePrison,before.inversePrison);await choose(0,0,'inverse-claim-cell');assert.equal(await page.locator('[data-action="inverse-claim-confirm"]').count(),0);let n=await stored();assert.equal(n.players[0].score,3);assert.equal(n.inversePrison.players.X.since,0);assert.deepEqual(n.inversePrison.players.O,g.inversePrison.players.O);assert.match(await page.locator('.inverse-bee-notice').textContent(),/O: 2/);if(n.inversePrison.players.X.limit>3)assert.doesNotMatch(await page.locator('.inverse-bee-notice').textContent(),/X: [123]/);else assert.match(await page.locator('.inverse-bee-notice').textContent(),/X: 3/);
  g=make();g.players[0].score=33;Object.assign(g.inversePrison.players.X,{turns:8,since:8});await load(g);await choose(3,0);n=await stored();assert.equal(n.inversePrison.players.X.remaining,3);assert.equal(n.inversePrisonEvent.symbol,'X');assert.equal(n.players[0].score,33);assert.equal(n.players[1].score,0);assert.deepEqual(n.terrain,g.terrain);assert.deepEqual(n.inverseFill,g.inverseFill);assert.equal(n.cells.length,g.cells.length+1);assert.equal(new Set(n.cells.map(c=>`${c.x},${c.y}`)).size,n.cells.length);
  for(const c of g.cells){const moved=n.cells.find(p=>p.id===c.id);assert.deepEqual(moved,c);}
  assert.match(await page.locator('.inverse-bee-notice').textContent(),/X en la cárcel · 3/);assert.equal(await page.locator('.board .inverse-prison-bars').count(),4);
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-bees-swarm-r81-${name}.png`)});
  const event=n.inversePrisonEvent;await page.locator('[data-action="pause"]').click();assert.equal(await page.locator('.inverse-bee-swarm').count(),0);await page.locator('[data-action="resume"]').click();assert.deepEqual((await stored()).inversePrisonEvent,event);assert.equal(await page.locator('.inverse-bee-swarm').count(),0);
  results.push({name,width,height,warning:true,individual:true,pauseReload:true,paidReset:true,swarm:true,conservation:true,noReplay:true});
 }
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});let g=make();Object.assign(g.inversePrison.players.X,{turns:8,since:8});await load(g);await choose(3,0);assert.equal(await page.locator('.board .inverse-prison-bars').first().evaluate(el=>getComputedStyle(el).animationName),'none');await page.screenshot({path:path.join(output,`a-inverse-bees-reduced-r81-${name}.png`)});await page.emulateMedia({reducedMotion:'no-preference'});
 // Missing R80 state starts on the next accepted command, not by opening a save.
 g=make();delete g.inversePrison;g.players[0].placements=999;await load(g);assert.equal((await stored()).inversePrison,undefined);await choose(3,0);assert.equal((await stored()).inversePrison.players.X.since,1);assert.equal((await stored()).inversePrisonEvent,undefined);
 // A real machine Worker uses the published warning and cashes before impact.
 g=make();g.mode='solo';g.humanId='local-x';g.difficulty='pro';g.machineInventory=true;g.pairs[0].turn='O';g.cells=[tile(0,0,'O'),tile(1,0,'O'),tile(2,0,'O')];Object.assign(g.inversePrison.players.O,{turns:8,since:8});await load(g);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[1].score===3);const bot=await stored();assert.equal(bot.lastEvent.kind,'claim');assert.equal(bot.inversePrison.players.O.since,0);assert.equal(bot.inversePrisonEvent,undefined);
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inverse-bees-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-bees-r81.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R81: ${results.length} viewport/engine cases, pause/reload, swarm and real Worker passed`);
