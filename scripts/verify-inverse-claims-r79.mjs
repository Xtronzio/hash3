import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const tile=(x,y,symbol='X')=>({id:`${symbol}:${x},${y}`,x,y,symbol,owner:symbol==='#'?null:symbol==='X'?'local-x':'local-o'});
const make=(mode='local',symbol='X')=>{const g=createLocal(mode,'Jorge','Rival',Date.now(),'normal','untimed','pro','X',true,{variant:'inverse',board:INVERSE_PRESETS[3]});g.cells=[tile(0,0,symbol),tile(1,0,symbol),tile(2,0,symbol)];g.pairs[0].turn=symbol;return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();const errors=[],online=[];
 page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const load=async game=>{await page.goto(origin);await page.evaluate(game=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);await page.reload();await page.locator('.game .viewport').waitFor();};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
 for(const [width,height]of [[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]]){
  await page.setViewportSize({width,height});let g=make();g.inverseFill=['2,0','5,5'];await load(g);
  const before=await stored();await page.locator('[data-action="inverse-claim-toggle"]').click();await page.locator('.inverse-claim-panel').waitFor();
  const point=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"][data-y="0"]');await point.evaluate(el=>el.scrollIntoView({block:'start',inline:'start'}));await point.click({position:{x:5,y:5}});
  assert.equal(await page.locator('.inverse-claim-highlight').count(),3);assert.match(await page.locator('.inverse-claim-confirm').textContent(),/Cobrar(?: combo)? \+3/);
  assert.deepEqual(await stored(),before,'Preview must not spend, score or end a turn');
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-claim-r79-${name}.png`)});
  await page.locator('[data-action="inverse-claim-confirm"]').click();let n=await stored();assert.equal(n.players[0].score,3);assert.equal(n.cells.length,0);assert.deepEqual(n.inverseFill,['5,5']);assert.equal(n.pairs[0].turn,'O');assert.deepEqual(n.terrain,g.terrain);
  assert.equal(await page.locator('.inverse-claim-panel').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  g=make();g.inverseFill=['5,5'];await load(g);await page.locator('[data-action="inverse-claim-toggle"]').click();const empty=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"][data-y="0"]');await empty.evaluate(el=>el.scrollIntoView({block:'start',inline:'start'}));await empty.click({position:{x:5,y:5}});assert.match(await page.locator('.inverse-claim-confirm').textContent(),/sin puntos/);await page.locator('.inverse-claim-confirm').click();n=await stored();assert.equal(n.players[0].score,0);assert.deepEqual(n.inverseFill,['5,5']);
  g=make();g.cells=[tile(0,0),tile(1,0),tile(0,1),tile(1,1)];await load(g);await page.locator('[data-action="inverse-claim-toggle"]').click();const square=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"][data-y="0"]');await square.evaluate(el=>el.scrollIntoView({block:'start',inline:'start'}));await square.click({position:{x:5,y:5}});
  assert.equal(await page.locator('.inverse-claim-highlight').count(),4);assert.equal(await page.locator('[data-action="inverse-claim-choice"]').count(),0);assert.match(await page.locator('.inverse-combo-summary').textContent(),/5 figuras/);assert.match(await page.locator('.inverse-claim-confirm').textContent(),/Cobrar combo \+19/);
  if(width===390)await page.screenshot({path:path.join(output,`a-inverse-combo-r80-${name}.png`)});
  await page.locator('.inverse-claim-confirm').click();n=await stored();assert.equal(n.players[0].score,19);assert.equal(n.players[0].figures,5);assert.equal(n.cells.length,0);assert.equal(n.inverseFill.length,32);
  for(const slope of [1,-1]){g=make();g.cells=[tile(0,slope===1?0:2),tile(1,1,'#'),tile(2,slope===1?2:0)];await load(g);await page.locator('[data-action="inverse-claim-toggle"]').click();const diagonal=page.locator('.board [data-action="inverse-claim-cell"][data-x="0"]');await diagonal.evaluate(el=>el.scrollIntoView({block:'start',inline:'start'}));await diagonal.click({position:{x:5,y:5}});assert.equal(await page.locator('.inverse-claim-highlight').count(),3);await page.locator('.inverse-claim-confirm').click();n=await stored();assert.equal(n.players[0].score,3);assert.equal(n.cells.length,0);}
  // # is placed by the board after the ninth accepted placement, not by a claim.
  g=make();g.cells=[];g.inverseMoves=8;await load(g);const move=page.locator('.board [data-action="move"]').first();await move.click();n=await stored();assert.equal(n.inverseMoves,9);assert.equal(n.cells.filter(c=>c.symbol==='#').length,1);assert.equal(n.players[0].score,0);assert.match(await page.locator('.inverse-wild-clock').textContent(),/# 9/);
  await page.locator('[data-action="pause"]').click();await page.locator('[data-action="resume"]').click();assert.equal((await stored()).inverseMoves,9);
  results.push({name,width,height,claimPreview:true,claimConsumesTurn:true,zeroWithoutFill:true,wildcard:true,pause:true,fullCombo:true,bothDiagonals:true});
 }
 const oldHint=make();delete oldHint.inverseClaimVersion;oldHint.cells=[tile(0,0),tile(1,0),tile(0,1),tile(1,1)];oldHint.practiceHint={player:'local-x',action:'claim',x:0,y:0,figureId:'X:cuadrado:0,0;0,1;1,0;1,1'};await load(oldHint);await page.locator('.inverse-claim-panel').waitFor();assert.equal(await page.locator('.inverse-claim-highlight').count(),4);await page.locator('.inverse-claim-confirm').click();assert.equal((await stored()).players[0].score,19);
 // Real Worker and runner must accept claim, not replace it with an emergency move.
 const bot=make('solo','O');bot.cells=[tile(0,0,'O'),tile(1,0,'O'),tile(0,1,'O'),tile(1,1,'O')];bot.inverseFill=['0,0','1,0','0,1','1,1'];await page.setViewportSize({width:390,height:844});await load(bot);await page.locator('.finished').waitFor({timeout:15000});const finished=await stored();assert.equal(finished.lastEvent.kind,'claim');assert.equal(finished.players[1].score,19);assert.equal(finished.finishReason,'inverse-empty');
 assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`inverse-claim-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'inverse-claims-r79.json'),JSON.stringify(results,null,2));}
console.log(`Inverso R79: ${results.length} viewport/engine cases and real Worker claims passed`);
