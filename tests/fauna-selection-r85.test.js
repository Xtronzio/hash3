import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal,localCommand} from '../src/local.js';
import {SELECTABLE_FAUNA,normalizeFauna,faunaKindEnabled,faunaComparison} from '../src/fauna-selection.js';
import {faunaPickerMarkup} from '../src/phenomena-ui.js';
import {countHabitatPlacement,advanceEcologyTurn} from '../src/inhabitants.js';
import {announceAnts} from '../src/ants.js';
import {announceAnaconda} from '../src/anaconda.js';
import {announceBriefFauna} from '../src/brief-ecology.js';
import {ecologyNavigationMarkup,ecologyCardStatus} from '../src/ecology-navigation.js';
import {turnOutlook} from '../src/turn-event-ui.js';
import {territoryComparisonKey} from '../src/achievements.js';
import {savedGameSettings} from '../src/saved-game-settings.js';
import {finishAtBoardLimit,finishAtMatchGoal} from '../src/board-limits.js';
import {captureTransfer,validateTransfer} from '../src/local-transfer.js';
const NOW=1800000000000;
const fresh=fauna=>createLocal('local','Jorge','Rival',NOW,'normal','untimed','pro','X',true,{territoryEnabled:false,...(fauna?{fauna}:{})});
const board=fauna=>{const g=fresh(fauna);g.terrain=Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10)}));g.cells=g.terrain.slice(0,90).map((c,i)=>({...c,id:'piece-'+i,symbol:i%2?'X':'O',owner:i%2?'local-x':'local-o'}));return g;};
const due=(g,kind)=>{countHabitatPlacement(g,'local-x',{x:9,y:9},NOW,()=>.3);const z=g.habitatZones[0];for(const k of Object.keys(z.next))z.next[k]=99999;z.next[kind]=z.placements+1;return z;};
const attempt=g=>countHabitatPlacement(g,'local-o',{x:8,y:9},NOW,()=>.3);
test('Fauna catalogue supports thirteen independent choices, legacy all, canonical ordering and none',()=>{
 assert.equal(SELECTABLE_FAUNA.length,13);assert.deepEqual(normalizeFauna(),SELECTABLE_FAUNA);assert.deepEqual(normalizeFauna(['ants','rodent','ants']),['rodent','ants']);assert.throws(()=>normalizeFauna(['fog']));assert.throws(()=>normalizeFauna('ants'));
 const g=fresh(['ants']);assert.deepEqual(g.fauna,['ants']);assert.equal(faunaKindEnabled(g,'ants'),true);assert.equal(faunaKindEnabled(g,'ants-plague'),false);assert.equal(fresh([]).faunaEnabled,false);assert.equal(faunaComparison(fresh()),null);assert.equal(faunaComparison(fresh(SELECTABLE_FAUNA)),null);assert.equal(faunaKindEnabled({...g,mode:'world'},'worm'),true);assert.equal(faunaKindEnabled({...g,variant:'inverse'},'ants'),false);
 const html=faunaPickerMarkup(['ants']);assert.equal((html.match(/data-fauna=/g)||[]).length,13);assert.match(html,/1\/13/);assert.equal((html.match(/ checked/g)||[]).length,1);assert.doesNotMatch(html,/<select|<output/);
});
test('Every excluded birth channel consumes its attempt without new residents or changes to other schedules',()=>{
 for(const kind of ['rodent','worm','rhino','beaver','anaconda','ants','work']){const g=board(['build']),z=due(g,kind);if(kind==='work')g.fauna=['ants'];const before={...z.next};attempt(g);assert.equal(g.rodentRaids.length+g.worms.length+g.works.length+g.anacondas.length+g.faunaEvents.length,0,kind);assert.ok(z.next[kind]>z.placements,kind);for(const other of Object.keys(before).filter(k=>k!==kind))assert.equal(z.next[other],before[other]);}
});
test('A plague-only choice skips the small slot and then announces the plague at its original interval',()=>{
 for(const kind of ['rodent','worm','rhino','beaver','ants']){const g=board([kind+'-plague']),z=due(g,kind);attempt(g);assert.equal(g.rodentRaids.length+g.worms.length+g.faunaEvents.length,0,kind);assert.equal(z.birthScale[kind],1);const next=z.next[kind];z.placements=next-1;attempt(g);const residents=kind==='rodent'?g.rodentRaids:kind==='worm'?g.worms:g.faunaEvents;assert.ok(residents.length,kind);if(['rodent','worm'].includes(kind))assert.ok(residents.every(e=>e.scale==='large'));else assert.equal(residents[0].kind,kind+'-plague');assert.equal(z.birthScale[kind],2);}
});
test('Direct announcements cannot bypass a disabled selection or switch to another variant',()=>{
 const g=board(['build']);assert.equal(announceAnts(g,{},NOW),false);assert.equal(announceAnaconda(g,NOW),false);assert.equal(announceBriefFauna(g,'rhino',{},NOW),false);assert.equal(announceBriefFauna(g,'beaver',{},NOW),false);assert.equal(g.faunaEvents.length+g.anacondas.length,0);
 const h=board(['ants']);assert.equal(announceAnts(h,{birthScale:{ants:1}},NOW),false);assert.equal(announceAnts(h,{},NOW,()=>.3),true);assert.equal(h.faunaEvents[0].kind,'ants');
});
test('Ampliadores and Soldados plan and act independently while preserving terrain and points',()=>{
 for(const choice of ['build','destroy']){const g=board([choice]);g.cells.slice(0,9).forEach(c=>{c.symbol='*';c.owner=null;});const score=g.players.map(p=>p.score),z=due(g,'work');attempt(g);assert.equal(g.works.length,3);assert.equal(g.works.flatMap(w=>w[choice]).length,9);assert.equal(g.works.flatMap(w=>w[choice==='build'?'destroy':'build']).length,0);for(let i=0;i<9;i++)advanceEcologyTurn(g,NOW,()=>.3);assert.equal(g.terrain.length,choice==='build'?109:100);assert.equal(g.cells.filter(c=>c.symbol==='*').length,choice==='build'?9:0);assert.deepEqual(g.players.map(p=>p.score),score);assert.ok(z.next.work>z.placements);}
});
test('Navigation and forecasts hide excluded types and identify the saved selection',()=>{
 const g=board(['ants','destroy']);const html=ecologyNavigationMarkup(g,'local-x');assert.match(html,/data-ecology-kind="ants"/);assert.match(html,/data-ecology-kind="destroy"/);for(const k of ['rodent','worm','rhino','beaver','anaconda','ants-plague','build'])assert.doesNotMatch(html,new RegExp('data-ecology-kind="'+k+'"'));
 assert.equal(ecologyCardStatus(g,'worm','local-x').state,'disabled');assert.equal(turnOutlook(g,'local-x').rows.find(r=>r.kind==='worm').enabled,false);assert.deepEqual(turnOutlook(g,'local-x').rows.find(r=>r.kind==='work').chosen,['destroy']);assert.match(savedGameSettings(g).find(s=>s.id==='fauna').label,/Hormigas, Soldados/);
});
test('Pausing, transfer and completed goals preserve selection; malformed settings never import',()=>{
 let g=board(['ants','destroy']);g=localCommand(g,'pause',{},NOW);const m=new Map([['hash3_locals',JSON.stringify([g])],['hash3_local',JSON.stringify({id:g.id})],['hash3_name','Jorge']]);const data=captureTransfer({getItem:k=>m.get(k)??null},{now:NOW});assert.equal(validateTransfer(data),data);assert.deepEqual(data.games[0].fauna,g.fauna);
 for(const value of [['unknown'],['ants','ants'],'ants']){const n=structuredClone(data);n.games[0].fauna=value;assert.throws(()=>validateTransfer(n));}
 for(const finish of [finishAtBoardLimit,finishAtMatchGoal]){const h=board(['ants']);h.cellTarget=33;if(finish===finishAtMatchGoal){h.matchGoal={type:'moves',target:33};h.players[0].placements=33;}assert.equal(finish(h,NOW),true);assert.deepEqual(h.finalResult.fauna,['ants']);}
 const a=fresh(),b={...a,fauna:['ants']};assert.notEqual(territoryComparisonKey(a),territoryComparisonKey(b));assert.equal(territoryComparisonKey(a),territoryComparisonKey({...a,fauna:[...SELECTABLE_FAUNA]}));
});
