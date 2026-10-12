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
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
   const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});
   game.players[0].score=12730;const inv=game.players[0].inventory;
   for(const t of practiceTools)inv.cards[t.id]=0;
   for(const t of practiceTools.slice(0,12))inv.cards[t.id]=1;
   inv.cards.hint=3;inv.cards.combo=3;inv.cards.bomb=1;inv.comboPending=1;
   game.players[0].freeExpansions=33;inv.immunity.cards['immunity-1']=333;
   const errors=[],requests=[];context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
   const before=await read();
   const trigger=await page.locator('.refill-trigger').boundingBox();await page.mouse.move(trigger.x+trigger.width/2,trigger.y+trigger.height/2);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();
   await page.locator('[data-action="refill-mode"][data-mode="exchange"]').click();await page.locator('[data-action="refill-replace"][data-tool="combo"]').click();
   for(const t of practiceTools){
    const expected=t.id!=='combo'&&inv.cards[t.id]<3;
    assert.equal(await page.locator(`[data-action="refill-buy"][data-tool="${t.id}"]`).isEnabled(),expected,`${name}: ${t.id}`);
   }
   await page.locator('[data-action="refill-buy"][data-tool="reconquest"]').click();
   const after=await read();assert.equal(after.players[0].inventory.cards.reconquest,1);assert.equal(after.players[0].inventory.cards.combo,2);
   assert.equal(after.players[0].score,12730-CARD_PRICES.reconquest);assert.equal(Object.values(after.players[0].inventory.cards).reduce((a,b)=>a+b),18);
   assert.equal(after.players[0].inventory.comboPending,1);assert.equal(after.players[0].freeExpansions,33);assert.equal(after.players[0].inventory.immunity.cards['immunity-1'],333);
   assert.deepEqual(after.players[1],before.players[1]);assert.deepEqual(after.pairs,before.pairs);assert.equal(after.ruleVersion,17);
   await page.screenshot({path:path.join(output,`trueque-todos-los-tipos-r53-${name}.png`)});
   const identity=await page.evaluate(async()=>{
    const links=[...document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]')];
    const icons=[];for(const link of links){const response=await fetch(link.href);const blob=await response.blob();const bitmap=await createImageBitmap(blob);icons.push({href:link.href,width:bitmap.width,height:bitmap.height,ok:response.ok});bitmap.close();}
    const manifest=await (await fetch(document.querySelector('link[rel="manifest"]').href)).json();
    return {icons,manifest,header:document.querySelector('.brand-mark').outerHTML,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(identity.icons.length,4);for(const icon of identity.icons){assert.equal(icon.ok,true);assert.match(icon.href,/-r53.png$/);assert.equal(icon.width,icon.height);}
   assert.equal(identity.manifest.id,'./');assert.equal(identity.manifest.scope,'./');assert.equal(identity.manifest.start_url,'./');for(const icon of identity.manifest.icons)assert.match(icon.src,/-r53.png$/);
   assert.match(identity.header,/aria-label="#33"/);assert.doesNotMatch(identity.header,/#ff4a58|#24d393/);assert.ok(identity.overflow<=1);
   const header=await page.locator('.brand-mark').boundingBox();assert.ok(header.width>30&&header.height>10);
   await page.locator('.brand').screenshot({path:path.join(output,`cabecera-r53-${name}.png`)});
   const iconPage=await context.newPage();await iconPage.goto(origin+'/icons/hash3-icon-512-r53.png');await iconPage.screenshot({path:path.join(output,`icono-r53-${name}.png`)});
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,allTargetsBelowThree:true,full18WithFourteenTypes:true,zeroStockReconquestSelected:true,reservesPendingOpponentAndTurnPreserved:true,unifiedHeaderFaviconsAndInstallIcons:true,noOverflow:true,noOnlineRequests:true,passed:true});
   await context.close();
  }finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'brand-trade-r53-results.json'),JSON.stringify(results,null,2));await new Promise(resolve=>server.httpServer.close(resolve));}
