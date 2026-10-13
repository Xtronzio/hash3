import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocal,localCommand} from '../src/local.js';
import {TERRITORY_GUIDE,territoryGuideMarkup} from '../src/territory-guide.js';
import {ecologyCardStatus,ecologyNavigationMarkup,ecologyMapPins} from '../src/ecology-navigation.js';
import {stampCellPresentation,cellGlyphs,lastGlyphPerCell} from '../src/cell-presentation.js';
import {savedMapModel} from '../src/saved-map.js';
import {overviewModel} from '../src/map-overview.js';
import {mapCellSymbols} from '../src/map-render.js';
import {boardActionFeedback} from '../src/rodent-feedback.js';
import {resolveBriefFauna} from '../src/brief-ecology.js';
const fresh=()=>createLocal('local','Jorge','Rival',1000,'normal','untimed','medium','X',false,{faunaEnabled:true,territoryEnabled:true});
test('Shared hall/board territory catalogue explains every current card and is read only',()=>{
 const r=fresh(),before=structuredClone(r);assert.equal(TERRITORY_GUIDE.length,24);
 for(const game of [null,r]){const html=territoryGuideMarkup(game,'local-x');for(const t of TERRITORY_GUIDE){assert.ok(t.description.length>80);assert.match(html,new RegExp('data-tool="territory:'+t.id+'"[^>]*aria-expanded="false"'));assert.ok(html.includes(t.description));}assert.match(html,/todavía sin turno asignado/);assert.match(html,/tres turnos/);}
 assert.deepEqual(r,before);const open=territoryGuideMarkup(r,'local-x',{openTools:new Set(['territory:rhino'])});assert.doesNotMatch(open.match(/<section[^>]*id="territory-description-rhino"[^>]*>/)[0],/hidden/);
});
test('Only chosen/announced events promise a numeric countdown; permanent and absent items are explicit',()=>{
 const r=fresh();r.players[0].figures=33;r.territoryPlans.natural='ufo';r.territoryNextPlacement=24;
 assert.equal(ecologyCardStatus(r,'ufo','local-x').badge,'−27');assert.equal(ecologyCardStatus(r,'pandemic','local-x').badge,'…');assert.equal(ecologyCardStatus(r,'invader-colony','local-x').badge,'—');
 r.cells.push({x:0,y:0,id:'star',symbol:'*'});assert.equal(ecologyCardStatus(r,'invader-colony','local-x').badge,'∞');
 r.territoryEvents=[{id:'entry',kind:'invader-colony',region:[{x:1,y:1}],turnsRemaining:1}];assert.equal(ecologyCardStatus(r,'invader-colony','local-x').badge,'−1');
 r.frontiers=[{id:'dam',type:'beaver',cells:[{x:2,y:0},{x:3,y:0},{x:4,y:0}],turnsRemaining:7}];assert.equal(ecologyCardStatus(r,'beaver-barrier','local-x').badge,'−7');assert.equal(ecologyCardStatus(r,'barriers','local-x').badge,'×1');
 const before=structuredClone(r);ecologyNavigationMarkup(r,'local-x');assert.deepEqual(r,before);
});
test('Forecast respects the next small/plague variant in each zone and completed workers are ignored',()=>{
 const r=fresh();r.habitatZones=[{placements:10,next:{rodent:40},birthScale:{rodent:1}},{placements:5,next:{rodent:66},birthScale:{rodent:0}}];
 assert.equal(ecologyCardStatus(r,'rodent-plague','local-x').badge,'−33');assert.equal(ecologyCardStatus(r,'rodent','local-x').badge,'−64');
 r.works=[{id:'done',build:[{x:1,y:0}],destroy:[],done:1,turnsRemaining:1}];assert.notEqual(ecologyCardStatus(r,'build','local-x').badge,'−1');
});
test('Last marker wins across cell, map and save without removing older effects or target references',()=>{
 let r=fresh();r.cells=[{id:'piece',x:1,y:1,symbol:'X',owner:'local-x'}];r.territoryEvents=[{id:'old',kind:'ufo',x:1,y:1,region:[{x:1,y:1}],turnsRemaining:3,at:900}];
 let next=stampCellPresentation(r,localCommand(r,'watch-target',{x:1,y:1},1100));assert.equal(cellGlyphs(next,'local-x').get('1,1').type,'target');assert.equal(next.territoryEvents.length,1);assert.equal(r.watchTargets,undefined);
 const before=structuredClone(next);const later={...next,clockNow:1200,version:next.version+1,territoryEvents:[...next.territoryEvents,{id:'new',kind:'contagion',x:1,y:1,region:[{x:1,y:1}],turnsRemaining:3,at:1200}]};next=stampCellPresentation(next,later);
 assert.equal(cellGlyphs(next,'local-x').get('1,1').kind,'contagion');assert.equal(next.watchTargets.length,1);assert.equal(next.territoryEvents.length,2);assert.deepEqual(before.territoryEvents[0],r.territoryEvents[0]);
 const model=savedMapModel(next,next.players[0]);assert.equal(model.visibleWatchTargets.length,0);assert.equal(model.watchTargets.length,1);assert.equal(model.ecologyPins.filter(e=>e.x===1&&e.y===1).length,1);assert.doesNotMatch(mapCellSymbols(model.terrain),/data-symbol="X"/);
 const restored=JSON.parse(JSON.stringify(next));assert.equal(cellGlyphs(restored,'local-x').get('1,1').kind,'contagion');assert.equal(overviewModel(restored,restored.players[0]).visibleWatchTargets.length,0);
});
test('Clock countdown updates do not reorder icons; actual application order survives a clock rollback',()=>{
 const r=fresh(),next={...r,clockNow:1100,territoryEvents:[{id:'a',kind:'ufo',x:1,y:1,region:[{x:1,y:1}],turnsRemaining:3}]};
 const stamped=stampCellPresentation(r,next),ticked=stampCellPresentation(stamped,{...stamped,clockNow:1200,territoryEvents:[{...stamped.territoryEvents[0],turnsRemaining:2}]});assert.equal(ticked.presentationSequence,stamped.presentationSequence);assert.equal(ticked.territoryEvents[0].visualOrder,stamped.territoryEvents[0].visualOrder);
 assert.equal(lastGlyphPerCell([{x:0,y:0,kind:'a',visualOrder:1,visualAt:9999},{x:0,y:0,kind:'b',visualOrder:2,visualAt:1}]).get('0,0').kind,'b');
 assert.equal((ecologyMapPins([{x:0,y:0,id:'a',kind:'ufo',turnsRemaining:3},{x:0,y:0,id:'b',kind:'pandemic',turnsRemaining:2}]).match(/class="ecology-map-pin/g)||[]).length,1);
});
test('Accepted tool effects animate changed positions once, including an opposite scoring move',()=>{
 const r=fresh();r.cells=[{id:'old',x:1,y:1,symbol:'O',owner:'local-o'}];const next={...r,version:r.version+1,cells:[{id:'new',x:1,y:1,symbol:'X',owner:'local-x'}],lastEvent:{id:'new',kind:'move',tool:'opposite'}};
 assert.equal(boardActionFeedback(r,next).visits[0].kind,'opposite');assert.equal(boardActionFeedback(next,next),null);
 const overlap={...next,habitatEvent:{id:'h',actions:[{x:1,y:1,kind:'worm'}]}};const feedback=boardActionFeedback(r,overlap);assert.equal(feedback.visits.length,1);assert.equal(feedback.visits[0].kind,'opposite');
});
test('Rhino visual route includes empty/protected traversed cells without changing clear logic or paid points',()=>{
 const r=fresh();r.cells=[{id:'food',x:0,y:0,symbol:'X',owner:'local-x'}];r.players[0].score=333;const event={id:'rino',kind:'rhino',paths:[[{x:0,y:0},{x:1,y:0},{x:2,y:0}]]};r.faunaEvents=[event];resolveBriefFauna(r,event,2000);
 assert.equal(r.cells.length,0);assert.equal(r.habitatEvent.actions.length,1);assert.equal(r.habitatEvent.visualActions.length,3);assert.equal(r.players[0].score,333);assert.equal(r.terrain.length,9);
});
test('All territory effects have a finite animation; reduced motion overrides them and approved OVNI is retained',()=>{
 const css=fs.readFileSync(new URL('../src/territory-presentation.css',import.meta.url),'utf8'),original=fs.readFileSync(new URL('../src/board.css',import.meta.url),'utf8');
 for(const kind of ['rodent','worm','rhino','beaver','build','destroy','meteorites','earthquake','tornado','hurricane','contagion','pandemic','blackhole','death','invader-colony'])assert.ok(css.includes('.board-action-'+kind));
 assert.match(original,/board-action-ufo[^}]*ufo-abduction/);assert.match(css,/prefers-reduced-motion:reduce/);assert.doesNotMatch(css,/infinite/);
});
