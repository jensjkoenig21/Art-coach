const C='art-coach-v130-20261006-1';
const APP=['./','./index.html','./v13.css?v=130','./v13.js?v=130'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(APP)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C&&k.startsWith('art-coach-'))await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 if(e.request.mode==='navigate'){e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});const c=await caches.open(C);c.put('./index.html',r.clone());return r}catch{return(await caches.match('./index.html'))||Response.error()}})());return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))
});