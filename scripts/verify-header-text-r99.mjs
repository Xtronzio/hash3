import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {brandMark} from '../src/brand.js';
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
  await context.addInitScript(game=>{localStorage.setItem('hash3_locals',JSON.stringify([game]));localStorage.setItem('hash3_local',JSON.stringify({id:game.id}));sessionStorage.setItem('hash3_restore_local','1');},game);
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('.game .viewport').waitFor();
  const stored=()=>page.evaluate(()=>localStorage.getItem('hash3_locals'));
  for(const screen of ['board','paused','hall']){
   if(screen==='paused'){await page.locator('[data-action="pause"]').click();await page.locator('.paused-game').waitFor();}
   if(screen==='hall'){await page.locator('[data-action="go-hall"]').click();await page.locator('.hall-header').waitFor();}
   const selector=screen==='board'?'.compact-turnbar':screen==='paused'?'.paused-game .lobby-header':'.hall-header',before=await stored();
   for(const [width,height]of sizes){
    await page.setViewportSize({width,height});await frame(page);
    const probe=page.locator(`${selector} .brand-text-probe`);assert.equal(await probe.innerText(),'#33');assert.equal(await probe.locator('svg,img,canvas').count(),0);
    const style=await probe.evaluate(el=>{const s=getComputedStyle(el),r=document.createRange();r.selectNodeContents(el);return {filter:s.filter,shadow:s.boxShadow,textShadow:s.textShadow,animation:s.animationName,font:s.fontFamily,textWidth:r.getBoundingClientRect().width,width:el.getBoundingClientRect().width};});
    assert.equal(style.filter,'none');assert.equal(style.shadow,'none');assert.equal(style.textShadow,'none');assert.equal(style.animation,'none');assert.match(style.font,/Arial/);assert.ok(style.textWidth<=style.width+1);
    const comparison=await page.locator(selector).evaluate((header,svg)=>{
     const read=()=>({header:header.getBoundingClientRect().toJSON(),brand:header.querySelector('.brand-mark').getBoundingClientRect().toJSON(),controls:[...header.children].map(n=>n.getBoundingClientRect().toJSON())});
     const text=read(),probe=header.querySelector('.brand-text-probe'),parent=probe.parentNode;probe.replaceWith(document.createRange().createContextualFragment(svg));const vector=read();parent.querySelector('.brand-mark').replaceWith(probe);return {text,vector};
    },brandMark);
    for(const key of ['x','y','width','height']){
     assert.ok(Math.abs(comparison.text.header[key]-comparison.vector.header[key])<.1,`${name}/${variant}/${screen}/${width} header ${key}`);
     assert.ok(Math.abs(comparison.text.brand[key]-comparison.vector.brand[key])<.1,`${name}/${variant}/${screen}/${width} logo ${key}: ${JSON.stringify(comparison)}`);
     for(let i=0;i<comparison.text.controls.length;i++)assert.ok(Math.abs(comparison.text.controls[i][key]-comparison.vector.controls[i][key])<.1,`${name}/${variant}/${screen}/${width} control ${i} ${key}`);
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await stored(),before,'Presentation must preserve the saved game');
    if(width===390)await page.screenshot({path:path.join(output,`header-text-r99-${name}-${variant}-${screen}.png`)});
    results.push({name,variant,screen,width,height,sameGeometry:true,textOnly:true,savedGamePreserved:true});
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();
 }}catch(error){await page?.screenshot({path:path.join(output,`header-text-r99-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'header-text-r99.json'),JSON.stringify({cases:results,nativeIPhoneTested:false},null,2));}
console.log(`R99: ${results.length} header comparisons passed: text/SVG geometry, controls and saved games; native iPhone blur pending`);
