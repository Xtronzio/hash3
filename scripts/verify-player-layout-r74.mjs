import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture({symbol='X',expanding=false,solo=false}={}){
 const r=createLocal(solo?'solo':'local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:true,territoryEnabled:true});
 r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.pairs[0].active={x:0,y:0};r.pairs[0].turn=symbol;
 r.players.forEach(p=>{p.inventory.cards={erase:3,double:3,rival:3,nuclear:3};p.inventory.comboPending=0;});
 r.cells=[{id:'x',x:0,y:0,symbol:'X',owner:'local-x'},{id:'o',x:2,y:0,symbol:'O',owner:'local-o'}];
 r.territoryEvents=[{id:'imminent',kind:'ufo',x:2,y:0,region:[{x:2,y:0}],turnsRemaining:1,announcedTurn:0},{id:'later',kind:'contagion',x:0,y:0,region:[{x:0,y:0}],turnsRemaining:3,announcedTurn:0}];r.territoryNextPlacement=r.territoryNextInvasion=99999;r.turnCards={'local-x':[], 'local-o':[]};
 if(expanding){r.cells=r.terrain.map((c,i)=>({...c,id:'full-'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));r.pairs[0].credits=1;r.pairs[0].pending=1;r.pairs[0].expander=symbol==='X'?'local-x':'local-o';}
 return r;
}
try{for(const [name,engine] of Object.entries({chromium,webkit,firefox}).filter(([n])=>!process.env.HASH3_QA_ENGINE||n===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  let headerBaseline;
  const headerGeometry=()=>page.locator('.compact-turnbar').evaluate(e=>Object.fromEntries(['.brand','.turn-state','.turn-clocks'].map(selector=>[selector,e.querySelector(selector).getBoundingClientRect().toJSON()])));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator('.game .viewport').waitFor();await frame(page);headerBaseline=await headerGeometry();};
  const pulse=async locator=>{assert.equal(await locator.evaluate(e=>getComputedStyle(e).animationName),'playerFeedbackPulse');assert.equal(await locator.evaluate(e=>getComputedStyle(e).animationIterationCount),'infinite');};
  const staticTurn=async()=>{assert.equal(await page.locator('.turn-state').evaluate(e=>getComputedStyle(e).animationName),'none');assert.notEqual(await page.locator('.turn-state').evaluate(e=>getComputedStyle(e).boxShadow),'none');assert.equal(await page.locator('.turn-state').evaluate(e=>e.getAnimations().length),0);};
  const geometry=async scope=>{
   const row=page.locator(scope),box=await row.evaluate(e=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height};};const c=e.querySelector('.turn-used-cards'),b=e.querySelector('.practice-banner');return {row:rect(e),cards:c&&rect(c),banner:b&&rect(b),buttons:[...e.querySelectorAll('button')].map(rect),text:b&&rect(b.querySelector('span')),overflow:document.documentElement.scrollWidth>innerWidth+1};});
   assert.ok(!box.overflow,JSON.stringify(box));assert.deepEqual(await headerGeometry(),headerBaseline,'A notice must not move or resize the logo, turn text or clocks');const covered=await row.evaluate(e=>{const title=document.querySelector('.turn-state').getBoundingClientRect(),point=document.elementFromPoint(title.x+title.width/2,title.y+title.height/2);return e.contains(point);});assert.equal(covered,true,'The notice must actually cover the turn label');const overlap=(a,b)=>a.width>0&&a.height>0&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;assert.ok(!overlap(headerBaseline['.brand'],box.row),'Logo remains uncovered');assert.ok(!overlap(headerBaseline['.turn-clocks'],box.row),'Clocks remain uncovered');assert.ok((await page.locator('.viewport').boundingBox()).height>0,'The board must retain visible height with player and territory warnings');if(box.cards&&box.banner){assert.ok(box.cards.right<=box.banner.x+1,JSON.stringify(box));assert.ok(Math.abs((box.cards.y+box.cards.bottom)-(box.banner.y+box.banner.bottom))<3,JSON.stringify(box));}
   assert.ok(box.buttons.every(b=>b.height>=44&&b.x>=box.row.x-1&&b.right<=box.row.right+1),JSON.stringify(box));if(box.text)assert.ok(box.text.width>=30,JSON.stringify(box));
  };
  const cardGeometry=async scope=>{
   const box=await page.locator(scope+' .inventory-counter-pair').evaluate(e=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,height:r.height};};const readers=[...e.querySelectorAll('[data-paused-inventory]')],slot=e.querySelector('.player-cards-slot'),strip=slot.querySelector('.turn-used-cards');return {readers:readers.map(rect),slot:rect(slot),strip:strip&&rect(strip),overflow:strip&&getComputedStyle(strip).overflowX};});
   assert.equal(box.readers.length,2);assert.ok(box.slot.x>=box.readers[0].right-1&&box.slot.right<=box.readers[1].x+1,JSON.stringify(box));assert.ok(box.readers.every(r=>Math.abs((r.y+r.bottom)-(box.slot.y+box.slot.bottom))<3),JSON.stringify(box));if(box.strip){assert.equal(box.slot.height,44);assert.equal(box.overflow,'auto');}
  };
  for(const size of (process.env.HASH3_QA_QUICK?[{width:390,height:844}]:[{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:740,height:320},{width:1280,height:900},{width:1920,height:1080}]))for(const symbol of ['X','O']){
   await page.setViewportSize(size);await load(fixture({symbol}));const before=await read();await staticTurn();
   assert.equal(await page.locator('.turn-state').evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(242, 243, 244)');
   assert.equal(await page.locator('.turn-symbol').evaluate(e=>getComputedStyle(e).color),symbol==='X'?'rgb(255, 74, 88)':'rgb(36, 211, 147)');
   await page.locator('.board-inventory-status [data-tool="erase"]').click();await pulse(page.locator('.turn-feedback-bar>.player-feedback-row .inventory-target-banner'));await pulse(page.locator('.board-inventory-status .is-prepared'));await pulse(page.locator('.board-inventory-status [data-tool="erase"]'));
   await geometry('.turn-feedback-bar>.player-feedback-row');await cardGeometry('.board-inventory-status');assert.deepEqual(await read(),before,'Selecting or highlighting a card must not spend stock or change saves');
   // Sample the bright phase of the actual animation, without changing game data.
   const light=await page.locator('.inventory-target-banner').evaluate(e=>{const a=e.getAnimations().find(a=>a.animationName==='playerFeedbackPulse');a.pause();a.currentTime=325;return {filter:getComputedStyle(e).filter,shadow:getComputedStyle(e).boxShadow};});assert.match(light.filter,/brightness\(1\.65\)/);assert.match(light.shadow,/12px/);
   if(size.width===320||size.width===390||size.width===1280||size.width===740)await page.screenshot({path:path.join(output,`player-layout-r74-${name}-${size.width}-${symbol}-selected.png`)});
   await page.locator('[data-action="cancel-tool-selection"]').click();assert.equal(await page.locator('.is-prepared').count(),0);assert.equal(await page.locator('.player-feedback-row').count(),0);assert.deepEqual(await headerGeometry(),headerBaseline,'Cancelling restores the original turn position');const compact=await page.locator('.compact-turnbar').boundingBox();assert.ok(compact.height<=(size.height<=450&&size.width>size.height?36:44),JSON.stringify({size,compact}));assert.equal(await page.locator('.board-inventory-status [data-tool="erase"]').evaluate(e=>getComputedStyle(e).animationName),'none');assert.deepEqual(await read(),before);
   await page.locator('.board-inventory-status [data-tool="nuclear"]').click();await geometry('.turn-feedback-bar>.player-feedback-row');await page.locator('[data-action="cancel-tool-selection"]').click();assert.deepEqual(await read(),before);
   await page.locator('.board-inventory-status [data-tool="double"]').click();const after=await read();assert.equal(after.players.find(p=>p.symbol===symbol).inventory.cards.double,2);assert.equal(after.players.find(p=>p.symbol!==symbol).inventory.cards.double,3);assert.deepEqual(after.players.map(p=>p.score),before.players.map(p=>p.score));
   await pulse(page.locator('.board-inventory-status [data-used-tool="double"]'));await geometry('.turn-feedback-bar>.player-feedback-row');await cardGeometry('.board-inventory-status');
   await page.locator('[data-action="map"]').click();await geometry('.turn-feedback-bar>.player-feedback-row');await cardGeometry('.world-map');await pulse(page.locator('.turn-feedback-bar .practice-banner'));assert.equal(await page.locator('.player-feedback-row').count(),1);assert.deepEqual(await read(),after);
   await page.locator('[data-action="close-map"]').click();await page.locator('[data-action="pause"]').click();assert.equal(await page.locator('.paused-minimap .inventory-pending-effect').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).animationName==='none')),true);
  }
  for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){
   await page.setViewportSize(size);const timed=fixture();timed.timeMode='timed';timed.pairs[0].deadline=new Date(Date.now()+33000).toISOString();timed.endsAt=new Date(Date.now()+600000).toISOString();await load(timed);
   await page.locator('.board-inventory-status [data-tool="erase"]').click();await geometry('.turn-feedback-bar>.player-feedback-row');await cardGeometry('.board-inventory-status');assert.ok(await page.locator('.turn-timer').isVisible());
  }
  await page.setViewportSize({width:390,height:844});await load(fixture());const noticeBefore=await read();await page.locator('.board-inventory-status [data-tool="erase"]').click();await page.locator('.board [data-action="inventory-target"][data-x="2"][data-y="0"]').click();
  assert.match(await page.locator('.turn-feedback-bar .player-notice-extra').innerText(),/aplicada/i);assert.equal(await page.locator('#notice.inventory-notice.visible').count(),0);await geometry('.turn-feedback-bar>.player-feedback-row');await staticTurn();assert.deepEqual((await read()).players.map(p=>p.score),noticeBefore.players.map(p=>p.score));const noticeAfter=await read();await page.waitForTimeout(5100);assert.equal(await page.locator('.player-feedback-row').count(),0);assert.deepEqual(await headerGeometry(),headerBaseline,'After expiry the turn reappears at its original position');assert.deepEqual(await read(),noticeAfter,'Expiring a notice does not change the saved game');
  await page.setViewportSize({width:320,height:740});const history=fixture();history.turnCards={'local-x':['erase','rival','nuclear'],'local-o':['double','erase','rival']};await load(history);const saved=await read();await cardGeometry('.board-inventory-status');assert.equal(await page.locator('.player-feedback-row').count(),0);assert.equal(await page.locator('.board-inventory-status .turn-used-cards').evaluate(e=>e.scrollWidth>e.clientWidth),true);assert.deepEqual(await read(),saved);
  await load(fixture({expanding:true}));await staticTurn();assert.match(await page.locator('.turn-state').innerText(),/ESTÁS AMPLIANDO/i);await pulse(page.locator('.expansion-controls'));
  await load(fixture());await page.locator('.board [data-action="move"][data-x="1"][data-y="0"]').click();
  const pulseSettings=await page.locator('.turn-state').evaluate(e=>e.getAnimations().find(a=>a.id==='turn-state-change')?.effect.getTiming());assert.equal(pulseSettings.duration,650);assert.equal(pulseSettings.iterations,1);
  await page.waitForTimeout(700);await staticTurn();await page.locator('[data-action="map"]').click();await staticTurn();await page.locator('[data-action="close-map"]').click();await staticTurn();
  await context.addInitScript(()=>Object.defineProperty(document,'hidden',{value:true,configurable:true}));
  await load(fixture({solo:true,symbol:'O',expanding:true}));await staticTurn();assert.match(await page.locator('.turn-state').innerText(),/TU RIVAL ESTÁ AMPLIANDO/i);
  await load(fixture({solo:true,symbol:'O'}));await staticTurn();assert.match(await page.locator('.turn-state').innerText(),/TURNO DE TU RIVAL/i);
  await page.emulateMedia({reducedMotion:'reduce'});await load(fixture());const before=await read();await page.locator('.board-inventory-status [data-tool="erase"]').click();assert.equal(await page.locator('.turn-state').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.inventory-target-banner').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await page.locator('.is-prepared').evaluate(e=>getComputedStyle(e).animationName),'none');assert.notEqual(await page.locator('.is-prepared').evaluate(e=>getComputedStyle(e).boxShadow),'none');assert.deepEqual(await read(),before);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS luminous turn and player instructions / selected and active cards / cards between backpacks / top-row overlay without moving the turn / cancellation, expiry and saves / map and reduced motion: '+name);
 }catch(error){if(page)await page.screenshot({path:path.join(output,`failure-r74-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'player-layout-r74-results.json'),JSON.stringify(results));await new Promise(r=>server.httpServer.close(r));}
