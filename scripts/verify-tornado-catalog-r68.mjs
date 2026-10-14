import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal,localCommand} from '../src/local.js';
import {backpackPath} from '../src/backpack-icon.js';
const backpackDOM=backpackPath.replace(/<(\w+)([^>]*?)\/>/g,'<$1$2></$1>');
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const square=x=>Array.from({length:9},(_,i)=>({x:x+i%3,y:Math.floor(i/3)}));
function fixture(symbol='X',enabled=true){const r=createLocal('solo','Jorge','',Date.now(),enabled?'normal':'advanced','untimed',enabled?'medium':'pro',symbol,!enabled,{playerInventory:enabled,faunaEnabled:enabled,territoryEnabled:!enabled});r.players[0].score=22750;r.players[1].score=18061;return localCommand(r,'pause');}
try{for(const [name,engine]of Object.entries({chromium,webkit,firefox}).filter(([name])=>!process.env.HASH3_QA_ENGINE||name===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const games=[fixture(),fixture('O',false)],errors=[],requests=[];
  const newContext=async()=>{
   const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   c.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await c.route('**/*.supabase.co/**',r=>r.abort());await c.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await c.route('https://fonts.googleapis.com/**',r=>r.abort());await c.route('https://fonts.gstatic.com/**',r=>r.abort());return c;
  };
  let context=await newContext();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  assert.equal(await page.locator('[data-action="hall-inventory"] [data-icon="backpack"]').innerHTML(),backpackDOM);
  await page.evaluate(games=>{localStorage.setItem('hash3_locals',JSON.stringify(games));localStorage.setItem('hash3_game_pins',JSON.stringify(games.map(g=>'local:'+g.id)));},games);await page.reload();await page.locator('[data-action="hall-games"]').click();const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))),before=await read();
  for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320},{width:1280,height:900}]){
   await page.setViewportSize(size);await frame(page);
   for(const [i,g]of games.entries()){
    const row=page.locator(`.saved-game[data-id="${g.id}"]`);await row.scrollIntoViewIfNeeded();assert.equal(await row.locator('[data-setting]').count(),6);
    for(const id of ['player-inventory','machine-inventory','fauna','territory'])assert.equal(await row.locator(`[data-setting="${id}"]`).getAttribute('data-enabled'),String(['player-inventory','fauna'].includes(id)?i===0:i===1));
    assert.equal(await row.locator('[data-setting="figures"]').getAttribute('data-value'),i?'advanced':'normal');assert.equal(await row.locator('[data-setting="difficulty"]').getAttribute('data-value'),i?'pro':'medium');assert.equal(await row.locator('.delete-game-button').isDisabled(),true);
    assert.equal(await row.locator('[data-setting="player-inventory"] .saved-game-setting-icon').evaluate(el=>getComputedStyle(el).color),'rgb(0, 229, 255)');
    const overflow=await row.evaluate(row=>{const b=row.getBoundingClientRect();return [...row.querySelectorAll('[data-setting]')].some(el=>{const c=el.getBoundingClientRect();return c.left<b.left||c.right>b.right;});});assert.equal(overflow,false);assert.ok((await row.boundingBox()).height<=135,JSON.stringify({size,box:await row.boundingBox()}));
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(await read(),before);await page.screenshot({path:path.join(output,`settings-r68-${name}-${size.width}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await page.locator(`.saved-game[data-id="${games[0].id}"] [data-action="load-game"]`).click();await page.locator('.paused-minimap').waitFor();
  const pausedBags=page.locator('.paused-minimap [data-icon="backpack"]');assert.equal(await pausedBags.count(),3);assert.ok((await pausedBags.evaluateAll(nodes=>nodes.map(n=>n.innerHTML))).every(v=>v===backpackDOM));
  assert.equal(await page.locator('.paused-inventory-bag').first().evaluate(el=>getComputedStyle(el).color),'rgb(0, 229, 255)');await page.locator('[data-action="resume"]').click();await page.locator('.game .viewport').waitFor();
  const player=page.locator('.board-inventory-status .inventory-dock-button [data-icon="backpack"]'),territory=page.locator('.board-territory-status [data-icon="backpack"]');assert.equal(await player.innerHTML(),backpackDOM);assert.equal(await territory.innerHTML(),backpackDOM);assert.equal(await territory.evaluate(el=>getComputedStyle(el).color),'rgb(255, 206, 51)');
  await context.close();
  // Separate page context isolates this fixture from the previous game's
  // lifecycle suspension and any pending UI callback.
  context=await newContext();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const r=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:true}),groups=[square(0),square(6),square(12)];r.terrain=[...groups.flat(),{x:4,y:4}];r.players.forEach((p,i)=>{p.score=100*(i+1);p.figures=2;});
  r.cells=groups.flatMap((g,j)=>[['X',0,0],['X',1,0],['O',2,0],['O',0,2],['O',1,2],['X',2,2]].map(([symbol,x,y],i)=>({id:j+':'+i,x:g[0].x+x,y,symbol,owner:'local-'+symbol.toLowerCase()})));r.territoryEvents=[{id:'triple-r68-4',kind:'tornado',region:groups.flat(),groups,turnsRemaining:1,announcedTurn:0}];r.territoryNextPlacement=r.territoryNextInvasion=999999;
  await context.addInitScript(r=>{if(!localStorage.getItem('r68-seeded')){localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');localStorage.setItem('r68-seeded','1');}},r);
  await page.goto(origin);await page.locator('.game .viewport').waitFor();await page.locator('[data-action="fit-board"]').click();await frame(page);assert.equal(await page.locator('[data-cell-glyph="tornado"]').count(),3);await page.screenshot({path:path.join(output,`three-tornados-r68-${name}.png`)});
  const overview=page.locator('.board-overview-map');
  if(await overview.count()){
   const point=await overview.evaluate(svg=>{const v=svg.viewBox.baseVal,b=svg.getBoundingClientRect();return {x:(4.5-v.x)/v.width*b.width,y:(4.5-v.y)/v.height*b.height};});
   await overview.click({position:point});await frame(page);
  }
  const move=page.locator('.board .terrain-cell[data-x="4"][data-y="4"]');assert.equal(await move.getAttribute('data-action'),'move',JSON.stringify({cell:await move.getAttribute('aria-label'),game:(await read())[0]}));await move.click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0].territoryEvents.length===0);const next=(await read())[0];assert.deepEqual(next.players.map(p=>p.score),[109,206]);assert.deepEqual(next.players.map(p=>p.inventory.cards),r.players.map(p=>p.inventory.cards));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,passed:true});console.log('PASS three tornados / one backpack / real saved settings: '+name);
 }catch(error){if(page)await page.screenshot({path:path.join(output,`failure-r68-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'tornado-catalog-r68-results.json'),JSON.stringify(results));await new Promise(r=>server.httpServer.close(r));}
