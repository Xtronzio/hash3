import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/mobile-viewport.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('La pantalla del móvil fija la aplicación al visual viewport sin scroll del documento',()=>{
 assert.match(css,/html,body\s*\{[^}]*overflow:hidden/s);
 assert.match(css,/#app\s*\{[^}]*height:100dvh/s);
 assert.match(css,/#app>\.game\s*\{[^}]*overflow:hidden/s);
 assert.match(css,/#app>\.hall\s*\{[^}]*overflow-y:auto/s);
 assert.match(source,/import '\.\/mobile-viewport\.css'/);
});

test('Los diálogos móviles ajustan su altura al espacio disponible y aíslan el scroll',()=>{
 assert.match(css,/#app>\.dialog-backdrop\s*\{[^}]*height:100dvh/s);
 assert.match(css,/#app>\.dialog-backdrop>\.dialog\s*\{[^}]*max-height:100%/s);
 assert.match(css,/#app>\.hall-dialog:has\(\.profile-screen\)>\.dialog\s*\{[^}]*max-height:100%/s);
 assert.match(css,/overscroll-behavior:contain/);
});
test('Perfil evita activar el teclado al abrirse en móvil pero conserva focus accesible',()=>{
 assert.match(source,/const touchProfile=hallDialog==='profile'&&matchMedia/);
 assert.match(source,/focusTarget\?\.focus\(\{preventScroll:true\}\)/);
});
