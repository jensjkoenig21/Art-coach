const C='art-coach-v1321-20261006';
const APP=['./','./index.html'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(APP)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('art-coach-')&&k!==C)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});const c=await caches.open(C);c.put('./index.html',r.clone());return r}catch{return(await caches.match('./index.html'))||Response.error()}})());return}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
