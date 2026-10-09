import test from 'node:test';
import assert from 'node:assert/strict';
import {ONLINE_ENABLED,modeAvailable,requireOnline} from '../src/online-availability.js';
import {hallMarkup,hallDialogMarkup} from '../src/hall.js';
import {profileAccessMarkup} from '../src/profile-access-ui.js';

test('Local diagnosis blocks online modes and API while retaining both local modes',()=>{
 assert.equal(ONLINE_ENABLED,false);assert.equal(modeAvailable('duel'),false);assert.equal(modeAvailable('world'),false);
 assert.equal(modeAvailable('solo'),true);assert.equal(modeAvailable('offline'),true);assert.throws(requireOnline,/En construcción/);
 const html=hallMarkup({mode:'world'});
 for(const mode of ['duel','world'])assert.match(html,new RegExp('data-mode="'+mode+'"[^>]*disabled[^>]*>[^]*?<span>En construcción</span>'));
 assert.doesNotMatch(hallDialogMarkup('online'),/entry-form|Entrar en Mundo|Crear duelo/);
});
test('Colono identity uses the grid and team marks; private link has an explicit visible SVG stroke',()=>{
 const html=profileAccessMarkup('Colono',{online:false});
 assert.match(html,/profile-colono-logo/);assert.match(html,/class="colono-x"/);assert.match(html,/class="colono-o"/);
 assert.match(html,/profile-step-icon[^]*?<svg[^>]*fill="none"[^>]*stroke="currentColor"/);
 assert.match(html,/id="profile-generate"[^>]*disabled/);assert.match(html,/<input disabled id="profile-link"/);
 assert.doesNotMatch(html,/<input id="profile-name"[^>]*disabled/);
});
