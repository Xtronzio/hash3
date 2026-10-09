import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {overviewModel} from '../src/map-overview.js';
import {savedMapModel} from '../src/saved-map.js';
import {prepareMapRendering,mapWindowMarkup} from '../src/map-render.js';

test('Live and paused maps share colours, glyphs, wall coordinates and level of detail',()=>{
 const room=createLocal('local','X','O',0),own=room.players[0];
 room.cells=[{id:'x',x:0,y:0,symbol:'X',owner:own.id},{id:'o',x:1,y:0,symbol:'O',owner:room.players[1].id},{id:'n',x:2,y:0,symbol:'#',owner:null},{id:'i',x:1,y:1,symbol:'*',owner:null}];
 room.frontiers=[{id:'wall',cells:[{x:-1,y:0}],by:own.id}];
 const live=overviewModel(room,own,null),paused=savedMapModel(room,own);
 live.frontierCells=paused.frontierCells;
 for(const scale of [4,14,23]){
  const a=mapWindowMarkup(live,prepareMapRendering(live),live.bounds,scale),b=mapWindowMarkup(paused,prepareMapRendering(paused),paused.bounds,scale);
  assert.equal(a,b);assert.match(a,/var\(--frontier/);
  if(scale>=14)for(const symbol of ['X','O','#','*'])assert.ok(a.includes(`data-symbol="${symbol}"`));else assert.doesNotMatch(a,/data-symbol=/);
 }
});
test('Fitting a huge map stays grouped; navigation does not iterate source terrain again',()=>{
 const model={terrain:Array.from({length:33333},(_,i)=>({x:i%183,y:Math.floor(i/183),fill:i%2?'var(--red)':'var(--green)',symbol:i%2?'X':'O'})),bounds:{x:0,y:0,width:183,height:183}};
 const index=prepareMapRendering(model);
 model.terrain=new Proxy(model.terrain,{get(t,p){if(p===Symbol.iterator)throw Error('Full terrain scan');return Reflect.get(t,p);}});
 const fit=mapWindowMarkup(model,index,model.bounds,2);assert.ok((fit.match(/<path/g)||[]).length<=2);assert.doesNotMatch(fit,/data-symbol=/);
 const detail=mapWindowMarkup(model,index,{x:50,y:50,width:10,height:10},20);assert.ok((detail.match(/data-symbol=/g)||[]).length<=100);
});
