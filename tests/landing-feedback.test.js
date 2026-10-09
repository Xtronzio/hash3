import test from 'node:test';
import assert from 'node:assert/strict';
import {landingFeedback,landingScoreMarkup} from '../src/landing-feedback.js';

const previous={id:'local-1',status:'playing'};
const next={...previous,landingEvent:{id:'storm-1',scores:[
 {symbol:'O',points:9,paidFigures:[{points:[[20,5],[21,5],[22,5]]}]},
 {symbol:'X',points:3,paidFigures:[{points:[[0,0],[1,0],[2,0]]}]}
]}};

test('Storm payouts animate at actual paid cells for both symbols, without replaying saved events',()=>{
 const feedback=landingFeedback(previous,next);
 assert.deepEqual(feedback.scores.map(s=>s.move),[{x:21,y:5},{x:1,y:0}]);
 assert.equal(landingFeedback(null,next),null);
 assert.equal(landingFeedback({...previous,id:'another-game'},next),null);
 assert.equal(landingFeedback(next,structuredClone(next)),null);
});

test('Landing notice contains only large numeric totals, including a simultaneous manual payout',()=>{
 const markup=landingScoreMarkup(next.landingEvent.scores,{symbol:'X',points:6,name:'Jorge',figures:2});
 assert.equal(markup.replace(/<[^>]*>/g,''),'+9+9');
 assert.match(markup,/score-notice-total x/);
 assert.match(markup,/score-notice-total o/);
 assert.doesNotMatch(markup,/Jorge|Huracán|figuras|detalle|button/);
});

test('A zero or malformed landing payout produces no animation or injected notice text',()=>{
 const scores=[{symbol:'X',points:0},{symbol:'O',points:Infinity},{symbol:'<script>',points:3},{symbol:'X',points:'<img>'}];
 assert.equal(landingFeedback(previous,{...next,landingEvent:{id:'empty',scores}}),null);
 assert.equal(landingScoreMarkup(scores),'');
});
