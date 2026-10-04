const CACHE='hash3-'+"/hash3/"+'-34181a13899d';const BASE="/hash3/";const FILES=["/hash3/assets/index-B9Siiu3N.js","/hash3/assets/index-DfLoipql.css","/hash3/favicon.svg","/hash3/index.html"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hash3-'+BASE+'-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE))return;
if(u.pathname===BASE+'version.json')return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(BASE+'index.html'))));return;}
if(FILES.includes(u.pathname))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(u.pathname))||fetch(e.request)));});