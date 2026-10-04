import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {VERSION_LABEL,BUILD_ID} from '../src/version.js';
const root='dist',base=process.env.HASH3_BASE_PATH||'/';
if(!base.startsWith('/')||!base.endsWith('/'))throw new Error('Base path must start and end with /.');
fs.writeFileSync(root+'/version.json',JSON.stringify({version:VERSION_LABEL,build:BUILD_ID})+'\n');
const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())walk(p);else if(!['sw.js','version.json'].includes(path.basename(p)))files.push(base+path.relative(root,p).split(path.sep).join('/'));}}
walk(root);
const version=crypto.createHash('sha256').update(files.map(p=>fs.readFileSync(path.join(root,p.slice(base.length)))) .join('')).digest('hex').slice(0,12);
fs.writeFileSync(root+'/sw.js',`const CACHE='hash3-'+${JSON.stringify(base)}+'-${version}';const BASE=${JSON.stringify(base)};const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hash3-'+BASE+'-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE))return;
if(u.pathname===BASE+'version.json')return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(BASE+'index.html'))));return;}
if(FILES.includes(u.pathname))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});`);
