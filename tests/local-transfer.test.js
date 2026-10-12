import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {captureTransfer,encodeTransfer,decodeTransfer,transferUrl,transferToken,transferPreview,importTransfer,validateTransfer,MAX_TRANSFER_URL,MAX_TRANSFER_BYTES} from '../src/local-transfer.js';
import {loadLocalGames,loadGamePins} from '../src/sessions.js';
import {gzipSync,strToU8} from 'fflate';
function store(values={}){const map=new Map(Object.entries(values));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function room(mode='local'){
 const r=createLocal(mode,'Jorge','Rival',1000,'advanced','untimed','medium','O',true,{faunaEnabled:false,territoryEnabled:false});
 r.players[0].score=31457;r.players[1].score=27603;r.players[0].inventory.cards.frontier=96;r.players[0].inventory.comboPending=1;r.players[0].inventory.immunity.cards['immunity-1']=333;
 r.pairs[0].credits=18;r.players[0].freeExpansions=17;r.watchTargets=[{id:'mark',x:1,y:1,number:1}];
 r.frontiers=[{id:'wall',by:'local-x',cells:[{x:-1,y:0}]},{id:'border',by:'local-o',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]}];
 r.customHistoricalData={record:'conservar'};return localCommand(r,'pause',{},1000);
}
function source(games=[room()]){return store({hash3_locals:JSON.stringify(games),hash3_local:JSON.stringify({id:games[0].id}),hash3_name:'Jorge',hash3_game_pins:JSON.stringify(['local:'+games[0].id]),'sb-fake-auth-token':'DO-NOT-EXPORT',hash3_profile_token:'DO-NOT-EXPORT'});}
test('Complete paused snapshots round trip without changing origin or exporting authentication',async()=>{
 const games=[room(),room('solo')],s=source(games),before=[...s.map];const copy=captureTransfer(s,{now:2000,id:'snapshot'});
 assert.deepEqual(copy.games[0],games[0]);assert.deepEqual(copy.games[1],games[1]);assert.deepEqual([...s.map],before);
 assert.doesNotMatch(JSON.stringify(copy),/DO-NOT-EXPORT|sb-fake-auth|hash3_profile_token/);
 const token=await encodeTransfer(copy),decoded=await decodeTransfer(token);assert.deepEqual(decoded.data,copy);
 const url=transferUrl(token,'https://xtronzio.github.io/hash3/?build=test#perfil=old');assert.ok(url.length<MAX_TRANSFER_URL);assert.equal(transferToken(url,'https://xtronzio.github.io/hash3/'),token);
 assert.equal(transferToken(url.replace('xtronzio.github.io','other.example'),'https://xtronzio.github.io/hash3/'),null);
 assert.equal(transferToken(url.replace('/hash3/','/other/'),'https://xtronzio.github.io/hash3/'),null);
 assert.equal(transferToken(url+'&perfil=old','https://xtronzio.github.io/hash3/'),null);
 const d=store();importTransfer(d,decoded);const restored=loadLocalGames(d,3000);assert.equal(restored.length,2);
 const r=restored.find(g=>g.id===games[0].id);assert.equal(r.players[0].score,31457);assert.equal(r.players[0].inventory.cards.frontier,96);assert.equal(r.players[0].inventory.comboPending,1);assert.equal(r.players[0].inventory.immunity.cards['immunity-1'],333);assert.equal(r.pairs[0].credits,18);assert.equal(r.players[0].freeExpansions,17);assert.deepEqual(r.frontiers,games[0].frontiers);assert.deepEqual(r.watchTargets,games[0].watchTargets);assert.deepEqual(r.customHistoricalData,games[0].customHistoricalData);assert.ok(loadGamePins(d).includes('local:'+r.id));
});
test('Source playing clocks freeze at persisted time without elapsed commands or score changes',()=>{
 const r=createLocal('solo','Jorge','Máquina',1000,'normal','timed');r.pairs[0].deadline=new Date(25000).toISOString();r.matchGoal={type:'time',target:180};r.endsAt=new Date(181000).toISOString();r.inventoryEffects.immunities=[{player:r.humanId,expiresAt:34000}];
 const s=source([r]),before=[...s.map],copy=captureTransfer(s,{now:9999999,id:'frozen'}).games[0];
 assert.equal(copy.status,'paused');assert.equal(copy.pauseRemainingMs,24000);assert.equal(copy.matchRemainingMs,180000);assert.equal(copy.inventoryEffects.immunities[0].remainingMs,33000);assert.deepEqual(copy.players,r.players);assert.deepEqual(copy.cells,r.cells);assert.deepEqual([...s.map],before);
 const resumed=localCommand(copy,'resume',{},2000000);assert.equal(Date.parse(resumed.pairs[0].deadline),2024000);assert.equal(resumed.inventoryEffects.immunities[0].expiresAt,2033000);
});
test('Import collisions create independent games, map pins/results and repeat links preserve later progress',async()=>{
 const incoming=room(),existing=structuredClone(incoming);existing.players[0].score=99999;
 const s=source([incoming]),result={game:incoming.id,kind:'move-limit',mode:'local',limit:33,size:9,players:incoming.players,completedAt:new Date(1000).toISOString()};s.setItem('hash3_completed_territories',JSON.stringify([result]));
 const decoded=await decodeTransfer(await encodeTransfer(captureTransfer(s,{id:'collision',now:2000}))),d=source([existing]);d.setItem('hash3_name','Destino');d.setItem('hash3_game_pins',JSON.stringify(['local:'+existing.id,'online:keep']));
 assert.equal(transferPreview(d,decoded).collisions,1);const before=d.getItem('hash3_locals');importTransfer(d,decoded,{newId:()=> 'independent'});
 const list=JSON.parse(d.getItem('hash3_locals'));assert.deepEqual(list[0],JSON.parse(before)[0]);assert.equal(list[1].id,'transfer-independent');assert.equal(d.getItem('hash3_name'),'Destino');assert.ok(loadGamePins(d).includes('local:transfer-independent'));assert.ok(loadGamePins(d).includes('online:keep'));assert.equal(JSON.parse(d.getItem('hash3_completed_territories'))[0].game,'transfer-independent');
 list[1].players[0].score+=33;d.setItem('hash3_locals',JSON.stringify(list));const later=[...d.map];assert.deepEqual(importTransfer(d,decoded),{added:0,already:true});assert.deepEqual([...d.map],later);
});
test('Quota failure at every write restores the complete destination, including pins, archive and name',async()=>{
 const decoded=await decodeTransfer(await encodeTransfer(captureTransfer(source(),{id:'quota',now:2000})));
 for(let failure=1;failure<=5;failure++){
  const d=store({hash3_locals:'[]',hash3_game_pins:'["online:keep"]',hash3_completed_territories:'[]'}),before=[...d.map].sort();let calls=0;const real=d.setItem;d.setItem=(k,v)=>{if(++calls===failure)throw Error('QuotaExceededError');real(k,v);};
  assert.throws(()=>importTransfer(d,decoded),/No hay espacio/);assert.deepEqual([...d.map].sort(),before);
 }
});
test('Malformed links, damaged copies, invalid modes and prototype keys never import',async()=>{
 const token=await encodeTransfer(captureTransfer(source(),{id:'invalid',now:2000}));await assert.rejects(decodeTransfer(token.slice(0,-7)));await assert.rejects(decodeTransfer(token.slice(0,6)+(token[6]==='0'?'1':'0')+token.slice(7)));
 const copy=captureTransfer(source(),{id:'bad',now:2000});copy.games[0].mode='world';assert.throws(()=>validateTransfer(copy));copy.games[0].mode='local';copy.games[0].inventoryEffects.immunities={};assert.throws(()=>validateTransfer(copy));
 const poisoned=JSON.parse(JSON.stringify(captureTransfer(source(),{id:'prototype',now:2000})).replace('"customHistoricalData":{','"customHistoricalData":{"__proto__":{},'));assert.throws(()=>validateTransfer(poisoned));
});
test('Unreadable canonical destination refuses the import without replacing any bytes',async()=>{
 const decoded=await decodeTransfer(await encodeTransfer(captureTransfer(source(),{id:'broken-target',now:2000}))),d=store({hash3_locals:'broken json'}),before=[...d.map];assert.throws(()=>importTransfer(d,decoded),/No se pueden leer/);assert.deepEqual([...d.map],before);
});
test('Decompression expansion is bounded even with a valid compressed digest',async()=>{
 const packed=gzipSync(strToU8(' '.repeat(MAX_TRANSFER_BYTES+1))),hash=Buffer.from(await crypto.subtle.digest('SHA-256',packed)).toString('hex');
 await assert.rejects(decodeTransfer('h33t1.'+hash+'.'+Buffer.from(packed).toString('base64url')));
});
