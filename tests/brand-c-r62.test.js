import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brandMark,familyWordmark,familyIcon} from '../src/brand.js';

const assets=['hash3-apple-touch-icon-c1.png','hash3-favicon-16-c1.png','hash3-favicon-32-c1.png','hash3-favicon-48-c1.png','hash3-favicon-c1.ico','hash3-icon-192-c1.png','hash3-icon-512-c1.png','hash3-logo-c1.svg','hash3-wordmark-c1.svg'];
test('One approved C geometry composes #3/#33/#333, without a frame, colors or a font dependency',()=>{
 for(const count of [1,2,3]){
  const wordmark=familyWordmark(count),icon=familyIcon(count);
  assert.equal(wordmark,fs.readFileSync(`design/brand-c/hash${'3'.repeat(count)}.svg`,'utf8').trim());
  assert.match(wordmark,new RegExp(`aria-label="#${'3'.repeat(count)}"`));
  assert.equal((wordmark.match(/data-glyph="3"/g)||[]).length,count);
  assert.equal((wordmark.match(/data-glyph="#"/g)||[]).length,4);
  assert.ok(icon.includes(wordmark.slice(wordmark.indexOf('><g')+1,-6)));
  assert.doesNotMatch(wordmark+icon,/<text|stroke="(?!none)|#ff4a58|#24d393|border=|<image/);
 }
 assert.throws(()=>familyWordmark(0));assert.throws(()=>familyWordmark(4));
 assert.equal(brandMark,fs.readFileSync('public/icons/hash3-wordmark-c1.svg','utf8').trim());assert.equal(familyIcon(2),fs.readFileSync('public/icons/hash3-logo-c1.svg','utf8').trim());
});
test('Published icons contain only the active C design, with correctly sized PNGs and all ICO resolutions',()=>{
 assert.deepEqual(fs.readdirSync('public/icons').sort(),assets);
 for(const size of [16,32,48,180,192,512]){
  const file=size===180?'hash3-apple-touch-icon-c1.png':`hash3-${size<100?'favicon':'icon'}-${size}-c1.png`,png=fs.readFileSync('public/icons/'+file);
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const ico=fs.readFileSync('public/icons/hash3-favicon-c1.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),6);assert.deepEqual(Array.from({length:6},(_,i)=>ico[6+16*i]||256),[16,32,48,64,128,256]);
 for(const [target,source] of [['favicon.png','hash3-favicon-32-c1.png'],['favicon.ico','hash3-favicon-c1.ico'],['apple-touch-icon.png','hash3-apple-touch-icon-c1.png'],['apple-touch-icon-precomposed.png','hash3-apple-touch-icon-c1.png']])assert.deepEqual(fs.readFileSync('public/'+target),fs.readFileSync('public/icons/'+source));
});
test('All declarations use scoped C names; installed app identity and saved-game keys remain unchanged',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/r08|r38|r47|r53|r55|DILEMA/);
 const hrefs=[...html.matchAll(/href="\/icons\/([^"]+)"/g)].map(m=>m[1]);for(const name of hrefs)assert.ok(assets.includes(name));assert.equal(hrefs.length,8);
 assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="\/icons\/hash3-apple-touch-icon-c1.png"/);assert.match(html,/rel="apple-touch-icon-precomposed" sizes="180x180" href="\/icons\/hash3-apple-touch-icon-c1.png"/);
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));for(const k of ['id','start_url','scope'])assert.equal(manifest[k],'./');assert.equal(manifest.name,'#33');for(const entry of manifest.icons)assert.ok(assets.includes(entry.src.slice(6)));
 assert.doesNotMatch(fs.readFileSync('scripts/build-offline.mjs','utf8'),/localStorage|indexedDB/);
});
