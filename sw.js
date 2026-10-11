// Offline play: network first (so updates show up straight away), the cache when offline.
const CACHE = 'zombie-conga-v4';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png']))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    try { const r = await fetch(req, { cache: 'no-cache' }); if (r.ok) c.put(req, r.clone()); return r; }
    catch (err) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw err; }
  }));
});
