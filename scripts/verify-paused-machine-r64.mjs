// Regression on remote CI engines; not a physical iPhone/Safari test.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,firefox} from 'playwright';
import {preview} from 'vite';
// Historical economy fixture; current R101 defaults have separate acceptance coverage.
import {createLegacyLocal as createLocal} from '../tests/helpers/legacy-balance.js';
import {localCommand} from '../src/local.js';
const output=path.resolve(process.env.HASH3_QA_OUTPUT||'browser-results');await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0}}),origin=`http://127.0.0.1:${server.httpServer.address().port}`,results=[];
function fixture(human='X'){
 const r=createLocal('solo','Jorge','',Date.now(),'normal','untimed','medium',human,true,{faunaEnabled:true,territoryEnabled:true});
 r.terrain=Array.from({length:600},(_,i)=>({x:i%30-10,y:Math.floor(i/30)-5}));
 r.cells=r.terrain.filter((_,i)=>i%5!==0).map((c,i)=>({...c,id:'piece-'+i,symbol:i%7===0?'*':i%11===0?'#':i%2?'X':'O',owner:i%2?'local-x':'local-o'}));
 r.deadCells=[{x:-10,y:-5}];r.frontiers=[{id:'wall',cells:[{x:-10,y:-4}],by:'local-x'},{id:'dam',type:'beaver',cells:[{x:-10,y:-3}],turnsRemaining:9,bornTurn:0}];
 r.pairs[0].turn=human==='X'?'O':'X';r.players[0].score=22750;r.players[1].score=18045;r.territoryNextPlacement=r.territoryNextInvasion=99999;
 const paused=localCommand(r,'pause');paused.transferOrigin={game:'source-'+human,batch:'fixture'};return paused;
}
try{
 for(const [name,engine]of Object.entries({chromium,webkit,firefox})){
  const browser=await engine.launch({args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const games=[fixture('X'),fixture('O')],context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[],requests=[];
   context.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))requests.push(r.url());});
   await context.route('**/*.supabase.co/**',r=>r.abort());await context.route('**/version.json*',r=>r.fulfill({status:404,body:''}));
   await context.addInitScript(games=>{if(sessionStorage.getItem('r64-seeded'))return;localStorage.setItem('hash3_locals',JSON.stringify(games));localStorage.setItem('hash3_game_pins',JSON.stringify(games.map(g=>'local:'+g.id)));sessionStorage.setItem('r64-seeded','1');},games);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('[data-action="hall-games"]').click();await page.locator('.saved-game').first().waitFor();
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('hash3_locals'))),before=await read();
   for(const size of [{width:320,height:740},{width:390,height:844},{width:693,height:663},{width:740,height:320}]){
    await page.setViewportSize(size);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    for(const game of games){const row=page.locator(`.saved-game[data-id="${game.id}"]`);assert.match(await row.locator('.saved-game-scores').innerText(),/X\s+22\.750\s+O\s+18\.045/);assert.equal(await row.locator('.delete-game-button').isDisabled(),true);assert.equal(await row.locator('[aria-label="Pausada"]').count(),1);assert.equal(await row.locator('[aria-label="Sin reloj"]').count(),1);assert.equal(await row.locator('[aria-label="Copia importada"]').count(),1);assert.ok((await row.boundingBox()).height<=135,'Compact rows must not grow into a paragraph');}
    await page.screenshot({path:path.join(output,`guardados-r64-${name}-${size.width}.png`)});
   }
   assert.deepEqual(await read(),before,'Reading scores never mutates saved games');await page.setViewportSize({width:390,height:844});
   for(const game of games){
    await page.locator(`[data-action="load-game"][data-id="${game.id}"]`).click();await page.locator('[data-action="resume"]').click();
    await page.waitForFunction(({id,human})=>{const r=JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id);return r.pairs[0].turn===human&&!r.pairs[0].pending;},{id:game.id,human:game.playerSymbol},{timeout:20000});
    const advanced=(await read()).find(g=>g.id===game.id),machine=advanced.players.find(p=>p.id!==advanced.humanId),previous=game.players.find(p=>p.id===machine.id);
    // A legitimate Ambush/Bomb can remove pieces before placing. Progress is
    // a completed machine turn and its accepted move, not net piece count.
    assert.ok(machine.inventory.completedTurns>(previous.inventory.completedTurns||0));assert.equal(advanced.lastEvent.kind,'move');assert.equal(advanced.lastEvent.actor,machine.id);assert.deepEqual(advanced.deadCells,game.deadCells);assert.equal(advanced.cells.some(c=>c.x===-10&&c.y===-5),false);
    await page.locator('[data-action="pause"]').click();const frozen=(await read()).find(g=>g.id===game.id);await page.waitForTimeout(900);assert.deepEqual((await read()).find(g=>g.id===game.id),frozen);
    await page.locator('[data-action="go-games"]').click();
   }
   // A hung Worker must not permanently lock an untimed game, including after
   // a full page restore (the path used after an application update).
   const stalled=fixture('X');stalled.cells=[];stalled.players.forEach(p=>p.inventory.cards.double=0);
   await page.evaluate(r=>{localStorage.setItem('hash3_locals',JSON.stringify([r]));localStorage.setItem('hash3_local',JSON.stringify({id:r.id}));sessionStorage.setItem('hash3_restore_local','1');},stalled);
   await page.addInitScript(()=>{window.Worker=class{postMessage(){}terminate(){}};});await page.reload();await page.locator('[data-action="resume"]').click();
   await page.waitForFunction(id=>{const r=JSON.parse(localStorage.getItem('hash3_locals')).find(g=>g.id===id);return r.pairs[0].turn==='X';},stalled.id,{timeout:15000});
   const recovered=(await read())[0];assert.equal(recovered.cells.length,stalled.cells.length+1);assert.deepEqual(recovered.players.map(p=>p.score),stalled.players.map(p=>p.score));assert.deepEqual(recovered.players.map(p=>p.inventory.cards),stalled.players.map(p=>p.inventory.cards));
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({browser:name,pausedPinnedScores:true,compact320390DesktopLandscape:true,importedMachineXandO:true,deadCellAndBarrierRespected:true,pausedNoMoves:true,restoredHungWorkerRecovers:true,noOnlineRequests:true,passed:true});console.log('PASS saved scores / imported machine / watchdog:',name);await context.close();
  }catch(error){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:path.join(output,`fallo-r64-${name}.png`)}).catch(()=>{});throw error;}finally{await browser.close();}
 }
}finally{await fs.writeFile(path.join(output,'paused-machine-r64-results.json'),JSON.stringify(results,null,2));await new Promise(r=>server.httpServer.close(r));}
