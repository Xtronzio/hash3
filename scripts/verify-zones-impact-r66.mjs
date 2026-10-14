import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const piece=(symbol,x,y)=>({id:symbol+x+','+y,symbol,x,y,owner:'local-'+symbol.toLowerCase()});
function fixture(kind='pandemic'){
 const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true});
 r.inventoryPreferences=Object.fromEntries(r.players.map(p=>[p.id,{inventoryDrawerCollapsed:false,territoryDrawerCollapsed:false}]));r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.pairs[0].active={x:3,y:3};r.players.forEach((p,i)=>{p.score=100*(i+1);p.figures=2;});
 r.cells=[piece('X',0,0),piece('X',1,0),piece('O',2,0),piece('O',0,2),piece('O',1,2),piece('X',2,2)];r.territoryNextPlacement=r.territoryNextInvasion=r.territoryNextDeathTurn=99999;
 r.territoryEvents=[{id:'r66-'+kind,kind,region:kind==='earthquake'?[{x:4,y:4},{x:5,y:4},{x:4,y:5},{x:5,y:5}]:[{x:2,y:0},{x:2,y:2}],turnsRemaining:1,announcedTurn:0}];return r;
}
async function move(page,x,y){
 await page.evaluate(({x,y})=>{const v=document.querySelector('.viewport'),c=document.querySelector('.board .terrain-cell[data-x]'),r=c.getBoundingClientRect(),b=v.getBoundingClientRect();v.scrollLeft+=r.x+(x-Number(c.dataset.x)+.5)*r.width-b.x-v.clientWidth/2;v.scrollTop+=r.y+(y-Number(c.dataset.y)+.5)*r.height-b.y-v.clientHeight/2;},{x,y});await frame(page);
 await page.locator(`.board [data-action="move"][data-x="${x}"][data-y="${y}"]`).click();
}
try{for(const [name,engine]of Object.entries({chromium,webkit,firefox})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator('.game .viewport').waitFor();await frame(page);};
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);await load(fixture());const before=await read();
  for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){
   await page.setViewportSize(size);await frame(page);
   const geometry=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {player:rect('.board-inventory-status'),board:rect('.map-wrap'),territory:rect('.territory-zone'),footer:rect('.game-bottom'),bag:rect('.board-inventory-status .inventory-dock-button'),calendar:rect('.board-territory-status [data-action="events"]'),scroll:document.documentElement.scrollWidth};});
   assert.ok(geometry.player.bottom<=geometry.board.top+1,JSON.stringify(geometry));assert.ok(geometry.board.bottom<=geometry.territory.top+1,JSON.stringify(geometry));assert.ok(geometry.bag.bottom<=geometry.board.top+1);assert.ok(geometry.calendar.top>=geometry.board.bottom-1);assert.ok(geometry.footer.bottom<=size.height+1,JSON.stringify({size,...geometry}));assert.ok(geometry.scroll<=size.width+1);assert.equal(await page.locator('.game-bottom [data-action="inventory"],.game-bottom [data-action="events"]').count(),0);
   await page.screenshot({path:path.join(output,`zones-r66-${name}-${size.width}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await frame(page);await page.locator('.board-inventory-status [data-action="inventory"]').click();assert.equal(await page.locator('#inventory-panel #territory-guide').count(),0);assert.ok(await page.locator('#inventory-panel [data-use-tool]').count()>0);await page.locator('[data-action="close-inventory"]').click();
  await page.locator('.board-territory-status [data-action="territory-inventory"]').click();assert.equal(await page.locator('#inventory-panel #territory-guide').count(),1);assert.equal(await page.locator('#inventory-panel [data-use-tool]').count(),0);await page.locator('[data-action="close-inventory"]').click();await page.locator('.board-territory-status [data-action="events"]').click();assert.equal(await page.locator('.events-sheet').isVisible(),true);await page.locator('[data-action="close-events"]').click();assert.deepEqual(await read(),before);
  await page.locator('[data-action="map"]').click();assert.equal(await page.locator('.world-map [data-action="map-inventory"]').isVisible(),true);await page.locator('.world-map [data-action="map-inventory"]').click();assert.equal(await page.locator('#inventory-panel #territory-guide').count(),0);await page.locator('[data-action="close-inventory"]').click();
  for(const kind of ['contagion','pandemic']){await load(fixture(kind));await move(page,8,8);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryImpacts?.length);const r=await read();assert.deepEqual(r.players.map(p=>p.score),[106,206]);await page.locator('.territory-zone [data-impact-id]').waitFor();assert.match(await page.locator('.territory-zone [data-impact-id]').innerText(),/X \+6 · O \+6/);assert.equal(await page.locator('#notice .score-notice-total').count(),2);}
  await load(fixture('earthquake'));await move(page,8,8);const notice=page.locator('.territory-zone [data-impact-id]');await notice.waitFor();const after=await read();assert.equal(after.terrain.length,77);await notice.click();await page.waitForFunction(()=>document.querySelectorAll('.impact-footprint').length===4);const positions=await page.locator('.impact-footprint').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.dataset.impactX),y:Number(n.dataset.impactY)})));assert.deepEqual(positions.sort((a,b)=>a.y-b.y||a.x-b.x),after.territoryImpacts[0].affected.sort((a,b)=>a.y-b.y||a.x-b.x));assert.deepEqual(await read(),after);await page.screenshot({path:path.join(output,`impact-gone-r66-${name}.png`)});await page.waitForFunction(()=>!document.querySelector('.impact-footprint'),{},{timeout:6000});assert.deepEqual(await read(),after);
  await page.locator('[data-action="pause"]').click();const paused=await read();
  for(const section of ['player','territory']){await page.locator('.paused-minimap '+(section==='player'?'[data-action="inventory"]':'[data-action="territory-inventory"]')).click();const panel=await page.locator('#inventory-panel').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=844,JSON.stringify(panel));assert.equal(await page.locator('#inventory-panel #territory-guide').count(),section==='territory'?1:0);await page.locator('[data-action="close-inventory"]').click();assert.deepEqual(await read(),paused);}
  await page.locator('.paused-minimap [data-action="events"]').click();assert.equal(await page.locator('.events-sheet').isVisible(),true);await page.locator('[data-action="close-events"]').click();assert.deepEqual(await read(),paused);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS zones / independent backpacks / converted figures / missing-cell focus: '+name);
 }catch(error){if(page){console.log('R66 diagnostics',await page.evaluate(()=>({body:document.querySelector('.game')?.className,panels:[...document.querySelectorAll('.inventory-sheet,.events-sheet')].map(e=>({class:e.className,box:e.getBoundingClientRect().toJSON()})),game:JSON.parse(localStorage.getItem('hash3_locals')||'[]')[0]?.lastEvent})));await page.screenshot({path:path.join(output,`failure-r66-${name}.png`)}).catch(()=>{});}throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'zones-r66-results.json'),JSON.stringify(results));await server.httpServer.close();}
