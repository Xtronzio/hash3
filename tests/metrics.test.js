import test from 'node:test';
import assert from 'node:assert/strict';
import {localMetrics,summarizeMetrics,metricsMarkup} from '../src/metrics.js';
import {createLocal} from '../src/local.js';
import {navigationPaths,navigationIcon} from '../src/navigation-icons.js';
import {practiceTools,pendingTools,initializeInventory} from '../src/practice-tools.js';
import {inventoryMarkup} from '../src/inventory.js';

test('Solo metrics select the human even with O and retain only the newest snapshot',()=>{
 const g=createLocal('solo','Jorge','',1700000000000,'normal','untimed','medium','O');g.players[0].score=999;g.players[1].score=15;g.players[1].bestCombo={points:12};
 const newer=structuredClone(g);newer.updatedAt='2026-10-07T12:00:00Z';newer.players[1].score=20;
 const before=JSON.stringify(g),entries=localMetrics([newer,g]);assert.equal(entries.length,1);assert.equal(entries[0].name,'Jorge');assert.equal(entries[0].score,20);assert.equal(JSON.stringify(g),before);
});
test('Metrics separate modes and shared-device participants without inventing missing records',()=>{
 const a=createLocal('local','Ana','Luis',1700000000000);a.players[0].score=10;a.players[1].score=20;
 const entries=localMetrics([a]);assert.equal(entries.length,2);assert.equal(summarizeMetrics(entries).games,1);assert.equal(summarizeMetrics(entries).bestCombo,null);
 const html=metricsMarkup({entries,mode:'local'});assert.match(html,/<h4>Ana<\/h4>/);assert.match(html,/<h4>Luis<\/h4>/);assert.match(html,/no modifica el oficial/);
 assert.match(metricsMarkup({entries,mode:'duel'}),/No hay partidas registradas/);
 assert.equal(summarizeMetrics([{game:'a',max:0,bestCombo:0}]).max,0);
});
test('Navigation icons distinguish fit, fullscreen and restore',()=>{
 assert.equal(new Set(Object.values(navigationPaths)).size,3);assert.match(navigationIcon('fit'),/<rect/);assert.doesNotMatch(navigationIcon('restore'),/×|undefined/);
});
test('Construction rename preserves old inventories and destruction starts with zero stock',()=>{
 const g=createLocal('local');g.players[0].inventory.cards.activate=2;initializeInventory(g);
 assert.equal(practiceTools.find(t=>t.id==='activate').label,'Construir celda');assert.equal(g.players[0].inventory.cards.activate,2);
 assert.equal(g.players[0].inventory.cards.destroy,0);assert.equal(pendingTools.length,0);
 const html=inventoryMarkup(null,null);assert.match(html,/Construir celda/);assert.doesNotMatch(html,/Activar celda/);assert.match(html,/Destruir celda/);assert.doesNotMatch(html,/Reglas de uso pendientes/);
 for(const action of ['setup-solo','setup-local','hall-games'])assert.match(html,new RegExp('data-action="'+action+'"[^>]*><svg'));
});
