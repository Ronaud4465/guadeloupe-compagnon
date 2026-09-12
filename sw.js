const CACHE = "gw047-buttons-fix-v1";
const STATIC_FILES = ["/style.css","/app.js","/data.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC_FILES)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;if(r.mode==="navigate"||u.pathname==="/"||u.pathname==="/index.html"){e.respondWith(fetch(r,{cache:"no-store"}).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put("/index.html",y));return x}).catch(()=>caches.match("/index.html")));return}e.respondWith(fetch(r,{cache:"no-store"}).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put(r,y));return x}).catch(()=>caches.match(r)))});
