import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture({symbol='X',status='playing',remaining=1}={}){
 const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:true,territoryEnabled:true});
 r.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));r.pairs[0].active={x:0,y:0};r.pairs[0].turn=symbol;
 r.players.forEach(p=>{p.inventory.cards={double:3,opposite:3,hint:3};p.inventory.comboPending=1;});
 r.cells=[{id:'x',x:0,y:0,symbol:'X',owner:'local-x'},{id:'o',x:2,y:0,symbol:'O',owner:'local-o'}];
 r.territoryNextPlacement=r.territoryNextInvasion=99999;
 r.territoryEvents=[{id:'imminent',kind:'ufo',x:2,y:0,region:[{x:2,y:0}],turnsRemaining:remaining,announcedTurn:0},{id:'later',kind:'contagion',x:0,y:0,region:[{x:0,y:0}],turnsRemaining:3,announcedTurn:0}];
 r.turnCards={'local-x':[], 'local-o':['double']};r.lastEvent={id:'historical',kind:'inventory',player:'local-o',tool:'double'};r.status=status;return r;
}
try{for(const [name,engine] of Object.entries({chromium,webkit,firefox}).filter(([n])=>!process.env.HASH3_QA_ENGINE||n===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator(r.status==='paused'?'.paused-minimap .inspection-canvas':'.game .viewport').waitFor();await frame(page);};
  for(const size of [{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:740,height:320},{width:1280,height:900},{width:1920,height:1080}])for(const status of ['playing','paused'])for(const symbol of ['X','O']){
   await page.setViewportSize(size);await load(fixture({symbol,status}));const before=await read();
   const scope=status==='paused'?'.paused-minimap':'.game';
   const geometry=await page.locator(scope).evaluate(root=>{
    const style=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,color:s.color,x:r.x,right:r.right,y:r.y,bottom:r.bottom,fontSize:s.fontSize,stroke:s.strokeWidth};};
    const toolbar=root.querySelector('.inspection-tools,.band-toolbar');
    return {arrows:[...root.querySelectorAll('.band-main-controls svg')].filter(e=>e.checkVisibility()).map(style),bags:[...toolbar.querySelectorAll('[data-icon="backpack"]')].map(style),counters:[...toolbar.querySelectorAll('[data-paused-inventory]')].map(el=>({side:el.dataset.pausedInventory,box:style(el),counter:style(el.querySelector('.inventory-capacity-value')),symbol:el.classList.contains('o')?'O':'X'}))};
   });
   assert.equal(geometry.bags.length,2);assert.equal(geometry.counters.length,2);assert.ok(geometry.arrows.every(a=>a.width===24&&a.height===24),JSON.stringify({size,status,symbol,geometry}));
   assert.equal(geometry.bags[0].width,geometry.bags[1].width);assert.equal(geometry.bags[0].height,geometry.bags[1].height);assert.ok(geometry.bags.every(b=>b.color==='rgb(0, 229, 255)'));
   for(const c of geometry.counters){assert.equal(c.counter.color,c.symbol==='X'?'rgb(255, 74, 88)':'rgb(36, 211, 147)');assert.ok(c.counter.x>=c.box.x&&c.counter.right<=c.box.right+1);}
   assert.equal(geometry.counters[0].counter.fontSize,geometry.counters[1].counter.fontSize,JSON.stringify({size,status,symbol,geometry}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const territoryScope=status==='paused'?scope:'.board-territory-status';
   const card=page.locator(`${territoryScope} .territory-rows [data-ecology-kind="ufo"]`);
   assert.match(await card.getAttribute('class'),/is-imminent/);
   assert.equal(await card.evaluate(e=>getComputedStyle(e).animationName),status==='playing'?'ecologyActivate':'none');
   assert.doesNotMatch(await page.locator(`${territoryScope} .territory-rows [data-ecology-kind="contagion"]`).getAttribute('class'),/is-imminent/);
   if(status==='playing'){
    const warning=page.locator('.territory-zone>.turn-warnings [data-kind="ufo"]');assert.equal(await warning.evaluate(e=>getComputedStyle(e).animationName),'ecologyActivate');assert.equal(await warning.evaluate(e=>getComputedStyle(e).animationIterationCount),'infinite');
    assert.ok(await page.locator('.turn-used-cards [data-used-tool]').evaluateAll(nodes=>nodes.every(n=>n.getAnimations().length===0)),'Historical cards must not replay');
   }
   assert.deepEqual(await read(),before);
   if(size.width===390&&symbol==='X')await page.screenshot({path:path.join(output,`feedback-r71-${name}-${status}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await load(fixture());const before=await read();
  await page.locator('.board-inventory-status [data-tool="double"]').click();
  const used=page.locator('.turn-used-cards [data-used-tool="double"][data-used-player="local-x"]');await used.waitFor();
  const light=await used.evaluate(el=>el.getAnimations().map(a=>({duration:a.effect.getTiming().duration,iterations:a.effect.getTiming().iterations,frames:a.effect.getKeyframes()})));
  assert.ok(light.some(a=>a.duration===650&&a.iterations===3&&a.frames.some(f=>f.boxShadow?.includes('0, 229, 255'))),JSON.stringify(light));
  assert.equal(await page.locator('.turn-used-cards [data-used-player="local-o"]').evaluateAll(nodes=>nodes.reduce((n,e)=>n+e.getAnimations().length,0)),0,'Do not animate the rival history for our use');
  const after=await read();assert.equal(after.players[0].inventory.cards.double,before.players[0].inventory.cards.double-1);assert.deepEqual(after.players[1].inventory,before.players[1].inventory);assert.deepEqual(after.territoryEvents,before.territoryEvents);assert.deepEqual(after.players.map(p=>p.score),before.players.map(p=>p.score));
  await page.locator('[data-action="pause"]').click();assert.equal(await page.locator('.paused-minimap [data-ecology-kind="ufo"]').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'reduce'});await load(fixture());assert.equal(await page.locator('.territory-zone>.turn-warnings [data-kind="ufo"]').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('.board-inventory-status [data-tool="double"]').click();assert.equal(await page.locator('.turn-used-cards [data-used-player="local-x"]').evaluateAll(nodes=>nodes.reduce((n,e)=>n+e.getAnimations().length,0)),0);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS equal arrows / X-O counters / automatic imminent light / accepted card use / no history replay: '+name);
 }catch(error){if(page)await page.screenshot({path:path.join(output,`failure-r71-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'feedback-r71-results.json'),JSON.stringify(results));await new Promise(r=>server.httpServer.close(r));}
