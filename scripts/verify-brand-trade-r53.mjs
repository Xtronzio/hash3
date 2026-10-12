import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {practiceTools} from '../src/practice-tools.js';
import {CARD_PRICES} from '../src/inventory-economy.js';

const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}});
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const results=[];
try{
 for(const [name,engine] of Object.entries({chromium,webkit,firefox})){
  const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:name!=='firefox',serviceWorkers:'block'});
   const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
   game.players[0].score=12730;const inv=game.players[0].inventory;
   for(const t of practiceTools)inv.cards[t.id]=0;
   for(const t of practiceTools.slice(0,12))inv.cards[t.id]=1;
   inv.cards.hint=3;inv.cards.combo=3;inv.cards.reconquest=1;inv.comboPending=1;
   game.players[0].freeExpansions=33;inv.immunity.cards['immunity-1']=333;
   const errors=[],requests=[];context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
   const before=await read();
   if(name==='firefox'){
    // Firefox's desktop engine: also verify the accessible one-second keyboard hold.
    await page.locator('.refill-trigger').focus();await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');
   }else{
    const trigger=await page.locator('.refill-trigger').boundingBox();await page.mouse.move(trigger.x+trigger.width/2,trigger.y+trigger.height/2);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();
   }
   await page.locator('.refill-selector').waitFor({timeout:5000});
   await page.locator('[data-action="refill-mode"][data-mode="exchange"]').click();await page.locator('[data-action="refill-replace"][data-tool="combo"]').click();
   for(const t of practiceTools){
    const expected=t.id!=='combo'&&inv.cards[t.id]<3&&CARD_PRICES[t.id]<=CARD_PRICES.combo;
    assert.equal(await page.locator(`[data-action="refill-buy"][data-tool="${t.id}"]`).isEnabled(),expected,`${name}: ${t.id}`);
   }
   await page.screenshot({path:path.join(output,`trueque-todos-los-tipos-r53-${name}.png`)});
   assert.equal(await page.locator('.refill-value-cap').innerText(),'33 pts máx.');
   await page.locator('[data-action="refill-buy"][data-tool="tornado"]').click();
   await page.locator('[data-action="refill-replace"][data-tool="hint"]').click();
   const stage=await read();
   for(const t of practiceTools)assert.equal(await page.locator(`[data-action="refill-buy"][data-tool="${t.id}"]`).isEnabled(),t.id!=='hint'&&stage.players[0].inventory.cards[t.id]<3&&CARD_PRICES[t.id]<=3,`${name}: 3 → ${t.id}`);
   await page.locator('[data-action="refill-buy"][data-tool="destroy"]').click();
   await page.locator('[data-action="refill-replace"][data-tool="reconquest"]').click();
   const higher=await read();
   for(const t of practiceTools)assert.equal(await page.locator(`[data-action="refill-buy"][data-tool="${t.id}"]`).isEnabled(),t.id!=='reconquest'&&higher.players[0].inventory.cards[t.id]<3,`${name}: 333 → ${t.id}`);
   await page.locator('[data-action="refill-buy"][data-tool="antidote"]').click();
   const after=await read();assert.equal(after.players[0].inventory.cards.reconquest,0);assert.equal(after.players[0].inventory.cards.combo,2);assert.equal(after.players[0].inventory.cards.hint,2);assert.equal(after.players[0].inventory.cards.antidote,1);
   assert.equal(after.players[0].score,12730-33-3-33);assert.equal(Object.values(after.players[0].inventory.cards).reduce((a,b)=>a+b),18);
   assert.equal(await page.locator('.refill-selector').count(),0);
   assert.equal(after.players[0].inventory.comboPending,1);assert.equal(after.players[0].freeExpansions,33);assert.equal(after.players[0].inventory.immunity.cards['immunity-1'],333);
   assert.deepEqual(after.players[1],before.players[1]);assert.deepEqual(after.pairs,before.pairs);assert.equal(after.ruleVersion,18);
   await page.screenshot({path:path.join(output,`trueque-completado-r53-${name}.png`)});
   const identity=await page.evaluate(async()=>{
    const links=[...document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]')];
    const icons=[];for(const link of links){const response=await fetch(link.href);const blob=await response.blob();const bitmap=await createImageBitmap(blob);icons.push({href:link.href,width:bitmap.width,height:bitmap.height,ok:response.ok});bitmap.close();}
    const manifest=await (await fetch(document.querySelector('link[rel="manifest"]').href)).json();
    return {icons,manifest,header:document.querySelector('.brand-mark').outerHTML,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(identity.icons.length,6);for(const icon of identity.icons){assert.equal(icon.ok,true);assert.match(icon.href,/-r(?:53|55).png$/);assert.equal(icon.width,icon.height);}
   assert.equal(await page.locator('link[rel="shortcut icon"]').getAttribute('href'),'/icons/hash3-favicon-r55.ico');
   assert.equal(identity.manifest.id,'./');assert.equal(identity.manifest.scope,'./');assert.equal(identity.manifest.start_url,'./');for(const icon of identity.manifest.icons)assert.match(icon.src,/-r53.png$/);
   assert.match(identity.header,/aria-label="#33"/);assert.doesNotMatch(identity.header,/#ff4a58|#24d393/);assert.ok(identity.overflow<=1);
   for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){
    await page.setViewportSize(size);
    await page.locator('.compact-turnbar .brand-mark').waitFor({state:'visible'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const {header,bar,title}=await page.locator('.compact-turnbar').evaluate(el=>({header:el.querySelector('.brand-mark').getBoundingClientRect().toJSON(),bar:el.getBoundingClientRect().toJSON(),title:el.querySelector('.turn-state').getBoundingClientRect().toJSON()}));
    assert.equal(Math.round(header.height),size.width>size.height?22:28);assert.ok(header.width>=41);assert.ok(header.x+header.width<=title.x);
    assert.ok(bar.height<=(size.width>size.height?36:44));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,`logo-legible-r55-${name}-${size.width}.png`)});
   }
   await page.setViewportSize({width:390,height:844});
   await page.locator('.brand').screenshot({path:path.join(output,`cabecera-r53-${name}.png`)});
   await page.locator('[data-action="pause"]').click();
   for(const size of [{width:320,height:740},{width:390,height:844},{width:740,height:320}]){
    await page.setViewportSize(size);
    await page.locator('.paused-minimap [data-paused-inventory="own"]').waitFor({state:'visible'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const ownCounter=page.locator('.paused-minimap [data-paused-inventory="own"]'),rivalCounter=page.locator('.paused-minimap [data-paused-inventory="rival"]');
    assert.equal(await ownCounter.locator('.inventory-capacity-value').innerText(),'18/18');assert.equal(await rivalCounter.locator('.inventory-capacity-value').innerText(),'3/18');
    assert.equal(await ownCounter.locator('.inventory-capacity-value').evaluate(el=>getComputedStyle(el).color),'rgb(255, 74, 88)');assert.equal(await rivalCounter.locator('.inventory-capacity-value').evaluate(el=>getComputedStyle(el).color),'rgb(36, 211, 147)');
    const ownBox=await ownCounter.boundingBox(),rivalBox=await rivalCounter.boundingBox();assert.ok(ownBox.x+ownBox.width<rivalBox.x);
    assert.deepEqual(await page.locator('.paused-minimap .inventory-shortcuts .inventory-icon-row').evaluateAll(rows=>rows.map(row=>row.children.length)),[13,12]);
    assert.equal(await page.locator('.paused-minimap .inventory-capacity-strip').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('.paused-score-body .inventory-capacity-value').count(),0);
    await page.screenshot({path:path.join(output,`pausa-equilibrada-r55-${name}-${size.width}.png`)});
   }
   const ownStored=await read();assert.equal(ownStored.players[0].inventory.comboPending,1);assert.equal(ownStored.players[0].freeExpansions,33);assert.deepEqual(ownStored.players[1],before.players[1]);
   await page.setViewportSize({width:390,height:844});
   const iconPage=await context.newPage();await iconPage.goto(origin+'/icons/hash3-icon-512-r53.png');await iconPage.screenshot({path:path.join(output,`icono-r53-${name}.png`)});
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,allEligibleTargetsBelowThree:true,full18WithFourteenTypes:true,source3Blocks33And333:true,source33Blocks333:true,source333AllowsLowerValues:true,threeOperationsPerOpening:true,reservesPendingOpponentAndTurnPreserved:true,unifiedHeaderFaviconsAndInstallIcons:true,boardLogo28pxPortrait22pxLandscape:true,pausedCountersOwnLeftRivalRight:true,pausedCountersRedAndGreen:true,balancedRows13and12:true,nativeSafariBookmarkDialogTested:false,noOverflow:true,noOnlineRequests:true,passed:true});
   await context.close();
  }catch(error){
   for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(output,`fallo-r53-${name}.png`)}).catch(()=>{});
   throw error;
  }finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'brand-trade-r53-results.json'),JSON.stringify(results,null,2));await new Promise(resolve=>server.httpServer.close(resolve));}
