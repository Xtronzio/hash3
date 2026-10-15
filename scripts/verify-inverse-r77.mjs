import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal,localCommand} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const at=Date.now(),original=createLocal('local','Original','Rival',at,'normal','untimed');original.status='paused';
const make=(cells)=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',true,{variant:'inverse',board:INVERSE_PRESETS[3],initialCards:['erase','shift','opposite'],secondInitialCards:['erase','shift','opposite']});if(cells){g.cells=cells;g.inverseVersion=1;delete g.inverseFill;}return g;};
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='X'?'local-x':'local-o'});
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let lastPage;
 try{const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[],online=[];
 lastPage=page;page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(({game,original})=>{localStorage.clear();localStorage.setItem('hash3_name','Jorge');localStorage.setItem('hash3_locals',JSON.stringify([original,game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},{game,original});await page.reload();await page.locator('.game .viewport').waitFor();};
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto(origin);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('hash3_name','Jorge');});await page.reload();
  assert.equal(await page.locator('[data-action="hall-play"]').count(),0);
  await page.locator('[data-action="hall-mode"][data-mode="solo"]').click();await page.locator('.local-dialog').waitFor();
  await page.locator('[data-action="setup-variant"][data-variant="inverse"]').click();assert.equal(await page.locator('#original-goals').isVisible(),false);assert.equal(await page.locator('[for="fauna-enabled"]').isVisible(),false);assert.ok(await page.locator('#inverse-drawing-preview svg').isVisible());
  assert.equal(await page.locator('.local-dialog [data-action="starter-card"][data-tool="nuclear"]').count(),0);
  await page.locator('[data-action="inverse-create"]').click();await page.locator('.inverse-editor-canvas').waitFor();
  await page.locator('#inverse-board-name').fill('Mi dibujo de prueba');const canvas=page.locator('.inverse-editor-canvas');await canvas.focus();
  for(let i=0;i<3;i++){await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');}await page.keyboard.press('ArrowDown');for(let i=0;i<3;i++){await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');}
  await page.waitForFunction(()=>document.querySelector('.inverse-editor-summary output')?.textContent==='6 celdas');assert.equal(await page.locator('.inverse-editor-summary output').textContent(),'6 celdas');
  const bounds=await page.locator('.inverse-editor').boundingBox();assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,JSON.stringify({name,width,bounds}));
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-editor-r77-${name}.png`)});
  await page.locator('[data-editor-save]').click();assert.equal(await page.locator('#inverse-drawing option:checked').textContent(),'Mi dibujo de prueba · 6 celdas · mío');
  await page.locator('[data-setup-select="local-time-mode"][data-value="untimed"]').click();await page.locator('[data-action="start-local"]').click();await page.locator('.game.inverse-game .viewport').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);assert.equal(saved.variant,'inverse');assert.equal(saved.terrain.length,6);assert.equal(saved.inverseBoard.name,'Mi dibujo de prueba');assert.equal(saved.faunaEnabled,false);assert.equal(saved.territoryEnabled,false);
  assert.equal(await page.locator('.board-territory-status').isVisible(),false);assert.equal(await page.locator('.game [data-tool="activate"]').count(),0);assert.equal(await page.locator('.game [data-tool="nuclear"]').count(),0);
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-game-r77-${name}.png`)});
  await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();assert.equal(await page.locator('.custom-territory-band').count(),0);await page.locator('[data-action="resume"]').click();await page.locator('.game.inverse-game').waitFor();
  results.push({name,width,height,selector:true,editor:true,savedDrawing:true,territoryAbsent:true,pause:true});
 }
 // Real board clicks: score overlapping figures, empty content, preserve source.
 const g=make([tile(0,0),tile(1,0),tile(0,1)]);await load(g);await page.locator('.board [data-action="move"][data-x="1"][data-y="1"]').click();await page.locator('.finished').waitFor();const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals')));assert.deepEqual(stored.find(x=>x.id===original.id),original);const finished=stored.find(x=>x.id===g.id);assert.equal(finished.cells.length,0);assert.equal(finished.players[0].score,16);assert.equal(finished.finishReason,'inverse-empty');assert.deepEqual(finished.terrain,g.terrain);
 // Both-color movement and neutral Borrar are available through the real bag.
 const move=make([tile(0,0,'O'),tile(1,0,'O'),tile(5,5,'O')]);await load(move);await page.locator('[data-action="practice-tool"][data-tool="shift"]').first().click();await page.locator('.board [data-action="inventory-target"][data-x="5"][data-y="5"]').click();await page.locator('.board [data-action="inventory-target"][data-x="2"][data-y="0"]').click();await page.locator('.finished').waitFor();const moved=await page.evaluate(id=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id),move.id);assert.equal(moved.players[1].score,3);assert.equal(moved.cells.length,0);
 // Independent machine worker plays O and returns control to human X.
 const solo=createLocal('solo','Jorge','',Date.now(),'normal','untimed','medium','X',true,{variant:'inverse'});solo.pairs[0].turn='O';await load(solo);await page.waitForFunction(id=>{const g=JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id);return g.players[1].placements>0;},solo.id);assert.equal((await page.evaluate(id=>JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id),solo.id)).pairs[0].turn,'X');
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await lastPage?.screenshot({path:path.join(output,`inverse-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-r77.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R77: ${results.length} viewport/engine cases passed`);
