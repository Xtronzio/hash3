// Real Chromium input/layout checks; device emulation is not physical-device QA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {createLocal,localCommand} from '../src/local.js';
import {seedInvasions,advanceInvasions} from '../src/invasion-paths.js';
import {initializeHabitats} from '../src/inhabitants.js';
import {LOCAL_NATURAL_ROTATION,INVADER_EVENT_ROTATION} from '../src/territory-event-rules.js';
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
 r.worms=[{id:'worm',x:5,y:5,body:[{x:5,y:5}],eaten:0,turnDriven:true,mealLimit:3,turnsSinceMeal:0}];
 r.rodentRaids=[{id:'raid',x:6,y:6,count:1,turn:0,mealsLeft:3,phase:'arriving',members:[{id:'rat',x:6,y:6}],visited:[]}];
 r.works=[{id:'work',x:9,y:9,done:0,turnsRemaining:3,destroy:Array.from({length:9},(_,i)=>({x:9+i%3,y:9+Math.floor(i/3)})),build:Array.from({length:9},(_,i)=>({x:-3+i%3,y:9+Math.floor(i/3)}))}];
 r.frontiers=[{id:'wall',cells:[{x:-1,y:0}],by:'local-x'}];
 const region=Array.from({length:9},(_,i)=>({x:12+i%3,y:12+Math.floor(i/3)}));
 r.territoryEvents=[{id:'event',kind,region,groups:[region],turnsRemaining:3}];
 return r;
}
async function load(context,r){
 r=structuredClone(r);for(const e of [...r.territoryEvents||[],...r.works||[]]){e.turnsRemaining??=3;delete e.nextAt;delete e.remainingMs;}
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
 // Every production icon declaration resolves within the Pages /hash3/ scope.
 const productionHtml=await fs.readFile('docs/index.html','utf8');
 const iconLinks=[...productionHtml.matchAll(/<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map(match=>({href:match[0].match(/href="([^"]+)"/)[1],size:Number(match[0].match(/sizes="(\d+)x\d+"/)[1])}));
 assert.equal(iconLinks.length,4);
 for(const icon of iconLinks){
  assert.ok(icon.href.startsWith('/hash3/icons/hash3-'),'Explicit #3 icon must stay inside the app scope');
  const png=await fs.readFile(path.join('docs',icon.href.slice('/hash3/'.length)));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),icon.size);assert.equal(png.readUInt32BE(20),icon.size);
 }
 assert.deepEqual(await fs.readFile('docs/apple-touch-icon.png'),await fs.readFile('public/icons/apple-touch-icon-r08.png'));
 results.push({pagesFaviconsAndAppleIconResolve:true,passed:true});
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
   assert.ok(saved.territoryEvents[0].turnsRemaining===3);const remaining=saved.territoryEvents[0].turnsRemaining;
   await page.waitForTimeout(1100);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryEvents[0].turnsRemaining),remaining,'Paused warning advanced');
   await page.locator('[data-action="resume"]').tap();await page.locator('.game .viewport').waitFor();await frame(page);
   await page.screenshot({path:path.join(output,`board-${viewport.width}-${size}.png`)});
   assert.deepEqual(errors,[]);results.push({viewport,size,detailNodes:before.nodes,afterDragNodes:after.nodes,elapsedMs:Date.now()-started,passed:true});
   await page.close();
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 track(context);
 for(const kind of [...LOCAL_NATURAL_ROTATION,...INVADER_EVENT_ROTATION]){
  const {page,errors}=await load(context,fixture(999,kind));
  const active=page.locator(`.board-territory-status button[data-ecology-kind="${kind}"]`);
  assert.equal(await page.locator('.board-territory-status .is-announced').count(),1);
  assert.equal(await page.locator('.board-territory-status [data-ecology-attempt].is-inactive:disabled').count(),9);
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
 assert.equal(await visual.locator('.board-territory-status [data-ecology-attempt].is-inactive:disabled').count(),10);
 assert.equal(await visual.locator('.board-territory-status [data-ecology-attempt] .ecology-clock').count(),0);
 assert.equal(await visual.locator('.board-territory-status [data-ecology-attempt]').first().evaluate(el=>getComputedStyle(el).opacity),'0.4');
 await visual.locator('[data-action="map"]').tap();await frame(visual);
 const liveMap=await visual.locator('.map-terrain').innerHTML();
 await visual.screenshot({path:path.join(output,'shared-live-map.png')});
 await visual.locator('[data-action="close-map"]').tap();
 await visual.locator('[data-action="pause"]').tap();await visual.locator('.inspection-canvas').waitFor();await frame(visual);
 assert.equal(await visual.locator('.ecology-controls [data-ecology-attempt].is-inactive:disabled').count(),10);
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
  r.worms=[{id:'blocked',kind:'worm',x:2,y:0,body:[{x:2,y:0}],eaten:1,turnsRemaining:3}];
  r.works=[{id:'work',kind:'work',done:0,destroy:[{x:2,y:1}],build:[{x:3,y:1}],turnsRemaining:3}];
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
 borderRoom.territoryEvents=[{id:'border-warning',kind:'invader-colony',...invasion,turnsRemaining:3}];
 const {page:borderPage,errors:borderErrors}=await load(context,borderRoom);
 const selectBorder=()=>borderPage.locator('[data-action="practice-tool"][data-tool="border"]').first().tap();
 await selectBorder();
 const anchor=borderPage.locator('.board [data-action="inventory-target"][data-x="0"][data-y="0"]').first();
 await anchor.evaluate(el=>{const viewport=document.querySelector('.viewport'),r=el.getBoundingClientRect(),v=viewport.getBoundingClientRect();viewport.scrollLeft+=r.x+r.width/2-v.x-v.width/2;viewport.scrollTop+=r.y+r.height/2-v.y-v.height/2;});await frame(borderPage);
 await anchor.tap();assert.equal(await borderPage.locator('.board-frontier-cell.is-preview').count(),1);
 const tapBorder=async(x,y)=>{const cell=borderPage.locator(`.board [data-action="inventory-target"][data-x="${x}"][data-y="${y}"]`).first();await cell.evaluate(el=>el.scrollIntoView({block:'center',inline:'center'}));await frame(borderPage);await cell.tap();};
 await tapBorder(1,0);assert.equal(await borderPage.locator('.board-frontier-cell.is-preview').count(),2);
 assert.equal(await borderPage.locator('[data-action="rotate-border"]').count(),0);
 await borderPage.locator('[data-action="cancel-tool-selection"]').tap();
 assert.equal(await borderPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[0].inventory.cards.border),1);
 await selectBorder();await tapBorder(0,0);await tapBorder(1,0);await tapBorder(1,1);
 const placedBorder=await borderPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.equal(placedBorder.players[0].inventory.cards.border,0);assert.equal(placedBorder.frontiers[0].type,'border');assert.deepEqual(placedBorder.frontiers[0].cells,[{x:0,y:0},{x:1,y:0},{x:1,y:1}]);
 assert.equal(await borderPage.locator('.board-frontier-cell').count(),3);assert.ok(await borderPage.locator('.board .invasion-entry').count()>0);
 await borderPage.screenshot({path:path.join(output,'border-warning.png')});
 await borderPage.locator('[data-action="map"]').tap();assert.ok(await borderPage.locator('.map-frontiers path').count()>=3);
 await borderPage.locator('[data-action="close-map"]').tap();await borderPage.locator('[data-action="pause"]').tap();
 assert.ok(await borderPage.locator('.inspection-canvas .map-frontiers path').count()>=3);
 assert.deepEqual(borderErrors,[]);results.push({borderThreeTapsLAndCancel:true,borderSpendOnce:true,borderSharedMaps:true,passed:true});await borderPage.close();
 // The head uses the creature icon; body links use the same map geometry.
 const trailRoom=createLocal('local','X','O',Date.now(),'normal','untimed');
 trailRoom.worms=[{id:'trail',kind:'worm',x:2,y:1,body:[{x:0,y:0},{x:1,y:0},{x:2,y:1}],eaten:2,turnsRemaining:3}];
 const {page:trailPage,errors:trailErrors}=await load(context,trailRoom);
 assert.equal(await trailPage.locator('.worm-trail-layer path').count(),2);assert.equal(await trailPage.locator('.worm-body').first().evaluate(el=>getComputedStyle(el,'::after').display),'none');assert.equal(await trailPage.locator('.board .habitat-worm').count(),1);
 await trailPage.screenshot({path:path.join(output,'worm-trail.png')});
 await trailPage.locator('[data-action="map"]').tap();const wormMap=await trailPage.locator('.world-map .worm-map-trail').innerHTML();
 await trailPage.locator('[data-action="close-map"]').tap();await trailPage.locator('[data-action="pause"]').tap();
 assert.equal(await trailPage.locator('.inspection-canvas .worm-map-trail').innerHTML(),wormMap);
 assert.deepEqual(trailErrors,[]);results.push({continuousWormTrail:true,headDistinct:true,sharedPausedTrail:true,passed:true});await trailPage.close();
 // Turn-driven worms retain their rules without visible numeric counters.
 const turnRoom=createLocal('local','X','O',Date.now(),'normal','untimed');
 turnRoom.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));turnRoom.territoryEnabled=false;
 turnRoom.cells=[{id:'food',x:3,y:3,symbol:'O',owner:'local-o'},{id:'food2',x:4,y:3,symbol:'X',owner:'local-x'}];
 turnRoom.worms=[{id:'turn-worm',kind:'worm',x:3,y:3,body:[{x:3,y:3}],eaten:0,mealLimit:9,turnDriven:true,turnsSinceMeal:2}];
 const {page:turnPage,errors:turnErrors}=await load(context,turnRoom);
 assert.equal(await turnPage.locator('.habitat-worm b').count(),0);
 assert.equal(await turnPage.locator('.board-territory-status [data-ecology-kind="worm"] .ecology-clock').count(),0);
 const moveCell=turnPage.locator('.board [data-action="move"][data-x="0"][data-y="0"]');await moveCell.evaluate(el=>el.scrollIntoView({block:'center',inline:'center'}));await frame(turnPage);await moveCell.tap();
 await turnPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].worms[0].eaten===1);
 assert.equal(await turnPage.locator('.habitat-worm b').count(),0);
 await turnPage.locator('[data-action="events"][aria-label="Próximos eventos"]').tap();assert.doesNotMatch(await turnPage.locator('.event-outlook-body').innerText(),/1\/9 comidas/);
 await turnPage.screenshot({path:path.join(output,'worm-turns-r38.png')});
 assert.deepEqual(turnErrors,[]);results.push({wormNineMealsWithoutCounters:true,passed:true});await turnPage.close();
 // A live invasion remains active without a fictitious seconds clock.
 const growthRoom=createLocal('local','X','O',Date.now(),'normal','untimed');growthRoom.terrain=Array.from({length:99},(_,i)=>({x:i%11,y:Math.floor(i/11)}));seedInvasions(growthRoom,[{x:2,y:2}],'invader-colony');for(let i=0;i<3;i++)advanceInvasions(growthRoom,Date.now(),()=>0);
 const {page:growthPage,errors:growthErrors}=await load(context,growthRoom);
 await growthPage.locator('[data-action="locate-ecology"][data-ecology-kind="invader-colony"]').first().tap();await frame(growthPage);
 assert.doesNotMatch(await growthPage.locator('.board-territory-status [data-ecology-kind="invader-colony"]').innerText(),/4\/9/);
 assert.equal(await growthPage.locator('.board-territory-status [data-ecology-kind="invader-colony"] .ecology-clock').count(),0);
 assert.equal(await growthPage.locator('.board .phenomenon-marker.is-growing').count(),0);assert.ok(await growthPage.locator('.board .invasion-growth').count()>0);assert.equal(await growthPage.locator('.board .invasion-growth').first().evaluate(el=>getComputedStyle(el,'::after').borderTopStyle),'dashed');assert.equal(await growthPage.locator('.board .invasion-growth:not(.invader)').count(),0);
 await growthPage.screenshot({path:path.join(output,'invasion-growing-r38.png')});
 await growthPage.locator('[data-action="map"]').tap();
 await growthPage.locator('.world-map [data-action="locate-ecology"][data-ecology-kind="invader-colony"]').tap();await frame(growthPage);
 assert.ok(await growthPage.locator('.world-map .map-invasion-growth rect').count()>0);
 await growthPage.locator('[data-action="close-map"]').tap();await growthPage.locator('[data-action="pause"]').tap();
 assert.ok(await growthPage.locator('.inspection-canvas .map-invasion-growth rect').count()>0);
 assert.deepEqual(growthErrors,[]);results.push({invasionGrowingDashedFrames:true,passed:true});await growthPage.close();
 // Shared wildcards score each participant through actual touch placements.
 const wildRoom=createLocal('local','X','O',Date.now(),'normal','untimed');wildRoom.faunaEnabled=false;
 wildRoom.cells=[{id:'wild',symbol:'#',x:1,y:1,owner:null},{id:'x',symbol:'X',x:0,y:1,owner:'local-x'},{id:'o',symbol:'O',x:1,y:0,owner:'local-o'}];
 const {page:wildPage,errors:wildErrors}=await load(context,wildRoom);
 await wildPage.locator('.board [data-action="move"][data-x="2"][data-y="1"]').tap();
 await wildPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[0].score===3);
 await wildPage.locator('.board [data-action="move"][data-x="1"][data-y="2"]').tap();
 await wildPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players[1].score===3);
 assert.equal(await wildPage.locator('.board .neutral[data-x="1"][data-y="1"]').count(),1);
 await wildPage.screenshot({path:path.join(output,'shared-wildcard-r38.png')});assert.deepEqual(wildErrors,[]);results.push({wildcardScoresBothSymbols:true,passed:true});await wildPage.close();
 // Three completed UI turns convert four signs; no landing payout or recreated colony.
 const flipRoom=createLocal('local','X','O',Date.now(),'normal','untimed');flipRoom.faunaEnabled=false;seedInvasions(flipRoom,[{x:2,y:0}],'invader-colony');
 flipRoom.cells.push({id:'x',symbol:'X',x:0,y:0,owner:'local-x'},{id:'o',symbol:'O',x:1,y:0,owner:'local-o'},{id:'wild',symbol:'#',x:2,y:1,owner:null});
 flipRoom.invasions[0].grown=9;flipRoom.players[0].score=25912;flipRoom.territoryEvents=[{id:'flip-four',kind:'pandemic',region:flipRoom.cells.map(c=>({x:c.x,y:c.y})),turnsRemaining:3}];
 const {page:flipPage,errors:flipErrors}=await load(context,flipRoom);
 for(const [x,y] of [[0,1],[1,1],[1,2]])await flipPage.locator(`.board [data-action="move"][data-x="${x}"][data-y="${y}"]`).tap();
 await flipPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryEvents.length===0);
 const flipped=await flipPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.deepEqual(flipped.cells.filter(c=>[[0,0],[1,0],[2,0],[2,1]].some(([x,y])=>c.x===x&&c.y===y)).slice().sort((a,b)=>a.y-b.y||a.x-b.x).map(c=>c.symbol),['O','X','#','*']);assert.equal(flipped.players[0].score,25912);assert.equal(flipped.invasions.length,0);
 assert.equal(await flipPage.locator('.board .invasion-growth').count(),0);await flipPage.screenshot({path:path.join(output,'pandemic-flips-r38.png')});assert.deepEqual(flipErrors,[]);results.push({pandemicFourSignsPreservesScore:true,passed:true});await flipPage.close();
 // Reconquest frees a playable tile, preserves a large saved score and adds terrain.
 const reclaimRoom=createLocal('local','X','O',Date.now(),'normal','untimed');reclaimRoom.terrain=Array.from({length:991},(_,i)=>({x:i%33,y:Math.floor(i/33)}));reclaimRoom.players[0].score=25912;reclaimRoom.players[0].placements=1422;
 seedInvasions(reclaimRoom,[{x:1,y:0}],'invader-colony');reclaimRoom.invasions[0].grown=9;reclaimRoom.works=[{id:'reclaim',kind:'work',reconquer:true,destroy:[{x:1,y:0}],build:[{x:-1,y:0}],done:0,turnsRemaining:3}];
 const {page:reclaimPage,errors:reclaimErrors}=await load(context,reclaimRoom);
 for(const [x,y] of [[0,1],[1,1],[2,1]])await reclaimPage.locator(`.board [data-action="move"][data-x="${x}"][data-y="${y}"]`).tap();
 await reclaimPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].works.length===0);
 const reclaimed=await reclaimPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.equal(reclaimed.terrain.length,992);assert.ok(reclaimed.terrain.some(c=>c.x===1&&c.y===0));assert.equal(reclaimed.cells.filter(c=>c.symbol==='*').length,0);assert.equal(reclaimed.players[0].score,25912);assert.equal(reclaimed.invasions.length,0);
 assert.equal(await reclaimPage.locator('.board [data-action="move"][data-x="1"][data-y="0"]').count(),1);
 await reclaimPage.screenshot({path:path.join(output,'reconquered-terrain-r38.png')});assert.deepEqual(reclaimErrors,[]);results.push({reconquerPreservesLargeSave:true,passed:true});await reclaimPage.close();
 // A due storm pays both symbols with normal large coloured numbers only.
 const stormRoom=createLocal('local','X','O',Date.now(),'normal','untimed');
 stormRoom.cells=[['X',0,0],['X',1,0],['X',2,1],['O',0,1],['O',1,1],['O',2,0]].map(([symbol,x,y],i)=>({id:'s'+i,symbol,x,y,owner:symbol==='X'?'local-x':'local-o'}));
 const stormRegion=structuredClone(stormRoom.terrain);stormRoom.terrain.push({x:0,y:3});stormRoom.faunaEnabled=false;
 let expectedStorm;
 for(let i=0;i<100;i++){
  stormRoom.territoryEvents=[{id:'storm-qa-'+i,kind:'hurricane',region:stormRegion,turnsRemaining:1}];
  const candidate=localCommand(stormRoom,'move',{x:0,y:3},Date.now());
  if(candidate.landingEvent?.scores.length===2){expectedStorm=candidate;break;}
 }
 assert.ok(expectedStorm,'Find a reproducible storm scoring both symbols');
 const {page:stormPage,errors:stormErrors}=await load(context,stormRoom);
 await stormPage.locator('.board [data-action="move"][data-x="0"][data-y="3"]').tap();
 await stormPage.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryEvents.length===0);
 assert.equal(await stormPage.locator('.landing-score-float.x').count(),1);
 assert.equal(await stormPage.locator('.landing-score-float.o').count(),1);
 assert.equal(await stormPage.locator('.landing-score-float.x').evaluate(el=>getComputedStyle(el).animationName),'scoreRise');
 const landed=await stormPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.deepEqual(landed.players.map(p=>p.score),expectedStorm.players.map(p=>p.score));
 assert.equal(await stormPage.locator('#notice .score-notice-total.x').innerText(),'+'+expectedStorm.landingEvent.scores.find(s=>s.symbol==='X').points);
 assert.equal(await stormPage.locator('#notice .score-notice-total.o').innerText(),'+'+expectedStorm.landingEvent.scores.find(s=>s.symbol==='O').points);
 assert.match(await stormPage.locator('#notice').innerText(),/^\+\d+\s*\+\d+$/);
 assert.equal(await stormPage.locator('#notice .score-notice-detail').count(),0);
 assert.ok(await stormPage.locator('#notice .score-notice-total.x').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=42);
 assert.equal(await stormPage.locator('#notice .score-notice-total.x').evaluate(el=>getComputedStyle(el).color),'rgb(255, 74, 88)');
 assert.equal(await stormPage.locator('#notice .score-notice-total.o').evaluate(el=>getComputedStyle(el).color),'rgb(36, 211, 147)');
 await stormPage.screenshot({path:path.join(output,'landing-scores-r38.png')});
 assert.deepEqual(stormErrors,[]);results.push({landingBothSymbolsLargeNumbersOnly:true,passed:true});await stormPage.close();
 // R40 player and territory panels: two rows, independent counters and no horizontal overflow.
 const strategyRoom=createLocal('local','X','O',Date.now(),'normal','untimed');strategyRoom.faunaEnabled=false;strategyRoom.players.forEach(p=>p.figures=33);
 strategyRoom.players[0].inventory.cards['expand-2']=1;strategyRoom.players[0].inventory.cards['expand-3']=1;
 strategyRoom.territoryEvents=[{id:'movable-r39',kind:'invader-rain',region:[{x:2,y:0}],groups:[[{x:2,y:0}]],seeded:true,turnsRemaining:3}];
 strategyRoom.cells=[{id:'target-x',symbol:'X',owner:'local-x',x:0,y:0},{id:'target-o',symbol:'O',owner:'local-o',x:1,y:0}];
 const {page:strategy,errors:strategyErrors}=await load(context,strategyRoom);
 for(const width of [320,390]){
  await strategy.setViewportSize({width,height:844});await frame(strategy);
  assert.ok(await strategy.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const selector of ['.player-inventory-rows','.territory-rows'])assert.equal(await strategy.locator(selector).first().evaluate(el=>getComputedStyle(el).gridTemplateRows.split(' ').length),2);
  const arrangement=await strategy.evaluate(()=>{const board=document.querySelector('.viewport').getBoundingClientRect(),player=document.querySelector('.board-inventory-status').getBoundingClientRect(),territory=document.querySelector('.board-territory-status').getBoundingClientRect(),warning=document.querySelector('.turn-warnings').getBoundingClientRect();return {clear:player.bottom<=board.top+1&&territory.top>=board.bottom-1,warningAbove:warning.bottom<=player.top+1,height:board.height};});
  assert.ok(arrangement.clear&&arrangement.warningAbove);assert.ok(arrangement.height>=200);
  assert.equal(await strategy.locator('.inventory-column-category').count(),0);
  assert.equal(await strategy.locator('.board-inventory-status [data-ecology-kind]').count(),0);
  assert.equal(await strategy.locator('.board-territory-status [data-tool]').count(),0);
 }
 await strategy.locator('.map-jumps [data-action="mark-target"]').tap();
 for(const [x,y]of [[0,0],[1,0],[2,2]])await strategy.locator(`.board [data-action="watch-target-cell"][data-x="${x}"][data-y="${y}"]`).tap();
 assert.equal(await strategy.locator('.map-jumps [data-action="locate-target"]').count(),3);
 await strategy.locator('.map-jumps [data-action="mark-target"]').tap();
 await strategy.locator('.board-inventory-status [data-action="practice-tool"][data-tool="shift"]').tap();
 await strategy.locator('.pending-invasion-bomb[data-bomb-id="movable-r39:0"]').tap();
 await strategy.locator('.board [data-action="inventory-target"][data-x="2"][data-y="1"]').tap();
 let strategySaved=await strategy.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 assert.equal(strategySaved.territoryEvents[0].turnsRemaining,3);assert.deepEqual(strategySaved.territoryEvents[0].region,[{x:2,y:1}]);assert.equal(strategySaved.cells.length,2);
 await strategy.locator('.board-inventory-status [data-tool="expand-2"]').evaluate(el=>el.scrollIntoView());
 await strategy.screenshot({path:path.join(output,'strategy-rows-r40.png')});
 for(const [x,y]of [[0,1],[1,1],[0,2]])await strategy.locator(`.board [data-action="move"][data-x="${x}"][data-y="${y}"]`).tap();
 strategySaved=await strategy.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(strategySaved.territoryEvents.length,0);assert.ok(strategySaved.cells.some(c=>c.x===2&&c.y===1&&c.symbol==='*'));assert.equal(strategySaved.watchTargets.length,3);
 await strategy.locator('[data-action="pause"]').tap();assert.equal(await strategy.locator('[data-inspect-action="target"]').count(),3);await strategy.locator('[data-inspect-action="target"]').first().tap();
 assert.deepEqual(strategyErrors,[]);results.push({separateInventoryRows:true,appearanceVsImpactCounters:true,movableBomb:true,threeDianas:true,threeTurnWarning:true,passed:true});await strategy.close();
 const microRoom=createLocal('local','X','O',Date.now(),'normal','untimed');microRoom.faunaEnabled=false;microRoom.territoryEnabled=false;microRoom.players[0].inventory.cards['expand-2']=1;
 const {page:micro,errors:microErrors}=await load(context,microRoom);
 await micro.locator('.board-inventory-status [data-tool="expand-2"]').tap();await micro.locator('[data-action="rotate-micro"]').tap();await micro.locator('[data-action="suggest-micro"]').tap();
 assert.equal((await micro.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0])).terrain.length,9);
 await micro.locator('[data-action="cancel-tool-selection"]').tap();assert.equal((await micro.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0])).players[0].inventory.cards['expand-2'],1);
 await micro.locator('.board-inventory-status [data-tool="expand-2"]').tap();await micro.locator('[data-action="suggest-micro"]').tap();await micro.locator('[data-action="confirm-area-tool"]').tap();
 const microSaved=await micro.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(microSaved.terrain.length,11);assert.equal(microSaved.players[0].inventory.cards['expand-2'],0);assert.equal(microSaved.ecologyTurns,0);assert.equal(microSaved.pairs[0].turn,'X');
 await micro.screenshot({path:path.join(output,'micro-expansion-r39.png')});assert.deepEqual(microErrors,[]);results.push({microExpansionPreviewRotateCancelAndConfirm:true,passed:true});await micro.close();
 // R40 a full exchange pays both colors, then the hall exposes all new cards.
 const swapRoom=createLocal('local','X','O',Date.now(),'normal','untimed');swapRoom.faunaEnabled=false;swapRoom.territoryEnabled=false;
 swapRoom.players[0].inventory.cards.swap=1;
 swapRoom.cells=[['X',0,0],['X',1,0],['O',2,0],['O',0,2],['O',1,2],['X',2,2]].map(([symbol,x,y],i)=>({id:'swap-'+i,symbol,x,y,owner:symbol==='X'?'local-x':'local-o'}));
 const {page:swapPage,errors:swapErrors}=await load(context,swapRoom);
 await swapPage.locator('.board-inventory-status [data-tool="swap"]').tap();
 await swapPage.locator('.board [data-action="inventory-target"][data-x="2"][data-y="0"]').tap();
 await swapPage.locator('.board [data-action="inventory-target"][data-x="2"][data-y="2"]').tap();
 assert.deepEqual(await swapPage.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].players.map(p=>p.score)),[3,3]);
 assert.equal(await swapPage.locator('#notice .score-notice-total').count(),2);
 await swapPage.screenshot({path:path.join(output,'swap-both-scores-r40.png')});
 await swapPage.locator('[data-action="pause"]').tap();await swapPage.locator('[data-action="go-hall"]').tap();await swapPage.locator('[data-action="hall-inventory"]').tap();
 for(const tool of ['swap','activate','expand-2','expand-3'])assert.equal(await swapPage.locator('.inventory-catalog [data-tool="'+tool+'"]').count(),1);
 await swapPage.screenshot({path:path.join(output,'hall-inventory-r40.png')});
 assert.deepEqual(swapErrors,[]);results.push({swapBothLandings:true,newHallCards:true,passed:true});await swapPage.close();
 const colorRoom=createLocal('local','X','O',Date.now(),'normal','untimed');colorRoom.faunaEnabled=false;colorRoom.territoryEnabled=false;
 colorRoom.cells=[{id:'grey',symbol:'#',owner:null,x:0,y:0},{id:'red',symbol:'#',owner:null,x:1,y:0,wildcardSymbol:'X'},{id:'green',symbol:'#',owner:null,x:2,y:0,wildcardSymbol:'O'}];
 const {page:usedWild,errors:usedWildErrors}=await load(context,colorRoom);
 assert.equal(await usedWild.locator('.board .neutral.wildcard-x').evaluate(el=>getComputedStyle(el).color),'rgb(255, 74, 88)');
 assert.equal(await usedWild.locator('.board .neutral.wildcard-o').evaluate(el=>getComputedStyle(el).color),'rgb(36, 211, 147)');
 assert.equal(await usedWild.locator('.board .neutral:not(.wildcard-x):not(.wildcard-o)').count(),1);
 await usedWild.screenshot({path:path.join(output,'used-wildcard-colors-r40.png')});
 await usedWild.locator('[data-action="map"]').tap();assert.ok(await usedWild.locator('.world-map .map-canvas').evaluate(el=>el.getBoundingClientRect().height)>180);
 await usedWild.screenshot({path:path.join(output,'two-rows-live-map-r40.png')});
 await usedWild.locator('[data-action="close-map"]').tap();await usedWild.locator('[data-action="pause"]').tap();
 assert.ok(await usedWild.locator('.inspection-canvas').evaluate(el=>el.getBoundingClientRect().height)>220);
 await usedWild.screenshot({path:path.join(output,'two-rows-paused-map-r40.png')});
 assert.deepEqual(usedWildErrors,[]);results.push({wildcardColors:true,mapSpaceRestored:true,passed:true});await usedWild.close();
 assert.deepEqual(onlineRequests,[],'Local diagnosis contacted Supabase');
 results.push({supabaseRequests:0,passed:true});
 await context.close();
 console.log(JSON.stringify({browser:browser.version(),physicalDevice:false,results},null,2));
}catch(error){
 for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
 throw error;
}finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));await browser.close();await server.close();}
