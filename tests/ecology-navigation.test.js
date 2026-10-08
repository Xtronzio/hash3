import test from 'node:test';
import assert from 'node:assert/strict';
import {ecologyTargets,nextEcologyTarget,ecologyNavigationMarkup,ecologyClockEvents,ecologyMapPins,ecologyPinTargets} from '../src/ecology-navigation.js';
import {habitatIcons,workerHelmet} from '../src/inhabitants.js';
import {cellIndex} from '../src/board-window.js';
const now=1700000000000;
const room={players:[],cells:[],terrain:[],frontiers:[],rodentRaids:[{id:'r',x:1,y:1,remaining:2}],worms:[],works:[{id:'w',destroy:[{x:2,y:2}],build:[{x:3,y:3}],done:0,nextAt:now+33000}],territoryEvents:[{id:'rain',kind:'rain',region:Array.from({length:33},(_,x)=>({x:x*3,y:4})),nextAt:now+33000},{id:'ufo',kind:'ufo',region:[{x:10,y:8}],nextAt:now+31000}],habitatZones:[{placements:20,next:{rodent:33,worm:99,work:198}}]};
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
 assert.match(markup,/Visitas restantes por colocaciones">2/);assert.match(markup,/data-ecology-birth="worm"[^>]+>79/);
 assert.doesNotMatch(markup,/data-ecology-kind="rodent" aria-label="\d+ segundos"/);
 const clockRoom={...room};for(const key of ['terrain','cells','frontiers'])Object.defineProperty(clockRoom,key,{get(){throw Error('Clock scanned board');}});
 assert.equal(ecologyClockEvents(clockRoom,'rain').length,1);assert.equal(ecologyClockEvents(clockRoom,'destroy')[0].id,'w');
});
test('Mapa limita marcadores a 33 y el detalle consulta solo el índice espacial preparado',()=>{
 const targets=Array.from({length:9999},(_,x)=>({id:String(x),sourceId:String(x),kind:'worm',x,y:0,nextAt:now+33000})),index=cellIndex(targets);
 assert.equal((ecologyMapPins(targets,now).match(/class="ecology-map-pin"/g)||[]).length,33);
 const visible=index.query({x:100,y:-2,width:10,height:4});assert.ok(visible.length<=11);assert.ok(visible.every(p=>p.x>=100&&p.x<=110));
});
