import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {nuclearBlast} from '../src/nuclear-tool.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const sizes=[[320,740],[390,844],[428,926],[740,320],[1280,800],[1920,1080]];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture(){
 const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:false,initialCards:['nuclear','double','hint'],random:()=>0});
 g.terrain=Array.from({length:45},(_,i)=>({x:i%9*2,y:Math.floor(i/9)*2}));
 g.cells=g.terrain.slice(1).map((c,i)=>({...c,id:`${c.x}:${c.y}`,symbol:['X','O','*','#'][i%4],owner:i%4===0?'local-x':i%4===1?'local-o':null}));
 g.players[0].score=25912;g.players[1].score=777;
 g.inventoryPreferences={'local-x':{inventoryDrawerCollapsed:false,territoryDrawerCollapsed:false}};return g;
}
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),errors=[],online=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});
  await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  for(const [width,height]of sizes){
   await page.setViewportSize({width,height});await page.goto(origin);
   await page.evaluate(g=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([g]));localStorage.setItem('hash3_local',JSON.stringify({id:g.id}));sessionStorage.setItem('hash3_restore_local','1');},fixture());
   await page.reload();await page.locator('.game .viewport').waitFor();await frame(page);
   const before=await read(),point={x:2,y:2},expected=nuclearBlast(before,point);assert.equal(expected.length,33);
   const select=async()=>{const tool=page.locator('.board-inventory-status [data-action="practice-tool"][data-tool="nuclear"]');await tool.scrollIntoViewIfNeeded();await tool.click();await page.locator('.terrain-cell[data-x="2"][data-y="2"]').click();await frame(page);assert.match(await page.locator('.inventory-target-banner').innerText(),/33\/33/);assert.ok(await page.locator('.nuclear-preview').count()>0);};
   await select();assert.equal((await read()).players[0].inventory.cards.nuclear,1);
   await page.locator('[data-action="cancel-tool-selection"]').click();assert.deepEqual((await read()).terrain,before.terrain);assert.deepEqual((await read()).cells,before.cells);assert.deepEqual((await read()).players,before.players);
   await page.locator('[data-action="pause"]').click();await page.evaluate(()=>sessionStorage.setItem('hash3_restore_local','1'));await page.reload();await page.locator('.paused-game').waitFor();await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();await frame(page);
   await select();await page.screenshot({path:path.join(output,`nuclear-islands-r102-${name}-${width}-preview.png`)});
   await page.locator('[data-action="confirm-area-tool"]').click();await frame(page);const after=await read();
   assert.equal(after.lastEvent.demolished,33);assert.deepEqual(after.lastEvent.affected,expected);assert.equal(after.terrain.length,12);assert.equal(after.cells.length,11);assert.equal(after.players[0].inventory.cards.nuclear,0);assert.deepEqual(after.players.map(p=>p.score),[25912,777]);assert.equal(after.pairs[0].turn,'X');
   assert.deepEqual(after.players[1].inventory,before.players[1].inventory);assert.equal(after.players[0].placements,before.players[0].placements);
   await page.screenshot({path:path.join(output,`nuclear-islands-r102-${name}-${width}-after.png`)});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({browser:name,width,height,demolished:33,previewCancelSaveResume:true,conservesScoresAndTurn:true,passed:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(e){if(page)await page.screenshot({path:path.join(output,`nuclear-islands-r102-${name}-failure.png`)}).catch(()=>{});throw e;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'nuclear-islands-r102-results.json'),JSON.stringify(results,null,2));await new Promise(r=>server.httpServer.close(r));}
