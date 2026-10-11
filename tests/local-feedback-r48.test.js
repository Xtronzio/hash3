import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocal} from '../src/local.js';
import {ecologyNavigationMarkup,ecologyTargets,nextEcologyTarget} from '../src/ecology-navigation.js';
import {scoreNoticeMarkup} from '../src/score-notice.js';
import {pausedScoreMarkup} from '../src/paused-ui.js';
import {brandMark} from '../src/brand.js';

test('Territory stacks count placed barriers once per object, retaining old footprints and navigation',()=>{
 const r=createLocal('local','X','O',0,'normal','untimed');
 r.frontiers=[{id:'one',cells:[{x:-1,y:0}]},{id:'old',edges:[{a:{x:0,y:1},b:{x:-1,y:1}},{a:{x:0,y:2},b:{x:-1,y:2}}]},{id:'three',type:'border',cells:[{x:3,y:0},{x:3,y:1},{x:3,y:2}]}];
 const before=structuredClone(r);
 for(const turnEcologyVersion of [undefined,1]){
  r.turnEcologyVersion=turnEcologyVersion;const html=ecologyNavigationMarkup(r,'local-x');
  assert.match(html,/aria-label="2 muros colocados">×2/);assert.match(html,/aria-label="1 fronteras colocadas">×1/);
  assert.equal((html.match(/data-ecology-kind="frontier"/g)||[]).length,1);assert.equal((html.match(/data-ecology-kind="border"/g)||[]).length,1);
 }
 const targets=ecologyTargets(r,'frontier');assert.equal(targets.length,2);assert.equal(nextEcologyTarget(targets,targets[0].sourceId).sourceId,targets[1].sourceId);
 assert.deepEqual(r.frontiers,before.frontiers);assert.deepEqual(r.players,before.players);
});

test('Points jump and optional breakdown are separate; summary never contains the formula',()=>{
 const f={name:'<Jorge>',symbol:'X',points:33,bonus:3,groups:[{kind:'línea',size:3,count:10,points:30}]};
 const copy=structuredClone(f),html=scoreNoticeMarkup(f,{message:'Inmunidad disponible'});
 const jump=html.split('</button>')[0];assert.match(jump,/\+33/);assert.doesNotMatch(jump,/Líneas|Bonus|Inmunidad/);
 assert.match(html,/<details class="score-details"><summary/);assert.doesNotMatch(html,/<details[^>]*\bopen\b/);
 assert.match(html,/10 Líneas de 3 · \+30 \/ Bonus · \+3/);assert.match(html,/&lt;Jorge&gt;/);assert.deepEqual(f,copy);
});

test('Pause dropdown contains only details, leaving stock to its visible toolbar; #33 inherits the original heading font',()=>{
 const r=createLocal('local','X','O',0);const html=pausedScoreMarkup(r,{ranking:'<ol>Ranking</ol>',stock:'<aside>Stock</aside>'});
 assert.doesNotMatch(html,/Stock/);assert.match(html,/Ranking/);assert.equal(brandMark,'#33');
});
