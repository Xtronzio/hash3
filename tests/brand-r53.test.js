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
 const html=fs.readFileSync('index.html','utf8');assert.equal((html.match(/icons\/hash3-[^"]+-r53.png/g)||[]).length,4);
 assert.doesNotMatch(html,/r47|DILEMA/);
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.name,'#33');
 for(const entry of manifest.icons)assert.match(entry.src,/-r53.png$/);
 for(const [target,master] of [['favicon.png','hash3-favicon-32-r53.png'],['apple-touch-icon.png','hash3-apple-touch-icon-r53.png'],['apple-touch-icon-precomposed.png','hash3-apple-touch-icon-r53.png']])assert.deepEqual(fs.readFileSync('public/'+target),fs.readFileSync('public/icons/'+master));
 assert.ok(fs.statSync('public/favicon.ico').size>0);
});
