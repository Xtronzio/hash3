import test from 'node:test';import assert from 'node:assert/strict';
import {achievementsMarkup,achievementSelection,territoryComparisonKey} from '../src/achievements.js';
const record=(game,mode,goalType,target,extra={})=>({game,mode,goalType,target,limit:target,size:target,kind:{cells:'board-limit',moves:'move-limit',time:'time-limit'}[goalType],humanId:'human',level:'normal',timeMode:'untimed',completedAt:'2026-10-08T18:00:00Z',players:[{id:'human',name:game,score:33,figures:3},{id:'bot',name:'Machine opponent',score:99}],...extra});
const results=[record('Local cells','local','cells',33),record('Other limit','local','cells',333),record('Local moves','local','moves',33),record('Machine cells','solo','cells',33),record('Local time','local','time',180)];
test('Selectors isolate modality, objective and target; machine opponent is excluded',()=>{
 let html=achievementsMarkup(results,{mode:'local',goal:'cells',target:33});assert.match(html,/<th scope="row">Local cells/);for(const name of ['Other limit','Local moves','Machine cells','Local time'])assert.doesNotMatch(html,new RegExp('<th scope="row">'+name));
 html=achievementsMarkup(results,{mode:'solo',goal:'cells',target:33});assert.match(html,/<th scope="row">Machine cells/);assert.doesNotMatch(html,/Machine opponent/);
 html=achievementsMarkup(results,{mode:'local',goal:'time',target:180});assert.match(html,/Tiempo · 3 minutos/);assert.match(html,/<th scope="row">Local time/);
});
test('Different rule combinations are selectable and never merged into a comparison table',()=>{
 const records=[record('Fauna on','local','cells',33,{faunaEnabled:true}),record('Fauna off','local','cells',33,{faunaEnabled:false})];
 let html=achievementsMarkup(records,{mode:'local',goal:'cells',target:33});assert.match(html,/id="achievement-rules"/);assert.match(html,/<th scope="row">Fauna on/);assert.doesNotMatch(html,/<th scope="row">Fauna off/);
 html=achievementsMarkup(records,{mode:'local',goal:'cells',target:33,comparison:territoryComparisonKey(records[1])});assert.match(html,/<th scope="row">Fauna off/);assert.doesNotMatch(html,/<th scope="row">Fauna on/);
});
test('Empty selections retain buttons and archived legacy board results remain accessible',()=>{
 const html=achievementsMarkup([],{mode:'local',goal:'moves',target:333});assert.match(html,/No hay partidas completadas/);assert.match(html,/data-target="333" aria-pressed="true"/);
 const legacy=record('Legacy','local','cells',33);delete legacy.goalType;delete legacy.target;assert.match(achievementsMarkup([legacy]),/<th scope="row">Legacy/);
 assert.equal(achievementSelection(results,{mode:'local',goal:'time',target:33}).target,180);assert.match(achievementsMarkup(results,{mode:'world'}),/Mundo es continuo/);
});
