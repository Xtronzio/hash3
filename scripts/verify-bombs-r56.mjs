import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
try{
 for(const [name,engine] of Object.entries({chromium,webkit,firefox})){
  const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:name!=='firefox',serviceWorkers:'block'});
   const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:true});
   game.terrain=Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)}));game.invasionVersion=1;
   const region=[{x:1,y:1},{x:2,y:1},{x:1,y:2},{x:2,y:2}];game.invasions=[{id:'bomb-r56',kind:'invader-rain',grown:4,failed:0,visited:region}];
   game.cells=region.map(p=>({...p,id:`bomb:${p.x}:${p.y}`,symbol:'*',owner:null,invader:true,invasionId:'bomb-r56'}));game.cells.push({x:4,y:4,id:'stable',symbol:'*',owner:null});
   game.players[0].score=14241;game.players[0].freeExpansions=58;game.players[0].inventory.cards.sapper=1;
   const errors=[],requests=[];context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
   const before=await read();const card=page.locator('.board-inventory-status [data-tool="sapper"]');assert.equal(await card.isEnabled(),true);assert.equal(await card.locator('[data-icon="disarm-cross"]').count(),1);
   const tap=async locator=>name==='firefox'?locator.click():locator.tap();await tap(card);
   const target=page.locator('.terrain-cell[data-x="1"][data-y="1"]');await target.waitFor();assert.equal(await target.getAttribute('data-action'),'inventory-target');assert.equal(await target.locator('[data-invasion-bomb="active"]').count(),1);assert.equal(await target.locator('[data-icon="disarm-cross"]').count(),1);
   assert.equal(await target.locator('[data-icon="invasion-bomb"]').evaluate(el=>getComputedStyle(el).fill),'rgb(255, 206, 51)');
   await page.screenshot({path:path.join(output,`bombas-artificieros-r56-${name}.png`)});await tap(target);
   const after=await read();assert.equal(after.lastEvent.disarmed,3);assert.equal(after.cells.filter(c=>c.invasionId==='bomb-r56').length,1);assert.deepEqual(after.terrain,before.terrain);assert.deepEqual(after.pairs,before.pairs);assert.equal(after.players[0].score,14241);assert.equal(after.players[0].freeExpansions,58);assert.deepEqual(after.players[1],before.players[1]);assert.deepEqual(after.invasions,before.invasions);assert.equal(after.players[0].inventory.cards.sapper,0);
   await page.screenshot({path:path.join(output,`bombas-desactivadas-r56-${name}.png`)});
   await tap(page.locator('[data-action="pause"]'));await tap(page.locator('[data-action="go-hall"]'));await page.locator('.hall-header').waitFor();
   for(const size of [{width:320,height:740},{width:390,height:844},{width:980,height:900}]){
    await page.setViewportSize(size);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const boxes=await page.locator('.hall-header').evaluate(el=>({logo:el.querySelector('.brand-mark').getBoundingClientRect().toJSON(),menu:el.querySelector('.hall-icon-button').getBoundingClientRect().toJSON(),profile:el.querySelector('.hall-profile').getBoundingClientRect().toJSON()}));
    assert.equal(boxes.logo.height,size.width<=600?38:42);assert.ok(boxes.logo.width>70);assert.ok(boxes.menu.x+boxes.menu.width<=boxes.logo.x);assert.ok(boxes.logo.x+boxes.logo.width<=boxes.profile.x);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,`hall-logo-r56-${name}-${size.width}.png`)});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,activeSapperSelectable:true,boldYellowBombAndRedCross:true,threeSameFocusOnly:true,terrainScoreReservesTurnOpponentAndGrowthPreserved:true,hallLogo38pxMobile42pxDesktop:true,noOverflowOrOnlineRequests:true,passed:true});await context.close();
  }catch(error){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,`fallo-r56-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'bombs-r56-results.json'),JSON.stringify(results,null,2));await new Promise(r=>server.httpServer.close(r));}
