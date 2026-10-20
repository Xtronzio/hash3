import test from 'node:test';import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {initializeInverseContour,advanceInverseContour,validInverseContour,inverseContourInterval} from '../src/inverse-contour.js';
import {inverseRenewalLimit,inverseRenewalBudget,planInverseRenewal} from '../src/inverse-renewal.js';
import {inverseCellChanges,inverseWarningMarkup} from '../src/inverse-cell-effects.js';
import {inverseContourNotice,attachPlayerNotice} from '../src/inverse-contour-ui.js';
import {inverseNavigationKeys,inverseFocusGroups} from '../src/inverse-focus.js';
import {targetNavigation} from '../src/watch-targets.js';import {savedMapModel} from '../src/saved-map.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';import {territoryComparisonKey} from '../src/achievements.js';
import {inverseClaimsAt} from '../src/inverse-claims.js';
const now=1800000000000;
const fresh=(w=9,h=9)=>createLocal('local','A','B',now,'normal','untimed','pro','X',false,{variant:'inverse',board:{id:'test',name:'Test',terrain:Array.from({length:w*h},(_,i)=>({x:i%w-Math.floor(w/2),y:Math.floor(i/w)-Math.floor(h/2)}))},random:()=>.99});
// R88 fixture advances the contour directly; the later independent disorder
// channel starts on its next accepted command, as on an actual R88 save.
const partial=()=>{const g=fresh();delete g.inverseDisorder;g.inverseFill=g.inverseFill.filter(k=>!['0,0','1,0','2,0'].includes(k));g.inverseCleared=3;return g;};
test('Inventory feedback stays visible outside the screen-reader-only contour description',()=>{
 const g=partial();g.inverseContour.targets=['-4,-4'];const notices=inverseContourNotice(g),extra='<small class="player-notice-extra">Carta no disponible</small>',combined=attachPlayerNotice(notices,extra);
 assert.ok(combined.startsWith('<div class="practice-banner inventory-user-notice"'));assert.ok(combined.indexOf(extra)<combined.indexOf('inverse-contour-notice'));assert.equal(combined.split(extra).length,2);
 assert.equal(attachPlayerNotice('<div><span>A</span></div>',extra),`<div><span>A${extra}</span></div>`);assert.match(attachPlayerNotice('',extra),/inventory-user-notice/);
});
test('Renewal announces exact free original cells, then restores fill without modifying pieces, terrain or banked score',()=>{
 const g=partial();g.cells=[{x:1,y:0,id:'x',symbol:'X',owner:'local-x'}];g.players[0].score=99;
 Object.assign(g.inverseContour,{turns:62,next:99});g.inverseContour.renewal.next=66;
 advanceInverseContour(g);assert.equal(g.inverseContour.renewal.targets.length,2);assert.ok(!g.inverseContour.renewal.targets.includes('1,0'));
 const targets=[...g.inverseContour.renewal.targets],before=structuredClone(g);for(let i=0;i<3;i++)advanceInverseContour(g);
 assert.deepEqual(g.inverseRenewalEvent.restored,targets);assert.equal(g.inverseFill.length,before.inverseFill.length+2);assert.deepEqual(g.cells,before.cells);assert.deepEqual(g.terrain,before.terrain);assert.deepEqual(g.players,before.players);assert.equal(g.inverseCleared,1);assert.equal(validInverseContour(g),true);
});
test('An occupied announced destination is skipped, never replaced; no free scoring is deposited under a token',()=>{
 const g=partial();Object.assign(g.inverseContour,{turns:65,next:99});Object.assign(g.inverseContour.renewal,{next:66,targets:['0,0','1,0','2,0']});g.cells=[{x:0,y:0,id:'x',symbol:'X',owner:'local-x'}];
 advanceInverseContour(g);assert.deepEqual(g.inverseRenewalEvent.restored,['1,0','2,0']);assert.ok(!g.inverseFill.includes('0,0'));assert.equal(g.inverseContour.renewal.restored,2);
});
test('Finite reserve caps all lifetime restoration and erosion accounting accepts recollected fill',()=>{
 const g=partial(),r=g.inverseContour.renewal;assert.equal(inverseRenewalLimit(g),9);
 for(let i=0;i<30;i++){
  g.inverseFill=g.terrain.map(p=>`${p.x},${p.y}`).filter(k=>!['0,0','1,0','2,0'].includes(k));r.targets=['0,0','1,0','2,0'];r.next=g.inverseContour.turns+1;g.inverseContour.next=g.inverseContour.turns+33;advanceInverseContour(g);
 }
 assert.equal(r.restored,9);assert.equal(inverseRenewalBudget(g),0);assert.deepEqual(planInverseRenewal(g),[]);
 g.inverseContour.lost=g.terrain.length+r.restored;assert.equal(validInverseContour(g),true);g.inverseContour.lost++;assert.equal(validInverseContour(g),false);
});
test('Last nine and an empty silhouette cannot be refilled or prevented from finishing',()=>{
 for(const n of [0,1,3,9]){const g=partial();g.inverseFill=g.inverseFill.slice(0,n);Object.assign(g.inverseContour,{turns:65,next:99});Object.assign(g.inverseContour.renewal,{next:66,targets:['0,0']});advanceInverseContour(g);assert.equal(g.inverseFill.length,n);assert.equal(g.inverseContour.renewal.restored,0);assert.deepEqual(planInverseRenewal(g),[]);}
 let g=fresh();g.inverseFill=['0,0'];g.cells=[0,1,2].map(x=>({x,y:0,id:'x'+x,symbol:'X',owner:'local-x'}));Object.assign(g.inverseContour,{turns:65,next:99});Object.assign(g.inverseContour.renewal,{next:66,targets:['-1,0']});
 const f=inverseClaimsAt(g,'local-x',{x:0,y:0})[0];g=localCommand(g,'claim',{x:0,y:0,figureId:f.id},now,()=>.99);assert.equal(g.status,'finished');assert.equal(g.inverseFill.length,0);assert.equal(g.finalResult.inverseRenewalVersion,1);
});
test('Renewal shares only completed turns, defers bees, and migrates old saves to a future cycle',()=>{
 const g=partial();Object.assign(g.inverseContour,{turns:65,next:99});Object.assign(g.inverseContour.renewal,{next:66,targets:['0,0']});advanceInverseContour(g,{beeImpact:true});assert.equal(g.inverseContour.renewal.next,67);assert.equal(g.inverseFill.includes('0,0'),false);advanceInverseContour(g);assert.equal(g.inverseFill.includes('0,0'),true);
 delete g.inverseContour.renewal;delete g.inverseRenewalEvent;const old=structuredClone(g);initializeInverseContour(g);assert.equal(g.inverseContour.renewal.next,g.inverseContour.turns+2*inverseContourInterval(g));assert.deepEqual(g.inverseFill,old.inverseFill);assert.equal(g.inverseContour.lost,old.inverseContour.lost);
 const paused=localCommand(g,'pause',{},now,()=>.99),state=structuredClone(paused.inverseContour);assert.deepEqual(localCommand(paused,'tick',{},now+99999).inverseContour,state);assert.deepEqual(localCommand(paused,'resume',{},now+99999).inverseContour,state);
});
test('Restored fill is payable again, with previously paid score intact',()=>{
 const g=partial();g.players[0].score=99;Object.assign(g.inverseContour,{turns:65,next:99});Object.assign(g.inverseContour.renewal,{next:66,targets:['0,0','1,0','2,0']});advanceInverseContour(g);
 g.cells=[0,1,2].map(x=>({x,y:0,id:'x'+x,symbol:'X',owner:'local-x'}));const f=inverseClaimsAt(g,'local-x',{x:0,y:0})[0];assert.ok(f.pointsValue>0);const next=localCommand(g,'claim',{x:0,y:0,figureId:f.id},now,()=>.99);assert.equal(next.players[0].score,99+f.pointsValue);
});
test('Dianas cycle fill, wildcards, erosion and restoration on the board and paused map without actions',()=>{
 const g=partial();g.cells=[{x:-4,y:-4,id:'w1',symbol:'#',owner:null},{x:4,y:4,id:'w2',symbol:'#',owner:null}];g.inverseContour.targets=['-3,-3'];g.inverseContour.renewal.targets=['0,0'];const before=structuredClone(g);
 for(const kind of ['wild','fill','contour','restore'])assert.ok(inverseNavigationKeys(g,kind).length);
 assert.equal(inverseFocusGroups({inverseFill:inverseNavigationKeys(g,'wild')},3).length,2);assert.match(targetNavigation(g),/data-inverse-kind="wild"/);assert.match(targetNavigation(g,{inspection:true}),/data-inspect-action="inverse"/);
 const model=savedMapModel(g,g.players[0]);assert.equal(model.inverseDestinations.wild.length,2);assert.ok(model.inverseDestinations.fill.length>0);assert.deepEqual(g,before);
});
test('Transfer preserves renewal reserve, notices and targets; rejects invalid or external refill data',()=>{
 const g=partial();g.inverseContour.renewal.targets=['0,0'];g.status='paused';const values=new Map([['hash3_locals',JSON.stringify([g])]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},copy=captureTransfer(storage,{now});
 assert.deepEqual(validateTransfer(copy).games[0].inverseContour,g.inverseContour);
 for(const change of [r=>r.targets.push('999,999'),r=>r.restored=10,r=>r.next=99999,r=>r.version=2,r=>r.targets=['0,0','0,0']]){const bad=structuredClone(copy);change(bad.games[0].inverseContour.renewal);assert.throws(()=>validateTransfer(bad));}
 assert.notEqual(territoryComparisonKey({inverseContourVersion:1}),territoryComparisonKey({inverseContourVersion:1,inverseRenewalVersion:1}));
});
test('Effects describe only accepted real deltas; loads, navigation and unchanged snapshots never replay',()=>{
 const a=partial(),b=structuredClone(a);b.version++;b.inverseFill=b.inverseFill.filter(k=>k!=='-4,-4');b.inverseFill.push('0,0');b.inverseWildEvent={id:'wild',x:2,y:2};
 assert.deepEqual(inverseCellChanges(a,b).map(p=>p.kind),['clear','create','wild']);assert.deepEqual(inverseCellChanges(null,b),[]);assert.deepEqual(inverseCellChanges(a,a),[]);
 b.inverseContourEvent={id:'new',cleared:['-4,-4']};assert.equal(inverseCellChanges(a,b)[0].kind,'erode');assert.match(inverseWarningMarkup('restore'),/warning-dashes/);
});
test('Maximum valid board retains bounded focus groups and finite restoration',()=>{
 const g=fresh(181,184);g.inverseFill=g.inverseFill.slice(0,10000);const targets=planInverseRenewal(g);assert.ok(targets.length<=33);assert.ok(targets.every(k=>!g.inverseFill.includes(k)));assert.ok(inverseRenewalLimit(g)<=g.terrain.length/9);assert.ok(inverseFocusGroups(g).every(p=>p.length<=33));
});
