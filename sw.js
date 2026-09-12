const C="gw02-v1",FILES=["/","/index.html","/style.css","/app.js","/data.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))));
self.addEventListener("fetch",e=>{if(e.request.method==="GET"&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
