import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewModel,overviewPoint,overviewView,overviewMarkup} from '../src/map-overview.js';

const room={terrain:[{x:-4,y:-2},{x:-3,y:-2},{x:8,y:5}],cells:[{x:-4,y:-2,symbol:'X',owner:'me'},{x:8,y:5,symbol:'O',owner:'other'}],pairs:[{id:'mine',x:'me',o:'rival',active:{x:-4,y:-2}},{id:'other-pair',x:'other',o:'fourth',active:{x:8,y:5}}]};
const own={id:'me',pair:'mine',symbol:'X'};
test('Map has a single controls row, no +/- or scale, and keeps fit, accessible jumps and close',()=>{
 const html=overviewMarkup({open:true,jumpButtons:'<button data-action="center" aria-label="Mi territorio"></button><button data-action="locate" aria-label="Rival superior"></button>'});
 assert.doesNotMatch(html,/map-heading|map-scale|data-map-action="plus"|data-map-action="minus"|MAPA GENERAL|map-legend/);
 assert.match(html,/<nav class="map-controls"[^>]*>.*data-map-action="fit".*data-action="center".*data-action="locate".*data-action="close-map".*<\/nav>/);
});
test('overview keeps negative coordinates, symbol colours and precise active-zone centres',()=>{
  const model=overviewModel(room,own,{pair:'other-pair'});
  assert.deepEqual(model.bounds,{x:-6,y:-4,width:17,height:12});
  assert.equal(model.terrain[0].fill,'var(--red)');
  assert.equal(model.terrain[1].fill,'#343e4c');
  assert.equal(model.terrain[2].fill,'var(--green)');
  assert.deepEqual(model.target,{x:9.5,y:6.5});
  assert.deepEqual(overviewModel(room,own,{pair:'other-pair',lastMove:{x:8,y:5}}).target,{x:8.5,y:5.5});
  assert.equal(overviewModel(room,own,null).target,null);
});
test('letterboxed map taps use the drawn map, not the entire SVG rectangle',()=>{
  const bounds={x:-10,y:-5,width:20,height:10},rect={left:30,top:40,width:400,height:400};
  assert.deepEqual(overviewPoint(bounds,rect,230,240),{x:0,y:0});
  assert.deepEqual(overviewPoint(bounds,rect,30,140),{x:-10,y:-5});
  assert.equal(overviewPoint(bounds,rect,230,90),null);
  assert.equal(overviewPoint(bounds,{...rect,width:0,height:0},30,40),null);
});
test('viewport outline is clipped when the board view is larger than the whole world',()=>{
  const bounds={x:-6,y:-4,width:17,height:12};
  assert.deepEqual(overviewView(bounds,{x:-50,y:-50,width:100,height:100}),bounds);
  assert.deepEqual(overviewView(bounds,{x:2,y:2,width:20,height:20}),{x:2,y:2,width:9,height:6});
  const outside=overviewView(bounds,{x:50,y:50,width:2,height:2});
  assert.equal(outside.width,0);assert.equal(outside.height,0);
});
test('an empty world is handled without infinite map bounds',()=>{
  assert.equal(overviewModel({...room,terrain:[]},own,null),null);
});

test('Target is a blue cell; eating is yellow and cleared empty cells retain yellow outlines',()=>{
 const r={...room,cells:room.cells.map((c,i)=>({...c,id:String(i)})),eatenCells:[{x:-3,y:-2}],rodents:[{id:'rat',x:-4,y:-2,eaten:12,phase:0}]};
 const m=overviewModel(r,own,{lastMove:{id:'1',x:8,y:5}});assert.equal(m.terrain[0].fill,'var(--yellow)');assert.equal(m.terrain[1].eaten,true);assert.equal(m.terrain[2].fill,'var(--blue)');assert.equal(m.terrain[0].rodent.eaten,12);
});

test('Invasores tienen color distinguible de los colonos y de las fichas neutrales',()=>{
 const r={...room,cells:[{id:'invader',x:-4,y:-2,symbol:'*',owner:null}]};
 const model=overviewModel(r,own,null);
 assert.equal(model.terrain[0].fill,'#dba9ff');
 assert.equal(model.terrain[2].fill,'#343e4c');
});
