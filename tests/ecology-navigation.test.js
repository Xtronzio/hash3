import test from 'node:test';
import assert from 'node:assert/strict';
import {ecologyTargets,nextEcologyTarget,ecologyNavigationMarkup,ecologyClockEvents,ecologyMapPins,ecologyPinTargets,territoryRenderRegion} from '../src/ecology-navigation.js';
import {habitatIcons,workerHelmet,habitatMark} from '../src/inhabitants.js';
import {cellIndex} from '../src/board-window.js';
import {NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION} from '../src/territory-event-rules.js';
const now=1700000000000;
const room={players:[],cells:[],terrain:[],frontiers:[],rodentRaids:[{id:'r',x:1,y:1,remaining:2}],worms:[],works:[{id:'w',destroy:[{x:2,y:2}],build:[{x:3,y:3}],done:0,nextAt:now+33000}],territoryEvents:[{id:'rain',kind:'rain',region:Array.from({length:33},(_,x)=>({x:x*3,y:4})),nextAt:now+33000},{id:'ufo',kind:'ufo',region:[{x:10,y:8}],nextAt:now+31000}],habitatZones:[{placements:20,next:{rodent:33,worm:99,work:198}}]};
room.terrain=[...room.territoryEvents.flatMap(e=>e.region),{x:1,y:1},{x:2,y:2},{x:3,y:3}];
test('Cada grupo de lluvia y cada fenómeno se recorre con identidad estable y vuelve al primero',()=>{
 const items=ecologyTargets(room,'rain');assert.equal(items.length,11);assert.ok(items.every(i=>i.region.length===3));assert.equal(items[0].x,3);
 let item;const visited=[];for(let i=0;i<12;i++){item=nextEcologyTarget(items,item?.id);visited.push(item.id);}assert.equal(new Set(visited).size,11);assert.equal(visited[0],visited[11]);
 assert.equal(nextEcologyTarget(items.slice(1),items[0].id).id,items[1].id);assert.equal(ecologyTargets(room,'ufo')[0].x,10);
});
test('Obreros comparten casco, pero signo y color distinguen construcción y destrucción',()=>{
 assert.ok(habitatIcons.build.startsWith(workerHelmet));assert.ok(habitatIcons.destroy.startsWith(workerHelmet));assert.match(habitatIcons.build,/data-worker-sign="plus"/);assert.match(habitatIcons.destroy,/data-worker-sign="minus"/);
 const pins=ecologyMapPins(ecologyPinTargets(room),now);assert.match(pins,/color:var\(--green\)/);assert.match(pins,/color:var\(--red\)/);
});
test('Avisos discretos distinguen relojes reales, visitas por jugada y futuros intentos de nacimiento',()=>{
 const markup=ecologyNavigationMarkup(room,null,{now});assert.match(markup,/data-ecology-kind="ufo" aria-label="31 segundos"/);
 assert.match(markup,/Turnos restantes del ciclo visible">6/);assert.match(markup,/data-ecology-birth="worm"[^>]+>79/);
 assert.doesNotMatch(markup,/data-ecology-kind="rodent" aria-label="\d+ segundos"/);
 const clockRoom={...room};for(const key of ['terrain','cells','frontiers'])Object.defineProperty(clockRoom,key,{get(){throw Error('Clock scanned board');}});
 assert.equal(ecologyClockEvents(clockRoom,'rain').length,1);assert.equal(ecologyClockEvents(clockRoom,'destroy')[0].id,'w');
});
test('Mapa limita marcadores a 33 y el detalle consulta solo el índice espacial preparado',()=>{
 const targets=Array.from({length:9999},(_,x)=>({id:String(x),sourceId:String(x),kind:'worm',x,y:0,nextAt:now+33000})),index=cellIndex(targets);
 assert.equal((ecologyMapPins(targets,now).match(/class="ecology-map-pin /g)||[]).length,33);
 const visible=index.query({x:100,y:-2,width:10,height:4});assert.ok(visible.length<=11);assert.ok(visible.every(p=>p.x>=100&&p.x<=110));
});

test('Rodent drawing never falls back to a worm, and only timed inhabitants carry seconds',()=>{
 const rodent=habitatMark('rodent','2↷',{id:'r',remaining:2});assert.ok(rodent.includes(habitatIcons.rodent));assert.ok(!rodent.includes(habitatIcons.worm));assert.doesNotMatch(rodent,/ecology-clock/);
 const worm=habitatMark('worm','',{id:'w',remainingMs:33000});assert.match(worm,/data-ecology-kind="worm" data-ecology-source="w"/);assert.match(worm,/>33<\/span>s/);
});

test('Warnings and pins remain on actual cells after holes appear; rain group identities stay stable',()=>{
 const region=[{x:-3,y:4},{x:8,y:-1},{x:2,y:7},{x:6,y:2},{x:9,y:8},{x:7,y:5}];
 const event={id:'rain',kind:'rain',region,nextAt:now+33000},r={terrain:region,territoryEvents:[event],version:1};
 const before=ecologyTargets(r,'rain');assert.equal(before.length,2);
 r.terrain=region.filter(c=>!(c.x===8&&c.y===-1));r.version++;
 const after=ecologyTargets(r,'rain'),known=new Set(r.terrain.map(c=>`${c.x},${c.y}`));
 assert.deepEqual(after.map(p=>p.id),before.map(p=>p.id));
 assert.ok(after.every(p=>known.has(`${p.x},${p.y}`)));assert.equal(territoryRenderRegion(r,event).length,5);
 r.terrain=region.slice(3);r.version++;assert.deepEqual(ecologyTargets(r,'rain').map(p=>p.id),['rain:1']);
 assert.equal(event.region.length,6);r.terrain=[];r.version++;assert.deepEqual(ecologyTargets(r,'rain'),[]);
});
test('UFO and cataclysm markers choose surviving cells in irregular terrain rather than a hole at the region center',()=>{
 for(const kind of ['ufo','cataclysm']){
  const region=[{x:-20,y:-10},{x:20,y:10},{x:0,y:0}],r={terrain:region.slice(0,2),territoryEvents:[{id:kind,kind,region,nextAt:now+33000}]};
  const target=ecologyTargets(r,kind)[0];assert.ok(r.terrain.some(c=>c.x===target.x&&c.y===target.y));assert.notDeepEqual({x:target.x,y:target.y},{x:0,y:0});
 }
});

test('Cada tornado disperso tiene un localizador para su propia zona 3×3',()=>{
 const region=Array.from({length:18},(_,i)=>({x:i<9?i%3:10+(i-9)%3,y:i<9?Math.floor(i/3):Math.floor((i-9)/3)}));
 const r={...room,terrain:region,territoryEvents:[{id:'tornados',kind:'tornado-rain',region,groups:[region.slice(0,9),region.slice(9)],nextAt:now+33000}],version:6};
 const targets=ecologyTargets(r,'tornado-rain');
 assert.equal(targets.length,2);
 assert.ok(targets.every(c=>c.region.length===9));
});

test('Fenómenos e invasores muestran intentos por colocaciones antes del primer aviso y el requisito de figuras',()=>{
 const game={players:[{id:'x',placements:20,figures:99}],cells:[],terrain:[],territoryEvents:[],territoryNextPlacement:333,territoryNextInvasion:66};
 const markup=ecologyNavigationMarkup(game,'x',{now});
 assert.match(markup,/data-ecology-attempt="natural"[^]*?313 colocaciones entre ambos/);
 assert.match(markup,/data-ecology-attempt="invaders"[^]*?46 colocaciones entre ambos/);
 assert.doesNotMatch(markup,/ecology-clock/);
 game.players[0].figures=12;assert.match(ecologyNavigationMarkup(game,'x'),/faltan 87 figuras para habilitarlo/);
 game.territoryEnabled=false;assert.doesNotMatch(ecologyNavigationMarkup(game,'x'),/data-ecology-attempt=/);
});

test('Catálogo sombreado, solo el aviso real se ilumina y su pulso no reinicia con snapshots o pausa',()=>{
 const kinds=[...INVADER_EVENT_ROTATION,...NATURAL_EVENT_ROTATION],game={players:[],cells:[],terrain:[{x:0,y:0}],territoryEvents:[]};
 const buttons=markup=>[...markup.matchAll(/<button[^>]*data-ecology-kind="([^"]+)"[^>]*>[^]*?<\/button>/g)].map(([html,kind])=>({html,kind})).filter(b=>kinds.includes(b.kind));
 const inactive=buttons(ecologyNavigationMarkup(game,null,{now}));assert.equal(inactive.length,9);
 assert.ok(inactive.every(b=>b.html.includes('is-inactive')&&b.html.includes('disabled')&&!b.html.includes('ecology-clock')));
 for(const kind of kinds){
  game.territoryEvents=[{id:'event',kind,region:game.terrain,nextAt:now+33000}];
  const announced=buttons(ecologyNavigationMarkup(game,null,{now})),active=announced.filter(b=>b.html.includes('is-announced'));
  assert.equal(active.length,1);assert.equal(active[0].kind,kind);assert.match(active[0].html,/is-active/);assert.doesNotMatch(active[0].html,/disabled/);assert.match(active[0].html,/>33<\/span>/);
  assert.equal(announced.filter(b=>b.html.includes('is-inactive')).length,8);
  assert.match(buttons(ecologyNavigationMarkup(game,null,{now:now+3000})).find(b=>b.kind===kind).html,/--ecology-activation-delay:-3000ms/);
  game.territoryEvents[0].remainingMs=30000;
  const paused=buttons(ecologyNavigationMarkup(game,null,{inspection:true,now:now+60000})).find(b=>b.kind===kind).html;
  assert.match(paused,/is-frozen/);assert.match(paused,/--ecology-activation-delay:-3000ms/);assert.match(paused,/>30<\/span>/);
 }
 game.territoryEvents=[];assert.ok(buttons(ecologyNavigationMarkup(game,null,{now})).every(b=>b.html.includes('is-inactive')));
});
