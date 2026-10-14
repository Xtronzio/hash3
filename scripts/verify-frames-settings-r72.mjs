import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
function fixture({status='playing',target=false,solo=false}={}){
 const r=createLocal(solo?'solo':'local','Jorge','Rival',Date.now(),'advanced','untimed','pro',solo?'O':'X',true,{playerInventory:!solo,faunaEnabled:true,territoryEnabled:false});
 r.status=status;r.pairs[0].turn=solo?'O':'X';r.players.forEach((p,i)=>{p.score=32937-i*3482;p.figures=333;});
 r.works=[{id:'builder',player:'local-x',build:[{x:1,y:-1}],destroy:[],done:0,turnsRemaining:2,announcedTurn:0,visualOrder:1,visualAt:1000}];
 if(target)r.watchTargets=[{id:'later-target',x:1,y:-1,number:1,visualOrder:2,visualAt:1001}];return r;
}
try{for(const [name,engine] of Object.entries({chromium,webkit,firefox}).filter(([n])=>!process.env.HASH3_QA_ENGINE||n===process.env.HASH3_QA_ENGINE)){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async r=>{await page.goto(origin);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));for(const player of r.players)localStorage.setItem(`hash3_refill_position:${r.id}:${player.id}`,JSON.stringify({x:1,y:1}));sessionStorage.setItem('hash3_restore_local','1');},r);await page.reload();await page.locator(r.status==='paused'?'.paused-minimap .inspection-canvas':'.game .viewport').waitFor();await frame(page);};
  for(const target of [false,true]){
   await load(fixture({target}));const before=await read(),glyph=page.locator(`.board [data-cell-glyph="${target?'target':'build'}"][data-glyph-x="1"][data-glyph-y="-1"]`);await glyph.scrollIntoViewIfNeeded();await frame(page);
   const ghost=page.locator('.construction-ghost').filter({has:page.locator('.project-reservation')});assert.equal(await ghost.count(),1);
   const box=await ghost.boundingBox(),png=await page.screenshot({path:path.join(output,`frames-r72-${name}-${target?'diana':'builder'}.png`)});
   const pixels=await page.evaluate(async({data,box})=>{const img=new Image();img.src=data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const counts=[0,0,0,0],x=Math.round(box.x),y=Math.round(box.y),w=Math.round(box.width),h=Math.round(box.height),p=ctx.getImageData(x,y,w,h).data;for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++){const n=4*(iy*w+ix);if(p[n]>180&&p[n+1]>130&&p[n+2]<100){if(iy<3)counts[0]++;if(ix>=w-3)counts[1]++;if(iy>=h-3)counts[2]++;if(ix<3)counts[3]++;}}return counts;},{data:'data:image/png;base64,'+png.toString('base64'),box});
   assert.ok(pixels.every(n=>n>=4),'Construction contour must remain painted on all four sides: '+JSON.stringify(pixels));assert.equal(await ghost.evaluate(el=>getComputedStyle(el,'::after').zIndex),'10');assert.deepEqual(await read(),before);
  }
  const sizes=process.env.HASH3_QA_QUICK?[{width:390,height:844}]:[{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:740,height:320},{width:1280,height:900},{width:1920,height:1080}];
  for(const size of sizes)for(const status of ['playing','paused']){
   await page.setViewportSize(size);await load(fixture({status,solo:true}));const before=await read();if(status==='playing')await page.locator('.team-score-bottom').click();else await page.locator('.paused-score-details>summary').click();
   const scope=status==='playing'?'.score-panel':'.paused-ranking',groups=page.locator(`${scope} .player-game-settings`);assert.equal(await groups.count(),2);assert.equal(await groups.first().evaluate(el=>getComputedStyle(el.closest('ol')).overflowY),'visible','The second participant icons must not be clipped by a nested list');
   for(const player of before.players){const group=page.locator(`${scope} [data-settings-player="${player.id}"]`),machine=player.id!==before.humanId;assert.equal(await group.locator(`[data-setting="${machine?'machine':'player'}-inventory"]`).getAttribute('data-enabled'),String(machine));assert.equal(await group.locator('[data-setting="difficulty"]').count(),machine?1:0);assert.equal(await group.locator('[data-setting="fauna"]').getAttribute('data-enabled'),'true');assert.equal(await group.locator('[data-setting="territory"]').getAttribute('data-enabled'),'false');assert.equal(await group.locator('[data-setting="figures"]').getAttribute('data-value'),'advanced');assert.equal(await group.locator('[data-setting="clock"]').getAttribute('data-enabled'),'false');
    const boxes=await group.evaluate(el=>{const p=el.getBoundingClientRect();return [...el.querySelectorAll('.saved-game-setting')].map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,right:r.right,parentX:p.x,parentRight:p.right};});});assert.ok(boxes.every(b=>b.width===24&&b.height===24&&b.x>=b.parentX-1&&b.right<=b.parentRight+1));assert.equal(await group.locator('[data-icon="backpack"]').count(),1);assert.equal(await group.locator('.saved-game-setting-icon [data-icon="backpack"]').evaluate(e=>getComputedStyle(e).color),'rgb(0, 229, 255)');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(await read(),before);if(size.width===390||size.width===1280)await page.screenshot({path:path.join(output,`settings-r72-${name}-${size.width}-${status}.png`)});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();results.push({name,paintedFramesWithBuilderAndDiana:true,realIndependentSettings:true,savePreserved:true,passed:true});console.log('PASS painted construction contours / participant settings / stock and preferences preserved: '+name);
 }catch(error){if(page)await page.screenshot({path:path.join(output,`failure-r72-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await fs.writeFile(path.join(output,'frames-settings-r72-results.json'),JSON.stringify(results));await new Promise(r=>server.httpServer.close(r));}
