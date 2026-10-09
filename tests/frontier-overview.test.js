import test from 'node:test';import assert from 'node:assert/strict';
import {frontierOverviewGrid,overviewGrid} from '../src/board-window.js';
import {overviewCells} from '../src/map.js';
import {savedMapModel,inspectionCells,thumbnailMarkup} from '../src/saved-map.js';
test('Coarse frontier markers remain on actual wall cells, with terrain independently retained',()=>{
 const bounds={x:-19,y:-21,width:900,height:600},cells=[{x:8,y:9,frontier:true,fill:'#b88bff'},{x:8,y:10,frontier:true,fill:'#b88bff'},{x:8,y:11,frontier:true,fill:'#b88bff'}];
 const grid=frontierOverviewGrid(cells,bounds),markers=grid.query(bounds);assert.ok(grid.step>1);assert.ok(markers.length);
 for(const p of markers){assert.ok(cells.some(c=>c.x===p.x&&c.y===p.y));assert.equal(p.width,undefined);}
 const terrain=overviewGrid([{x:7,y:9,fill:'#343e4c'}],bounds).query(bounds),html=overviewCells([...terrain,...markers]);assert.match(html,/fill="#343e4c"/);assert.match(html,/stroke="#b88bff"/);assert.match(html,/l\.6-\.6/);
 const box={x:7,y:8,width:4,height:6};assert.deepEqual(grid.query(box),markers);assert.equal(grid.query({x:500,y:500,width:3,height:3}).length,0);
});
test('Frontier overview remains bounded with many cells while inspection and thumbnail keep the original coordinates',()=>{
 const cells=Array.from({length:90000},(_,i)=>({x:i%300,y:Math.floor(i/300),frontier:true})),grid=frontierOverviewGrid(cells,{x:0,y:0,width:300,height:300});assert.ok(grid.query({x:0,y:0,width:300,height:300}).length<=128*128);
 const room={terrain:[{x:0,y:0}],cells:[],pairs:[{id:0,active:{x:0,y:0}}],players:[],frontiers:[{cells:[{x:-1,y:0},{x:-1,y:1},{x:-1,y:2}]}]},model=savedMapModel(room);assert.deepEqual(model.frontierCells,room.frontiers[0].cells);
 for(const html of [inspectionCells(model),thumbnailMarkup(room)])assert.match(html,/x="-0.95" y="0.05"/);
});
