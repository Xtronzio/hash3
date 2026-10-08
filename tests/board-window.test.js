import test from 'node:test';
import assert from 'node:assert/strict';
import {cellIndex,viewportWindow,viewportCellWindow,cachedCellWindow,reconcileCells,overviewGrid} from '../src/board-window.js';
import {clampBoardZoom} from '../src/map-camera.js';

test('Large terrain renders only the viewport and margin, including negative and distant coordinates',()=>{
 const cells=Array.from({length:100000},(_,i)=>({x:i%1000-500,y:Math.floor(i/1000)-50}));
 cells.push({x:1000000,y:-1000000});const index=cellIndex(cells);
 const viewport={scrollLeft:28800,scrollTop:3000,clientWidth:390,clientHeight:500};
 const layout={minX:-500,minY:-50,padding:100,size:56};
 const box=viewportWindow(viewport,layout),visible=index.query(box);
 assert.ok(visible.length>0&&visible.length<200);
 assert.ok(visible.every(p=>p.x+1>box.x&&p.x<box.x+box.width&&p.y+1>box.y&&p.y<box.y+box.height));
 assert.deepEqual(index.query({x:999999,y:-1000001,width:3,height:3}),[{x:1000000,y:-1000000}]);
 assert.equal(index.query({x:50000,y:50000,width:10,height:10}).length,0);
 assert.equal(index.query({x:-1000001,y:-1000001,width:2000003,height:2000003}).length,cells.length);
});

test('Distant overlays use nearby buckets rather than walking all tools and frontiers during pan',()=>{
 let visits=0;
 const overlays=Array.from({length:100000},(_,i)=>({get x(){visits++;return i%1000-500;},y:Math.floor(i/1000)-50}));
 const index=cellIndex(overlays);visits=0;
 const result=index.query({x:400,y:30,width:10,height:10});
 assert.equal(result.length,100);assert.ok(visits<3000);
 visits=0;assert.equal(index.query({x:50000,y:-50000,width:10,height:10}).length,0);assert.equal(visits,0);
});

test('Fitting a million-cell board stays bounded and coarse tiles retain target and symbol colours',()=>{
 const terrain=Array.from({length:1000000},(_,i)=>({x:i%1000-500,y:Math.floor(i/1000)-500,fill:'#343e4c'}));
 terrain.push({x:0,y:0,fill:'var(--red)'},{x:1,y:1,fill:'var(--blue)'});
 const bounds={x:-500,y:-500,width:1000,height:1000},grid=overviewGrid(terrain,bounds);
 const all=grid.query(bounds);assert.ok(all.length<=128*128);
 const local=grid.query({x:0,y:0,width:15,height:15});assert.ok(local.length<=9);
 assert.ok(local.some(p=>p.fill==='var(--blue)'));assert.ok(local.every(p=>p.width===grid.step&&p.height===grid.step));
 assert.deepEqual(grid.query({x:1000000,y:-1000000,width:10,height:10}),[]);
});
test('During pinch the rendered window follows the transformed pixels and fills newly exposed terrain',()=>{
 const viewport={scrollLeft:400,scrollTop:300,clientWidth:400,clientHeight:300};
 const layout={minX:-10,minY:-5,padding:100,size:50};
 assert.deepEqual(viewportWindow(viewport,layout,0),{x:-4,y:-1,width:8,height:6});
 layout.previewScale=.5;
 assert.deepEqual(viewportWindow(viewport,layout,0),{x:4,y:5,width:16,height:12});
 assert.equal(clampBoardZoom(.01,true),.55);assert.equal(clampBoardZoom(.01,false),.3);assert.equal(clampBoardZoom(100,true),2.2);
});
test('Pan preserves overlapping DOM nodes and removes offscreen cells',()=>{
 let created=0;const nodes=[];
 const container={ownerDocument:{createElement:()=>{const template={content:{}};Object.defineProperty(template,'innerHTML',{set(markup){created++;template.content.firstElementChild={markup,remove(){nodes.splice(nodes.indexOf(this),1);},replaceWith(next){nodes[nodes.indexOf(this)]=next;}};}});return template;}},append:node=>nodes.push(node)};
 const state=reconcileCells(container,[{id:'a',markup:'a'},{id:'b',markup:'b'}]),b=state.get('b').node;
 reconcileCells(container,[{id:'b',markup:'b'},{id:'c',markup:'c'}],state);
 assert.equal(created,3);assert.equal(state.get('b').node,b);assert.equal(nodes.length,2);assert.ok(!state.has('a'));
});
test('Pixel pans reuse the window; crossing an edge only prepares newly visible cells',()=>{
 const cells=Array.from({length:100000},(_,i)=>({x:i%1000,y:Math.floor(i/1000)}));
 let prepared=0;const cache=cachedCellWindow(cellIndex(cells),p=>{prepared++;return `${p.x},${p.y}`;});
 const viewport={scrollLeft:520,scrollTop:510,clientWidth:390,clientHeight:500},layout={minX:0,minY:0,padding:100,size:50};
 const first=cache.query(viewportCellWindow(viewport,layout));assert.ok(first.length<200);
 const count=prepared;viewport.scrollLeft+=1;
 assert.equal(cache.query(viewportCellWindow(viewport,layout)),first);assert.equal(prepared,count);
 viewport.scrollLeft+=50;const next=cache.query(viewportCellWindow(viewport,layout));
 assert.ok(prepared-count<20);assert.equal(next.find(e=>e.id==='cell:10,10'),first.find(e=>e.id==='cell:10,10'));
 const before=prepared;cache.query(viewportCellWindow(viewport,layout),'changed');assert.equal(prepared-before,next.length);
 const far={x:700,y:70,width:10,height:10};cache.query(far);const after=prepared;cache.query(viewportCellWindow(viewport,layout),'changed');
 assert.equal(prepared-after,next.length); // Offscreen markup is not retained indefinitely.
});
