import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
import {normalizeInventoryPreferences} from '../src/inventory-layout.js';

const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture({folded=false,status='playing',disabled=false,large=false,mode='local',humanSymbol='X',protectedNow=false,excess=false}={}){
 const r=createLocal(mode,'Jorge','Rival',Date.now(),'normal','untimed','medium',humanSymbol,false,{faunaEnabled:true,territoryEnabled:true,playerInventory:!disabled});
 const count=large?33333:304,width=large?183:19;
 r.terrain=Array.from({length:count},(_,i)=>({x:i%width,y:Math.floor(i/width)}));r.pairs[0].active={x:6,y:6};
 r.cells=r.terrain.filter((_,i)=>i%5!==0).map((c,i)=>({...c,id:'r67-'+i,symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));
 r.players.forEach((p,i)=>{p.score=i?18181:23058;p.inventory.cards=Object.fromEntries(['double','opposite','erase','shift','bomb','border'].map(t=>[t,3]));p.inventory.comboPending=1;});
 r.inventoryPreferences=Object.fromEntries(r.players.map(p=>[p.id,normalizeInventoryPreferences({inventoryCollapsed:folded,territoryCollapsed:folded})]));
 if(protectedNow)r.inventoryEffects.immunities=[{player:'local-x',turnsRemaining:3}];
 if(excess)r.players[0].inventory.cards.double=84;
 r.status=status;return r;
}
try{for(const [name,engine]of Object.entries({chromium,webkit,firefox}).filter(([name])=>!process.env.HASH3_QA_ENGINE||name===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  // Keep layout QA independent of remote font service availability.
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator(r.status==='paused'?'.paused-minimap .inspection-canvas':'.game .viewport').waitFor();await frame(page);};
  for(const size of [{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:740,height:320},{width:1280,height:900},{width:1920,height:1080}])for(const status of ['playing','paused'])for(const folded of [false,true]){
   await page.setViewportSize(size);await load(fixture({folded,status}));const before=await read();
   const geometry=await page.evaluate(({status,folded})=>{
    const q=s=>document.querySelector(s),box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,center:r.y+r.height/2};};
    const root=q(status==='paused'?'.paused-minimap':'.game'),toolbar=q(status==='paused'?'.inspection-tools':'.board-inventory-status .band-toolbar');
    const bags=status==='paused'?[...toolbar.querySelectorAll('[data-paused-inventory]')]:[toolbar.querySelector('.inventory-dock-button')];
    const zoom=toolbar.querySelector(status==='paused'?'[data-inspect-action="fit"]':'[data-action="fit-board"]');
    const territory=[...root.querySelectorAll('.custom-territory-band .band-actions button')].filter(el=>el.checkVisibility()).map(box);
    const controls=[...toolbar.querySelectorAll('button,summary')].filter(el=>el.checkVisibility()).map(box);
    const overflow=[...toolbar.querySelectorAll('.inventory-badge,.inventory-pending')].some(el=>{const child=box(el),parent=box(el.closest('button'));return child.x<parent.x||child.right>parent.right||child.y<parent.y||child.bottom>parent.bottom;});
    const rows=[...root.querySelectorAll('.custom-band-content .inventory-icon-row')].filter(el=>el.checkVisibility()).map(row=>[...row.children].map(box));
    const canvas=box(root.querySelector(status==='paused'?'.inspection-canvas':'.map-wrap'));
    return {toolbar:box(toolbar),bags:bags.map(box),zoom:box(zoom),territory,controls,rows,canvas,overflow,scroll:document.documentElement.scrollWidth};
   },{status,folded});
   assert.ok(geometry.scroll<=size.width+1,JSON.stringify({size,status,folded,geometry}));assert.equal(geometry.overflow,false,JSON.stringify({size,status,folded,geometry}));
   for(const bag of geometry.bags)assert.ok(Math.abs(bag.center-geometry.zoom.center)<1,JSON.stringify({size,status,folded,geometry}));
   for(const control of geometry.controls){assert.ok(control.width>=44&&control.height>=44,JSON.stringify({size,status,folded,control}));assert.ok(control.x>=0&&control.right<=size.width+1);}
   assert.ok(geometry.canvas.height>=40,JSON.stringify({size,status,folded,geometry}));
   for(const control of geometry.territory){assert.equal(control.height,44);assert.equal(control.width,44);}
   if(!folded)for(const row of geometry.rows)for(const card of row){assert.equal(card.width,44);assert.equal(card.height,44,JSON.stringify({size,status,folded,geometry}));}
   assert.deepEqual(await read(),before);await page.screenshot({path:path.join(output,`alignment-r67-${name}-${size.width}-${status}-${folded?'folded':'open'}.png`)});
  }
  for(const folded of [false,true]){
   await page.setViewportSize({width:320,height:740});await load(fixture({folded,protectedNow:true,excess:true}));const saved=await read();
   const overflow=await page.locator('.board-inventory-status .inventory-dock-button').evaluate(button=>{const r=button.getBoundingClientRect();return [...button.querySelectorAll('.inventory-badge,.inventory-pending,.dock-immunity-active')].some(el=>{const c=el.getBoundingClientRect();return c.left<r.left||c.right>r.right||c.top<r.top||c.bottom>r.bottom;});});
   assert.equal(overflow,false);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(await read(),saved);
   await page.screenshot({path:path.join(output,`alignment-r67-${name}-protected-excess-${folded}.png`)});
  }
  for(const humanSymbol of ['X','O']){await load(fixture({mode:'solo',humanSymbol,status:'paused'}));const saved=await read();assert.equal(await page.locator('[data-paused-inventory="own"]').getAttribute('data-paused-player'),saved.humanId);assert.deepEqual(await read(),saved);}
  await page.setViewportSize({width:390,height:844});await load(fixture({status:'paused'}));const before=await read();
  await page.locator('.paused-minimap [data-action="inventory"]').click();assert.equal(await page.locator('#inventory-panel #territory-guide').count(),0);await page.locator('[data-action="close-inventory"]').click();assert.deepEqual(await read(),before);
  await page.locator('[data-action="expand-pause-map"]').click();await page.locator('.inspection-fullscreen').waitFor();await page.locator('.inspection-fullscreen [data-action="close-pause-map"]').click();assert.deepEqual(await read(),before);
  await page.locator('[data-action="resume"]').click();await page.locator('.game').waitFor();
  await page.locator('[data-action="map"]').click();await page.locator('.world-map [data-action="map-inventory"]').click();await page.locator('[data-action="close-inventory"]').click();await page.locator('[data-action="map"]').click();await page.locator('[data-action="close-map"]').click();
  await load(fixture({disabled:true}));assert.equal(await page.locator('.board-inventory-status [data-action="fit-board"]').isVisible(),true);assert.equal(await page.locator('.board-inventory-status [data-action="inventory"]').count(),0);
  await page.locator('[data-action="pause"]').click();assert.equal(await page.locator('[data-paused-inventory] .inventory-capacity-value').allTextContents().then(x=>x.every(v=>v==='-/-')),true);
  await load(fixture({large:true}));assert.ok(await page.locator('.board .cell').count()<1000);await page.locator('[data-action="fit-board"]').click();await frame(page);assert.ok(await page.locator('.board .cell').count()<1000);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS aligned controls / readable stock / folded and open / pause / map / 33333: '+name);
 }catch(error){if(page){await page.screenshot({path:path.join(output,`failure-r67-${name}.png`)}).catch(()=>{});}throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'alignment-r67-results.json'),JSON.stringify(results));await server.httpServer.close();}
