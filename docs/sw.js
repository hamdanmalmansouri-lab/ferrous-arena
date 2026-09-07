/* Ferrous Arena service worker — precache the game so it runs offline once installed. */
const VERSION='50978e2965';
const CACHE='ferrous-'+VERSION;
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const THREE_CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).then(()=>c.add(THREE_CDN).catch(()=>{}))).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{
    if(res&&res.ok&&(new URL(req.url).origin===location.origin||req.url===THREE_CDN)){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); }
    return res;
  }).catch(()=>hit)));
});
