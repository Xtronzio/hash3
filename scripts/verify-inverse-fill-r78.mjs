import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
import {scaledInverseBoard,INVERSE_DRAWINGS} from '../src/inverse-catalog.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const cell=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='X'?'local-x':'local-o'});
const fixture=()=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',true,{variant:'inverse',board:INVERSE_PRESETS[3]});g.inverseVersion=2;delete g.inverseContour;return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[],online=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();};
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto(origin);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('hash3_name','Jorge');});await page.reload();
  await page.locator('[data-action="hall-mode"][data-mode="solo"]').click();await page.locator('[data-action="setup-variant"][data-variant="inverse"]').click();
  assert.equal(await page.locator('.local-dialog select:visible').count(),0);assert.equal(await page.locator('[data-action="inverse-drawing-choice"]').count(),22);
  await page.locator('[data-action="inverse-drawing-choice"][data-drawing="heart"]').click();
  let counts=[];for(const scale of ['s','m','l','xl']){await page.locator(`[data-action="inverse-scale"][data-scale="${scale}"]`).click();counts.push(Number((await page.locator('.inverse-drawing-count').textContent()).replace(/[^\d]/g,'')));}assert.equal(counts[0],32);for(let i=1;i<4;i++)assert.ok(counts[i]>counts[i-1]);
  await page.locator('[data-action="inverse-scale"][data-scale="s"]').click();await page.locator('[data-setup-select="local-time-mode"][data-value="untimed"]').click();
  if(width===390){await page.locator('#inverse-drawing-gallery').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`a-inverse-selector-r78-${name}.png`)});}
  await page.locator('[data-action="start-local"]').click();await page.locator('.inverse-game').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(saved.inverseVersion,3);assert.equal(saved.cells.length,0);assert.equal(saved.inverseFill.length,32);assert.ok(await page.locator('.board .inverse-filled').count()>0||await page.locator('.board-overview-map .inverse-map-outline').count()>0);assert.ok(await page.locator('.board [class*="inverse-edge-"]').count()>0||await page.locator('.board-overview-map .inverse-map-outline').count()>0);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(await page.locator('.board .inverse-filled').count()){
   const fit=await page.evaluate(()=>{const v=document.querySelector('.viewport').getBoundingClientRect();return [...document.querySelectorAll('.board .inverse-filled')].every(el=>{const r=el.getBoundingClientRect();return r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1;});});
   assert.ok(fit,'The entire initial drawing must fit inside the playable viewport');
  }
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-filled-r78-${name}.png`)});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  // A combo entirely on cleared spaces remains usable and must pay zero.
  const g=fixture();g.inverseFill=['5,5'];g.cells=[cell(0,0),cell(1,0)];g.players[0].figures=2;await load(g);
  const target=page.locator('.board [data-action="move"][data-x="2"][data-y="0"]');assert.match(await target.getAttribute('class'),/inverse-cleared/);await target.click();
  const n=await page.evaluate(id=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id),g.id);assert.equal(n.players[0].score,0);assert.equal(n.players[0].figures,2);assert.equal(n.cells.length,0);assert.deepEqual(n.inverseFill,['5,5']);assert.equal(n.status,'playing');
  assert.equal(await page.locator('.board .inverse-filled').count(),1);assert.ok(await page.locator('.board [class*="inverse-edge-"]').count()>0);
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-cleared-r78-${name}.png`)});
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.ok(await page.locator('.inverse-map-outline').count()>0);await page.locator('[data-action="resume"]').click();await page.locator('.game').waitFor();
  results.push({name,width,height,visualChoices:true,sizes:counts,emptyStart:true,fillProgress:true,zeroPointsWithoutFill:true,persistentContour:true,pause:true});
 }
 const last=fixture();last.inverseFill=['2,0'];last.cells=[cell(0,0),cell(1,0),cell(5,5,'O')];last.players[1].score=99;await load(last);await page.locator('.board [data-action="move"][data-x="2"][data-y="0"]').click();await page.locator('.finished').waitFor();const done=await page.evaluate(id=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id),last.id);assert.equal(done.inverseFill.length,0);assert.equal(done.cells.length,1);assert.equal(done.finishReason,'inverse-empty');assert.equal(done.players[1].score,99);
 // Real matrix includes the existing rendering/windowing path on a large fill board.
 const large=fixture(),drawing=scaledInverseBoard(INVERSE_DRAWINGS.find(d=>d.id==='skull'),'xl');large.terrain=drawing.terrain;large.inverseFill=large.terrain.map(c=>`${c.x},${c.y}`);large.pairs[0].active={...large.terrain[0]};large.pairs[0].terrainAnchor={...large.terrain[0]};await load(large);await page.locator('[data-action="fit-board"]').click();assert.ok(await page.locator('.board .cell').count()<3000);await page.locator('[data-action="map"]').click();assert.ok(await page.locator('.world-map .inverse-map-outline').count());
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inverse-fill-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-fill-r78.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R78: ${results.length} viewport/engine cases passed`);
