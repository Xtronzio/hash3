import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brandMark} from '../src/brand.js';

test('Header, favicon and installation icons share the original monochrome #33 paths; PWA identity remains stable',()=>{
 const wordmark=fs.readFileSync('public/icons/hash3-wordmark-r53.svg','utf8').trim();
 assert.equal(brandMark,wordmark);
 const icon=fs.readFileSync('public/icons/hash3-logo-r53.svg','utf8');
 assert.ok(icon.includes(wordmark.match(/<path[^>]+\/>/)[0]));
 assert.doesNotMatch(wordmark+icon,/#ff4a58|#24d393|<text/);
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/apple-touch-icon" sizes="180x180" href="\/icons\/hash3-apple-touch-icon-r53.png"/);
 assert.doesNotMatch(html,/r47|DILEMA/);
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.name,'#33');
 for(const entry of manifest.icons)assert.match(entry.src,/-r53.png$/);
 for(const [target,master] of [['favicon.png','hash3-favicon-32-r53.png'],['apple-touch-icon.png','hash3-apple-touch-icon-r53.png'],['apple-touch-icon-precomposed.png','hash3-apple-touch-icon-r53.png']])assert.deepEqual(fs.readFileSync('public/'+target),fs.readFileSync('public/icons/'+master));
 assert.ok(fs.statSync('public/favicon.ico').size>0);
});
test('Fresh bookmark URLs preserve the approved design, including ICO and Apple precomposed candidates',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/rel="shortcut icon"[^>]*hash3-favicon-r55.ico/);
 assert.match(html,/rel="apple-touch-icon-precomposed"[^>]*hash3-bookmark-180-r55.png/);
 for(const [fresh,master] of [['hash3-favicon-32-r55.png','hash3-favicon-32-r53.png'],['hash3-favicon-48-r55.png','hash3-favicon-48-r53.png'],['hash3-icon-192-r55.png','hash3-icon-192-r53.png'],['hash3-bookmark-180-r55.png','hash3-apple-touch-icon-r53.png']])assert.deepEqual(fs.readFileSync('public/icons/'+fresh),fs.readFileSync('public/icons/'+master));
 assert.deepEqual(fs.readFileSync('public/icons/hash3-favicon-r55.ico'),fs.readFileSync('public/favicon.ico'));
});
