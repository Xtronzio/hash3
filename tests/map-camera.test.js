import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainBounds,extensionView,fitOverview,zoomCamera,panCamera} from '../src/map-camera.js';
test('Zoom extensión encaja el tablero completo incluso en tableros gigantes y centra coordenadas negativas',()=>{
 const terrain=[{x:-1000,y:-20},{x:999,y:20}],view=extensionView(terrain,{width:390,height:600},48);
 assert.equal(view.capped,false);assert.equal(view.zoom*48,.175);assert.equal(view.x,-.5);
 const small=extensionView([{x:0,y:0},{x:2,y:2}],{width:390,height:600},48);assert.equal(small.capped,false);assert(Math.abs(small.zoom-1.6)<1e-12);
 assert.equal(terrainBounds([]),null);
});
test('Mapa completo ajusta la proporción de un mundo estrecho sin recortar terreno',()=>{
 const bounds={x:-2,y:-2,width:1004,height:7},fit=fitOverview(bounds,{width:360,height:250});
 assert(Math.abs(fit.width/fit.height-360/250)<1e-12);assert(fit.x<=bounds.x);assert(fit.y<=bounds.y);assert(fit.height>=bounds.height);
});
test('Zoom mantiene el punto bajo el dedo; arrastre se limita al terreno y extensión restablece la vista',()=>{
 const bounds={x:0,y:0,width:100,height:100},anchor={x:30,y:40};
 const zoom=zoomCamera(bounds,bounds,2,anchor,bounds);assert.equal(zoom.width,50);assert.equal((anchor.x-zoom.x)/zoom.width,.3);assert.equal((anchor.y-zoom.y)/zoom.height,.4);
 assert.deepEqual(panCamera(zoom,bounds,10000,-10000),{x:50,y:0,width:50,height:50});
 assert.deepEqual(zoomCamera(zoom,bounds,.01,anchor,bounds),bounds);
 const max=zoomCamera(zoom,bounds,10000,anchor,bounds);assert.equal(max.width,3);assert.equal(max.height,3);
});
