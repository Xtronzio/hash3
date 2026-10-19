// Mobile engine emulation; this does not claim physical-device testing.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {practiceTools} from '../src/practice-tools.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
try{
 for(const [name,engine] of Object.entries({chromium,webkit,firefox})){
  const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:name!=='firefox',serviceWorkers:'block'}),errors=[],requests=[];
   context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','high','X',false,{faunaEnabled:true,territoryEnabled:true});
   game.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));game.territoryNextPlacement=game.territoryNextInvasion=99999;
   game.deadCells=[{x:1,y:1}];game.frontiers=[{id:'old-beaver',type:'beaver',cells:[{x:-1,y:0},{x:-1,y:1},{x:-1,y:2}],turnsRemaining:9,bornTurn:-1}];
   const rhino=[{x:3,y:0},{x:4,y:0},{x:5,y:0}],worm=[{x:3,y:3},{x:4,y:3},{x:5,y:3}],beaver=[{x:2,y:6},{x:3,y:6},{x:4,y:6}];
   game.faunaEvents=[{id:'rhino-qa',kind:'rhino',paths:[rhino],region:rhino,x:3,y:0,turnsRemaining:2},{id:'beaver-qa',kind:'beaver',paths:[beaver],region:beaver,x:2,y:6,turnsRemaining:1}];
   game.worms=[{id:'worm-qa',kind:'worm',x:3,y:3,route:worm,body:[],brief:true,turnDriven:true,mealLimit:3,eaten:0,warningTurns:1}];
   game.cells=[...rhino,...worm].map((p,i)=>({...p,id:'food-'+i,symbol:'O',owner:'local-o'}));
   const inv=game.players[0].inventory;for(const t of practiceTools)inv.cards[t.id]=0;for(const t of practiceTools.slice(0,6))inv.cards[t.id]=3;
   game.players[0].score=9999;inv.immunity.cards={'immunity-1':0,'immunity-3':0,'immunity-33':0};
   await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();await page.evaluate(()=>document.fonts.ready);
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]),tap=async el=>name==='firefox'?el.click():el.tap();
   for(const kind of ['rhino','rhino-plague','beaver','beaver-plague','death'])assert.equal(await page.locator(`.board-territory-status [data-ecology-kind="${kind}"]`).count(),1);
   assert.equal(await page.locator('.board-territory-status [data-ecology-countdown="rhino"]').textContent(),'−2');
   await tap(page.locator('.board-territory-status [data-ecology-kind="death"]'));
   assert.equal(await page.locator('.board .dead-cell').count(),1);assert.equal(await page.locator('.board .dead-cell').getAttribute('data-action'),null);
   assert.ok(await page.locator('.board .territory-warning.territory-rhino').count()>0);
   assert.notEqual(await page.locator('.board .territory-warning.territory-rhino .warning-dashes').first().evaluate(e=>getComputedStyle(e).strokeDasharray),'none');
   // The Death jump scrolls the viewport. A hold deliberately cancels on any
   // scroll event: let WebKit deliver that navigation before pressing Recharge.
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForTimeout(150);
   const trigger=page.locator('.refill-trigger');if(name==='firefox'){await trigger.focus();await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');}else{const box=await trigger.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();}await page.locator('.refill-selector').waitFor();
   const buy=page.locator('[data-action="refill-buy"][data-tool="immunity"]');assert.equal(await buy.isEnabled(),true);assert.match(await buy.innerText(),/333/);await buy.evaluate(e=>e.scrollIntoView({block:'nearest'}));await tap(buy);
   let saved=await read();assert.equal(saved.players[0].score,9666);assert.equal(saved.players[0].inventory.immunity.cards['immunity-1'],1);assert.equal(Object.values(saved.players[0].inventory.cards).reduce((a,b)=>a+b),18);
   await tap(page.locator('[data-action="refill-mode"][data-mode="exchange"]'));assert.equal(await page.locator('.refill-card[data-tool="immunity"]').count(),0);await tap(page.locator('[data-action="close-refill"]'));
   const move=async(x,y)=>{const cell=page.locator(`.board [data-action="move"][data-x="${x}"][data-y="${y}"]`);await cell.evaluate(e=>e.scrollIntoView({block:'center',inline:'center'}));await tap(cell);await page.waitForFunction(([x,y])=>JSON.parse(localStorage.getItem('hash3_locals'))[0].cells.some(c=>c.x===x&&c.y===y),[x,y]);};
   await move(4,4);saved=await read();assert.equal(saved.worms.length,0);assert.equal(saved.frontiers.filter(f=>f.type==='beaver').length,2);assert.equal(saved.frontiers.find(f=>f.id!=='old-beaver').turnsRemaining,9);assert.equal(saved.faunaEvents[0].turnsRemaining,1);
   const immunity=page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"]');assert.equal(await immunity.isEnabled(),true);await tap(immunity);assert.equal((await read()).pairs[0].turn,'O');assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"] [data-immunity-clock="local-x"]').textContent(),'3');
   await move(0,4);saved=await read();assert.equal(saved.faunaEvents.length,0);assert.equal(saved.cells.filter(c=>rhino.some(p=>c.x===p.x&&c.y===p.y)).length,0);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"] [data-immunity-clock="local-x"]').textContent(),'2');
   await move(0,5);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"] [data-immunity-clock="local-x"]').textContent(),'1');await move(0,6);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"] [data-immunity-clock="local-x"]').count(),0);
   assert.deepEqual((await read()).deadCells,[{x:1,y:1}]);assert.equal((await read()).terrain.length,81);assert.equal((await read()).players[0].score,9666);
   await tap(page.locator('.board-territory-status [data-ecology-kind="beaver-barrier"]'));assert.ok(await page.locator('.board .is-beaver .beaver-barrier-sign').count()>0);
   await page.screenshot({path:path.join(output,`fauna-breve-r62-${name}.png`)});await tap(page.locator('[data-action="pause"]'));const paused=await read();
   for(const size of [{width:320,height:740},{width:740,height:320}]){await page.setViewportSize(size);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await page.locator('.inspection-canvas .map-dead-cells').count()>0);assert.ok(await page.locator('.inspection-canvas .beaver-barrier').count()>0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,`fauna-mapa-r62-${name}-${size.width}.png`)});}
   assert.deepEqual(await read(),paused);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,briefFaunaSingleTurn:true,deathImmutable:true,distinctBeaverBarrier:true,immunityPurchase333WithFullBag:true,noImmunityExchange:true,threeCompletedTurnProtection:true,pausedMapsAndMobileLandscape:true,passed:true});console.log('PASS brief fauna, immunity and paused maps:',name);await context.close();
  }catch(error){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,`fallo-r62-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'brief-ecology-r62-results.json'),JSON.stringify(results,null,2));await new Promise(r=>server.httpServer.close(r));}
