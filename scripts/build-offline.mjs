import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root='dist';
const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())walk(p);else if(!p.endsWith('sw.js'))files.push('/'+path.relative(root,p).split(path.sep).join('/'));}}
walk(root);
const version=crypto.createHash('sha256').update(files.map(p=>fs.readFileSync(root+p)).join('')).digest('hex').slice(0,12);
fs.writeFileSync(root+'/sw.js',`const CACHE='hash3-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hash3-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));return;}
if(FILES.includes(u.pathname))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});`);
