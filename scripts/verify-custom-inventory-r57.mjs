import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {nuclearBlast} from '../src/nuclear-tool.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{
 for(const [name,engine] of Object.entries({chromium,webkit,firefox})){
  const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:name!=='firefox',serviceWorkers:'block'}),errors=[],requests=[];
   context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','high','X',true,{faunaEnabled:false,territoryEnabled:false});
   game.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));game.pairs[0].active={x:3,y:3};game.pairs[0].terrainAnchor={x:0,y:0};
   game.cells=game.terrain.filter(c=>(c.x+c.y)%3!==0).map((c,i)=>({...c,id:`qa:${c.x}:${c.y}`,symbol:['X','O','*','#'][i%4],owner:i%4===0?'local-x':i%4===1?'local-o':null}));
   for(const p of game.players)for(const t of Object.keys(p.inventory.cards))p.inventory.cards[t]=0;
   Object.assign(game.players[0].inventory.cards,{double:1,hint:1,nuclear:1,sapper:1});game.players[0].score=12345;game.players[0].inventory.immunity.cards['immunity-1']=2;
   await context.addInitScript(game=>{if(!localStorage.getItem('hash3_locals')){localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));}sessionStorage.setItem('hash3_restore_local','1');},game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();await frame(page);
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
   const tap=async node=>name==='firefox'?node.click():node.tap();
   const before=await read();assert.equal(await page.locator('.floating-immunity').count(),0);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"]').count(),1);assert.equal(await page.locator('[data-action="plus"],[data-action="minus"]').count(),0);assert.equal(await page.locator('[data-action="fit-board"]').count(),1);
   const initialHeight=await page.locator('.viewport').evaluate(n=>n.clientHeight);
   await tap(page.locator('.board-inventory-status [data-action="edit-inventory-layout"]'));
   const source=page.locator('[data-edit-tool="nuclear"] .inventory-order-handle'),destination=page.locator('[data-edit-tool="double"]');
   await source.scrollIntoViewIfNeeded();const a=await source.boundingBox(),b=await destination.boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
   assert.equal((await read()).inventoryPreferences['local-x'].order[0],'nuclear');
   for(const tool of ['double','hint','nuclear']){await tap(page.locator(`[data-edit-tool="${tool}"] [data-action="inventory-edit-select"]`));await tap(page.locator('[data-action="inventory-float-toggle"]'));}
   await tap(page.locator('[data-action="close-inventory-layout"]'));await frame(page);
   assert.equal(await page.locator('.map-wrap > .floating-inventory-card').count(),3);
   for(const tool of ['double','hint','nuclear'])assert.equal(await page.locator(`.board-inventory-status [data-tool="${tool}"]`).count(),0);
   let after=await read();assert.deepEqual(after.terrain,before.terrain);assert.deepEqual(after.cells,before.cells);assert.deepEqual(after.pairs,before.pairs);assert.deepEqual(after.players,before.players);assert.equal(after.version,before.version);assert.equal(after.clockNow,before.clockNow);assert.equal(after.updatedAt,before.updatedAt);
   // Drag a disabled/active-independent handle. It neither spends the card nor
   // changes the viewport camera, so favorite placement is independent of pan.
   const handle=page.locator('.map-wrap > [data-floating-tool="double"] .favorite-drag-handle'),h=await handle.boundingBox(),camera=await page.locator('.viewport').evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}));
   await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+55,h.y+h.height/2-50,{steps:10});await page.mouse.up();
   after=await read();assert.ok(after.inventoryPreferences['local-x'].positions.double);assert.equal(after.players[0].inventory.cards.double,1);assert.deepEqual(await page.locator('.viewport').evaluate(n=>({x:n.scrollLeft,y:n.scrollTop})),camera);
   await tap(page.locator('.board-inventory-status [data-action="toggle-inventory-bar"]'));await tap(page.locator('.board-territory-status [data-action="toggle-territory-bar"]'));await frame(page);
   const fullHeight=await page.locator('.viewport').evaluate(n=>n.clientHeight);assert.ok(fullHeight>=initialHeight+100,`${name}: folding did not enlarge territory (${initialHeight}→${fullHeight})`);
   assert.equal(await page.locator('.board-inventory-status .custom-band-content').isVisible(),false);assert.equal(await page.locator('.board-territory-status .custom-band-content').isVisible(),false);
   const savedPosition=(await read()).inventoryPreferences['local-x'].positions.double;
   await page.reload();await page.locator('.paused-game').waitFor();assert.equal((await read()).status,'paused');await tap(page.locator('[data-action="resume"]'));await page.locator('.game .viewport').waitFor();await frame(page);assert.equal(await page.locator('.board-inventory-status .custom-band-content').isVisible(),false);assert.deepEqual((await read()).inventoryPreferences['local-x'].positions.double,savedPosition);
   // Favorites are also reachable from the overview, where selecting a card
   // closes that overview before targeting the actual board.
   await tap(page.locator('[data-action="map"]'));await frame(page);assert.equal(await page.locator('.world-map > .floating-inventory-card').count(),3);
   await tap(page.locator('.world-map > [data-floating-tool="nuclear"] button'));await frame(page);assert.equal(await page.locator('.world-map').isVisible(),false);
   const center=page.locator('.terrain-cell[data-x="4"][data-y="4"]');await tap(center);await frame(page);
   const expected=nuclearBlast(await read(),{x:4,y:4});assert.equal(expected.length,33);assert.match(await page.locator('.inventory-target-banner').innerText(),/33\/33/);
   assert.ok(await page.locator('.nuclear-preview').count()>15);assert.equal((await read()).players[0].inventory.cards.nuclear,1);
   await page.screenshot({path:path.join(output,`nuclear-preview-r57-${name}.png`)});
   await tap(page.locator('[data-action="cancel-tool-selection"]'));assert.deepEqual((await read()).cells,before.cells);assert.equal((await read()).players[0].score,12345);
   for(const size of [{width:320,height:740},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(size);await frame(page);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await page.locator('.viewport').evaluate(n=>n.clientHeight)>100);
    const floats=await page.locator('.map-wrap > .floating-inventory-card').evaluateAll(nodes=>nodes.map(n=>{const p=n.parentElement.getBoundingClientRect(),b=n.getBoundingClientRect();return b.x>=p.x-1&&b.y>=p.y-1&&b.right<=p.right+1&&b.bottom<=p.bottom+1;}));assert.ok(floats.every(Boolean));
    await page.screenshot({path:path.join(output,`favorites-folded-r57-${name}-${size.width}.png`)});
   }
   await page.setViewportSize({width:390,height:844});await tap(page.locator('[data-action="pause"]'));await frame(page);
   assert.equal(await page.locator('.paused-minimap > .floating-inventory-card').count(),3);assert.equal(await page.locator('.paused-minimap > [data-floating-tool="double"] button').isEnabled(),false);assert.equal(await page.locator('.paused-minimap .custom-inventory-band .custom-band-content').isVisible(),false);
   await page.screenshot({path:path.join(output,`paused-favorites-r57-${name}.png`)});
   await tap(page.locator('.paused-minimap [data-action="toggle-inventory-bar"]'));await tap(page.locator('.paused-minimap [data-action="toggle-territory-bar"]'));
   for(const size of [{width:740,height:320},{width:844,height:390}]){await page.setViewportSize(size);await frame(page);const boxes=await page.locator('.paused-minimap .custom-inventory-band,.paused-minimap .custom-territory-band').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));assert.ok(boxes.every(b=>b.bottom<=size.height+1&&b.x>=0),'Open pause catalogues must fit landscape');assert.ok(await page.locator('.inspection-canvas').evaluate(n=>n.clientHeight)>70);await page.screenshot({path:path.join(output,`paused-open-r57-${name}-${size.width}.png`)});}
   await page.setViewportSize({width:390,height:844});await tap(page.locator('.paused-minimap [data-action="toggle-inventory-bar"]'));await tap(page.locator('.paused-minimap [data-action="toggle-territory-bar"]'));
   await tap(page.locator('[data-action="resume"]'));await frame(page);await tap(page.locator('.map-wrap > [data-floating-tool="nuclear"] button'));await tap(page.locator('.terrain-cell[data-x="4"][data-y="4"]'));const preImpact=await read();
   await tap(page.locator('[data-action="confirm-area-tool"]'));await frame(page);after=await read();assert.equal(after.lastEvent.demolished,33);assert.equal(after.terrain.length,48);assert.equal(after.players[0].inventory.cards.nuclear,0);assert.equal(after.players[0].score,12345);assert.deepEqual(after.players[1],preImpact.players[1]);assert.equal(after.pairs[0].turn,'X');assert.equal(after.players[0].placements,preImpact.players[0].placements);assert.equal(await page.locator('.map-wrap > [data-floating-tool="nuclear"] button').isEnabled(),false);
   const hit=new Set(expected.map(c=>`${c.x},${c.y}`));assert.ok(after.cells.every(c=>!hit.has(`${c.x},${c.y}`)));await page.screenshot({path:path.join(output,`nuclear-demolition-r57-${name}.png`)});
   // A large wallet never upgrades a 3/33-card exchange into a 333 card.
   const refill=page.locator('[data-action="refill-hold"]'),rbox=await refill.boundingBox();await page.mouse.move(rbox.x+rbox.width/2,rbox.y+rbox.height/2);await page.mouse.down();await page.waitForTimeout(1150);await page.mouse.up();await page.locator('.refill-selector').waitFor();
   await tap(page.locator('[data-action="refill-mode"][data-mode="exchange"]'));await tap(page.locator('[data-action="refill-replace"][data-tool="double"]'));
   for(const tool of ['nuclear','reconquest'])assert.equal(await page.locator(`[data-action="refill-buy"][data-tool="${tool}"]`).isEnabled(),false);
   assert.match(await page.locator('.refill-value-cap').innerText(),/33/);await tap(page.locator('[data-action="close-refill"]'));assert.equal((await read()).players[0].score,12345);assert.equal((await read()).players[0].inventory.cards.double,1);
   // Inmunidad stays in the bar until explicitly chosen; returning it keeps the active clock and stock.
   await tap(page.locator('.board-inventory-status [data-action="edit-inventory-layout"]'));
   await tap(page.locator('[data-edit-tool="immunity"] [data-action="inventory-edit-select"]'));await tap(page.locator('[data-action="inventory-float-toggle"]'));await tap(page.locator('[data-action="close-inventory-layout"]'));await frame(page);
   assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"]').count(),0);assert.equal(await page.locator('.map-wrap > [data-floating-tool="immunity"]').count(),1);
   const protections=(await read()).players[0].inventory.immunity.cards['immunity-1'];assert.equal(protections,2);
   await tap(page.locator('.map-wrap > [data-floating-tool="immunity"] button'));await frame(page);assert.equal((await read()).players[0].inventory.immunity.cards['immunity-1'],1);assert.ok(await page.locator('.map-wrap > [data-floating-tool="immunity"] [data-immunity-clock]').count());
   await tap(page.locator('.board-inventory-status [data-action="edit-inventory-layout"]'));await tap(page.locator('[data-edit-tool="immunity"] [data-action="inventory-edit-select"]'));await tap(page.locator('[data-action="inventory-float-toggle"]'));await tap(page.locator('[data-action="close-inventory-layout"]'));await frame(page);
   assert.equal(await page.locator('.map-wrap > [data-floating-tool="immunity"]').count(),0);assert.equal(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"]').count(),1);assert.equal((await read()).players[0].inventory.immunity.cards['immunity-1'],1);assert.ok(await page.locator('.board-inventory-status [data-tool="immunity"][data-player="local-x"] [data-immunity-clock]').count());
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,dragOrderAndFavoritePlacement:true,persistentIndependentPreferences:true,barFoldingGainsHeight:fullHeight-initialHeight,foldedStockAndPauseResume:true,nuclearPreviewCancelAnd33Demolition:true,conservesPointsTurnsAndOtherInventory:true,mobileAndLandscapeWithinViewport:true,noOnlineRequests:true,passed:true});await context.close();
  }catch(error){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,`fallo-r57-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'custom-inventory-r57-results.json'),JSON.stringify(results,null,2));await new Promise(r=>server.httpServer.close(r));}
