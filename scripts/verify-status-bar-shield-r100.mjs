import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {deathRegion} from '../src/brief-ecology.js';
import {INVERSE_PRESETS} from '../src/inverse-boards.js';

const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const sizes=[[320,740],[390,844],[428,926],[740,320],[1280,800],[1920,1080]];
const frame=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{for(const variant of ['original','inverse']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
  await context.route('**/*.supabase.co/**',r=>{requests.push(r.request().url());return r.abort();});
  await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  const game=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false,...(variant==='inverse'?{variant:'inverse',board:INVERSE_PRESETS[3],random:()=>.5}:{})});
  if(variant==='original'){
   game.terrain=Array.from({length:289},(_,i)=>({x:i%17,y:Math.floor(i/17)}));
   game.deadCells=[{x:4,y:4},{x:5,y:4},{x:4,y:5},{x:5,y:5},{x:4,y:6}];
   const [target]=deathRegion(game,()=>.8);assert.ok(target);assert.ok(game.deadCells.every(c=>Math.max(Math.abs(c.x-target.x),Math.abs(c.y-target.y))>1));game.deadCells.push(target);
  }
  await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();
  await page.evaluate(()=>{window.qaShield=document.querySelector('.status-bar-shield');});
  const stored=()=>page.evaluate(()=>localStorage.getItem('hash3_locals'));
  for(const screen of ['board','paused','hall']){
   if(screen==='paused'){await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();}
   if(screen==='hall'){await page.locator('[data-action="go-hall"]').click();await page.locator('.hall-header').waitFor();}
   const selector=screen==='board'?'.compact-turnbar':screen==='paused'?'.paused-game .lobby-header':'.hall-header',before=await stored();
   for(const [width,height]of sizes){
    await page.setViewportSize({width,height});await frame(page);
    assert.equal(await page.locator('.status-bar-shield').count(),1);
    assert.equal(await page.locator(`${selector} svg.brand-mark[data-brand="c-unframed"]`).count(),1);assert.equal(await page.locator('.brand-text-probe').count(),0);
    const shield=await page.locator('.status-bar-shield').evaluate(el=>{const s=getComputedStyle(el),b=el.getBoundingClientRect();return {same:el===window.qaShield,outside:!document.querySelector('#app').contains(el),before:!!(el.compareDocumentPosition(document.querySelector('#app'))&Node.DOCUMENT_POSITION_FOLLOWING),position:s.position,x:b.x,y:b.y,width:b.width,height:b.height,background:s.backgroundColor,opacity:s.opacity,pointers:s.pointerEvents,zIndex:s.zIndex,filter:s.filter};});
    assert.deepEqual(shield,{same:true,outside:true,before:true,position:'fixed',x:0,y:0,width,height:6,background:'rgb(8, 9, 11)',opacity:'1',pointers:'none',zIndex:'0',filter:'none'});
    const comparison=await page.locator(selector).evaluate(header=>{
     const read=()=>({header:header.getBoundingClientRect().toJSON(),brand:header.querySelector('.brand-mark').getBoundingClientRect().toJSON(),controls:[...header.children].map(n=>n.getBoundingClientRect().toJSON())});
     const visible=read(),shield=document.querySelector('.status-bar-shield');shield.style.display='none';const hidden=read();shield.style.removeProperty('display');return {visible,hidden};
    });
    assert.deepEqual(comparison.visible,comparison.hidden,`${name}/${variant}/${screen}/${width}: band must not shift the interface`);
    const usable=await page.locator(selector).evaluate(header=>[...header.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b;}));assert.equal(usable,true,'Header buttons retain hit-testing');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await stored(),before,'Presentation must preserve the saved game');
    if(width===390)await page.screenshot({path:path.join(output,`status-bar-shield-r100-${name}-${variant}-${screen}.png`)});
    results.push({name,variant,screen,width,height,fixedOpaqueBand:true,sameGeometry:true,controlsUsable:true,savedGamePreserved:true});
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();
 }}catch(error){await page?.screenshot({path:path.join(output,`status-bar-shield-r100-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'status-bar-shield-r100.json'),JSON.stringify({cases:results,nativeIPhoneTested:false},null,2));}
console.log(`R100: ${results.length} fixed-band cases passed: original SVG, unchanged geometry, controls and saves; native iPhone blur pending`);
