import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {cellChanges,mergeCellEffects} from '../src/cell-effects.js';
import {CELL_EFFECT_MS,cellWarningMarkup} from '../src/cell-effect-markup.js';
import {inverseClaimsAt} from '../src/inverse-claims.js';
import {overviewModel} from '../src/map-overview.js';
import {territoryThreatCells} from '../src/territory-threats.js';
import {boardActionFeedback} from '../src/rodent-feedback.js';
import {tornadoFeedback} from '../src/tornado-feedback.js';
const now=1800000000000;
const fresh=variant=>{const g=createLocal('local','A','B',now,'normal','untimed','medium','X',true,{variant,board:{id:'qa',name:'QA',terrain:Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}))},faunaEnabled:false,territoryEnabled:false,random:()=>.99});g.terrain=Array.from({length:81},(_,i)=>({x:i%9,y:Math.floor(i/9)}));g.pairs[0].active={x:0,y:0};return g;};
test('Real accepted placements share the same effect and do not alter either referee snapshot',()=>{
 for(const variant of ['original','inverse']){const a=fresh(variant),b=localCommand(a,'move',{x:1,y:1},now,()=>.99),saved=JSON.stringify([a,b]);assert.deepEqual(cellChanges(a,b),[{x:1,y:1,kind:'place',symbol:'X'}]);assert.equal(JSON.stringify([a,b]),saved);}
});
test('Erase in either variant clears only the removed piece, never the inverse fill',()=>{
 for(const variant of ['original','inverse']){const a=fresh(variant);a.cells=[{x:1,y:1,id:'o',symbol:'O',owner:'local-o'}];a.players[0].inventory.cards.erase=1;const b=localCommand(a,'inventory',{playerId:'local-x',tool:'erase',x:1,y:1},now,()=>.99);assert.deepEqual(cellChanges(a,b),[{x:1,y:1,kind:'clear'}]);assert.deepEqual(boardActionFeedback(a,b).visits,[{x:1,y:1,kind:'erase',inventory:true}]);assert.deepEqual(b.inverseFill,a.inverseFill);}
});
test('Inverso Tornado reports the same exact area and real-piece trajectories as Original',()=>{
 for(const variant of ['original','inverse']){const a=fresh(variant);a.cells=[{x:0,y:0,id:'x',symbol:'X',owner:'local-x'},{x:1,y:0,id:'o',symbol:'O',owner:'local-o'}];a.players[0].inventory.cards.tornado=1;const b=localCommand(a,'inventory',{playerId:'local-x',tool:'tornado',x:0,y:0},now,()=>0),feedback=tornadoFeedback(a,b);assert.equal(feedback.affected.length,9);assert.ok(feedback.moves.length>0);for(const m of feedback.moves){const c=b.cells.find(c=>c.id===m.id);assert.deepEqual(m.to,{x:c.x,y:c.y});}assert.deepEqual(b.inverseFill,a.inverseFill);}
});
test('Manual inverse combo removal, including its finished state, follows paid geometry once',()=>{
 const a=fresh('inverse');a.cells=[0,1,2].map(x=>({x,y:0,id:'x'+x,symbol:'X',owner:'local-x'}));a.inverseFill=['0,0'];const f=inverseClaimsAt(a,'local-x',{x:0,y:0})[0],b=localCommand(a,'claim',{x:0,y:0,figureId:f.id},now,()=>.99);assert.equal(b.status,'finished');assert.equal(b.players[0].score,3);assert.deepEqual(cellChanges(a,b).map(p=>p.kind),['clear','clear','clear']);assert.deepEqual(cellChanges(b,b),[]);
});
test('Loads, resumes, pauses, stale versions and other games never replay old actions',()=>{
 const a=fresh('original'),b=localCommand(a,'move',{x:0,y:0},now,()=>.99);for(const [old,next]of [[null,b],[a,a],[b,a],[{...a,id:'other'},b],[{...a,status:'paused'},b],[a,{...b,status:'paused'}]])assert.deepEqual(cellChanges(old,next),[]);
});
test('Wildcard arrival is identical across variants, supersedes other changes and ignores moves/conversions',()=>{
 for(const variant of ['original','inverse']){const a=fresh(variant),b=structuredClone(a);b.version++;b.cells=[{x:1,y:1,id:'wild',symbol:'#',owner:null}];b[variant==='inverse'?'inverseWildEvent':'neutralEvent']={id:'arrival',x:1,y:1};assert.deepEqual(cellChanges(a,b),[{x:1,y:1,kind:'wild'}]);const moved=structuredClone(b);moved.version++;moved.cells[0].x=2;assert.deepEqual(cellChanges(b,moved),[]);}
});
test('Actual territory construction and demolition share creation/removal with yellow territorial identity',()=>{
 const a=fresh('original'),b=structuredClone(a);b.version++;b.terrain=b.terrain.filter(p=>p.x!==0||p.y!==0);b.terrain.push({x:9,y:0});b.habitatEvent={id:'build',actions:[{x:9,y:0,kind:'build'},{x:0,y:0,kind:'destroy'}]};assert.deepEqual(cellChanges(a,b),[{x:0,y:0,kind:'erode',tone:'territory'},{x:9,y:0,kind:'create',tone:'territory'}]);
});
test('Consecutive commands retain earlier effects and their original deadlines, without mutating active state',()=>{
 const a=mergeCellEffects(null,[{x:0,y:0,kind:'place'}],100,CELL_EFFECT_MS),saved=structuredClone(a);const b=mergeCellEffects(a,[{x:1,y:0,kind:'clear'}],300,CELL_EFFECT_MS);assert.deepEqual(a,saved);assert.equal(b.length,2);assert.equal(b[0].started,100);assert.equal(b[1].started,300);assert.deepEqual(mergeCellEffects(b,[],2000,CELL_EFFECT_MS).map(p=>p.x),[1]);assert.equal(mergeCellEffects(b,[{x:1,y:0,kind:'wild'}],500,CELL_EFFECT_MS).length,2);assert.match(cellWarningMarkup(),/warning-underlay/);
});
test('Map warnings share inverse targets without contaminating the cached territorial index',()=>{
 const g=fresh('inverse');g.inverseFill=g.inverseFill.filter(k=>k!=='1,1');g.inverseCleared=1;g.inverseContour.targets=['2,1'];g.inverseContour.renewal.targets=['1,1'];const before=JSON.stringify(g),cached=structuredClone(territoryThreatCells(g));for(let i=0;i<3;i++){const model=overviewModel(g,g.players[0]);assert.deepEqual(model.threatCells.map(p=>p.kind),['erode','restore']);}assert.deepEqual(territoryThreatCells(g),cached);assert.equal(JSON.stringify(g),before);
});
