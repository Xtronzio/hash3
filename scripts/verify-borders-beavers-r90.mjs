import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {preview} from 'vite';
import {createLocal} from '../src/local.js';
import {resolveBriefFauna} from '../src/brief-ecology.js';
const output=path.resolve('browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
const fixture=()=>{const g=createLocal('local','Jorge','Rival',Date.now(),'normal','untimed','medium','X',false,{faunaEnabled:false,territoryEnabled:false});g.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));g.players[0].inventory.cards.border=3;g.players[0].inventory.cards.frontier=3;return g;};
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 if(process.env.HASH3_QA_ENGINES&&!process.env.HASH3_QA_ENGINES.split(',').includes(name))continue;
 const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});let page;
 try{
  const context=await browser.newContext({serviceWorkers:'block',hasTouch:true});page=await context.newPage();const errors=[],online=[];
  page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))online.push(r.url());});await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
  const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))[0]);
  const load=async g=>{await page.goto(origin);await page.evaluate(g=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('hash3_locals',JSON.stringify([g]));localStorage.setItem('hash3_local',JSON.stringify({id:g.id}));sessionStorage.setItem('hash3_restore_local','1');},g);await page.reload();await page.locator('.game .viewport').waitFor();await frame();};
  const click=async locator=>{await locator.evaluate(el=>{const v=document.querySelector('.viewport'),r=el.getBoundingClientRect(),b=v.getBoundingClientRect();v.scrollLeft+=r.x+r.width/2-b.x-b.width/2;v.scrollTop+=r.y+r.height/2-b.y-b.height/2;});await frame();await locator.click();await frame();};
  const tool=async id=>{await page.locator(`.board-inventory-status [data-action="practice-tool"][data-tool="${id}"]`).evaluate(e=>e.click());await frame();};
  for(const [width,height]of(process.env.HASH3_QA_QUICK?[[390,844]]:[[320,780],[390,844],[428,926],[740,390],[1280,800],[1920,1080]])){
   console.log(name,width,height);await page.setViewportSize({width,height});await load(fixture());const before=await stored();
   await tool('border');await page.locator('[data-action="cancel-tool-selection"]').click();assert.deepEqual(await stored(),before);
   await tool('border');await click(page.locator('.board .terrain-cell[data-action="inventory-target"][data-x="4"][data-y="4"]'));
   const placed=await stored();assert.deepEqual(placed.frontiers[0].cells,[{x:4,y:4}]);assert.equal(placed.players[0].inventory.cards.border,2);assert.equal(placed.pairs[0].turn,'X');
   const own=page.locator('.board [data-action="remove-border"]');assert.equal(await own.count(),1);page.once('dialog',d=>d.dismiss());await click(own);assert.deepEqual(await stored(),placed);
   page.once('dialog',d=>d.accept());await click(own);const removed=await stored();assert.equal(removed.frontiers.length,0);for(const key of ['players','pairs','practiceTurn','ecologyTurns'])assert.deepEqual(removed[key],placed[key]);
   const opponent=fixture();opponent.frontiers=[{id:'opponent',type:'border',by:'local-o',cells:[{x:4,y:4}]}];await load(opponent);assert.equal(await page.locator('.board [data-action="remove-border"]').count(),0);
   for(const optional of [false,true]){
    const g=fixture();if(optional){g.players[0].figures=333;g.players[0].inventory.cards['hint-expand']=1;Object.assign(g.pairs[0],{pending:1,optionalExpansion:true,strategicExpansion:true,expander:'local-x'});}else g.cells=g.terrain.map((c,i)=>({...c,id:String(i),symbol:i%2?'O':'X',owner:i%2?'local-o':'local-x'}));
    await load(g);assert.equal(await page.locator('.expansion-controls').count(),1);assert.equal(await page.locator('.expansion-frontier').count(),0);
    for(const id of ['frontier','border'])assert.equal(await page.locator(`.board-inventory-status [data-tool="${id}"]`).first().getAttribute('disabled'),'');
   }
   const g=fixture();resolveBriefFauna(g,{id:'beaver',kind:'beaver',paths:[[{x:3,y:3},{x:4,y:3},{x:5,y:3}]]},Date.now(),()=>0);await load(g);
   const clocks=()=>page.locator('.board .beaver-barrier-turns').allTextContents();assert.deepEqual((await clocks()).map(Number).sort((a,b)=>a-b),[3,6,9]);
   await page.locator('[data-action="pause"]').click();const paused=await stored();assert.deepEqual(paused.frontiers,g.frontiers);assert.equal(await page.locator('.inspection-canvas .beaver-barrier').count(),3);await page.locator('[data-action="resume"]').click();
   const moves=[[0,1],[1,2],[2,1],[6,1],[7,2],[8,1],[0,6],[1,7],[2,6]];
   for(let i=0;i<moves.length;i++){const [x,y]=moves[i];await click(page.locator(`.board .terrain-cell[data-x="${x}"][data-y="${y}"]`));if([2,5,8].includes(i))assert.equal((await stored()).frontiers.flatMap(f=>f.cells).length,2-Math.floor(i/3));}
   if(width===390)await page.screenshot({path:path.join(output,`borders-beavers-r90-${name}.png`)});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({name,width,height,singleBorder:true,ownerRemovalAndCancel:true,expansionWithoutBarriers:true,beaverPerCell369:true,pauseConservation:true});
  }
  const large=fixture();large.terrain=Array.from({length:33333},(_,i)=>({x:i%183-91,y:Math.floor(i/183)-91}));await page.setViewportSize({width:390,height:844});await load(large);await tool('border');assert.ok(await page.locator('.terrain-cell').count()<2000);const before=await stored();await page.locator('.viewport').evaluate(v=>{v.scrollLeft+=2000;v.scrollTop+=1000;v.dispatchEvent(new Event('scroll'));});await frame();assert.ok(await page.locator('.terrain-cell').count()<2000);assert.deepEqual(await stored(),before);
  assert.deepEqual(errors,[]);assert.deepEqual(online,[]);await context.close();
 }catch(error){await page?.screenshot({path:path.join(output,`borders-beavers-r90-failure-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
}}finally{await server.close();await fs.writeFile(path.join(output,'borders-beavers-r90.json'),JSON.stringify(results,null,2));}
console.log(`R90: ${results.length} browser/viewport cases passed, plus 33333-cell navigation.`);
