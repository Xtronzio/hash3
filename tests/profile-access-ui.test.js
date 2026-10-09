import test from 'node:test';
import assert from 'node:assert/strict';
import {profileAccessMarkup} from '../src/profile-access-ui.js';

test('La pantalla diferencia generar, copiar, compartir y cargar perfil',()=>{
 const html=profileAccessMarkup('Colono');
 assert.match(html,/IDENTIDAD DEL COLONO/);
 assert.match(html,/profile-generate/);
 assert.match(html,/profile-copy-ready/);
 assert.match(html,/profile-share/);
 assert.match(html,/profile-renew-confirm/);
 assert.match(html,/profile-import/);
 assert.match(html,/profile-copy-status/);
 assert.match(html,/profile-restore-status/);
});
test('Los nombres se escapan antes de insertarlos en la pantalla',()=>{
 const html=profileAccessMarkup('<script>');
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
