// Real Chromium input/layout checks; device emulation is not physical-device QA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {createLocal} from '../src/local.js';
import {initializeHabitats} from '../src/inhabitants.js';
import {NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION} from '../src/territory-event-rules.js';
import {plannedEventRegion} from '../src/territory-event-actions.js';

const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox']});
const results=[];
const onlineRequests=[];
const track=context=>context.on('request',request=>{if(new URL(request.url()).hostname.endsWith('.supabase.co'))onlineRequests.push(request.url());});
function fixture(size,kind='invader-colony'){
 const now=Date.now(),r=createLocal('local','Colono X','Colono O',now,'normal','untimed');
 r.terrain=Array.from({length:size},(_,i)=>({x:i%Math.ceil(Math.sqrt(size)),y:Math.floor(i/Math.ceil(Math.sqrt(size)))}));
 r.players.forEach(p=>{p.figures=333;p.score=999;p.inventory.cards={tornado:1,bomb:1,frontier:1,'hint-expand':1};});
 r.cells=[{id:'invader',x:2,y:2,symbol:'*',owner:null},{id:'x',x:3,y:3,symbol:'X',owner:'local-x'},{id:'o',x:4,y:3,symbol:'O',owner:'local-o'}];
 initializeHabitats(r,now);
 r.worms=[{id:'worm',x:5,y:5,body:[{x:5,y:5}],eaten:0,nextAt:now+600000}];
 r.rodentRaids=[{id:'raid',x:6,y:6,count:1,turn:0,mealsLeft:3,phase:'arriving',members:[{id:'rat',x:6,y:6}],visited:[]}];
 r.works=[{id:'work',x:9,y:9,done:0,nextAt:now+600000,destroy:Array.from({length:9},(_,i)=>({x:9+i%3,y:9+Math.floor(i/3)})),build:Array.from({length:9},(_,i)=>({x:-3+i%3,y:9+Math.floor(i/3)}))}];
 r.frontiers=[{id:'wall',cells:[{x:-1,y:0}],by:'local-x'}];
 const region=Array.from({length:9},(_,i)=>({x:12+i%3,y:12+Math.floor(i/3)}));
 r.territoryEvents=[{id:'event',kind,region,groups:[region],nextAt:now+600000}];
 return r;
}
async function load(context,r){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // No real identity, room or service is accessed by these local fixtures.
 await page.route('**/*.supabase.co/**',route=>route.abort());
 await page.route('**/version.json*',route=>route.fulfill({status:404,body:''}));
 await page.addInitScript(game=>{
  localStorage.setItem('hash3_locals',JSON.stringify([game]));
  localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));
  sessionStorage.setItem('hash3_restore_local','1');
 },r);
 await page.goto(origin);
 await page.locator('.game .viewport').waitFor();
 return {page,errors};
}
async function frame(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function touchDrag(page,dx,dy){
 const rect=await page.locator('.viewport').boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/6,y:y+dy*i/6,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.detach();await frame(page);
}
async function pinch(page){
 const rect=await page.locator('.viewport').boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
 const cdp=await page.context().newCDPSession(page);
 const points=d=>[{x:x-d,y,id:1},{x:x+d,y,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(35)});
 for(let d=40;d<=65;d+=5)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(d)});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.detach();await frame(page);
}
try{
 for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,serviceWorkers:'block'});
  track(context);
  for(const size of [999,33333]){
   const {page,errors}=await load(context,fixture(size));
   const started=Date.now();
   const read=()=>page.evaluate(()=>({nodes:document.querySelectorAll('.board .terrain-cell').length,scroll:document.querySelector('.viewport').scrollLeft,overflow:document.documentElement.scrollWidth-innerWidth}));
   assert.ok(await page.locator('.board-frontier-cell svg').count()>0,'Wall glyph missing');
   await page.screenshot({path:path.join(output,`board-${viewport.width}-${size}.png`)});
   const before=await read();assert.ok(before.nodes>0&&before.nodes<1500,`Unbounded detailed cells: ${before.nodes}`);assert.ok(before.overflow<=1,`Horizontal overflow: ${before.overflow}`);
   await touchDrag(page,-110,-50);const after=await read();assert.notEqual(after.scroll,before.scroll,'Touch drag did not move board');
   await pinch(page);assert.ok((await read()).nodes<1500);
   await page.locator('[data-action="center"]').first().tap();
   await page.locator('[data-action="map"]').tap();await page.locator('.world-map:not([hidden])').waitFor();
   assert.ok(await page.locator('.world-map .ecology-map-pin').count()<=33);
   await page.screenshot({path:path.join(output,`map-${viewport.width}-${size}.png`)});
   await page.locator('[data-action="close-map"]').tap();
   await page.locator('[data-action="practice-tool"][data-tool="tornado"]').first().tap();
   await page.locator('[data-action="cancel-tool-selection"]').tap();
   await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="resume"]').waitFor();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
   assert.equal(saved.terrain.length,size);assert.equal(saved.players[0].inventory.cards.tornado,1,'Cancelled tool spent stock');
   assert.ok(saved.territoryEvents[0].remainingMs>0);const remaining=saved.territoryEvents[0].remainingMs;
   await page.waitForTimeout(1100);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryEvents[0].remainingMs),remaining,'Paused warning advanced');
   await page.locator('[data-action="resume"]').tap();await page.locator('.game .viewport').waitFor();await frame(page);
   await page.screenshot({path:path.join(output,`board-${viewport.width}-${size}.png`)});
   assert.deepEqual(errors,[]);results.push({viewport,size,detailNodes:before.nodes,afterDragNodes:after.nodes,elapsedMs:Date.now()-started,passed:true});
   await page.close();
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 track(context);
 for(const kind of [...NATURAL_EVENT_ROTATION,...INVADER_EVENT_ROTATION]){
  const {page,errors}=await load(context,fixture(999,kind));
  const active=page.locator(`.map-jumps button[data-ecology-kind="${kind}"]`);
  assert.equal(await page.locator('.map-jumps .is-announced').count(),1);
  assert.equal(await page.locator('.map-jumps [data-ecology-attempt].is-inactive:disabled').count(),8);
  assert.equal(await active.evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await active.evaluate(el=>getComputedStyle(el).animationName),'ecologyActivate');
  await page.locator(`[data-action="locate-ecology"][data-ecology-kind="${kind}"]`).first().tap();
  await frame(page);
  assert.ok(await page.locator(`.board .phenomenon-marker [data-ecology-kind="${kind}"]`).count()>0,`No visible marker for ${kind}`);
  await page.screenshot({path:path.join(output,`${kind}.png`)});
  assert.deepEqual(errors,[]);results.push({kind,ecologyStates:true,passed:true});await page.close();
 }
 // One local snapshot must look the same in map, pause and board overview.
 const {page:visual,errors:visualErrors}=await load(context,(()=>{
  const r=createLocal('local','X','O',Date.now(),'normal','untimed',undefined,'X',false,{faunaEnabled:false,territoryEnabled:true});
  r.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));
  r.cells=[{id:'x',x:0,y:0,symbol:'X',owner:'local-x'},{id:'o',x:1,y:0,symbol:'O',owner:'local-o'},{id:'n',x:2,y:0,symbol:'#',owner:null},{id:'i',x:3,y:0,symbol:'*',owner:null}];
  return r;
 })());
 assert.equal(await visual.locator('.map-jumps [data-ecology-attempt].is-inactive:disabled').count(),9);
 assert.equal(await visual.locator('.map-jumps [data-ecology-attempt] .ecology-clock').count(),0);
 assert.equal(await visual.locator('.map-jumps [data-ecology-attempt]').first().evaluate(el=>getComputedStyle(el).opacity),'0.4');
 await visual.locator('[data-action="map"]').tap();await frame(visual);
 const liveMap=await visual.locator('.map-terrain').innerHTML();
 await visual.screenshot({path:path.join(output,'shared-live-map.png')});
 await visual.locator('[data-action="close-map"]').tap();
 await visual.locator('[data-action="pause"]').tap();await visual.locator('.inspection-canvas').waitFor();await frame(visual);
 assert.equal(await visual.locator('.ecology-controls [data-ecology-attempt].is-inactive:disabled').count(),9);
 assert.equal(await visual.locator('.inspection-terrain').innerHTML(),liveMap);
 await visual.screenshot({path:path.join(output,'shared-paused-map.png')});
 await visual.locator('[data-action="resume"]').tap();await visual.locator('.game .viewport').waitFor();
 for(let i=0;i<5;i++)await visual.locator('[data-action="minus"]').tap();await frame(visual);
 assert.equal(await visual.locator('.board-overview-map').count(),1);
 for(const symbol of ['X','O','#','*'])assert.ok(await visual.locator(`.board-overview-map [data-symbol="${symbol}"]`).count()>0);
 await visual.screenshot({path:path.join(output,'shared-board-zoom-out.png')});
 await visual.locator('[data-action="center"]').first().tap();await frame(visual);
 await visual.locator('[data-action="practice-tool"][data-tool="double"]').first().tap();
 await visual.locator('.board .available').first().tap();await visual.locator('.board .available').first().tap();
 await visual.locator('[data-action="practice-tool"][data-tool="rival"]').first().tap();
 await frame(visual);
 assert.equal(await visual.locator('.inventory-dock .dock-used-cell').count(),4);
 const dock=await visual.evaluate(()=>{
  const x=document.querySelector('.dock-used-cards.x'),bag=document.querySelector('.inventory-dock-button'),o=document.querySelector('.dock-used-cards.o');
  const xr=x.getBoundingClientRect(),br=bag.getBoundingClientRect(),or=o.getBoundingClientRect();
  return {x:x.getAttribute('aria-label'),o:o.getAttribute('aria-label'),red:getComputedStyle(x.querySelector('.dock-used-card')).color,green:getComputedStyle(o.querySelector('.dock-used-card')).color,ordered:xr.right<=br.left+1&&br.right<=or.left+1,width:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 assert.ok(dock.x.includes('X')&&dock.o.includes('O'));assert.notEqual(dock.red,dock.green);assert.ok(dock.ordered);assert.ok(dock.width<=dock.viewport);
 await visual.waitForTimeout(1000);
 await visual.screenshot({path:path.join(output,'inventory-both-sides.png')});
 await visual.setViewportSize({width:320,height:640});await frame(visual);
 assert.ok(await visual.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await visual.screenshot({path:path.join(output,'inventory-both-sides-320.png')});
 await visual.setViewportSize({width:390,height:844});await frame(visual);
 await visual.locator('[data-action="pause"]').tap();await visual.locator('[data-action="resume"]').tap();await visual.locator('.game .viewport').waitFor();
 assert.equal(await visual.locator('.dock-used-cards.x .dock-used-card').count(),1);assert.equal(await visual.locator('.dock-used-cards.o .dock-used-card').count(),1);
 assert.deepEqual(visualErrors,[]);results.push({sharedMaps:true,readableZoomGlyphs:true,phenomenaInactive:true,inventoryBothSides:true,passed:true});await visual.close();
 const {page:expansion,errors:expansionErrors}=await load(context,(()=>{
  const r=createLocal('local','X','O',Date.now(),'normal','untimed',undefined,'X',false,{faunaEnabled:false,territoryEnabled:false});
  r.cells=r.terrain.map((p,i)=>({...p,id:`c${i}`,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
  r.pairs[0].pending=1;r.pairs[0].credits=1;r.pairs[0].expander='local-x';return r;
 })());
 await expansion.locator('.board [data-action="select-expansion"]').first().tap();
 await expansion.locator('[data-action="confirm-expansion"]').tap();
 const expanded=await expansion.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.ok(expanded.terrain.length>9&&expanded.terrain.length<=18);assert.equal(expanded.pairs[0].pending,0);
 assert.deepEqual(expansionErrors,[]);results.push({expansion:true,passed:true});await expansion.close();
 const {page:tornado,errors:tornadoErrors}=await load(context,(()=>{
  const r=createLocal('local','X','O',Date.now(),'normal','untimed',undefined,'X',false,{faunaEnabled:false,territoryEnabled:false});
  r.players[0].inventory.cards.tornado=1;
  r.cells=[{id:'a',x:0,y:0,symbol:'X',owner:'local-x'},{id:'b',x:1,y:0,symbol:'O',owner:'local-o'},{id:'c',x:1,y:1,symbol:'X',owner:'local-x'}];return r;
 })());
 await tornado.locator('[data-action="practice-tool"][data-tool="tornado"]').first().tap();
 await tornado.locator('.board [data-action="inventory-target"]').first().tap();
 await tornado.locator('[data-action="confirm-area-tool"]').tap();
 await tornado.locator('.tornado-zone').first().waitFor();
 await tornado.screenshot({path:path.join(output,'tornado-animation.png')});
 await tornado.waitForTimeout(1000);
 assert.equal(await tornado.locator('.tornado-zone').count(),0);
 assert.equal(await tornado.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[0].inventory.cards.tornado),0);
 assert.deepEqual(tornadoErrors,[]);results.push({tornadoAnimation:true,passed:true});await tornado.close();
 const profile=await context.newPage(),profileErrors=[];profile.on('pageerror',e=>profileErrors.push(e.message));
 await profile.route('**/*.supabase.co/**',route=>route.abort());
 await profile.route('**/version.json*',route=>route.fulfill({status:404,body:''}));
 await profile.goto(origin);await profile.locator('[data-action="hall-profile"]').tap();
 await profile.locator('.profile-screen').waitFor();
 const profileLayout=await profile.evaluate(()=>{
  const dialog=document.querySelector('.hall-dialog .dialog'),rect=dialog.getBoundingClientRect();
  return {focus:document.activeElement?.tagName,fontSize:getComputedStyle(document.querySelector('#profile-name')).fontSize,top:rect.top,bottom:rect.bottom,height:innerHeight,scrollX,scrollY};
 });
 assert.equal(profileLayout.focus,'BUTTON');assert.equal(profileLayout.fontSize,'16px');assert.ok(profileLayout.top>=0&&profileLayout.bottom<=profileLayout.height);
 assert.equal(profileLayout.scrollX,0);assert.equal(profileLayout.scrollY,0);
 await profile.screenshot({path:path.join(output,'profile-mobile.png')});assert.deepEqual(profileErrors,[]);
 results.push({profileMobile:true,passed:true});await profile.close();
 for(const mode of ['solo','offline']){
  const isolated=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});track(isolated);
  const page=await isolated.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/version.json*',route=>route.fulfill({status:404,body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('hash3_pair','OLDPAIR1');localStorage.setItem('hash3_room','OLDROOM1');
   localStorage.setItem('sb-vyzugvepzylidyxitojo-auth-token',JSON.stringify({access_token:'expired.test.session',refresh_token:'diagnostic-only',expires_at:1,user:{id:'11111111-1111-4111-8111-111111111111'}}));
  });
  await page.goto(origin+'?sala=OLDROOM1&pareja=OLDPAIR1');
  for(const id of ['duel','world'])assert.equal(await page.locator(`.hall-mode[data-mode="${id}"]`).isDisabled(),true);
  if(mode==='solo')await page.screenshot({path:path.join(output,'hall-local-diagnosis.png')});
  await page.locator(`.hall-mode[data-mode="${mode}"]`).tap();await page.locator('[data-action="hall-play"]').tap();
  if(mode==='offline')await page.locator('[data-action="setup-local"]').tap();
  await page.locator('#local-name').fill('Diagnóstico');await page.locator('#local-time-mode').selectOption('untimed');
  await page.locator('#local-goal-type').selectOption('time');
  assert.deepEqual(await page.locator('#local-goal-target option').evaluateAll(options=>options.map(o=>Number(o.value))),[33,180,360,540]);
  assert.equal(await page.locator('.ecology-choice-icons svg').count(),13);
  assert.match(await page.locator('#local-goal-target option[value="33"]').innerText(),/⚡/);
  assert.match(await page.locator('#local-time-mode option[value="timed"]').innerText(),/◷/);
  for(const target of ['33','180','360','540'])await page.locator('#local-goal-target').selectOption(target);
  await page.locator('#local-goal-target').selectOption(mode==='solo'?'33':'540');
  await page.locator('.ecology-choices').scrollIntoViewIfNeeded();
  const setupLayout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.ecology-choice')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};})}));
  assert.ok(setupLayout.scrollWidth<=setupLayout.width);assert.ok(setupLayout.controls.every(r=>r.left>=0&&r.right<=setupLayout.width));
  await page.screenshot({path:path.join(output,'setup-'+mode+'-duration-icons.png')});
  await page.locator('#local-goal-target').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'setup-'+mode+'-total-time.png')});
  await page.locator('[data-action="start-local"]').tap();await page.locator('.game .viewport').waitFor();await frame(page);
  await isolated.setOffline(true);
  await page.locator('.board .available').first().tap();
  await page.waitForFunction(minimum=>JSON.parse(localStorage.getItem('hash3_locals'))?.[0]?.cells.length>=minimum,mode==='solo'?2:1,{timeout:15000});
  const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(local.mode,mode==='solo'?'solo':'local');assert.ok(local.cells.length>=(mode==='solo'?2:1));
  assert.deepEqual(local.matchGoal,{type:'time',target:mode==='solo'?33:540});assert.equal(Date.parse(local.endsAt)-Date.parse(local.createdAt),local.matchGoal.target*1000);
  const rejected=await page.evaluate(async()=>{const api=await import('/src/api.js');try{await api.command('world');return false;}catch(e){return e.message.includes('En construcción');}});assert.equal(rejected,true);
  await page.locator('[data-action="pause"]').tap();await page.locator('[data-action="resume"]').waitFor();
  assert.deepEqual(errors,[]);results.push({localStart:mode,moves:local.cells.length,matchDurationSeconds:local.matchGoal.target,setupEcologyIcons:13,networkOffline:true,noSupabaseRequests:true,passed:true});await isolated.close();
 }
 // Exercise the real Worker: the former winning target is a worm body.
 for(const difficulty of ['basic','medium','high','pro']){
  const now=Date.now(),r=createLocal('solo','X','',now,'normal','untimed',difficulty);
  r.pairs[0].turn='O';r.cells=[{id:'a',x:0,y:0,symbol:'O',owner:'local-o'},{id:'b',x:1,y:0,symbol:'O',owner:'local-o'}];
  r.worms=[{id:'blocked',kind:'worm',x:2,y:0,body:[{x:2,y:0}],eaten:1,nextAt:now+600000}];
  r.works=[{id:'work',kind:'work',done:0,destroy:[{x:2,y:1}],build:[{x:3,y:1}],nextAt:now+600000}];
  const {page,errors}=await load(context,r);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].pairs[0].turn==='X',{},{timeout:15000});
  const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  assert.equal(next.players[1].placements,1);assert.ok(next.players[1].lastMove.x!==2||![0,1].includes(next.players[1].lastMove.y));
  assert.deepEqual(errors,[]);results.push({difficulty,workerAvoidsWormAndWork:true,passed:true});await page.close();
 }
 const borderRoom=createLocal('local','X','O',Date.now(),'normal','untimed');
 borderRoom.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));
 borderRoom.players[0].inventory.cards.border=1;
 const invasion=plannedEventRegion(borderRoom,'invader-colony',()=>0,Date.now());
 borderRoom.territoryEvents=[{id:'border-warning',kind:'invader-colony',...invasion,nextAt:Date.now()+600000}];
 const {page:borderPage,errors:borderErrors}=await load(context,borderRoom);
 const selectBorder=()=>borderPage.locator('[data-action="practice-tool"][data-tool="border"]').first().tap();
 await selectBorder();
 const anchor=borderPage.locator('.board [data-action="inventory-target"][data-x="0"][data-y="0"]').first();
 await anchor.evaluate(el=>{const viewport=document.querySelector('.viewport'),r=el.getBoundingClientRect(),v=viewport.getBoundingClientRect();viewport.scrollLeft+=r.x+r.width/2-v.x-v.width/2;viewport.scrollTop+=r.y+r.height/2-v.y-v.height/2;});await frame(borderPage);
 await anchor.tap();assert.equal(await borderPage.locator('.board-border-cell.is-preview').count(),3);
 await borderPage.locator('[data-action="rotate-border"]').tap();assert.equal(await borderPage.locator('.board-border-cell.is-preview').count(),0);
 await borderPage.locator('[data-action="cancel-tool-selection"]').tap();
 assert.equal(await borderPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[0].inventory.cards.border),1);
 await selectBorder();await anchor.evaluate(el=>{const viewport=document.querySelector('.viewport'),r=el.getBoundingClientRect(),v=viewport.getBoundingClientRect();viewport.scrollLeft+=r.x+r.width/2-v.x-v.width/2;viewport.scrollTop+=r.y+r.height/2-v.y-v.height/2;});await frame(borderPage);await anchor.tap();await borderPage.locator('[data-action="confirm-area-tool"]').tap();
 const placedBorder=await borderPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.equal(placedBorder.players[0].inventory.cards.border,0);assert.equal(placedBorder.frontiers[0].type,'border');assert.equal(placedBorder.frontiers[0].edges.length,3);
 assert.equal(await borderPage.locator('.board-border-cell').count(),3);assert.ok(await borderPage.locator('.board .invasion-entry').count()>0);
 await borderPage.screenshot({path:path.join(output,'border-warning.png')});
 await borderPage.locator('[data-action="map"]').tap();assert.ok(await borderPage.locator('.map-frontiers path').count()>=3);
 await borderPage.locator('[data-action="close-map"]').tap();await borderPage.locator('[data-action="pause"]').tap();
 assert.ok(await borderPage.locator('.inspection-canvas .map-frontiers path').count()>=3);
 assert.deepEqual(borderErrors,[]);results.push({borderPreviewCancelRotate:true,borderSpendOnce:true,borderSharedMaps:true,passed:true});await borderPage.close();
 // The head uses the creature icon; body links use the same map geometry.
 const trailRoom=createLocal('local','X','O',Date.now(),'normal','untimed');
 trailRoom.worms=[{id:'trail',kind:'worm',x:2,y:1,body:[{x:0,y:0},{x:1,y:0},{x:2,y:1}],eaten:2,nextAt:Date.now()+600000}];
 const {page:trailPage,errors:trailErrors}=await load(context,trailRoom);
 assert.equal(await trailPage.locator('.worm-trail-layer path').count(),2);assert.equal(await trailPage.locator('.worm-body').first().evaluate(el=>getComputedStyle(el,'::after').display),'none');assert.equal(await trailPage.locator('.board .habitat-worm').count(),1);
 await trailPage.screenshot({path:path.join(output,'worm-trail.png')});
 await trailPage.locator('[data-action="map"]').tap();const wormMap=await trailPage.locator('.world-map .worm-map-trail').innerHTML();
 await trailPage.locator('[data-action="close-map"]').tap();await trailPage.locator('[data-action="pause"]').tap();
 assert.equal(await trailPage.locator('.inspection-canvas .worm-map-trail').innerHTML(),wormMap);
 assert.deepEqual(trailErrors,[]);results.push({continuousWormTrail:true,headDistinct:true,sharedPausedTrail:true,passed:true});await trailPage.close();
 assert.deepEqual(onlineRequests,[],'Local diagnosis contacted Supabase');
 results.push({supabaseRequests:0,passed:true});
 await context.close();
 console.log(JSON.stringify({browser:browser.version(),physicalDevice:false,results},null,2));
}catch(error){
 for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
 throw error;
}finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));await browser.close();await server.close();}
