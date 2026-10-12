import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {createServer} from 'vite';
import {createLocal,localCommand} from '../src/local.js';
import {transferToken} from '../src/local-transfer.js';
import {practiceTools,MAX_CARDS} from '../src/practice-tools.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const results=[],requests=[],activeBrowsers=[];
function fixture(mode='local',size=9){
 const now=Date.now(),r=createLocal(mode,'Jorge','Rival',now,'normal','untimed','basic','O',true,{faunaEnabled:size>9,territoryEnabled:size>9});
 r.pairs[0].turn='O';r.terrain=Array.from({length:size},(_,i)=>({x:i%183,y:Math.floor(i/183)}));
 r.cells=r.terrain.filter((_,i)=>i%3===0).map((p,i)=>({...p,id:crypto.randomUUID(),symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
 r.players[0].score=31457;r.players[1].score=27603;r.players[0].inventory.cards.frontier=96;r.players[0].inventory.comboPending=1;r.players[0].inventory.immunity.cards['immunity-1']=333;r.players[0].freeExpansions=17;r.pairs[0].credits=18;
 r.frontiers=[{id:'wall',by:'local-x',cells:[{x:-1,y:0}]},{id:'border',type:'border',by:'local-o',cells:[{x:-1,y:1},{x:-1,y:2},{x:-1,y:3}]}];r.watchTargets=[{id:'marker',x:1,y:0,number:1}];
 return localCommand(r,'pause',{},now);
}
async function contextFor(browser,values={}){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());assert.ok(!r.url().includes('traslado='),'Transfer fragment must never be sent to a server');});
 await context.route('**/*.supabase.co/**',route=>route.abort());await context.route('**/version.json*',route=>route.fulfill({status:404,body:''}));
 await context.addInitScript(values=>{if(!sessionStorage.getItem('transfer-fixture-seeded')){for(const [k,v]of Object.entries(values))localStorage.setItem(k,v);sessionStorage.setItem('transfer-fixture-seeded','1');}},values);
 return context;
}
const read=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('hash3_')).map(k=>[k,localStorage.getItem(k)])));
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 for(const [name,type]of [['chromium',chromium],['webkit',webkit],['firefox',firefox]]){
  const browser=await type.launch(name==='chromium'?{args:['--no-sandbox']}:{});
  activeBrowsers.push(browser);
  const games=[fixture('local',33333),fixture('solo'),fixture('local')];games[2].status='finished';games[2].ruleVersion=15;
  const archive={game:games[2].id,kind:'move-limit',mode:'local',limit:33,size:9,players:structuredClone(games[2].players),ruleVersion:15,completedAt:new Date().toISOString()};games[2].finalResult=archive;
  const deletedResult={...structuredClone(archive),game:'deleted-source-game'};
  const values={hash3_locals:JSON.stringify(games),hash3_local:JSON.stringify({id:games[0].id}),hash3_name:'Jorge',hash3_game_pins:JSON.stringify(['local:'+games[0].id]),hash3_completed_territories:JSON.stringify([deletedResult]),'sb-fake-auth-token':'NOT-TRANSFERRED',hash3_profile_token:'NOT-TRANSFERRED'};
  const source=await contextFor(browser,values),from=await source.newPage(),errors=[];from.on('pageerror',e=>errors.push(e.message));await from.goto(origin);await from.locator('[data-action="hall-profile"]').click();
  const sourceBefore=await read(from);await from.locator('[data-transfer-action="generate"]').click();await from.locator('#transfer-ready').waitFor({state:'visible'});
  const link=await from.locator('#transfer-export').inputValue(),token=transferToken(link,origin);assert.ok(token);assert.ok(link.length<1900000);assert.deepEqual(await read(from),sourceBefore,'Preparing a transfer must not alter the origin');
  for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){await from.setViewportSize(size);await settle(from);assert.ok(await from.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Profile transfer must fit the viewport');}
  await from.setViewportSize({width:390,height:844});await from.locator('.local-transfer').first().evaluate(el=>el.scrollIntoView());await from.screenshot({path:path.join(output,`traslado-origen-r52-${name}.png`)});
  const destinationGame=structuredClone(games[0]);destinationGame.players[0].score=99999;destinationGame.terrain=structuredClone(games[1].terrain);destinationGame.cells=structuredClone(games[1].cells);const other=fixture('local');
  const destinationValues={hash3_locals:JSON.stringify([destinationGame,other]),hash3_local:JSON.stringify({id:other.id}),hash3_name:'Destino',hash3_game_pins:JSON.stringify(['local:'+other.id]),hash3_completed_territories:'[]'};
  const destination=await contextFor(browser,destinationValues),to=await destination.newPage();to.on('pageerror',e=>errors.push(e.message));await to.goto(link,{timeout:60000});await to.locator('#transfer-preview').waitFor({state:'visible',timeout:60000});
  const targetBefore=await read(to);assert.equal(await to.locator('#transfer-preview [data-transfer-action="apply"]').count(),1);assert.equal(JSON.parse(targetBefore.hash3_locals).length,2,'An opened link must only preview the copy');
  const applyBox=await to.locator('#transfer-preview [data-transfer-action="apply"]').boundingBox();assert.ok(applyBox.y>=0&&applyBox.y+applyBox.height<=844,'Incoming link must show the review action without hunting below the fold');
  await to.screenshot({path:path.join(output,`traslado-destino-previo-r52-${name}.png`)});
  await to.locator('[data-transfer-action="cancel"]').click();assert.deepEqual(await read(to),targetBefore);await to.locator('#transfer-link').fill(link);await to.locator('#transfer-import-form button').click();await to.locator('#transfer-preview [data-transfer-action="apply"]').click();await to.locator('.saved-game').first().waitFor();
  const importedState=await read(to),imported=JSON.parse(importedState.hash3_locals);assert.equal(imported.length,5);assert.deepEqual(imported.find(g=>g.id===destinationGame.id),destinationGame);assert.deepEqual(imported.find(g=>g.id===other.id),other);assert.equal(importedState.hash3_name,'Destino');assert.equal(importedState.hash3_local,destinationValues.hash3_local);
  for(const original of games){
   const copy=imported.find(g=>g.transferOrigin?.game===original.id);assert.ok(copy);const comparison=structuredClone(copy);delete comparison.transferOrigin;comparison.id=original.id;if(comparison.finalResult?.game)comparison.finalResult.game=original.id;
   assert.deepEqual(comparison,original,'Every saved field must survive transport');
  }
  const copy=imported.find(g=>g.transferOrigin?.game===games[0].id);assert.notEqual(copy.id,destinationGame.id);assert.ok(JSON.parse(importedState.hash3_game_pins).includes('local:'+copy.id));assert.equal(JSON.parse(importedState.hash3_completed_territories).length,2);
  await to.goto(link,{timeout:60000});await to.locator('#transfer-preview').waitFor({state:'visible',timeout:60000});assert.equal(await to.locator('#transfer-preview [data-transfer-action="apply"]').count(),0);assert.deepEqual(await read(to),importedState,'Repeated link must neither duplicate nor overwrite progress');
  // The same packed copy can be downloaded and imported without a long URL.
  const fileContext=await contextFor(browser),filePage=await fileContext.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.goto(origin);await filePage.locator('[data-action="hall-profile"]').click();
  await filePage.locator('#transfer-file').setInputFiles({name:'bad.hash33',mimeType:'text/plain',buffer:Buffer.from(token.slice(0,-7))});await filePage.locator('#transfer-import-status[data-state="error"]').waitFor();assert.equal((await read(filePage)).hash3_locals,undefined);
  await filePage.locator('#transfer-file').setInputFiles({name:'hash33-partidas.hash33',mimeType:'text/plain',buffer:Buffer.from(token)});await filePage.locator('#transfer-preview').waitFor({state:'visible'});await filePage.locator('[data-transfer-action="apply"]').click();await filePage.locator('.saved-game').first().waitFor();assert.equal(JSON.parse((await read(filePage)).hash3_locals).length,3);
  if(name==='chromium'){
   const downloadEvent=from.waitForEvent('download');await from.locator('[data-transfer-action="download"]').click();const download=await downloadEvent;assert.equal(await fs.readFile(await download.path(),'utf8'),token);
   await download.saveAs(path.join(output,'copia-sintetica-r52.hash33'));
  }
  // Resume the imported human-O machine game and accept a normal move.
  const machineCopy=JSON.parse((await read(filePage)).hash3_locals).find(g=>g.mode==='solo');await filePage.locator(`[data-action="load-game"][data-id="${machineCopy.id}"]`).click();await filePage.locator('[data-action="resume"]').click();await filePage.locator('.board [data-action="move"]').first().click();
  const advanced=JSON.parse((await read(filePage)).hash3_locals).find(g=>g.id===machineCopy.id);assert.ok(advanced.version>machineCopy.version);assert.ok(advanced.cells.length>=machineCopy.cells.length);
  assert.deepEqual(errors,[]);results.push({browser:name,complete33333CellLink:true,urlChars:link.length,bytes:values.hash3_locals.length,originUnchanged:true,destinationPreserved:true,pinsAndArchiveMapped:true,repeatIdempotent:true,fileImport:true,damagedFileRejected:true,resumeImportedGame:true,passed:true});
  await source.close();await destination.close();await fileContext.close();await browser.close();
 }
 // Actual touch exchange through Recarga, preserving 18/18 and +1 after all three changes.
 const browser=await chromium.launch({args:['--no-sandbox']}),r=createLocal('local','X','O',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});r.players[0].score=999;
 for(const t of practiceTools)r.players[0].inventory.cards[t.id]=0;for(const id of ['double','opposite','rival','erase','frontier','border'])r.players[0].inventory.cards[id]=3;r.players[0].inventory.comboPending=1;
 activeBrowsers.push(browser);const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/version.json*',route=>route.fulfill({status:404,body:''}));await context.route('**/*.supabase.co/**',route=>route.abort());
 await context.addInitScript(r=>{localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);
 const page=await context.newPage();await page.goto(origin);await page.locator('.game .viewport').waitFor();
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 async function hold(){const cdp=await context.newCDPSession(page),b=await page.locator('.refill-trigger').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});await page.waitForTimeout(1100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 await hold();await page.locator('[data-action="refill-mode"][data-mode="exchange"]').tap();const before=await saved();await page.locator('[data-action="refill-replace"][data-tool="frontier"]').tap();assert.deepEqual(await saved(),before,'Selecting a replacement is read-only');await page.locator('[data-action="refill-buy"][data-tool="bomb"]').tap();
 let next=await saved();assert.equal(next.players[0].score,966);assert.equal(next.players[0].inventory.cards.frontier,2);assert.equal(next.players[0].inventory.cards.bomb,1);assert.equal(next.players[0].inventory.comboPending,1);assert.equal(await page.locator('.inventory-badge').innerText(),'18/18');assert.equal(await page.locator('.refill-remaining').innerText(),'2/3');
 assert.equal(await page.locator('#notice').evaluate(el=>getComputedStyle(el).color),'rgb(0, 229, 255)');
 const box=await page.locator('.refill-selector').boundingBox();assert.ok(box.height<=844*.47);await page.screenshot({path:path.join(output,'cambiar-carta-mochila-llena-r52.png')});
 for(const tool of ['tornado','reconquest']){await page.locator('[data-action="refill-replace"][data-tool="frontier"]').tap();const button=page.locator('[data-action="refill-buy"][data-tool="'+tool+'"]');await button.evaluate(el=>el.scrollIntoView());await button.tap();}
 assert.equal(await page.locator('.refill-selector').count(),0);next=await saved();assert.equal(next.players[0].score,600);assert.equal(Object.values(next.players[0].inventory.cards).reduce((a,b)=>a+b,0),18);assert.equal(next.players[0].inventory.comboPending,1);assert.equal(next.players[0].inventory.cards.frontier,0);assert.equal(next.players[0].inventory.exchanged,3);assert.deepEqual(next.pairs,before.pairs);assert.deepEqual(next.players[1],before.players[1]);assert.equal(MAX_CARDS,18);
 results.push({touchExchange:true,threeOperationsPerOpening:true,cap18:true,pendingNotSpent:true,cost33and333:true,opponentAndTurnPreserved:true,passed:true});await context.close();await browser.close();
 assert.equal(requests.length,0);results.push({supabaseRequests:0,passed:true});
}catch(error){let n=0;for(const browser of activeBrowsers)for(const context of browser.contexts())for(const page of context.pages())try{await page.screenshot({path:path.join(output,`transfer-failure-${n++}.png`)});}catch{}throw error;
}finally{await fs.writeFile(path.join(output,'local-transfer-r52-results.json'),JSON.stringify(results,null,2));for(const b of activeBrowsers)await b.close().catch(()=>{});await server.close();}
